import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', variant = 'danger', isLoading
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="px-6 py-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
          variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
        }`}>
          {variant === 'danger'
            ? <Trash2 size={22} className="text-red-600 dark:text-red-400" />
            : <AlertTriangle size={22} className="text-yellow-600 dark:text-yellow-400" />
          }
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white transition-all disabled:opacity-50 ${
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
