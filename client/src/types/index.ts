export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'archived';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  timezone?: string;
  notification_settings?: NotificationSettings;
  created_at: string;
}

export interface NotificationSettings {
  taskReminders: boolean;
  dueDateReminders: boolean;
  overdueNotifications: boolean;
  recurringReminders: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  task_count?: number;
  completed_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  completed_at?: string;
}

export interface Reminder {
  id: string;
  task_id: string;
  user_id: string;
  reminder_time: string;
  label?: string;
  is_triggered: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  note?: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  metadata?: string;
  task_title?: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  category_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  progress: number;
  start_date?: string;
  due_date?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  completion_note?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  archived_at?: string;
  // Joined fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  subtask_count?: number;
  subtask_done?: number;
  reminder_count?: number;
  // Loaded separately
  subtasks?: Subtask[];
  reminders?: Reminder[];
  time_entries?: TimeEntry[];
  activity?: TaskActivity[];
}

export interface Notification {
  id: string;
  user_id: string;
  task_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStarted: number;
  overdueTasks: number;
  dueSoon: number;
}

export interface DashboardData {
  stats: DashboardStats;
  todayProgress: { total: number; completed: number; percentage: number };
  todaysTasks: Task[];
  recentCompleted: Task[];
  upcomingTasks: Task[];
  recentActivity: TaskActivity[];
  focusTask: Task | null;
  weeklyCompletion: { date: string; count: number }[];
  categoryBreakdown: { name: string; icon: string; color: string; total: number; completed: number }[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  category_id?: string;
  priority?: Priority;
  status?: TaskStatus;
  progress?: number;
  start_date?: string;
  due_date?: string;
  estimated_minutes?: number;
  notes?: string;
  subtasks?: { title: string }[];
  reminder_time?: string;
  reminder_label?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedTasks {
  data: Task[];
  pagination: Pagination;
}
