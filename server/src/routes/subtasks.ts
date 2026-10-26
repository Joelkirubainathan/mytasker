import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { recordActivity } from '../services/activityService';

const router = Router();
router.use(authenticate);

function recalcTaskProgress(taskId: string) {
  const db = getDb();
  const subtasks = db.prepare('SELECT is_completed FROM subtasks WHERE task_id = ?').all(taskId) as any[];
  if (subtasks.length === 0) return;

  const done = subtasks.filter((s: any) => s.is_completed).length;
  const progress = Math.round((done / subtasks.length) * 100);

  db.prepare('UPDATE tasks SET progress = ?, updated_at = ? WHERE id = ?').run(
    progress, new Date().toISOString(), taskId
  );
}

// GET subtasks for a task
router.get(['/tasks/:taskId/subtasks', '/tasks/:taskId', '/:taskId'], (req: AuthRequest, res) => {
  const db = getDb();
  // Ensure task belongs to user
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(req.params.taskId, req.userId);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(req.params.taskId);
  return res.json({ success: true, data: subtasks });
});

// POST subtask to a task
router.post(['/tasks/:taskId/subtasks', '/tasks/:taskId', '/:taskId'], [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Subtask title required'),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.taskId, req.userId) as any;
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const maxPos = db.prepare('SELECT MAX(position) as max FROM subtasks WHERE task_id = ?').get(req.params.taskId) as any;
  const position = (maxPos?.max ?? -1) + 1;

  const id = uuidv4();
  db.prepare('INSERT INTO subtasks (id, task_id, title, position) VALUES (?, ?, ?, ?)').run(
    id, req.params.taskId, req.body.title, position
  );

  recalcTaskProgress(req.params.taskId);
  await recordActivity(req.params.taskId, req.userId!, 'subtask_added', null, req.body.title);

  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
  const updatedTask = db.prepare('SELECT progress FROM tasks WHERE id = ?').get(req.params.taskId);
  return res.status(201).json({ success: true, data: { subtask, taskProgress: (updatedTask as any)?.progress } });
});

// PATCH /subtasks/:id
router.patch('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('is_completed').optional().isBoolean(),
], async (req: AuthRequest, res) => {
  const db = getDb();
  const subtask = db.prepare(`
    SELECT s.* FROM subtasks s
    JOIN tasks t ON s.task_id = t.id
    WHERE s.id = ? AND t.user_id = ?
  `).get(req.params.id, req.userId) as any;

  if (!subtask) return res.status(404).json({ success: false, message: 'Subtask not found' });

  const updates: string[] = [];
  const values: any[] = [];

  if (req.body.title !== undefined) { updates.push('title = ?'); values.push(req.body.title); }
  if (req.body.is_completed !== undefined) {
    updates.push('is_completed = ?');
    values.push(req.body.is_completed ? 1 : 0);
    if (req.body.is_completed) {
      updates.push('completed_at = ?');
      values.push(new Date().toISOString());
    } else {
      updates.push('completed_at = ?');
      values.push(null);
    }

    const action = req.body.is_completed ? 'subtask_completed' : 'subtask_reopened';
    await recordActivity(subtask.task_id, req.userId!, action, subtask.is_completed ? 'true' : 'false',
      req.body.is_completed ? 'true' : 'false', { subtask_title: subtask.title });
  }
  if (req.body.position !== undefined) { updates.push('position = ?'); values.push(req.body.position); }

  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

  values.push(req.params.id);
  db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  recalcTaskProgress(subtask.task_id);

  const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  const updatedTask = db.prepare('SELECT progress, status FROM tasks WHERE id = ?').get(subtask.task_id);
  return res.json({ success: true, data: { subtask: updated, taskProgress: (updatedTask as any)?.progress } });
});

// DELETE /subtasks/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  const db = getDb();
  const subtask = db.prepare(`
    SELECT s.* FROM subtasks s
    JOIN tasks t ON s.task_id = t.id
    WHERE s.id = ? AND t.user_id = ?
  `).get(req.params.id, req.userId) as any;

  if (!subtask) return res.status(404).json({ success: false, message: 'Subtask not found' });

  db.prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.id);
  recalcTaskProgress(subtask.task_id);

  await recordActivity(subtask.task_id, req.userId!, 'subtask_deleted', subtask.title, null);

  const updatedTask = db.prepare('SELECT progress FROM tasks WHERE id = ?').get(subtask.task_id);
  return res.json({ success: true, data: { taskProgress: (updatedTask as any)?.progress } });
});

export default router;
