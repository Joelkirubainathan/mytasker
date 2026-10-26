import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from 'express-rate-limit';
import { getDb } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'),
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

function generateTokens(userId: string, email: string) {
  const secret = process.env.JWT_SECRET || 'mytasker-prod-jwt-secret-fallback-key-2026';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'mytasker-prod-refresh-secret-fallback-key-2026';

  const accessToken = jwt.sign({ userId, email }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  });

  const refreshToken = jwt.sign({ userId, email }, refreshSecret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });

  return { accessToken, refreshToken };
}

async function seedDefaultCategories(userId: string) {
  const db = getDb();
  const defaults = [
    { name: 'College', icon: '🎓', color: '#6366f1' },
    { name: 'Coding', icon: '💻', color: '#0ea5e9' },
    { name: 'Personal', icon: '🏠', color: '#10b981' },
    { name: 'Work', icon: '💼', color: '#f59e0b' },
    { name: 'Projects', icon: '🚀', color: '#8b5cf6' },
    { name: 'Exams', icon: '📝', color: '#ef4444' },
  ];

  for (const cat of defaults) {
    await db.prepare(`INSERT INTO categories (id, user_id, name, icon, color) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), userId, cat.name, cat.icon, cat.color);
  }
}

// POST /auth/register
router.post('/register', authLimiter, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;
  const db = getDb();

  try {
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await db.prepare(`INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`).run(id, name, email, passwordHash);

    await seedDefaultCategories(id);

    const { accessToken, refreshToken } = generateTokens(id, email);

    const refreshHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(
      uuidv4(), id, refreshHash, expiresAt
    );

    const user = await db.prepare('SELECT id, name, email, avatar, created_at FROM users WHERE id = ?').get(id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, accessToken, refreshToken },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create account', details: error?.message || String(error) });
  }
});

// POST /auth/login
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email, password } = req.body;
  const db = getDb();

  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get<any>(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email);

    const refreshHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(
      uuidv4(), user.id, refreshHash, expiresAt
    );

    return res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, created_at: user.created_at },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed', details: error?.message || String(error) });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const secret = process.env.JWT_REFRESH_SECRET || 'mytasker-prod-refresh-secret-fallback-key-2026';
    const payload = jwt.verify(refreshToken, secret) as any;
    const db = getDb();

    const tokens = await db.prepare('SELECT * FROM refresh_tokens WHERE user_id = ? AND expires_at > ?').all<any>(
      payload.userId, new Date().toISOString()
    );

    let valid = false;
    let tokenId = '';
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.token_hash)) {
        valid = true;
        tokenId = t.id;
        break;
      }
    }

    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(tokenId);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.userId, payload.email);
    const refreshHash = await bcrypt.hash(newRefreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(
      uuidv4(), payload.userId, refreshHash, expiresAt
    );

    return res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  const db = getDb();
  try {
    await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.userId);
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const db = getDb();
  const user = await db.prepare('SELECT id, name, email, avatar, timezone, notification_settings, created_at FROM users WHERE id = ?').get<any>(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  try {
    user.notification_settings = JSON.parse(user.notification_settings || '{}');
  } catch { /* ignore */ }

  return res.json({ success: true, data: user });
});

export default router;
