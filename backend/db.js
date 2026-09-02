import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Database query adapter supporting Neon Serverless HTTPS (port 443) & PostgreSQL connection pooling
const databaseUrl = process.env.DATABASE_URL || '';
const isNeon = databaseUrl.includes('neon.tech');

let pool;
let directPgPool = null;

if (databaseUrl) {
  directPgPool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=') ? undefined : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  directPgPool.on('error', (err) => console.error('Unexpected error on idle PostgreSQL client:', err));
}

if (isNeon) {
  const neonSql = neon(databaseUrl, { fullResults: true });
  pool = {
    query: async (text, params = []) => {
      return await neonSql.query(text, params);
    },
    // Transaction support fallback using pg client pool when available
    transaction: async (callback) => {
      if (directPgPool) {
        const client = await directPgPool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback(client);
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
      // Otherwise execute via neon query adapter
      return await callback(pool);
    }
  };
} else if (directPgPool) {
  pool = directPgPool;
  pool.transaction = async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  };
} else {
  const pgPool = new pg.Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'silentsos',
    ssl: { rejectUnauthorized: false },
    max: 10
  });
  pgPool.on('error', (err) => console.error('Unexpected error on idle PostgreSQL client:', err));
  pool = pgPool;
  pool.transaction = async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  };
}

// Helper to convert camelCase to snake_case for dynamic update properties
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to convert SQLite style ? to PostgreSQL style $1, $2, $3...
function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Resilient query executor with automatic retry for transient network glitches
async function executeQueryWithRetry(fn, maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isTransient = err.message?.includes('fetch failed') ||
                          err.message?.includes('timeout') ||
                          err.message?.includes('terminated') ||
                          err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                          err.code === 'ECONNRESET' ||
                          err.code === '57P01';
      if (isTransient && attempt < maxRetries) {
        console.warn(`⚠️ Transient DB connection issue (attempt ${attempt}/${maxRetries}), retrying in ${attempt * 800}ms...`);
        await new Promise(r => setTimeout(r, attempt * 800));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// PG Wrapper queries mimicking standard methods
async function run(sql, params = []) {
  const pgSql = convertPlaceholders(sql);
  const result = await executeQueryWithRetry(() => pool.query(pgSql, params));
  return { changes: result.rowCount || 0 };
}

async function get(sql, params = []) {
  const pgSql = convertPlaceholders(sql);
  const result = await executeQueryWithRetry(() => pool.query(pgSql, params));
  return result.rows[0] || null;
}

async function all(sql, params = []) {
  const pgSql = convertPlaceholders(sql);
  const result = await executeQueryWithRetry(() => pool.query(pgSql, params));
  return result.rows || [];
}

// AES-256-CBC encryption key (32 bytes) for sensitive PII (emergency contact numbers and emails)
const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_SECRET || 'silentsos-womens-safety-secret-salt-key-2026', 'salt', 32);
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return text;
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return text;
  }
}

// Salted password hashing with backward-compatible SHA256 verification
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash.startsWith('pbkdf2:')) {
    const [, salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }
  // Legacy SHA256 fallback
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  return legacyHash === storedHash;
}

const defaultSettings = {
  gestureSensitivity: 'Medium',
  autoRepeatInterval: 5,
  photoBurstCount: 5,
  videoDuration: '1min',
  audioQuality: 'high',
  cameraPreference: 'both',
  fakeCallDisguise: false,
  stealthMode: false,
  messageTemplate: '🚨 EMERGENCY ALERT — SilentSOS\nFrom: {name}\nTime: {time}\nType: {type}\n\n📍 GPS Location: {gps_link}\n\n⚠️ Please respond immediately or call emergency services. Updates every 5 minutes until you acknowledge.',
  safetyPin: '1234',
  autoDeleteDays: 30,
  globalEmergencyEmails: ''
};

// Row mappers
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    phone: row.phone || '',
    address: row.address || '',
    bloodGroup: row.blood_group || '',
    fatherName: row.father_name || '',
    motherName: row.mother_name || '',
    role: row.role || 'user',
    disabled: row.disabled === true || row.disabled === 1,
    isSetupComplete: row.is_setup_complete === true || row.is_setup_complete === 1,
    createdAt: row.created_at ? Number(row.created_at) : null,
    updatedAt: row.updated_at ? Number(row.updated_at) : null
  };
}

function mapSettingsRow(row) {
  if (!row) return null;
  return {
    gestureSensitivity: row.gesture_sensitivity || 'Medium',
    autoRepeatInterval: row.auto_repeat_interval !== undefined && row.auto_repeat_interval !== null ? row.auto_repeat_interval : 5,
    photoBurstCount: row.photo_burst_count !== undefined && row.photo_burst_count !== null ? row.photo_burst_count : 5,
    videoDuration: row.video_duration || '1min',
    audioQuality: row.audio_quality || 'high',
    cameraPreference: row.camera_preference || 'both',
    fakeCallDisguise: row.fake_call_disguise === true || row.fake_call_disguise === 1,
    stealthMode: row.stealth_mode === true || row.stealth_mode === 1,
    messageTemplate: row.message_template || defaultSettings.messageTemplate,
    safetyPin: row.safety_pin || '1234',
    autoDeleteDays: row.auto_delete_days !== undefined && row.auto_delete_days !== null ? row.auto_delete_days : 30,
    globalEmergencyEmails: row.global_emergency_emails || ''
  };
}

function mapContactRow(row) {
  if (!row) return null;
  let preferences = { gps: true, photos: true, video: true, audio: true, message: true };
  if (row.preferences) {
    if (typeof row.preferences === 'object') {
      preferences = row.preferences;
    } else {
      try {
        preferences = JSON.parse(row.preferences);
      } catch (e) { }
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: decrypt(row.phone_enc),
    email: decrypt(row.email_enc),
    priority: row.priority || 1,
    isActive: row.is_active !== false,
    preferences
  };
}

function mapHistoryRow(row) {
  if (!row) return null;
  let evidence = { photos: 0, videos: 0, audio: 0, files: [] };
  if (row.evidence) {
    if (typeof row.evidence === 'object') {
      evidence = row.evidence;
    } else {
      try {
        evidence = JSON.parse(row.evidence);
      } catch (e) { }
    }
  }
  let contactsNotified = [];
  if (row.contacts_notified) {
    if (typeof row.contacts_notified === 'object') {
      contactsNotified = row.contacts_notified;
    } else {
      try {
        contactsNotified = JSON.parse(row.contacts_notified);
      } catch (e) { }
    }
  }
  let gpsPath = [];
  if (row.gps_path_enc) {
    try {
      gpsPath = JSON.parse(decrypt(row.gps_path_enc));
    } catch (e) { }
  }
  return {
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp ? Number(row.timestamp) : null,
    type: row.type || 'General',
    durationSeconds: row.duration_seconds || 0,
    status: row.status,
    cancellationTime: row.cancellation_time ? Number(row.cancellation_time) : null,
    resolutionTime: row.resolution_time ? Number(row.resolution_time) : null,
    evidence,
    contactsNotified,
    gpsPath
  };
}

// Complete Normalized Database Schema Setup
export async function initDb() {
  console.log('🔄 Initializing Normalized Neon PostgreSQL Schema...');

  // 1. Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      blood_group VARCHAR(50),
      father_name VARCHAR(255),
      mother_name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      disabled BOOLEAN DEFAULT FALSE,
      is_setup_complete BOOLEAN DEFAULT FALSE,
      created_at BIGINT,
      updated_at BIGINT
    )
  `);

  // Safe migrations for newly added columns
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(50);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at BIGINT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at BIGINT;`);
  } catch (e) { }

  // 2. Emergency Contacts Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      phone_enc TEXT,
      email_enc TEXT,
      priority INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT TRUE,
      preferences JSONB DEFAULT '{}'::jsonb,
      created_at BIGINT,
      updated_at BIGINT
    )
  `);

  try {
    await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;`);
    await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);
    await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_at BIGINT;`);
    await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at BIGINT;`);
  } catch (e) { }

  // 3. User Settings Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      user_id VARCHAR(255) PRIMARY KEY,
      gesture_sensitivity VARCHAR(50) DEFAULT 'Medium',
      auto_repeat_interval INTEGER DEFAULT 5,
      photo_burst_count INTEGER DEFAULT 5,
      video_duration VARCHAR(50) DEFAULT '1min',
      audio_quality VARCHAR(50) DEFAULT 'high',
      camera_preference VARCHAR(50) DEFAULT 'both',
      fake_call_disguise BOOLEAN DEFAULT FALSE,
      stealth_mode BOOLEAN DEFAULT FALSE,
      message_template TEXT,
      safety_pin VARCHAR(50) DEFAULT '1234',
      auto_delete_days INTEGER DEFAULT 30,
      global_emergency_emails TEXT,
      updated_at BIGINT
    )
  `);

  try {
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at BIGINT;`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS global_emergency_emails TEXT;`);
  } catch (e) { }

  // 4. Gesture Configurations Table (Silent Vision)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gesture_configurations (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      gesture_type VARCHAR(50) NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      calibration_status VARCHAR(50) DEFAULT 'calibrated',
      configuration JSONB DEFAULT '{}'::jsonb,
      created_at BIGINT,
      updated_at BIGINT
    )
  `);

  // 5. SOS Events / History Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS history (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      timestamp BIGINT NOT NULL,
      type VARCHAR(100) DEFAULT 'General',
      duration_seconds INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Active',
      cancellation_time BIGINT,
      resolution_time BIGINT,
      evidence JSONB DEFAULT '{}'::jsonb,
      contacts_notified JSONB DEFAULT '[]'::jsonb,
      gps_path_enc TEXT,
      created_at BIGINT,
      updated_at BIGINT
    )
  `);

  try {
    await pool.query(`ALTER TABLE history ADD COLUMN IF NOT EXISTS cancellation_time BIGINT;`);
    await pool.query(`ALTER TABLE history ADD COLUMN IF NOT EXISTS resolution_time BIGINT;`);
    await pool.query(`ALTER TABLE history ADD COLUMN IF NOT EXISTS created_at BIGINT;`);
    await pool.query(`ALTER TABLE history ADD COLUMN IF NOT EXISTS updated_at BIGINT;`);
  } catch (e) { }

  // 6. SOS Granular Locations Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sos_locations (
      id VARCHAR(255) PRIMARY KEY,
      sos_event_id VARCHAR(255) REFERENCES history(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION,
      google_maps_link TEXT,
      timestamp BIGINT NOT NULL
    )
  `);

  // 7. SOS Notifications & Delivery Logs Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sos_notifications (
      id VARCHAR(255) PRIMARY KEY,
      sos_event_id VARCHAR(255) REFERENCES history(id) ON DELETE CASCADE,
      emergency_contact_id VARCHAR(255),
      channel VARCHAR(50) NOT NULL,
      destination VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      attempted_at BIGINT,
      sent_at BIGINT,
      delivered_at BIGINT,
      failed_at BIGINT,
      error_details TEXT
    )
  `);

  // 8. Evidence Metadata Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS evidence_metadata (
      id VARCHAR(255) PRIMARY KEY,
      sos_event_id VARCHAR(255) REFERENCES history(id) ON DELETE CASCADE,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      file_url TEXT NOT NULL,
      storage_reference TEXT,
      mime_type VARCHAR(100),
      file_size BIGINT,
      encryption_status VARCHAR(50) DEFAULT 'unencrypted',
      created_at BIGINT NOT NULL
    )
  `);

  // 9. Password Resets Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      email VARCHAR(255) PRIMARY KEY,
      code_hash VARCHAR(255),
      code VARCHAR(255),
      expires_at BIGINT NOT NULL,
      created_at BIGINT
    )
  `);

  try {
    await pool.query(`ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS code_hash VARCHAR(255);`);
    await pool.query(`ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS code VARCHAR(255);`);
    await pool.query(`ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS created_at BIGINT;`);
  } catch (e) { }

  // 10. Audit Logs Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      event_type VARCHAR(100) NOT NULL,
      ip_address VARCHAR(100),
      user_agent TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at BIGINT NOT NULL
    )
  `);

  // 11. Create Performance & Relational Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_history_status ON history(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sos_locations_event ON sos_locations(sos_event_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sos_notifications_event ON sos_notifications(sos_event_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_evidence_event ON evidence_metadata(sos_event_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_gesture_user ON gesture_configurations(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);`);

  console.log('✅ Neon PostgreSQL Schema and Indexes Verified.');
  await seedAdmin();
}

async function seedAdmin() {
  const adminRow = await get(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
  if (!adminRow || parseInt(adminRow.count) === 0) {
    const adminId = 'admin-system';
    const now = Date.now();
    await run(
      `INSERT INTO users (id, email, password_hash, name, role, disabled, is_setup_complete, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, false, true, ?, ?) ON CONFLICT (id) DO NOTHING`,
      [adminId, 'admin@silentsos.com', hashPassword('admin123'), 'System Administrator', 'admin', now, now]
    );
    await run(
      `INSERT INTO settings (
        user_id, gesture_sensitivity, auto_repeat_interval, photo_burst_count, 
        video_duration, audio_quality, camera_preference, fake_call_disguise, 
        stealth_mode, message_template, safety_pin, auto_delete_days, global_emergency_emails, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, false, false, ?, ?, ?, '', ?) ON CONFLICT (user_id) DO NOTHING`,
      [
        adminId,
        defaultSettings.gestureSensitivity,
        defaultSettings.autoRepeatInterval,
        defaultSettings.photoBurstCount,
        defaultSettings.videoDuration,
        defaultSettings.audioQuality,
        defaultSettings.cameraPreference,
        defaultSettings.messageTemplate,
        defaultSettings.safetyPin,
        defaultSettings.autoDeleteDays,
        now
      ]
    );
    console.log('✉️ Seeded default admin account: admin@silentsos.com (pwd: admin123)');
  }

  const userToPromote = await get(`SELECT * FROM users WHERE LOWER(email) = ?`, ['harshavardhanreddy1910848@gmail.com']);
  if (userToPromote && userToPromote.role !== 'admin') {
    await run(`UPDATE users SET role = 'admin', updated_at = ? WHERE LOWER(email) = ?`, [Date.now(), 'harshavardhanreddy1910848@gmail.com']);
    console.log('✉️ Automatically promoted harshavardhanreddy1910848@gmail.com to administrator');
  }
}

// Exported Database API
export const db = {
  // Direct Transaction execution helper
  async transaction(callback) {
    if (pool.transaction) {
      return await pool.transaction(callback);
    }
    return await callback(pool);
  },

  // Authentication & Users
  async registerUser(email, password, name) {
    const existing = await get(`SELECT id FROM users WHERE LOWER(email) = ?`, [email.toLowerCase().trim()]);
    if (existing) {
      throw new Error('User already exists with this email address');
    }
    const userId = Date.now().toString();
    const hash = hashPassword(password);
    const now = Date.now();

    await run(
      `INSERT INTO users (id, email, password_hash, name, role, disabled, is_setup_complete, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 'user', false, false, ?, ?)`,
      [userId, email.toLowerCase().trim(), hash, name || '', now, now]
    );

    await run(
      `INSERT INTO settings (
        user_id, gesture_sensitivity, auto_repeat_interval, photo_burst_count, 
        video_duration, audio_quality, camera_preference, fake_call_disguise, 
        stealth_mode, message_template, safety_pin, auto_delete_days, global_emergency_emails, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, false, false, ?, ?, ?, '', ?)`,
      [
        userId,
        defaultSettings.gestureSensitivity,
        defaultSettings.autoRepeatInterval,
        defaultSettings.photoBurstCount,
        defaultSettings.videoDuration,
        defaultSettings.audioQuality,
        defaultSettings.cameraPreference,
        defaultSettings.messageTemplate,
        defaultSettings.safetyPin,
        defaultSettings.autoDeleteDays,
        now
      ]
    );

    // Default gesture configurations
    await run(
      `INSERT INTO gesture_configurations (id, user_id, gesture_type, enabled, calibration_status, configuration, created_at, updated_at)
       VALUES (?, ?, 'both', true, 'calibrated', '{"sensitivity": "Medium"}'::jsonb, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [`gesture-${userId}`, userId, now, now]
    );

    await this.logAudit(userId, 'REGISTER', { email: email.toLowerCase().trim() });
    return this.getUser(userId);
  },

  async authenticateUser(email, password) {
    const row = await get(`SELECT * FROM users WHERE LOWER(email) = ?`, [email.toLowerCase().trim()]);
    if (!row) {
      throw new Error('Invalid email or password');
    }
    if (!verifyPassword(password, row.password_hash)) {
      throw new Error('Invalid email or password');
    }
    // Upgrade legacy password hash to pbkdf2 if needed
    if (!row.password_hash.startsWith('pbkdf2:')) {
      await run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [hashPassword(password), Date.now(), row.id]);
    }
    await this.logAudit(row.id, 'LOGIN', { email: row.email });
    return mapUserRow(row);
  },

  async getUserByEmail(email) {
    const row = await get(`SELECT * FROM users WHERE LOWER(email) = ?`, [email.toLowerCase().trim()]);
    return mapUserRow(row);
  },

  async getUser(userId) {
    const row = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
    return mapUserRow(row);
  },

  async updateUserProfile(userId, updates) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return this.getUser(userId);
    const dbUpdates = { ...updates, updated_at: Date.now() };
    const setKeys = Object.keys(dbUpdates);
    const pgKeys = setKeys.map(camelToSnake);
    const setClause = pgKeys.map((k) => `${k} = ?`).join(', ');
    const params = [...setKeys.map(k => dbUpdates[k]), userId];

    await run(`UPDATE users SET ${setClause} WHERE id = ?`, params);
    await this.logAudit(userId, 'PROFILE_UPDATE', { updatedFields: keys });
    return this.getUser(userId);
  },

  // Password Reset / Forgot Password
  async createPasswordReset(email, code, expiresAt) {
    const lowerEmail = email.toLowerCase().trim();
    const codeStr = String(code).trim();
    const codeHash = crypto.createHash('sha256').update(codeStr).digest('hex');
    const now = Date.now();

    await run(
      `INSERT INTO password_resets (email, code_hash, code, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET 
         code_hash = EXCLUDED.code_hash, 
         code = EXCLUDED.code, 
         expires_at = EXCLUDED.expires_at, 
         created_at = EXCLUDED.created_at`,
      [lowerEmail, codeHash, codeStr, expiresAt, now]
    );
    return true;
  },

  async verifyAndResetPassword(email, code, newPassword) {
    const lowerEmail = email.toLowerCase().trim();
    const user = await get(`SELECT id FROM users WHERE LOWER(email) = ?`, [lowerEmail]);
    if (!user) {
      throw new Error('User with this email does not exist');
    }

    const resetRecord = await get(`SELECT * FROM password_resets WHERE LOWER(email) = ?`, [lowerEmail]);
    if (!resetRecord) {
      throw new Error('No password reset requested or verification code expired');
    }

    const codeStr = String(code).trim();
    const givenCodeHash = crypto.createHash('sha256').update(codeStr).digest('hex');
    const matches = (resetRecord.code_hash && resetRecord.code_hash === givenCodeHash) ||
                    (resetRecord.code && String(resetRecord.code).trim() === codeStr);

    if (!matches) {
      throw new Error('Invalid verification code. Please check your email.');
    }

    if (Number(resetRecord.expires_at) < Date.now()) {
      await run(`DELETE FROM password_resets WHERE LOWER(email) = ?`, [lowerEmail]);
      throw new Error('Verification code has expired. Please request a new one.');
    }

    const newHash = hashPassword(newPassword);
    await run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE LOWER(email) = ?`, [newHash, Date.now(), lowerEmail]);
    await run(`DELETE FROM password_resets WHERE LOWER(email) = ?`, [lowerEmail]);
    await this.logAudit(user.id, 'PASSWORD_RESET', { method: 'VERIFICATION_CODE' });
    return this.getUser(user.id);
  },

  async resetPassword(email, newPassword) {
    const lowerEmail = email.toLowerCase().trim();
    const user = await get(`SELECT id FROM users WHERE LOWER(email) = ?`, [lowerEmail]);
    if (!user) {
      throw new Error('User with this email does not exist');
    }
    const newHash = hashPassword(newPassword);
    await run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE LOWER(email) = ?`, [newHash, Date.now(), lowerEmail]);
    await this.logAudit(user.id, 'PASSWORD_RESET', { method: 'DIRECT' });
    return this.getUser(user.id);
  },

  // Emergency Contacts
  async getContacts(userId) {
    const rows = await all(`SELECT * FROM contacts WHERE user_id = ? ORDER BY priority ASC, created_at ASC`, [userId]);
    return rows.map(mapContactRow);
  },

  async addContact(userId, contact) {
    const contactId = contact.id || Date.now().toString();
    const phoneEnc = encrypt(contact.phone || '');
    const emailEnc = encrypt(contact.email || '');
    const prefStr = JSON.stringify(contact.preferences || { gps: true, photos: true, video: true, audio: true, message: true });
    const priority = contact.priority || 1;
    const now = Date.now();

    await run(
      `INSERT INTO contacts (id, user_id, name, phone_enc, email_enc, priority, is_active, preferences, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, true, ?, ?, ?)`,
      [contactId, userId, contact.name, phoneEnc, emailEnc, priority, prefStr, now, now]
    );
    await this.logAudit(userId, 'CONTACT_ADD', { contactId, name: contact.name });
    return this.getContacts(userId);
  },

  async updateContact(userId, contactId, updates) {
    const row = await get(`SELECT * FROM contacts WHERE id = ? AND user_id = ?`, [contactId, userId]);
    if (!row) return this.getContacts(userId);

    const name = updates.name !== undefined ? updates.name : row.name;
    const phoneEnc = updates.phone ? encrypt(updates.phone) : row.phone_enc;
    const emailEnc = updates.email ? encrypt(updates.email) : row.email_enc;
    const priority = updates.priority !== undefined ? updates.priority : row.priority;
    const isActive = updates.isActive !== undefined ? updates.isActive : row.is_active;

    let preferences = row.preferences;
    if (updates.preferences) {
      preferences = JSON.stringify(updates.preferences);
    } else if (typeof row.preferences === 'object' && row.preferences !== null) {
      preferences = JSON.stringify(row.preferences);
    }

    await run(
      `UPDATE contacts SET name = ?, phone_enc = ?, email_enc = ?, priority = ?, is_active = ?, preferences = ?, updated_at = ? 
       WHERE id = ? AND user_id = ?`,
      [name, phoneEnc, emailEnc, priority, isActive, preferences, Date.now(), contactId, userId]
    );
    await this.logAudit(userId, 'CONTACT_UPDATE', { contactId });
    return this.getContacts(userId);
  },

  async removeContact(userId, contactId) {
    await run(`DELETE FROM contacts WHERE id = ? AND user_id = ?`, [contactId, userId]);
    await this.logAudit(userId, 'CONTACT_DELETE', { contactId });
    return this.getContacts(userId);
  },

  // Settings
  async getSettings(userId) {
    const row = await get(`SELECT * FROM settings WHERE user_id = ?`, [userId]);
    if (!row) {
      return { ...defaultSettings };
    }
    return mapSettingsRow(row);
  },

  async updateSettings(userId, updates) {
    const current = await get(`SELECT * FROM settings WHERE user_id = ?`, [userId]);
    const merged = { ...defaultSettings, ...mapSettingsRow(current), ...updates };
    const now = Date.now();

    await run(
      `INSERT INTO settings (
        user_id, gesture_sensitivity, auto_repeat_interval, photo_burst_count, 
        video_duration, audio_quality, camera_preference, fake_call_disguise, 
        stealth_mode, message_template, safety_pin, auto_delete_days, global_emergency_emails, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         gesture_sensitivity = EXCLUDED.gesture_sensitivity,
         auto_repeat_interval = EXCLUDED.auto_repeat_interval,
         photo_burst_count = EXCLUDED.photo_burst_count,
         video_duration = EXCLUDED.video_duration,
         audio_quality = EXCLUDED.audio_quality,
         camera_preference = EXCLUDED.camera_preference,
         fake_call_disguise = EXCLUDED.fake_call_disguise,
         stealth_mode = EXCLUDED.stealth_mode,
         message_template = EXCLUDED.message_template,
         safety_pin = EXCLUDED.safety_pin,
         auto_delete_days = EXCLUDED.auto_delete_days,
         global_emergency_emails = EXCLUDED.global_emergency_emails,
         updated_at = EXCLUDED.updated_at`,
      [
        userId,
        merged.gestureSensitivity,
        merged.autoRepeatInterval,
        merged.photoBurstCount,
        merged.videoDuration,
        merged.audioQuality,
        merged.cameraPreference,
        merged.fakeCallDisguise,
        merged.stealthMode,
        merged.messageTemplate,
        merged.safetyPin,
        merged.autoDeleteDays,
        merged.globalEmergencyEmails || '',
        now
      ]
    );
    await this.logAudit(userId, 'SETTINGS_UPDATE', { updatedKeys: Object.keys(updates) });
    return this.getSettings(userId);
  },

  // Gesture Configurations
  async getGestureConfig(userId) {
    const row = await get(`SELECT * FROM gesture_configurations WHERE user_id = ?`, [userId]);
    if (!row) {
      return { gestureType: 'both', enabled: true, calibrationStatus: 'calibrated', configuration: { sensitivity: 'Medium' } };
    }
    return {
      id: row.id,
      userId: row.user_id,
      gestureType: row.gesture_type,
      enabled: row.enabled,
      calibrationStatus: row.calibration_status,
      configuration: row.configuration
    };
  },

  async saveGestureConfig(userId, config) {
    const id = `gesture-${userId}`;
    const now = Date.now();
    const configJson = JSON.stringify(config.configuration || { sensitivity: 'Medium' });
    await run(
      `INSERT INTO gesture_configurations (id, user_id, gesture_type, enabled, calibration_status, configuration, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         gesture_type = EXCLUDED.gesture_type,
         enabled = EXCLUDED.enabled,
         calibration_status = EXCLUDED.calibration_status,
         configuration = EXCLUDED.configuration,
         updated_at = EXCLUDED.updated_at`,
      [id, userId, config.gestureType || 'both', config.enabled !== false, config.calibrationStatus || 'calibrated', configJson, now, now]
    );
    return this.getGestureConfig(userId);
  },

  // SOS Events & History
  async getHistory(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const rows = await all(
      `SELECT * FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows.map(mapHistoryRow);
  },

  async addHistoryEvent(userId, event) {
    const evidenceStr = JSON.stringify(event.evidence || { photos: 0, videos: 0, audio: 0, files: [] });
    const notifyStr = JSON.stringify(event.contactsNotified || []);
    const gpsPathEnc = encrypt(JSON.stringify(event.gpsPath || []));
    const now = Date.now();

    // Perform atomic transaction: insert event, insert initial location, insert notification attempts
    await run(
      `INSERT INTO history (id, user_id, timestamp, type, duration_seconds, status, evidence, contacts_notified, gps_path_enc, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         duration_seconds = EXCLUDED.duration_seconds,
         status = EXCLUDED.status,
         evidence = EXCLUDED.evidence,
         contacts_notified = EXCLUDED.contacts_notified,
         gps_path_enc = EXCLUDED.gps_path_enc,
         updated_at = EXCLUDED.updated_at`,
      [
        event.id,
        userId,
        event.timestamp ? BigInt(event.timestamp) : BigInt(now),
        event.type || 'General',
        event.durationSeconds || 0,
        event.status || 'Active',
        evidenceStr,
        notifyStr,
        gpsPathEnc,
        now,
        now
      ]
    );

    // Save initial coordinates into normalized sos_locations table
    if (event.gpsPath && event.gpsPath.length > 0) {
      for (const pt of event.gpsPath) {
        const locId = `${event.id}-loc-${pt.timestamp || now}`;
        await run(
          `INSERT INTO sos_locations (id, sos_event_id, latitude, longitude, accuracy, google_maps_link, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [locId, event.id, pt.lat, pt.lng, pt.accuracy || null, pt.googleMapsLink || `https://maps.google.com/?q=${pt.lat},${pt.lng}`, pt.timestamp || now]
        );
      }
    }

    // Save dispatch logs into normalized sos_notifications table
    if (event.contactsNotified && Array.isArray(event.contactsNotified)) {
      for (const n of event.contactsNotified) {
        if (n.channels) {
          for (const [channelName, ch] of Object.entries(n.channels)) {
            const notifId = `${event.id}-${n.contactId}-${channelName}`;
            await run(
              `INSERT INTO sos_notifications (id, sos_event_id, emergency_contact_id, channel, destination, status, attempted_at, sent_at, error_details)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, sent_at = EXCLUDED.sent_at`,
              [
                notifId,
                event.id,
                n.contactId,
                channelName,
                n.email || n.phone || '',
                ch.status || 'Delivered',
                ch.timestamp || now,
                ch.timestamp || now,
                null
              ]
            );
          }
        }
      }
    }

    await this.logAudit(userId, 'SOS_TRIGGERED', { alertId: event.id, type: event.type });
    return this.getHistory(userId);
  },

  async addGpsLocation(alertId, lat, lng, timestamp = Date.now(), accuracy = null) {
    const locId = `${alertId}-loc-${timestamp}`;
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    await run(
      `INSERT INTO sos_locations (id, sos_event_id, latitude, longitude, accuracy, google_maps_link, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [locId, alertId, lat, lng, accuracy, mapsLink, timestamp]
    );
  },

  async recordEvidenceMetadata(alertId, userId, type, fileUrl, storageRef = null, mimeType = null, fileSize = null) {
    const id = `${alertId}-ev-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    await run(
      `INSERT INTO evidence_metadata (id, sos_event_id, user_id, type, file_url, storage_reference, mime_type, file_size, encryption_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unencrypted', ?)`,
      [id, alertId, userId, type, fileUrl, storageRef || fileUrl, mimeType, fileSize, Date.now()]
    );
  },

  async updateNotificationStatus(alertId, contactId, channel, status, errorDetails = null) {
    const notifId = `${alertId}-${contactId}-${channel}`;
    const now = Date.now();
    const sentAt = status === 'SENT' || status === 'DELIVERED' ? now : null;
    const deliveredAt = status === 'DELIVERED' ? now : null;
    const failedAt = status === 'FAILED' ? now : null;

    await run(
      `INSERT INTO sos_notifications (id, sos_event_id, emergency_contact_id, channel, status, attempted_at, sent_at, delivered_at, failed_at, error_details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET 
         status = EXCLUDED.status, 
         sent_at = COALESCE(EXCLUDED.sent_at, sos_notifications.sent_at),
         delivered_at = COALESCE(EXCLUDED.delivered_at, sos_notifications.delivered_at),
         failed_at = COALESCE(EXCLUDED.failed_at, sos_notifications.failed_at),
         error_details = EXCLUDED.error_details`,
      [notifId, alertId, contactId, channel, status, now, sentAt, deliveredAt, failedAt, errorDetails]
    );
  },

  async getNotificationStatuses(alertId) {
    return await all(`SELECT * FROM sos_notifications WHERE sos_event_id = ?`, [alertId]);
  },

  async updateHistoryEvent(alertId, updates) {
    const row = await get(`SELECT * FROM history WHERE id = ?`, [alertId]);
    if (!row) return;

    const durationSeconds = updates.durationSeconds !== undefined ? updates.durationSeconds : row.duration_seconds;
    const status = updates.status || row.status;
    const cancellationTime = updates.cancellationTime || (status === 'Cancelled' ? Date.now() : row.cancellation_time);
    const resolutionTime = updates.resolutionTime || (status === 'Sent' || status === 'Resolved' ? Date.now() : row.resolution_time);

    let evidence = row.evidence;
    if (updates.evidence) {
      evidence = JSON.stringify(updates.evidence);
    } else if (typeof row.evidence === 'object' && row.evidence !== null) {
      evidence = JSON.stringify(row.evidence);
    }

    let contactsNotified = row.contacts_notified;
    if (updates.contactsNotified) {
      contactsNotified = JSON.stringify(updates.contactsNotified);
    } else if (typeof row.contacts_notified === 'object' && row.contacts_notified !== null) {
      contactsNotified = JSON.stringify(row.contacts_notified);
    }

    const gpsPathEnc = updates.gpsPath ? encrypt(JSON.stringify(updates.gpsPath)) : row.gps_path_enc;

    await run(
      `UPDATE history SET duration_seconds = ?, status = ?, cancellation_time = ?, resolution_time = ?, evidence = ?, contacts_notified = ?, gps_path_enc = ?, updated_at = ? WHERE id = ?`,
      [durationSeconds, status, cancellationTime, resolutionTime, evidence, contactsNotified, gpsPathEnc, Date.now(), alertId]
    );

    if (status === 'Cancelled') {
      await this.logAudit(row.user_id, 'SOS_CANCELLED', { alertId });
    } else if (status === 'Sent' || status === 'Resolved') {
      await this.logAudit(row.user_id, 'SOS_RESOLVED', { alertId, durationSeconds });
    }
  },

  async removeHistoryEvent(userId, alertId) {
    const row = await get(`SELECT evidence FROM history WHERE id = ? AND user_id = ?`, [alertId, userId]);
    if (row && row.evidence) {
      try {
        let evidence = row.evidence;
        if (typeof evidence === 'string') evidence = JSON.parse(evidence);
        if (evidence && evidence.files) {
          evidence.files.forEach(file => {
            const fileName = path.basename(file.url);
            const fullPath = path.join(__dirname, 'evidence', fileName);
            if (fs.existsSync(fullPath)) {
              try { fs.unlinkSync(fullPath); } catch (err) { }
            }
          });
        }
      } catch (e) { }
    }

    await run(`DELETE FROM evidence_metadata WHERE sos_event_id = ?`, [alertId]);
    await run(`DELETE FROM sos_locations WHERE sos_event_id = ?`, [alertId]);
    await run(`DELETE FROM sos_notifications WHERE sos_event_id = ?`, [alertId]);
    await run(`DELETE FROM history WHERE id = ? AND user_id = ?`, [alertId, userId]);
    await this.logAudit(userId, 'SOS_DELETED', { alertId });
    return this.getHistory(userId);
  },

  async clearUserData(userId) {
    await run(`DELETE FROM contacts WHERE user_id = ?`, [userId]);
    const rows = await all(`SELECT evidence FROM history WHERE user_id = ?`, [userId]);
    for (const row of rows) {
      if (row.evidence) {
        try {
          let evidence = row.evidence;
          if (typeof evidence === 'string') evidence = JSON.parse(evidence);
          if (evidence.files) {
            evidence.files.forEach(file => {
              const fileName = path.basename(file.url);
              const fullPath = path.join(__dirname, 'evidence', fileName);
              if (fs.existsSync(fullPath)) {
                try { fs.unlinkSync(fullPath); } catch (e) { }
              }
            });
          }
        } catch (e) { }
      }
    }

    await run(`DELETE FROM evidence_metadata WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM history WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM gesture_configurations WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM settings WHERE user_id = ?`, [userId]);
    await run(`UPDATE users SET is_setup_complete = false, updated_at = ? WHERE id = ?`, [Date.now(), userId]);
    await this.logAudit(userId, 'USER_DATA_CLEARED', {});
  },

  async getAllHistory(page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    const rows = await all(`SELECT * FROM history ORDER BY timestamp DESC LIMIT ? OFFSET ?`, [limit, offset]);
    return rows.map(mapHistoryRow);
  },

  async getAllUsers() {
    const rows = await all(`SELECT * FROM users ORDER BY created_at DESC`);
    return rows.map(mapUserRow);
  },

  async adminUpdateUser(userId, updates) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return this.getUser(userId);

    const dbUpdates = { ...updates, updated_at: Date.now() };
    if (updates.password) {
      dbUpdates.password_hash = hashPassword(updates.password);
      delete dbUpdates.password;
    }

    const setKeys = Object.keys(dbUpdates);
    const pgKeys = setKeys.map(camelToSnake);
    const setClause = pgKeys.map((k) => `${k} = ?`).join(', ');
    const params = [...setKeys.map(k => dbUpdates[k]), userId];

    await run(`UPDATE users SET ${setClause} WHERE id = ?`, params);
    await this.logAudit('ADMIN', 'USER_UPDATE_BY_ADMIN', { targetUserId: userId, updatedFields: keys });
    return this.getUser(userId);
  },

  async deleteUser(userId) {
    await run(`DELETE FROM evidence_metadata WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM gesture_configurations WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM contacts WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM settings WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM history WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM users WHERE id = ?`, [userId]);
    await this.logAudit('ADMIN', 'USER_DELETED_BY_ADMIN', { targetUserId: userId });
    return true;
  },

  // Audit Logging
  async logAudit(userId, eventType, metadata = {}, ipAddress = null, userAgent = null) {
    try {
      const id = `audit-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const metaJson = JSON.stringify(metadata || {});
      await run(
        `INSERT INTO audit_logs (id, user_id, event_type, ip_address, user_agent, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId || 'ANONYMOUS', eventType, ipAddress, userAgent, metaJson, Date.now()]
      );
    } catch (e) {
      console.warn('Failed to write audit log:', e.message);
    }
  },

  async getAuditLogs(userId = null, limit = 100) {
    if (userId) {
      return await all(`SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [userId, limit]);
    }
    return await all(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`, [limit]);
  }
};
