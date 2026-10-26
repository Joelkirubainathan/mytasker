import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /reminders (for a task or all)
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const { task_id } = req.query;

  let query = `
    SELECT r.*, t.title as task_title FROM reminders r
    JOIN tasks t ON r.task_id = t.id
    WHERE r.user_id = ?
  `;
  const params: any[] = [req.userId];

  if (task_id) { query += ' AND r.task_id = ?'; params.push(task_id); }

  query += ' ORDER BY r.reminder_time ASC';
  const reminders = db.prepare(query).all(...params);
  return res.json({ success: true, data: reminders });
});

// POST /reminders
router.post('/', [
  body('task_id').isString().notEmpty(),
  body('reminder_time').isISO8601().withMessage('Valid datetime required'),
], (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  const db = getDb();
  const { task_id, reminder_time, label } = req.body;

  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(task_id, req.userId);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const id = uuidv4();
  db.prepare('INSERT INTO reminders (id, task_id, user_id, reminder_time, label) VALUES (?, ?, ?, ?, ?)').run(
    id, task_id, req.userId, reminder_time, label || null
  );

  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  return res.status(201).json({ success: true, data: reminder });
});

// DELETE /reminders/:id
router.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const reminder = db.prepare('SELECT id FROM reminders WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });

  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

export default router;
