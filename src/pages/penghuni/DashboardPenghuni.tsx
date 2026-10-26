import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { IssueCategory } from '../../types';
import {
  formatRupiah,
  formatTanggal,
  formatTanggalSingkat,
  getCurrentYearMonth,
  formatPeriode,
  getDueDate,
  isOverdue,
  getDaysOverdue,
  getToday,
} from '../../utils/formatters';
import { getRoomTypeDescription, getRoomTypePrice } from '../../utils/domain';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { StatBlock } from '../../components/common/StatBlock';
import { Skeleton } from '../../components/common/Skeleton';
import { CheckCircle2, Clock, Send, DoorClosed, AlertCircle, Calendar, Info } from 'lucide-react';

export const DashboardPenghuni: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, rooms, tenants, payments, issues, submitIssue, logout, showToast, roomTypes } = useApp();

  const [activeTab, setActiveTab] = useState<'kamar' | 'riwayat' | 'lapor'>('kamar');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  // Poin 18: Hapus fallback tersembunyi ke 'K05'. Cari data tenant secara eksplisit.
  const tenant = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.tenantId) {
      return tenants.find((t) => t.id === currentUser.tenantId) || null;
    }
    if (currentUser.roomNumber) {
      return tenants.find((t) => t.roomNumber.toUpperCase() === currentUser.roomNumber?.toUpperCase()) || null;
    }
    return null;
  }, [currentUser, tenants]);

  const room = useMemo(() => {
    if (!tenant) return null;
    return rooms.find((r) => r.roomNumber.toUpperCase() === tenant.roomNumber.toUpperCase()) || null;
  }, [tenant, rooms]);

  // Poin 18: Jika data pengguna tidak ditemukan, logout dan arahkan ke /login dengan pesan ramah
  useEffect(() => {
    if (tenants.length > 0 && !tenant) {
      logout();
      showToast('Data akun atau kamar tidak ditemukan. Silakan masuk kembali.', 'info');
      navigate('/login', { replace: true });
    }
  }, [tenant, tenants.length, logout, showToast, navigate]);

  const currentYM = getCurrentYearMonth();
  const [selectedYM, setSelectedYM] = useState<string>(currentYM);

  // Poin 4: Tagihan dicocokkan HANYA dengan tenantId, jangan dengan roomNumber!
  const myPayments = useMemo(() => {
    if (!tenant) return [];
    return payments.filter((p) => p.tenantId === tenant.id);
  }, [payments, tenant]);

  const myIssues = useMemo(() => {
    if (!tenant) return [];
    return issues.filter((i) => i.roomNumber.toUpperCase() === tenant.roomNumber.toUpperCase());
  }, [issues, tenant]);

  // Daftar periode untuk selektor
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYM);
    myPayments.forEach((p) => {
      if (p.yearMonth) set.add(p.yearMonth);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [myPayments, currentYM]);

  const selectedPeriodLabel = formatPeriode(selectedYM);
  const selectedMonthBill = myPayments.find((p) => p.yearMonth === selectedYM);
  const today = getToday();

  // Form lapor kerusakan
  const [issueCategory, setIssueCategory] = useState<IssueCategory>('Air / Sanitasi');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDesc.trim() || !tenant || !room) return;

    setIsSubmitting(true);
    setTimeout(() => {
      submitIssue({
        roomNumber: room.roomNumber,
        tenantName: tenant.name,
        category: issueCategory,
        title: issueTitle.trim(),
        description: issueDesc.trim(),
      });
      setIsSubmitting(false);
      setIssueTitle('');
      setIssueDesc('');
      setActiveTab('riwayat');
    }, 180);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Kamar ${room?.roomNumber || 'K05'}`}
        description={`Halo, ${tenant?.name || 'Penghuni'}. Informasi masa sewa dan fasilitas kamar Anda.`}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B706B] dark:text-[#A0A6A0] font-mono">
              Aktif s/d {formatTanggalSingkat(tenant?.endDate || '2027-06-01')}
            </span>
          </div>
        }
      />

      {/* Kontrol Selektor Periode Tagihan Penghuni (Poin 3) */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0]">
          Pilih Periode Tagihan:
        </span>
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D] px-2.5 py-1.5 rounded-lg text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#6B706B] dark:text-[#A0A6A0]" />
          <select
            value={selectedYM}
            onChange={(e) => setSelectedYM(e.target.value)}
            className="bg-transparent font-medium text-[#1F2421] dark:text-[#E8EAE6] outline-none cursor-pointer text-xs"
          >
            {availablePeriods.map((ym) => (
              <option key={ym} value={ym} className="bg-white dark:bg-[#1D211F]">
                {formatPeriode(ym)} {ym === currentYM ? '(Bulan Berjalan)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Tagihan Bulan Yang Dipilih (Section 6 & Poin 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          {selectedMonthBill ? (
            <Card
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full ${
                selectedMonthBill.status === 'Lunas'
                  ? 'border-[#CDE1D6] dark:border-[#2A4237] bg-[#E6F0EB]/40 dark:bg-[#1C2D25]/40'
                  : 'border-[#F7E5C7] dark:border-[#3D301E] bg-[#FEF6E9]/40 dark:bg-[#2A2114]/40'
              }`}
            >
              <div>
                <span className="text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0] block">
                  Status Tagihan Sewa ({selectedPeriodLabel})
                </span>
                <div className="flex items-center gap-2.5 mt-1">
                  <span className="text-2xl font-semibold font-mono tabular-nums text-[#1F2421] dark:text-[#E8EAE6]">
                    {formatRupiah(selectedMonthBill.amount || tenant?.rentAmount || getRoomTypePrice(room?.type || 2, roomTypes))}
                  </span>
                  <Badge
                    variant={
                      selectedMonthBill.status === 'Lunas'
                        ? 'lunas'
                        : isOverdue(selectedMonthBill.dueDate, today)
                        ? 'telat'
                        : 'proses'
                    }
                  >
                    {selectedMonthBill.status === 'Lunas'
                      ? 'Lunas'
                      : isOverdue(selectedMonthBill.dueDate, today)
                      ? (getDaysOverdue(selectedMonthBill.dueDate, today) > 0
                          ? `Telat ${getDaysOverdue(selectedMonthBill.dueDate, today)} hari`
                          : 'Telat')
                      : 'Belum Jatuh Tempo'}
                  </Badge>
                </div>
                <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-1">
                  {selectedMonthBill.status === 'Lunas'
                    ? `Dibayar pada ${formatTanggalSingkat(selectedMonthBill.paidDate || today)} via ${selectedMonthBill.paymentMethod || 'Transfer'}`
                    : isOverdue(selectedMonthBill.dueDate, today)
                    ? `Telat — Jatuh tempo pembayaran tanggal ${formatTanggalSingkat(selectedMonthBill.dueDate)}`
                    : `Jatuh tempo pembayaran tanggal ${formatTanggalSingkat(selectedMonthBill.dueDate)}`}
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right text-xs text-[#6B706B] dark:text-[#A0A6A0]">
                <span>Rekening Pembayaran:</span>
                <p className="font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6] mt-0.5">
                  BCA 8720-1122-33 (Kos Popo)
                </p>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center gap-3.5 h-full bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D]">
              <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] dark:bg-[#151816] text-[#6B706B] dark:text-[#A0A6A0] flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6] block">
                  Belum Ada Tagihan untuk {selectedPeriodLabel}
                </span>
                <p className="text-[#6B706B] dark:text-[#A0A6A0] mt-0.5">
                  Tagihan sewa kamar Anda untuk periode ini belum diterbitkan oleh Admin kos.
                </p>
              </div>
            </Card>
          )}
        </div>

        <div>
          <StatBlock
            label="Tarif Sewa Bulanan"
            value={formatRupiah(tenant?.rentAmount || getRoomTypePrice(room?.type || 2, roomTypes))}
            subtext={`Tipe ${room?.type || 2} · Lantai ${room?.floor || 1}`}
            className="h-full"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E6E2D8] dark:border-[#2B302D] pb-1">
        <button
          onClick={() => setActiveTab('kamar')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'kamar'
              ? 'border-[#2F6B57] dark:border-[#5FAE92] text-[#2F6B57] dark:text-[#5FAE92]'
              : 'border-transparent text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421]'
          }`}
        >
          Spesifikasi Kamar
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'riwayat'
              ? 'border-[#2F6B57] dark:border-[#5FAE92] text-[#2F6B57] dark:text-[#5FAE92]'
              : 'border-transparent text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421]'
          }`}
        >
          Riwayat Pembayaran & Laporan ({myPayments.length + myIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('lapor')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'lapor'
              ? 'border-[#2F6B57] dark:border-[#5FAE92] text-[#2F6B57] dark:text-[#5FAE92]'
              : 'border-transparent text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421]'
          }`}
        >
          + Lapor Kerusakan
        </button>
      </div>

      {/* Tab 1: Info Kamar */}
      {activeTab === 'kamar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
                Fasilitas Kamar {room?.roomNumber}
              </h4>
              <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] bg-[#F7F5F0] dark:bg-[#151816] px-2 py-0.5 rounded border border-[#E6E2D8] dark:border-[#2B302D]">
                Contoh fasilitas
              </span>
            </div>
            <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mb-3">
              {room ? getRoomTypeDescription(room.type) : 'Tipe 2'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(room?.facilities || ['Springbed', 'Lemari', 'Meja kerja', 'KM Dalam', 'Exhaust fan']).map((fac, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 text-[#1F2421] dark:text-[#E8EAE6]"
                >
                  ✓ {fac}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6] mb-1">
              Data Kontrak & Kontak Pengelola
            </h4>
            <div className="space-y-2.5 text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-3">
              <div className="flex justify-between py-1 border-b border-[#E6E2D8] dark:border-[#2B302D]">
                <span>Tanggal Masuk:</span>
                <span className="font-mono text-[#1F2421] dark:text-[#E8EAE6]">{formatTanggal(tenant?.startDate || '2026-06-01')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E6E2D8] dark:border-[#2B302D]">
                <span>Akhir Kontrak Sewa:</span>
                <span className="font-mono text-[#1F2421] dark:text-[#E8EAE6]">{formatTanggal(tenant?.endDate || '2027-06-01')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E6E2D8] dark:border-[#2B302D]">
                <span>Admin Pengelola:</span>
                <span className="text-[#1F2421] dark:text-[#E8EAE6]">Mbak Sarah (0812-9988-7766)</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Jam Layanan Kantor:</span>
                <span className="text-[#1F2421] dark:text-[#E8EAE6]">08.00 - 21.00 WIB (Lt. 1)</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Riwayat Pembayaran & Laporan */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          <Card padding="none" className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E6E2D8] dark:border-[#2B302D]">
              <h4 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
                Riwayat Pembayaran Sewa
              </h4>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F5F0] dark:bg-[#151816] border-b border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B]">
                <tr className="h-9">
                  <th className="py-2 px-4 font-medium">Bulan</th>
                  <th className="py-2 px-3 font-medium text-right">Tarif</th>
                  <th className="py-2 px-3 font-medium">Tgl Bayar</th>
                  <th className="py-2 px-3 font-medium">Metode</th>
                  <th className="py-2 px-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2D8]/60 dark:divide-[#2B302D]/60">
                {myPayments.map((p) => (
                  <tr key={p.id} className="h-11">
                    <td className="py-2.5 px-4 font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                      {p.month}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6] tabular-nums">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-[#6B706B] dark:text-[#A0A6A0] font-mono tabular-nums">
                      {p.paidDate ? formatTanggalSingkat(p.paidDate) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#6B706B] dark:text-[#A0A6A0]">
                      {p.paymentMethod || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge
                        variant={
                          p.status === 'Lunas'
                            ? 'lunas'
                            : isOverdue(p.dueDate)
                            ? 'telat'
                            : 'belum'
                        }
                      >
                        {p.status === 'Lunas' ? 'Lunas' : isOverdue(p.dueDate) ? 'Telat' : 'Belum'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Laporan Kerusakan Yang Pernah Dikirim */}
          <Card>
            <h4 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6] mb-3">
              Status Laporan Kerusakan Kamar Ini ({myIssues.length})
            </h4>
            {myIssues.length === 0 ? (
              <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] py-4 text-center">
                Belum ada laporan kerusakan yang dikirimkan.
              </p>
            ) : (
              <div className="space-y-2">
                {myIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-[#1F2421] dark:text-[#E8EAE6] block">
                        {issue.title}
                      </span>
                      <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
                        {issue.category} · Dilaporkan {formatTanggalSingkat(issue.reportedDate)}
                      </span>
                    </div>
                    <Badge variant={issue.status === 'Selesai' ? 'lunas' : issue.status === 'Diproses' ? 'proses' : 'belum'}>
                      {issue.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Form Lapor Kerusakan */}
      {activeTab === 'lapor' && (
        <Card className="max-w-xl">
          <h4 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6] mb-1">
            Form Lapor Kerusakan Fasilitas
          </h4>
          <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mb-4">
            Sampaikan kendala di kamar Anda agar segera diperbaiki oleh teknisi kos.
          </p>

          <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Kategori Kerusakan *
              </label>
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value as IssueCategory)}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs outline-none"
              >
                <option value="Air / Sanitasi">Air / Sanitasi (Kran, Wastafel, Toilet)</option>
                <option value="Listrik">Listrik (Lampu, Stopkontak, Sakelar)</option>
                <option value="AC / Kipas">AC / Kipas Angin</option>
                <option value="Perabot">Perabot (Pintu, Lemari, Ranjang)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Judul Masalah *
              </label>
              <input
                type="text"
                required
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="Contoh: Kran wastafel bocor menetes"
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs outline-none focus:ring-1 focus:ring-[#2F6B57]"
              />
            </div>

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Deskripsi Kendala *
              </label>
              <textarea
                rows={3}
                required
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                placeholder="Jelaskan kondisi kerusakan..."
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs outline-none focus:ring-1 focus:ring-[#2F6B57]"
              />
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] text-white dark:text-[#151816] text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}</span>
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
