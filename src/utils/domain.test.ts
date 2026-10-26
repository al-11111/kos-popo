import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  defaultRoomTypes,
  getRoomTypePrice,
  getRoomTypeDescription,
  isValidRoomNumberFormat,
  isRoomNumberDuplicate,
  canAssignTenantToRoom,
  updateRoomOnTenantActive,
  updateRoomOnTenantDeactivate,
  canCreateBillForTenant,
  getDerivedPaymentStatus,
  applyRoomMoveToPayments,
  calculatePeriodSummary,
  calculateCumulativeOverdue,
  verifyLoginCredentials,
  normalizeRoomNumberInput,
  addRoomDomain,
  deleteRoomDomain,
  resetTenantPinDomain,
  deactivateTenantDomain,
  AUTH_ERROR_MESSAGE,
  generateRekapCsv,
} from './domain';
import { detectRoleFromIdentifier } from './auth';
import { getToday, setDemoDateStorage, DEFAULT_DEMO_DATE } from './formatters';
import { initialPayments, initialTenants, initialRooms } from '../data/mockData';
import { Room, Tenant, Payment } from '../types';

// Setup mock localStorage jika berjalan di environment Node.js
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
};
if (typeof globalThis.localStorage === 'undefined') {
  // @ts-expect-error Mocking storage for Node.js test environment
  globalThis.localStorage = mockLocalStorage;
}

describe('Pengujian Logika Bisnis Kos Popo (Pure Functions & Domain Rules)', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    globalThis.localStorage.clear();
  });

  // 1. Harga sewa mengikuti tipe kamar (dari roomTypes)
  it('1. Harga sewa mengikuti tipe kamar dari entitas roomTypes (F2)', () => {
    expect(getRoomTypePrice(1, defaultRoomTypes)).toBe(700000);
    expect(getRoomTypePrice(2, defaultRoomTypes)).toBe(800000);
    expect(getRoomTypePrice(3, defaultRoomTypes)).toBe(900000);

    const descTipe1 = getRoomTypeDescription(1, defaultRoomTypes);
    expect(descTipe1).toContain('Tipe 1');
    expect(descTipe1).toContain('700.000');
  });

  // 2. Satu kamar hanya satu penghuni aktif
  it('2. Satu kamar hanya dapat dihuni oleh satu penghuni aktif (F2)', () => {
    const tenants: Tenant[] = [
      {
        id: 'T01',
        name: 'Budi Santoso',
        phone: '081234567890',
        roomNumber: 'K01',
        pin: '1234',
        startDate: '2026-05-01',
        endDate: '2027-05-01',
        status: 'Aktif',
        emergencyContact: '081234567899',
        rentAmount: 700000,
      },
    ];

    // Kamar K01 sudah dihuni Budi (Aktif) -> tidak boleh dihuni orang lain
    const resultOccupy = canAssignTenantToRoom('K01', tenants);
    expect(resultOccupy.allowed).toBe(false);
    expect(resultOccupy.message).toContain('Kamar K01 sudah dihuni oleh Budi Santoso');

    // Kamar kosong K02 -> boleh
    const resultEmpty = canAssignTenantToRoom('K02', tenants);
    expect(resultEmpty.allowed).toBe(true);

    // Jika Budi nonaktif, kamar K01 boleh dihuni penghuni baru
    const tenantsWithInactive: Tenant[] = [
      { ...tenants[0], status: 'Nonaktif' },
    ];
    const resultAfterInactive = canAssignTenantToRoom('K01', tenantsWithInactive);
    expect(resultAfterInactive.allowed).toBe(true);
  });

  // 3. Status kamar otomatis (Terisi saat tambah, Kosong saat nonaktif)
  it('3. Status kamar otomatis: Terisi saat tambah, Kosong saat nonaktif (F2)', () => {
    const rooms: Room[] = [
      { id: 'K01', roomNumber: 'K01', type: 1, floor: 1, status: 'Kosong' },
      { id: 'K02', roomNumber: 'K02', type: 1, floor: 1, status: 'Terisi', currentTenantId: 'T02', currentTenantName: 'Siti' },
    ];

    // Aktifkan penghuni di K01
    const updatedOnAdd = updateRoomOnTenantActive('K01', 'T01', 'Aditya', rooms);
    const roomK01 = updatedOnAdd.find((r) => r.roomNumber === 'K01');
    expect(roomK01?.status).toBe('Terisi');
    expect(roomK01?.currentTenantId).toBe('T01');
    expect(roomK01?.currentTenantName).toBe('Aditya');

    // Nonaktifkan penghuni di K02
    const updatedOnDeactivate = updateRoomOnTenantDeactivate('K02', updatedOnAdd);
    const roomK02 = updatedOnDeactivate.find((r) => r.roomNumber === 'K02');
    expect(roomK02?.status).toBe('Kosong');
    expect(roomK02?.currentTenantId).toBeUndefined();
    expect(roomK02?.currentTenantName).toBeUndefined();
  });

  // 4. Nomor kamar tidak boleh kembar
  it('4. Validasi nomor kamar: format K + 2 digit dan tidak boleh kembar case-insensitive (F2)', () => {
    expect(isValidRoomNumberFormat('K01')).toBe(true);
    expect(isValidRoomNumberFormat('k20')).toBe(true);
    expect(isValidRoomNumberFormat('K09')).toBe(true);
    expect(isValidRoomNumberFormat('101')).toBe(false);
    expect(isValidRoomNumberFormat('Room 1')).toBe(false);

    const existingRooms = [{ roomNumber: 'K01' }, { roomNumber: 'K02' }];
    expect(isRoomNumberDuplicate('k01', existingRooms)).toBe(true);
    expect(isRoomNumberDuplicate('K01', existingRooms)).toBe(true);
    expect(isRoomNumberDuplicate('K03', existingRooms)).toBe(false);
  });

  // 5. Tagihan tidak ganda per penghuni per periode, dan penghuni baru tidak mewarisi tagihan lama
  it('5. Tagihan dicocokkan HANYA dengan tenantId: tidak duplikat & penghuni baru tidak mewarisi tagihan lama (F3)', () => {
    const payments: Payment[] = [
      {
        id: 'PAY-1',
        tenantId: 'T01-LAMA',
        tenantName: 'Penghuni Lama',
        roomNumber: 'K01',
        month: 'Oktober 2026',
        yearMonth: '2026-10',
        amount: 700000,
        dueDate: '2026-10-10',
        paidDate: null,
        status: 'Belum',
      },
    ];

    expect(canCreateBillForTenant('T01-LAMA', '2026-10', payments, '2026-05-01')).toBe(false);
    expect(canCreateBillForTenant('T02-BARU', '2026-10', payments, '2026-10-01')).toBe(true);
  });

  // 6. Tidak ada tagihan sebelum bulan tanggal masuk
  it('6. Penghuni tidak boleh punya tagihan pada periode sebelum bulan tanggal masuknya (F3)', () => {
    const payments: Payment[] = [];
    const startDate = '2026-08-15';

    expect(canCreateBillForTenant('T05', '2026-07', payments, startDate)).toBe(false);
    expect(canCreateBillForTenant('T05', '2026-05', payments, startDate)).toBe(false);
    expect(canCreateBillForTenant('T05', '2026-08', payments, startDate)).toBe(true);
    expect(canCreateBillForTenant('T05', '2026-09', payments, startDate)).toBe(true);
  });

  // 7. Penghitungan Telat berdasarkan tanggal demo
  it('7. Penghitungan status Telat adalah turunan dari tagihan Belum berdasarkan tanggal demo (F3)', () => {
    const demoDate = '2026-10-13';

    const overdueBill: Payment = {
      id: 'PAY-1',
      tenantId: 'T01',
      tenantName: 'Budi',
      roomNumber: 'K01',
      month: 'Oktober 2026',
      yearMonth: '2026-10',
      amount: 700000,
      dueDate: '2026-10-10',
      paidDate: null,
      status: 'Belum',
    };
    const statusOverdue = getDerivedPaymentStatus(overdueBill, demoDate);
    expect(statusOverdue.isLate).toBe(true);
    expect(statusOverdue.daysLate).toBe(3);
    expect(statusOverdue.badgeText).toBe('Telat 3 hari');

    const futureBill: Payment = {
      ...overdueBill,
      dueDate: '2026-10-20',
    };
    const statusFuture = getDerivedPaymentStatus(futureBill, demoDate);
    expect(statusFuture.isLate).toBe(false);
    expect(statusFuture.badgeText).toBe('Belum jatuh tempo');

    const paidBill: Payment = {
      ...overdueBill,
      status: 'Lunas',
      paidDate: '2026-10-09',
    };
    const statusPaid = getDerivedPaymentStatus(paidBill, demoDate);
    expect(statusPaid.isLate).toBe(false);
    expect(statusPaid.badgeText).toBe('Lunas');
  });

  // 8. Pindah kamar memperbarui tagihan Belum dan tidak mengubah yang Lunas
  it('8. Pindah kamar (updateTenant): memperbarui tagihan Belum dan tidak mengubah tagihan Lunas (F2 & F3)', () => {
    const payments: Payment[] = [
      {
        id: 'PAY-SEPT',
        tenantId: 'T01',
        tenantName: 'Aditya',
        roomNumber: 'K01',
        month: 'September 2026',
        yearMonth: '2026-09',
        amount: 700000,
        dueDate: '2026-09-10',
        paidDate: '2026-09-08',
        status: 'Lunas',
      },
      {
        id: 'PAY-OKT',
        tenantId: 'T01',
        tenantName: 'Aditya',
        roomNumber: 'K01',
        month: 'Oktober 2026',
        yearMonth: '2026-10',
        amount: 700000,
        dueDate: '2026-10-10',
        paidDate: null,
        status: 'Belum',
      },
    ];

    const updated = applyRoomMoveToPayments('T01', 'k14', 900000, payments);

    const paidPayment = updated.find((p) => p.id === 'PAY-SEPT');
    expect(paidPayment?.roomNumber).toBe('K01');
    expect(paidPayment?.amount).toBe(700000);

    const unpaidPayment = updated.find((p) => p.id === 'PAY-OKT');
    expect(unpaidPayment?.roomNumber).toBe('K14');
    expect(unpaidPayment?.amount).toBe(900000);
  });

  // 9. Data grafik = hasil hitung payments (pendapatan Oktober = Rp13.100.000, identik dengan dashboard)
  it('9. Data grafik dan kartu dashboard identik: Pendapatan Oktober 2026 = Rp13.100.000 (F5)', () => {
    const summaryOkt = calculatePeriodSummary('2026-10', initialPayments, initialTenants, 20);

    expect(summaryOkt.revenue).toBe(13100000);
    expect(summaryOkt.arrears).toBe(2400000);
    expect(summaryOkt.revenue + summaryOkt.arrears).toBe(15500000);

    expect(summaryOkt.occupancyCount).toBe(19);
    expect(summaryOkt.occupancyRate).toBe(95);
  });

  // 10. Normalisasi Login Nomor Kamar ("K5", "k05", "K1", "K21") & Chip Deteksi Peran (Poin 1)
  it('10. Login nomor kamar: normalisasi K5/k5/k05/K05 -> K05, cek kamar ada, dan pesan seragam (Poin 1 & F1)', () => {
    // Normalisasi murni
    expect(normalizeRoomNumberInput('K5')).toBe('K05');
    expect(normalizeRoomNumberInput('k5')).toBe('K05');
    expect(normalizeRoomNumberInput('k05')).toBe('K05');
    expect(normalizeRoomNumberInput('K05')).toBe('K05');
    expect(normalizeRoomNumberInput('K1')).toBe('K01');
    expect(normalizeRoomNumberInput('k1')).toBe('K01');
    expect(normalizeRoomNumberInput('K20')).toBe('K20');
    expect(normalizeRoomNumberInput('K21')).toBe('K21');

    // Login dengan "K5" dan PIN 1234 (K05 ada dan aktif) -> Berhasil sebagai penghuni
    const resK5 = verifyLoginCredentials('K5', '1234', initialTenants, initialRooms);
    expect(resK5.success).toBe(true);
    expect(resK5.role).toBe('penghuni');
    expect(resK5.user?.roomNumber).toBe('K05');

    // Login dengan "k05" dan PIN 1234 -> Berhasil
    const resLowerK05 = verifyLoginCredentials('k05', '1234', initialTenants, initialRooms);
    expect(resLowerK05.success).toBe(true);
    expect(resLowerK05.role).toBe('penghuni');

    // Login dengan "K1" dan PIN T01 ('1111') -> Berhasil ke K01
    const resK1 = verifyLoginCredentials('K1', '1111', initialTenants, initialRooms);
    expect(resK1.success).toBe(true);
    expect(resK1.user?.roomNumber).toBe('K01');

    // Login dengan "K21" -> Ditolak karena K21 tidak ada dalam 20 kamar kos
    const resK21 = verifyLoginCredentials('K21', '1234', initialTenants, initialRooms);
    expect(resK21.success).toBe(false);
    expect(resK21.message).toBe(AUTH_ERROR_MESSAGE);

    // Chip "Masuk sebagai Penghuni" hanya muncul jika kamar tersebut ada di sistem
    const chipK5 = detectRoleFromIdentifier('K5', initialRooms);
    expect(chipK5.detectedRole).toBe('penghuni');
    expect(chipK5.roleLabel).toBe('Masuk sebagai Penghuni (K05)');

    const chipK05 = detectRoleFromIdentifier('k05', initialRooms);
    expect(chipK05.detectedRole).toBe('penghuni');
    expect(chipK05.roleLabel).toBe('Masuk sebagai Penghuni (K05)');

    const chipK1 = detectRoleFromIdentifier('K1', initialRooms);
    expect(chipK1.detectedRole).toBe('penghuni');
    expect(chipK1.roleLabel).toBe('Masuk sebagai Penghuni (K01)');

    const chipK21 = detectRoleFromIdentifier('K21', initialRooms);
    expect(chipK21.detectedRole).toBeNull(); // Kamar K21 tidak ada di sistem, chip tidak muncul
  });

  // 11. Okupansi saat penghuni dinonaktifkan: Oktober = 18 dan November = 18
  it('11. Okupansi: nonaktifkan satu penghuni pada 2026-10-13 -> okupansi Oktober = 18 dan November = 18', () => {
    // Nonaktifkan T01 (Aditya di K01) pada tanggal demo 2026-10-13
    const deactRes = deactivateTenantDomain('T01', initialTenants, initialRooms, '2026-10-13');
    expect(deactRes.success).toBe(true);
    expect(deactRes.deactivatedTenant?.status).toBe('Nonaktif');
    expect(deactRes.deactivatedTenant?.deactivatedDate).toBe('2026-10-13');

    const updatedTenants = deactRes.updatedTenants!;
    const updatedRooms = deactRes.updatedRooms!;

    // Kamar K01 otomatis menjadi Kosong
    const roomK01 = updatedRooms.find((r) => r.roomNumber === 'K01');
    expect(roomK01?.status).toBe('Kosong');

    // Okupansi Oktober 2026: penghuni nonaktif tidak dihitung pada bulan dinonaktifkan -> okupansi menjadi 18
    const summaryOkt = calculatePeriodSummary('2026-10', initialPayments, updatedTenants, 20);
    expect(summaryOkt.occupancyCount).toBe(18);
    expect(summaryOkt.occupancyRate).toBe(90);

    // Okupansi November 2026: penghuni nonaktif tidak dihitung pada bulan sesudahnya -> okupansi tetap 18
    const summaryNov = calculatePeriodSummary('2026-11', initialPayments, updatedTenants, 20);
    expect(summaryNov.occupancyCount).toBe(18);
    expect(summaryNov.occupancyRate).toBe(90);
  });

  // 12. Tunggakan kumulatif semua periode bernilai Rp4.700.000 pada data awal (Poin 3)
  it('12. Tunggakan: Total belum lunas semua periode pada data awal = Rp4.700.000 (Poin 3)', () => {
    const demoDate = '2026-10-13';
    const cumulative = calculateCumulativeOverdue(initialPayments, demoDate);

    // Rincian tagihan belum lunas lewat jatuh tempo:
    // Agustus 2026: K08 (800rb)
    // September 2026: K03 (700rb), K08 (800rb)
    // Oktober 2026: K03 (700rb), K08 (800rb), K17 (900rb)
    // Total = 800rb + 700rb + 800rb + 700rb + 800rb + 900rb = Rp4.700.000
    expect(cumulative.totalAmount).toBe(4700000);
    expect(cumulative.count).toBe(6);
  });

  // 13. Tambah Kamar (addRoomDomain): format salah, nomor kembar, sukses (Poin 7)
  it('13. Manajemen Kamar: addRoomDomain memvalidasi format, nomor kembar, dan sukses menambah kamar (Poin 7)', () => {
    // Format salah: '101' atau 'ABC'
    const failFormat = addRoomDomain({ roomNumber: '101', type: 1, floor: 1 }, initialRooms);
    expect(failFormat.success).toBe(false);
    expect(failFormat.message).toContain('huruf K diikuti 2 digit angka');

    // Nomor kembar: 'K01' atau 'k01'
    const failDuplicate = addRoomDomain({ roomNumber: 'k01', type: 1, floor: 1 }, initialRooms);
    expect(failDuplicate.success).toBe(false);
    expect(failDuplicate.message).toContain('sudah digunakan');

    // Sukses: 'K21', Tipe 2, lantai 2
    const successAdd = addRoomDomain({ roomNumber: 'K21', type: 2, floor: 2 }, initialRooms);
    expect(successAdd.success).toBe(true);
    expect(successAdd.room?.roomNumber).toBe('K21');
    expect(successAdd.room?.status).toBe('Kosong');
    expect(successAdd.updatedRooms?.length).toBe(initialRooms.length + 1);
  });

  // 14. Hapus Kamar (deleteRoomDomain): ditolak jika ada riwayat, sukses jika kosong tanpa riwayat (Poin 7)
  it('14. Manajemen Kamar: deleteRoomDomain menolak kamar berriwayat dan menghapus kamar kosong bersih (Poin 7)', () => {
    // Kamar K01 ada riwayat penghuni & tagihan -> Ditolak
    const failDelete = deleteRoomDomain('K01', initialRooms, initialTenants, initialPayments);
    expect(failDelete.success).toBe(false);
    expect(failDelete.message).toContain('memiliki riwayat');

    // Buat kamar baru K21 yang kosong tanpa riwayat
    const addRes = addRoomDomain({ roomNumber: 'K21', type: 1, floor: 2 }, initialRooms);
    expect(addRes.success).toBe(true);

    // Hapus kamar K21 -> Sukses
    const successDelete = deleteRoomDomain('K21', addRes.updatedRooms!, initialTenants, initialPayments);
    expect(successDelete.success).toBe(true);
    expect(successDelete.updatedRooms?.find((r) => r.roomNumber === 'K21')).toBeUndefined();
  });

  // 15. Reset PIN Penghuni (resetTenantPinDomain): PIN berubah, 4 digit angka (Poin 7)
  it('15. Keamanan: resetTenantPinDomain menghasilkan PIN 4 digit baru yang berbeda (Poin 7)', () => {
    const tenantT05 = initialTenants.find((t) => t.id === 'T05')!;
    expect(tenantT05.pin).toBe('1234');

    const resetRes = resetTenantPinDomain('T05', initialTenants);
    expect(resetRes.success).toBe(true);
    expect(resetRes.newPin).toBeDefined();
    expect(resetRes.newPin?.length).toBe(4);
    expect(/^\d{4}$/.test(resetRes.newPin!)).toBe(true);
    expect(resetRes.newPin).not.toBe('1234');

    const updatedT05 = resetRes.updatedTenants?.find((t) => t.id === 'T05');
    expect(updatedT05?.pin).toBe(resetRes.newPin);
  });

  // 16. Tanggal demo: getToday mengikuti tanggal demo sistem (Poin 7)
  it('16. Tanggal demo: getToday membaca tanggal demo stabil dan sinkron dengan localStorage (Poin 7)', () => {
    // Default tanggal demo
    expect(getToday()).toBe(DEFAULT_DEMO_DATE); // '2026-10-13'

    // Ubah tanggal demo ke 2026-11-01
    setDemoDateStorage('2026-11-01');
    expect(getToday()).toBe('2026-11-01');

    // Ubah kembali ke default
    setDemoDateStorage(DEFAULT_DEMO_DATE);
    expect(getToday()).toBe('2026-10-13');
  });

  // 17. Format CSV rekap (BOM, titik koma)
  it('17. Unduh CSV Rekap: menggunakan UTF-8 BOM dan pemisah titik koma (F5)', () => {
    const samplePayments: Payment[] = [
      {
        id: 'PAY-1',
        tenantId: 'T01',
        tenantName: 'Aditya Nugraha',
        roomNumber: 'K01',
        month: 'Oktober 2026',
        yearMonth: '2026-10',
        amount: 700000,
        dueDate: '2026-10-10',
        paidDate: '2026-10-05',
        status: 'Lunas',
        paymentMethod: 'Transfer BCA',
      },
    ];

    const csvContent = generateRekapCsv(samplePayments, 'Oktober 2026');

    expect(csvContent.charCodeAt(0)).toBe(0xfeff);
    expect(csvContent).toContain('Kamar;Penghuni;Periode;Jumlah (Rp);Tanggal Jatuh Tempo;Tanggal Bayar;Metode Bayar;Status');
    expect(csvContent).toContain('K01;"Aditya Nugraha";Oktober 2026;700000;2026-10-10;2026-10-05;Transfer BCA;Lunas');
  });

  // 18. Okupansi historis: penghuni nonaktif tetap dihitung pada bulan-bulan sebelum dinonaktifkan
  it('18. Okupansi: penghuni nonaktif tetap dihitung pada bulan-bulan sebelum dinonaktifkannya (September = 19)', () => {
    // T01 dinonaktifkan pada 2026-10-13
    const deactRes = deactivateTenantDomain('T01', initialTenants, initialRooms, '2026-10-13');
    const updatedTenants = deactRes.updatedTenants!;

    // Bulan September 2026 (sebelum bulan dinonaktifkan): T01 tetap dihitung aktif (19 penghuni)
    const summarySept = calculatePeriodSummary('2026-09', initialPayments, updatedTenants, 20);
    expect(summarySept.occupancyCount).toBe(19);
    expect(summarySept.occupancyRate).toBe(95);

    // Bulan Oktober 2026 (bulan dinonaktifkannya): tidak dihitung (18 penghuni)
    const summaryOkt = calculatePeriodSummary('2026-10', initialPayments, updatedTenants, 20);
    expect(summaryOkt.occupancyCount).toBe(18);

    // Bulan November 2026 (bulan sesudahnya): tidak dihitung (18 penghuni)
    const summaryNov = calculatePeriodSummary('2026-11', initialPayments, updatedTenants, 20);
    expect(summaryNov.occupancyCount).toBe(18);
  });
});
