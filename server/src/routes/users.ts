import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// PATCH /users/profile
router.patch('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('timezone').optional().isString(),
], (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  const db = getDb();
  const { name, timezone, avatar } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (name) { updates.push('name = ?'); values.push(name); }
  if (timezone) { updates.push('timezone = ?'); values.push(timezone); }
  if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }

  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(req.userId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const user = db.prepare('SELECT id, name, email, avatar, timezone, notification_settings, created_at FROM users WHERE id = ?').get(req.userId) as any;

  try { user.notification_settings = JSON.parse(user.notification_settings || '{}'); } catch { /* ignore */ }

  return res.json({ success: true, data: user });
});

// PATCH /users/password
router.patch('/password', [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;

  const valid = await bcrypt.compare(req.body.current_password, user.password_hash);
  if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

  const hash = await bcrypt.hash(req.body.new_password, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, new Date().toISOString(), req.userId);

  return res.json({ success: true, message: 'Password updated successfully' });
});

// PATCH /users/notification-settings
router.patch('/notification-settings', (req: AuthRequest, res) => {
  const db = getDb();
  const settings = JSON.stringify(req.body);
  db.prepare('UPDATE users SET notification_settings = ?, updated_at = ? WHERE id = ?').run(settings, new Date().toISOString(), req.userId);
  return res.json({ success: true, message: 'Notification settings updated' });
});

// DELETE /users/account
router.delete('/account', async (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;

  if (req.body.password) {
    const valid = await bcrypt.compare(req.body.password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
  return res.json({ success: true, message: 'Account deleted' });
});

// GET /users/export
router.get('/export', (req: AuthRequest, res) => {
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.userId);
  const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(req.userId);
  const subtasks = db.prepare(`
    SELECT s.* FROM subtasks s JOIN tasks t ON s.task_id = t.id WHERE t.user_id = ?
  `).all(req.userId);

  const format = req.query.format || 'json';

  if (format === 'csv') {
    const headers = 'id,title,status,priority,progress,due_date,completed_at,created_at\n';
    const rows = tasks.map((t: any) =>
      `"${t.id}","${t.title}","${t.status}","${t.priority}","${t.progress}","${t.due_date || ''}","${t.completed_at || ''}","${t.created_at}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=mytasker-export.csv');
    return res.send(headers + rows);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=mytasker-export.json');
  return res.json({ tasks, categories, subtasks, exported_at: new Date().toISOString() });
});

export default router;
