import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize Neon PostgreSQL Connection Pool (Exclusive Cloud Database)
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_4wbWrnqgNc3V@ep-cool-grass-aorbu4fo-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const connectionConfig = {
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
};

export const pool = new pg.Pool(connectionConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle Neon PostgreSQL client:', err);
});

// Helper to convert camelCase to snake_case for dynamic update properties
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// AES-256-CBC encryption key (32 bytes)
const ENCRYPTION_KEY = crypto.scryptSync('silentsos-womens-safety-secret-salt-key-2026', 'salt', 32);
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, returning input text:', err.message);
    return text;
  }
}

// Password hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
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

// Map database row models to standard JS objects matching application signatures
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role || 'user',
    disabled: row.disabled === true,
    isSetupComplete: row.is_setup_complete === true,
    phone: row.phone_enc ? decrypt(row.phone_enc) : '',
    bloodGroup: row.blood_group || '',
    homeAddress: row.home_address || '',
    emergencyNotes: row.emergency_notes || ''
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
    fakeCallDisguise: row.fake_call_disguise === true,
    stealthMode: row.stealth_mode === true,
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
      } catch (e) {}
    }
  }
  return {
    id: row.id,
    name: row.name,
    phone: decrypt(row.phone_enc),
    email: decrypt(row.email_enc),
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
      } catch (e) {}
    }
  }
  let contactsNotified = [];
  if (row.contacts_notified) {
    if (typeof row.contacts_notified === 'object') {
      contactsNotified = row.contacts_notified;
    } else {
      try {
        contactsNotified = JSON.parse(row.contacts_notified);
      } catch (e) {}
    }
  }
  let gpsPath = [];
  if (row.gps_path_enc) {
    try {
      gpsPath = JSON.parse(decrypt(row.gps_path_enc));
    } catch (e) {}
  }
  return {
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp ? Number(row.timestamp) : null,
    type: row.type || 'General',
    durationSeconds: row.duration_seconds || 0,
    status: row.status,
    evidence,
    contactsNotified,
    gpsPath
  };
}

// Database schema table setup
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      name VARCHAR(255),
      role VARCHAR(50),
      disabled BOOLEAN DEFAULT FALSE,
      is_setup_complete BOOLEAN DEFAULT FALSE,
      phone_enc TEXT,
      blood_group VARCHAR(20),
      home_address TEXT,
      emergency_notes TEXT
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_enc TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20);`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_notes TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255),
      phone_enc TEXT,
      email_enc TEXT,
      preferences JSONB
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      user_id VARCHAR(255) PRIMARY KEY,
      gesture_sensitivity VARCHAR(50),
      auto_repeat_interval INTEGER,
      photo_burst_count INTEGER,
      video_duration VARCHAR(50),
      audio_quality VARCHAR(50),
      camera_preference VARCHAR(50),
      fake_call_disguise BOOLEAN DEFAULT FALSE,
      stealth_mode BOOLEAN DEFAULT FALSE,
      message_template TEXT,
      safety_pin VARCHAR(50),
      auto_delete_days INTEGER,
      global_emergency_emails TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS history (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      timestamp BIGINT,
      type VARCHAR(100),
      duration_seconds INTEGER,
      status VARCHAR(50),
      evidence JSONB,
      contacts_notified JSONB,
      gps_path_enc TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      type VARCHAR(50) DEFAULT 'feedback',
      rating INTEGER DEFAULT 5,
      subject VARCHAR(255),
      message TEXT,
      status VARCHAR(50) DEFAULT 'open',
      admin_response TEXT DEFAULT '',
      created_at BIGINT,
      updated_at BIGINT
    )
  `);

  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'feedback';`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS subject VARCHAR(255);`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS message TEXT;`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open';`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_response TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS created_at BIGINT;`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_at BIGINT;`);

  await seedAdmin();
}

async function seedAdmin() {
  const adminRes = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
  if (!adminRes.rows[0] || parseInt(adminRes.rows[0].count) === 0) {
    const adminId = 'admin-system';
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, disabled, is_setup_complete) 
       VALUES ($1, $2, $3, $4, $5, false, true) ON CONFLICT (id) DO NOTHING`,
      [adminId, 'admin@silentsos.com', hashPassword('admin123'), 'System Administrator', 'admin']
    );
    await pool.query(
      `INSERT INTO settings (
        user_id, gesture_sensitivity, auto_repeat_interval, photo_burst_count, 
        video_duration, audio_quality, camera_preference, fake_call_disguise, 
        stealth_mode, message_template, safety_pin, auto_delete_days, global_emergency_emails
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, $8, $9, $10, '') ON CONFLICT (user_id) DO NOTHING`,
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
        defaultSettings.autoDeleteDays
      ]
    );
    console.log('✉️ Seeded default admin account: admin@silentsos.com (pwd: admin123)');
  }

  const userToPromoteRes = await pool.query(`SELECT * FROM users WHERE LOWER(email) = $1`, ['harshavardhanreddy1910848@gmail.com']);
  if (userToPromoteRes.rows[0] && userToPromoteRes.rows[0].role !== 'admin') {
    await pool.query(`UPDATE users SET role = 'admin' WHERE LOWER(email) = $1`, ['harshavardhanreddy1910848@gmail.com']);
    console.log('✉️ Automatically promoted harshavardhanreddy1910848@gmail.com to administrator');
  }
}

// Exported Pure PostgreSQL Database methods
export const db = {
  // Authentication methods
  async registerUser(email, password, name) {
    const existingRes = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [email.toLowerCase()]);
    if (existingRes.rows.length > 0) {
      throw new Error('User already exists');
    }
    const userId = Date.now().toString();
    const hash = hashPassword(password);
    
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, disabled, is_setup_complete) VALUES ($1, $2, $3, $4, 'user', false, false)`,
      [userId, email.toLowerCase(), hash, name || '']
    );
    await pool.query(
      `INSERT INTO settings (
        user_id, gesture_sensitivity, auto_repeat_interval, photo_burst_count, 
        video_duration, audio_quality, camera_preference, fake_call_disguise, 
        stealth_mode, message_template, safety_pin, auto_delete_days, global_emergency_emails
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, $8, $9, $10, '')`,
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
        defaultSettings.autoDeleteDays
      ]
    );
    return this.getUser(userId);
  },

  async authenticateUser(email, password) {
    const res = await pool.query(
      `SELECT * FROM users WHERE LOWER(email) = $1 AND password_hash = $2`,
      [email.toLowerCase(), hashPassword(password)]
    );
    if (!res.rows[0]) {
      throw new Error('Invalid email or password');
    }
    return mapUserRow(res.rows[0]);
  },

  async resetPassword(email, newPassword) {
    const userRes = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [email.toLowerCase()]);
    if (!userRes.rows[0]) {
      throw new Error('User with this email does not exist');
    }
    await pool.query(`UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2`, [hashPassword(newPassword), email.toLowerCase()]);
    return this.getUser(userRes.rows[0].id);
  },

  async getUser(userId) {
    const res = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    return mapUserRow(res.rows[0]);
  },

  async updateUserProfile(userId, updates) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return this.getUser(userId);

    const dbUpdates = { ...updates };
    if (updates.phone !== undefined) {
      dbUpdates.phone_enc = updates.phone ? encrypt(updates.phone) : '';
      delete dbUpdates.phone;
    }

    const setKeys = Object.keys(dbUpdates);
    const pgKeys = setKeys.map(camelToSnake);
    const setClause = pgKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const params = [
      ...setKeys.map(k => dbUpdates[k]),
      userId
    ];
    await pool.query(`UPDATE users SET ${setClause} WHERE id = $${setKeys.length + 1}`, params);
    return this.getUser(userId);
  },

  // Contacts
  async getContacts(userId) {
    const res = await pool.query(`SELECT * FROM contacts WHERE user_id = $1`, [userId]);
    return res.rows.map(mapContactRow);
  },

  async addContact(userId, contact) {
    const contactId = contact.id || Date.now().toString();
    const phoneEnc = encrypt(contact.phone);
    const emailEnc = encrypt(contact.email);
    const prefStr = JSON.stringify(contact.preferences || {});

    await pool.query(
      `INSERT INTO contacts (id, user_id, name, phone_enc, email_enc, preferences) VALUES ($1, $2, $3, $4, $5, $6)`,
      [contactId, userId, contact.name, phoneEnc, emailEnc, prefStr]
    );
    return this.getContacts(userId);
  },

  async updateContact(userId, contactId, updates) {
    const res = await pool.query(`SELECT * FROM contacts WHERE id = $1 AND user_id = $2`, [contactId, userId]);
    const row = res.rows[0];
    if (!row) return this.getContacts(userId);

    const name = updates.name !== undefined ? updates.name : row.name;
    const phoneEnc = updates.phone ? encrypt(updates.phone) : row.phone_enc;
    const emailEnc = updates.email ? encrypt(updates.email) : row.email_enc;
    
    let preferences = row.preferences;
    if (updates.preferences) {
      preferences = JSON.stringify(updates.preferences);
    } else if (typeof row.preferences === 'object' && row.preferences !== null) {
      preferences = JSON.stringify(row.preferences);
    }

    await pool.query(
      `UPDATE contacts SET name = $1, phone_enc = $2, email_enc = $3, preferences = $4 WHERE id = $5 AND user_id = $6`,
      [name, phoneEnc, emailEnc, preferences, contactId, userId]
    );
    return this.getContacts(userId);
  },

  async removeContact(userId, contactId) {
    await pool.query(`DELETE FROM contacts WHERE id = $1 AND user_id = $2`, [contactId, userId]);
    return this.getContacts(userId);
  },

  // Settings
  async getSettings(userId) {
    const res = await pool.query(`SELECT * FROM settings WHERE user_id = $1`, [userId]);
    const row = res.rows[0];
    if (!row) {
      return { ...defaultSettings };
    }
    return mapSettingsRow(row);
  },

  async updateSettings(userId, updates) {
    const currentRes = await pool.query(`SELECT * FROM settings WHERE user_id = $1`, [userId]);
    const current = currentRes.rows[0];
    const merged = { ...defaultSettings, ...mapSettingsRow(current), ...updates };

    await pool.query(
      `INSERT INTO settings (
        user_id, gesture_sensitivity, auto_repeat_interval, photo_burst_count, 
        video_duration, audio_quality, camera_preference, fake_call_disguise, 
        stealth_mode, message_template, safety_pin, auto_delete_days, global_emergency_emails
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
         global_emergency_emails = EXCLUDED.global_emergency_emails`,
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
        merged.globalEmergencyEmails || ''
      ]
    );
    return this.getSettings(userId);
  },

  // History
  async getHistory(userId) {
    const res = await pool.query(`SELECT * FROM history WHERE user_id = $1 ORDER BY timestamp DESC`, [userId]);
    return res.rows.map(mapHistoryRow);
  },

  async addHistoryEvent(userId, event) {
    const evidenceStr = JSON.stringify(event.evidence || {});
    const notifyStr = JSON.stringify(event.contactsNotified || []);
    const gpsPathEnc = encrypt(JSON.stringify(event.gpsPath || []));

    await pool.query(
      `INSERT INTO history (id, user_id, timestamp, type, duration_seconds, status, evidence, contacts_notified, gps_path_enc) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        event.id, 
        userId, 
        event.timestamp ? BigInt(event.timestamp) : null, 
        event.type || 'General', 
        event.durationSeconds || 0, 
        event.status, 
        evidenceStr, 
        notifyStr, 
        gpsPathEnc
      ]
    );
    return this.getHistory(userId);
  },

  async removeHistoryEvent(userId, alertId) {
    const res = await pool.query(`SELECT evidence FROM history WHERE id = $1 AND user_id = $2`, [alertId, userId]);
    const row = res.rows[0];
    if (row && row.evidence) {
      try {
        let evidence = row.evidence;
        if (typeof evidence === 'string') {
          evidence = JSON.parse(evidence);
        }
        if (evidence && evidence.files) {
          evidence.files.forEach(file => {
            const fileName = path.basename(file.url);
            const fullPath = path.join(__dirname, 'evidence', fileName);
            if (fs.existsSync(fullPath)) {
              try {
                fs.unlinkSync(fullPath);
                console.log(`🗑️ Deleted evidence file: ${fullPath}`);
              } catch (err) {
                console.error(`Failed to delete evidence file: ${fullPath}`, err);
              }
            }
          });
        }
      } catch (e) {}
    }

    await pool.query(`DELETE FROM history WHERE id = $1 AND user_id = $2`, [alertId, userId]);
    return this.getHistory(userId);
  },

  async updateHistoryEvent(alertId, updates) {
    const res = await pool.query(`SELECT * FROM history WHERE id = $1`, [alertId]);
    const row = res.rows[0];
    if (!row) return;

    const durationSeconds = updates.durationSeconds !== undefined ? updates.durationSeconds : row.duration_seconds;
    const status = updates.status || row.status;
    
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

    await pool.query(
      `UPDATE history SET duration_seconds = $1, status = $2, evidence = $3, contacts_notified = $4, gps_path_enc = $5 WHERE id = $6`,
      [durationSeconds, status, evidence, contactsNotified, gpsPathEnc, alertId]
    );
  },

  async clearUserData(userId) {
    await pool.query(`DELETE FROM contacts WHERE user_id = $1`, [userId]);
    
    // Clean files from history before deleting rows
    const res = await pool.query(`SELECT evidence FROM history WHERE user_id = $1`, [userId]);
    for (const row of res.rows) {
      if (row.evidence) {
        try {
          let evidence = row.evidence;
          if (typeof evidence === 'string') {
            evidence = JSON.parse(evidence);
          }
          if (evidence.files) {
            evidence.files.forEach(file => {
              const fileName = path.basename(file.url);
              const fullPath = path.join(__dirname, 'evidence', fileName);
              if (fs.existsSync(fullPath)) {
                try {
                  fs.unlinkSync(fullPath);
                } catch (e) {}
              }
            });
          }
        } catch (e) {}
      }
    }
    
    await pool.query(`DELETE FROM history WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM settings WHERE user_id = $1`, [userId]);
    await pool.query(`UPDATE users SET is_setup_complete = false WHERE id = $1`, [userId]);
  },

  async getAllHistory() {
    const res = await pool.query(`SELECT * FROM history ORDER BY timestamp DESC`);
    return res.rows.map(mapHistoryRow);
  },

  async getAllUsers() {
    const res = await pool.query(`SELECT * FROM users`);
    return res.rows.map(mapUserRow);
  },

  async adminUpdateUser(userId, updates) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return this.getUser(userId);

    const dbUpdates = { ...updates };
    if (updates.password) {
      dbUpdates.password_hash = hashPassword(updates.password);
      delete dbUpdates.password;
    }
    if (updates.phone !== undefined) {
      dbUpdates.phone_enc = updates.phone ? encrypt(updates.phone) : '';
      delete dbUpdates.phone;
    }

    const setKeys = Object.keys(dbUpdates);
    const pgKeys = setKeys.map(camelToSnake);
    const setClause = pgKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const params = [
      ...setKeys.map(k => dbUpdates[k]),
      userId
    ];

    await pool.query(`UPDATE users SET ${setClause} WHERE id = $${setKeys.length + 1}`, params);
    return this.getUser(userId);
  },

  async deleteUser(userId) {
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await pool.query(`DELETE FROM settings WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM contacts WHERE user_id = $1`, [userId]);
    
    const res = await pool.query(`SELECT evidence FROM history WHERE user_id = $1`, [userId]);
    for (const row of res.rows) {
      if (row.evidence) {
        try {
          let evidence = row.evidence;
          if (typeof evidence === 'string') {
            evidence = JSON.parse(evidence);
          }
          if (evidence.files) {
            evidence.files.forEach(file => {
              const fileName = path.basename(file.url);
              const fullPath = path.join(__dirname, 'evidence', fileName);
              if (fs.existsSync(fullPath)) {
                try {
                  fs.unlinkSync(fullPath);
                } catch (e) {}
              }
            });
          }
        } catch (e) {}
      }
    }
    await pool.query(`DELETE FROM history WHERE user_id = $1`, [userId]);
    return true;
  },

  async addFeedback({ id, userId, userName, userEmail, type, rating, subject, message }) {
    const feedbackId = id || `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();
    await pool.query(
      `INSERT INTO feedback (id, user_id, user_name, user_email, type, rating, subject, message, status, admin_response, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', '', $9, $10)`,
      [feedbackId, userId, userName, userEmail, type || 'feedback', rating || 5, subject || '', message || '', now, now]
    );
    return this.getFeedbackById(feedbackId);
  },

  async getFeedbackById(id) {
    const res = await pool.query(`SELECT * FROM feedback WHERE id = $1`, [id]);
    return res.rows[0] || null;
  },

  async getUserFeedback(userId) {
    const res = await pool.query(`SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return res.rows;
  },

  async getAllFeedback() {
    const res = await pool.query(`SELECT * FROM feedback ORDER BY created_at DESC`);
    return res.rows;
  },

  async updateFeedback(id, { status, adminResponse }) {
    const now = Date.now();
    const existing = await this.getFeedbackById(id);
    if (!existing) throw new Error('Feedback ticket not found');

    const newStatus = status !== undefined ? status : existing.status;
    const newResponse = adminResponse !== undefined ? adminResponse : existing.admin_response;

    await pool.query(
      `UPDATE feedback SET status = $1, admin_response = $2, updated_at = $3 WHERE id = $4`,
      [newStatus, newResponse, now, id]
    );
    return this.getFeedbackById(id);
  },

  async deleteFeedback(id) {
    await pool.query(`DELETE FROM feedback WHERE id = $1`, [id]);
    return true;
  }
};
