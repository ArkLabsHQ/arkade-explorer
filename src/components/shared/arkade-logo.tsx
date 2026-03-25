'use client';

interface ArkadeLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ArkadeLogo({ className, showText = true, size = 'md' }: ArkadeLogoProps) {
  // Icon should match the cap-height of the text
  const config = {
    sm:  { icon: 18, text: '0.875rem', gap: 'gap-1.5' },
    md:  { icon: 22, text: '1.0625rem', gap: 'gap-2' },
    lg:  { icon: 28, text: '1.375rem',  gap: 'gap-2.5' },
  }[size];

  return (
    <span className={`inline-flex items-center ${config.gap} ${className || ''}`}>
      <svg
        width={config.icon}
        height={config.icon}
        viewBox="0 0 35 35"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary shrink-0"
        aria-hidden="true"
      >
        <path d="M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z" fill="currentColor"/>
        <path d="M8.75 26.25V17.5H26.25V26.25H8.75Z" fill="currentColor"/>
        <path d="M8.75 26.25H2.45431e-07V35H8.75V26.25Z" fill="currentColor"/>
        <path d="M26.25 26.25V35H35V26.25H26.25Z" fill="currentColor"/>
      </svg>
      {showText && (
        <span style={{ fontSize: config.text, lineHeight: 1 }}>
          <span className="font-heading font-bold text-foreground tracking-tight">Arkade</span>
          {' '}
          <span className="font-heading font-normal text-muted-foreground">Explorer</span>
        </span>
      )}
    </span>
  );
}
