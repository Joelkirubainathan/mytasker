import { Priority, TaskStatus } from '../../types';
import { PRIORITY_LABELS, STATUS_LABELS, PRIORITY_COLORS, STATUS_COLORS } from '../../utils/helpers';

interface BadgeProps {
  type: 'priority' | 'status';
  value: Priority | TaskStatus;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const dots: Record<Priority, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-slate-400',
  };

  return (
    <span className={`badge ${PRIORITY_COLORS[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[priority]}`} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`badge ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CategoryBadge({ name, icon, color }: { name: string; icon?: string; color?: string }) {
  return (
    <span
      className="badge text-white"
      style={{ backgroundColor: color || '#6366f1' }}
    >
      {icon && <span className="text-xs">{icon}</span>}
      {name}
    </span>
  );
}
