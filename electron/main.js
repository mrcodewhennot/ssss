const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// --- SQLite setup (better-sqlite3) ---
let Database;
try {
  Database = require('better-sqlite3');
} catch(e){ console.error('better-sqlite3 not installed yet'); }

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'medo_ps.db');

function initDatabase() {
  try {
    if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
    const exists = fs.existsSync(dbPath);
    const db = new Database(dbPath);
    // run schema if new
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!exists && fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(sql);
    } else {
      db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        role TEXT,
        password_hash TEXT,
        permissions TEXT
      );`);
    }
    return db;
  } catch (e) {
    console.error('DB init error', e);
    throw e;
  }
}

let db;
app.whenReady().then(() => {
  try { db = initDatabase(); } catch(e){ console.error(e); }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- settings path ---
const settingsPath = path.join(userDataPath, 'settings.json');

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { ok: true, path: settingsPath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return { ok: true, settings: JSON.parse(data) };
    }
    return { ok: true, settings: null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// --- simple password hashing using crypto.scryptSync ---
const crypto = require('crypto');
function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, s, 64).toString('hex');
  return s + ':' + derived;
}
function verifyPassword(password, stored) {
  if(!stored) return false;
  const parts = stored.split(':');
  if(parts.length!==2) return false;
  const [s, hash] = parts;
  const derived = crypto.scryptSync(password, s, 64).toString('hex');
  return derived === hash;
}

// --- User management IPC ---
ipcMain.handle('create-user', async (event, user) => {
  try {
    const { name, email, role, password, permissions } = user;
    const password_hash = hashPassword(password);
    const stmt = db.prepare('INSERT INTO users (name,email,role,password_hash,permissions) VALUES (?,?,?,?,?)');
    const info = stmt.run(name, email, role, password_hash, JSON.stringify(permissions || {}));
    return { ok: true, id: info.lastInsertRowid };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('authenticate', async (event, { email, password }) => {
  try {
    const row = db.prepare('SELECT id,name,email,role,password_hash,permissions FROM users WHERE email = ?').get(email);
    if (!row) return { ok: false, error: 'user_not_found' };
    if (!verifyPassword(password, row.password_hash)) return { ok: false, error: 'invalid_password' };
    return { ok: true, user: { id: row.id, name: row.name, email: row.email, role: row.role, permissions: JSON.parse(row.permissions || '{}') } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('list-users', async () => {
  try {
    const rows = db.prepare('SELECT id,name,email,role,permissions FROM users').all();
    return { ok: true, users: rows.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '{}') })) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('delete-user', async (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
