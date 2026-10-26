import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { recordActivity } from '../services/activityService';
import { createNotification } from '../services/notificationService';

const router = Router();
router.use(authenticate);

function calcProgress(taskId: string): number {
  const db = getDb();
  const subtasks = db.prepare('SELECT is_completed FROM subtasks WHERE task_id = ?').all(taskId) as any[];
  if (subtasks.length === 0) return -1; // No subtasks, use manual
  const done = subtasks.filter((s: any) => s.is_completed).length;
  return Math.round((done / subtasks.length) * 100);
}

// GET /tasks
router.get('/', [
  query('status').optional().isIn(['not_started', 'in_progress', 'paused', 'completed', 'archived']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('category_id').optional().isString(),
  query('search').optional().isString(),
  query('sort').optional().isIn(['due_date', 'priority', 'created_at', 'updated_at', 'progress', 'title']),
  query('order').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('history').optional().isBoolean(),
], (req: AuthRequest, res) => {
  const db = getDb();
  const {
    status, priority, category_id, search,
    sort = 'created_at', order = 'desc',
    page = '1', limit = '50', history
  } = req.query as any;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = 'WHERE t.user_id = ?';
  const params: any[] = [req.userId];

  if (history === 'true') {
    whereClause += " AND t.status IN ('completed', 'archived')";
  } else if (!status) {
    whereClause += " AND t.status NOT IN ('completed', 'archived')";
  }

  if (status) { whereClause += ` AND t.status = ?`; params.push(status); }
  if (priority) { whereClause += ` AND t.priority = ?`; params.push(priority); }
  if (category_id) { whereClause += ` AND t.category_id = ?`; params.push(category_id); }
  if (search) { whereClause += ` AND (t.title LIKE ? OR t.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }

  const priorityOrder = "CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END";
  let orderClause = '';
  switch (sort) {
    case 'priority': orderClause = `${priorityOrder} ${order.toUpperCase()}`; break;
    case 'due_date': orderClause = `t.due_date IS NULL, t.due_date ${order.toUpperCase()}`; break;
    default: orderClause = `t.${sort} ${order.toUpperCase()}`;
  }

  const countResult = db.prepare(`SELECT COUNT(*) as total FROM tasks t ${whereClause}`).get(...params) as any;
  const total = countResult.total;

  const tasks = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
      (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id AND is_completed = 1) as subtask_done,
      (SELECT COUNT(*) FROM reminders WHERE task_id = t.id AND is_triggered = 0) as reminder_count
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  return res.json({
    success: true,
    data: tasks,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
});

// GET /tasks/:id
router.get('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ? AND t.user_id = ?
  `).get(req.params.id, req.userId) as any;

  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(task.id);
  const reminders = db.prepare('SELECT * FROM reminders WHERE task_id = ? ORDER BY reminder_time ASC').all(task.id);
  const timeEntries = db.prepare('SELECT * FROM time_entries WHERE task_id = ? ORDER BY started_at DESC').all(task.id);
  const activity = db.prepare('SELECT * FROM task_activity WHERE task_id = ? ORDER BY created_at DESC LIMIT 50').all(task.id);

  return res.json({ success: true, data: { ...task, subtasks, reminders, time_entries: timeEntries, activity } });
});

// POST /tasks
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['not_started', 'in_progress', 'paused']),
  body('progress').optional().isInt({ min: 0, max: 100 }),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  const db = getDb();
  const id = uuidv4();
  const {
    title, description, category_id, priority = 'medium', status = 'not_started',
    progress = 0, start_date, due_date, estimated_minutes, notes,
    subtasks: subtaskItems,
  } = req.body;

  try {
    // Validate category belongs to user
    if (category_id) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, req.userId);
      if (!cat) return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    db.prepare(`
      INSERT INTO tasks (id, user_id, category_id, title, description, priority, status, progress, start_date, due_date, estimated_minutes, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, category_id || null, title, description || null, priority, status, progress,
      start_date || null, due_date || null, estimated_minutes || null, notes || null);

    // Create subtasks if provided
    if (subtaskItems?.length) {
      const stStmt = db.prepare('INSERT INTO subtasks (id, task_id, title, position) VALUES (?, ?, ?, ?)');
      subtaskItems.forEach((st: any, i: number) => {
        stStmt.run(uuidv4(), id, st.title, i);
      });
    }

    // Create reminder if provided
    if (req.body.reminder_time) {
      db.prepare('INSERT INTO reminders (id, task_id, user_id, reminder_time, label) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(), id, req.userId, req.body.reminder_time, req.body.reminder_label || null
      );
    }

    await recordActivity(id, req.userId!, 'task_created', null, title, { title, priority, status });

    const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);
    const subs = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position').all(id);

    return res.status(201).json({ success: true, data: { ...task as any, subtasks: subs } });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});

// PATCH /tasks/:id
router.patch('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['not_started', 'in_progress', 'paused', 'completed', 'archived']),
  body('progress').optional().isInt({ min: 0, max: 100 }),
], async (req: AuthRequest, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

  const allowed = ['title', 'description', 'category_id', 'priority', 'status', 'progress',
    'start_date', 'due_date', 'estimated_minutes', 'notes', 'completion_note'];
  const updates: string[] = [];
  const values: any[] = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      // Validate category
      if (field === 'category_id' && req.body[field]) {
        const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(req.body[field], req.userId);
        if (!cat) return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      updates.push(`${field} = ?`);
      values.push(req.body[field]);

      // Record changes
      if (['status', 'priority', 'progress'].includes(field) && String(existing[field]) !== String(req.body[field])) {
        await recordActivity(req.params.id, req.userId!, `${field}_changed`, String(existing[field]), String(req.body[field]));
      }
    }
  }

  // Handle completion
  if (req.body.status === 'completed' && existing.status !== 'completed') {
    updates.push('completed_at = ?');
    values.push(new Date().toISOString());
    updates.push('progress = ?');
    values.push(100);
    await recordActivity(req.params.id, req.userId!, 'task_completed', null, 'completed');
    await createNotification(req.userId!, req.params.id, 'task_completed', '✅ Task Completed', `"${existing.title}" has been completed!`);
  }

  if (req.body.status === 'archived' && existing.status !== 'archived') {
    updates.push('archived_at = ?');
    values.push(new Date().toISOString());
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(req.params.id);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM tasks t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?
  `).get(req.params.id);
  const subs = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position').all(req.params.id);

  return res.json({ success: true, data: { ...updated as any, subtasks: subs } });
});

// POST /tasks/:id/complete
router.post('/:id/complete', async (req: AuthRequest, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
  if (task.status === 'completed') return res.status(400).json({ success: false, message: 'Task already completed' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE tasks SET status = 'completed', progress = 100, completed_at = ?, updated_at = ? WHERE id = ?
  `).run(now, now, req.params.id);

  if (req.body.completion_note) {
    db.prepare('UPDATE tasks SET completion_note = ? WHERE id = ?').run(req.body.completion_note, req.params.id);
  }

  await recordActivity(req.params.id, req.userId!, 'task_completed', task.status, 'completed');
  await createNotification(req.userId!, req.params.id, 'task_completed', '✅ Task Completed', `"${task.title}" has been marked as complete!`);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  return res.json({ success: true, data: updated });
});

// DELETE /tasks/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  return res.json({ success: true, message: 'Task deleted' });
});

export default router;
