import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { arkClient } from '../../lib/api/indexer';
import { Card } from '../UI/Card';
import { truncateHash } from '../../lib/utils';
import { Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'round' | 'vtxo' | 'transaction';
  txid?: string;
  address?: string;
  timestamp: number;
  description: string;
}

interface RecentActivityProps {
  onNewActivity: () => void;
}

const STORAGE_KEY = 'arkade-explorer-recent-activity';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

interface StoredActivity extends ActivityItem {
  storedAt: number;
}

function loadActivitiesFromStorage(): ActivityItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const activities: StoredActivity[] = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out activities older than MAX_AGE_MS
    return activities
      .filter(activity => (now - activity.storedAt) < MAX_AGE_MS)
      .map(({ storedAt, ...activity }) => activity);
  } catch (error) {
    console.error('Failed to load activities from storage:', error);
    return [];
  }
}

function saveActivitiesToStorage(activities: ActivityItem[]) {
  try {
    const now = Date.now();
    const storedActivities: StoredActivity[] = activities.map(activity => ({
      ...activity,
      storedAt: now
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedActivities));
  } catch (error) {
    console.error('Failed to save activities to storage:', error);
  }
}

export function RecentActivity({ onNewActivity }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(() => loadActivitiesFromStorage());
  const [isVisible, setIsVisible] = useState(() => loadActivitiesFromStorage().length > 0);
  const [, setTick] = useState(0);

  // Save to localStorage whenever activities change
  useEffect(() => {
    if (activities.length > 0) {
      saveActivitiesToStorage(activities);
    }
  }, [activities]);

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      try {
        console.log('Subscribing to general event stream...');
        // Use SDK's ArkProvider getEventStream method which returns an async generator
        // Subscribe to all events by passing empty array
        const eventStream = arkClient.getTransactionsStream(abortController.signal);
        
        for await (const event of eventStream) {
          console.log('Event received:', event);
          
          // Parse event and create activity item
          const activity = parseEvent(event);
          if (activity) {
            setActivities(prev => {
              const newActivities = [activity, ...prev].slice(0, 10); // Keep last 10
              return newActivities;
            });
            
            // Show the card on first activity
            if (!isVisible) {
              setIsVisible(true);
            }
            
            // Trigger particle effect
            onNewActivity();
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Event stream aborted');
        } else {
          console.error('Event stream error:', error);
          console.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name
          });
          // Event stream not available - this is okay, just won't show real-time updates
          console.log('Real-time event stream not available. Activity feed will not be shown.');
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [onNewActivity, isVisible]);

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

function parseEvent(event: any): ActivityItem | null {
  const timestamp = Date.now();
  const id = `${timestamp}-${Math.random()}`;

  // Parse commitmentTx events
  if (event.commitmentTx) {
    const spentCount = event.commitmentTx.spentVtxos?.length || 0;
    const spendableCount = event.commitmentTx.spendableVtxos?.length || 0;
    
    return {
      id,
      type: 'round',
      txid: event.commitmentTx.txid,
      timestamp,
      description: `Commitment TX: ${spentCount} spent, ${spendableCount} created`,
    };
  }

  // Parse arkTx events
  if (event.arkTx) {
    const spentCount = event.arkTx.spentVtxos?.length || 0;
    const spendableCount = event.arkTx.spendableVtxos?.length || 0;
    
    return {
      id,
      type: 'transaction',
      txid: event.arkTx.txid,
      timestamp,
      description: `Ark TX: ${spentCount} spent, ${spendableCount} created`,
    };
  }

  // Parse round/batch events
  if (event.round) {
    return {
      id,
      type: 'round',
      txid: event.round.txid,
      timestamp,
      description: `New Batch ${event.round.id || 'started'}`,
    };
  }

  // Parse VTXO events
  if (event.vtxo) {
    return {
      id,
      type: 'vtxo',
      txid: event.vtxo.txid,
      address: event.vtxo.receiver,
      timestamp,
      description: `VTXO ${event.vtxo.spent ? 'spent' : 'created'}`,
    };
  }

  return null;
}
