import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { db, type Role } from './store.js';

const secret = () => process.env.JWT_SECRET ?? 'development-only-change-me';
export type AuthRequest = Request & { user?: { id: string; companyId: string; role: Role } };

export function issueToken(userId: string, companyId: string, role: Role) {
  return jwt.sign({ sub: userId, companyId, role }, secret(), { expiresIn: '8h' });
}
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const value = req.header('authorization');
  if (!value?.startsWith('Bearer ')) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
  try {
    const payload = jwt.verify(value.slice(7), secret()) as jwt.JwtPayload;
    const membership = db.memberships.find(item => item.userId === payload.sub && item.companyId === payload.companyId);
    if (!membership) return res.status(403).json({ error: { code: 'NO_MEMBERSHIP', message: 'Company membership required' } });
    req.user = { id: String(payload.sub), companyId: membership.companyId, role: membership.role };
    next();
  } catch { return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } }); }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    next();
  };
}
