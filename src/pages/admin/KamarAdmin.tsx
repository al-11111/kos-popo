import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Room, RoomTypeId } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { getRoomTypeDescription } from '../../utils/domain';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/common/Skeleton';
import {
  DoorClosed,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

export const KamarAdmin: React.FC = () => {
  const { rooms, tenants, roomTypes, addRoom, updateRoom, deleteRoom } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Terisi' | 'Kosong'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmTypeChangeOpen, setIsConfirmTypeChangeOpen] = useState(false);

  // Form State
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [typeInput, setTypeInput] = useState<RoomTypeId>(2);
  const [floorInput, setFloorInput] = useState<number>(1);
  const [formError, setFormError] = useState('');

  // Skeleton loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const filteredRooms = rooms.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const totalRooms = rooms.length;
  const occupiedCount = rooms.filter((r) => r.status === 'Terisi').length;
  const emptyCount = totalRooms - occupiedCount;

  const currentTenant = selectedRoom?.currentTenantId
    ? tenants.find((t) => t.id === selectedRoom.currentTenantId)
    : undefined;

  // Buka Modal Tambah Kamar
  const handleOpenAdd = () => {
    setFormError('');
    // Saran nomor kamar baru otomatis (misal K21)
    const nextNum = totalRooms + 1;
    setRoomNumberInput(`K${String(nextNum).padStart(2, '0')}`);
    setTypeInput(2);
    setFloorInput(1);
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const result = addRoom({
      roomNumber: roomNumberInput,
      type: typeInput,
      floor: Number(floorInput) || 1,
    });
    if (result.success) {
      setIsAddModalOpen(false);
    } else {
      setFormError(result.message);
    }
  };

  // Buka Modal Ubah Kamar
  const handleOpenEdit = (room: Room) => {
    setFormError('');
    setRoomNumberInput(room.roomNumber);
    setTypeInput(room.type);
    setFloorInput(room.floor || 1);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    // Cek apakah tipe kamar berpenghuni aktif berubah
    const isOccupied = selectedRoom.status === 'Terisi';
    const isTypeChanged = selectedRoom.type !== typeInput;

    if (isOccupied && isTypeChanged) {
      // Poin 14: Tampilkan dialog konfirmasi yang menjelaskan dampaknya
      setIsConfirmTypeChangeOpen(true);
      return;
    }

    executeSaveEdit();
  };

  const executeSaveEdit = () => {
    if (!selectedRoom) return;
    setFormError('');
    const result = updateRoom(selectedRoom.id, {
      roomNumber: roomNumberInput,
      type: typeInput,
      floor: Number(floorInput) || 1,
    });
    if (result.success) {
      setIsConfirmTypeChangeOpen(false);
      setIsEditModalOpen(false);
      // Update selected room view
      const updated = rooms.find((r) => r.id === selectedRoom.id);
      if (updated) setSelectedRoom(updated);
      else setSelectedRoom(null);
    } else {
      setFormError(result.message);
    }
  };

  // Handler Hapus Kamar
  const handleDelete = (room: Room) => {
    const result = deleteRoom(room.id);
    if (result.success) {
      setSelectedRoom(null);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Data Kamar"
        description="Kelola data kamar kos, spesifikasi tipe, lantai, dan status hunian aktif"
        action={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 font-mono">
              <span className="px-2.5 py-1 rounded-md border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-[#1F2421] dark:text-[#E8EAE6]">
                {totalRooms} Total
              </span>
              <span className="px-2.5 py-1 rounded-md border border-[#CDE1D6] dark:border-[#2A4237] bg-[#E6F0EB] dark:bg-[#1C2D25] text-[#2F6B57] dark:text-[#5FAE92]">
                {occupiedCount} Terisi
              </span>
              <span className="px-2.5 py-1 rounded-md border border-[#E0E2DE] dark:border-[#333936] bg-[#F0F1EF] dark:bg-[#232725] text-[#7A7F7A] dark:text-[#A0A6A0]">
                {emptyCount} Kosong
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kamar</span>
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0] mr-2">
            Tipe Kamar:
          </span>
          <div className="flex items-center gap-1">
            {(['all', 1, 2, 3] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-[#2F6B57] dark:bg-[#5FAE92] text-white dark:text-[#151816]'
                    : 'text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] dark:hover:text-[#E8EAE6]'
                }`}
              >
                {t === 'all' ? 'Semua Tipe' : `Tipe ${t}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0] mr-2">
            Status:
          </span>
          {(['all', 'Terisi', 'Kosong'] as const).map((s) => (
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

      {/* Grid Kamar K01-K20 */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredRooms.map((room) => {
            const isOccupied = room.status === 'Terisi';
            const roomTypeObj = roomTypes.find((rt) => rt.id === room.type);
            const price = roomTypeObj?.priceMonthly || 0;
            const facilitiesList = room.facilities || roomTypeObj?.facilities || [];

            return (
              <Card
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                padding="sm"
                className="flex flex-col justify-between cursor-pointer hover:border-[#2F6B57]/40 dark:hover:border-[#5FAE92]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold font-mono text-[#1F2421] dark:text-[#E8EAE6]">
                        {room.roomNumber}
                      </span>
                      <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
                        Lt. {room.floor}
                      </span>
                    </div>
                    <Badge variant={isOccupied ? 'terisi' : 'kosong'}>
                      {room.status}
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#6B706B] dark:text-[#A0A6A0]">
                        {roomTypeObj?.name || `Tipe ${room.type}`}
                      </span>
                      <span className="font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6] tabular-nums">
                        {formatRupiah(price)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] truncate">
                      {facilitiesList.slice(0, 3).join(', ')}...
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E6E2D8] dark:border-[#2B302D] flex items-center justify-between text-xs">
                  {isOccupied ? (
                    <span className="text-[#1F2421] dark:text-[#E8EAE6] truncate max-w-[150px]">
                      {room.currentTenantName}
                    </span>
                  ) : (
                    <span className="text-[#2F6B57] dark:text-[#5FAE92] text-[11px]">
                      Siap dihuni
                    </span>
                  )}
                  <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
                    Detail &rarr;
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Detail Kamar */}
      {selectedRoom && (
        <Modal
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          title={`Kamar ${selectedRoom.roomNumber}`}
          description={getRoomTypeDescription(selectedRoom.type, roomTypes)}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 flex items-center justify-between">
              <div>
                <span className="text-[#6B706B] dark:text-[#A0A6A0] block">Harga Sewa Bulanan</span>
                <span className="text-base font-semibold font-mono text-[#1F2421] dark:text-[#E8EAE6] tabular-nums">
                  {formatRupiah(roomTypes.find((rt) => rt.id === selectedRoom.type)?.priceMonthly || 0)}
                </span>
                <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] block mt-0.5">
                  Lantai {selectedRoom.floor} (data tambahan)
                </span>
              </div>
              <Badge variant={selectedRoom.status === 'Terisi' ? 'terisi' : 'kosong'}>
                {selectedRoom.status}
              </Badge>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                  Fasilitas Tipe Kamar
                </span>
                <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] bg-[#F7F5F0] dark:bg-[#151816] px-2 py-0.5 rounded border border-[#E6E2D8] dark:border-[#2B302D]">
                  Contoh fasilitas
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(selectedRoom.facilities || roomTypes.find((rt) => rt.id === selectedRoom.type)?.facilities || []).map((fac, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-[#1F2421] dark:text-[#E8EAE6]"
                  >
                    {fac}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D]">
              <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6] block mb-2">
                Informasi Penghuni
              </span>
              {currentTenant ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#1F2421] dark:text-[#E8EAE6]">
                      {currentTenant.name}
                    </span>
                    <span className="font-mono text-[#6B706B] dark:text-[#A0A6A0]">
                      {currentTenant.phone}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#6B706B] dark:text-[#A0A6A0] pt-2 border-t border-[#E6E2D8] dark:border-[#2B302D]">
                    <div>Mulai: <span className="font-mono text-[#1F2421] dark:text-[#E8EAE6]">{currentTenant.startDate}</span></div>
                    <div>Selesai: <span className="font-mono text-[#1F2421] dark:text-[#E8EAE6]">{currentTenant.endDate}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-[#6B706B] dark:text-[#A0A6A0]">
                  Kamar ini kosong dan belum memiliki penghuni aktif.
                </div>
              )}
            </div>

            {/* Aksi Ubah Kamar dan Hapus Kamar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
              {selectedRoom.status === 'Kosong' && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedRoom)}
                  className="px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[#B23A3A] hover:bg-[#FDF0F0] dark:hover:bg-[#2E1818] transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Kamar</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedRoom(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedRoom)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] font-medium transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Ubah Kamar</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Tambah Kamar */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tambah Kamar Baru"
          description="Masukkan nomor kamar, tipe kamar, dan letak lantai"
        >
          <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-[#FDF0F0] dark:bg-[#2E1818] border border-[#F8D2D2] dark:border-[#442323] text-[#B23A3A] dark:text-[#E26666] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block font-medium text-[#1F2421] dark:text-[#E8EAE6] mb-1">
                Nomor Kamar (Format K + 2 digit)
              </label>
              <input
                type="text"
                value={roomNumberInput}
                onChange={(e) => setRoomNumberInput(e.target.value.toUpperCase())}
                placeholder="K21"
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#2F6B57]"
                required
              />
              <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] mt-0.5 block">
                Contoh: K21, K22 (tidak boleh kembar dengan kamar yang sudah ada).
              </span>
            </div>

            <div>
              <label className="block font-medium text-[#1F2421] dark:text-[#E8EAE6] mb-1">
                Tipe Kamar
              </label>
              <select
                value={typeInput}
                onChange={(e) => setTypeInput(Number(e.target.value) as RoomTypeId)}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6B57]"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} — {formatRupiah(rt.priceMonthly)}/bulan
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#1F2421] dark:text-[#E8EAE6] mb-1">
                Lantai (Data tambahan)
              </label>
              <select
                value={floorInput}
                onChange={(e) => setFloorInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6B57]"
              >
                <option value={1}>Lantai 1</option>
                <option value={2}>Lantai 2</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] font-medium transition-colors"
              >
                Simpan Kamar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Ubah Kamar */}
      {isEditModalOpen && selectedRoom && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Ubah Kamar ${selectedRoom.roomNumber}`}
          description="Perbarui nomor kamar, tipe kamar, atau lantai"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-[#FDF0F0] dark:bg-[#2E1818] border border-[#F8D2D2] dark:border-[#442323] text-[#B23A3A] dark:text-[#E26666] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block font-medium text-[#1F2421] dark:text-[#E8EAE6] mb-1">
                Nomor Kamar (Format K + 2 digit)
              </label>
              <input
                type="text"
                value={roomNumberInput}
                onChange={(e) => setRoomNumberInput(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#2F6B57]"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-[#1F2421] dark:text-[#E8EAE6] mb-1">
                Tipe Kamar
              </label>
              <select
                value={typeInput}
                onChange={(e) => setTypeInput(Number(e.target.value) as RoomTypeId)}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6B57]"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} — {formatRupiah(rt.priceMonthly)}/bulan
                  </option>
                ))}
              </select>
              {selectedRoom.status === 'Terisi' && selectedRoom.type !== typeInput && (
                <span className="text-[11px] text-[#B7791F] mt-1 block">
                  Perhatian: Kamar sedang dihuni ({selectedRoom.currentTenantName}). Mengubah tipe kamar akan memengaruhi harga sewa & tagihan Belum.
                </span>
              )}
            </div>

            <div>
              <label className="block font-medium text-[#1F2421] dark:text-[#E8EAE6] mb-1">
                Lantai (Data tambahan)
              </label>
              <select
                value={floorInput}
                onChange={(e) => setFloorInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6B57]"
              >
                <option value={1}>Lantai 1</option>
                <option value={2}>Lantai 2</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] font-medium transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dialog Konfirmasi Perubahan Tipe Kamar Berpenghuni (Poin 14) */}
      {isConfirmTypeChangeOpen && selectedRoom && (
        <Modal
          isOpen={isConfirmTypeChangeOpen}
          onClose={() => setIsConfirmTypeChangeOpen(false)}
          title="Konfirmasi Perubahan Tipe Kamar"
          description="Kamar ini sedang dihuni oleh penghuni aktif"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-[#FDF8EC] dark:bg-[#2E2818] border border-[#F5E2B5] dark:border-[#4B3E1F] text-[#B7791F] dark:text-[#E2C37E] flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Dampak Perubahan Tipe Kamar:</span>
                <p className="leading-relaxed">
                  Kamar <strong>{selectedRoom.roomNumber}</strong> sedang dihuni oleh <strong>{selectedRoom.currentTenantName}</strong>. Mengubah tipe kamar dari Tipe {selectedRoom.type} ke Tipe {typeInput} akan:
                </p>
                <ul className="list-disc list-inside space-y-0.5 pt-1 pl-1">
                  <li>Memperbarui nominal harga sewa bulanan penghuni menjadi {formatRupiah(roomTypes.find((rt) => rt.id === typeInput)?.priceMonthly || 0)}.</li>
                  <li>Memperbarui nominal tagihan berstatus <strong>Belum</strong> untuk kamar ini.</li>
                  <li>Tagihan yang sudah <strong>Lunas</strong> tidak akan diubah.</li>
                </ul>
              </div>
            </div>

            <p className="text-[#6B706B] dark:text-[#A0A6A0]">
              Apakah Anda yakin ingin melanjutkan perubahan tipe kamar ini?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2D8] dark:border-[#2B302D]">
              <button
                type="button"
                onClick={() => setIsConfirmTypeChangeOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] font-medium transition-colors"
              >
                Ya, Terapkan Perubahan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
