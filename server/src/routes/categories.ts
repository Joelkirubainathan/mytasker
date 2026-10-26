import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /categories
router.get('/', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const categories = await db.prepare(`
      SELECT c.*,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count
      FROM categories c
      LEFT JOIN tasks t ON c.id = t.category_id AND t.user_id = c.user_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all(req.userId);

    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// POST /categories
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name required'),
  body('icon').optional().isString(),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid color format'),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  try {
    const db = getDb();
    const { name, icon = '📁', color = '#6366f1', description } = req.body;

    // Check duplicate name for this user
    const exists = await db.prepare('SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = LOWER(?)').get(req.userId, name);
    if (exists) return res.status(409).json({ success: false, message: 'A category with this name already exists' });

    const id = uuidv4();
    await db.prepare('INSERT INTO categories (id, user_id, name, icon, color, description) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, req.userId, name, icon, color, description || null
    );

    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// PATCH /categories/:id
router.patch('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
], async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const category = await db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const allowed = ['name', 'icon', 'color', 'description'];
    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    await db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

// DELETE /categories/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const category = (await db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)) as any;
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const countRow = (await db.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?').get(req.params.id)) as any;
    const taskCount = Number(countRow?.count || 0);

    const { action, target_category_id } = req.body;

    if (taskCount > 0) {
      if (!action) {
        return res.json({
          success: true,
          requiresAction: true,
          taskCount,
          message: `This category contains ${taskCount} task(s). Choose how to handle them.`,
        });
      }

      if (action === 'move') {
        if (target_category_id) {
          const target = await db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(target_category_id, req.userId);
          if (!target) return res.status(400).json({ success: false, message: 'Target category not found' });
          await db.prepare('UPDATE tasks SET category_id = ? WHERE category_id = ?').run(target_category_id, req.params.id);
        } else {
          await db.prepare('UPDATE tasks SET category_id = NULL WHERE category_id = ?').run(req.params.id);
        }
      } else if (action === 'uncategorize') {
        await db.prepare('UPDATE tasks SET category_id = NULL WHERE category_id = ?').run(req.params.id);
      }
    }

    await db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

export default router;
