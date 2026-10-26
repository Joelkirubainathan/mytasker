import { Priority, TaskStatus } from '../types';
import { format, isToday, isTomorrow, isPast, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDatetime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy • h:mm a');
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function isOverdue(dateStr: string | undefined | null, status: TaskStatus): boolean {
  if (!dateStr || status === 'completed' || status === 'archived') return false;
  try {
    return isPast(parseISO(dateStr + 'T23:59:59'));
  } catch {
    return false;
  }
}

export function formatMinutes(minutes: number | undefined | null): string {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: 'status-not_started',
  in_progress: 'status-in_progress',
  paused: 'status-paused',
  completed: 'status-completed',
  archived: 'status-archived',
};

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 17) return '⚡';
  if (hour < 21) return '🌆';
  return '🌙';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

export const ACTION_LABELS: Record<string, string> = {
  task_created: 'Task created',
  task_completed: 'Task completed',
  status_changed: 'Status changed',
  priority_changed: 'Priority changed',
  progress_changed: 'Progress updated',
  subtask_added: 'Subtask added',
  subtask_completed: 'Subtask completed',
  subtask_reopened: 'Subtask reopened',
  subtask_deleted: 'Subtask deleted',
  category_changed: 'Category changed',
};
