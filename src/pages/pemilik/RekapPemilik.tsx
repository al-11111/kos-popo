import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatTanggalSingkat,
  getCurrentYearMonth,
  formatPeriode,
} from '../../utils/formatters';
import { generateRekapCsv, calculatePeriodSummary } from '../../utils/domain';
import { Card } from '../../components/common/Card';
import { StatBlock } from '../../components/common/StatBlock';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Skeleton, TableSkeleton } from '../../components/common/Skeleton';
import { Calendar, Download, Printer } from 'lucide-react';

export const RekapPemilik: React.FC = () => {
  const { rooms, tenants, payments, issues } = useApp();

  const currentYM = getCurrentYearMonth();
  const [selectedYM, setSelectedYM] = useState<string>(currentYM);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Daftar periode dari pembayaran + bulan berjalan
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYM);
    payments.forEach((p) => {
      if (p.yearMonth) set.add(p.yearMonth);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [payments, currentYM]);

  const periodLabel = selectedYM === 'all' ? 'Semua Periode' : formatPeriode(selectedYM);

  // Pembayaran terfilter
  const filteredPayments = useMemo(() => {
    if (selectedYM === 'all') {
      return [...payments].sort((a, b) => (b.yearMonth || '').localeCompare(a.yearMonth || ''));
    }
    return payments.filter((p) => p.yearMonth === selectedYM);
  }, [payments, selectedYM]);

  // Ringkasan: Pendapatan, Tunggakan, Okupansi (Poin 2: Samakan dengan calculatePeriodSummary)
  const summary = useMemo(() => {
    return calculatePeriodSummary(selectedYM, payments, tenants, rooms.length || 20, currentYM);
  }, [payments, tenants, rooms, selectedYM, currentYM]);

  // Total biaya perbaikan dari laporan kerusakan berstatus Selesai pada periode itu
  const totalRepairCost = useMemo(() => {
    const completedIssues = issues.filter((i) => {
      if (i.status !== 'Selesai') return false;
      if (selectedYM === 'all') return true;
      const issueYM = (i.completedDate || i.reportedDate || '').slice(0, 7);
      return issueYM === selectedYM;
    });
    return completedIssues.reduce((sum, curr) => sum + (curr.cost || 0), 0);
  }, [issues, selectedYM]);

  // Handler Download CSV
  const handleDownloadCsv = () => {
    const csvContent = generateRekapCsv(filteredPayments, periodLabel);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileSuffix = selectedYM === 'all' ? 'semua-periode' : selectedYM;
    link.setAttribute('download', `kos-popo-rekap-${fileSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handler Cetak / Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-only Header (hanya muncul saat dicetak) */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-xl font-bold text-black">Kos Popo — Rekap Laporan Usaha</h1>
        <p className="text-xs text-gray-600 mt-1">Periode: {periodLabel}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">Dicetak pada: {formatTanggalSingkat(currentYM + '-01')}</p>
      </div>

      {/* Screen Page Header */}
      <div className="print:hidden">
        <PageHeader
          title="Rekap Laporan"
          description={`Laporan keuangan, hunian, dan biaya pemeliharaan untuk Pemilik · Periode ${periodLabel}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D] px-2.5 py-1.5 rounded-lg text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#6B706B] dark:text-[#A0A6A0]" />
                <select
                  value={selectedYM}
                  onChange={(e) => setSelectedYM(e.target.value)}
                  className="bg-transparent font-medium text-[#1F2421] dark:text-[#E8EAE6] outline-none cursor-pointer text-xs"
                >
                  <option value="all">Semua Periode</option>
                  {availablePeriods.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatPeriode(ym)} {ym === currentYM ? '(Berjalan)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] hover:bg-[#F7F5F0] dark:hover:bg-[#151816] text-xs font-medium text-[#1F2421] dark:text-[#E8EAE6] transition-colors"
                title="Unduh Rekap Format CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#2F6B57] dark:text-[#5FAE92]" />
                <span>Unduh CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] text-xs font-medium transition-colors"
                title="Cetak Laporan"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Ringkasan 4 Kartu: Pendapatan, Tunggakan, Okupansi, Biaya Perbaikan */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBlock
            label={`Pendapatan Realisasi (${periodLabel})`}
            value={formatRupiah(summary.revenue)}
            subtext="Tagihan sewa berstatus Lunas"
            isPrimary={true}
          />
          <StatBlock
            label={`Total Tunggakan (${periodLabel})`}
            value={formatRupiah(summary.arrears)}
            subtext="Tagihan sewa berstatus Belum"
          />
          <StatBlock
            label="Tingkat Okupansi"
            value={`${summary.occupancyRate}%`}
            subtext={`${summary.occupancyCount} dari ${summary.totalRooms} kamar terisi`}
          />
          <StatBlock
            label="Biaya Perbaikan Selesai"
            value={formatRupiah(totalRepairCost)}
            subtext="Perbaikan kerusakan berstatus Selesai"
          />
        </div>
      )}

      {/* Tabel Rincian Pembayaran per Kamar */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8] dark:border-[#2B302D] mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
              Rincian Pembayaran per Kamar
            </h3>
            <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-0.5">
              Menampilkan {filteredPayments.length} catatan pembayaran ({periodLabel})
            </p>
          </div>
          <span className="text-xs font-mono text-[#6B706B] dark:text-[#A0A6A0] print:hidden">
            Format titik-koma (;) UTF-8 BOM
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : filteredPayments.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B706B] dark:text-[#A0A6A0]">
            Tidak ada catatan pembayaran untuk periode {periodLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0]">
                  <th className="py-2.5 px-3 font-medium">Kamar</th>
                  <th className="py-2.5 px-3 font-medium">Penghuni</th>
                  <th className="py-2.5 px-3 font-medium">Periode</th>
                  <th className="py-2.5 px-3 font-medium text-right">Jumlah</th>
                  <th className="py-2.5 px-3 font-medium">Tgl Bayar</th>
                  <th className="py-2.5 px-3 font-medium">Metode</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2D8]/60 dark:divide-[#2B302D]/60">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                    <td className="py-3 px-3 font-mono font-medium text-[#2F6B57] dark:text-[#5FAE92]">
                      {p.roomNumber}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#1F2421] dark:text-[#E8EAE6]">
                      {p.tenantName}
                    </td>
                    <td className="py-3 px-3 text-[#6B706B] dark:text-[#A0A6A0]">
                      {p.month}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-[#1F2421] dark:text-[#E8EAE6] tabular-nums">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-[#6B706B] dark:text-[#A0A6A0] font-mono tabular-nums">
                      {p.paidDate ? formatTanggalSingkat(p.paidDate) : '-'}
                    </td>
                    <td className="py-3 px-3 text-[#6B706B] dark:text-[#A0A6A0]">
                      {p.paymentMethod || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={p.status === 'Lunas' ? 'lunas' : 'telat'}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
