import React, { useEffect, useState, useRef } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { connectNotificationsSSE, startPolling } from '../../services/notificationService';
import type { Notification } from '../../types/notification';

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
};

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, load, markRead, markAllRead, add } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    load();

    // Try SSE first
    const es = connectNotificationsSSE((n: Notification) => {
      add(n);
    });

    // If SSE not available, start polling
    let stopPolling: (() => void) | null = null;
    if (!es) {
      stopPolling = startPolling((arr) => {
        // Replace local notifications with fetched ones; prefer server's order
        // Here we simple set by calling load() which fetches via API
        load();
      });
    }

    const onClick = (ev: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onClick);

    return () => {
      es?.close && es.close();
      if (stopPolling) stopPolling();
      document.removeEventListener('click', onClick);
    };
  }, []);

  const handleToggle = () => {
    setOpen((v) => !v);
  };

  const handleMarkRead = async (id: string) => {
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="p-2 rounded-full hover:bg-gray-100 relative"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <strong>Thông báo</strong>
            <div className="flex items-center gap-2">
              <button className="text-sm text-blue-600" onClick={handleMarkAllRead}>
                Đánh dấu đã đọc
              </button>
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {notifications.length === 0 && <div className="p-4 text-sm text-gray-500">Không có thông báo</div>}

            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-start ${n.read ? 'bg-white' : 'bg-gray-50'}`}
                onClick={() => handleMarkRead(n.id)}
              >
                <div>
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-gray-600">{n.message}</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">{timeAgo(n.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
