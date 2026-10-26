import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, History as HistoryIcon } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useCategories } from '../hooks/useCategories';
import TaskCard from '../components/tasks/TaskCard';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTasks({
    history: true,
    search: search || undefined,
    category_id: categoryId || undefined,
    status: status || undefined,
    sort: 'completed_at',
    order: 'desc',
    page,
    limit: 20,
  });
  const { data: categories } = useCategories();

  const tasks = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HistoryIcon size={22} className="text-brand-500" /> Task History
        </h1>
        <p className="text-sm text-slate-400 mt-1">All completed and archived tasks are preserved here</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search completed tasks…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
            aria-label="Search history"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-auto"
          aria-label="Filter by status"
        >
          <option value="">All (Completed + Archived)</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className="input w-auto"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={28} className="text-slate-300" />}
          title={search || categoryId ? 'No matching history' : "You haven't completed any tasks yet"}
          description={search || categoryId
            ? 'Try adjusting your search or filters.'
            : 'Completed tasks will appear here for future reference.'}
        />
      ) : (
        <>
          <div className="text-sm text-slate-400">{pagination?.total} task{pagination?.total !== 1 ? 's' : ''} in history</div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
              <span className="text-sm text-slate-500">Page {page} of {pagination.pages}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-secondary text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
