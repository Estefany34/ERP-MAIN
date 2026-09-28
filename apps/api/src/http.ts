import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
export function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => unknown) { return (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next); }
export function parseBody<T>(schema: { parse: (input: unknown) => T }, body: unknown): T { return schema.parse(body); }
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues.map(issue => issue.message).join(', ') } });
  const message = process.env.NODE_ENV === 'production' ? 'Unexpected server error' : error instanceof Error ? error.message : 'Unexpected server error';
  if (process.env.NODE_ENV !== 'production') console.error('Request error:', message);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
}
