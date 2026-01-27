import api from './api';
import type { Notification } from '../types/notification';

const API_PREFIX = '/notifications'; // will be appended to baseURL from api

export async function fetchNotifications(): Promise<Notification[]> {
  const res = await api.get<Notification[]>(API_PREFIX);
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`${API_PREFIX}/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.post(`${API_PREFIX}/mark-all-read`);
}

// Real-time via Server-Sent Events (SSE)
export function connectNotificationsSSE(onMessage: (n: Notification) => void) {
  const url = (api.defaults.baseURL || '') + API_PREFIX + '/stream';

  try {
    const es = new EventSource(url, { withCredentials: true } as any);

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        onMessage(payload);
      } catch (e) {
        // Invalid SSE notification payload
      }
    };

    es.onerror = (err) => {
      es.close();
    };

    return es;
  } catch (err) {
    return null;
  }
}

// Fallback polling
export function startPolling(onFetched: (arr: Notification[]) => void, interval = 15000) {
  let mounted = true;
  const fetchOnce = async () => {
    try {
      const arr = await fetchNotifications();
      if (mounted) onFetched(arr);
    } catch (e) {
      // Polling notifications failed
    }
  };

  fetchOnce();
  const id = setInterval(fetchOnce, interval);
  return () => {
    mounted = false;
    clearInterval(id);
  };
}
