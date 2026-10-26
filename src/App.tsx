import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastContainer } from './components/ui/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';

// Single Unified Login Page (Section 5)
import { Login } from './pages/Login';

// Unified Portal Layout (Section 4.8)
import { PortalLayout } from './components/common/PortalLayout';

// Admin Portal Pages
import { KamarAdmin } from './pages/admin/KamarAdmin';
import { PenghuniAdmin } from './pages/admin/PenghuniAdmin';
import { PembayaranAdmin } from './pages/admin/PembayaranAdmin';
import { KerusakanAdmin } from './pages/admin/KerusakanAdmin';

// Pemilik Portal Pages
import { DashboardPemilik } from './pages/pemilik/DashboardPemilik';
import { RekapPemilik } from './pages/pemilik/RekapPemilik';

// Penghuni Portal Pages
import { DashboardPenghuni } from './pages/penghuni/DashboardPenghuni';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          {/* Section 5: Route "/" langsung redirect ke "/login" */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Halaman Login Terpadu Otomatis Mengenali Peran */}
          <Route path="/login" element={<Login />} />

          {/* Portal Penghuni */}
          <Route
            path="/penghuni"
            element={<Navigate to="/penghuni/dashboard" replace />}
          />
          <Route
            path="/penghuni/dashboard"
            element={
              <ProtectedRoute allowedRole="penghuni">
                <PortalLayout>
                  <DashboardPenghuni />
                </PortalLayout>
              </ProtectedRoute>
            }
          />

          {/* Portal Admin */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/kamar" replace />}
          />
          <Route
            path="/admin/kamar"
            element={
              <ProtectedRoute allowedRole="admin">
                <PortalLayout>
                  <KamarAdmin />
                </PortalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/penghuni"
            element={
              <ProtectedRoute allowedRole="admin">
                <PortalLayout>
                  <PenghuniAdmin />
                </PortalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pembayaran"
            element={
              <ProtectedRoute allowedRole="admin">
                <PortalLayout>
                  <PembayaranAdmin />
                </PortalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kerusakan"
            element={
              <ProtectedRoute allowedRole="admin">
                <PortalLayout>
                  <KerusakanAdmin />
                </PortalLayout>
              </ProtectedRoute>
            }
          />

          {/* Portal Pemilik */}
          <Route
            path="/pemilik"
            element={<Navigate to="/pemilik/dashboard" replace />}
          />
          <Route
            path="/pemilik/dashboard"
            element={
              <ProtectedRoute allowedRole="pemilik">
                <PortalLayout>
                  <DashboardPemilik />
                </PortalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pemilik/rekap"
            element={
              <ProtectedRoute allowedRole="pemilik">
                <PortalLayout>
                  <RekapPemilik />
                </PortalLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback ke /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
