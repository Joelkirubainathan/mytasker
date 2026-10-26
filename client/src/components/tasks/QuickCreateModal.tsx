import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useCreateTask } from '../../hooks/useTasks';
import { useCategories } from '../../hooks/useCategories';
import { CreateTaskData, Priority, TaskStatus } from '../../types';

interface QuickCreateModalProps {
  onClose: () => void;
}

export default function QuickCreateModal({ onClose }: QuickCreateModalProps) {
  const { data: categories } = useCategories();
  const createTask = useCreateTask();

  const [form, setForm] = useState<CreateTaskData>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'not_started',
    category_id: '',
    due_date: '',
    estimated_minutes: undefined,
  });

  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [showMore, setShowMore] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    await createTask.mutateAsync({
      ...form,
      category_id: form.category_id || undefined,
      due_date: form.due_date || undefined,
      subtasks: subtasks.filter(Boolean).map((t) => ({ title: t })),
    });
    onClose();
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  const priorityColors: Record<Priority, string> = {
    low: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Task" size="md">
      <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
        {/* Title */}
        <div>
          <input
            autoFocus
            type="text"
            placeholder="Task title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input text-base font-medium"
            required
            maxLength={255}
            aria-label="Task title"
          />
        </div>

        {/* Priority selector */}
        <div>
          <label className="label">Priority</label>
          <div className="flex gap-2 flex-wrap">
            {priorities.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, priority: p })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  form.priority === p ? `${priorityColors[p]} ring-2 ring-offset-1 ring-current` : `${priorityColors[p]} opacity-60`
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Category + Due date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input"
              aria-label="Category"
            >
              <option value="">No category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="input"
              aria-label="Due date"
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        {/* Toggle more fields */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="text-xs text-brand-500 hover:text-brand-600 font-medium"
        >
          {showMore ? '− Less options' : '+ More options'}
        </button>

        {showMore && (
          <div className="space-y-4 animate-fade-in">
            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input resize-none"
                rows={3}
                placeholder="Add a description…"
                aria-label="Description"
              />
            </div>

            {/* Estimated time */}
            <div>
              <label className="label">Estimated Time (minutes)</label>
              <input
                type="number"
                value={form.estimated_minutes || ''}
                onChange={(e) => setForm({ ...form, estimated_minutes: parseInt(e.target.value) || undefined })}
                className="input"
                min={1}
                max={9999}
                placeholder="e.g. 60"
                aria-label="Estimated minutes"
              />
            </div>

            {/* Subtasks */}
            <div>
              <label className="label">Checklist / Subtasks</label>
              <div className="space-y-2">
                {subtasks.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex-shrink-0" />
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{st}</span>
                    <button
                      type="button"
                      onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                    placeholder="Add subtask…"
                    className="input flex-1"
                    aria-label="New subtask"
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="btn-secondary px-3"
                    aria-label="Add subtask"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="label">Reminder</label>
              <input
                type="datetime-local"
                value={form.reminder_time}
                onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
                className="input"
                aria-label="Reminder time"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.title.trim() || createTask.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {createTask.isPending ? <LoadingSpinner size="sm" /> : null}
            Create Task
          </button>
        </div>
      </form>
    </Modal>
  );
}
