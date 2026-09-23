import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

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

const dataDir = path.join(__dirname, 'data');
let dbPath = path.join(dataDir, 'agentblazer.db');

// In serverless environments like Vercel, the app root is read-only.
// We copy the bundled seed database to /tmp so SQLite has full read/write capability.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
if (isServerless) {
  const tmpDataDir = path.join('/tmp', 'data');
  if (!fs.existsSync(tmpDataDir)) {
    try {
      fs.mkdirSync(tmpDataDir, { recursive: true });
    } catch (e) {
      console.warn('[DB] Failed to create /tmp/data directory:', e.message);
    }
  }
  const tmpDbPath = path.join(tmpDataDir, 'agentblazer.db');
  if (!fs.existsSync(tmpDbPath) && fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, tmpDbPath);
      console.log('[DB] Copied bundled seed database to /tmp/data/agentblazer.db');
    } catch (err) {
      console.warn('[DB] Could not copy seed DB to /tmp, will initialize fresh:', err.message);
    }
  }
  dbPath = tmpDbPath;
} else {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export const db = new DatabaseSync(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_password_resets (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    title TEXT,
    title_class TEXT,
    description TEXT,
    image_url TEXT,
    initials TEXT,
    initials_color TEXT,
    highlighted INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    badge TEXT NOT NULL,
    badge_class TEXT NOT NULL,
    description TEXT NOT NULL,
    meta TEXT,
    tracks_json TEXT,
    leads TEXT,
    platform TEXT,
    cover_image TEXT,
    gallery_json TEXT,
    display_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    is_upcoming INTEGER DEFAULT 0,
    venue TEXT,
    time TEXT,
    registration_url TEXT
  );

  CREATE TABLE IF NOT EXISTS about_content (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    initials TEXT NOT NULL,
    name TEXT NOT NULL,
    org TEXT NOT NULL,
    role TEXT NOT NULL,
    label TEXT NOT NULL,
    label_color TEXT,
    border_color TEXT,
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    url TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS membership_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    year TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    email_notified INTEGER DEFAULT 0,
    email_notified_at TEXT,
    email_status TEXT DEFAULT 'pending',
    email_error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Safe migrations for columns if table already exists
try {
  db.exec(`ALTER TABLE membership_applications ADD COLUMN email_notified INTEGER DEFAULT 0;`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE membership_applications ADD COLUMN email_notified_at TEXT;`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE membership_applications ADD COLUMN email_status TEXT DEFAULT 'pending';`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE membership_applications ADD COLUMN email_error TEXT;`);
} catch (e) {
  // column already exists
}

// Reset stale email_notified flags for rows where delivery was never actually verified as sent
try {
  db.exec(`
    UPDATE membership_applications
    SET email_notified = 0, email_status = 'failed', email_error = 'Delivery failed or not verified (Invalid Gmail credentials)'
    WHERE email_notified = 1 AND (email_status IS NULL OR email_status != 'sent');
  `);
} catch (e) {
  // ignore
}
try {
  db.exec(`ALTER TABLE events ADD COLUMN is_upcoming INTEGER DEFAULT 0;`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE events ADD COLUMN venue TEXT;`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE events ADD COLUMN time TEXT;`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE events ADD COLUMN registration_url TEXT;`);
} catch (e) {
  // column already exists
}

// Password helper for seeding admin
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Seed default Admin if none exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
if (adminCount === 0) {
  const defaultEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@agentblazer.ac.in').trim().toLowerCase();
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AgentBlazer@2026';
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(defaultPassword, salt);
  db.prepare(`
    INSERT INTO admins (username, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?)
  `).run(defaultEmail, passwordHash, salt, new Date().toISOString());
  console.log(`[DB] Initial default administrator created: ${defaultEmail}`);
}

// Seed Members if empty
const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
if (memberCount === 0) {
  const insertMember = db.prepare(`
    INSERT INTO members (category, name, role, title, title_class, description, image_url, initials, initials_color, highlighted, display_order, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  // Faculty Advisory Council
  insertMember.run('faculty', 'Ms. Nisha Roche', 'Assistant Professor, CSE • Faculty Coordinator', 'Faculty Coordinator', 'badge-violet', 'Guiding student researchers in computer science and engineering at SJEC.', '', 'NR', '', 0, 1);
  insertMember.run('faculty', 'Mr. Keith Fernandes', 'Assistant Professor, CSE • Faculty Coordinator', 'Faculty Coordinator', 'badge-violet', 'Guiding student researchers in computer science and engineering at SJEC.', '', 'KF', '', 0, 2);

  // Student Core Team & Officers
  insertMember.run('student', 'Ruben Saldanha', 'Executive President', 'President', 'badge-green', 'Guiding club vision, university collaborations, and strategic workshop series.', '', 'RS', '', 0, 1);
  insertMember.run('student', 'Ajay Preenal Dsouza', 'Executive Vice President', 'Vice President', 'badge-gold', 'Coordinating student mentorship, event operations, and community growth.', '', 'AD', '', 0, 2);
  insertMember.run('student', 'Stevin Dsouza', 'Technical Direction', 'Tech Lead', 'badge-cyan', 'Technical architectures, hands-on lab environments, and repository supervision.', '', 'SD', '', 0, 3);
  insertMember.run('student', 'Frenny Chrystal Saldanha', 'Operations & Logistics', 'Resource Head', 'badge-gold', 'Managing cloud compute budgets, venue infrastructure, and participant toolkits.', '', 'FS', '', 0, 4);
  insertMember.run('student', 'Joyline Galbao', 'Administration', 'Secretary', 'badge-gold', 'Documentation, accreditation reporting, meeting minutes, and member onboarding.', '', 'JG', '', 0, 5);
  insertMember.run('student', 'Chinthan N V', 'Creative Outreach', 'Media Head', 'badge-violet', 'Brand storytelling, photo documentation, visual design, and social publications.', '', 'CN', '', 0, 6);

  // Core Working Committee
  insertMember.run('cwc', 'Prajwal Royston Cordiero', 'AI & LLM Research Group', 'Researcher', 'badge-cyan', 'Exploring Transformer mechanics and latency benchmarks.', '', 'PR', '#22d3ee', 0, 1);
  insertMember.run('cwc', 'Chacko P Abraham', 'Model Evaluation Benchmarks', 'Benchmark Lead', 'badge-violet', 'Multi-agent consensus networks and evaluation frameworks.', '', 'CA', '#c084fc', 0, 2);
  insertMember.run('cwc', 'Alma Roxane Pereira', 'Project Operations & Labs', 'Operations Lead', 'badge-orange', 'Lab infrastructure and hands-on developer sandboxes.', '', 'AR', '#f59e0b', 0, 3);

  console.log('[DB] Default members seeded.');
}

// Seed Events if empty
const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
if (eventCount === 0) {
  const insertEvent = db.prepare(`
    INSERT INTO events (title, date, badge, badge_class, description, meta, tracks_json, leads, platform, cover_image, gallery_json, display_order, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertEvent.run(
    'Master the Future: A Hands-on GSoC & LLMs Workshop',
    'February 14, 2026',
    'FLAGSHIP MASTERCLASS',
    'badge-violet',
    'Practical masterclass on open-source Git PR workflows, Retrieval-Augmented Generation (RAG), Gemini AI, LangChain, LlamaIndex, CrewAI, and live Gradio prototyping.',
    '80 Shortlisted Students',
    null,
    null,
    null,
    '',
    '[]',
    1
  );

  insertEvent.run(
    'PROMPT OPS-2K26 Challenge',
    'March 25, 2026',
    'LIVE CONTEST',
    'badge-orange',
    'Fast-paced prompt engineering hackathon featuring automated test suites, iterative refinement, teamwork, and live algorithmic problem solving.',
    '10 Contest Photos',
    JSON.stringify(['Track 1: 1st Year Engineers', 'Track 2: 2nd Year Engineers']),
    null,
    null,
    '',
    '[]',
    2
  );

  insertEvent.run(
    'Agentforce Technical Deep-Dive',
    'August 25, 2025',
    'SYMPOSIUM KEYNOTE',
    'badge-cyan',
    'Guiding undergraduate engineers from prompt prediction to autonomous agentic architectures, Salesforce Data Cloud integration, and real-time enterprise workflows.',
    'CSE Auditorium',
    null,
    null,
    null,
    '',
    '[]',
    3
  );

  insertEvent.run(
    'Demystifying Generative Models',
    'March 18, 2026',
    'STUDENT LAB',
    'badge-green',
    'Exploring Transformer mechanics, multi-agent consensus networks, and comparative latency benchmarks.',
    null,
    null,
    'Session Leads: Prajwal Royston Cordiero & Chacko P Abraham',
    null,
    '',
    '[]',
    4
  );

  insertEvent.run(
    'Cyber Security & Career Pathways',
    'April 01, 2026',
    'SECURITY WORKSHOP',
    'badge-red',
    'Interactive demonstrations covering Shodan discovery, OSINT methods, CVE vulnerability analysis, SQL injection scenarios, and the Cyber Kill Chain.',
    null,
    null,
    null,
    null,
    '',
    '[]',
    5
  );

  insertEvent.run(
    'Hands-on Agentforce & AI Agents',
    'May 22, 2026',
    'DEVELOPER LAB',
    'badge-blue',
    'Applied development lab creating Flex Prompts, dynamic contextual Sales Email templates, and agentic AI pipelines.',
    null,
    null,
    null,
    'Platform: Salesforce Developer Sandbox',
    '',
    '[]',
    6
  );

  console.log('[DB] Default events seeded.');
}

// Seed Guests if empty
const guestCount = db.prepare('SELECT COUNT(*) as count FROM guests').get().count;
if (guestCount === 0) {
  const insertGuest = db.prepare(`
    INSERT INTO guests (initials, name, org, role, label, label_color, border_color, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertGuest.run('SR', 'Mr. Santosh Rebello', 'Salesforce', 'Guest of Honor', 'Keynote Speaker', '#22d3ee', 'rgba(139, 92, 246, 0.5)', 1);
  insertGuest.run('SP', 'Mr. Stephen Pinto', 'Salesforce & SJEC Alumnus', 'Technical Mentor', 'Alumni Guide', '#22d3ee', 'rgba(139, 92, 246, 0.5)', 2);
  insertGuest.run('RD', "Dr. Rio D'Souza", 'Principal, SJEC', 'Presidential Address', 'Patron', '#d4a84b', 'rgba(249, 115, 22, 0.5)', 3);
  insertGuest.run('MD', "Dr. Melwyn D'Souza", 'HOD, Computer Science & Engg', 'Program Chair', 'Department Head', '#a78bfa', 'rgba(139, 92, 246, 0.5)', 4);

  console.log('[DB] Default guests seeded.');
}

// Seed About Content if empty
const aboutCount = db.prepare('SELECT COUNT(*) as count FROM about_content').get().count;
if (aboutCount === 0) {
  const insertAbout = db.prepare(`
    INSERT INTO about_content (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  insertAbout.run('hero_badge', 'DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING', new Date().toISOString());
  insertAbout.run('hero_title', 'About AgentBlazer Club', new Date().toISOString());
  insertAbout.run('hero_subtitle', 'Forging Autonomous AI Leaders & Trailblazers', new Date().toISOString());
  insertAbout.run('hero_description', 'AgentBlazer Club at St Joseph Engineering College is a student-centric autonomous AI society empowering undergraduate engineers with hands-on generative intelligence pipelines, Salesforce Agentforce mastery, and industry-grade open-source workflows.', new Date().toISOString());
  insertAbout.run('inauguration_date', 'August 25, 2025', new Date().toISOString());
  insertAbout.run('inauguration_venue', 'CSE Seminar Hall, SJEC Mangaluru', new Date().toISOString());

  console.log('[DB] Default about content seeded.');
}
