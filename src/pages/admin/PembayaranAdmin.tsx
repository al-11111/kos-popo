import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatTanggalSingkat,
  getCurrentYearMonth,
  formatPeriode,
  getDueDate,
  isOverdue,
  getDaysOverdue,
  getToday,
} from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { StatBlock } from '../../components/common/StatBlock';
import { Modal } from '../../components/ui/Modal';
import { Skeleton, TableSkeleton } from '../../components/common/Skeleton';
import { Plus, Search, Copy, Check, AlertCircle, CalendarPlus, Info } from 'lucide-react';

export const PembayaranAdmin: React.FC = () => {
  const { payments, tenants, rooms, markPaymentPaid, recordPayment, generateMonthlyBills, showToast } = useApp();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const currentYM = getCurrentYearMonth();
  const today = getToday();

  // Daftar periode dinamis dari data pembayaran ditambah bulan berjalan
  const availablePeriods = useMemo(() => {
    const periodSet = new Set<string>();
    periodSet.add(currentYM);
    payments.forEach((p) => {
      if (p.yearMonth) {
        periodSet.add(p.yearMonth);
      }
    });
    return Array.from(periodSet).sort((a, b) => b.localeCompare(a));
  }, [payments, currentYM]);

  const [activeTab, setActiveTab] = useState<'all' | 'tunggakan'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>(currentYM);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal Catat Pembayaran
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [payFormData, setPayFormData] = useState({
    tenantId: '',
    yearMonth: currentYM,
    paidDate: getToday(),
    paymentMethod: 'Transfer BCA' as 'Transfer BCA' | 'QRIS' | 'Tunai',
  });

  const activeTenants = tenants.filter((t) => t.status === 'Aktif');

  // Filter list pembayaran
  const filteredPayments = payments.filter((p) => {
    if (activeTab === 'tunggakan' && p.status !== 'Belum') return false;
    if (monthFilter !== 'all' && p.yearMonth !== monthFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.tenantName.toLowerCase().includes(q);
      const matchRoom = p.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchRoom) return false;
    }
    return true;
  });

  // Statistik di halaman mengikuti bulan yang dipilih
  const statsPayments = monthFilter === 'all'
    ? payments
    : payments.filter((p) => p.yearMonth === monthFilter);

  const totalPaid = statsPayments
    .filter((p) => p.status === 'Lunas')
    .reduce((sum, curr) => sum + curr.amount, 0);

  // Poin 6: Tunggakan dihitung dari tanggal: tagihan Belum dengan jatuh tempo lewat dari getToday()
  const overduePayments = statsPayments.filter(
    (p) => p.status === 'Belum' && isOverdue(p.dueDate, today)
  );
  const totalOverdueAmount = overduePayments.reduce((sum, curr) => sum + curr.amount, 0);

  const unpaidCount = statsPayments.filter((p) => p.status === 'Belum').length;
  const paidCount = statsPayments.filter((p) => p.status === 'Lunas').length;

  const currentPeriodLabel = monthFilter === 'all' ? 'Semua Periode' : formatPeriode(monthFilter);

  // Handler tombol "Buat tagihan bulan ini / periode terpilih"
  const handleGenerateBills = () => {
    const targetYM = monthFilter === 'all' ? currentYM : monthFilter;
    generateMonthlyBills(targetYM);
  };

  // Buka modal form catat pembayaran
  const handleOpenModal = () => {
    const firstTenant = activeTenants[0];
    const initialYM = monthFilter === 'all' ? currentYM : monthFilter;
    setPayFormData({
      tenantId: firstTenant?.id || '',
      yearMonth: initialYM,
      paidDate: getToday(),
      paymentMethod: 'Transfer BCA',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const selectedTenant = tenants.find((item) => item.id === payFormData.tenantId);
  const currentRentPrice = selectedTenant?.rentAmount || 0;

  // Poin 4: Cek tagihan eksisting HANYA berdasarkan tenantId dan yearMonth
  const existingBillForSelected = useMemo(() => {
    if (!selectedTenant || !payFormData.yearMonth) return null;
    return payments.find(
      (p) =>
        p.tenantId === selectedTenant.id &&
        p.yearMonth === payFormData.yearMonth
    );
  }, [payments, selectedTenant, payFormData.yearMonth]);

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) {
      setFormError('Silakan pilih penghuni terlebih dahulu.');
      return;
    }

    if (!payFormData.paidDate) {
      setFormError('Tanggal bayar harus diisi.');
      return;
    }

    if (payFormData.paidDate > getToday()) {
      setFormError('Tanggal bayar tidak boleh di masa depan.');
      return;
    }

    // Poin 6: Penghuni tidak boleh punya tagihan pada periode sebelum bulan tanggal masuknya
    const tenantStartYM = (selectedTenant.startDate || '').slice(0, 7);
    if (tenantStartYM && payFormData.yearMonth < tenantStartYM) {
      setFormError(`Penghuni ${selectedTenant.name} baru mulai masuk pada ${formatTanggalSingkat(selectedTenant.startDate)}. Tagihan tidak dapat dibuat untuk periode sebelumnya.`);
      return;
    }

    if (existingBillForSelected?.status === 'Lunas') {
      setFormError(`Tagihan ${formatPeriode(payFormData.yearMonth)} untuk Kamar ${selectedTenant.roomNumber} (${selectedTenant.name}) sudah ada dan berstatus Lunas.`);
      return;
    }

    const res = recordPayment({
      tenantId: selectedTenant.id,
      yearMonth: payFormData.yearMonth,
      paidDate: payFormData.paidDate,
      paymentMethod: payFormData.paymentMethod,
    });

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setFormError(res.message);
    }
  };

  const copyReminderText = (p: typeof payments[0]) => {
    const text = `Halo Kak ${p.tenantName} (${p.roomNumber}), kami dari pengelola Kos Popo mengingatkan pembayaran sewa periode ${p.month} sebesar ${formatRupiah(p.amount)} (jatuh tempo ${formatTanggalSingkat(p.dueDate)}). Mohon konfirmasi transfer. Terima kasih.`;
    navigator.clipboard?.writeText(text);
    setCopiedId(p.id);
    showToast('Teks pengingat WhatsApp berhasil disalin.', 'success');
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran Sewa & Tunggakan"
        description={`Pencatatan kas masuk sewa ${rooms.length} kamar kos dan daftar tagihan aktif`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerateBills}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-lg border border-[#2F6B57] dark:border-[#5FAE92] text-[#2F6B57] dark:text-[#5FAE92] hover:bg-[#2F6B57]/10 text-xs font-medium transition-colors"
              title={`Buat tagihan status Belum untuk semua penghuni aktif (${monthFilter === 'all' ? formatPeriode(currentYM) : formatPeriode(monthFilter)})`}
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Buat Tagihan {monthFilter === 'all' ? 'Bulan Ini' : formatPeriode(monthFilter)}</span>
            </button>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pembayaran</span>
            </button>
          </div>
        }
      />

      {/* 3 Companion StatBlocks yang dinamis mengikuti bulan yang dipilih (Poin 6) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatBlock
            label={`Penerimaan Lunas (${currentPeriodLabel})`}
            value={formatRupiah(totalPaid)}
            subtext={`${paidCount} kamar telah lunas`}
          />
          <StatBlock
            label={`Tunggakan Lewat Tempo (${currentPeriodLabel})`}
            value={formatRupiah(totalOverdueAmount)}
            subtext={`${overduePayments.length} tagihan telat lewat tgl 10 (dari ${unpaidCount} belum bayar)`}
          />
          <StatBlock
            label="Tagihan Belum Lunas"
            value={`${unpaidCount} Tagihan`}
            subtext={
              monthFilter === 'all'
                ? `${overduePayments.length} telat, ${unpaidCount - overduePayments.length} belum jatuh tempo`
                : `Jatuh tempo ${formatTanggalSingkat(getDueDate(monthFilter))}`
            }
          />
        </div>
      )}

      {/* Poin 8: Teks bantuan kecil di halaman Pembayaran yang menjelaskan status Telat */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/60 dark:bg-[#151816]/60 text-xs text-[#6B706B] dark:text-[#A0A6A0]">
        <Info className="w-4 h-4 text-[#2F6B57] dark:text-[#5FAE92] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[#1F2421] dark:text-[#E8EAE6]">Aturan Desain Status Tagihan (F3):</strong> Status &ldquo;Telat&rdquo; adalah tampilan turunan dari tagihan berstatus &ldquo;Belum&rdquo; yang telah melewati tanggal jatuh tempo (tanggal 10) menurut tanggal demo saat ini. Dalam penyimpanan data, hanya terdapat 2 status riil: <strong>Lunas</strong> dan <strong>Belum</strong>.
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card padding="sm" className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[#2F6B57] dark:bg-[#5FAE92] text-white dark:text-[#151816]'
                : 'text-[#6B706B] dark:text-[#A0A6A0] hover:text-[#1F2421]'
            }`}
          >
            Semua ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('tunggakan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'tunggakan'
                ? 'bg-[#B7791F] text-white'
                : 'text-[#B7791F] hover:text-[#1F2421]'
            }`}
          >
            Tunggakan ({payments.filter((p) => p.status === 'Belum').length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kamar/nama..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/50 dark:bg-[#151816]/50 text-xs focus:ring-1 focus:ring-[#2F6B57] outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[#6B706B] absolute left-2.5 top-2.5" />
          </div>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs outline-none"
          >
            <option value="all">Semua Bulan</option>
            {availablePeriods.map((ym) => (
              <option key={ym} value={ym}>
                {formatPeriode(ym)}
              </option>
            ))}
          </select>
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
                  <th className="py-2.5 px-4 font-medium">Kamar & Nama</th>
                  <th className="py-2.5 px-3 font-medium">Bulan</th>
                  <th className="py-2.5 px-3 font-medium text-right">Tarif</th>
                  <th className="py-2.5 px-3 font-medium">Jatuh Tempo</th>
                  <th className="py-2.5 px-3 font-medium">Tgl Bayar</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2D8]/60 dark:divide-[#2B302D]/60">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#6B706B] dark:text-[#A0A6A0]">
                      Tidak ada catatan pembayaran yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                  const billOverdue = p.status === 'Belum' && isOverdue(p.dueDate, today);
                  const daysLate = getDaysOverdue(p.dueDate, today);
                  return (
                    <tr
                      key={p.id}
                      className="h-12 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                        <span className="font-mono text-[#2F6B57] dark:text-[#5FAE92] mr-2">
                          {p.roomNumber}
                        </span>
                        <span>{p.tenantName}</span>
                      </td>
                      <td className="py-3 px-3 text-[#6B706B] dark:text-[#A0A6A0]">
                        {p.month}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6] tabular-nums">
                        {formatRupiah(p.amount)}
                      </td>
                      <td className="py-3 px-3 text-[#6B706B] dark:text-[#A0A6A0] font-mono tabular-nums">
                        {formatTanggalSingkat(p.dueDate)}
                      </td>
                      <td className="py-3 px-3 text-[#6B706B] dark:text-[#A0A6A0]">
                        {p.paidDate ? (
                          <span className="font-mono tabular-nums">{formatTanggalSingkat(p.paidDate)}</span>
                        ) : billOverdue ? (
                          <span className="text-[#B23A3A] font-medium">Lewat tempo</span>
                        ) : (
                          <span className="text-[#B7791F]">Belum bayar</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={
                            p.status === 'Lunas'
                              ? 'lunas'
                              : billOverdue
                              ? 'telat'
                              : 'proses'
                          }
                        >
                          {p.status === 'Lunas'
                            ? 'Lunas'
                            : billOverdue
                            ? (daysLate > 0 ? `Telat ${daysLate} hari` : 'Telat')
                            : 'Belum jatuh tempo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status === 'Belum' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => copyReminderText(p)}
                              className="px-2 py-1 rounded border border-[#E6E2D8] dark:border-[#2B302D] text-[11px] text-[#6B706B] hover:text-[#1F2421] transition-colors flex items-center gap-1"
                              title="Salin Pesan Pengingat WA"
                            >
                              {copiedId === p.id ? (
                                <Check className="w-3 h-3 text-[#2E7D4F]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedId === p.id ? 'Disalin' : 'WA'}</span>
                            </button>
                            <button
                              onClick={() => markPaymentPaid(p.id)}
                              className="px-2.5 py-1 rounded bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] text-white dark:text-[#151816] text-[11px] font-medium transition-colors"
                            >
                              Tandai Lunas
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#2E7D4F] font-mono">
                            {p.paymentMethod || 'Lunas'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {/* Modal Catat Pembayaran */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Pembayaran Sewa"
        description="Pilih penghuni aktif dan periode sewa. Jumlah otomatis mengikuti tipe kamar."
      >
        <form onSubmit={handleSubmitPayment} className="space-y-3.5 text-xs">
          {formError && (
            <div className="p-3 rounded-lg border border-[#F8D2D2] dark:border-[#442323] bg-[#FDF0F0] dark:bg-[#2E1818] text-[#B23A3A] dark:text-[#E26666] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
              Penghuni *
            </label>
            <select
              value={payFormData.tenantId}
              onChange={(e) => {
                setPayFormData({ ...payFormData, tenantId: e.target.value });
                setFormError('');
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] outline-none"
            >
              {activeTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.roomNumber} - {t.name} ({formatRupiah(t.rentAmount)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Periode Bulan *
              </label>
              <select
                value={payFormData.yearMonth}
                onChange={(e) => {
                  setPayFormData({ ...payFormData, yearMonth: e.target.value });
                  setFormError('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] outline-none"
              >
                {availablePeriods.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatPeriode(ym)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Jumlah Tarif Sewa (Otomatis)
              </label>
              <input
                type="text"
                disabled
                readOnly
                value={formatRupiah(currentRentPrice)}
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-xs font-mono text-[#1F2421] dark:text-[#E8EAE6] cursor-not-allowed outline-none"
              />
            </div>
          </div>

          {/* Indikator Status Tagihan */}
          {existingBillForSelected ? (
            existingBillForSelected.status === 'Lunas' ? (
              <div className="p-2.5 rounded-lg border border-[#F8D2D2] dark:border-[#442323] bg-[#FDF0F0] dark:bg-[#2E1818] text-[#B23A3A] dark:text-[#E26666] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Tagihan {formatPeriode(payFormData.yearMonth)} untuk {selectedTenant?.roomNumber} sudah berstatus LUNAS.
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg border border-[#D5E5EE] dark:border-[#273846] bg-[#EDF4F8] dark:bg-[#1A252E] text-[#2C6E8A] dark:text-[#5CA9CA] flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  Tagihan Belum Lunas ditemukan. Form ini akan memperbarui status tagihan menjadi LUNAS.
                </span>
              </div>
            )
          ) : (
            <div className="p-2.5 rounded-lg border border-[#D0EADB] dark:border-[#223E2E] bg-[#E8F5EE] dark:bg-[#182B20] text-[#2E7D4F] dark:text-[#52B77B] flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Belum ada tagihan untuk periode ini. Tagihan baru akan otomatis dibuat dan langsung berstatus LUNAS.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Tanggal Bayar *
              </label>
              <input
                type="date"
                max={getToday()}
                value={payFormData.paidDate}
                onChange={(e) => {
                  setPayFormData({ ...payFormData, paidDate: e.target.value });
                  if (e.target.value > getToday()) {
                    setFormError('Tanggal bayar tidak boleh di masa depan.');
                  } else {
                    setFormError('');
                  }
                }}
                required
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] outline-none"
              />
              <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] mt-0.5 block">
                Maksimal hari ini ({formatTanggalSingkat(getToday())})
              </span>
            </div>

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Metode Pembayaran
              </label>
              <select
                value={payFormData.paymentMethod}
                onChange={(e) =>
                  setPayFormData({
                    ...payFormData,
                    paymentMethod: e.target.value as 'Transfer BCA' | 'QRIS' | 'Tunai',
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs focus:ring-1 focus:ring-[#2F6B57] outline-none"
              >
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="QRIS">QRIS</option>
                <option value="Tunai">Tunai</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-xs font-medium text-[#1F2421] dark:text-[#E8EAE6]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={existingBillForSelected?.status === 'Lunas'}
              className="px-4 py-2 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#5FAE92] text-white dark:text-[#151816] text-xs font-medium"
            >
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
