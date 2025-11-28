import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../UI/Card';
import { truncateHash } from '../../lib/utils';
import { Activity } from 'lucide-react';
import { useActivityStream } from '../../contexts/ActivityStreamContext';

interface ActivityItem {
  id: string;
  type: 'round' | 'vtxo' | 'transaction';
  txid?: string;
  address?: string;
  timestamp: number;
  description: string;
}

interface RecentActivityProps {
  onNewActivity?: () => void;
}

export function RecentActivity({ onNewActivity }: RecentActivityProps) {
  const { activities, isVisible, subscribeToNewActivity } = useActivityStream();
  const [, setTick] = useState(0);

  // Subscribe to new activity events if callback is provided
  useEffect(() => {
    if (!onNewActivity) return;
    
    const unsubscribe = subscribeToNewActivity(onNewActivity);
    return unsubscribe;
  }, [onNewActivity, subscribeToNewActivity]);

  // Update time ago every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || activities.length === 0) {
    return null;
  }

  return (
    <Card className="animate-fade-in">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="text-arkade-purple" size={20} />
        <h2 className="text-xl font-bold text-arkade-purple uppercase">Recent Activity</h2>
      </div>
      
      <div className="space-y-1">
        {activities.map((activity, index) => (
          <ActivityRow key={activity.id} activity={activity} index={index} />
        ))}
      </div>
    </Card>
  );
}

function ActivityRow({ activity, index }: { activity: ActivityItem; index: number }) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'round':
        return 'bg-arkade-orange';
      case 'vtxo':
        return 'bg-green-500';
      case 'transaction':
        return 'bg-arkade-purple';
      default:
        return 'bg-arkade-gray';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'round':
        return 'Commitment TX';
      case 'vtxo':
        return 'VTXO';
      case 'transaction':
        return 'Transaction';
      default:
        return type;
    }
  };

  const getLink = () => {
    if (activity.txid) {
      return `/tx/${activity.txid}`;
    }
    if (activity.address) {
      return `/address/${activity.address}`;
    }
    return null;
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const link = getLink();

  return (
    <Link 
      to={link || '#'}
      className="flex w-full p-3 bg-arkade-black border border-arkade-purple hover:bg-arkade-purple hover:bg-opacity-30 transition-all duration-200 items-start justify-between gap-3 no-underline animate-slide-in"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-xs text-arkade-gray">
          {getTimeAgo(activity.timestamp)}
        </div>
        {(activity.txid || activity.address) && (
          <div className="text-xs sm:text-sm font-mono text-arkade-gray break-all">
            {activity.txid && (
              <>
                <span className="sm:hidden">{truncateHash(activity.txid, 8, 8)}</span>
                <span className="hidden sm:inline">{truncateHash(activity.txid, 16, 16)}</span>
              </>
            )}
            {activity.address && (
              <>
                <span className="sm:hidden">{truncateHash(activity.address, 8, 8)}</span>
                <span className="hidden sm:inline">{truncateHash(activity.address, 16, 16)}</span>
              </>
            )}
          </div>
        )}
      </div>
      <span className={`${getTypeBadgeColor(activity.type)} text-white text-[10px] sm:text-xs px-2 py-1 uppercase font-bold flex-shrink-0 whitespace-nowrap`}>
        {getTypeLabel(activity.type)}
      </span>
    </Link>
  );
}
