import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'yellow' | 'blue' | 'purple' | 'red' | 'gray';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'blue', size = 'sm' }: BadgeProps) {
  const variantStyles = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-brand-100 text-brand-800 border-brand-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    red: 'bg-rose-100 text-rose-800 border-rose-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs font-semibold',
    md: 'px-3 py-1 text-sm font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
}
