import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

export interface RealtimeEvent {
  entityType: 'SALE' | 'PAYMENT' | 'INSTALLMENT' | 'CUSTOMER' | string;
  action: string;
  entityId: string;
  branchId: string;
  timestamp: number;
}

type EventListener = (event: RealtimeEvent) => void;

interface RealtimeContextType {
  subscribe: (listener: EventListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  subscribe: () => () => {},
});

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '/api';
};

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const listenersRef = useRef<Set<EventListener>>(new Set());

  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;
      const currentToken = localStorage.getItem('murabha_access_token');
      if (!currentToken) return;

      const url = `${getApiBaseUrl()}/events/subscribe?token=${encodeURIComponent(currentToken)}`;
      eventSource = new EventSource(url);

      eventSource.addEventListener('CHANGE', (e: MessageEvent) => {
        try {
          const payload: RealtimeEvent = JSON.parse(e.data);
          listenersRef.current.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error('Error executing realtime listener:', err);
            }
          });
        } catch (err) {
          console.error('Failed to parse realtime event payload:', err);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isCancelled) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user]);

  const subscribe = (listener: EventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  };

  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to automatically trigger a callback when any matching real-time event occurs.
 *
 * @param entityTypeOrTypes One or more entity types to listen for, e.g. 'SALE', 'PAYMENT', or ['SALE', 'PAYMENT']
 * @param onUpdate Callback executed when a change is broadcast
 * @param entityId Optional specific entityId filter (e.g. current sale ID)
 */
export function useRealtimeSync(
  entityTypeOrTypes: string | string[],
  onUpdate: (event: RealtimeEvent) => void,
  entityId?: string
) {
  const { subscribe } = useContext(RealtimeContext);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const typesKey = Array.isArray(entityTypeOrTypes) ? entityTypeOrTypes.join(',') : entityTypeOrTypes;

  useEffect(() => {
    const types = Array.isArray(entityTypeOrTypes) ? entityTypeOrTypes : [entityTypeOrTypes];

    const unsubscribe = subscribe((event) => {
      if (types.includes(event.entityType) || types.includes('*')) {
        if (!entityId || entityId === event.entityId) {
          onUpdateRef.current(event);
        }
      }
    });

    return unsubscribe;
  }, [subscribe, typesKey, entityId]);
}
