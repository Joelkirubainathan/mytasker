import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export async function recordActivity(
  taskId: string,
  userId: string,
  action: string,
  oldValue: string | null,
  newValue: string | null,
  metadata?: object
): Promise<void> {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO task_activity (id, task_id, user_id, action, old_value, new_value, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), taskId, userId, action,
      oldValue, newValue,
      metadata ? JSON.stringify(metadata) : null
    );
  } catch (error) {
    console.error('Failed to record activity:', error);
  }
}
