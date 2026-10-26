import React from 'react';
import { useApp } from '../../context/AppContext';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg shadow-sm border text-xs transition-all duration-150 animate-in fade-in slide-in-from-top-1 ${
            toast.type === 'success'
              ? 'bg-[#E8F5EE] dark:bg-[#182B20] border-[#D0EADB] dark:border-[#223E2E] text-[#2E7D4F] dark:text-[#52B77B]'
              : toast.type === 'error'
              ? 'bg-[#FDF0F0] dark:bg-[#2E1818] border-[#F8D2D2] dark:border-[#442323] text-[#B23A3A] dark:text-[#E26666]'
              : 'bg-white dark:bg-[#1D211F] border-[#E6E2D8] dark:border-[#2B302D] text-[#1F2421] dark:text-[#E8EAE6]'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <Check className="w-3.5 h-3.5 stroke-[2.2]" />}
            {toast.type === 'error' && <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />}
            {toast.type === 'info' && <Info className="w-3.5 h-3.5 stroke-[2.2]" />}
          </div>
          <p className="font-medium leading-relaxed flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
