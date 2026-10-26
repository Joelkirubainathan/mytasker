import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Plus, Bell, Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useNotifications, useMarkAllNotificationsRead } from '../../hooks/useNotifications';
import { timeAgo } from '../../utils/helpers';
import { Notification } from '../../types';

interface TopBarProps {
  onCreateTask: () => void;
}

type ThemeOption = 'light' | 'dark' | 'system';

export default function TopBar({ onCreateTask }: TopBarProps) {
  const { toggleSidebar, theme, setTheme } = useUIStore();
  const { user } = useAuthStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTheme, setShowTheme] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: notifData } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifData?.unreadCount || 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
        setShowTheme(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tasks?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={15} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={15} /> },
    { value: 'system', label: 'System', icon: <Monitor size={15} /> },
  ];

  return (
    <header className="sticky top-0 z-10 h-16 flex items-center gap-3 px-4 bg-white/80 dark:bg-[#13131a]/80 backdrop-blur-md border-b border-slate-200 dark:border-[#2a2a3e] flex-shrink-0">
      {/* Hamburger & Brand */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 select-none">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-[15px] tracking-tight">
            MyTasker
          </span>
        </div>
      </div>

      {/* Search bar - desktop */}
      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search tasks…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-[#1e1e2e] rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          aria-label="Search tasks"
        />
      </form>

      <div className="flex-1" />

      {/* Mobile search */}
      {showSearch && (
        <div className="absolute inset-0 flex items-center px-4 bg-white dark:bg-[#13131a] z-20 md:hidden">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
            <Search size={16} className="text-slate-400" />
            <input
              autoFocus
              type="search"
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setShowSearch(false)} className="text-slate-400 text-sm">Cancel</button>
          </form>
        </div>
      )}

      <div className="flex items-center gap-1" ref={notifRef}>
        {/* Mobile search toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-500 transition-colors"
          onClick={() => setShowSearch(true)}
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        {/* Quick create */}
        <button
          onClick={onCreateTask}
          id="topbar-create-task"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          aria-label="Create task"
        >
          <Plus size={16} />
          <span className="hidden lg:inline">New Task</span>
        </button>

        {/* Theme toggle */}
        <div className="relative">
          <button
            onClick={() => setShowTheme(!showTheme)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
          </button>
          {showTheme && (
            <div className="absolute right-0 top-full mt-2 w-36 card p-1 shadow-card-hover animate-scale-in z-50">
              {themeOptions.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => { setTheme(value); setShowTheme(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === value ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400' : 'hover:bg-slate-50 dark:hover:bg-[#2a2a3e] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-500 dark:text-slate-400 transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <NotificationPanel
              notifications={notifData?.data || []}
              onMarkAll={() => markAllRead.mutate()}
              onClose={() => setShowNotifs(false)}
            />
          )}
        </div>

        {/* Avatar */}
        <div
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center cursor-pointer ml-1 flex-shrink-0 hover:ring-2 hover:ring-brand-400 transition-all"
          role="button"
          tabIndex={0}
          aria-label="Profile"
        >
          <span className="text-white text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

function NotificationPanel({
  notifications,
  onMarkAll,
  onClose,
}: {
  notifications: Notification[];
  onMarkAll: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      reminder: '⏰',
      overdue: '⚠️',
      task_completed: '✅',
      due_soon: '📅',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 card shadow-modal animate-scale-in z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#2a2a3e]">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notifications</h3>
        <button
          onClick={onMarkAll}
          className="text-xs text-brand-500 hover:text-brand-600 font-medium"
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            <Bell size={28} className="mx-auto mb-2 opacity-30" />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (notif.task_id) { navigate(`/tasks/${notif.task_id}`); onClose(); }
              }}
              className={`flex gap-3 px-4 py-3 border-b border-slate-100 dark:border-[#2a2a3e] last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e1e2e] transition-colors ${
                !notif.is_read ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''
              }`}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{getIcon(notif.type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!notif.is_read ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                  {notif.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{notif.message}</p>
                <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
              </div>
              {!notif.is_read && (
                <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" aria-label="Unread" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
