import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, Tenant, Payment, MaintenanceIssue, CurrentUser, UserRole, RoomType, RoomTypeId } from '../types';
import { initialRooms, initialTenants, initialPayments, initialIssues, initialRoomTypes } from '../data/mockData';
import {
  getToday,
  getCurrentYearMonth,
  formatPeriode,
  getDueDate,
  formatTanggalSingkat,
  DEFAULT_DEMO_DATE,
  setDemoDateStorage,
  getComputerToday,
} from '../utils/formatters';
import {
  getRoomTypePrice,
  getRoomTypeDescription,
  isValidRoomNumberFormat,
  isRoomNumberDuplicate,
  canDeleteRoom,
  canAssignTenantToRoom,
  verifyLoginCredentials,
  addRoomDomain,
  deleteRoomDomain,
  resetTenantPinDomain,
  deactivateTenantDomain,
} from '../utils/domain';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  rooms: Room[];
  roomTypes: RoomType[];
  tenants: Tenant[];
  payments: Payment[];
  issues: MaintenanceIssue[];
  currentUser: CurrentUser | null;
  darkMode: boolean;
  toasts: ToastMessage[];
  demoDate: string;
  setDemoDate: (date: string) => void;
  resetDemoDateToDefault: () => void;
  useComputerDate: () => void;
  toggleDarkMode: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Autentikasi Terpadu (F1)
  loginUnified: (identifier: string, secret: string, rememberMe?: boolean) => { success: boolean; message: string; role?: UserRole };
  logout: () => void;

  // Manajemen Kamar (F2)
  addRoom: (data: { roomNumber: string; type: RoomTypeId; floor: number; facilities?: string[] }) => { success: boolean; message: string };
  updateRoom: (roomId: string, data: { roomNumber: string; type: RoomTypeId; floor: number }) => { success: boolean; message: string };
  deleteRoom: (roomId: string) => { success: boolean; message: string };

  // Manajemen Penghuni (F2)
  addTenant: (data: Omit<Tenant, 'id' | 'rentAmount' | 'pin'> & { pin?: string }) => { success: boolean; message: string; pin?: string };
  updateTenant: (tenantId: string, data: Partial<Tenant>) => { success: boolean; message: string };
  deactivateTenant: (tenantId: string) => { success: boolean; message: string };
  resetTenantPin: (tenantId: string) => { success: boolean; newPin?: string; message: string };

  // Pembayaran (F3)
  recordPayment: (paymentData: {
    tenantId: string;
    yearMonth: string;
    paymentMethod: 'Transfer BCA' | 'QRIS' | 'Tunai';
    paidDate?: string | null;
    amount?: number;
    month?: string;
    tenantName?: string;
    roomNumber?: string;
    dueDate?: string;
    status?: 'Lunas' | 'Belum';
  }) => { success: boolean; message: string };
  generateMonthlyBills: (targetYearMonth?: string) => { success: boolean; count: number; message: string };
  markPaymentPaid: (paymentId: string, method?: 'Transfer BCA' | 'QRIS' | 'Tunai') => { success: boolean; message: string };

  // Kerusakan (F4)
  submitIssue: (data: Omit<MaintenanceIssue, 'id' | 'status' | 'reportedDate'>) => { success: boolean; message: string };
  updateIssueStatus: (
    issueId: string,
    status: 'Dilaporkan' | 'Diproses' | 'Selesai',
    completedDate?: string,
    cost?: number,
    repairNotes?: string
  ) => { success: boolean; message: string };

  // Reset
  resetDataToDefault: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROOMS: 'kos_popo_rooms',
  ROOM_TYPES: 'kos_popo_room_types',
  TENANTS: 'kos_popo_tenants',
  PAYMENTS: 'kos_popo_payments',
  ISSUES: 'kos_popo_issues',
  USER: 'kos_popo_current_user',
  DARK_MODE: 'kos_popo_dark_mode',
  DEMO_DATE: 'kos_popo_demo_date',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomTypes] = useState<RoomType[]>(initialRoomTypes);

  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return initialRooms;
  });

  const [tenants, setTenants] = useState<Tenant[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TENANTS);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return initialTenants;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return initialPayments;
  });

  const [issues, setIssues] = useState<MaintenanceIssue[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ISSUES);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return initialIssues;
  });

  // Poin 17: "Ingat saya" berfungsi: sessionStorage jika tidak dicentang, localStorage jika dicentang
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    try {
      const sessionSaved = sessionStorage.getItem(STORAGE_KEYS.USER);
      if (sessionSaved) return JSON.parse(sessionSaved);
    } catch { /* ignore */ }
    try {
      const localSaved = localStorage.getItem(STORAGE_KEYS.USER);
      if (localSaved) return JSON.parse(localSaved);
    } catch { /* ignore */ }
    return null;
  });

  // Poin 22: Dark mode: jika belum ada preferensi tersimpan, ikuti prefers-color-scheme sistem
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch { /* ignore */ }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Poin 1: Tanggal demo yang stabil (default: 2026-10-13)
  const [demoDate, setDemoDateState] = useState<string>(() => {
    return getToday();
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const setDemoDate = (newDate: string) => {
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      showToast('Format tanggal tidak valid. Gunakan format YYYY-MM-DD.', 'error');
      return;
    }
    setDemoDateStorage(newDate);
    setDemoDateState(newDate);
    showToast(`Tanggal demo disetel ke: ${formatTanggalSingkat(newDate)}. Periode & keterlambatan diperbarui.`, 'success');
  };

  const resetDemoDateToDefault = () => {
    setDemoDateStorage(DEFAULT_DEMO_DATE);
    setDemoDateState(DEFAULT_DEMO_DATE);
    showToast(`Tanggal demo dikembalikan ke default: ${formatTanggalSingkat(DEFAULT_DEMO_DATE)}.`, 'info');
  };

  const useComputerDate = () => {
    const compDate = getComputerToday();
    setDemoDateStorage(compDate);
    setDemoDateState(compDate);
    showToast(`Menggunakan tanggal asli komputer: ${formatTanggalSingkat(compDate)}.`, 'success');
  };

  // Persistensi ke localStorage browser
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // -------------------------------------------------------------
  // F1: AUTENTIKASI TERPADU & KEAMANAN
  // -------------------------------------------------------------
  const loginUnified = (
    identifier: string,
    secret: string,
    rememberMe: boolean = true
  ): { success: boolean; message: string; role?: UserRole } => {
    const result = verifyLoginCredentials(identifier, secret, tenants, rooms);

    if (result.success && result.user) {
      setCurrentUser(result.user);
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
        sessionStorage.removeItem(STORAGE_KEYS.USER);
      } else {
        sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      return { success: true, message: result.message, role: result.role };
    }

    return { success: false, message: result.message };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
    } catch { /* ignore */ }
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  // -------------------------------------------------------------
  // F2: MANAJEMEN KAMAR (ADMIN)
  // -------------------------------------------------------------
  const addRoom = (data: { roomNumber: string; type: RoomTypeId; floor: number; facilities?: string[] }) => {
    const res = addRoomDomain(data, rooms, roomTypes);
    if (!res.success) {
      return { success: false, message: res.message };
    }
    if (res.updatedRooms) {
      setRooms(res.updatedRooms);
    }
    showToast(res.message, 'success');
    return { success: true, message: res.message };
  };

  const updateRoom = (roomId: string, data: { roomNumber: string; type: RoomTypeId; floor: number }) => {
    const existing = rooms.find((r) => r.id === roomId);
    if (!existing) {
      return { success: false, message: 'Kamar tidak ditemukan.' };
    }

    const normalized = data.roomNumber.trim().toUpperCase();
    if (!isValidRoomNumberFormat(normalized)) {
      return { success: false, message: 'Nomor kamar harus berformat huruf K diikuti 2 digit angka (contoh: K21).' };
    }
    if (isRoomNumberDuplicate(normalized, rooms, roomId)) {
      return { success: false, message: `Nomor kamar ${normalized} sudah digunakan.` };
    }

    const typeChanged = existing.type !== data.type;
    const roomNumberChanged = existing.roomNumber.toUpperCase() !== normalized;
    const newPrice = getRoomTypePrice(data.type, roomTypes);

    // Poin 14: Jika tipe kamar berpenghuni diubah, rentAmount penghuni aktif
    // dan tagihan Belum untuk kamar itu ikut berubah!
    if (existing.currentTenantId) {
      const activeTenant = tenants.find((t) => t.id === existing.currentTenantId && t.status === 'Aktif');
      if (activeTenant) {
        if (typeChanged || roomNumberChanged) {
          setTenants((prev) =>
            prev.map((t) =>
              t.id === activeTenant.id
                ? {
                    ...t,
                    roomNumber: normalized,
                    rentAmount: typeChanged ? newPrice : t.rentAmount,
                  }
                : t
            )
          );

          setPayments((prev) =>
            prev.map((p) => {
              if (p.tenantId === activeTenant.id && p.status === 'Belum') {
                return {
                  ...p,
                  roomNumber: normalized,
                  amount: typeChanged ? newPrice : p.amount,
                };
              }
              if (p.tenantId === activeTenant.id && roomNumberChanged) {
                return {
                  ...p,
                  roomNumber: normalized,
                };
              }
              return p;
            })
          );
        }
      }
    }

    const roomTypeObj = roomTypes.find((rt) => rt.id === data.type);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              roomNumber: normalized,
              type: data.type,
              floor: data.floor,
              facilities: roomTypeObj?.facilities || r.facilities,
            }
          : r
      )
    );

    showToast(`Kamar ${normalized} berhasil diperbarui.`, 'success');
    return { success: true, message: `Kamar ${normalized} berhasil diperbarui.` };
  };

  const deleteRoom = (roomId: string) => {
    const res = deleteRoomDomain(roomId, rooms, tenants, payments);
    if (!res.success) {
      return { success: false, message: res.message };
    }
    if (res.updatedRooms) {
      setRooms(res.updatedRooms);
    }
    showToast(res.message, 'success');
    return { success: true, message: res.message };
  };

  // -------------------------------------------------------------
  // F2: MANAJEMEN PENGHUNI (ADMIN)
  // -------------------------------------------------------------
  const addTenant = (data: Omit<Tenant, 'id' | 'rentAmount' | 'pin'> & { pin?: string }) => {
    const targetRoomNumber = data.roomNumber.trim().toUpperCase();

    // 1. Cek keberadaan kamar
    const targetRoom = rooms.find((r) => r.roomNumber.toUpperCase() === targetRoomNumber);
    if (!targetRoom) {
      return {
        success: false,
        message: `Kamar ${targetRoomNumber} tidak ditemukan di sistem.`,
      };
    }

    // 2. ATURAN BISNIS: Satu kamar hanya dapat ditempati oleh 1 penghuni aktif!
    const assignCheck = canAssignTenantToRoom(targetRoomNumber, tenants);
    if (!assignCheck.allowed) {
      return {
        success: false,
        message: assignCheck.message || 'Kamar sudah terisi.',
      };
    }

    // 3. ATURAN BISNIS: Harga sewa otomatis mengikuti tipe kamar!
    const rentAmount = getRoomTypePrice(targetRoom.type, roomTypes);

    // Poin 20: PIN penghuni baru diacak 4 digit (bukan selalu 1234)
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newId = `T${String(tenants.length + 1).padStart(2, '0')}`;
    const newTenant: Tenant = {
      ...data,
      id: newId,
      roomNumber: targetRoomNumber,
      rentAmount,
      pin: data.pin || generatedPin,
      status: 'Aktif',
    };

    // Update daftar penghuni
    setTenants((prev) => [...prev, newTenant]);

    // 4. ATURAN BISNIS: Status kamar otomatis berubah menjadi "Terisi"!
    setRooms((prev) =>
      prev.map((room) =>
        room.roomNumber.toUpperCase() === targetRoomNumber
          ? {
              ...room,
              status: 'Terisi',
              currentTenantId: newId,
              currentTenantName: newTenant.name,
            }
          : room
      )
    );

    // Poin 5 & 6: Tentukan periode tagihan awal berdasarkan startDate dan currentYM
    // Penghuni baru tidak boleh punya tagihan sebelum bulan tanggal masuknya.
    const currentYM = getCurrentYearMonth();
    const tenantStartYM = (data.startDate || currentYM).slice(0, 7);
    const initialBillYM = tenantStartYM > currentYM ? tenantStartYM : currentYM;

    // Poin 4: Cocokkan tagihan HANYA dengan tenantId (newId), bukan dengan roomNumber
    const billExists = payments.some(
      (p) => p.tenantId === newId && p.yearMonth === initialBillYM
    );

    if (!billExists) {
      const newPayment: Payment = {
        id: `PAY-${initialBillYM.replace('-', '')}-${newId}`,
        tenantId: newId,
        tenantName: newTenant.name,
        roomNumber: targetRoomNumber,
        month: formatPeriode(initialBillYM),
        yearMonth: initialBillYM,
        amount: rentAmount,
        dueDate: getDueDate(initialBillYM),
        paidDate: null,
        status: 'Belum',
      };
      setPayments((prev) => [newPayment, ...prev]);
    }

    showToast(`Penghuni ${newTenant.name} berhasil ditambahkan ke Kamar ${targetRoomNumber}.`, 'success');
    return { success: true, message: 'Penghuni berhasil ditambahkan.', pin: newTenant.pin };
  };

  const updateTenant = (tenantId: string, updatedData: Partial<Tenant>) => {
    const existing = tenants.find((t) => t.id === tenantId);
    if (!existing) {
      return { success: false, message: 'Data penghuni tidak ditemukan.' };
    }

    // Poin 7: Pindah kamar (updateTenant) - normalisasi nomor kamar ke huruf kapital sebelum membandingkan
    const normalizedNewRoom = updatedData.roomNumber ? updatedData.roomNumber.trim().toUpperCase() : undefined;
    const isMovingRoom = normalizedNewRoom && normalizedNewRoom !== existing.roomNumber.toUpperCase();

    if (isMovingRoom) {
      const targetRoom = rooms.find((r) => r.roomNumber.toUpperCase() === normalizedNewRoom);
      if (!targetRoom) {
        return { success: false, message: `Kamar ${normalizedNewRoom} tidak ditemukan di sistem Kos Popo.` };
      }

      // Cek apakah kamar baru sudah terisi oleh penghuni aktif lain
      const checkAssign = canAssignTenantToRoom(normalizedNewRoom, tenants, tenantId);
      if (!checkAssign.allowed) {
        return {
          success: false,
          message: checkAssign.message || `Kamar ${normalizedNewRoom} sudah dihuni orang lain.`,
        };
      }

      // Kosongkan kamar lama dan isi kamar baru
      const newRentAmount = getRoomTypePrice(targetRoom.type, roomTypes);
      setRooms((prev) =>
        prev.map((r) => {
          if (r.roomNumber.toUpperCase() === existing.roomNumber.toUpperCase()) {
            return { ...r, status: 'Kosong', currentTenantId: undefined, currentTenantName: undefined };
          }
          if (r.roomNumber.toUpperCase() === normalizedNewRoom) {
            return { ...r, status: 'Terisi', currentTenantId: tenantId, currentTenantName: updatedData.name || existing.name };
          }
          return r;
        })
      );

      updatedData.roomNumber = targetRoom.roomNumber;
      updatedData.rentAmount = newRentAmount;

      // Poin 7: Perbarui roomNumber dan amount pada tagihan berstatus Belum milik penghuni itu mengikuti harga tipe kamar baru, dan JANGAN ubah tagihan Lunas!
      setPayments((prev) =>
        prev.map((p) => {
          if (p.tenantId === tenantId && p.status === 'Belum') {
            return {
              ...p,
              roomNumber: targetRoom.roomNumber,
              amount: newRentAmount,
            };
          }
          return p;
        })
      );
    }

    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, ...updatedData } : t))
    );

    // Sync room tenant name jika nama diubah
    if (updatedData.name) {
      setRooms((prev) =>
        prev.map((r) =>
          r.currentTenantId === tenantId ? { ...r, currentTenantName: updatedData.name } : r
        )
      );
    }

    showToast('Data penghuni berhasil diperbarui.', 'success');
    return { success: true, message: 'Data penghuni berhasil diperbarui.' };
  };

  const deactivateTenant = (tenantId: string) => {
    const today = getToday();
    const res = deactivateTenantDomain(tenantId, tenants, rooms, today);
    if (!res.success) {
      return { success: false, message: res.message };
    }

    if (res.updatedTenants) {
      setTenants(res.updatedTenants);
    }
    if (res.updatedRooms) {
      setRooms(res.updatedRooms);
    }

    showToast(res.message, 'info');
    return { success: true, message: res.message };
  };

  const resetTenantPin = (tenantId: string) => {
    const res = resetTenantPinDomain(tenantId, tenants);
    if (!res.success) {
      return { success: false, message: res.message };
    }

    if (res.updatedTenants) {
      setTenants(res.updatedTenants);
    }

    showToast(res.message, 'success');
    return { success: true, newPin: res.newPin, message: res.message };
  };

  // -------------------------------------------------------------
  // F3: PEMBAYARAN SEWA
  // -------------------------------------------------------------
  const generateMonthlyBills = (targetYearMonth: string = getCurrentYearMonth()) => {
    const ym = targetYearMonth;
    const periodLabel = formatPeriode(ym);
    const dueDate = getDueDate(ym);
    const activeTenants = tenants.filter((t) => t.status === 'Aktif');

    let createdCount = 0;
    const newBills: Payment[] = [];

    activeTenants.forEach((t) => {
      // Poin 6: Penghuni tidak boleh punya tagihan pada periode sebelum bulan tanggal masuknya
      const tenantStartYM = (t.startDate || '').slice(0, 7);
      if (tenantStartYM && ym < tenantStartYM) {
        return;
      }

      // Poin 4: Cocokkan tagihan HANYA dengan tenantId, jangan dengan roomNumber
      const exists = payments.some(
        (p) => p.tenantId === t.id && p.yearMonth === ym
      );

      if (!exists) {
        createdCount++;
        newBills.push({
          id: `PAY-${ym.replace('-', '')}-${t.id}`,
          tenantId: t.id,
          tenantName: t.name,
          roomNumber: t.roomNumber,
          month: periodLabel,
          yearMonth: ym,
          amount: t.rentAmount,
          dueDate,
          paidDate: null,
          status: 'Belum',
        });
      }
    });

    if (createdCount > 0) {
      setPayments((prev) => [...newBills, ...prev]);
      showToast(
        `Berhasil membuat ${createdCount} tagihan baru untuk periode ${periodLabel}.`,
        'success'
      );
      return { success: true, count: createdCount, message: `Berhasil membuat ${createdCount} tagihan.` };
    } else {
      showToast(
        `Semua penghuni aktif yang memenuhi syarat sudah memiliki tagihan untuk periode ${periodLabel}.`,
        'info'
      );
      return { success: false, count: 0, message: `Semua penghuni aktif sudah memiliki tagihan untuk ${periodLabel}.` };
    }
  };

  const recordPayment = (data: {
    tenantId: string;
    yearMonth: string;
    paymentMethod: 'Transfer BCA' | 'QRIS' | 'Tunai';
    paidDate?: string | null;
  }) => {
    const tenant = tenants.find((t) => t.id === data.tenantId);
    if (!tenant) {
      return { success: false, message: 'Penghuni tidak ditemukan.' };
    }

    const ym = data.yearMonth || getCurrentYearMonth();
    const periodLabel = formatPeriode(ym);
    const paymentDate = data.paidDate || getToday();

    // Poin 4: Cocokkan HANYA dengan tenantId & yearMonth
    const existingBillIndex = payments.findIndex(
      (p) => p.tenantId === data.tenantId && p.yearMonth === ym
    );

    if (existingBillIndex >= 0) {
      setPayments((prev) => {
        const next = [...prev];
        next[existingBillIndex] = {
          ...next[existingBillIndex],
          status: 'Lunas',
          paidDate: paymentDate,
          paymentMethod: data.paymentMethod,
        };
        return next;
      });
      showToast(
        `Pembayaran sewa ${tenant.name} (${periodLabel}) berhasil dicatat sebagai LUNAS.`,
        'success'
      );
      return { success: true, message: 'Pembayaran berhasil dicatat sebagai lunas.' };
    } else {
      const newPayment: Payment = {
        id: `PAY-${ym.replace('-', '')}-${tenant.id}`,
        tenantId: tenant.id,
        tenantName: tenant.name,
        roomNumber: tenant.roomNumber,
        month: periodLabel,
        yearMonth: ym,
        amount: tenant.rentAmount,
        dueDate: getDueDate(ym),
        paidDate: paymentDate,
        status: 'Lunas',
        paymentMethod: data.paymentMethod,
      };
      setPayments((prev) => [newPayment, ...prev]);
      showToast(
        `Tagihan baru dan pembayaran ${tenant.name} (${periodLabel}) berhasil dibuat & lunas.`,
        'success'
      );
      return { success: true, message: 'Tagihan baru berhasil dibuat dan langsung lunas.' };
    }
  };

  const markPaymentPaid = (
    paymentId: string,
    method: 'Transfer BCA' | 'QRIS' | 'Tunai' = 'Transfer BCA'
  ) => {
    const target = payments.find((p) => p.id === paymentId);
    if (!target) {
      return { success: false, message: 'Data pembayaran tidak ditemukan.' };
    }

    const today = getToday();
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: 'Lunas',
              paidDate: today,
              paymentMethod: method,
            }
          : p
      )
    );

    showToast(
      `Pembayaran ${target.tenantName} (${target.month}) sebesar ${formatTanggalSingkat(today)} berhasil ditandai LUNAS.`,
      'success'
    );
    return { success: true, message: 'Pembayaran berhasil ditandai lunas.' };
  };

  // -------------------------------------------------------------
  // F4: LAPORAN KERUSAKAN
  // -------------------------------------------------------------
  const submitIssue = (
    data: Omit<MaintenanceIssue, 'id' | 'status' | 'reportedDate'>
  ) => {
    const newId = `ISS-${Date.now().toString().slice(-4)}`;
    const newIssue: MaintenanceIssue = {
      ...data,
      id: newId,
      status: 'Dilaporkan',
      reportedDate: getToday(),
    };

    setIssues((prev) => [newIssue, ...prev]);
    showToast(
      `Laporan kerusakan "${newIssue.title}" untuk Kamar ${newIssue.roomNumber} berhasil dikirim ke pengelola.`,
      'success'
    );
    return { success: true, message: 'Laporan kerusakan berhasil dikirim.' };
  };

  const updateIssueStatus = (
    issueId: string,
    status: 'Dilaporkan' | 'Diproses' | 'Selesai',
    completedDate?: string,
    cost?: number,
    repairNotes?: string
  ) => {
    const existing = issues.find((i) => i.id === issueId);
    if (!existing) {
      return { success: false, message: 'Laporan kerusakan tidak ditemukan.' };
    }

    const updatedIssue: MaintenanceIssue = {
      ...existing,
      status,
      repairNotes: repairNotes ?? existing.repairNotes,
      cost: cost !== undefined ? cost : existing.cost,
      completedDate: status === 'Selesai' ? (completedDate || getToday()) : existing.completedDate,
    };

    setIssues((prev) => prev.map((i) => (i.id === issueId ? updatedIssue : i)));
    showToast(
      `Status laporan kerusakan Kamar ${existing.roomNumber} diperbarui menjadi: ${status}.`,
      'success'
    );
    return { success: true, message: 'Status kerusakan berhasil diperbarui.' };
  };

  // -------------------------------------------------------------
  // RESET DATA DEMO
  // -------------------------------------------------------------
  const resetDataToDefault = () => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(initialRooms));
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(initialTenants));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initialPayments));
    localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(initialIssues));
    setRooms(initialRooms);
    setTenants(initialTenants);
    setPayments(initialPayments);
    setIssues(initialIssues);
    resetDemoDateToDefault();
    showToast('Seluruh data demo berhasil dikembalikan ke kondisi bawaan.', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        rooms,
        roomTypes,
        tenants,
        payments,
        issues,
        currentUser,
        darkMode,
        toasts,
        demoDate,
        setDemoDate,
        resetDemoDateToDefault,
        useComputerDate,
        toggleDarkMode,
        showToast,
        removeToast,
        loginUnified,
        logout,
        addRoom,
        updateRoom,
        deleteRoom,
        addTenant,
        updateTenant,
        deactivateTenant,
        resetTenantPin,
        recordPayment,
        generateMonthlyBills,
        markPaymentPaid,
        submitIssue,
        updateIssueStatus,
        resetDataToDefault,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp harus digunakan di dalam AppProvider');
  }
  return context;
};
