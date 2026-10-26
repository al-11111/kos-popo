/**
 * Utilities for Kos Popo: Currency, Date, and Room helpers
 */

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, ''); // Format as Rp700.000
};

export const formatTanggal = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const formatTanggalSingkat = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

/**
 * Menghitung tanggal akhir sewa default (1 tahun dari tanggal mulai)
 */
export const getDefaultEndDate = (startDate: string): string => {
  if (!startDate) return '';
  try {
    const parts = startDate.split('-');
    if (parts.length !== 3) return '';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const endDate = new Date(y + 1, m - 1, d);
    const yr = endDate.getFullYear();
    const mo = String(endDate.getMonth() + 1).padStart(2, '0');
    const da = String(endDate.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  } catch {
    return '';
  }
};

export const DEFAULT_DEMO_DATE = '2026-10-13';

/**
 * Membaca tanggal demo dari localStorage atau default ke 2026-10-13
 */
export const getDemoDate = (): string => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('kos_popo_demo_date');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore storage issues in test/restricted environment
  }
  return DEFAULT_DEMO_DATE;
};

/**
 * Menyimpan tanggal demo ke localStorage
 */
export const setDemoDateStorage = (date: string | null): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        localStorage.setItem('kos_popo_demo_date', date);
      } else {
        localStorage.removeItem('kos_popo_demo_date');
      }
    }
  } catch {
    // Ignore storage issues
  }
};

/**
 * Mendapatkan tanggal asli komputer saat ini dalam format YYYY-MM-DD
 */
export const getComputerToday = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Mendapatkan tanggal sistem demo (default: 2026-10-13)
 * Menjamin tanggal demo stabil dan konsisten di seluruh halaman tanpa new Date() langsung.
 */
export const getToday = (): string => {
  return getDemoDate();
};

/**
 * Mendapatkan periode tahun-bulan saat ini dalam format YYYY-MM
 */
export const getCurrentYearMonth = (): string => {
  return getToday().slice(0, 7);
};

/**
 * Format string periode 'YYYY-MM' menjadi nama bulan dan tahun Indonesia,
 * contoh: '2026-10' -> 'Oktober 2026'
 */
export const formatPeriode = (yearMonth: string): string => {
  if (!yearMonth) return '-';
  if (!yearMonth.includes('-')) return yearMonth;
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return yearMonth;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/**
 * Mendapatkan tanggal jatuh tempo (tanggal 10 bulan itu) dalam format YYYY-MM-DD
 * contoh: '2026-10' -> '2026-10-10'
 */
export const getDueDate = (yearMonth: string): string => {
  if (!yearMonth) return '';
  const cleanYM = yearMonth.slice(0, 7);
  return `${cleanYM}-10`;
};

/**
 * Memeriksa apakah suatu tagihan sudah melewati jatuh tempo (overdue)
 */
export const isOverdue = (dueDate: string, today: string = getToday()): boolean => {
  if (!dueDate) return false;
  return dueDate < today;
};

/**
 * Menghitung selisih hari terlambat dari tanggal jatuh tempo
 */
export const getDaysOverdue = (dueDate: string, today: string = getToday()): number => {
  if (!dueDate || !isOverdue(dueDate, today)) return 0;
  try {
    const dueTime = new Date(dueDate).getTime();
    const todayTime = new Date(today).getTime();
    const diffTime = todayTime - dueTime;
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
};

/**
 * Menghitung daftar 6 bulan terakhir dinamis berdasarkan periode dasar (default getCurrentYearMonth())
 */
export const getLast6Months = (baseYM: string = getCurrentYearMonth()): { ym: string; shortMonth: string; month: string }[] => {
  const [yearStr, monthStr] = baseYM.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const result: { ym: string; shortMonth: string; month: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const ym = `${yr}-${mo}`;
    const shortMonth = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d);
    const month = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
    result.push({ ym, shortMonth, month });
  }
  return result;
};



