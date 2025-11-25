interface CardProps {
  children: React.ReactNode;
  glowing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, glowing = false, className = '', style }: CardProps) {
  return (
    <div 
      className={`bg-arkade-black border-2 border-arkade-purple p-6 rounded-none ${glowing ? 'retro-glow' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
