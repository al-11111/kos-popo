import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { getDesignatedPortalPath } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'penghuni':
      return 'Penghuni';
    case 'admin':
      return 'Admin';
    case 'pemilik':
      return 'Pemilik';
    default:
      return role;
  }
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { currentUser, showToast } = useApp();
  const location = useLocation();
  const lastNotified = useRef<string | null>(null);

  useEffect(() => {
    const notifyKey = `${currentUser?.role || 'guest'}-${location.pathname}`;
    if (lastNotified.current === notifyKey) return;
    lastNotified.current = notifyKey;

    const targetRoleName = getRoleDisplayName(allowedRole);

    if (!currentUser) {
      showToast(
        `Silakan masuk terlebih dahulu untuk mengakses portal ${targetRoleName}.`,
        'info'
      );
    } else if (currentUser.role !== allowedRole) {
      let explanation = '';
      if (currentUser.role === 'penghuni') {
        explanation = `Halaman ${targetRoleName} tidak dapat diakses oleh Penghuni. Anda dialihkan kembali ke portal kamar Anda.`;
      } else if (currentUser.role === 'admin') {
        explanation = `Halaman ini dikhususkan untuk ${targetRoleName}. Anda dialihkan kembali ke Ruang Kerja Admin.`;
      } else {
        explanation = `Halaman ini ditujukan untuk ${targetRoleName}. Anda dialihkan kembali ke Dasbor Pemilik.`;
      }
      showToast(explanation, 'info');
    }
  }, [currentUser, allowedRole, location.pathname, showToast]);

  // Belum login -> arahkan ke halaman login terpadu (/login)
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Peran tidak cocok -> arahkan ke portal sendiri
  if (currentUser.role !== allowedRole) {
    return <Navigate to={getDesignatedPortalPath(currentUser.role)} replace />;
  }

  return <>{children}</>;
};
