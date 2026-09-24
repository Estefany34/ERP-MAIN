import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { router } from './routes.js';
import { errorHandler } from './http.js';
import { isPersistenceEnabled, persistDatabase } from './database.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
  app.use((req, res, next) => {
    res.on('finish', () => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && res.statusCode < 400) void persistDatabase();
    });
    next();
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'erp-api' }));
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', service: 'erp-api', version: 'v1', persistence: isPersistenceEnabled() ? 'mongodb' : 'memory' }));
  app.use('/api/v1', router);
  app.use(errorHandler);
  return app;
}
