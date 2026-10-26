import { useState, useCallback } from 'react';
import { Search, Filter, SortAsc, Grid, List } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useCategories } from '../hooks/useCategories';
import TaskCard from '../components/tasks/TaskCard';
import QuickCreateModal from '../components/tasks/QuickCreateModal';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Priority, TaskStatus } from '../types';
import { useLocation } from 'react-router-dom';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'paused', label: 'Paused' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Recently Created' },
  { value: 'updated_at', label: 'Recently Updated' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'progress', label: 'Progress' },
  { value: 'title', label: 'Alphabetical' },
];

export default function TasksPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTasks({
    search: search || undefined,
    status: status || undefined,
    priority: priority as Priority | undefined,
    category_id: categoryId || undefined,
    sort,
    order,
    page,
    limit: 20,
  });
  const { data: categories } = useCategories();

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const tasks = data?.data || [];
  const pagination = data?.pagination;

  const activeFilters = [status, priority, categoryId].filter(Boolean).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
          {pagination && (
            <p className="text-sm text-slate-400 mt-0.5">{pagination.total} tasks</p>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <span>+</span> New Task
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search tasks…"
            value={search}
            onChange={handleSearch}
            className="input pl-9"
            aria-label="Search tasks"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 relative ${activeFilters > 0 ? 'border-brand-300 dark:border-brand-700' : ''}`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="input w-auto py-2"
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
            className="btn-secondary px-3"
            aria-label={`Sort ${order === 'asc' ? 'descending' : 'ascending'}`}
            title={`Sort ${order === 'asc' ? 'descending' : 'ascending'}`}
          >
            <SortAsc size={16} className={order === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up">
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input" aria-label="Filter by status">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="input" aria-label="Filter by priority">
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="input" aria-label="Filter by category">
              <option value="">All Categories</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {activeFilters > 0 && (
            <div className="sm:col-span-3 flex justify-end">
              <button
                onClick={() => { setStatus(''); setPriority(''); setCategoryId(''); setPage(1); }}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={search || activeFilters ? '🔍' : '📋'}
          title={search || activeFilters ? 'No tasks found' : 'No active tasks'}
          description={
            search || activeFilters
              ? 'Try adjusting your search or filters.'
              : 'Create your first task to get started.'
          }
          action={
            !search && !activeFilters ? (
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                + Create Task
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {showCreate && <QuickCreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
