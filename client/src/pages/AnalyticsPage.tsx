import { useState } from 'react';
import { BarChart2, TrendingUp, CheckCircle2, Clock, Target, Award } from 'lucide-react';
import { useProductivityAnalytics } from '../hooks/useDashboard';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { SkeletonStatCard } from '../components/ui/Skeleton';
import { formatMinutes } from '../utils/helpers';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '3 months' },
];

const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#94a3b8'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useProductivityAnalytics(period);

  const stats = data ? [
    { label: 'Tasks Created', value: data.summary.totalCreated, icon: <Target size={18} />, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-950/50' },
    { label: 'Completed', value: data.summary.totalCompleted, icon: <CheckCircle2 size={18} />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/50' },
    { label: 'Completion Rate', value: `${data.summary.completionRate}%`, icon: <TrendingUp size={18} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/50' },
    { label: 'Time Tracked', value: formatMinutes(data.summary.totalTimeMinutes), icon: <Clock size={18} />, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/50' },
  ] : [];

  const priorityData = data?.priorityBreakdown?.map((p: any) => ({
    name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
    value: p.count,
  })) || [];

  const tooltipStyle = {
    contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-brand-500" /> Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your productivity insights</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p.value
                  ? 'bg-brand-500 text-white'
                  : 'btn-secondary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          : stats.map((s) => (
            <div key={s.label} className="card p-4">
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Completion trend */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="section-title mb-4">Completion Trend</h2>
          {isLoading ? (
            <div className="skeleton h-44 rounded-xl" />
          ) : data?.completionByDay.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.completionByDay}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip {...tooltipStyle} labelFormatter={(d) => new Date(d + 'T12:00:00').toLocaleDateString()} formatter={(v: number) => [v, 'Completed']} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data for this period</div>
          )}
        </div>

        {/* Priority breakdown */}
        <div className="card p-5">
          <h2 className="section-title mb-4">By Priority</h2>
          {priorityData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {priorityData.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Category stats table */}
      {data?.categoryStats?.length ? (
        <div className="card p-5">
          <h2 className="section-title mb-4">Category Performance</h2>
          <div className="space-y-3">
            {data.categoryStats.map((cat: any) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{cat.name}</span>
                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{cat.completed}/{cat.total}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-[#2a2a3e] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full progress-bar"
                      style={{ width: `${cat.completion_rate}%`, backgroundColor: cat.color || '#6366f1' }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0 w-10 text-right">
                  {Math.round(cat.completion_rate)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Avg completion time */}
      {data?.summary.avgCompletionDays != null && (
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
            <Award size={22} className="text-yellow-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Average Completion Time</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.summary.avgCompletionDays} <span className="text-sm font-normal text-slate-400">days</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
