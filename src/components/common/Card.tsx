import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1D211F] rounded-xl border border-[#E6E2D8] dark:border-[#2B302D] ${
        onClick ? 'cursor-pointer hover:border-[#2F6B57]/60 dark:hover:border-[#5FAE92]/60 transition-colors' : ''
      } ${paddingClasses} ${className}`}
    >
      {children}
    </div>
  );
};
