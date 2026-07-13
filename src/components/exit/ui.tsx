import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The explorer's standard card surface (matches tx/address pages). */
export const cardClass =
  'rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn(cardClass, className)}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-heading text-base font-bold text-foreground">{children}</h2>;
}

type Variant = 'primary' | 'outline' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-border text-foreground hover:bg-muted',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
};

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring [&_svg]:h-4 [&_svg]:w-4',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
