import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret) as JwtPayload;

    // Verify user still exists
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(payload.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'User no longer exists' });
      return;
    }

    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid token' });
    } else {
      res.status(500).json({ success: false, message: 'Authentication error' });
    }
  }
}
