import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, Circle, MoreHorizontal, Pencil, Trash2, Play, Pause, Archive } from 'lucide-react';
import { Task } from '../../types';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../ui/Badge';
import { formatDate, isOverdue, formatMinutes, cn } from '../../utils/helpers';
import { useCompleteTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import ConfirmDialog from '../ui/ConfirmDialog';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  compact?: boolean;
}

export default function TaskCard({ task, onEdit, compact = false }: TaskCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);

  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const overdue = isOverdue(task.due_date, task.status);
  const isCompleted = task.status === 'completed';

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted || completing) return;
    setCompleting(true);
    try {
      await completeTask.mutateAsync({ id: task.id });
    } finally {
      setCompleting(false);
    }
  };

  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = task.status === 'in_progress' ? 'paused' : 'in_progress';
    updateTask.mutate({ id: task.id, status: nextStatus });
    setShowMenu(false);
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id);
    setShowDeleteConfirm(false);
  };

  const progress = task.progress;

  return (
    <>
      <div
        onClick={() => navigate(`/tasks/${task.id}`)}
        className={cn(
          'card p-4 hover:shadow-card-hover transition-all duration-200 cursor-pointer group',
          'hover:border-brand-200 dark:hover:border-brand-800',
          isCompleted && 'opacity-70',
          compact && 'p-3'
        )}
        role="article"
        aria-label={`Task: ${task.title}`}
      >
        <div className="flex items-start gap-3">
          {/* Complete checkbox */}
          <button
            onClick={handleComplete}
            disabled={isCompleted || completing}
            className={cn(
              'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 checkbox-anim',
              isCompleted
                ? 'bg-green-500 border-green-500'
                : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'
            )}
            aria-label={isCompleted ? 'Task completed' : 'Mark as complete'}
          >
            {isCompleted && <CheckCircle2 size={14} className="text-white" />}
            {!isCompleted && completing && <div className="w-2.5 h-2.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn(
                'text-sm font-medium text-slate-900 dark:text-white line-clamp-2 leading-snug',
                isCompleted && 'line-through text-slate-400 dark:text-slate-500'
              )}>
                {task.title}
              </h3>

              {/* Actions menu */}
              <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-400 transition-all"
                  aria-label="Task options"
                >
                  <MoreHorizontal size={16} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 card shadow-card-hover z-10 p-1 animate-scale-in">
                    {onEdit && (
                      <button
                        onClick={() => { onEdit(task); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-[#2a2a3e] text-slate-700 dark:text-slate-300"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                    {!isCompleted && (
                      <>
                        <button
                          onClick={handleStatusToggle}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-[#2a2a3e] text-slate-700 dark:text-slate-300"
                        >
                          {task.status === 'in_progress' ? <Pause size={14} /> : <Play size={14} />}
                          {task.status === 'in_progress' ? 'Pause' : 'Start'}
                        </button>
                        <button
                          onClick={() => { updateTask.mutate({ id: task.id, status: 'archived' }); setShowMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-[#2a2a3e] text-slate-700 dark:text-slate-300"
                        >
                          <Archive size={14} /> Archive
                        </button>
                      </>
                    )}
                    <div className="border-t border-slate-100 dark:border-[#2a2a3e] my-1" />
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Meta row */}
            {!compact && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                {task.category_name && (
                  <CategoryBadge name={task.category_name} icon={task.category_icon} color={task.category_color} />
                )}
              </div>
            )}

            {/* Progress bar */}
            {progress > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">
                    {task.subtask_count ? `${task.subtask_done}/${task.subtask_count} subtasks` : 'Progress'}
                  </span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-[#2a2a3e] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full progress-bar',
                      isCompleted ? 'bg-green-500' : 'bg-brand-500'
                    )}
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-400">
              {task.due_date && (
                <span className={cn('flex items-center gap-1', overdue && 'text-red-500 dark:text-red-400 font-medium')}>
                  <Calendar size={11} />
                  {overdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
                </span>
              )}
              {task.estimated_minutes && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {formatMinutes(task.estimated_minutes)}
                </span>
              )}
              {task.reminder_count ? (
                <span className="flex items-center gap-1 text-brand-500">
                  <span className="text-[10px]">⏰</span>
                  {task.reminder_count}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteTask.isPending}
      />
    </>
  );
}
