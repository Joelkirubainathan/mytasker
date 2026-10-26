import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag, X, Check } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories';
import { useCategories as useCategoriesData } from '../hooks/useCategories';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { Category } from '../types';
import { toast } from 'react-hot-toast';

const CATEGORY_ICONS = ['📁', '🎓', '💻', '🏠', '💼', '🚀', '📝', '⚡', '🎯', '🔬', '📚', '🎨', '🏋️', '🌟', '🔧', '💡', '📊', '🎵'];
const CATEGORY_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'move' | 'uncategorize' | null>(null);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [pendingDeleteData, setPendingDeleteData] = useState<{ id: string; taskCount: number } | null>(null);

  const [form, setForm] = useState({ name: '', icon: '📁', color: '#6366f1', description: '' });
  const [editForm, setEditForm] = useState<any>(null);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createCategory.mutateAsync(form);
    setForm({ name: '', icon: '📁', color: '#6366f1', description: '' });
    setShowCreate(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, icon: cat.icon, color: cat.color, description: cat.description || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    await updateCategory.mutateAsync({ id: editingId, ...editForm });
    setEditingId(null);
  };

  const handleDeleteAttempt = async (id: string) => {
    const result = await deleteCategory.mutateAsync({ id });
    if (result.requiresAction) {
      setPendingDeleteData({ id, taskCount: result.taskCount });
      setShowMoveDialog(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteData) return;
    const action = deleteAction || 'uncategorize';
    await deleteCategory.mutateAsync({
      id: pendingDeleteData.id,
      action,
      target_category_id: action === 'move' ? moveTargetId || undefined : undefined,
    });
    setShowMoveDialog(false);
    setPendingDeleteData(null);
    setDeleteAction(null);
    setMoveTargetId('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag size={22} className="text-brand-500" /> Categories
          </h1>
          <p className="text-sm text-slate-400 mt-1">Organize your tasks by category</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Category grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 skeleton h-28" />
          ))}
        </div>
      ) : categories?.length === 0 ? (
        <EmptyState
          icon={<Tag size={28} className="text-slate-300" />}
          title="No categories yet"
          description="Create categories to organize your tasks."
          action={<button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Category</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((cat) => (
            <div key={cat.id} className="card p-5 hover:shadow-card-hover transition-all group">
              {editingId === cat.id ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input flex-1"
                      placeholder="Category name"
                      autoFocus
                    />
                  </div>
                  <div>
                    <p className="label">Icon</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_ICONS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setEditForm({ ...editForm, icon })}
                          className={`w-8 h-8 rounded-lg text-lg hover:bg-slate-100 dark:hover:bg-[#2a2a3e] transition-colors ${
                            editForm.icon === icon ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditForm({ ...editForm, color })}
                          className={`w-6 h-6 rounded-full transition-all ${editForm.color === color ? 'ring-2 ring-offset-2 ring-brand-500' : ''}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 text-sm"><X size={14} /></button>
                    <button onClick={handleSaveEdit} className="btn-primary flex-1 text-sm"><Check size={14} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: cat.color + '20' }}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{cat.name}</h3>
                        <p className="text-xs text-slate-400">
                          {cat.task_count ?? 0} task{cat.task_count !== 1 ? 's' : ''}
                          {cat.completed_count ? ` · ${cat.completed_count} done` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a3e] text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Edit category"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAttempt(cat.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Delete category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  {(cat.task_count ?? 0) > 0 && (
                    <div>
                      <div className="h-1 bg-slate-100 dark:bg-[#2a2a3e] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full progress-bar"
                          style={{
                            width: `${((cat.completed_count ?? 0) / (cat.task_count ?? 1)) * 100}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Category" size="sm">
        <div className="px-6 pb-6 pt-4 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="e.g. College"
            />
          </div>
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setForm({ ...form, icon })}
                  className={`w-9 h-9 rounded-lg text-xl hover:bg-slate-100 dark:hover:bg-[#2a2a3e] transition-colors ${
                    form.icon === icon ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950' : ''
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === color ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || createCategory.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {createCategory.isPending && <LoadingSpinner size="sm" />} Create
            </button>
          </div>
        </div>
      </Modal>

      {/* Safe Delete Modal */}
      <Modal isOpen={showMoveDialog} onClose={() => setShowMoveDialog(false)} title="Delete Category" size="sm">
        <div className="px-6 pb-6 pt-4 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This category contains <strong>{pendingDeleteData?.taskCount}</strong> task(s).
            What should happen to them?
          </p>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#3a3a50] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e1e2e] transition-colors">
              <input
                type="radio" name="action" checked={deleteAction === 'uncategorize'}
                onChange={() => setDeleteAction('uncategorize')} className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Move to Uncategorized</p>
                <p className="text-xs text-slate-400">Tasks remain but lose their category</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#3a3a50] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e1e2e] transition-colors">
              <input
                type="radio" name="action" checked={deleteAction === 'move'}
                onChange={() => setDeleteAction('move')} className="mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Move to another category</p>
                {deleteAction === 'move' && (
                  <select
                    value={moveTargetId}
                    onChange={(e) => setMoveTargetId(e.target.value)}
                    className="input mt-2 text-sm"
                    aria-label="Target category"
                  >
                    <option value="">Select category…</option>
                    {categories?.filter((c) => c.id !== pendingDeleteData?.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowMoveDialog(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleConfirmDelete}
              disabled={!deleteAction || (deleteAction === 'move' && !moveTargetId) || deleteCategory.isPending}
              className="btn-danger flex-1 flex items-center justify-center gap-2"
            >
              {deleteCategory.isPending && <LoadingSpinner size="sm" />} Delete Category
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
