const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// DATA_DIR points at the persistent disk in production (e.g. /data on Render).
// Falls back to the server folder for local development. Create it if missing
// so a fresh disk or a custom path works without manual setup.
const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'pigment_integrations.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    source_system TEXT NOT NULL,
    source_config TEXT NOT NULL,
    pigment_config TEXT NOT NULL,
    status TEXT DEFAULT 'inactive',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    integration_id TEXT NOT NULL UNIQUE,
    cron_expression TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run DATETIME,
    next_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (integration_id) REFERENCES integrations(id)
  );

  CREATE TABLE IF NOT EXISTS data_tables (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    integration_id TEXT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'raw',
    source_table_id TEXT,
    columns TEXT NOT NULL,
    column_types TEXT,
    rows TEXT NOT NULL,
    formulas TEXT,
    row_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS run_history (
    id TEXT PRIMARY KEY,
    integration_id TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    rows_synced INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (integration_id) REFERENCES integrations(id)
  );
`);

// Migration for databases created before column_types existed
try {
  db.exec('ALTER TABLE data_tables ADD COLUMN column_types TEXT');
} catch {
  // column already exists
}

module.exports = db;
