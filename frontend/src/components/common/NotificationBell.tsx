import React, { useEffect, useState, useRef } from "react";
import { useNotificationStore } from "../../store/notificationStore";
import {
  connectNotificationsSSE,
  startPolling,
} from "../../services/notificationService";
import type { Notification } from "../../types/notification";

const timeAgo = (iso?: string) => {
  if (!iso) return "";
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
  const { notifications, unreadCount, load, markRead, markAllRead, add } =
    useNotificationStore();
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
      stopPolling = startPolling(() => {
        // Replace local notifications with fetched ones; prefer server's order
        // Here we simple set by calling load() which fetches via API
        load();
      });
    }

    const onClick = (ev: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(ev.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      es?.close && es.close();
      if (stopPolling) stopPolling();
      document.removeEventListener("click", onClick);
    };
  }, []);

  const handleToggle = () => {
    setOpen((v) => {
      const next = !v;
      // Khi mở dropdown: gọi lại API để danh sách và badge luôn đồng bộ
      if (next) load();
      return next;
    });
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
        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        onClick={handleToggle}
        aria-label="Thông báo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
            <strong className="text-slate-900 dark:text-white">
              Thông báo
            </strong>
            <button
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              onClick={handleMarkAllRead}
            >
              Đánh dấu đã đọc
            </button>
          </div>
          <div className="max-h-60 overflow-auto">
            {notifications.length === 0 && (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                Không có thông báo
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 cursor-pointer flex justify-between items-start border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${
                  n.read
                    ? "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                }`}
                onClick={() => handleMarkRead(n.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {n.message}
                  </div>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 ml-2 shrink-0">
                  {timeAgo(n.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
