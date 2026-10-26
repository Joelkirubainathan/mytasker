import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Calendar, History, Plus } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface MobileNavProps {
  onCreateTask: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/history', icon: History, label: 'History' },
];

export default function MobileNav({ onCreateTask }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden bg-white/90 dark:bg-[#13131a]/90 backdrop-blur-md border-t border-slate-200 dark:border-[#2a2a3e] z-20 safe-area-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.slice(0, 2).map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all min-w-0',
                isActive ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500')
            }
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}

        {/* Create button - center */}
        <button
          onClick={onCreateTask}
          className="flex flex-col items-center gap-0.5 -mt-6"
          aria-label="Create new task"
        >
          <div className="w-14 h-14 bg-brand-500 hover:bg-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 transition-all active:scale-95">
            <Plus size={26} className="text-white" />
          </div>
        </button>

        {navItems.slice(2).map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all min-w-0',
                isActive ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500')
            }
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
