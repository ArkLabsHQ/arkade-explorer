import { Link } from 'react-router-dom';
import { Card } from '../UI/Card';
import { AlertCircle } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card glowing>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <AlertCircle size={64} className="text-arkade-orange" />
          </div>
          
          <h1 className="text-4xl font-bold text-arkade-purple uppercase">404</h1>
          <p className="text-arkade-gray text-lg uppercase">Page Not Found</p>
          
          <Link to="/" className="inline-block retro-button">
            Return Home
          </Link>
        </div>
      </Card>
    </div>
  );
}
