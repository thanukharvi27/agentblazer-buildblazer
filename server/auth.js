import crypto from 'node:crypto';
import { db } from './database.js';

// Active in-memory session tokens: token -> { adminId, username, expiresAt }
const activeSessions = new Map();

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password, hash, salt) {
  const checkHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(checkHash, 'hex'), Buffer.from(hash, 'hex'));
}

export function createSession(adminId, username) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  activeSessions.set(token, { adminId, username, expiresAt });
  return { token, expiresAt };
}

export function invalidateSession(token) {
  activeSessions.delete(token);
}

export function getSession(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Admin session required.' });
  }

  req.admin = session;
  next();
}
