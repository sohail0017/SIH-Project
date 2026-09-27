import React, { useEffect } from 'react';
import { X, Bell, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onNotificationClick: (item: NotificationItem) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onNotificationClick,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unread = notifications.filter((n) => !n.read).length;

  const typeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4 text-gov-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/40 animate-fade" onClick={onClose}>
      <aside
        className="animate-pop w-full max-w-sm h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gov-700" />
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {unread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gov-700 text-white">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] font-semibold text-gov-700 hover:underline mr-2"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => onNotificationClick(n)}
              className={`w-full text-left px-4 py-3.5 hover:bg-gov-50/60 transition-colors flex gap-3 ${
                n.read ? 'opacity-70' : ''
              }`}
            >
              <span className="mt-0.5 shrink-0">{typeIcon(n.type)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-800 leading-snug">
                    {n.title}
                  </span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-gov-600 shrink-0" />}
                </span>
                <span className="block text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</span>
                <span className="block text-[10px] text-slate-400 mt-1.5">{n.timestamp}</span>
              </span>
            </button>
          ))}
        </div>

        <footer className="px-4 py-3 border-t border-slate-100 text-[10px] text-slate-400">
          SkillTrack operational notifications · Demonstration data
        </footer>
      </aside>
    </div>
  );
};
