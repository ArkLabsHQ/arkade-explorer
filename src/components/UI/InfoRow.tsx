import { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function InfoRow({ label, value, className = '' }: InfoRowProps) {
  return (
    <div className={`flex items-center justify-between border-b border-arkade-purple pb-2 ${className}`}>
      <span className="text-arkade-gray uppercase text-sm font-bold">{label}</span>
      <div className="text-arkade-gray font-mono text-sm">{value}</div>
    </div>
  );
}
