import React from 'react';
import { Check, Clock, AlertCircle, Home, Minus, Shield, Wrench } from 'lucide-react';

export type BadgeVariant = 'lunas' | 'belum' | 'telat' | 'kosong' | 'terisi' | 'proses' | 'netral';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => {
  const getStyles = () => {
    switch (variant) {
      case 'lunas':
        return {
          bg: 'bg-[#E8F5EE] dark:bg-[#182B20] text-[#2E7D4F] dark:text-[#52B77B] border-[#D0EADB] dark:border-[#223E2E]',
          icon: <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />,
        };
      case 'belum':
        return {
          bg: 'bg-[#FEF6E9] dark:bg-[#2A2114] text-[#B7791F] dark:text-[#E2A03F] border-[#F7E5C7] dark:border-[#3D301E]',
          icon: <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />,
        };
      case 'telat':
        return {
          bg: 'bg-[#FDF0F0] dark:bg-[#2E1818] text-[#B23A3A] dark:text-[#E26666] border-[#F8D2D2] dark:border-[#442323]',
          icon: <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />,
        };
      case 'terisi':
        return {
          bg: 'bg-[#E6F0EB] dark:bg-[#1C2D25] text-[#2F6B57] dark:text-[#5FAE92] border-[#CDE1D6] dark:border-[#2A4237]',
          icon: <Home className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />,
        };
      case 'kosong':
        return {
          bg: 'bg-[#F0F1EF] dark:bg-[#232725] text-[#7A7F7A] dark:text-[#A0A6A0] border-[#E0E2DE] dark:border-[#333936]',
          icon: <Minus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />,
        };
      case 'proses':
        return {
          bg: 'bg-[#EDF4F8] dark:bg-[#1A252E] text-[#2C6E8A] dark:text-[#5CA9CA] border-[#D5E5EE] dark:border-[#273846]',
          icon: <Wrench className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />,
        };
      default:
        return {
          bg: 'bg-[#F0F1EF] dark:bg-[#232725] text-[#6B706B] dark:text-[#A0A6A0] border-[#E0E2DE] dark:border-[#333936]',
          icon: null,
        };
    }
  };

  const { bg, icon } = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tabular-nums tracking-normal whitespace-nowrap ${bg} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
