import { Router } from 'express';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /activity?task_id=...
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const { task_id, limit = '30' } = req.query;

  let query = `
    SELECT a.*, t.title as task_title FROM task_activity a
    JOIN tasks t ON a.task_id = t.id
    WHERE a.user_id = ?
  `;
  const params: any[] = [req.userId];

  if (task_id) { query += ' AND a.task_id = ?'; params.push(task_id); }
  query += ` ORDER BY a.created_at DESC LIMIT ${Math.min(parseInt(limit as string) || 30, 100)}`;

  const activity = db.prepare(query).all(...params);
  return res.json({ success: true, data: activity });
});

export default router;
