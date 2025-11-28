import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { arkClient } from '../lib/api/indexer';

interface ActivityItem {
  id: string;
  type: 'round' | 'vtxo' | 'transaction';
  txid?: string;
  address?: string;
  timestamp: number;
  description: string;
}

interface StoredActivity extends ActivityItem {
  storedAt: number;
}

interface ActivityStreamContextType {
  activities: ActivityItem[];
  isVisible: boolean;
  subscribeToNewActivity: (callback: () => void) => () => void;
}

const ActivityStreamContext = createContext<ActivityStreamContextType | undefined>(undefined);

const STORAGE_KEY = 'arkade-explorer-recent-activity';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

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

export function ActivityStreamProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ActivityItem[]>(() => loadActivitiesFromStorage());
  const [isVisible, setIsVisible] = useState(() => loadActivitiesFromStorage().length > 0);
  const newActivityCallbacksRef = useRef<Set<() => void>>(new Set());

  // Save to localStorage whenever activities change
  useEffect(() => {
    if (activities.length > 0) {
      saveActivitiesToStorage(activities);
    }
  }, [activities]);

  // Subscribe to event stream globally
  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      try {
        console.log('Subscribing to global event stream...');
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
            setIsVisible(true);
            
            // Notify all subscribers
            newActivityCallbacksRef.current.forEach(callback => callback());
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
          console.log('Real-time event stream not available. Activity feed will not be shown.');
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, []);

  const subscribeToNewActivity = useCallback((callback: () => void) => {
    newActivityCallbacksRef.current.add(callback);
    return () => {
      newActivityCallbacksRef.current.delete(callback);
    };
  }, []);

  return (
    <ActivityStreamContext.Provider value={{ activities, isVisible, subscribeToNewActivity }}>
      {children}
    </ActivityStreamContext.Provider>
  );
}

export function useActivityStream() {
  const context = useContext(ActivityStreamContext);
  if (context === undefined) {
    throw new Error('useActivityStream must be used within an ActivityStreamProvider');
  }
  return context;
}
