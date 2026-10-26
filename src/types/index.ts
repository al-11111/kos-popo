export type RoomTypeId = 1 | 2 | 3;

export interface RoomType {
  id: RoomTypeId;
  name: string; // 'Tipe 1', 'Tipe 2', 'Tipe 3'
  priceMonthly: number;
  facilities: string[];
}

export interface Room {
  id: string;
  roomNumber: string; // format K + 2 digit
  type: RoomTypeId;
  floor: number; // 1 atau 2 (data tambahan)
  facilities?: string[];
  status: 'Terisi' | 'Kosong';
  currentTenantId?: string;
  currentTenantName?: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  roomNumber: string;
  pin: string; // 4 digit PIN
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'Aktif' | 'Nonaktif';
  deactivatedDate?: string; // YYYY-MM-DD saat dinonaktifkan
  emergencyContact: string;
  rentAmount: number;
  notes?: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  month: string; // 'Oktober 2026'
  yearMonth: string; // '2026-10'
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paidDate: string | null; // null if Belum Lunas
  status: 'Lunas' | 'Belum';
  paymentMethod?: 'Transfer BCA' | 'QRIS' | 'Tunai';
}

export type IssueStatus = 'Dilaporkan' | 'Diproses' | 'Selesai';
export type IssueCategory = 'Listrik' | 'Air / Sanitasi' | 'Perabot' | 'AC / Kipas' | 'Lainnya';

export interface MaintenanceIssue {
  id: string;
  roomNumber: string;
  tenantName: string;
  category: IssueCategory;
  title: string;
  description: string;
  reportedDate: string; // YYYY-MM-DD
  status: IssueStatus;
  completedDate?: string;
  cost?: number;
  repairNotes?: string;
}

export type UserRole = 'penghuni' | 'admin' | 'pemilik';

export interface CurrentUser {
  role: UserRole;
  name: string;
  email?: string;
  roomNumber?: string;
  tenantId?: string;
}
