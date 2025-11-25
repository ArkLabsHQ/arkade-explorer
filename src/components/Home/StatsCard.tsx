import { Card } from '../UI/Card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <Card glowing>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-arkade-gray uppercase text-xs font-bold">{title}</p>
          <p className="text-3xl font-bold text-arkade-purple font-mono">{value}</p>
          {description && (
            <p className="text-arkade-gray text-xs">{description}</p>
          )}
        </div>
        <div className="text-arkade-orange">
          <Icon size={32} />
        </div>
      </div>
    </Card>
  );
}
