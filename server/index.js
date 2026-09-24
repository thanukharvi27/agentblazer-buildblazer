import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { db } from './database.js';
import { verifyPassword, hashPassword, generateAdminToken, invalidateToken, requireAdminAuth } from './auth.js';
import { sendApplicationStatusEmail, sendPasswordResetEmail, getEmailConfig, saveEmailConfig, testEmailConnection, sendQueryReplyEmail } from './emailService.js';
import { connectMongo, saveApprovedMember, removeApprovedMember, getApprovedMembers, isMongoConnected } from './mongoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {
    // ignore
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Uploads directory — use /tmp/uploads on Vercel serverless
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsDir = isServerless ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    console.warn('[Uploads] Could not create uploadsDir:', e.message);
  }
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // SVGs are excluded to prevent Stored XSS attacks via embedded scripts
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed. SVG uploads are disabled for security.'));
    }
  },
});

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows frontend to load images from /uploads
}));

// CORS configuration: restrict origins with safe fallbacks
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Automatically permit any Vercel deployment URL
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    // Allow local development URLs
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));
if (isServerless) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Lazy / automatic MongoDB connection handler for serverless environments
let mongoInitPromise = null;
app.use(async (req, res, next) => {
  if (isServerless && !isMongoConnected() && process.env.MONGODB_URI) {
    if (!mongoInitPromise) {
      mongoInitPromise = connectMongo().finally(() => {
        mongoInitPromise = null;
      });
    }
    try {
      await mongoInitPromise;
    } catch (e) {
      // non-blocking
    }
  }
  next();
});

// Body parser limits
app.use(express.json({ limit: '1mb' }));

// Rate Limiters
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 applications per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many membership applications submitted. Please try again later.' },
});

app.use('/api/', generalApiLimiter);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AgentBlazer Backend API',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    serverless: isServerless,
    database: {
      sqlite: db ? 'connected' : 'error',
      mongodb: isMongoConnected() ? 'connected' : 'disconnected',
    },
  });
});

// ============================================================================
// AUTHENTICATION
// ============================================================================

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim().toLowerCase());
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const valid = verifyPassword(password, admin.password_hash, admin.salt);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const authResult = generateAdminToken(admin);
  res.json({
    token: authResult.token,
    user: { id: admin.id, username: admin.username },
    expiresAt: authResult.expiresAt,
  });
});

// Request Password Reset Code
app.post('/api/auth/forgot-password', loginLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid administrator email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const admin = db.prepare('SELECT id, username FROM admins WHERE username = ?').get(cleanEmail);

  if (!admin) {
    // Return generic success to prevent email enumeration attacks
    return res.json({
      success: true,
      message: 'If this email is registered as an administrator, a 6-digit verification code has been sent.',
    });
  }

  // Generate secure 6-digit verification code
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  try {
    db.prepare(`
      INSERT INTO admin_password_resets (email, code, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
    `).run(cleanEmail, code, expiresAt);
  } catch (err) {
    console.error('[Forgot Password Error]', err.message);
    return res.status(500).json({ error: 'Could not process password reset request.' });
  }

  const emailResult = await sendPasswordResetEmail(cleanEmail, code);

  res.json({
    success: true,
    message: 'If this email is registered as an administrator, a 6-digit verification code has been sent.',
    ...(emailResult.simulated ? { simulated: true, note: 'SMTP not configured; check server logs for reset code.' } : {}),
  });
});

// Verify Code and Set New Password
app.post('/api/auth/reset-password', loginLimiter, (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = String(code).trim();

  const resetRecord = db.prepare('SELECT * FROM admin_password_resets WHERE email = ?').get(cleanEmail);
  if (!resetRecord) {
    return res.status(400).json({ error: 'No active password reset request found for this email. Please request a new code.' });
  }

  if (Date.now() > resetRecord.expires_at) {
    db.prepare('DELETE FROM admin_password_resets WHERE email = ?').run(cleanEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (resetRecord.code !== cleanCode) {
    return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
  }

  // Update password in admins table
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(newPassword, salt);

  const result = db.prepare(`
    UPDATE admins
    SET password_hash = ?, salt = ?
    WHERE username = ?
  `).run(passwordHash, salt, cleanEmail);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Administrator account not found.' });
  }

  // Clear used reset code
  db.prepare('DELETE FROM admin_password_resets WHERE email = ?').run(cleanEmail);

  console.log(`[Admin Auth] Password reset successfully completed for: ${cleanEmail}`);
  res.json({
    success: true,
    message: 'Your password has been reset successfully! You can now sign in with your new password.',
  });
});

app.post('/api/auth/logout', requireAdminAuth, (req, res) => {
  const token = req.token || req.headers.authorization?.replace('Bearer ', '').trim();
  if (token) invalidateToken(token);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAdminAuth, (req, res) => {
  res.json({ user: req.admin });
});

// ============================================================================
// PUBLIC DATA ENDPOINT (FOR LIVE WEBSITE HYDRATION)
// ============================================================================

app.get('/api/public/data', (req, res) => {
  try {
    const members = db.prepare('SELECT * FROM members WHERE active = 1 ORDER BY display_order ASC').all();
    const rawEvents = db.prepare('SELECT * FROM events WHERE active = 1 ORDER BY display_order ASC').all();
    const guests = db.prepare('SELECT * FROM guests ORDER BY display_order ASC').all();
    const aboutRows = db.prepare('SELECT key, value FROM about_content').all();

    const about = {};
    for (const r of aboutRows) {
      about[r.key] = r.value;
    }

    const events = rawEvents.map(e => ({
      ...e,
      isUpcoming: Boolean(e.is_upcoming),
      venue: e.venue || null,
      time: e.time || null,
      registrationUrl: e.registration_url || null,
      tracks: e.tracks_json ? JSON.parse(e.tracks_json) : null,
      gallery: e.gallery_json ? JSON.parse(e.gallery_json) : [],
    }));

    res.json({
      members: {
        faculty: members.filter(m => m.category === 'faculty'),
        student: members.filter(m => m.category === 'student'),
        cwc: members.filter(m => m.category === 'cwc'),
      },
      events,
      guests,
      about,
    });
  } catch (err) {
    console.error('Error fetching public data:', err);
    res.status(500).json({ error: 'Failed to fetch public data.' });
  }
});

// ============================================================================
// ADMIN DASHBOARD STATS
// ============================================================================

app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const memberCount = db.prepare('SELECT COUNT(*) as c FROM members').get().c;
  const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
  const mediaCount = db.prepare('SELECT COUNT(*) as c FROM media').get().c;
  const guestCount = db.prepare('SELECT COUNT(*) as c FROM guests').get().c;
  const totalApps = db.prepare('SELECT COUNT(*) as c FROM membership_applications').get().c;
  const pendingApps = db.prepare("SELECT COUNT(*) as c FROM membership_applications WHERE status = 'pending'").get().c;
  const totalQueries = db.prepare('SELECT COUNT(*) as c FROM queries').get().c;
  const pendingQueries = db.prepare("SELECT COUNT(*) as c FROM queries WHERE status = 'pending'").get().c;

  res.json({
    totalMembers: memberCount,
    totalEvents: eventCount,
    totalMedia: mediaCount,
    totalGuests: guestCount,
    totalApplications: totalApps,
    pendingApplications: pendingApps,
    totalQueries,
    pendingQueries,
  });
});

// ============================================================================
// ADMIN: MEMBERS CRUD
// ============================================================================

app.get('/api/admin/members', requireAdminAuth, (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY category, display_order ASC').all();
  res.json(members);
});

app.post('/api/admin/members', requireAdminAuth, (req, res) => {
  const {
    category = 'student',
    name,
    role,
    title = '',
    title_class = 'badge-violet',
    description = '',
    image_url = '',
    initials = '',
    initials_color = '',
    highlighted = 0,
    display_order = 0,
    active = 1,
  } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and Role are required.' });
  }

  const result = db.prepare(`
    INSERT INTO members (category, name, role, title, title_class, description, image_url, initials, initials_color, highlighted, display_order, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    category,
    name.trim(),
    role.trim(),
    title ? title.trim() : role.trim(),
    title_class || 'badge-violet',
    description || '',
    image_url || '',
    initials || name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    initials_color || '',
    highlighted ? 1 : 0,
    Number(display_order) || 0,
    active ? 1 : 0
  );

  const newMember = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newMember);
});

app.put('/api/admin/members/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const {
    category,
    name,
    role,
    title,
    title_class,
    description,
    image_url,
    initials,
    initials_color,
    highlighted,
    display_order,
    active,
  } = req.body;

  db.prepare(`
    UPDATE members SET
      category = COALESCE(?, category),
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      title = COALESCE(?, title),
      title_class = COALESCE(?, title_class),
      description = COALESCE(?, description),
      image_url = COALESCE(?, image_url),
      initials = COALESCE(?, initials),
      initials_color = COALESCE(?, initials_color),
      highlighted = COALESCE(?, highlighted),
      display_order = COALESCE(?, display_order),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(
    category,
    name,
    role,
    title,
    title_class,
    description,
    image_url,
    initials,
    initials_color,
    highlighted !== undefined ? (highlighted ? 1 : 0) : null,
    display_order !== undefined ? Number(display_order) : null,
    active !== undefined ? (active ? 1 : 0) : null,
    id
  );

  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/admin/members/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
  res.json({ success: true, id });
});

// ============================================================================
// ADMIN: EVENTS & WORKSHOPS CRUD
// ============================================================================

app.get('/api/admin/events', requireAdminAuth, (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY display_order ASC').all();
  const parsed = events.map(e => ({
    ...e,
    isUpcoming: Boolean(e.is_upcoming),
    venue: e.venue || '',
    time: e.time || '',
    registrationUrl: e.registration_url || '',
    tracks: e.tracks_json ? JSON.parse(e.tracks_json) : [],
    gallery: e.gallery_json ? JSON.parse(e.gallery_json) : [],
  }));
  res.json(parsed);
});

app.post('/api/admin/events', requireAdminAuth, (req, res) => {
  const {
    title,
    date,
    badge = 'WORKSHOP',
    badge_class = 'badge-violet',
    description = '',
    meta = '',
    tracks = [],
    leads = '',
    platform = '',
    cover_image = '',
    gallery = [],
    display_order = 0,
    active = 1,
    isUpcoming = false,
    is_upcoming,
    venue = '',
    time = '',
    registrationUrl = '',
    registration_url,
  } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Title and Date are required.' });
  }

  const upcomingFlag = is_upcoming !== undefined ? (is_upcoming ? 1 : 0) : (isUpcoming ? 1 : 0);
  const regUrl = registration_url !== undefined ? registration_url : registrationUrl;

  const result = db.prepare(`
    INSERT INTO events (title, date, badge, badge_class, description, meta, tracks_json, leads, platform, cover_image, gallery_json, display_order, active, is_upcoming, venue, time, registration_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    date.trim(),
    badge || 'WORKSHOP',
    badge_class || 'badge-violet',
    description || '',
    meta || '',
    tracks ? JSON.stringify(tracks) : null,
    leads || '',
    platform || '',
    cover_image || '',
    gallery ? JSON.stringify(gallery) : '[]',
    Number(display_order) || 0,
    active ? 1 : 0,
    upcomingFlag,
    venue ? venue.trim() : null,
    time ? time.trim() : null,
    regUrl ? regUrl.trim() : null
  );

  const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    ...newEvent,
    isUpcoming: Boolean(newEvent.is_upcoming),
    venue: newEvent.venue || '',
    time: newEvent.time || '',
    registrationUrl: newEvent.registration_url || '',
    tracks: newEvent.tracks_json ? JSON.parse(newEvent.tracks_json) : [],
    gallery: newEvent.gallery_json ? JSON.parse(newEvent.gallery_json) : [],
  });
});

app.put('/api/admin/events/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const {
    title,
    date,
    badge,
    badge_class,
    description,
    meta,
    tracks,
    leads,
    platform,
    cover_image,
    gallery,
    display_order,
    active,
    isUpcoming,
    is_upcoming,
    venue,
    time,
    registrationUrl,
    registration_url,
  } = req.body;

  const upcomingFlag = is_upcoming !== undefined ? (is_upcoming ? 1 : 0) : (isUpcoming !== undefined ? (isUpcoming ? 1 : 0) : null);
  const regUrl = registration_url !== undefined ? registration_url : registrationUrl;

  db.prepare(`
    UPDATE events SET
      title = COALESCE(?, title),
      date = COALESCE(?, date),
      badge = COALESCE(?, badge),
      badge_class = COALESCE(?, badge_class),
      description = COALESCE(?, description),
      meta = COALESCE(?, meta),
      tracks_json = COALESCE(?, tracks_json),
      leads = COALESCE(?, leads),
      platform = COALESCE(?, platform),
      cover_image = COALESCE(?, cover_image),
      gallery_json = COALESCE(?, gallery_json),
      display_order = COALESCE(?, display_order),
      active = COALESCE(?, active),
      is_upcoming = COALESCE(?, is_upcoming),
      venue = COALESCE(?, venue),
      time = COALESCE(?, time),
      registration_url = COALESCE(?, registration_url)
    WHERE id = ?
  `).run(
    title,
    date,
    badge,
    badge_class,
    description,
    meta,
    tracks !== undefined ? JSON.stringify(tracks) : null,
    leads,
    platform,
    cover_image,
    gallery !== undefined ? JSON.stringify(gallery) : null,
    display_order !== undefined ? Number(display_order) : null,
    active !== undefined ? (active ? 1 : 0) : null,
    upcomingFlag,
    venue,
    time,
    regUrl,
    id
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.json({
    ...updated,
    isUpcoming: Boolean(updated.is_upcoming),
    venue: updated.venue || '',
    time: updated.time || '',
    registrationUrl: updated.registration_url || '',
    tracks: updated.tracks_json ? JSON.parse(updated.tracks_json) : [],
    gallery: updated.gallery_json ? JSON.parse(updated.gallery_json) : [],
  });
});

app.delete('/api/admin/events/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  res.json({ success: true, id });
});

// ============================================================================
// ADMIN: ABOUT US & GUESTS
// ============================================================================

app.get('/api/admin/about', requireAdminAuth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM about_content').all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  res.json(obj);
});

app.put('/api/admin/about', requireAdminAuth, (req, res) => {
  const updates = req.body;
  const upsert = db.prepare(`
    INSERT INTO about_content (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  for (const [key, value] of Object.entries(updates)) {
    upsert.run(key, String(value), new Date().toISOString());
  }

  res.json({ success: true, updates });
});

app.get('/api/admin/guests', requireAdminAuth, (req, res) => {
  const guests = db.prepare('SELECT * FROM guests ORDER BY display_order ASC').all();
  res.json(guests);
});

app.post('/api/admin/guests', requireAdminAuth, (req, res) => {
  const { initials, name, org, role, label, label_color = '#22d3ee', border_color = 'rgba(139, 92, 246, 0.5)', display_order = 0 } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and Role are required.' });
  }

  const result = db.prepare(`
    INSERT INTO guests (initials, name, org, role, label, label_color, border_color, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    initials || name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    name.trim(),
    org || '',
    role.trim(),
    label || '',
    label_color,
    border_color,
    Number(display_order) || 0
  );

  const newGuest = db.prepare('SELECT * FROM guests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newGuest);
});

app.put('/api/admin/guests/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { initials, name, org, role, label, label_color, border_color, display_order } = req.body;

  db.prepare(`
    UPDATE guests SET
      initials = COALESCE(?, initials),
      name = COALESCE(?, name),
      org = COALESCE(?, org),
      role = COALESCE(?, role),
      label = COALESCE(?, label),
      label_color = COALESCE(?, label_color),
      border_color = COALESCE(?, border_color),
      display_order = COALESCE(?, display_order)
    WHERE id = ?
  `).run(initials, name, org, role, label, label_color, border_color, display_order !== undefined ? Number(display_order) : null, id);

  const updated = db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/admin/guests/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM guests WHERE id = ?').run(id);
  res.json({ success: true, id });
});

// ============================================================================
// ADMIN: MEDIA / FILE UPLOAD
// ============================================================================

app.get('/api/admin/media', requireAdminAuth, (req, res) => {
  const media = db.prepare('SELECT * FROM media ORDER BY id DESC').all();
  res.json(media);
});

app.post('/api/admin/upload', requireAdminAuth, upload.array('images', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files were uploaded.' });
  }

  const insertMedia = db.prepare(`
    INSERT INTO media (filename, original_name, url, mime_type, size, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const results = [];
  for (const f of req.files) {
    const fileUrl = `/uploads/${f.filename}`;
    const r = insertMedia.run(f.filename, f.originalname, fileUrl, f.mimetype, f.size, new Date().toISOString());
    results.push({
      id: r.lastInsertRowid,
      filename: f.filename,
      original_name: f.originalname,
      url: fileUrl,
      size: f.size,
    });
  }

  res.status(201).json({
    files: results,
    // Convenience single-file url for single uploaders
    url: results[0].url,
  });
});

app.delete('/api/admin/media/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  if (item) {
    const filePath = path.join(uploadsDir, item.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to unlink file:', err);
      }
    }
    db.prepare('DELETE FROM media WHERE id = ?').run(id);
  }
  res.json({ success: true, id });
});

// ============================================================================
// PUBLIC: MEMBERSHIP APPLICATION SUBMISSION
// ============================================================================

app.post('/api/membership-applications', formLimiter, (req, res) => {
  try {
    const { name, email, year, message } = req.body;
    if (!name || !email || !year) {
      return res.status(400).json({ error: 'Name, email, and year of study are required.' });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedYear = String(year).trim();
    const trimmedMessage = String(message || '').trim();

    // Validation checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 254) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
    }

    if (trimmedMessage.length > 1000) {
      return res.status(400).json({ error: 'Statement cannot exceed 1000 characters.' });
    }

    const insert = db.prepare(`
      INSERT INTO membership_applications (name, email, year, message, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);

    const result = insert.run(trimmedName, trimmedEmail, trimmedYear, trimmedMessage, new Date().toISOString());

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error('Error submitting membership application:', err);
    res.status(500).json({ error: 'Failed to submit application. Please try again.' });
  }
});

// ============================================================================
// ADMIN: MEMBERSHIP APPLICATIONS CRUD
// ============================================================================

app.get('/api/admin/applications', requireAdminAuth, (req, res) => {
  try {
    const applications = db.prepare('SELECT * FROM membership_applications ORDER BY id DESC').all();
    res.json(applications);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: 'Failed to fetch membership applications.' });
  }
});

app.patch('/api/admin/applications/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, approved, or rejected.' });
    }

    const update = db.prepare('UPDATE membership_applications SET status = ? WHERE id = ?');
    update.run(status, id);

    const updated = db.prepare('SELECT * FROM membership_applications WHERE id = ?').get(id);
    if (!updated) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Save/remove from MongoDB based on status
    let mongoResult = null;
    if (status === 'approved') {
      try {
        mongoResult = await saveApprovedMember(updated);
      } catch (mongoErr) {
        console.error('Error saving approved member to MongoDB:', mongoErr);
      }
    } else {
      // If moved to rejected/pending, remove from MongoDB approved list
      try {
        await removeApprovedMember(updated.email);
      } catch (mongoErr) {
        console.error('Error removing member from MongoDB:', mongoErr);
      }
    }

    // Trigger email notification to the student upon approval or rejection
    let emailResult = null;
    if (status === 'approved' || status === 'rejected') {
      try {
        emailResult = await sendApplicationStatusEmail(updated, status);
      } catch (emailErr) {
        console.error('Error dispatching application status email:', emailErr);
      }
    }

    // Re-fetch in case emailService updated email status fields
    const finalUpdated = db.prepare('SELECT * FROM membership_applications WHERE id = ?').get(id);

    res.json({
      ...finalUpdated,
      emailSent: emailResult ? emailResult.emailSent : false,
      emailStatus: emailResult ? emailResult.emailStatus : 'not_configured',
      emailError: emailResult ? emailResult.emailError : null,
      emailResult,
      mongoResult: mongoResult ? 'saved' : null
    });
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ error: 'Failed to update application.' });
  }
});

app.post('/api/admin/applications/:id/send-email', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const application = db.prepare('SELECT * FROM membership_applications WHERE id = ?').get(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.status === 'pending') {
      return res.status(400).json({ error: 'Please approve or reject the application before sending an email notification.' });
    }

    const emailResult = await sendApplicationStatusEmail(application, application.status);
    const updated = db.prepare('SELECT * FROM membership_applications WHERE id = ?').get(id);

    res.json({
      success: true,
      application: {
        ...updated,
        emailSent: emailResult.emailSent,
        emailStatus: emailResult.emailStatus,
        emailError: emailResult.emailError,
      },
      emailSent: emailResult.emailSent,
      emailStatus: emailResult.emailStatus,
      emailError: emailResult.emailError,
      emailResult
    });
  } catch (err) {
    console.error('Error sending application email:', err);
    res.status(500).json({ error: 'Failed to dispatch email notification.' });
  }
});

app.get('/api/admin/email-logs', requireAdminAuth, (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT 100').all();
    res.json(logs);
  } catch (err) {
    console.error('Error fetching email logs:', err);
    res.status(500).json({ error: 'Failed to fetch email logs.' });
  }
});

app.get('/api/admin/email-settings', requireAdminAuth, (req, res) => {
  try {
    const config = getEmailConfig();
    const { pass, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get email settings' });
  }
});

app.post('/api/admin/email-settings', requireAdminAuth, (req, res) => {
  try {
    const updated = saveEmailConfig(req.body);
    const { pass, ...safeConfig } = updated;
    res.json({ success: true, config: safeConfig });
  } catch (err) {
    console.error('Error saving email settings:', err);
    res.status(500).json({ error: 'Failed to save email settings' });
  }
});

app.post('/api/admin/email-settings/test', requireAdminAuth, async (req, res) => {
  try {
    const { testRecipient, ...customConfig } = req.body;
    const result = await testEmailConnection(testRecipient, customConfig);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/applications/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM membership_applications WHERE id = ?').run(id);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting application:', err);
    res.status(500).json({ error: 'Failed to delete application.' });
  }
});

// Admin: Get all approved members from MongoDB
app.get('/api/admin/approved-members', requireAdminAuth, async (req, res) => {
  try {
    const members = await getApprovedMembers();
    res.json({ connected: isMongoConnected(), members });
  } catch (err) {
    console.error('Error fetching approved members from MongoDB:', err);
    res.status(500).json({ error: 'Failed to fetch approved members.' });
  }
});

// ============================================================================
// PUBLIC: CSE DEPARTMENT INQUIRIES / QUERIES SUBMISSION
// ============================================================================

app.post('/api/queries', formLimiter, (req, res) => {
  try {
    const { name, email, year, query } = req.body;
    if (!name || !email || !year || !query) {
      return res.status(400).json({ error: 'Name, email, year of study, and inquiry query are required.' });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedYear = String(year).trim();
    const trimmedQuery = String(query).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 254) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
    }

    if (trimmedQuery.length < 5 || trimmedQuery.length > 3000) {
      return res.status(400).json({ error: 'Inquiry query must be between 5 and 3000 characters.' });
    }

    const insert = db.prepare(`
      INSERT INTO queries (name, email, year, query, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);

    const result = insert.run(trimmedName, trimmedEmail, trimmedYear, trimmedQuery, new Date().toISOString());

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. CSE Department coordinators will respond via email shortly.',
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error('Error submitting inquiry query:', err);
    res.status(500).json({ error: 'Failed to submit inquiry. Please try again.' });
  }
});

// ============================================================================
// ADMIN: QUERIES MANAGEMENT & EMAIL REPLIES
// ============================================================================

app.get('/api/admin/queries', requireAdminAuth, (req, res) => {
  try {
    const queries = db.prepare('SELECT * FROM queries ORDER BY id DESC').all();
    res.json(queries);
  } catch (err) {
    console.error('Error fetching queries:', err);
    res.status(500).json({ error: 'Failed to fetch queries.' });
  }
});

app.post('/api/admin/queries/:id/reply', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !String(reply).trim()) {
      return res.status(400).json({ error: 'Reply message cannot be empty.' });
    }

    const queryRecord = db.prepare('SELECT * FROM queries WHERE id = ?').get(id);
    if (!queryRecord) {
      return res.status(404).json({ error: 'Inquiry query not found.' });
    }

    const emailResult = await sendQueryReplyEmail(queryRecord, String(reply).trim());
    const updated = db.prepare('SELECT * FROM queries WHERE id = ?').get(id);

    res.json({
      success: true,
      query: updated,
      emailResult,
    });
  } catch (err) {
    console.error('Error sending query reply:', err);
    res.status(500).json({ error: 'Failed to dispatch reply.' });
  }
});

app.patch('/api/admin/queries/:id/status', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'resolved', 'replied'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, resolved, or replied.' });
    }

    db.prepare('UPDATE queries SET status = ? WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM queries WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Error updating query status:', err);
    res.status(500).json({ error: 'Failed to update query status.' });
  }
});

app.delete('/api/admin/queries/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM queries WHERE id = ?').run(id);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting query:', err);
    res.status(500).json({ error: 'Failed to delete query.' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// Start Server — connect MongoDB first, then listen (when running as standalone process)
async function startServer() {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`[Server] AgentBlazer Backend API running on http://localhost:${PORT}`);
  });
}

// Only start the HTTP listener when run directly (e.g. `node server/index.js`)
// When imported as a module (e.g. by `api/index.js` for Vercel Serverless), do NOT call app.listen().
const isMain = Boolean(
  process.argv[1] && (
    process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('server' + path.sep + 'index.js') ||
    process.argv[1].endsWith('server/index.js')
  )
);

if (isMain && !isServerless && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
export { app, startServer };
