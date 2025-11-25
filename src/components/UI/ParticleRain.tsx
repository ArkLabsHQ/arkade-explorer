import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
}

export function ParticleRain({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;

    // Create new particles
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: -10,
      speed: 2 + Math.random() * 3,
      size: 20 + Math.random() * 20,
    }));

    setParticles(newParticles);

    // Animate particles falling
    const interval = setInterval(() => {
      setParticles(prev => {
        const updated = prev
          .map(p => ({ ...p, y: p.y + p.speed }))
          .filter(p => p.y < 110); // Remove particles that fell off screen
        
        if (updated.length === 0) {
          clearInterval(interval);
        }
        
        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute text-arkade-purple animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: `${particle.size}px`,
            transition: 'top 0.05s linear',
          }}
        >
          👾
        </div>
      ))}
    </div>
  );
}
