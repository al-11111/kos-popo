import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatTanggalSingkat,
  getCurrentYearMonth,
  formatPeriode,
  isOverdue,
  getDaysOverdue,
  getToday,
} from '../../utils/formatters';
import {
  getRoomTypeDescription,
  calculatePeriodSummary,
  calculateCumulativeOverdue,
} from '../../utils/domain';
import { Card } from '../../components/common/Card';
import { StatBlock } from '../../components/common/StatBlock';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { OccupancyChart, RevenueChart } from '../../components/charts/OwnerCharts';
import { CheckCircle2, Layers, AlertCircle, Wrench, RotateCcw, Calendar, Info } from 'lucide-react';

export const DashboardPemilik: React.FC = () => {
  const { rooms, payments, issues, tenants } = useApp();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const currentYM = getCurrentYearMonth();
  const [selectedYM, setSelectedYM] = useState<string>(currentYM);

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

  // Poin 2: Samakan perhitungan okupansi dengan calculatePeriodSummary
  const periodSummary = useMemo(() => {
    return calculatePeriodSummary(selectedYM, payments, tenants, rooms.length || 20, currentYM);
  }, [selectedYM, payments, tenants, rooms.length, currentYM]);

  const totalRooms = rooms.length;
  const occupiedRooms = periodSummary.occupancyCount;
  const emptyRooms = totalRooms - occupiedRooms;
  const occupancyRate = periodSummary.occupancyRate;
  const emptyRoomsList = useMemo(() => {
    return rooms.filter((r) => r.status === 'Kosong').map((r) => r.roomNumber);
  }, [rooms]);

  // Pembayaran Berdasarkan Periode Terpilih
  const selectedPeriodLabel = formatPeriode(selectedYM);
  const selectedMonthPayments = payments.filter((p) => p.yearMonth === selectedYM);
  const paidSelected = selectedMonthPayments.filter((p) => p.status === 'Lunas');
  const unpaidSelected = selectedMonthPayments.filter((p) => p.status === 'Belum');

  // Poin 6 (Aturan Tunggakan): Total tunggakan hanya menghitung yang sudah LEWAT jatuh tempo
  const today = getToday();
  const overdueUnpaid = unpaidSelected.filter((p) => isOverdue(p.dueDate, today));
  const notOverdueUnpaid = unpaidSelected.filter((p) => !isOverdue(p.dueDate, today));

  const currentRevenue = paidSelected.reduce((acc, curr) => acc + curr.amount, 0);
  const overdueArrearsTotal = overdueUnpaid.reduce((acc, curr) => acc + curr.amount, 0);
  const allUnpaidTotal = unpaidSelected.reduce((acc, curr) => acc + curr.amount, 0);
  const potentialTotal = currentRevenue + allUnpaidTotal;

  // Poin 3: Total belum lunas semua periode (seluruh tagihan Belum yang lewat jatuh tempo tanpa filter periode)
  const cumulativeOverdue = useMemo(() => {
    return calculateCumulativeOverdue(payments, today);
  }, [payments, today]);

  // Kerusakan aktif
  const activeIssues = issues.filter((i) => i.status !== 'Selesai');

  return (
    <div className="space-y-6">
      {/* Header dengan Selektor Periode Dinamis (Poin 3) */}
      <PageHeader
        title="Ringkasan Usaha Kos Popo"
        description={`Periode ${selectedPeriodLabel} · Kapasitas ${rooms.length} Kamar`}
        action={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D] px-2.5 py-1.5 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#6B706B] dark:text-[#A0A6A0]" />
              <select
                value={selectedYM}
                onChange={(e) => setSelectedYM(e.target.value)}
                className="bg-transparent font-medium text-[#1F2421] dark:text-[#E8EAE6] outline-none cursor-pointer text-xs"
              >
                {availablePeriods.map((ym) => (
                  <option key={ym} value={ym} className="bg-white dark:bg-[#1D211F]">
                    {formatPeriode(ym)} {ym === currentYM ? '(Berjalan)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[#6B706B] dark:text-[#A0A6A0] font-mono px-2 py-1 bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D] rounded-lg">
              {occupiedRooms}/{totalRooms} Terisi
            </div>
          </div>
        }
      />

      {/* Jika periode terpilih belum ada tagihan sama sekali */}
      {selectedMonthPayments.length === 0 && (
        <Card className="p-8 text-center bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D]">
          <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] dark:bg-[#151816] text-[#6B706B] dark:text-[#A0A6A0] mx-auto flex items-center justify-center mb-3">
            <Info className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
            Belum Ada Tagihan untuk Periode {selectedPeriodLabel}
          </h3>
          <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-1 max-w-md mx-auto">
            Belum ada tagihan sewa yang diterbitkan untuk periode ini. Tagihan bulanan diterbitkan oleh Admin pengelola kos melalui portal Admin.
          </p>
        </Card>
      )}

      {/* Hierarki Statistik (Section 4.5): 1 Angka Utama di atas + 3 Statistik Pendamping */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Angka Utama (5 Cols) */}
            <div className="md:col-span-5">
              <StatBlock
                label={`Pendapatan Sewa Realisasi (${selectedPeriodLabel})`}
                value={formatRupiah(currentRevenue)}
                subtext={`Dari potensi sewa ${formatRupiah(potentialTotal)} (${paidSelected.length} dari ${selectedMonthPayments.length} penghuni lunas)`}
                isPrimary={true}
                className="h-full"
              />
            </div>

            {/* 3 Statistik Pendamping (7 Cols) */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatBlock
                label="Tingkat Okupansi"
                value={`${occupancyRate}%`}
                subtext={`${occupiedRooms} terisi, ${emptyRooms} kosong${
                  emptyRoomsList.length > 0 ? ` (${emptyRoomsList.join(', ')})` : ''
                }`}
              />
              <StatBlock
                label={`Tunggakan Lewat Tempo (${selectedPeriodLabel})`}
                value={formatRupiah(overdueArrearsTotal)}
                subtext={`${overdueUnpaid.length} telat lewat tgl 10 (dari ${unpaidSelected.length} belum lunas)`}
              />
              <StatBlock
                label="Kerusakan Aktif"
                value={`${activeIssues.length} Kasus`}
                subtext={`${issues.filter((i) => i.status === 'Dilaporkan').length} baru, ${issues.filter((i) => i.status === 'Diproses').length} diproses`}
              />
            </div>
          </div>

          {/* Baris Ringkasan Tunggakan Kumulatif Semua Periode (Poin 3) */}
          <div className="p-3 rounded-xl border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/70 dark:bg-[#151816]/70 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#B23A3A] dark:text-[#E26666] shrink-0" />
              <span className="text-[#1F2421] dark:text-[#E8EAE6]">
                <strong className="font-semibold">Total belum lunas semua periode:</strong>{' '}
                <span className="font-mono font-bold text-[#B23A3A] dark:text-[#E26666] tabular-nums">
                  {formatRupiah(cumulativeOverdue.totalAmount)}
                </span>{' '}
                <span className="text-[#6B706B] dark:text-[#A0A6A0]">
                  ({cumulativeOverdue.count} tagihan lewat tempo)
                </span>
              </span>
            </div>
            <p className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
              Tunggakan periode adalah tagihan belum lunas pada bulan terpilih, sedangkan total belum lunas semua periode merangkum seluruh tagihan lewat tempo sejak kos beroperasi.
            </p>
          </div>
        </div>
      )}

      {/* 2 Grafik Minimalis Recharts (Okupansi & Pendapatan) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <OccupancyChart selectedYM={selectedYM} />
        </Card>
        <Card>
          <RevenueChart selectedYM={selectedYM} />
        </Card>
      </div>

      {/* 2 Daftar: Tunggakan Teratas & Kerusakan Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Daftar Tunggakan (7 Cols) */}
        <Card className="lg:col-span-7">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8] dark:border-[#2B302D] mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
                Daftar Belum Lunas ({selectedPeriodLabel})
              </h3>
              <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-0.5">
                Total tunggakan dihitung hanya untuk tagihan yang telah lewat jatuh tempo tanggal 10
              </p>
            </div>
            <span className="text-xs font-mono text-[#B7791F]">
              {unpaidSelected.length} Kamar ({overdueUnpaid.length} Telat)
            </span>
          </div>

          {unpaidSelected.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B706B] dark:text-[#A0A6A0]">
              {selectedMonthPayments.length === 0
                ? `Tidak ada data tagihan untuk periode ${selectedPeriodLabel}.`
                : `Seluruh pembayaran sewa periode ${selectedPeriodLabel} telah lunas.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0]">
                    <th className="py-2.5 font-medium">Kamar</th>
                    <th className="py-2.5 font-medium">Nama Penghuni</th>
                    <th className="py-2.5 font-medium text-right">Nominal</th>
                    <th className="py-2.5 font-medium text-right">Jatuh Tempo</th>
                    <th className="py-2.5 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2D8]/60 dark:divide-[#2B302D]/60">
                  {unpaidSelected.map((pay) => {
                    const overdue = isOverdue(pay.dueDate, today);
                    const daysLate = getDaysOverdue(pay.dueDate, today);
                    return (
                      <tr key={pay.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                        <td className="py-3 font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                          {pay.roomNumber}
                        </td>
                        <td className="py-3 text-[#1F2421] dark:text-[#E8EAE6]">
                          {pay.tenantName}
                        </td>
                        <td className="py-3 text-right font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6] tabular-nums">
                          {formatRupiah(pay.amount)}
                        </td>
                        <td className="py-3 text-right text-[#6B706B] dark:text-[#A0A6A0] font-mono tabular-nums">
                          {formatTanggalSingkat(pay.dueDate)}
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={overdue ? 'telat' : 'proses'}>
                            {overdue ? (daysLate > 0 ? `Telat ${daysLate} hari` : 'Telat') : 'Belum jatuh tempo'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Kerusakan Terbaru & Komposisi Tipe Kamar (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8] dark:border-[#2B302D] mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
                  Laporan Kerusakan Terbaru
                </h3>
                <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-0.5">
                  Fasilitas kamar yang membutuhkan penanganan
                </p>
              </div>
              <span className="text-xs font-mono text-[#6B706B] dark:text-[#A0A6A0]">
                {issues.length} Total
              </span>
            </div>

            <div className="space-y-2.5">
              {issues.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
                      Kamar {issue.roomNumber}
                    </span>
                    <Badge
                      variant={
                        issue.status === 'Selesai'
                          ? 'lunas'
                          : issue.status === 'Diproses'
                          ? 'proses'
                          : 'belum'
                      }
                    >
                      {issue.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-[#1F2421] dark:text-[#E8EAE6] truncate">
                    {issue.title}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-[#6B706B] dark:text-[#A0A6A0] mt-1.5 pt-1.5 border-t border-[#E6E2D8]/60 dark:border-[#2B302D]/60">
                    <span>{issue.category}</span>
                    <span className="font-mono">{formatTanggalSingkat(issue.reportedDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Snapshot Komposisi Kamar */}
          <Card>
            <h4 className="text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0] mb-2.5">
              Komposisi {rooms.length} Kamar Kos Popo
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D]">
                <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] block">Tipe 1</span>
                <span className="font-mono font-semibold text-[#1F2421] dark:text-[#E8EAE6]">3 Kamar</span>
                <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] block font-mono">Rp700rb</span>
              </div>
              <div className="p-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D]">
                <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] block">Tipe 2</span>
                <span className="font-mono font-semibold text-[#1F2421] dark:text-[#E8EAE6]">10 Kamar</span>
                <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] block font-mono">Rp800rb</span>
              </div>
              <div className="p-2.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D]">
                <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] block">Tipe 3</span>
                <span className="font-mono font-semibold text-[#1F2421] dark:text-[#E8EAE6]">7 Kamar</span>
                <span className="text-[10px] text-[#6B706B] dark:text-[#A0A6A0] block font-mono">Rp900rb</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
