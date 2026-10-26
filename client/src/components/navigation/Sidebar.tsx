import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, CheckSquare, Calendar, History, BarChart2, 
  Tag, Settings, Plus, ChevronLeft, ChevronRight, LogOut, User
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/helpers';

interface SidebarProps {
  onCreateTask: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/categories', icon: Tag, label: 'Categories' },
];

const bottomItems = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ onCreateTask }: SidebarProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col',
        'bg-white dark:bg-[#13131a] border-r border-slate-200 dark:border-[#2a2a3e]',
        'transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-[#2a2a3e] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-[15px]">MyTasker</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors hidden md:flex"
          aria-label="Close sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Create Button */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={onCreateTask}
          id="sidebar-create-task"
          className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium text-sm transition-all duration-150 active:scale-[0.98] shadow-sm"
        >
          <Plus size={18} />
          <span>New Task</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => cn('nav-link', isActive && 'active')}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="px-3 pb-3 border-t border-slate-200 dark:border-[#2a2a3e] pt-3 space-y-0.5 flex-shrink-0">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn('nav-link', isActive && 'active')}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* User info + logout */}
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-400 hover:text-red-500 transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
