import { Router } from 'express';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /notifications
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const { unread_only } = req.query;

  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params: any[] = [req.userId];

  if (unread_only === 'true') { query += ' AND is_read = 0'; }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const notifications = db.prepare(query).all(...params);
  const unreadCount = (db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.userId) as any).count;

  return res.json({ success: true, data: notifications, unreadCount });
});

// PATCH /notifications/:id/read
router.patch('/:id/read', (req: AuthRequest, res) => {
  const db = getDb();
  const notification = db.prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// POST /notifications/read-all
router.post('/read-all', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.userId);
  return res.json({ success: true, message: 'All notifications marked as read' });
});

// DELETE /notifications/:id
router.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  return res.json({ success: true });
});

export default router;
