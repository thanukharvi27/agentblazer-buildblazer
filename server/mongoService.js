import { MongoClient } from 'mongodb';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {
    // ignore
  }
}

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'agentblazer';
const COLLECTION_NAME = 'approved_members';

let client = null;
let db = null;

/**
 * Connect to MongoDB Atlas. Called once at server startup.
 */
export async function connectMongo() {
  if (!MONGODB_URI) {
    console.warn('[MongoDB] MONGODB_URI not set — approved members will NOT be stored in MongoDB.');
    return false;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);

    // Ensure unique index on email to prevent duplicates
    await db.collection(COLLECTION_NAME).createIndex({ email: 1 }, { unique: true });

    console.log('[MongoDB] Connected to Atlas — approved members will be stored in MongoDB.');
    return true;
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    return false;
  }
}

/**
 * Save an approved member to MongoDB.
 * @param {Object} application - { id, name, email, year, message, created_at }
 */
export async function saveApprovedMember(application) {
  if (!db) {
    console.warn('[MongoDB] Not connected — skipping save for approved member.');
    return null;
  }

  const doc = {
    name: application.name,
    email: application.email,
    year: application.year,
    message: application.message || '',
    status: 'approved',
    approved_at: new Date().toISOString(),
    application_submitted_at: application.created_at,
  };

  try {
    const result = await db.collection(COLLECTION_NAME).updateOne(
      { email: doc.email },
      { $set: doc },
      { upsert: true }
    );
    console.log(`[MongoDB] Approved member saved: ${doc.name} <${doc.email}>`);
    return result;
  } catch (err) {
    console.error('[MongoDB] Failed to save approved member:', err.message);
    return null;
  }
}

/**
 * Remove a member from MongoDB (e.g. when status is changed back from approved).
 * @param {string} email
 */
export async function removeApprovedMember(email) {
  if (!db) return null;

  try {
    const result = await db.collection(COLLECTION_NAME).deleteOne({ email });
    if (result.deletedCount > 0) {
      console.log(`[MongoDB] Removed member: ${email}`);
    }
    return result;
  } catch (err) {
    console.error('[MongoDB] Failed to remove member:', err.message);
    return null;
  }
}

/**
 * Get all approved members from MongoDB.
 */
export async function getApprovedMembers() {
  if (!db) return [];

  try {
    return await db.collection(COLLECTION_NAME).find({}).sort({ approved_at: -1 }).toArray();
  } catch (err) {
    console.error('[MongoDB] Failed to fetch approved members:', err.message);
    return [];
  }
}

/**
 * Check if MongoDB is connected and operational.
 */
export function isMongoConnected() {
  return db !== null;
}
