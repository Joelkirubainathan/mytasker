import cron from 'node-cron';
import { getDb } from '../database/db';
import { createNotification } from './notificationService';

export function startReminderCron() {
  // Run every minute
  cron.schedule('* * * * *', () => {
    checkReminders();
    checkOverdueTasks();
  });

  // Cleanup old notifications daily at midnight
  cron.schedule('0 0 * * *', () => {
    cleanupOldNotifications();
  });
}

function isInQuietHours(settings: any): boolean {
  if (!settings?.quietHoursEnabled) return false;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const start = settings.quietHoursStart || '22:00';
  const end = settings.quietHoursEnd || '07:00';

  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  } else {
    return currentTime >= start || currentTime <= end;
  }
}

async function checkReminders() {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const pending = (await db.prepare(`
      SELECT r.*, t.title as task_title, t.user_id, u.notification_settings
      FROM reminders r
      JOIN tasks t ON r.task_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE r.is_triggered = 0 AND r.reminder_time <= ?
      AND t.status NOT IN ('completed', 'archived')
    `).all(now)) as any[];

    for (const reminder of pending) {
      let settings: any = {};
      try { settings = JSON.parse(reminder.notification_settings || '{}'); } catch { /* */ }

      if (!settings.taskReminders) {
        await db.prepare('UPDATE reminders SET is_triggered = 1 WHERE id = ?').run(reminder.id);
        continue;
      }

      if (isInQuietHours(settings)) continue;

      await createNotification(
        reminder.user_id,
        reminder.task_id,
        'reminder',
        `⏰ Reminder: ${reminder.task_title}`,
        reminder.label || `Don't forget: ${reminder.task_title}`
      );

      await db.prepare('UPDATE reminders SET is_triggered = 1 WHERE id = ?').run(reminder.id);
    }
  } catch (error) {
    console.error('Reminder check error:', error);
  }
}

async function checkOverdueTasks() {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    // Find newly overdue tasks that haven't been notified today
    const overdue = (await db.prepare(`
      SELECT t.id, t.title, t.user_id, t.due_date, u.notification_settings
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.due_date < ? AND t.status NOT IN ('completed','archived')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.task_id = t.id AND n.type = 'overdue' AND DATE(n.created_at) = ?
      )
    `).all(today, today)) as any[];

    for (const task of overdue) {
      let settings: any = {};
      try { settings = JSON.parse(task.notification_settings || '{}'); } catch { /* */ }
      if (!settings.overdueNotifications) continue;
      if (isInQuietHours(settings)) continue;

      await createNotification(
        task.user_id,
        task.id,
        'overdue',
        `⚠️ Task Overdue: ${task.title}`,
        `"${task.title}" was due on ${task.due_date} and is now overdue.`
      );
    }
  } catch (error) {
    console.error('Overdue check error:', error);
  }
}

async function cleanupOldNotifications() {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare('DELETE FROM notifications WHERE created_at < ? AND is_read = 1').run(cutoff);
    await db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(new Date().toISOString());
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
