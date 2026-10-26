import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-6 flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-[#E6E2D8] dark:border-[#2B302D] bg-white/50 dark:bg-[#1D211F]/50 ${className}`}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[#6B706B] dark:text-[#A0A6A0] mb-3">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" />}
      </div>
      <h3 className="text-base font-medium text-[#1F2421] dark:text-[#E8EAE6]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[#6B706B] dark:text-[#A0A6A0] max-w-sm leading-normal">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-lg bg-[#2F6B57] hover:bg-[#265A49] dark:bg-[#5FAE92] dark:hover:bg-[#73C2A7] text-white dark:text-[#151816] text-xs font-medium transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
