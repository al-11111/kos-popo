/**
 * PERINGATAN KEAMANAN:
 * Kredensial, kata sandi, dan PIN yang digunakan dalam aplikasi ini hanya
 * ditujukan untuk keperluan demo prototipe sistem (F1), BUKAN untuk lingkungan produksi.
 * Pada implementasi sungguhan (modul Odoo 19 'kos_popo'), autentikasi dikelola oleh
 * sistem backend yang aman menggunakan hashing kriptografis (bcrypt/Argon2) dan sesi terenkripsi.
 */

import { UserRole, Tenant, Room } from '../types';
import { verifyLoginCredentials, AuthResult, normalizeRoomNumberInput } from './domain';

export interface AuthDetection {
  detectedRole: UserRole | null;
  roleLabel: string;
}

/**
 * Mendeteksi peran secara otomatis HANYA berdasarkan:
 * - Nomor kamar K01 s/d K20 -> Penghuni (hanya muncul jika kamar ada di sistem)
 * - Email admin@kospopo.id -> Admin
 * - Email pemilik@kospopo.id -> Pemilik
 * (Alias 'admin'/'pemilik' tanpa email dan nama penghuni ditiadakan sesuai spesifikasi F1)
 */
export const detectRoleFromIdentifier = (identifier: string, rooms?: Room[]): AuthDetection => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { detectedRole: null, roleLabel: '' };
  }

  const lower = trimmed.toLowerCase();

  // Pola Kamar: K01 s/d K20 (termasuk normalisasi K5/k5 -> K05)
  const roomPattern = /^k0?([1-9]|1[0-9]|20)$/i;
  if (roomPattern.test(trimmed)) {
    const normalizedRoom = normalizeRoomNumberInput(trimmed);
    
    // Poin 1: Chip "Masuk sebagai Penghuni" hanya muncul jika kamar tersebut ada
    if (rooms && rooms.length > 0) {
      const roomExists = rooms.some((r) => r.roomNumber.toUpperCase() === normalizedRoom);
      if (!roomExists) {
        return { detectedRole: null, roleLabel: '' };
      }
    }

    return {
      detectedRole: 'penghuni',
      roleLabel: `Masuk sebagai Penghuni (${normalizedRoom})`,
    };
  }

  // Pola Admin: Hanya email lengkap
  if (lower === 'admin@kospopo.id') {
    return {
      detectedRole: 'admin',
      roleLabel: 'Masuk sebagai Pengelola (Admin)',
    };
  }

  // Pola Pemilik: Hanya email lengkap
  if (lower === 'pemilik@kospopo.id') {
    return {
      detectedRole: 'pemilik',
      roleLabel: 'Masuk sebagai Pemilik Kos',
    };
  }

  return { detectedRole: null, roleLabel: '' };
};

/**
 * Menggabungkan deteksi peran dan verifikasi kredensial di satu fungsi terpusat
 * agar chip 'Masuk sebagai...' selalu konsisten dengan hasil login.
 */
export const authenticateAndVerify = (
  identifier: string,
  secret: string,
  tenants: Tenant[],
  rooms: Room[]
): AuthResult => {
  return verifyLoginCredentials(identifier, secret, tenants, rooms);
};

export const getDesignatedPortalPath = (role: UserRole): string => {
  switch (role) {
    case 'penghuni':
      return '/penghuni/dashboard';
    case 'admin':
      return '/admin/kamar';
    case 'pemilik':
      return '/pemilik/dashboard';
    default:
      return '/login';
  }
};
