import { Router } from 'express';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /analytics/dashboard
router.get('/dashboard', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.userId;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const totalTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status != 'archived'").get(userId) as any).c;
  const completedTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed'").get(userId) as any).c;
  const inProgressTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'in_progress'").get(userId) as any).c;
  const notStarted = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'not_started'").get(userId) as any).c;
  const overdueTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND due_date < ? AND status NOT IN ('completed','archived')").get(userId, today) as any).c;
  const dueSoon = (db.prepare(`
    SELECT COUNT(*) as c FROM tasks WHERE user_id = ? 
    AND due_date >= ? AND due_date <= date(?, '+3 days')
    AND status NOT IN ('completed','archived')
  `).get(userId, today, today) as any).c;

  // Today's tasks
  const todaysTasks = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND (
      t.due_date = ? OR t.start_date = ? OR 
      (t.status = 'in_progress' AND t.due_date >= ?)
    )
    AND t.status NOT IN ('completed','archived')
    ORDER BY t.due_date ASC, t.priority DESC
    LIMIT 10
  `).all(userId, today, today, today);

  // Recently completed
  const recentCompleted = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.status = 'completed'
    ORDER BY t.completed_at DESC LIMIT 5
  `).all(userId);

  // Upcoming tasks
  const upcomingTasks = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.due_date > ? 
    AND t.status NOT IN ('completed','archived')
    ORDER BY t.due_date ASC LIMIT 5
  `).all(userId, today);

  // Recent activity
  const recentActivity = db.prepare(`
    SELECT a.*, t.title as task_title FROM task_activity a
    JOIN tasks t ON a.task_id = t.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC LIMIT 10
  `).all(userId);

  // Focus Now - priority task
  const focusTask = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.status NOT IN ('completed','archived')
    ORDER BY 
      CASE WHEN t.due_date < ? THEN 0 ELSE 1 END,
      CASE WHEN t.due_date = ? THEN 0 ELSE 1 END,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      CASE t.status WHEN 'in_progress' THEN 0 ELSE 1 END,
      t.due_date ASC
    LIMIT 1
  `).get(userId, today, today);

  // Today progress
  const todayTotal = (db.prepare(`
    SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND (due_date = ? OR start_date = ?)
  `).get(userId, today, today) as any).c;
  const todayDone = (db.prepare(`
    SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
  `).get(userId, today) as any).c;

  // Weekly completion
  const weeklyCompletion = db.prepare(`
    SELECT DATE(completed_at) as date, COUNT(*) as count
    FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
    GROUP BY DATE(completed_at) ORDER BY date ASC
  `).all(userId, weekAgo);

  // Category breakdown
  const categoryBreakdown = db.prepare(`
    SELECT c.name, c.icon, c.color,
      COUNT(t.id) as total,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed
    FROM categories c
    LEFT JOIN tasks t ON c.id = t.category_id
    WHERE c.user_id = ?
    GROUP BY c.id ORDER BY total DESC LIMIT 6
  `).all(userId);

  return res.json({
    success: true,
    data: {
      stats: { totalTasks, completedTasks, inProgressTasks, notStarted, overdueTasks, dueSoon },
      todayProgress: { total: todayTotal, completed: todayDone, percentage: todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0 },
      todaysTasks,
      recentCompleted,
      upcomingTasks,
      recentActivity,
      focusTask: focusTask || null,
      weeklyCompletion,
      categoryBreakdown,
    },
  });
});

// GET /analytics/productivity
router.get('/productivity', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.userId;
  const { period = '30' } = req.query;
  const days = parseInt(period as string) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const completionByDay = db.prepare(`
    SELECT DATE(completed_at) as date, COUNT(*) as count
    FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
    GROUP BY DATE(completed_at) ORDER BY date ASC
  `).all(userId, since);

  const createdByDay = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM tasks WHERE user_id = ? AND created_at >= ?
    GROUP BY DATE(created_at) ORDER BY date ASC
  `).all(userId, since);

  const totalCreated = (db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND created_at >= ?').get(userId, since) as any).c;
  const totalCompleted = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?").get(userId, since) as any).c;
  const totalTimeMinutes = (db.prepare('SELECT COALESCE(SUM(duration_minutes),0) as t FROM time_entries WHERE user_id = ? AND started_at >= ?').get(userId, since) as any).t;

  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  const priorityBreakdown = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tasks
    WHERE user_id = ? AND created_at >= ?
    GROUP BY priority
  `).all(userId, since);

  const categoryStats = db.prepare(`
    SELECT c.name, c.color, c.icon,
      COUNT(t.id) as total,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
      COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(t.id), 0), 0) as completion_rate
    FROM categories c
    LEFT JOIN tasks t ON c.id = t.category_id AND t.created_at >= ?
    WHERE c.user_id = ?
    GROUP BY c.id HAVING total > 0
    ORDER BY total DESC
  `).all(since, userId);

  const avgCompletionTime = db.prepare(`
    SELECT AVG(
      CASE WHEN created_at IS NOT NULL AND completed_at IS NOT NULL
      THEN (julianday(completed_at) - julianday(created_at))
      END
    ) as avg_days
    FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
  `).get(userId, since) as any;

  return res.json({
    success: true,
    data: {
      summary: {
        totalCreated, totalCompleted, completionRate,
        totalTimeMinutes: Math.round(totalTimeMinutes),
        avgCompletionDays: avgCompletionTime?.avg_days ? Math.round(avgCompletionTime.avg_days * 10) / 10 : null,
      },
      completionByDay,
      createdByDay,
      priorityBreakdown,
      categoryStats,
    },
  });
});

export default router;
