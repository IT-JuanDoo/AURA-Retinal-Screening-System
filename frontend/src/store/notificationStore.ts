import create from 'zustand';
import type { Notification } from '../types/notification';
import * as notificationService from '../services/notificationService';

type State = {
  notifications: Notification[];
  unreadCount: number;
  load: () => Promise<void>;
  add: (n: Notification) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clear: () => void;
};

export const useNotificationStore = create<State>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  load: async () => {
    try {
      const arr = await notificationService.fetchNotifications();
      const unread = arr.filter((x) => !x.read).length;
      set({ notifications: arr, unreadCount: unread });
    } catch (e) {
      // Failed to load notifications
    }
  },
  add: (n) => {
    const prev = get().notifications;
    const newArr = [n, ...prev];
    const unread = newArr.filter((x) => !x.read).length;
    set({ notifications: newArr, unreadCount: unread });
  },
  markRead: async (id: string) => {
    try {
      await notificationService.markNotificationRead(id);
      const updated = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      const unread = updated.filter((x) => !x.read).length;
      set({ notifications: updated, unreadCount: unread });
    } catch (e) {
      // Failed to mark notification read
    }
  },
  markAllRead: async () => {
    try {
      await notificationService.markAllRead();
      const updated = get().notifications.map((n) => ({ ...n, read: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (e) {
      // Failed to mark all read
    }
  },
  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
