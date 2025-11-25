import { Card } from '../UI/Card';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function FeatureCard({ title, description, icon: Icon }: FeatureCardProps) {
  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="text-arkade-orange">
            <Icon size={24} />
          </div>
          <h3 className="text-lg font-bold text-arkade-purple uppercase">{title}</h3>
        </div>
        <p className="text-arkade-gray text-sm">{description}</p>
      </div>
    </Card>
  );
}
