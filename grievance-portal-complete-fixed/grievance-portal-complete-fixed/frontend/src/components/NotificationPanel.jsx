import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, CheckCheck, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { timeAgo } from '../utils/constants';

const NOTIFICATION_ICONS = {
  complaint_submitted: { icon: FileText, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
  status_update: { icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
  escalation: { icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  default: { icon: Bell, bg: 'bg-slate-100 dark:bg-slate-800', color: 'text-slate-600 dark:text-slate-400' },
};

function NotificationItem({ notification, onMarkRead }) {
  const config = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0
        ${!notification.isRead ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium text-slate-900 dark:text-white leading-tight ${!notification.isRead ? 'font-semibold' : ''}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{notification.message}</p>
        {notification.metadata?.complaintId && (
          <span className="inline-block mt-1 font-mono text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-1.5 py-0.5 rounded">
            {notification.metadata.complaintId}
          </span>
        )}
        <p className="text-xs text-slate-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
    </motion.div>
  );
}

export default function NotificationPanel({ isOpen, onClose }) {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed right-4 top-20 z-50 w-80 sm:w-96 card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-slate-700 dark:text-slate-300" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-950/50">
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ml-1">
                  <X size={15} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto scrollbar-thin bg-white dark:bg-slate-900">
              {isLoading ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <BellOff size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
                <span className="text-xs text-slate-400">Showing last {notifications.length} notifications</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
