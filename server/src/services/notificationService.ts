import { getDb } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export async function createNotification(
  userId: string,
  taskId: string | null,
  type: string,
  title: string,
  message: string
): Promise<void> {
  try {
    const db = getDb();
    await db.prepare(`
      INSERT INTO notifications (id, user_id, task_id, type, title, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, taskId, type, title, message);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
