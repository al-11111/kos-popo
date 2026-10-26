import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { detectRoleFromIdentifier, getDesignatedPortalPath } from '../utils/auth';
import {
  Home,
  Shield,
  LineChart,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loginUnified, darkMode, toggleDarkMode, rooms } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');

  // Jika sudah login, langsung arahkan ke portal sesuai perannya
  useEffect(() => {
    if (currentUser) {
      navigate(getDesignatedPortalPath(currentUser.role), { replace: true });
    }
  }, [currentUser, navigate]);

  // Deteksi peran otomatis saat mengetik (hanya muncul jika kamar ada di sistem)
  const { detectedRole, roleLabel } = detectRoleFromIdentifier(identifier, rooms);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim() || !secret.trim()) {
      setErrorMsg('Harap masukkan email/nomor kamar dan kata sandi/PIN.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = loginUnified(identifier, secret, rememberMe);
      setIsLoading(false);

      if (result.success && result.role) {
        // Poin 19: Satu konfirmasi saja saat login berhasil ("Halo, [nama]"), hapus toast ganda
        setWelcomeText(result.message || 'Halo');
        setTimeout(() => {
          navigate(getDesignatedPortalPath(result.role!), { replace: true });
        }, 300);
      } else {
        // Poin 15: Semua kegagalan menampilkan SATU pesan yang sama
        setErrorMsg(result.message || 'Akun atau kata sandi belum cocok. Coba cek lagi ya.');
      }
    }, 180);
  };

  const handleFillDemo = (type: 'penghuni' | 'admin' | 'pemilik') => {
    setErrorMsg('');
    if (type === 'penghuni') {
      setIdentifier('K05');
      setSecret('1234');
    } else if (type === 'admin') {
      setIdentifier('admin@kospopo.id');
      setSecret('admin123');
    } else {
      setIdentifier('pemilik@kospopo.id');
      setSecret('pemilik123');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] dark:bg-[#151816] text-[#1F2421] dark:text-[#E8EAE6] flex flex-col justify-between p-4 sm:p-6 transition-colors duration-150 relative">
      {/* Top right theme toggle */}
      <div className="w-full max-w-[1200px] mx-auto flex justify-end">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-[#6B706B] hover:text-[#1F2421] dark:text-[#A0A6A0] dark:hover:text-[#E8EAE6] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Ganti Tema Gelap/Terang"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-[#D97706]" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Center Login Container (Card di TENGAH, max-width 400px, rounded-xl 12px, border tipis) */}
      <main className="w-full flex-1 flex flex-col items-center justify-center py-6">
        {/* Brand Logotype di atas kartu */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#2F6B57] dark:bg-[#5FAE92] text-white dark:text-[#151816] flex items-center justify-center shrink-0">
              <Home className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#1F2421] dark:text-[#E8EAE6]">
              Kos Popo
            </span>
          </div>
          <p className="text-sm text-[#6B706B] dark:text-[#A0A6A0]">
            Masuk ke Kos Popo
          </p>
        </div>

        {/* Kartu Login Terpadu */}
        <div className="w-full max-w-[400px] bg-white dark:bg-[#1D211F] rounded-xl border border-[#E6E2D8] dark:border-[#2B302D] p-6 sm:p-7 shadow-xs">
          {welcomeText ? (
            <div className="py-8 text-center text-sm font-medium text-[#2F6B57] dark:text-[#5FAE92] animate-in fade-in">
              {welcomeText}...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-[#FDF0F0] dark:bg-[#2E1818] border border-[#F8D2D2] dark:border-[#442323] text-xs text-[#B23A3A] dark:text-[#E26666] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {/* Field 1: Email atau Nomor Kamar */}
              <div>
                <label className="block text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0] mb-1.5">
                  Email atau nomor kamar
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="admin@kospopo.id atau K05"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 text-sm text-[#1F2421] dark:text-[#E8EAE6] placeholder:text-[#6B706B]/60 focus:outline-none focus:ring-2 focus:ring-[#2F6B57] dark:focus:ring-[#5FAE92] focus:bg-white dark:focus:bg-[#1D211F] transition-all"
                />
              </div>

              {/* Field 2: Password atau PIN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0]">
                    Password atau PIN
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => {
                      setSecret(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Kata sandi atau PIN 4 digit"
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 text-sm text-[#1F2421] dark:text-[#E8EAE6] placeholder:text-[#6B706B]/60 focus:outline-none focus:ring-2 focus:ring-[#2F6B57] dark:focus:ring-[#5FAE92] focus:bg-white dark:focus:bg-[#1D211F] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-2.5 p-1 text-[#6B706B] hover:text-[#1F2421] dark:hover:text-[#E8EAE6]"
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[#6B706B] dark:text-[#A0A6A0]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#E6E2D8] text-[#2F6B57] focus:ring-[#2F6B57]"
                  />
                  <span>Ingat saya</span>
                </label>
                <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] hover:underline cursor-pointer">
                  Lupa PIN/kata sandi?
                </span>
              </div>

              {/* Teks deteksi peran otomatis (jika terdeteksi) */}
              {detectedRole && (
                <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-[#2F6B57] dark:text-[#5FAE92] font-medium animate-in fade-in">
                  {detectedRole === 'penghuni' && <Home className="w-3.5 h-3.5 stroke-[2]" />}
                  {detectedRole === 'admin' && <Shield className="w-3.5 h-3.5 stroke-[2]" />}
                  {detectedRole === 'pemilik' && <LineChart className="w-3.5 h-3.5 stroke-[2]" />}
                  <span>{roleLabel}</span>
                </div>
              )}

              {/* Tombol Penuh Masuk */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] font-medium text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoading ? 'Memeriksa...' : 'Masuk'}
              </button>
            </form>
          )}

          {/* Bagian Coba Akun Demo (3 tombol teks kecil) */}
          <div className="mt-5 pt-4 border-t border-[#E6E2D8] dark:border-[#2B302D]">
            <span className="text-[11px] font-medium text-[#6B706B] dark:text-[#A0A6A0] block text-center mb-2">
              Coba akun demo:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo('penghuni')}
                className="py-1.5 px-2 rounded text-xs font-medium border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-[#1F2421] dark:text-[#E8EAE6] hover:border-[#2F6B57] dark:hover:border-[#5FAE92] transition-colors text-center"
              >
                Penghuni
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="py-1.5 px-2 rounded text-xs font-medium border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-[#1F2421] dark:text-[#E8EAE6] hover:border-[#2F6B57] dark:hover:border-[#5FAE92] transition-colors text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('pemilik')}
                className="py-1.5 px-2 rounded text-xs font-medium border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-[#1F2421] dark:text-[#E8EAE6] hover:border-[#2F6B57] dark:hover:border-[#5FAE92] transition-colors text-center"
              >
                Pemilik
              </button>
            </div>
            <p className="text-[10px] text-center text-[#6B706B] dark:text-[#A0A6A0] mt-2">
              Akun demo hanya untuk prototipe.
            </p>
          </div>
        </div>
      </main>

      {/* Footer kecil */}
      <footer className="w-full text-center text-xs text-[#6B706B] dark:text-[#A0A6A0] py-2">
        Kos Popo · <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6]">Data demo</span> (Proyek Akhir Manajemen Proyek)
      </footer>
    </div>
  );
};
