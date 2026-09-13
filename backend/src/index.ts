import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

config();

// Polyfill BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () { return Number(this); };

import { initializeDatabase, AppDataSource } from './data-source.js';
import { ensureInitialSeed } from './scripts/seed.js';

import authRouter from './routes/auth.js';
import adminUsersRouter from './routes/adminUsers.js';
import branchesRouter from './routes/branches.js';
import oracleMigrationRouter from './routes/oracleMigration.js';
import hqDashboardRouter from './routes/hqDashboard.js';

import customersRouter from './routes/customers.js';
import salesRouter from './routes/sales.js';
import installmentsRouter from './routes/installments.js';
import paymentsRouter from './routes/payments.js';
import followupsRouter from './routes/followups.js';
import dashboardRouter from './routes/dashboard.js';
import reportsRouter from './routes/reports.js';
import exportRouter from './routes/export.js';
import importRouter from './routes/import.js';
import backupRouter from './routes/backup.js';
import rewardsRouter from './routes/rewards.js';
import branchRouter from './routes/branch.js';
import analyticsRouter from './routes/analytics.js';

import { authenticate } from './middleware/auth.js';
import { branchScopeMiddleware } from './middleware/branchScope.js';

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath((import.meta as any).url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

const app = express();
const PORT = process.env.PORT || 3007;

// Allowed Origins for CORS
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3007'];

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
    }
  } : false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server) or in development
    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('غير مسموح بهذا المصدر بواسطة سياسة CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'طلبات كثيرة جداً، يرجى المحاولة بعد قليل' },
});
app.use('/api', limiter);

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 minutes
  message: { error: 'تم تجاوز الحد الأقصى لمحاولات الدخول، يرجى الانتظار 15 دقيقة' },
});
app.use('/api/auth/login', authLimiter);

// 1. Public Routes
app.use('/api/auth', authRouter);

app.get('/api/health', async (req, res) => {
  try {
    const isDbConnected = AppDataSource.isInitialized;
    res.json({ 
      status: 'ok', 
      db: isDbConnected ? 'connected' : 'disconnected',
      dbType: AppDataSource.options.type,
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    res.status(503).json({ 
      status: 'error', 
      db: 'disconnected',
      error: error?.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// 2. Authenticated Routes (Protected by JWT)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/health') {
    return next();
  }
  
  // Backwards compatibility with API token if specified
  const apiKey = req.headers['x-api-key'];
  if (apiKey && process.env.API_TOKEN && apiKey === process.env.API_TOKEN) {
    return next();
  }

  return authenticate(req, res, next);
});

// Apply branch isolation to all operational endpoints
app.use('/api', branchScopeMiddleware);

// Administration & HQ Routes
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/oracle', oracleMigrationRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/dashboard', hqDashboardRouter); // mounts /api/dashboard/hq
app.use('/api/dashboard', dashboardRouter);   // mounts legacy stats

// Operational Routes
app.use('/api/customers', customersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/installments', installmentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/followups', followupsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', importRouter);
app.use('/api/backup', backupRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/branch', branchRouter);
app.use('/api/analytics', analyticsRouter);

// Frontend Static Serving (if production build exists)
if (process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true') {
  const frontendDist = process.env.FRONTEND_DIST || path.resolve(_dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
      if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    }
  }));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', err);
  } else {
    console.error('[Error]', err.message);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'حدث خطأ في الخادم';

  res.status(statusCode).json({
    error: message,
    code: err.code,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Initialize Database & Seed
(async () => {
  try {
    await initializeDatabase();
    await ensureInitialSeed();
  } catch (err: any) {
    console.error('❌ Failed to initialize database:', err?.message || err);
    console.warn('⚠️ Server will still listen for requests, but database queries may fail until connection is ready.');
  }
})();

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Murabha Cloud Backend running on port ${PORT}`);
  console.log(`🌐 Ready for cloud deployment`);
});

export default app;