import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { arkClient } from "@/lib/api/indexer";
import { parseActivityEvent, type ActivityItem } from "@/lib/activity";

interface StoredActivity extends ActivityItem {
    storedAt: number;
}

interface ActivityStreamContextType {
    activities: ActivityItem[];
    connectionStatus: "connecting" | "live" | "disconnected";
}

const ActivityStreamContext = createContext<ActivityStreamContextType | undefined>(undefined);

const STORAGE_KEY = "arkade-explorer-recent-activity";
const MAX_AGE_MS = 30 * 60 * 1000;

function loadActivitiesFromStorage(): ActivityItem[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];

        const activities: StoredActivity[] = JSON.parse(stored);
        const now = Date.now();

        return activities
            .filter((activity) => now - activity.storedAt < MAX_AGE_MS)
            .map(({ storedAt, ...activity }) => activity);
    } catch (error) {
        console.error("Failed to load activities from storage:", error);
        return [];
    }
}

function saveActivitiesToStorage(activities: ActivityItem[]) {
    try {
        const now = Date.now();
        const storedActivities: StoredActivity[] = activities.map((activity) => ({
            ...activity,
            storedAt: now,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedActivities));
    } catch (error) {
        console.error("Failed to save activities to storage:", error);
    }
}

export function ActivityStreamProvider({ children }: { children: ReactNode }) {
    const [activities, setActivities] = useState<ActivityItem[]>(() => loadActivitiesFromStorage());
    const [connectionStatus, setConnectionStatus] =
        useState<ActivityStreamContextType["connectionStatus"]>("connecting");

    useEffect(() => {
        if (activities.length > 0) saveActivitiesToStorage(activities);
    }, [activities]);

    useEffect(() => {
        const abortController = new AbortController();

        (async () => {
            try {
                const eventStream = arkClient.getTransactionsStream(abortController.signal);
                for await (const event of eventStream) {
                    if (abortController.signal.aborted) break;
                    setConnectionStatus("live");
                    const activity = parseActivityEvent(event);
                    if (activity) {
                        setActivities((prev) => [activity, ...prev].slice(0, 10));
                    }
                }
            } catch (error) {
                if (!abortController.signal.aborted) console.error("Event stream error:", error);
            } finally {
                if (!abortController.signal.aborted) setConnectionStatus("disconnected");
            }
        })();

        return () => abortController.abort();
    }, []);

    return (
        <ActivityStreamContext.Provider value={{ activities, connectionStatus }}>
            {children}
        </ActivityStreamContext.Provider>
    );
}

export function useActivityStream() {
    const context = useContext(ActivityStreamContext);
    if (context === undefined) {
        throw new Error("useActivityStream must be used within an ActivityStreamProvider");
    }
    return context;
}
