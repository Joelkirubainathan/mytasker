import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// POST /time/:taskId/start
router.post('/:taskId/start', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const task = await db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(req.params.taskId, req.userId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Check if there's an active session
    const active = await db.prepare("SELECT id FROM time_entries WHERE task_id = ? AND user_id = ? AND ended_at IS NULL").get(req.params.taskId, req.userId);
    if (active) return res.status(400).json({ success: false, message: 'Timer already running for this task' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db.prepare('INSERT INTO time_entries (id, task_id, user_id, started_at) VALUES (?, ?, ?, ?)').run(id, req.params.taskId, req.userId, now);

    // Update task status to in_progress
    await db.prepare("UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'not_started'").run(now, req.params.taskId);

    const entry = await db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to start timer' });
  }
});

// POST /time/:taskId/stop
router.post('/:taskId/stop', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const active = (await db.prepare("SELECT * FROM time_entries WHERE task_id = ? AND user_id = ? AND ended_at IS NULL").get(req.params.taskId, req.userId)) as any;
    if (!active) return res.status(400).json({ success: false, message: 'No active timer for this task' });

    const now = new Date().toISOString();
    const duration = (Date.now() - new Date(active.started_at).getTime()) / 60000;

    await db.prepare('UPDATE time_entries SET ended_at = ?, duration_minutes = ? WHERE id = ?').run(now, duration, active.id);

    // Update task's actual_minutes
    const sumRow = (await db.prepare('SELECT COALESCE(SUM(duration_minutes),0) as t FROM time_entries WHERE task_id = ?').get(req.params.taskId)) as any;
    const totalMinutes = Number(sumRow?.t || 0);
    await db.prepare('UPDATE tasks SET actual_minutes = ?, updated_at = ? WHERE id = ?').run(Math.round(totalMinutes), now, req.params.taskId);

    const entry = await db.prepare('SELECT * FROM time_entries WHERE id = ?').get(active.id);
    return res.json({ success: true, data: entry, totalMinutes: Math.round(totalMinutes) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to stop timer' });
  }
});

// GET /time/:taskId
router.get('/:taskId', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const task = await db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(req.params.taskId, req.userId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const entries = (await db.prepare('SELECT * FROM time_entries WHERE task_id = ? ORDER BY started_at DESC').all(req.params.taskId)) as any[];
    const active = entries.find((e: any) => !e.ended_at);
    const sumRow = (await db.prepare('SELECT COALESCE(SUM(duration_minutes),0) as t FROM time_entries WHERE task_id = ?').get(req.params.taskId)) as any;
    const total = Number(sumRow?.t || 0);

    return res.json({ success: true, data: { entries, activeEntry: active || null, totalMinutes: Math.round(total) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch time entries' });
  }
});

export default router;
