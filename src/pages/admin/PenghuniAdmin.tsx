import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Tenant } from '../../types';
import {
  formatRupiah,
  formatTanggalSingkat,
  getToday,
  getDefaultEndDate,
} from '../../utils/formatters';
import { getRoomTypePrice } from '../../utils/domain';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Skeleton, TableSkeleton } from '../../components/common/Skeleton';
import {
  UserPlus,
  Search,
  Edit2,
  UserX,
  AlertCircle,
  Users,
  Key,
  Copy,
  Check,
} from 'lucide-react';

export const PenghuniAdmin: React.FC = () => {
  const { tenants, rooms, addTenant, updateTenant, deactivateTenant, resetTenantPin } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Aktif' | 'Nonaktif'>('Aktif');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deactivatingTenant, setDeactivatingTenant] = useState<Tenant | null>(null);

  // Modal Tampil PIN (Poin 20)
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    tenantName: string;
    roomNumber: string;
    pin: string;
    isReset?: boolean;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

  // Form add
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    roomNumber: '',
    startDate: getToday(),
    endDate: getDefaultEndDate(getToday()),
    emergencyContact: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Form edit
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    roomNumber: '',
    startDate: '',
    endDate: '',
    emergencyContact: '',
    notes: '',
  });
  const [editFormError, setEditFormError] = useState('');

  // Skeleton loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const emptyRooms = rooms.filter((r) => r.status === 'Kosong');

  const filteredTenants = tenants.filter((tenant) => {
    if (statusFilter !== 'all' && tenant.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tenant.name.toLowerCase().includes(q);
      const matchRoom = tenant.roomNumber.toLowerCase().includes(q);
      const matchPhone = tenant.phone.toLowerCase().includes(q);
      if (!matchName && !matchRoom && !matchPhone) return false;
    }
    return true;
  });

  const handleOpenAddModal = () => {
    const firstEmpty = emptyRooms[0]?.roomNumber || '';
    const today = getToday();
    setFormData({
      name: '',
      phone: '',
      roomNumber: firstEmpty,
      startDate: today,
      endDate: getDefaultEndDate(today),
      emergencyContact: '',
      notes: '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setEditFormData({
      name: t.name,
      phone: t.phone,
      roomNumber: t.roomNumber,
      startDate: t.startDate,
      endDate: t.endDate,
      emergencyContact: t.emergencyContact || '',
      notes: t.notes || '',
    });
    setEditFormError('');
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.phone.trim() || !formData.roomNumber) {
      setFormError('Nama, nomor telepon, dan nomor kamar wajib diisi.');
      return;
    }

    // Poin 20: PIN diacak 4 digit di addTenant
    const res = addTenant({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      roomNumber: formData.roomNumber,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: 'Aktif',
      emergencyContact: formData.emergencyContact.trim(),
      notes: formData.notes.trim(),
    });

    if (res.success) {
      setIsAddModalOpen(false);
      // Tampilkan PIN baru sekali ke admin dengan tombol salin (Poin 20)
      setCopiedPin(false);
      setPinModal({
        isOpen: true,
        tenantName: formData.name.trim(),
        roomNumber: formData.roomNumber,
        pin: res.pin || '1234',
        isReset: false,
      });
    } else {
      setFormError(res.message);
    }
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditFormError('');

    if (!editFormData.name.trim() || !editFormData.phone.trim()) {
      setEditFormError('Nama dan nomor telepon wajib diisi.');
      return;
    }

    const res = updateTenant(editingTenant.id, {
      name: editFormData.name.trim(),
      phone: editFormData.phone.trim(),
      roomNumber: editFormData.roomNumber,
      startDate: editFormData.startDate,
      endDate: editFormData.endDate,
      emergencyContact: editFormData.emergencyContact.trim(),
      notes: editFormData.notes.trim(),
    });

    if (res.success) {
      setEditingTenant(null);
    } else {
      setEditFormError(res.message);
    }
  };

  const handleConfirmDeactivate = () => {
    if (!deactivatingTenant) return;
    deactivateTenant(deactivatingTenant.id);
    setDeactivatingTenant(null);
  };

  // Poin 20: Aksi Reset PIN di detail penghuni
  const handleResetPin = (tenant: Tenant) => {
    const res = resetTenantPin(tenant.id);
    if (res.success && res.newPin) {
      setCopiedPin(false);
      setPinModal({
        isOpen: true,
        tenantName: tenant.name,
        roomNumber: tenant.roomNumber,
        pin: res.newPin,
        isReset: true,
      });
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2500);
  };

  const selectedRoomObj = rooms.find((r) => r.roomNumber === formData.roomNumber);
  const selectedRoomPrice = selectedRoomObj ? getRoomTypePrice(selectedRoomObj.type) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Penghuni"
        description={`Kelola data kontrak, kontak, dan registrasi penghuni ${rooms.length} kamar`}
        action={
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] text-xs font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Penghuni</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <Card padding="sm" className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, kamar, atau no telp..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 text-xs focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#6B706B] absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'Aktif', 'Nonaktif'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-[#2F6B57] dark:bg-[#5FAE92] text-white dark:text-[#151816]'
                  : 'text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] dark:hover:text-[#E8EAE6]'
              }`}
            >
              {s === 'all' ? 'Semua' : s}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={7} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#F7F5F0] dark:bg-[#151816] border-b border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0]">
                <tr className="h-10">
                  <th className="py-2.5 px-4 font-medium">Nama Penghuni</th>
                  <th className="py-2.5 px-3 font-medium">Kamar</th>
                  <th className="py-2.5 px-3 font-medium">Kontak HP</th>
                  <th className="py-2.5 px-3 font-medium text-right">Tarif Sewa</th>
                  <th className="py-2.5 px-3 font-medium">Masa Sewa</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2D8]/60 dark:divide-[#2B302D]/60">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#6B706B] dark:text-[#A0A6A0]">
                      Tidak ada data penghuni yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr
                      key={t.id}
                      className="h-12 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                        <span>{t.name}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                        {t.roomNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#6B706B] dark:text-[#A0A6A0]">
                        {t.phone}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6] tabular-nums">
                        {formatRupiah(t.rentAmount)}
                      </td>
                      <td className="py-3 px-3 text-[#6B706B] dark:text-[#A0A6A0] font-mono tabular-nums">
                        {formatTanggalSingkat(t.startDate)} – {formatTanggalSingkat(t.endDate)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={t.status === 'Aktif' ? 'terisi' : 'kosong'}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleResetPin(t)}
                            className="p-1.5 rounded text-[#6B706B] hover:text-[#1F2421] dark:hover:text-[#E8EAE6] hover:bg-black/5 dark:hover:bg-white/5"
                            title="Reset PIN Masuk"
                          >
                            <Key className="w-3.5 h-3.5 text-[#B7791F]" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 rounded text-[#6B706B] hover:text-[#1F2421] dark:hover:text-[#E8EAE6] hover:bg-black/5 dark:hover:bg-white/5"
                            title="Ubah Data Penghuni"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {t.status === 'Aktif' && (
                            <button
                              onClick={() => setDeactivatingTenant(t)}
                              className="p-1.5 rounded text-[#B23A3A] hover:bg-[#FDF0F0] dark:hover:bg-[#2E1818]"
                              title="Nonaktifkan (Kamar jadi kosong)"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Tambah Penghuni */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Penghuni Baru"
        description="Data kamar kosong dan harga sewa tersinkronisasi otomatis"
      >
        <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
          {formError && (
            <div className="p-2.5 rounded-lg bg-[#FDF0F0] dark:bg-[#2E1818] border border-[#F8D2D2] text-[#B23A3A] text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Rian Pratama"
              className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
              Nomor Telepon / WA *
            </label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0812-xxxx-xxxx"
              className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
            />
          </div>

          {/* Room Selector with Automatic Business Rule */}
          <div className="p-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/60 dark:bg-[#151816]/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                Pilih Kamar Kosong *
              </label>
              <span className="text-[11px] text-[#6B706B]">
                {emptyRooms.length} kamar kosong
              </span>
            </div>

            {emptyRooms.length === 0 ? (
              <p className="text-[11px] text-[#B23A3A] font-medium">
                Semua kamar saat ini terisi penuh.
              </p>
            ) : (
              <select
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
              >
                {emptyRooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>
                    Kamar {r.roomNumber} (Tipe {r.type} - Lt. {r.floor})
                  </option>
                ))}
              </select>
            )}

            {selectedRoomObj && (
              <div className="flex items-center justify-between pt-2 border-t border-[#E6E2D8] dark:border-[#2B302D] text-[11px]">
                <span className="text-[#6B706B] dark:text-[#A0A6A0]">Tarif Sewa Bulanan Otomatis:</span>
                <span className="font-mono font-semibold text-[#2F6B57] dark:text-[#5FAE92]">
                  {formatRupiah(selectedRoomPrice)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Tanggal Mulai Sewa *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setFormData({
                    ...formData,
                    startDate: newStart,
                    endDate: getDefaultEndDate(newStart),
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Tanggal Selesai Sewa *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
              Kontak Darurat (Data tambahan)
            </label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              placeholder="Contoh: 0813-xxxx-xxxx (Orang Tua)"
              className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
            />
          </div>

          <div className="p-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/60 dark:bg-[#151816]/60 text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
            PIN masuk akan otomatis diacak 4 digit dan ditampilkan setelah disimpan.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="py-1.5 px-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-xs text-[#6B706B] hover:text-[#1F2421] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={emptyRooms.length === 0}
              className="py-1.5 px-4 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] text-xs font-medium transition-colors disabled:opacity-50"
            >
              Simpan Penghuni
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tampil PIN Baru / Reset PIN (Poin 20) */}
      {pinModal && (
        <Modal
          isOpen={pinModal.isOpen}
          onClose={() => setPinModal(null)}
          title={pinModal.isReset ? 'PIN Berhasil Direset' : 'Penghuni Berhasil Didaftarkan'}
          description={`Kamar ${pinModal.roomNumber} — ${pinModal.tenantName}`}
        >
          <div className="space-y-4 pt-1 text-xs text-center">
            <p className="text-[#6B706B] dark:text-[#A0A6A0]">
              {pinModal.isReset
                ? 'PIN baru untuk akun penghuni ini telah dibuat:'
                : 'Akun penghuni aktif. Berikan PIN ini kepada penghuni untuk masuk ke portal:'}
            </p>

            <div className="p-4 rounded-xl border border-[#2F6B57]/30 dark:border-[#5FAE92]/30 bg-[#E6F0EB]/50 dark:bg-[#1C2D25]/50 flex flex-col items-center justify-center gap-1">
              <span className="text-[11px] font-medium text-[#6B706B] dark:text-[#A0A6A0]">
                PIN 4 Digit:
              </span>
              <span className="text-3xl font-mono font-bold tracking-widest text-[#2F6B57] dark:text-[#5FAE92]">
                {pinModal.pin}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyPin(pinModal.pin)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] font-medium text-xs transition-colors"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPin ? 'PIN Disalin!' : 'Salin PIN'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] leading-relaxed">
              Catat atau bagikan PIN ini sekarang. PIN ini hanya ditampilkan satu kali demi keamanan prototipe.
            </p>

            <div className="pt-2 border-t border-[#E6E2D8] dark:border-[#2B302D] flex justify-end">
              <button
                type="button"
                onClick={() => setPinModal(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Edit Penghuni */}
      {editingTenant && (
        <Modal
          isOpen={!!editingTenant}
          onClose={() => setEditingTenant(null)}
          title={`Ubah Data Penghuni: ${editingTenant.name}`}
          description={`Kamar ${editingTenant.roomNumber}`}
        >
          <form onSubmit={handleSubmitEdit} className="space-y-3.5 text-xs">
            {editFormError && (
              <div className="p-2.5 rounded-lg bg-[#FDF0F0] dark:bg-[#2E1818] border border-[#F8D2D2] text-[#B23A3A] text-xs">
                {editFormError}
              </div>
            )}

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Nomor Telepon / WA *
              </label>
              <input
                type="text"
                required
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={editFormData.startDate}
                  onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs font-mono focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Kontak Darurat (Data tambahan)
              </label>
              <input
                type="text"
                value={editFormData.emergencyContact}
                onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="py-1.5 px-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-xs text-[#6B706B] hover:text-[#1F2421] transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] text-xs font-medium transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Nonaktifkan */}
      {deactivatingTenant && (
        <Modal
          isOpen={!!deactivatingTenant}
          onClose={() => setDeactivatingTenant(null)}
          title="Konfirmasi Nonaktifkan Penghuni"
          description={`Kamar ${deactivatingTenant.roomNumber} - ${deactivatingTenant.name}`}
        >
          <div className="space-y-3 text-xs">
            <p className="text-[#6B706B] dark:text-[#A0A6A0]">
              Apakah Anda yakin ingin menonaktifkan status sewa untuk{' '}
              <strong className="text-[#1F2421] dark:text-[#E8EAE6]">{deactivatingTenant.name}</strong>?
            </p>
            <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#151816] border border-[#E6E2D8] dark:border-[#2B302D]">
              <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6] block mb-1">
                Aturan Bisnis Otomatis:
              </span>
              <p className="text-[#6B706B] dark:text-[#A0A6A0] text-[11px]">
                Status Kamar {deactivatingTenant.roomNumber} akan otomatis berubah menjadi{' '}
                <strong className="text-[#2F6B57] dark:text-[#5FAE92]">KOSONG</strong> dan siap untuk dihuni kembali oleh penghuni baru.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
              <button
                type="button"
                onClick={() => setDeactivatingTenant(null)}
                className="py-1.5 px-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-xs text-[#6B706B] hover:text-[#1F2421] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                className="py-1.5 px-4 rounded-lg bg-[#B23A3A] hover:bg-[#962E2E] text-white text-xs font-medium transition-colors"
              >
                Ya, Nonaktifkan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
