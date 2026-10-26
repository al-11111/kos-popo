import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MaintenanceIssue, IssueStatus } from '../../types';
import { formatRupiah, formatTanggal, formatTanggalSingkat, getToday } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/common/Skeleton';
import { Wrench } from 'lucide-react';

export const KerusakanAdmin: React.FC = () => {
  const { issues, updateIssueStatus } = useApp();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const [selectedIssue, setSelectedIssue] = useState<MaintenanceIssue | null>(null);
  const [modalStatus, setModalStatus] = useState<IssueStatus>('Diproses');
  const [modalDate, setModalDate] = useState(getToday());
  const [modalCost, setModalCost] = useState<number | ''>(0);
  const [modalNotes, setModalNotes] = useState('');

  const handleOpenEditModal = (issue: MaintenanceIssue) => {
    setSelectedIssue(issue);
    setModalStatus(issue.status);
    setModalDate(issue.completedDate || getToday());
    setModalCost(issue.cost || 0);
    setModalNotes(issue.repairNotes || '');
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    updateIssueStatus(
      selectedIssue.id,
      modalStatus,
      modalStatus === 'Selesai' ? modalDate : undefined,
      modalStatus === 'Selesai' ? Number(modalCost) : undefined,
      modalNotes
    );

    setSelectedIssue(null);
  };

  const columns: { status: IssueStatus; title: string; badge: 'belum' | 'proses' | 'lunas' }[] = [
    { status: 'Dilaporkan', title: 'Dilaporkan', badge: 'belum' },
    { status: 'Diproses', title: 'Diproses', badge: 'proses' },
    { status: 'Selesai', title: 'Selesai', badge: 'lunas' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Kerusakan"
        description="Alur status penanganan fasilitas kamar dari laporan penghuni"
        action={
          <span className="text-xs text-[#6B706B] dark:text-[#A0A6A0] font-mono">
            {issues.length} Laporan
          </span>
        }
      />

      {/* 3-Column Simple Status Board (Section 4.5 & 6) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
          const colIssues = issues.filter((i) => i.status === col.status);
          return (
            <div
              key={col.status}
              className="rounded-xl border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/60 dark:bg-[#151816]/60 p-4 flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6E2D8] dark:border-[#2B302D]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#1F2421] dark:text-[#E8EAE6]">
                    {col.title}
                  </span>
                  <span className="text-xs font-mono text-[#6B706B] dark:text-[#A0A6A0]">
                    ({colIssues.length})
                  </span>
                </div>
                <Badge variant={col.badge}>{col.status}</Badge>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colIssues.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#6B706B] dark:text-[#A0A6A0]">
                    Tidak ada tiket.
                  </div>
                ) : (
                  colIssues.map((issue) => (
                    <Card
                      key={issue.id}
                      padding="sm"
                      onClick={() => handleOpenEditModal(issue)}
                      className="text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-[#2F6B57] dark:text-[#5FAE92]">
                          Kamar {issue.roomNumber}
                        </span>
                        <span className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
                          {issue.category}
                        </span>
                      </div>
                      <p className="font-medium text-[#1F2421] dark:text-[#E8EAE6] leading-snug">
                        {issue.title}
                      </p>
                      <p className="text-[11px] text-[#6B706B] dark:text-[#A0A6A0] line-clamp-2">
                        {issue.description}
                      </p>
                      <div className="pt-2 border-t border-[#E6E2D8] dark:border-[#2B302D] flex items-center justify-between text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
                        <span>{issue.tenantName}</span>
                        <span className="font-mono">{formatTanggalSingkat(issue.reportedDate)}</span>
                      </div>
                      {issue.status === 'Selesai' && issue.cost !== undefined && (
                        <div className="text-[11px] font-mono text-[#2F6B57] dark:text-[#5FAE92] text-right">
                          Biaya: {formatRupiah(issue.cost)}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal Update Status */}
      {selectedIssue && (
        <Modal
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title={`Tiket Kerusakan Kamar ${selectedIssue.roomNumber}`}
          description={`Pelapor: ${selectedIssue.tenantName} (${formatTanggalSingkat(selectedIssue.reportedDate)})`}
        >
          <form onSubmit={handleSaveStatus} className="space-y-3.5 text-xs">
            <div className="p-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0]/60 dark:bg-[#151816]/60">
              <span className="text-[#6B706B] dark:text-[#A0A6A0] block text-[11px]">
                {selectedIssue.category}
              </span>
              <p className="font-medium text-sm text-[#1F2421] dark:text-[#E8EAE6] mt-0.5">
                {selectedIssue.title}
              </p>
              <p className="text-[#6B706B] dark:text-[#A0A6A0] mt-1 leading-relaxed">
                {selectedIssue.description}
              </p>
            </div>

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Status Penanganan *
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Dilaporkan', 'Diproses', 'Selesai'] as IssueStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setModalStatus(st)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                      modalStatus === st
                        ? 'bg-[#2F6B57] dark:bg-[#5FAE92] text-white dark:text-[#151816] border-[#2F6B57] dark:border-[#5FAE92]'
                        : 'border-[#E6E2D8] dark:border-[#2B302D] text-[#6B706B] dark:text-[#A0A6A0]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {modalStatus === 'Selesai' && (
              <div className="p-3 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] space-y-2.5">
                <span className="font-medium text-[#1F2421] dark:text-[#E8EAE6] block">
                  Detail Penyelesaian
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1">
                      Tanggal Tuntas
                    </label>
                    <input
                      type="date"
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1">
                      Biaya Perbaikan (Rp)
                    </label>
                    <input
                      type="number"
                      value={modalCost}
                      onChange={(e) => setModalCost(Number(e.target.value))}
                      placeholder="150000"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-[#F7F5F0] dark:bg-[#151816] text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[#6B706B] dark:text-[#A0A6A0] mb-1 font-medium">
                Catatan Tindakan
              </label>
              <textarea
                rows={2}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="Catatan teknisi atau perbaikan yang dilakukan..."
                className="w-full px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] text-xs outline-none focus:ring-1 focus:ring-[#2F6B57]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="px-3 py-2 rounded-lg border border-[#E6E2D8] dark:border-[#2B302D] text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] text-white dark:text-[#151816] text-xs font-medium"
              >
                Simpan Tiket
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
