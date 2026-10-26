import { Router } from 'express';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /analytics/dashboard
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const userId = req.userId;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const totalRow = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status != 'archived'").get(userId)) as any;
    const totalTasks = Number(totalRow?.c || 0);

    const completedRow = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed'").get(userId)) as any;
    const completedTasks = Number(completedRow?.c || 0);

    const inProgressRow = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'in_progress'").get(userId)) as any;
    const inProgressTasks = Number(inProgressRow?.c || 0);

    const notStartedRow = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'not_started'").get(userId)) as any;
    const notStarted = Number(notStartedRow?.c || 0);

    const overdueRow = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND due_date < ? AND status NOT IN ('completed','archived')").get(userId, today)) as any;
    const overdueTasks = Number(overdueRow?.c || 0);

    const dueSoonRow = (await db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE user_id = ? 
      AND due_date >= ? AND due_date <= date(?, '+3 days')
      AND status NOT IN ('completed','archived')
    `).get(userId, today, today)) as any;
    const dueSoon = Number(dueSoonRow?.c || 0);

    // Today's tasks
    const todaysTasks = await db.prepare(`
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
    const recentCompleted = await db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.status = 'completed'
      ORDER BY t.completed_at DESC LIMIT 5
    `).all(userId);

    // Upcoming tasks
    const upcomingTasks = await db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.due_date > ? 
      AND t.status NOT IN ('completed','archived')
      ORDER BY t.due_date ASC LIMIT 5
    `).all(userId, today);

    // Recent activity
    const recentActivity = await db.prepare(`
      SELECT a.*, t.title as task_title FROM task_activity a
      JOIN tasks t ON a.task_id = t.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC LIMIT 10
    `).all(userId);

    // Focus Now - priority task
    const focusTask = await db.prepare(`
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
    const todayTotalRow = (await db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND (due_date = ? OR start_date = ?)
    `).get(userId, today, today)) as any;
    const todayTotal = Number(todayTotalRow?.c || 0);

    const todayDoneRow = (await db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
    `).get(userId, today)) as any;
    const todayDone = Number(todayDoneRow?.c || 0);

    // Weekly completion
    const weeklyCompletion = await db.prepare(`
      SELECT DATE(completed_at) as date, COUNT(*) as count
      FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
      GROUP BY DATE(completed_at) ORDER BY date ASC
    `).all(userId, weekAgo);

    // Category breakdown
    const categoryBreakdown = await db.prepare(`
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
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard analytics' });
  }
});

// GET /analytics/productivity
router.get('/productivity', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const userId = req.userId;
    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const completionByDay = await db.prepare(`
      SELECT DATE(completed_at) as date, COUNT(*) as count
      FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
      GROUP BY DATE(completed_at) ORDER BY date ASC
    `).all(userId, since);

    const createdByDay = await db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM tasks WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at) ORDER BY date ASC
    `).all(userId, since);

    const totalCreatedRow = (await db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND created_at >= ?').get(userId, since)) as any;
    const totalCreated = Number(totalCreatedRow?.c || 0);

    const totalCompletedRow = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?").get(userId, since)) as any;
    const totalCompleted = Number(totalCompletedRow?.c || 0);

    const totalTimeRow = (await db.prepare('SELECT COALESCE(SUM(duration_minutes),0) as t FROM time_entries WHERE user_id = ? AND started_at >= ?').get(userId, since)) as any;
    const totalTimeMinutes = Number(totalTimeRow?.t || 0);

    const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

    const priorityBreakdown = await db.prepare(`
      SELECT priority, COUNT(*) as count FROM tasks
      WHERE user_id = ? AND created_at >= ?
      GROUP BY priority
    `).all(userId, since);

    const categoryStats = await db.prepare(`
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

    const avgCompletionTime = (await db.prepare(`
      SELECT AVG(
        CASE WHEN created_at IS NOT NULL AND completed_at IS NOT NULL
        THEN (julianday(completed_at) - julianday(created_at))
        END
      ) as avg_days
      FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
    `).get(userId, since)) as any;

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
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch productivity analytics' });
  }
});

export default router;
