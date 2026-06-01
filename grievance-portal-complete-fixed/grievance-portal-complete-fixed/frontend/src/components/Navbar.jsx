import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Moon, Sun, Menu, X, LogOut, User, ChevronDown, Globe, Wifi, WifiOff } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { useNotifications } from '../hooks/useNotifications';
import { useSocket } from '../hooks/useSocket';
import NotificationPanel from './NotificationPanel';
import { ROLE_LABELS, LANGUAGES } from '../utils/constants';
import { useTranslation } from '../utils/i18n';

export default function Navbar({ onMenuToggle, sidebarOpen }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme, language, setLanguage } = useThemeStore();
  const navigate = useNavigate();

  // Conditionally use hooks - only when authenticated
  const notifHook = useNotifications();
  const socketHook = useSocket();
  const { t } = useTranslation();

  const unreadCount = isAuthenticated ? notifHook.unreadCount : 0;
  const isConnected = isAuthenticated ? socketHook.isConnected : false;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const REDIRECT_HOME = {
    citizen: '/dashboard',
    ps_officer: '/ps-dashboard',
    acb_officer: '/acb-dashboard',
    municipal_officer: '/municipal-dashboard',
    super_admin: '/admin',
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/');
  };

  const closeAll = () => {
    setShowUserMenu(false);
    setShowLangMenu(false);
    setShowNotifications(false);
  };

  return (
    <>
      {/* Tricolor strip */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-orange-400" />
        <div className="flex-1 bg-white border-y border-slate-200" />
        <div className="flex-1 bg-green-600" />
      </div>

      <nav className="sticky top-4 mx-4 sm:mx-6 z-50 rounded-[22px] bg-white/70 dark:bg-slate-900/60 border border-white dark:border-white/5 shadow-lg transition-all duration-300 max-w-7xl xl:mx-auto" style={{ boxShadow: 'var(--clay-shadow-md)', backdropFilter: 'blur(12px)' }}>
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Left */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors lg:hidden">
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
            <Link to={isAuthenticated ? (REDIRECT_HOME[user?.role] || '/dashboard') : '/'} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-bold text-sm font-display">JS</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight font-display">Jan Shakti</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Grievance Portal</div>
              </div>
            </Link>
          </div>

          {/* Public nav links */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-6">
              <Link to="/track" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">{t('nav.track')}</Link>
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-1">

            {/* Emergency fast link */}
            {(!isAuthenticated || user?.role === 'citizen') && (
              <Link to="/emergency" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm animate-pulse mr-1" style={{ boxShadow: '0 4px 10px rgba(239, 68, 68, 0.35)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                🚨 Emergency
              </Link>
            )}

            {/* Live indicator for authority roles */}
            {isAuthenticated && user?.role !== 'citizen' && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md mr-1">
                {isConnected ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-slate-400" />}
                <span className={`text-xs font-medium ${isConnected ? 'text-green-500' : 'text-slate-400'}`}>
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            )}

            {/* Language */}
            <div className="relative">
              <button onClick={() => { setShowLangMenu(!showLangMenu); setShowUserMenu(false); setShowNotifications(false); }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1">
                <Globe size={17} />
                <span className="text-xs font-medium hidden sm:block">{language.toUpperCase()}</span>
              </button>
              <AnimatePresence>
                {showLangMenu && (
                  <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute right-0 top-full mt-3 w-48 card shadow-xl py-2 z-50 border border-white dark:border-white/5 bg-white/95 dark:bg-slate-900/95" style={{ borderRadius: '20px', boxShadow: 'var(--clay-shadow-md)' }}>
                    {LANGUAGES.map((lang) => (
                      <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors
                          ${language === lang.code ? 'text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                        <span>{lang.label}</span>
                        <span className="text-slate-400 text-xs">{lang.native}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Notification bell */}
                <button onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); setShowLangMenu(false); }}
                  className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </button>

                {/* User menu */}
                <div className="relative">
                  <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowLangMenu(false); }}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{user?.name?.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{ROLE_LABELS[user?.role]}</div>
                    </div>
                    <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        className="absolute right-0 top-full mt-3 w-56 card shadow-xl z-50 overflow-hidden border border-white dark:border-white/5 bg-white/95 dark:bg-slate-900/95" style={{ borderRadius: '22px', boxShadow: 'var(--clay-shadow-md)' }}>
                        <div className="px-4 py-3 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-700 flex items-center justify-center mb-2">
                            <span className="text-sm font-bold text-white">{user?.name?.charAt(0)}</span>
                          </div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">{user?.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user?.email}</div>
                          <div className="mt-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400">
                              {ROLE_LABELS[user?.role]}
                            </span>
                          </div>
                        </div>
                        <Link to={REDIRECT_HOME[user?.role] || '/dashboard'} onClick={closeAll}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          <User size={15} className="text-slate-400" /> {t('nav.dashboard')}
                        </Link>
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <LogOut size={15} /> {t('nav.logout')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-xs px-3 py-2">{t('nav.login')}</Link>
                <Link to="/register" className="btn-primary text-xs px-3 py-2">{t('nav.register')}</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Notification Panel */}
      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
