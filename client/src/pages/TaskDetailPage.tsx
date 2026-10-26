import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, CheckCircle2, Clock, Calendar,
  Play, Pause, Square, Plus, X, Check, ChevronDown, Bell, Tag
} from 'lucide-react';
import { useTask, useUpdateTask, useCompleteTask, useDeleteTask, useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from '../hooks/useTasks';
import { useCategories } from '../hooks/useCategories';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { SkeletonText } from '../components/ui/Skeleton';
import { formatDate, formatDatetime, formatMinutes, timeAgo, isOverdue, ACTION_LABELS, cn } from '../utils/helpers';
import { Priority, TaskStatus, Subtask } from '../types';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading, error } = useTask(id);
  const { data: categories } = useCategories();

  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderTime, setReminderTime] = useState('');

  if (isLoading) return (
    <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="card p-6 space-y-4"><SkeletonText lines={4} /></div>
    </div>
  );

  if (error || !task) return (
    <div className="text-center py-20">
      <p className="text-slate-400 mb-4">Task not found</p>
      <button onClick={() => navigate('/tasks')} className="btn-primary">Back to Tasks</button>
    </div>
  );

  const overdue = isOverdue(task.due_date, task.status);
  const isCompleted = task.status === 'completed';

  const handleStartEdit = () => {
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      category_id: task.category_id || '',
      due_date: task.due_date || '',
      estimated_minutes: task.estimated_minutes || '',
      notes: task.notes || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    await updateTask.mutateAsync({
      id: task.id,
      ...editForm,
      estimated_minutes: editForm.estimated_minutes ? parseInt(editForm.estimated_minutes) : undefined,
      category_id: editForm.category_id || undefined,
      due_date: editForm.due_date || undefined,
    });
    setEditing(false);
    toast.success('Task updated');
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await createSubtask.mutateAsync({ taskId: task.id, title: newSubtask.trim() });
    setNewSubtask('');
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    await updateSubtask.mutateAsync({
      id: subtask.id,
      taskId: task.id,
      is_completed: !subtask.is_completed,
    });
  };

  const handleDeleteSubtask = async (subtask: Subtask) => {
    await deleteSubtask.mutateAsync({ id: subtask.id, taskId: task.id });
  };

  const handleTimerToggle = async () => {
    try {
      if (timerRunning) {
        await api.post(`/time/${task.id}/stop`);
        setTimerRunning(false);
        toast.success('Timer stopped');
      } else {
        await api.post(`/time/${task.id}/start`);
        setTimerRunning(true);
        toast.success('Timer started');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Timer error');
    }
  };

  const handleAddReminder = async () => {
    if (!reminderTime) return;
    try {
      await api.post('/reminders', { task_id: task.id, reminder_time: new Date(reminderTime).toISOString() });
      toast.success('Reminder set!');
      setShowReminderForm(false);
      setReminderTime('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to set reminder');
    }
  };

  const handleProgress = async (val: number) => {
    await updateTask.mutateAsync({ id: task.id, progress: val });
    if (val === 100) {
      toast('Progress at 100% — mark as complete?', {
        icon: '✅',
        duration: 4000,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-10">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <>
              <button onClick={handleStartEdit} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => completeTask.mutate({ id: task.id })}
                disabled={completeTask.isPending}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                {completeTask.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                Complete
              </button>
            </>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2"
            aria-label="Delete task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="card p-6 space-y-5">
        {editing ? (
          <div className="space-y-4">
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="input text-lg font-semibold"
              placeholder="Task title"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Priority</label>
                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="input">
                  {['low','medium','high','urgent'].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="input">
                  {['not_started','in_progress','paused','archived'].map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })} className="input">
                  <option value="">No category</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Estimated (minutes)</label>
                <input type="number" value={editForm.estimated_minutes} onChange={(e) => setEditForm({ ...editForm, estimated_minutes: e.target.value })} className="input" min={1} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input resize-none" rows={3} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="input resize-none" rows={2} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={updateTask.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {updateTask.isPending && <LoadingSpinner size="sm" />} Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Title */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className={cn('text-xl font-bold text-slate-900 dark:text-white leading-snug', isCompleted && 'line-through text-slate-400')}>
                  {task.title}
                </h1>
                {isCompleted && <CheckCircle2 size={22} className="text-green-500 flex-shrink-0" />}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                {task.category_name && (
                  <CategoryBadge name={task.category_name} icon={task.category_icon} color={task.category_color} />
                )}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {task.due_date && (
                <div className="bg-slate-50 dark:bg-[#1e1e2e] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Calendar size={12} /> Due Date</div>
                  <p className={cn('text-sm font-medium', overdue ? 'text-red-500' : 'text-slate-900 dark:text-white')}>
                    {formatDate(task.due_date)}{overdue ? ' (Overdue)' : ''}
                  </p>
                </div>
              )}
              {task.estimated_minutes && (
                <div className="bg-slate-50 dark:bg-[#1e1e2e] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Clock size={12} /> Estimated</div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{formatMinutes(task.estimated_minutes)}</p>
                </div>
              )}
              {task.actual_minutes ? (
                <div className="bg-slate-50 dark:bg-[#1e1e2e] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Clock size={12} /> Time Spent</div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{formatMinutes(task.actual_minutes)}</p>
                </div>
              ) : null}
              {task.completed_at && (
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-green-500 mb-1"><CheckCircle2 size={12} /> Completed</div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{formatDate(task.completed_at)}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Progress */}
      {!editing && !isCompleted && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Progress</h2>
            <span className="text-2xl font-bold text-brand-500">{task.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-[#2a2a3e] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full progress-bar"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          {!task.subtask_count && (
            <input
              type="range"
              min={0} max={100} step={5}
              value={task.progress}
              onChange={(e) => handleProgress(parseInt(e.target.value))}
              className="w-full accent-brand-500"
              aria-label="Task progress"
            />
          )}
        </div>
      )}

      {/* Timer */}
      {!isCompleted && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Time Tracking</h2>
              {task.actual_minutes ? (
                <p className="text-sm text-slate-400 mt-0.5">Total: {formatMinutes(task.actual_minutes)}</p>
              ) : null}
            </div>
            <button
              onClick={handleTimerToggle}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
                timerRunning
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
              )}
            >
              {timerRunning ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start</>}
            </button>
          </div>
        </div>
      )}

      {/* Subtasks / Checklist */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            Checklist
            {task.subtasks?.length ? (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
              </span>
            ) : null}
          </h2>
        </div>

        <div className="space-y-2 mb-4">
          {task.subtasks?.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-3 group p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e1e2e] transition-colors">
              <button
                onClick={() => handleToggleSubtask(subtask)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 checkbox-anim',
                  subtask.is_completed
                    ? 'bg-brand-500 border-brand-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-brand-400'
                )}
                aria-label={subtask.is_completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {subtask.is_completed && <Check size={11} className="text-white" strokeWidth={3} />}
              </button>
              <span className={cn('flex-1 text-sm', subtask.is_completed && 'line-through text-slate-400')}>
                {subtask.title}
              </span>
              <button
                onClick={() => handleDeleteSubtask(subtask)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-500 transition-all"
                aria-label="Delete subtask"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {!isCompleted && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
              placeholder="Add subtask…"
              className="input flex-1 text-sm"
              aria-label="New subtask"
            />
            <button onClick={handleAddSubtask} disabled={!newSubtask.trim() || createSubtask.isPending} className="btn-secondary px-3">
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Reminders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Reminders</h2>
          {!isCompleted && (
            <button onClick={() => setShowReminderForm(!showReminderForm)} className="btn-ghost text-sm flex items-center gap-1.5">
              <Bell size={14} /> Add
            </button>
          )}
        </div>
        {showReminderForm && (
          <div className="flex gap-2 mb-3 animate-slide-up">
            <input
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="input flex-1 text-sm"
              min={new Date().toISOString().slice(0, 16)}
              aria-label="Reminder time"
            />
            <button onClick={handleAddReminder} className="btn-primary text-sm px-3">Set</button>
          </div>
        )}
        {task.reminders?.length ? (
          <div className="space-y-2">
            {task.reminders.map((r) => (
              <div key={r.id} className={cn('flex items-center gap-2 text-sm', r.is_triggered && 'opacity-50')}>
                <Bell size={14} className={r.is_triggered ? 'text-slate-300' : 'text-brand-400'} />
                <span className="flex-1">{formatDatetime(r.reminder_time)}</span>
                {r.is_triggered && <span className="text-xs text-slate-400">Sent</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No reminders set</p>
        )}
      </div>

      {/* Notes */}
      {task.notes && (
        <div className="card p-5">
          <h2 className="section-title mb-3">Notes</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{task.notes}</p>
        </div>
      )}

      {/* Completion note */}
      {task.completion_note && (
        <div className="card p-5 border-green-200 dark:border-green-900">
          <h2 className="section-title mb-2 text-green-600 dark:text-green-400">Completion Note</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{task.completion_note}</p>
        </div>
      )}

      {/* Activity */}
      {task.activity && task.activity.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Activity</h2>
          <div className="space-y-3">
            {task.activity.map((act, i) => (
              <div key={act.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                  {i < task.activity!.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-[#2a2a3e] mt-1 min-h-4" />}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {ACTION_LABELS[act.action] || act.action}
                    {act.old_value && act.new_value && (
                      <span className="text-slate-400"> · {act.old_value} → {act.new_value}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{timeAgo(act.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { deleteTask.mutate(task.id); navigate('/tasks'); }}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteTask.isPending}
      />
    </div>
  );
}
