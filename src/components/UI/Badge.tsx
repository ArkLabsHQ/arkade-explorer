import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantClasses = {
    default: 'bg-arkade-purple text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-arkade-black',
    danger: 'bg-arkade-orange text-white',
  };

  return (
    <span
      className={cn(
        'px-2 py-1 text-xs font-bold uppercase',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
