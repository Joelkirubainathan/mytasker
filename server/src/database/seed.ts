import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, getDb } from './db';

export async function seedDatabase(shouldExit: boolean = false) {
  console.log('🌱 Seeding database...');
  try {
    const db = getDb();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@mytasker.app') as any;
    if (existing) {
      console.log('⚠️ Demo user already exists. Cleaning existing data for demo user...');
      db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Create Demo User
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, timezone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'Alex Morgan', 'demo@mytasker.app', passwordHash, 'America/New_York', nowIso, nowIso);

    // 2. Default Categories
    const categories = [
      { id: uuidv4(), name: 'Work & Projects', icon: '💼', color: '#6366f1', description: 'Core deliverables and project tasks' },
      { id: uuidv4(), name: 'Personal & Health', icon: '🧘', color: '#10b981', description: 'Self care, workouts, and personal habits' },
      { id: uuidv4(), name: 'Learning & Growth', icon: '📚', color: '#f59e0b', description: 'Books, courses, and skill building' },
      { id: uuidv4(), name: 'Finance & Admin', icon: '💳', color: '#06b6d4', description: 'Bills, budgeting, taxes, and paperwork' },
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of categories) {
      insertCat.run(c.id, userId, c.name, c.icon, c.color, c.description, nowIso, nowIso);
    }

    // 3. Sample Tasks with Subtasks and Activities
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const insertTask = db.prepare(`
      INSERT INTO tasks (
        id, user_id, category_id, title, description, status, priority, progress,
        start_date, due_date, estimated_minutes, actual_minutes, notes, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSubtask = db.prepare(`
      INSERT INTO subtasks (id, task_id, title, is_completed, position, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertActivity = db.prepare(`
      INSERT INTO task_activity (id, task_id, user_id, action, old_value, new_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Task 1: In Progress
    const task1Id = uuidv4();
    insertTask.run(
      task1Id, userId, categories[0].id,
      'Finalize Q4 Product Roadmap & Launch Plan',
      'Align with design and engineering leads on key milestones and resource allocation for upcoming sprints.',
      'in_progress', 'high', 60,
      yesterday, tomorrow, 180, 110,
      'Remember to include cross-functional QA buffers before final code freeze.',
      yesterday, nowIso, null
    );

    const t1Subtasks = [
      { title: 'Draft core epic breakdown', done: 1 },
      { title: 'Review mockups with UX designer', done: 1 },
      { title: 'Estimate story points with tech leads', done: 1 },
      { title: 'Present roadmap deck to leadership', done: 0 },
      { title: 'Publish finalized schedule in Notion', done: 0 },
    ];
    t1Subtasks.forEach((st, idx) => {
      insertSubtask.run(uuidv4(), task1Id, st.title, st.done, idx, yesterday, st.done ? yesterday : null);
    });

    insertActivity.run(uuidv4(), task1Id, userId, 'created', null, 'Finalize Q4 Product Roadmap & Launch Plan', null, yesterday);
    insertActivity.run(uuidv4(), task1Id, userId, 'status_changed', 'not_started', 'in_progress', null, yesterday);

    // Task 2: Urgent Not Started
    const task2Id = uuidv4();
    insertTask.run(
      task2Id, userId, categories[3].id,
      'Review and Submit Quarterly Tax Estimates',
      'Consolidate invoices, verify business expenses, and submit payment via accountant portal.',
      'not_started', 'urgent', 0,
      nowIso, tomorrow, 90, 0,
      'Check CPA email for updated payment instructions.',
      nowIso, nowIso, null
    );

    const t2Subtasks = [
      { title: 'Download bank statements for past 3 months', done: 0 },
      { title: 'Categorize pending receipts in Quickbooks', done: 0 },
      { title: 'Authorize tax accountant transmission', done: 0 },
    ];
    t2Subtasks.forEach((st, idx) => {
      insertSubtask.run(uuidv4(), task2Id, st.title, st.done, idx, nowIso, null);
    });
    insertActivity.run(uuidv4(), task2Id, userId, 'created', null, 'Review and Submit Quarterly Tax Estimates', null, nowIso);

    // Task 3: Completed Task
    const task3Id = uuidv4();
    insertTask.run(
      task3Id, userId, categories[1].id,
      'Complete 5K Morning Endurance Run',
      'Outdoor cadence training along the lake loop path.',
      'completed', 'medium', 100,
      twoDaysAgo, yesterday, 45, 42,
      'Felt great! Average pace 5:20/km.',
      twoDaysAgo, yesterday, yesterday
    );
    insertSubtask.run(uuidv4(), task3Id, 'Warm up stretches', 1, 0, twoDaysAgo, yesterday);
    insertSubtask.run(uuidv4(), task3Id, '5K loop running', 1, 1, twoDaysAgo, yesterday);
    insertSubtask.run(uuidv4(), task3Id, 'Cool down hydration', 1, 2, twoDaysAgo, yesterday);
    insertActivity.run(uuidv4(), task3Id, userId, 'created', null, 'Complete 5K Morning Endurance Run', null, twoDaysAgo);
    insertActivity.run(uuidv4(), task3Id, userId, 'completed', 'in_progress', 'completed', null, yesterday);

    // Task 4: Learning
    const task4Id = uuidv4();
    insertTask.run(
      task4Id, userId, categories[2].id,
      'Study System Design: Distributed Event Streaming',
      'Deep dive into Kafka partition strategies, consumer offsets, and dead-letter queues.',
      'in_progress', 'low', 50,
      nowIso, inThreeDays, 120, 60,
      'Chapter 4 of Designing Data-Intensive Applications.',
      nowIso, nowIso, null
    );
    insertSubtask.run(uuidv4(), task4Id, 'Read DDIA Chapter 4 notes', 1, 0, nowIso, nowIso);
    insertSubtask.run(uuidv4(), task4Id, 'Build mini consumer group prototype', 0, 1, nowIso, null);
    insertActivity.run(uuidv4(), task4Id, userId, 'created', null, 'Study System Design: Distributed Event Streaming', null, nowIso);

    // 4. Sample Reminder
    db.prepare(`
      INSERT INTO reminders (id, task_id, user_id, reminder_time, label, is_triggered, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(uuidv4(), task2Id, userId, tomorrow, 'Tax submission deadline in 24 hours', nowIso);

    // 5. Sample Notifications
    db.prepare(`
      INSERT INTO notifications (id, user_id, task_id, type, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(uuidv4(), userId, task2Id, 'reminder', 'Upcoming Task Deadline', 'Review and Submit Quarterly Tax Estimates is due tomorrow!', nowIso);

    db.prepare(`
      INSERT INTO notifications (id, user_id, task_id, type, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(uuidv4(), userId, task3Id, 'task_completed', 'Task Completed! 🎉', 'You crushed "Complete 5K Morning Endurance Run". Keep up the momentum!', yesterday);

    console.log('✅ Seeding complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Demo Account: demo@mytasker.app');
    console.log('🔑 Password:     Password123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (shouldExit) {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    if (shouldExit) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  initializeDatabase().then(() => seedDatabase(true));
}
