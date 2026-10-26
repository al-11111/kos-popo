import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search, DoorClosed, Users, CreditCard, Wrench, X, ArrowRight } from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';
import { getRoomTypePrice } from '../../utils/domain';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { rooms, tenants, payments, currentUser, roomTypes } = useApp();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search Results
  const matchedRooms = q
    ? rooms.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(q) ||
          r.currentTenantName?.toLowerCase().includes(q)
      )
    : [];

  const matchedTenants = q
    ? tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.roomNumber.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q)
      )
    : [];

  const matchedPayments = q
    ? payments
        .filter(
          (p) =>
            p.roomNumber.toLowerCase().includes(q) ||
            p.tenantName.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const handleSelectRoom = (roomNumber: string) => {
    onClose();
    if (currentUser?.role === 'admin') {
      navigate('/admin/kamar');
    } else if (currentUser?.role === 'pemilik') {
      navigate('/pemilik/dashboard');
    } else {
      navigate('/penghuni/dashboard');
    }
  };

  const handleSelectTenant = () => {
    onClose();
    if (currentUser?.role === 'admin') {
      navigate('/admin/penghuni');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20">
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#1D211F] rounded-xl border border-[#E6E2D8] dark:border-[#2B302D] shadow-lg overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E2D8] dark:border-[#2B302D]">
          <Search className="w-4 h-4 text-[#6B706B] dark:text-[#A0A6A0] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kamar (K05), nama penghuni, atau tagihan..."
            className="w-full text-sm bg-transparent outline-none text-[#1F2421] dark:text-[#E8EAE6] placeholder:text-[#6B706B]/70"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[11px] font-mono text-[#6B706B] dark:text-[#A0A6A0] bg-[#F7F5F0] dark:bg-[#151816] border border-[#E6E2D8] dark:border-[#2B302D] rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 text-[#6B706B] hover:text-[#1F2421] dark:hover:text-[#E8EAE6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="p-3 overflow-y-auto space-y-4 max-h-[60vh]">
          {!q && (
            <div className="py-8 text-center text-xs text-[#6B706B] dark:text-[#A0A6A0]">
              Ketikkan nomor kamar (misal <span className="font-mono font-semibold">K05</span>), nama penghuni, atau no HP.
            </div>
          )}

          {q && (
            <>
              {/* Kamar */}
              {matchedRooms.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-[#6B706B] dark:text-[#A0A6A0] uppercase tracking-wider px-2">
                    Kamar Kos
                  </span>
                  <div className="mt-1 space-y-1">
                    {matchedRooms.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRoom(r.roomNumber)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#E6F0EB] dark:hover:bg-[#1C2D25] cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <DoorClosed className="w-4 h-4 text-[#2F6B57] dark:text-[#5FAE92]" />
                          <span className="font-mono font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
                            {r.roomNumber}
                          </span>
                          <span className="text-[#6B706B] dark:text-[#A0A6A0]">
                            · Tipe {r.type} · {r.status === 'Terisi' ? r.currentTenantName : 'Kosong'}
                          </span>
                        </div>
                        <span className="font-mono text-[#6B706B] dark:text-[#A0A6A0]">
                          {formatRupiah(getRoomTypePrice(r.type, roomTypes))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Penghuni */}
              {matchedTenants.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-[#6B706B] dark:text-[#A0A6A0] uppercase tracking-wider px-2">
                    Penghuni
                  </span>
                  <div className="mt-1 space-y-1">
                    {matchedTenants.map((t) => (
                      <div
                        key={t.id}
                        onClick={handleSelectTenant}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#E6F0EB] dark:hover:bg-[#1C2D25] cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-[#2F6B57] dark:text-[#5FAE92]" />
                          <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                            {t.name}
                          </span>
                          <span className="font-mono text-[#2F6B57] dark:text-[#5FAE92]">
                            ({t.roomNumber})
                          </span>
                        </div>
                        <span className="font-mono text-[#6B706B] dark:text-[#A0A6A0]">
                          {t.phone}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {matchedRooms.length === 0 && matchedTenants.length === 0 && matchedPayments.length === 0 && (
                <div className="py-8 text-center text-xs text-[#6B706B] dark:text-[#A0A6A0]">
                  Tidak ada data yang cocok dengan "{query}".
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
