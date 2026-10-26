import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths } from 'date-fns';
import { useTasks } from '../hooks/useTasks';
import { Task } from '../types';
import { cn } from '../utils/helpers';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get all tasks with due dates
  const { data } = useTasks({ limit: 200, sort: 'due_date', order: 'asc' });
  const { data: historyData } = useTasks({ history: true, limit: 100, sort: 'due_date', order: 'asc' });

  const allTasks = [...(data?.data || []), ...(historyData?.data || [])];

  // Build calendar grid
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getTasksForDay = (date: Date): Task[] => {
    return allTasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), date));
  };

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500',
    in_progress: 'bg-blue-500',
    not_started: 'bg-slate-400',
    paused: 'bg-yellow-500',
    archived: 'bg-slate-300',
    urgent: 'bg-red-500',
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarIcon size={22} className="text-brand-500" />
          Calendar
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="btn-secondary p-2"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold text-slate-900 dark:text-white min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="btn-secondary p-2"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn-secondary text-sm px-3"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-[#2a2a3e]">
          {weekDays.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((date, i) => {
            const dayTasks = getTasksForDay(date);
            const today = isToday(date);
            const inMonth = isSameMonth(date, currentDate);

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-slate-100 dark:border-[#2a2a3e] last:border-r-0',
                  !inMonth && 'opacity-30',
                  'hover:bg-slate-50 dark:hover:bg-[#1e1e2e] transition-colors'
                )}
              >
                <div className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium mb-1 mx-auto sm:mx-0',
                  today ? 'bg-brand-500 text-white' : 'text-slate-700 dark:text-slate-300'
                )}>
                  {format(date, 'd')}
                </div>

                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className={cn(
                        'w-full text-left truncate text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium text-white transition-opacity hover:opacity-80',
                      )}
                      style={{ backgroundColor: task.category_color || '#6366f1' }}
                      title={task.title}
                    >
                      <span className="hidden sm:inline">{task.title}</span>
                      <span className="sm:hidden">·</span>
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-slate-400 pl-1">+{dayTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Completed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" />In Progress</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400" />Not Started</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" />Urgent</span>
      </div>
    </div>
  );
}
