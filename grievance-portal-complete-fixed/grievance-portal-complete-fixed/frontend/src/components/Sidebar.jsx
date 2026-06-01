import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Search, PlusCircle, Users, Shield,
  BarChart3, Settings, AlertTriangle, Building2, ChevronRight,
  X, UserCircle, Bell
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';

const NAV_CONFIG = {
  citizen: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/submit-complaint', icon: PlusCircle, label: 'File Complaint' },
    { to: '/track', icon: Search, label: 'Track Complaint' },
    { to: '/profile', icon: UserCircle, label: 'My Account' },
  ],
  ps_officer: [
    { to: '/ps-dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/ps-dashboard?tab=escalated', icon: AlertTriangle, label: 'Escalated', badge: 'escalated' },
    { to: '/profile', icon: UserCircle, label: 'My Account' },
  ],
  acb_officer: [
    { to: '/acb-dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/acb-dashboard?tab=escalated', icon: AlertTriangle, label: 'Escalated', badge: 'escalated' },
    { to: '/profile', icon: UserCircle, label: 'My Account' },
  ],
  municipal_officer: [
    { to: '/municipal-dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/municipal-dashboard?tab=escalated', icon: AlertTriangle, label: 'Escalated', badge: 'escalated' },
    { to: '/profile', icon: UserCircle, label: 'My Account' },
  ],
  super_admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/authorities', icon: Shield, label: 'Authorities' },
    { to: '/admin/complaints', icon: FileText, label: 'All Complaints' },
    { to: '/admin/escalations', icon: AlertTriangle, label: 'Escalations' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/create-authority', icon: PlusCircle, label: 'Add Authority' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ],
};

const ROLE_INFO = {
  citizen: { label: 'Citizen Portal', colorClass: 'bg-blue-600', icon: '👤' },
  ps_officer: { label: 'Police Station', colorClass: 'bg-blue-800', icon: '🚔' },
  acb_officer: { label: 'ACB Department', colorClass: 'bg-purple-700', icon: '⚖️' },
  municipal_officer: { label: 'Municipal Auth.', colorClass: 'bg-teal-600', icon: '🏛️' },
  super_admin: { label: 'Admin Panel', colorClass: 'bg-red-600', icon: '🔐' },
};

function NavItem({ item, unreadCount }) {
  const showBadge = item.badge === 'notifications' && unreadCount > 0;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        isActive
          ? 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-r-2 border-blue-600'
          : 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-all duration-150'
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
          <span className="flex-1">{item.label}</span>
          {showBadge && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {isActive && <ChevronRight size={13} className="text-blue-400 ml-auto" />}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose }) {
  const { user } = useAuthStore();
  const { unreadCount } = useNotifications();
  const navItems = NAV_CONFIG[user?.role] || NAV_CONFIG.citizen;
  const roleInfo = ROLE_INFO[user?.role] || ROLE_INFO.citizen;

  return (
    <div className="flex flex-col h-full">
      {/* Role badge */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${roleInfo.colorClass} text-white text-xs font-semibold`}>
          <span>{roleInfo.icon}</span>
          <span>{roleInfo.label}</span>
        </div>
        {user?.jurisdiction?.district && (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1">
            📍 {user.jurisdiction.district}, {user.jurisdiction.state}
          </div>
        )}
        {user?.district && !user?.jurisdiction?.district && (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1">
            📍 {user.district}, {user.state}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <div key={item.to} onClick={onClose}>
            <NavItem item={item} unreadCount={unreadCount} />
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="text-center">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Jan Shakti Portal</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">Government of India • v1.0.0</div>
          <div className="mt-2 flex justify-center gap-2">
            <div className="h-1 w-4 rounded bg-orange-400" />
            <div className="h-1 w-4 rounded bg-white border border-slate-200 dark:border-slate-600" />
            <div className="h-1 w-4 rounded bg-green-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-[calc(100vh-65px)] sticky top-[65px]">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -264 }} animate={{ x: 0 }} exit={{ x: -264 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xs font-display">JS</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm font-display">Jan Shakti</span>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={18} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
