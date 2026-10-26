/**
 * Domain Logic & Pure Business Rules for Kos Popo
 * Memisahkan aturan bisnis murni agar mudah diuji secara otomatis (Vitest)
 * tanpa ketergantungan pada React UI.
 */

import { Room, Tenant, Payment, RoomType, RoomTypeId, CurrentUser, UserRole } from '../types';
import { formatRupiah, formatPeriode, formatTanggalSingkat, getDueDate, isOverdue, getDaysOverdue } from './formatters';

// -------------------------------------------------------------
// F2: TIPE KAMAR & HARGA
// -------------------------------------------------------------
export const defaultRoomTypes: RoomType[] = [
  {
    id: 1,
    name: 'Tipe 1',
    priceMonthly: 700000,
    facilities: ['Kasur busa', 'Lemari 2 pintu', 'Meja belajar & kursi', 'KM Luar', 'Kipas angin'],
  },
  {
    id: 2,
    name: 'Tipe 2',
    priceMonthly: 800000,
    facilities: ['Springbed 100x200', 'Lemari pakaian', 'Meja kerja', 'KM Dalam', 'Exhaust fan', 'Kipas angin'],
  },
  {
    id: 3,
    name: 'Tipe 3',
    priceMonthly: 900000,
    facilities: ['Springbed 120x200', 'Lemari besar', 'Meja kerja ergonomic', 'KM Dalam', 'AC 1/2 PK', 'Water heater'],
  },
];

/**
 * Mendapatkan harga sewa bulanan langsung dari entitas roomTypes
 */
export const getRoomTypePrice = (typeId: RoomTypeId, roomTypes: RoomType[] = defaultRoomTypes): number => {
  const found = roomTypes.find((rt) => rt.id === typeId);
  return found ? found.priceMonthly : 0;
};

/**
 * Mendapatkan deskripsi tipe kamar dari entitas roomTypes
 */
export const getRoomTypeDescription = (typeId: RoomTypeId, roomTypes: RoomType[] = defaultRoomTypes): string => {
  const found = roomTypes.find((rt) => rt.id === typeId);
  if (!found) return `Tipe ${typeId}`;
  return `${found.name} (${formatRupiah(found.priceMonthly)}/bulan)`;
};

// -------------------------------------------------------------
// F2: VALIDASI & ATURAN KAMAR
// -------------------------------------------------------------
/**
 * Normalisasi nomor kamar ke format standar 'K' + 2 digit angka.
 * Contoh: 'K5', 'k5', 'K05', 'k05' -> 'K05'
 *         'K1', 'k1' -> 'K01'
 *         'K20' -> 'K20'
 *         'K21' -> 'K21'
 */
export const normalizeRoomNumberInput = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/^k0?([1-9]|1[0-9]|20)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return `K${String(num).padStart(2, '0')}`;
  }
  return trimmed.toUpperCase();
};

/**
 * Format nomor kamar wajib 'K' diikuti 2 digit angka (contoh: K01, K20, K21)
 */
export const isValidRoomNumberFormat = (roomNumber: string): boolean => {
  if (!roomNumber) return false;
  return /^K\d{2}$/i.test(roomNumber.trim());
};

/**
 * Cek nomor kamar kembar (case-insensitive)
 */
export const isRoomNumberDuplicate = (
  roomNumber: string,
  existingRooms: { roomNumber: string; id?: string }[],
  excludeRoomId?: string
): boolean => {
  const normalized = roomNumber.trim().toUpperCase();
  return existingRooms.some(
    (r) => (excludeRoomId ? r.id !== excludeRoomId : true) && r.roomNumber.toUpperCase() === normalized
  );
};

/**
 * Cek apakah kamar kosong dan aman untuk dihapus (tanpa riwayat penghuni / tagihan)
 */
export const canDeleteRoom = (
  roomNumber: string,
  tenants: Tenant[],
  payments: Payment[]
): { allowed: boolean; message?: string } => {
  const normalized = roomNumber.trim().toUpperCase();
  const hasTenants = tenants.some((t) => t.roomNumber.toUpperCase() === normalized);
  const hasPayments = payments.some((p) => p.roomNumber.toUpperCase() === normalized);

  if (hasTenants || hasPayments) {
    return {
      allowed: false,
      message: `Kamar ${normalized} memiliki riwayat penghuni atau tagihan sehingga tidak dapat dihapus demi integritas data.`,
    };
  }

  return { allowed: true };
};

/**
 * Logika murni: Tambah kamar baru (F2)
 */
export interface AddRoomInput {
  roomNumber: string;
  type: RoomTypeId;
  floor: number;
  facilities?: string[];
}

export interface AddRoomResult {
  success: boolean;
  message: string;
  room?: Room;
  updatedRooms?: Room[];
}

export const addRoomDomain = (
  data: AddRoomInput,
  existingRooms: Room[],
  roomTypes: RoomType[] = defaultRoomTypes
): AddRoomResult => {
  const normalized = data.roomNumber.trim().toUpperCase();
  if (!isValidRoomNumberFormat(normalized)) {
    return {
      success: false,
      message: 'Nomor kamar harus berformat huruf K diikuti 2 digit angka (contoh: K21).',
    };
  }
  if (isRoomNumberDuplicate(normalized, existingRooms)) {
    return {
      success: false,
      message: `Nomor kamar ${normalized} sudah digunakan di sistem.`,
    };
  }

  const roomTypeObj = roomTypes.find((rt) => rt.id === data.type);
  const newRoom: Room = {
    id: normalized,
    roomNumber: normalized,
    type: data.type,
    floor: data.floor || 1,
    facilities: data.facilities || roomTypeObj?.facilities || [],
    status: 'Kosong',
  };

  return {
    success: true,
    message: `Kamar ${normalized} berhasil ditambahkan.`,
    room: newRoom,
    updatedRooms: [...existingRooms, newRoom],
  };
};

/**
 * Logika murni: Hapus kamar (F2)
 */
export interface DeleteRoomResult {
  success: boolean;
  message: string;
  updatedRooms?: Room[];
}

export const deleteRoomDomain = (
  roomId: string,
  existingRooms: Room[],
  tenants: Tenant[],
  payments: Payment[]
): DeleteRoomResult => {
  const existing = existingRooms.find((r) => r.id === roomId || r.roomNumber.toUpperCase() === roomId.toUpperCase());
  if (!existing) {
    return { success: false, message: 'Kamar tidak ditemukan.' };
  }

  const check = canDeleteRoom(existing.roomNumber, tenants, payments);
  if (!check.allowed) {
    return { success: false, message: check.message || 'Kamar tidak dapat dihapus.' };
  }

  return {
    success: true,
    message: `Kamar ${existing.roomNumber} berhasil dihapus.`,
    updatedRooms: existingRooms.filter((r) => r.id !== existing.id),
  };
};

/**
 * Logika murni: Reset PIN penghuni (Poin 20 & 7)
 */
export interface ResetPinResult {
  success: boolean;
  message: string;
  newPin?: string;
  updatedTenants?: Tenant[];
}

export const resetTenantPinDomain = (
  tenantId: string,
  tenants: Tenant[],
  customPin?: string
): ResetPinResult => {
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) {
    return { success: false, message: 'Penghuni tidak ditemukan.' };
  }

  let newPin = customPin;
  if (!newPin) {
    do {
      newPin = Math.floor(1000 + Math.random() * 9000).toString();
    } while (newPin === tenant.pin);
  }

  const updatedTenants = tenants.map((t) =>
    t.id === tenantId ? { ...t, pin: newPin! } : t
  );

  return {
    success: true,
    message: `PIN berhasil direset ke ${newPin}.`,
    newPin,
    updatedTenants,
  };
};

/**
 * Logika murni: Nonaktifkan penghuni (Poin 2)
 * Menyimpan deactivatedDate (YYYY-MM-DD) dan mengubah status kamar ke Kosong
 */
export interface DeactivateTenantResult {
  success: boolean;
  message: string;
  deactivatedTenant?: Tenant;
  updatedTenants?: Tenant[];
  updatedRooms?: Room[];
}

export const deactivateTenantDomain = (
  tenantId: string,
  tenants: Tenant[],
  rooms: Room[],
  today: string
): DeactivateTenantResult => {
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) {
    return { success: false, message: 'Penghuni tidak ditemukan.' };
  }

  const updatedTenants = tenants.map((t) =>
    t.id === tenantId ? { ...t, status: 'Nonaktif' as const, deactivatedDate: today } : t
  );

  const updatedRooms = rooms.map((r) =>
    r.roomNumber.toUpperCase() === tenant.roomNumber.toUpperCase()
      ? {
          ...r,
          status: 'Kosong' as const,
          currentTenantId: undefined,
          currentTenantName: undefined,
        }
      : r
  );

  return {
    success: true,
    message: `Penghuni ${tenant.name} dinonaktifkan. Kamar ${tenant.roomNumber} kini berstatus KOSONG.`,
    deactivatedTenant: { ...tenant, status: 'Nonaktif', deactivatedDate: today },
    updatedTenants,
    updatedRooms,
  };
};

/**
 * Aturan bisnis: Satu kamar hanya dapat ditempati oleh 1 penghuni aktif
 */
export const canAssignTenantToRoom = (
  roomNumber: string,
  tenants: Tenant[],
  excludeTenantId?: string
): { allowed: boolean; message?: string } => {
  const normalized = roomNumber.trim().toUpperCase();
  const active = tenants.find(
    (t) =>
      t.roomNumber.toUpperCase() === normalized &&
      t.status === 'Aktif' &&
      (excludeTenantId ? t.id !== excludeTenantId : true)
  );

  if (active) {
    return {
      allowed: false,
      message: `Kamar ${normalized} sudah dihuni oleh ${active.name}. Satu kamar hanya dapat ditempati satu penghuni aktif.`,
    };
  }

  return { allowed: true };
};

/**
 * Pembaruan status kamar otomatis: Kamar menjadi 'Terisi' saat penghuni aktif ditambahkan
 */
export const updateRoomOnTenantActive = (
  roomNumber: string,
  tenantId: string,
  tenantName: string,
  rooms: Room[]
): Room[] => {
  const norm = roomNumber.trim().toUpperCase();
  return rooms.map((r) =>
    r.roomNumber.toUpperCase() === norm
      ? { ...r, status: 'Terisi', currentTenantId: tenantId, currentTenantName: tenantName }
      : r
  );
};

/**
 * Pembaruan status kamar otomatis: Kamar menjadi 'Kosong' saat penghuni dinonaktifkan
 */
export const updateRoomOnTenantDeactivate = (
  roomNumber: string,
  rooms: Room[]
): Room[] => {
  const norm = roomNumber.trim().toUpperCase();
  return rooms.map((r) =>
    r.roomNumber.toUpperCase() === norm
      ? { ...r, status: 'Kosong', currentTenantId: undefined, currentTenantName: undefined }
      : r
  );
};

// -------------------------------------------------------------
// F3 & F5: ATURAN BISNIS TAGIHAN & KETERLAMBATAN
// -------------------------------------------------------------
/**
 * Menentukan apakah tagihan boleh dibuat untuk seorang penghuni pada periode tertentu:
 * 1. Tidak boleh duplikat per tenantId per periode.
 * 2. Tidak boleh ada tagihan sebelum bulan tanggal masuk (startDate).
 */
export const canCreateBillForTenant = (
  tenantId: string,
  yearMonth: string,
  payments: Payment[],
  tenantStartDate?: string
): boolean => {
  // Penghuni tidak boleh punya tagihan sebelum bulan tanggal masuknya
  if (tenantStartDate) {
    const startYM = tenantStartDate.slice(0, 7);
    if (yearMonth < startYM) {
      return false;
    }
  }

  // Cocokkan tagihan HANYA dengan tenantId
  const exists = payments.some((p) => p.tenantId === tenantId && p.yearMonth === yearMonth);
  return !exists;
};

/**
 * Status tampilan turunan keterlambatan (data tetap hanya Lunas / Belum)
 */
export const getDerivedPaymentStatus = (
  payment: Payment,
  today: string
): { isLate: boolean; daysLate: number; badgeText: string } => {
  if (payment.status === 'Lunas') {
    return { isLate: false, daysLate: 0, badgeText: 'Lunas' };
  }

  const late = isOverdue(payment.dueDate, today);
  const days = late ? getDaysOverdue(payment.dueDate, today) : 0;

  return {
    isLate: late,
    daysLate: days,
    badgeText: late ? (days > 0 ? `Telat ${days} hari` : 'Telat') : 'Belum jatuh tempo',
  };
};

/**
 * Pindah kamar:
 * Normalisasi nomor kamar ke huruf kapital, perbarui roomNumber & amount pada
 * tagihan berstatus Belum milik penghuni itu mengikuti harga tipe kamar baru,
 * dan jangan ubah tagihan Lunas.
 */
export const applyRoomMoveToPayments = (
  tenantId: string,
  newRoomNumber: string,
  newRentAmount: number,
  payments: Payment[]
): Payment[] => {
  const normalizedRoom = newRoomNumber.trim().toUpperCase();
  return payments.map((p) => {
    if (p.tenantId === tenantId && p.status === 'Belum') {
      return {
        ...p,
        roomNumber: normalizedRoom,
        amount: newRentAmount,
      };
    }
    return p;
  });
};

// -------------------------------------------------------------
// F5: PERHITUNGAN REKAP & GRAFIK (IDENTIK DENGAN KARTU)
// -------------------------------------------------------------
export interface PeriodSummary {
  revenue: number;
  arrears: number;
  occupancyCount: number;
  occupancyRate: number;
  totalRooms: number;
}

/**
 * Menghitung jumlah dan persentase okupansi untuk periode tertentu.
 * Penghuni berstatus Nonaktif tidak dihitung pada bulan dinonaktifkannya (deactivatedDate)
 * maupun bulan sesudahnya, hanya pada bulan-bulan sebelumnya.
 * Dengan demikian, okupansi periode berjalan selalu sama dengan jumlah kamar berstatus Terisi.
 */
export const calculateOccupancyForPeriod = (
  yearMonth: string,
  tenants: Tenant[],
  totalRooms: number = 20
): { occupancyCount: number; occupancyRate: number } => {
  const occupancyCount = tenants.filter((t) => {
    if (!t.startDate) return false;
    const startYM = t.startDate.slice(0, 7);
    const endYM = t.endDate ? t.endDate.slice(0, 7) : '9999-12';

    // Penghuni berstatus Nonaktif tidak dihitung pada bulan dinonaktifkannya maupun bulan sesudahnya
    if (t.status === 'Nonaktif') {
      if (!t.deactivatedDate) return false;
      const deactYM = t.deactivatedDate.slice(0, 7);
      if (yearMonth >= deactYM) {
        return false;
      }
    }

    return startYM <= yearMonth && endYM >= yearMonth;
  }).length;

  const occupancyRate = totalRooms > 0 ? Math.round((occupancyCount / totalRooms) * 100) : 0;
  return { occupancyCount, occupancyRate };
};

/**
 * Hitung ringkasan pendapatan, tunggakan, dan okupansi untuk periode tertentu atau semua periode.
 * Menjamin angka kartu dan grafik selalu 100% identik di semua tempat (Dashboard, Grafik, Rekap).
 */
export const calculatePeriodSummary = (
  yearMonth: string,
  payments: Payment[],
  tenants: Tenant[],
  totalRooms: number = 20,
  referenceYM?: string
): PeriodSummary => {
  if (yearMonth === 'all') {
    const revenue = payments.filter((p) => p.status === 'Lunas').reduce((sum, p) => sum + p.amount, 0);
    const arrears = payments.filter((p) => p.status === 'Belum').reduce((sum, p) => sum + p.amount, 0);
    const targetYM = referenceYM || (payments.length > 0 ? payments[0].yearMonth : '2026-10');
    const { occupancyCount, occupancyRate } = calculateOccupancyForPeriod(targetYM, tenants, totalRooms);

    return {
      revenue,
      arrears,
      occupancyCount,
      occupancyRate,
      totalRooms,
    };
  }

  const monthPayments = payments.filter((p) => p.yearMonth === yearMonth);
  const revenue = monthPayments.filter((p) => p.status === 'Lunas').reduce((sum, p) => sum + p.amount, 0);
  const arrears = monthPayments.filter((p) => p.status === 'Belum').reduce((sum, p) => sum + p.amount, 0);

  const { occupancyCount, occupancyRate } = calculateOccupancyForPeriod(yearMonth, tenants, totalRooms);

  return {
    revenue,
    arrears,
    occupancyCount,
    occupancyRate,
    totalRooms,
  };
};

/**
 * Poin 3: Hitung total kumulatif semua tagihan Belum yang lewat jatuh tempo menurut tanggal demo
 * tanpa filter periode.
 */
export const calculateCumulativeOverdue = (
  payments: Payment[],
  today: string
): { totalAmount: number; count: number } => {
  const overdueList = payments.filter((p) => p.status === 'Belum' && isOverdue(p.dueDate, today));
  const totalAmount = overdueList.reduce((sum, p) => sum + p.amount, 0);
  return { totalAmount, count: overdueList.length };
};

// -------------------------------------------------------------
// F1: AUTENTIKASI TERPADU & DETEKSI PERAN
// -------------------------------------------------------------
export const AUTH_ERROR_MESSAGE = 'Akun atau kata sandi belum cocok. Coba cek lagi ya.';

export interface AuthResult {
  success: boolean;
  user?: CurrentUser;
  message: string;
  role?: UserRole;
}

/**
 * Deteksi dan verifikasi autentikasi terpadu:
 * - Identitas hanya nomor kamar K01-K20 atau email lengkap (admin@kospopo.id / pemilik@kospopo.id).
 * - "K5", "k5", "K05" dinormalisasi ke "K05" sebelum verifikasi.
 * - Semua kegagalan menampilkan pesan ramah seragam AUTH_ERROR_MESSAGE.
 */
export const verifyLoginCredentials = (
  identifier: string,
  secret: string,
  tenants: Tenant[],
  rooms: Room[]
): AuthResult => {
  const cleanId = identifier.trim();
  const cleanSecret = secret.trim();

  if (!cleanId || !cleanSecret) {
    return { success: false, message: 'Harap masukkan email/nomor kamar dan kata sandi/PIN.' };
  }

  const cleanEmail = cleanId.toLowerCase();

  // 1. Admin
  if (cleanEmail === 'admin@kospopo.id') {
    if (cleanSecret === 'admin123') {
      return {
        success: true,
        role: 'admin',
        message: 'Halo, Mbak Sarah (Admin)',
        user: {
          role: 'admin',
          name: 'Mbak Sarah (Admin Kos)',
          email: 'admin@kospopo.id',
        },
      };
    }
    return { success: false, message: AUTH_ERROR_MESSAGE };
  }

  // 2. Pemilik
  if (cleanEmail === 'pemilik@kospopo.id') {
    if (cleanSecret === 'pemilik123') {
      return {
        success: true,
        role: 'pemilik',
        message: 'Halo, Pak Hendra (Pemilik)',
        user: {
          role: 'pemilik',
          name: 'Pak Hendra (Pemilik Kos)',
          email: 'pemilik@kospopo.id',
        },
      };
    }
    return { success: false, message: AUTH_ERROR_MESSAGE };
  }

  // 3. Penghuni (format nomor kamar K01-K20, normalisasi K5/k5/k05/K05 -> K05)
  const normalizedRoom = normalizeRoomNumberInput(cleanId);
  if (/^K([0-1][0-9]|20)$/.test(normalizedRoom)) {
    // Chip dan akses hanya jika kamar tersebut ada di sistem
    const roomExists = rooms.some((r) => r.roomNumber.toUpperCase() === normalizedRoom);
    if (!roomExists) {
      return { success: false, message: AUTH_ERROR_MESSAGE };
    }

    const matchedTenant = tenants.find((t) => t.roomNumber.toUpperCase() === normalizedRoom);
    if (!matchedTenant || matchedTenant.status !== 'Aktif') {
      return { success: false, message: AUTH_ERROR_MESSAGE };
    }
    if (matchedTenant.pin !== cleanSecret) {
      return { success: false, message: AUTH_ERROR_MESSAGE };
    }

    return {
      success: true,
      role: 'penghuni',
      message: `Halo, ${matchedTenant.name}`,
      user: {
        role: 'penghuni',
        name: matchedTenant.name,
        roomNumber: matchedTenant.roomNumber,
        tenantId: matchedTenant.id,
      },
    };
  }

  return { success: false, message: AUTH_ERROR_MESSAGE };
};

// -------------------------------------------------------------
// F5: FORMAT CSV REKAP LAPORAN
// -------------------------------------------------------------
/**
 * Menghasilkan konten CSV dengan BOM UTF-8 dan pemisah titik koma (;)
 */
export const generateRekapCsv = (
  payments: Payment[],
  periodLabel: string
): string => {
  const BOM = '\uFEFF';
  const headers = ['Kamar', 'Penghuni', 'Periode', 'Jumlah (Rp)', 'Tanggal Jatuh Tempo', 'Tanggal Bayar', 'Metode Bayar', 'Status'];

  const rows = payments.map((p) => {
    return [
      p.roomNumber,
      `"${p.tenantName.replace(/"/g, '""')}"`,
      p.month,
      p.amount.toString(),
      p.dueDate,
      p.paidDate || '-',
      p.paymentMethod || '-',
      p.status,
    ].join(';');
  });

  const content = [
    `Rekap Laporan Pembayaran Kos Popo - Periode: ${periodLabel}`,
    headers.join(';'),
    ...rows,
  ].join('\r\n');

  return BOM + content;
};
