import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { router } from './routes.js';
import { adminRouter } from './adminRoutes.js';
import { requireAuth } from './auth.js';
import { errorHandler } from './http.js';
import { persistDatabase } from './database.js';

export function getAllowedOrigins(envName = process.env.NODE_ENV ?? 'development', env = process.env) {
  const raw = env.CORS_ORIGIN ?? '';
  const value = raw.split(',').map(item => item.trim()).filter(Boolean);
  if (envName === 'production') {
    if (value.length === 0) throw new Error('CORS_ORIGIN is required in production and must contain at least one trusted origin');
    return value;
  }
  return value.length ? value : ['http://localhost:8081', 'http://localhost:19006'];
}

export function isPublicRegistrationAllowed(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production') return String(env.ALLOW_PUBLIC_REGISTRATION ?? 'false').toLowerCase() === 'true';
  return true;
}

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = origin ?? '';
    if (!origin || allowedOrigins.includes(requestOrigin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS policy'));
  }, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
  app.use((req, res, next) => {
    res.on('finish', () => { if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && res.statusCode < 400) void persistDatabase(); });
    next();
  });
  app.get('/', (_req, res) => res.redirect(302, 'https://erp-fanixglobal.pages.dev/'));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'fanix-api' }));
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', service: 'fanix-api' }));
  app.use('/api/v1', router);
  app.use('/api/v1', requireAuth, adminRouter);
  app.use(errorHandler);
  return app;
}
