import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  badge,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E2D8] dark:border-[#2B302D]">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-[#1F2421] dark:text-[#E8EAE6]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-sm text-[#6B706B] dark:text-[#A0A6A0] leading-normal">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 flex items-center gap-2.5">{action}</div>}
    </div>
  );
};
