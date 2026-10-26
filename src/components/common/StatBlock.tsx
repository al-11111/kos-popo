import React from 'react';

interface StatBlockProps {
  label: string;
  value: string | number;
  subtext?: string;
  isPrimary?: boolean;
  className?: string;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  subtext,
  isPrimary = false,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-[#E6E2D8] dark:border-[#2B302D] bg-white dark:bg-[#1D211F] p-5 flex flex-col justify-between ${
        isPrimary ? 'ring-1 ring-[#2F6B57]/30 dark:ring-[#5FAE92]/30' : ''
      } ${className}`}
    >
      <span className="text-xs font-medium text-[#6B706B] dark:text-[#A0A6A0] tracking-normal">
        {label}
      </span>
      <div className="my-1.5">
        <span
          className={`font-semibold font-mono tabular-nums tracking-tight text-[#1F2421] dark:text-[#E8EAE6] ${
            isPrimary ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {value}
        </span>
      </div>
      {subtext && (
        <span className="text-xs text-[#6B706B] dark:text-[#A0A6A0] leading-snug">
          {subtext}
        </span>
      )}
    </div>
  );
};
