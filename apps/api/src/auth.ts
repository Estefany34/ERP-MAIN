import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { db, id, now, type Role } from './store.js';

export function getJwtSecret(envName = process.env.NODE_ENV ?? 'development', env = process.env) {
  const candidate = env.JWT_SECRET?.trim();
  if (envName === 'production') {
    if (!candidate || candidate === 'development-only-change-me') {
      throw new Error('JWT_SECRET is required in production and must not use the development fallback');
    }
    return candidate;
  }
  return candidate || 'development-only-change-me';
}

const secret = () => getJwtSecret();
export type AuthRequest = Request & { user?: { id: string; companyId: string; role: Role; sessionId?: string }; sessionId?: string };

export function createSession(userId: string, companyId: string, role: Role) {
  const sessionId = id();
  const refreshToken = issueRefreshToken(userId, companyId, sessionId);
  db.sessions.push({
    id: sessionId,
    userId,
    companyId,
    role,
    refreshTokenHash: '',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now(),
    lastUsedAt: now()
  });
  return { sessionId, refreshToken, session: db.sessions[db.sessions.length - 1] };
}

export function issueToken(userId: string, companyId: string, role: Role, sessionId?: string) {
  return jwt.sign({ sub: userId, companyId, role, sid: sessionId, tokenType: 'access' }, secret(), { expiresIn: '8h' });
}

export function issueRefreshToken(userId: string, companyId: string, sessionId: string) {
  return jwt.sign({ sub: userId, companyId, sid: sessionId, tokenType: 'refresh' }, secret(), { expiresIn: '14d' });
}

export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function hashRefreshToken(token: string) { return bcrypt.hash(token, 12); }

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const value = req.header('authorization');
  if (!value?.startsWith('Bearer ')) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
  try {
    const payload = jwt.verify(value.slice(7), secret()) as jwt.JwtPayload;
    if (payload.tokenType === 'refresh') return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Refresh token is not valid for API access' } });
    const membership = db.memberships.find(item => item.userId === payload.sub && item.companyId === payload.companyId);
    if (!membership) return res.status(403).json({ error: { code: 'NO_MEMBERSHIP', message: 'Company membership required' } });
    const sessionId = typeof payload.sid === 'string' ? payload.sid : undefined;
    if (sessionId) {
      const session = db.sessions.find(item => item.id === sessionId && item.userId === String(payload.sub) && item.companyId === membership.companyId && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now());
      if (!session) return res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Session expired or revoked' } });
      session.lastUsedAt = new Date().toISOString();
      req.user = { id: String(payload.sub), companyId: membership.companyId, role: membership.role, sessionId: session.id };
      req.sessionId = session.id;
      return next();
    }
    req.user = { id: String(payload.sub), companyId: membership.companyId, role: membership.role };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    next();
  };
}
