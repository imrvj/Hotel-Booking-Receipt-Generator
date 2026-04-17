/**
 * HotelReceipt Pro – Backend Server
 * Node.js + Express + sql.js (SQLite in-memory + file persistence)
 * Features: Login, Register, Save/Load Hotel Settings
 */

const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const initSqlJs  = require('sql.js');

const app    = express();
const PORT   = 3000;
const SECRET = 'hotelreceipt_jwt_secret_2024_!@#';
const DB_FILE = path.join(__dirname, 'hotel_receipt.db');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html, app.js, style.css

// ─── SQLite Setup ─────────────────────────────────────────────────────────────
let db;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Loaded existing database from', DB_FILE);
  } else {
    db = new SQL.Database();
    console.log('✅ Created new database');
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hotel_settings (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER UNIQUE NOT NULL,
      hotel_name          TEXT DEFAULT '',
      hotel_address       TEXT DEFAULT '',
      hotel_phone         TEXT DEFAULT '',
      hotel_email         TEXT DEFAULT '',
      hotel_website       TEXT DEFAULT '',
      hotel_gstin         TEXT DEFAULT '',
      default_room_type   TEXT DEFAULT '',
      default_meal_plan   TEXT DEFAULT '',
      default_gst_slab    TEXT DEFAULT '12',
      default_payment_mode TEXT DEFAULT 'Cash',
      updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveDB();
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = db.exec(`SELECT id FROM users WHERE username = ?`, [username]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hash]);
    saveDB();

    // Get the new user's id
    const result = db.exec(`SELECT id FROM users WHERE username = ?`, [username]);
    const userId = result[0].values[0][0];

    // Create empty hotel settings for new user
    db.run(`INSERT OR IGNORE INTO hotel_settings (user_id) VALUES (?)`, [userId]);
    saveDB();

    const token = jwt.sign({ id: userId, username }, SECRET, { expiresIn: '7d' });
    res.json({ token, username, message: 'Registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = db.exec(`SELECT id, username, password_hash FROM users WHERE username = ?`, [username]);
    if (!result.length || !result[0].values.length) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const [id, uname, hash] = result[0].values[0];
    if (!bcrypt.compareSync(password, hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Ensure hotel settings row exists
    db.run(`INSERT OR IGNORE INTO hotel_settings (user_id) VALUES (?)`, [id]);
    saveDB();

    const token = jwt.sign({ id, username: uname }, SECRET, { expiresIn: '7d' });
    res.json({ token, username: uname, message: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get hotel settings (auto-fill defaults)
app.get('/api/settings', authMiddleware, (req, res) => {
  try {
    const result = db.exec(
      `SELECT hotel_name, hotel_address, hotel_phone, hotel_email, hotel_website,
              hotel_gstin, default_room_type, default_meal_plan, default_gst_slab,
              default_payment_mode
       FROM hotel_settings WHERE user_id = ?`,
      [req.user.id]
    );

    if (!result.length || !result[0].values.length) {
      return res.json({});
    }

    const cols = result[0].columns;
    const vals = result[0].values[0];
    const settings = {};
    cols.forEach((col, i) => { settings[col] = vals[i] || ''; });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load settings' });
  }
});

// Save hotel settings
app.post('/api/settings', authMiddleware, (req, res) => {
  const {
    hotel_name, hotel_address, hotel_phone, hotel_email,
    hotel_website, hotel_gstin, default_room_type,
    default_meal_plan, default_gst_slab, default_payment_mode
  } = req.body;

  try {
    db.run(`
      INSERT INTO hotel_settings
        (user_id, hotel_name, hotel_address, hotel_phone, hotel_email,
         hotel_website, hotel_gstin, default_room_type, default_meal_plan,
         default_gst_slab, default_payment_mode, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        hotel_name = excluded.hotel_name,
        hotel_address = excluded.hotel_address,
        hotel_phone = excluded.hotel_phone,
        hotel_email = excluded.hotel_email,
        hotel_website = excluded.hotel_website,
        hotel_gstin = excluded.hotel_gstin,
        default_room_type = excluded.default_room_type,
        default_meal_plan = excluded.default_meal_plan,
        default_gst_slab = excluded.default_gst_slab,
        default_payment_mode = excluded.default_payment_mode,
        updated_at = CURRENT_TIMESTAMP
    `, [
      req.user.id, hotel_name, hotel_address, hotel_phone,
      hotel_email, hotel_website, hotel_gstin, default_room_type,
      default_meal_plan, default_gst_slab, default_payment_mode
    ]);

    saveDB();
    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save settings' });
  }
});

// Change password
app.post('/api/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  try {
    const result = db.exec(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
    const hash = result[0].values[0][0];
    if (!bcrypt.compareSync(currentPassword, hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, req.user.id]);
    saveDB();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── Start server ──────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏨 HotelReceipt Pro Server running on http://localhost:${PORT}`);
    console.log(`📂 Database: ${DB_FILE}`);
    console.log(`\nOpen your browser at: http://localhost:${PORT}\n`);
  });
});
