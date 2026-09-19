import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminNotificationsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

const POLL_INTERVAL_MS = 30000;

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const data = await adminNotificationsApi.unreadCount(token);
      setCount(data.count);
    } catch {
      // silent - the bell just won't update this cycle
    }
  }, [token]);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      const data = await adminNotificationsApi.list(token, { perPage: 10 });
      setNotifications(data.notifications);
      setLoaded(true);
    }
  }

  async function handleClick(notification) {
    if (!notification.isRead) {
      await adminNotificationsApi.markRead(token, notification.id);
      setNotifications((rows) =>
        rows.map((r) =>
          r.id === notification.id ? { ...r, isRead: true } : r,
        ),
      );
      setCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  }

  async function handleMarkAllRead() {
    await adminNotificationsApi.markAllRead(token);
    setNotifications((rows) => rows.map((r) => ({ ...r, isRead: true })));
    setCount(0);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 hover:bg-surface transition-colors"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute top-1 right-1 bg-ink text-bg text-[10px] w-4 h-4 flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-bg border border-border shadow-soft z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs uppercase tracking-luxury text-ink/50">
              Notifications
            </span>
            {count > 0 && (
              <button
                className="text-xs hover:underline"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-ink/40 px-4 py-6 text-center">
                Nothing here yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-surface transition-colors ${
                    n.isRead ? "opacity-60" : ""
                  }`}
                >
                  <div className="text-sm">{n.title}</div>
                  <div className="text-xs text-ink/50 mt-0.5">{n.message}</div>
                  <div className="text-[10px] text-ink/35 mt-1">
                    {timeAgo(n.createdAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
