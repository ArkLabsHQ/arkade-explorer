'use client';

interface ArkadeLogoProps {
  className?: string;
  showText?: boolean; // show "Arkade Explorer" text after icon
  size?: 'sm' | 'md' | 'lg';
}

export function ArkadeLogo({ className, showText = true, size = 'md' }: ArkadeLogoProps) {
  const iconSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-7 h-7' : 'w-9 h-9';

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <svg className={`${iconSize} text-primary`} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z" fill="currentColor"/>
        <path d="M8.75 26.25V17.5H26.25V26.25H8.75Z" fill="currentColor"/>
        <path d="M8.75 26.25H2.45431e-07V35H8.75V26.25Z" fill="currentColor"/>
        <path d="M26.25 26.25V35H35V26.25H26.25Z" fill="currentColor"/>
      </svg>
      {showText && (
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading font-bold text-foreground tracking-tight" style={{ fontSize: size === 'sm' ? '0.875rem' : size === 'md' ? '1.125rem' : '1.5rem' }}>
            Arkade
          </span>
          <span className="text-muted-foreground" style={{ fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '0.875rem' : '1rem' }}>
            Explorer
          </span>
        </div>
      )}
    </div>
  );
}
