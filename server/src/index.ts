import dotenv from 'dotenv';
dotenv.config();
// Reloaded with updated rate limits
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { initializeDatabase } from './database/db';
import { startReminderCron } from './services/reminderService';

import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import subtaskRoutes from './routes/subtasks';
import categoryRoutes from './routes/categories';
import notificationRoutes from './routes/notifications';
import reminderRoutes from './routes/reminders';
import analyticsRoutes from './routes/analytics';
import activityRoutes from './routes/activity';
import timeRoutes from './routes/time';
import userRoutes from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS - allow localhost and LAN IP addresses for mobile access in development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or any origin in development
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '500'),
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Ensure DB initialization in serverless environments (Vercel)
app.use(async (_req, _res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'MyTasker API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize DB and start server in standalone environments
async function main() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized');

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 MyTasker server running on port ${PORT} (0.0.0.0)`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start reminder cron job
    startReminderCron();
    console.log('⏰ Reminder scheduler started');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module || (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME)) {
  main();
}

export default app;
