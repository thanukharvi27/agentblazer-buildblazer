import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from './database.js';

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {}
}

const JWT_SECRET = process.env.JWT_SECRET || 'agentblazer-secure-jwt-secret-key-fallback';
const JWT_EXPIRES_IN = '7d';

// In-memory blacklist for revoked tokens (e.g. upon logout)
const revokedTokens = new Set();

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password, hash, salt) {
  const checkHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(checkHash, 'hex'), Buffer.from(hash, 'hex'));
}

/**
 * Generate a signed JWT token for an admin
 */
export function generateAdminToken(admin) {
  const payload = {
    id: admin.id,
    username: admin.username,
    role: 'admin',
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });

  const decoded = jwt.decode(token);
  const expiresAt = decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;

  return { token, expiresAt };
}

/**
 * Invalidate a JWT token (logout / revocation)
 */
export function invalidateToken(token) {
  if (token) {
    revokedTokens.add(token);
  }
}

// Clean up expired tokens from revocation set periodically (every hour)
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const token of revokedTokens) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || decoded.exp < now) {
        revokedTokens.delete(token);
      }
    } catch {
      revokedTokens.delete(token);
    }
  }
}, 60 * 60 * 1000).unref();

/**
 * Middleware: Verify JWT Bearer token and confirm active admin account
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
  }

  if (revokedTokens.has(token)) {
    return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify admin account still exists in the database
    const admin = db.prepare('SELECT id, username FROM admins WHERE id = ?').get(decoded.id);
    if (!admin) {
      return res.status(401).json({ error: 'Administrator account not found.' });
    }

    req.admin = { id: admin.id, username: admin.username };
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}
