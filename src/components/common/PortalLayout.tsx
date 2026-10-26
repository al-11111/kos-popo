import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatTanggalSingkat } from '../../utils/formatters';
import {
  DoorClosed,
  Users,
  CreditCard,
  Wrench,
  LayoutDashboard,
  Home,
  LogOut,
  Sun,
  Moon,
  Search,
  RotateCcw,
  Calendar,
  FileText,
} from 'lucide-react';
import { QuickSearchModal } from './QuickSearchModal';
import { Modal } from '../ui/Modal';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: string | number;
}

interface PortalLayoutProps {
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
  const {
    currentUser,
    logout,
    darkMode,
    toggleDarkMode,
    resetDataToDefault,
    rooms,
    tenants,
    demoDate,
    setDemoDate,
    useComputerDate,
  } = useApp();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditingDemoDate, setIsEditingDemoDate] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Keyboard shortcut Ctrl+K or / for quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav items based on role
  let navItems: NavItem[] = [];
  if (currentUser?.role === 'admin') {
    navItems = [
      { to: '/admin/kamar', label: 'Data Kamar', icon: DoorClosed, count: rooms.length },
      { to: '/admin/penghuni', label: 'Penghuni', icon: Users, count: tenants.filter((t) => t.status === 'Aktif').length },
      { to: '/admin/pembayaran', label: 'Pembayaran', icon: CreditCard },
      { to: '/admin/kerusakan', label: 'Kerusakan', icon: Wrench },
    ];
  } else if (currentUser?.role === 'pemilik') {
    navItems = [
      { to: '/pemilik/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
      { to: '/pemilik/rekap', label: 'Rekap Laporan', icon: FileText },
    ];
  } else {
    // Penghuni
    navItems = [
      { to: '/penghuni/dashboard', label: 'Kamar Saya', icon: Home },
    ];
  }

  const roleLabel =
    currentUser?.role === 'admin'
      ? 'Admin'
      : currentUser?.role === 'pemilik'
      ? 'Pemilik'
      : 'Penghuni';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F5F0] dark:bg-[#151816] text-[#1F2421] dark:text-[#E8EAE6] transition-colors duration-150">
      <QuickSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Desktop Sidebar (sempit ~230px, flat, no circular icon badges) */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] shrink-0 sticky top-0 h-screen justify-between p-4 z-20">
        <div className="flex flex-col gap-6">
          {/* Minimalist Logotype (Text + Line Home Icon) */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-[#2F6B57] dark:bg-[#5FAE92] text-white dark:text-[#151816] flex items-center justify-center shrink-0">
              <Home className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-[#1F2421] dark:text-[#E8EAE6] block leading-none">
                Kos Popo
              </span>
              <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] mt-0.5 block">
                Portal {roleLabel}
              </span>
            </div>
          </div>

          {/* Quick Search Shortcut Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-[#6B706B] dark:text-[#A0A6A0] text-xs hover:border-[#2F6B57]/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Cari...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D] rounded">
              /
            </kbd>
          </button>

          {/* Nav List */}
          <nav className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[#6B706B] dark:text-[#A0A6A0] px-3 pb-1 uppercase tracking-wider">
              Navigasi
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-l-2 border-[#2F6B57] dark:border-[#5FAE92] bg-[#E6F0EB] dark:bg-[#1C2D25] text-[#2F6B57] dark:text-[#5FAE92] rounded-l-none font-semibold'
                        : 'text-[#6B706B] dark:text-[#A0A6A0] hover:bg-[#F7F5F0] dark:hover:bg-[#151816] hover:text-[#1F2421] dark:hover:text-[#E8EAE6]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                            isActive
                              ? 'bg-[#2F6B57]/15 dark:bg-[#5FAE92]/20 text-[#2F6B57] dark:text-[#5FAE92]'
                              : 'text-[#6B706B] dark:text-[#A0A6A0]'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Footer Actions */}
        <div className="pt-4 border-t border-[#E6E2D8] dark:border-[#2B302D] flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs truncate mr-2">
              <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6] block truncate">
                {currentUser?.name || 'Pengguna'}
              </span>
              <span className="text-[#6B706B] dark:text-[#A0A6A0] text-[11px] block truncate">
                {currentUser?.roomNumber ? `Kamar ${currentUser.roomNumber}` : currentUser?.email}
              </span>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg text-[#6B706B] hover:text-[#1F2421] dark:text-[#A0A6A0] dark:hover:text-[#E8EAE6] hover:bg-[#F7F5F0] dark:hover:bg-[#151816] transition-colors shrink-0"
              title="Ganti Mode Gelap/Terang"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#D97706]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Mode Demo Control Box (Poin 2 & Poin 23) - HANYA di portal Admin */}
          {currentUser?.role === 'admin' && (
            <div className="p-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/60 dark:bg-[#151816]/60 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
                  Mode demo
                </span>
                <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0]">Admin</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#1F2421] dark:text-[#E8EAE6]">
                  Tanggal demo: <span className="font-semibold text-[#2F6B57] dark:text-[#5FAE92]">{formatTanggalSingkat(demoDate)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingDemoDate(!isEditingDemoDate)}
                  className="text-[10px] text-[#2F6B57] dark:text-[#5FAE92] hover:underline font-medium"
                >
                  {isEditingDemoDate ? 'Tutup' : 'Ubah tanggal'}
                </button>
              </div>

              {isEditingDemoDate && (
                <div className="space-y-1.5 pt-1 border-t border-[#E6E2D8] dark:border-[#2B302D]">
                  <input
                    type="date"
                    value={demoDate}
                    onChange={(e) => setDemoDate(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono text-[#1F2421] dark:text-[#E8EAE6] outline-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={useComputerDate}
                className="w-full py-1 px-1.5 rounded border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] hover:bg-[#F7F5F0] dark:hover:bg-[#151816] text-[10px] text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] dark:hover:text-[#E8EAE6] transition-colors text-center block"
              >
                Pakai tanggal asli komputer
              </button>

              <p className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] leading-tight">
                Mengubah tanggal memengaruhi periode berjalan dan penghitungan keterlambatan.
              </p>

              {/* Tombol Reset Data Demo dengan Dialog Konfirmasi (Poin 23) */}
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] hover:bg-[#FDF0F0] dark:hover:bg-[#2E1818] text-[10px] text-[#B23A3A] hover:text-[#9B2E2E] transition-colors"
                title="Reset data demo ke default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Data Demo</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="w-full py-1.5 px-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[11px] text-[#B23A3A] hover:bg-[#FDF0F0] dark:hover:bg-[#2E1818] transition-colors flex items-center justify-center gap-1"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>

          <div className="text-[10px] text-center text-[#6B706B] dark:text-[#A0A6A0]">
            Kos Popo · <span className="font-medium">Data demo</span>
          </div>
        </div>
      </aside>

      {/* Main Container Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-6">
        {/* Mobile Top Header */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#1D211F]/90 backdrop-blur-sm border-b border-[#E6E2D8] dark:border-[#2B302D]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2F6B57] dark:bg-[#5FAE92] text-white dark:text-[#151816] flex items-center justify-center">
              <Home className="w-3.5 h-3.5 stroke-[2]" />
            </div>
            <span className="font-semibold text-sm text-[#1F2421] dark:text-[#E8EAE6]">
              Kos Popo
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditingDemoDate((prev) => !prev)}
              className="p-1.5 rounded-lg text-[#2F6B57] dark:text-[#5FAE92] text-xs font-mono font-medium border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] flex items-center gap-1"
              title="Tanggal Demo"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatTanggalSingkat(demoDate)}</span>
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg text-[#6B706B] dark:text-[#A0A6A0]"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-[#6B706B] dark:text-[#A0A6A0]"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#D97706]" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-[#B23A3A]"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile dropdown for demo date editing */}
        {isEditingDemoDate && (
          <div className="md:hidden bg-white dark:bg-[#1D211F] border-b border-[#E6E2D8] dark:border-[#2B302D] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                Tanggal demo: <span className="font-semibold text-[#2F6B57] dark:text-[#5FAE92]">{formatTanggalSingkat(demoDate)}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingDemoDate(false)}
                className="text-xs text-[#6B706B] dark:text-[#A0A6A0]"
              >
                Tutup
              </button>
            </div>
            <input
              type="date"
              value={demoDate}
              onChange={(e) => setDemoDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-xs font-mono text-[#1F2421] dark:text-[#E8EAE6]"
            />
            <button
              type="button"
              onClick={useComputerDate}
              className="w-full py-1.5 rounded border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-xs text-[#1F2421] dark:text-[#E8EAE6]"
            >
              Pakai tanggal asli komputer
            </button>
            <p className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0]">
              Mengubah tanggal memengaruhi periode berjalan dan penghitungan keterlambatan.
            </p>
          </div>
        )}

        {/* Content Body (max width ~1200px) */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>

        {/* Minimal Footer */}
        <footer className="px-6 py-4 text-center text-xs text-[#6B706B] dark:text-[#A0A6A0] border-t border-[#E6E2D8] dark:border-[#2B302D] mt-auto">
          Kos Popo — Sistem Informasi Manajemen Kos · <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6]">Data demo</span> (Proyek Akhir Manajemen Proyek)
        </footer>
      </div>

      {/* Mobile Bottom Navigation (<= 5 items, touch target >= 44px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1D211F] border-t border-[#E6E2D8] dark:border-[#2B302D] flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full min-h-[44px] text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#2F6B57] dark:text-[#5FAE92] font-semibold'
                    : 'text-[#6B706B] dark:text-[#A0A6A0]'
                }`
              }
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Dialog Konfirmasi Reset Data Demo (Poin 23) */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset Data Demo"
        description="Kembalikan seluruh data aplikasi ke kondisi awal proyek"
      >
        <div className="space-y-4 pt-1 text-xs">
          <p className="text-[#6B706B] dark:text-[#A0A6A0] leading-relaxed">
            Apakah Anda yakin ingin mengembalikan seluruh data kamar, penghuni, pembayaran, dan kerusakan ke data contoh bawaan? Seluruh perubahan selama simulasi akan direset.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] dark:hover:text-[#E8EAE6] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                resetDataToDefault();
                setIsResetConfirmOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#B23A3A] hover:bg-[#9B2E2E] text-white font-medium transition-colors"
            >
              Ya, Reset Data
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
