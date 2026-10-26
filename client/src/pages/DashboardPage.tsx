import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertCircle, TrendingUp, Target,
  Zap, Calendar, ArrowRight, Activity
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useAuthStore } from '../store/authStore';
import TaskCard from '../components/tasks/TaskCard';
import QuickCreateModal from '../components/tasks/QuickCreateModal';
import { SkeletonStatCard, SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { getGreeting, getGreetingEmoji, formatDate, timeAgo, ACTION_LABELS } from '../utils/helpers';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const greeting = getGreeting();
  const emoji = getGreetingEmoji();

  const stats = [
    {
      label: 'Total Tasks',
      value: data?.stats.totalTasks ?? 0,
      icon: <Target size={18} />,
      color: 'text-brand-500',
      bg: 'bg-brand-50 dark:bg-brand-950/50',
    },
    {
      label: 'Completed',
      value: data?.stats.completedTasks ?? 0,
      icon: <CheckCircle2 size={18} />,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950/50',
    },
    {
      label: 'In Progress',
      value: data?.stats.inProgressTasks ?? 0,
      icon: <TrendingUp size={18} />,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Overdue',
      value: data?.stats.overdueTasks ?? 0,
      icon: <AlertCircle size={18} />,
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-950/50',
    },
  ];

  const todayPct = data?.todayProgress.percentage ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {greeting}, {user?.name?.split(' ')[0] || 'Friend'} {emoji}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {data?.stats.overdueTasks
              ? `You have ${data.stats.overdueTasks} overdue task${data.stats.overdueTasks > 1 ? 's' : ''} — let's catch up.`
              : data?.stats.dueSoon
              ? `${data.stats.dueSoon} task${data.stats.dueSoon > 1 ? 's' : ''} due soon. Stay on track!`
              : 'All clear! Have a productive day.'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex-shrink-0 hidden sm:flex items-center gap-2">
          <span>+</span> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          : stats.map((s) => (
            <div key={s.label} className="card p-4 hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>
                  {s.icon}
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            </div>
          ))}
      </div>

      {/* Today's Progress + Focus Now */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progress ring */}
        <div className="card p-5 flex flex-col items-center justify-center text-center">
          <h2 className="section-title mb-4">Today's Progress</h2>
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12"
                className="text-slate-100 dark:text-[#2a2a3e]" />
              <circle
                cx="60" cy="60" r="50" fill="none" strokeWidth="12"
                stroke="url(#prog-grad)"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - todayPct / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{todayPct}%</span>
              <span className="text-xs text-slate-400">done</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {data?.todayProgress.completed ?? 0} of {data?.todayProgress.total ?? 0} tasks
          </p>
        </div>

        {/* Focus Now */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-yellow-500" />
            <h2 className="section-title">Focus Now</h2>
          </div>
          {isLoading ? <SkeletonCard /> : data?.focusTask ? (
            <div
              onClick={() => navigate(`/tasks/${data.focusTask!.id}`)}
              className="p-4 bg-gradient-to-r from-brand-50 to-violet-50 dark:from-brand-950/30 dark:to-violet-950/30 rounded-xl border border-brand-100 dark:border-brand-900/50 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {data.focusTask.category_icon && (
                      <span className="text-sm">{data.focusTask.category_icon}</span>
                    )}
                    <span className="text-xs font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                      {data.focusTask.category_name || 'General'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base line-clamp-2">
                    {data.focusTask.title}
                  </h3>
                  {data.focusTask.due_date && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar size={11} /> Due {formatDate(data.focusTask.due_date)}
                    </p>
                  )}
                  {data.focusTask.progress > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full progress-bar"
                          style={{ width: `${data.focusTask.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{data.focusTask.progress}% complete</p>
                    </div>
                  )}
                </div>
                <ArrowRight size={18} className="text-brand-400 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Zap size={24} className="text-yellow-400" />}
              title="All caught up!"
              description="No urgent tasks right now. Great work!"
            />
          )}
        </div>
      </div>

      {/* Today's tasks + Upcoming */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Today's Tasks</h2>
            <button onClick={() => navigate('/tasks')} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
              All tasks <ArrowRight size={12} />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : data?.todaysTasks.length ? (
            <div className="space-y-3">
              {data.todaysTasks.slice(0, 5).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {data.todaysTasks.length > 5 && (
                <button onClick={() => navigate('/tasks')} className="w-full py-2.5 text-sm text-brand-500 hover:text-brand-600 font-medium">
                  + {data.todaysTasks.length - 5} more
                </button>
              )}
            </div>
          ) : (
            <EmptyState
              icon="🎉"
              title="You're all clear!"
              description="No tasks due today. Create one when you're ready."
              action={
                <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
                  + New Task
                </button>
              }
            />
          )}
        </div>

        {/* Upcoming + Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Upcoming</h2>
              <button onClick={() => navigate('/calendar')} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                Calendar <ArrowRight size={12} />
              </button>
            </div>
            {data?.upcomingTasks.length ? (
              <div className="space-y-2">
                {data.upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex items-center gap-3 p-3 card hover:shadow-card-hover cursor-pointer transition-all group"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.category_color || '#6366f1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                      <p className="text-xs text-slate-400">{formatDate(task.due_date)}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No upcoming tasks</p>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-slate-400" />
              <h2 className="section-title">Recent Activity</h2>
            </div>
            {data?.recentActivity.length ? (
              <div className="space-y-2">
                {data.recentActivity.slice(0, 6).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-900 dark:text-white">{act.task_title}: </span>
                        {ACTION_LABELS[act.action] || act.action}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      {data?.weeklyCompletion && data.weeklyCompletion.length > 1 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Weekly Completions</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.weeklyCompletion} barSize={24}>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v, 'Completed']}
                labelFormatter={(d) => new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.weeklyCompletion.map((_, i) => (
                  <Cell key={i} fill={i === data.weeklyCompletion.length - 1 ? '#6366f1' : '#c7d2fe'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showCreate && <QuickCreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
