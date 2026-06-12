require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { signToken, requireAuth } = require('./auth');
const { scheduleIntegration, unscheduleIntegration, loadSchedules, runIntegration } = require('./scheduler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?,?,?,?)').run(id, email, password_hash, name);

  const user = { id, email, name };
  res.json({ token: signToken(user), user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const { password_hash, ...safe } = user;
  res.json({ token: signToken(safe), user: safe });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

// ─── Projects ────────────────────────────────────────────────────────────────

app.get('/api/projects', requireAuth, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects WHERE user_id=? ORDER BY created_at DESC').all(req.user.id);
  res.json(projects);
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO projects (id, user_id, name, description) VALUES (?,?,?,?)').run(id, req.user.id, name, description || '');
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(id));
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const { name, description } = req.body;
  db.prepare('UPDATE projects SET name=?, description=? WHERE id=?').run(name || project.name, description ?? project.description, req.params.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id));
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── Integrations ─────────────────────────────────────────────────────────────

function getProjectOrFail(projectId, userId, res) {
  const p = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(projectId, userId);
  if (!p) { res.status(404).json({ error: 'Project not found' }); return null; }
  return p;
}

// A pigment_config.table_id must reference a table inside the same project —
// rejects references to other users' (or other projects') tables.
function validateTableReference(pigmentConfig, projectId, res) {
  const tableId = pigmentConfig?.table_id;
  if (!tableId) return true;
  const t = db.prepare('SELECT id FROM data_tables WHERE id=? AND project_id=?').get(tableId, projectId);
  if (!t) {
    res.status(400).json({ error: 'Data source table not found in this project' });
    return false;
  }
  return true;
}

app.get('/api/projects/:projectId/integrations', requireAuth, (req, res) => {
  if (!getProjectOrFail(req.params.projectId, req.user.id, res)) return;
  const integrations = db.prepare('SELECT * FROM integrations WHERE project_id=? ORDER BY created_at DESC').all(req.params.projectId);
  const enriched = integrations.map(i => ({
    ...i,
    source_config: JSON.parse(i.source_config),
    pigment_config: JSON.parse(i.pigment_config),
    schedule: db.prepare('SELECT * FROM schedules WHERE integration_id=?').get(i.id) || null,
  }));
  res.json(enriched);
});

app.post('/api/projects/:projectId/integrations', requireAuth, (req, res) => {
  if (!getProjectOrFail(req.params.projectId, req.user.id, res)) return;
  const { name, source_system, source_config, pigment_config } = req.body;
  if (!name || !source_system || !source_config || !pigment_config) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (!validateTableReference(pigment_config, req.params.projectId, res)) return;
  const id = uuidv4();
  db.prepare('INSERT INTO integrations (id, project_id, name, source_system, source_config, pigment_config) VALUES (?,?,?,?,?,?)')
    .run(id, req.params.projectId, name, source_system, JSON.stringify(source_config), JSON.stringify(pigment_config));
  const integration = db.prepare('SELECT * FROM integrations WHERE id=?').get(id);
  res.json({ ...integration, source_config: JSON.parse(integration.source_config), pigment_config: JSON.parse(integration.pigment_config) });
});

app.put('/api/projects/:projectId/integrations/:id', requireAuth, (req, res) => {
  if (!getProjectOrFail(req.params.projectId, req.user.id, res)) return;
  const existing = db.prepare('SELECT * FROM integrations WHERE id=? AND project_id=?').get(req.params.id, req.params.projectId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, source_config, pigment_config } = req.body;
  if (pigment_config && !validateTableReference(pigment_config, req.params.projectId, res)) return;
  db.prepare('UPDATE integrations SET name=?, source_config=?, pigment_config=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name || existing.name, JSON.stringify(source_config) || existing.source_config, JSON.stringify(pigment_config) || existing.pigment_config, req.params.id);
  const updated = db.prepare('SELECT * FROM integrations WHERE id=?').get(req.params.id);
  res.json({ ...updated, source_config: JSON.parse(updated.source_config), pigment_config: JSON.parse(updated.pigment_config) });
});

app.delete('/api/projects/:projectId/integrations/:id', requireAuth, (req, res) => {
  if (!getProjectOrFail(req.params.projectId, req.user.id, res)) return;
  const existing = db.prepare('SELECT id FROM integrations WHERE id=? AND project_id=?').get(req.params.id, req.params.projectId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  unscheduleIntegration(req.params.id);
  db.prepare('DELETE FROM schedules WHERE integration_id=?').run(req.params.id);
  db.prepare('DELETE FROM run_history WHERE integration_id=?').run(req.params.id);
  db.prepare('DELETE FROM integrations WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── Schedules ────────────────────────────────────────────────────────────────

app.post('/api/integrations/:id/schedule', requireAuth, (req, res) => {
  const { cron_expression, enabled } = req.body;
  const integration = db.prepare('SELECT i.* FROM integrations i JOIN projects p ON i.project_id=p.id WHERE i.id=? AND p.user_id=?').get(req.params.id, req.user.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  const existing = db.prepare('SELECT * FROM schedules WHERE integration_id=?').get(req.params.id);
  if (existing) {
    db.prepare('UPDATE schedules SET cron_expression=?, enabled=? WHERE integration_id=?').run(cron_expression, enabled ? 1 : 0, req.params.id);
  } else {
    db.prepare('INSERT INTO schedules (id, integration_id, cron_expression, enabled) VALUES (?,?,?,?)').run(uuidv4(), req.params.id, cron_expression, enabled ? 1 : 0);
  }

  if (enabled) {
    const ok = scheduleIntegration(req.params.id, cron_expression);
    if (!ok) return res.status(400).json({ error: 'Invalid cron expression' });
  } else {
    unscheduleIntegration(req.params.id);
  }

  res.json(db.prepare('SELECT * FROM schedules WHERE integration_id=?').get(req.params.id));
});

// ─── Run history & manual trigger ─────────────────────────────────────────────

app.get('/api/integrations/:id/history', requireAuth, (req, res) => {
  const integration = db.prepare('SELECT i.* FROM integrations i JOIN projects p ON i.project_id=p.id WHERE i.id=? AND p.user_id=?').get(req.params.id, req.user.id);
  if (!integration) return res.status(404).json({ error: 'Not found' });
  const history = db.prepare('SELECT * FROM run_history WHERE integration_id=? ORDER BY started_at DESC LIMIT 50').all(req.params.id);
  res.json(history);
});

app.post('/api/integrations/:id/run', requireAuth, async (req, res) => {
  const integration = db.prepare('SELECT i.* FROM integrations i JOIN projects p ON i.project_id=p.id WHERE i.id=? AND p.user_id=?').get(req.params.id, req.user.id);
  if (!integration) return res.status(404).json({ error: 'Not found' });
  await runIntegration(req.params.id);
  res.json({ success: true });
});

// ─── Data tables ──────────────────────────────────────────────────────────────

const { generateSampleData } = require('./sampleData');

function tableSummary(t) {
  return {
    id: t.id, project_id: t.project_id, integration_id: t.integration_id,
    name: t.name, kind: t.kind, source_table_id: t.source_table_id,
    columns: JSON.parse(t.columns), row_count: t.row_count,
    column_types: t.column_types ? JSON.parse(t.column_types) : {},
    formulas: t.formulas ? JSON.parse(t.formulas) : null,
    created_at: t.created_at, updated_at: t.updated_at,
  };
}

// Import data from an integration's source system into a raw table
app.post('/api/integrations/:id/import', requireAuth, (req, res) => {
  const integration = db.prepare('SELECT i.* FROM integrations i JOIN projects p ON i.project_id=p.id WHERE i.id=? AND p.user_id=?').get(req.params.id, req.user.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  // Simulate extraction from the upstream system — real impl calls the source API
  const { columns, rows } = generateSampleData(integration.source_system, 50);
  const id = uuidv4();
  const name = `${integration.name} — Import ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  db.prepare(`INSERT INTO data_tables (id, project_id, integration_id, name, kind, columns, rows, row_count)
    VALUES (?,?,?,?,'raw',?,?,?)`)
    .run(id, integration.project_id, integration.id, name, JSON.stringify(columns), JSON.stringify(rows), rows.length);

  db.prepare(`INSERT INTO run_history (id, integration_id, status, message, rows_synced, started_at, completed_at)
    VALUES (?,?,'success',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
    .run(uuidv4(), integration.id, `Imported ${rows.length} rows from ${integration.source_system}`, rows.length);

  res.json(tableSummary(db.prepare('SELECT * FROM data_tables WHERE id=?').get(id)));
});

// Create a table directly from uploaded data (e.g. a parsed CSV file)
app.post('/api/projects/:projectId/tables', requireAuth, (req, res) => {
  if (!getProjectOrFail(req.params.projectId, req.user.id, res)) return;
  const { name, columns, rows, kind, column_types } = req.body;
  if (!name || !Array.isArray(columns) || !columns.length || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'name, columns and rows are required' });
  }
  const id = uuidv4();
  db.prepare(`INSERT INTO data_tables (id, project_id, name, kind, columns, column_types, rows, row_count)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, req.params.projectId, name, kind === 'csv' ? 'csv' : 'raw',
      JSON.stringify(columns), JSON.stringify(column_types || {}), JSON.stringify(rows), rows.length);
  res.json(tableSummary(db.prepare('SELECT * FROM data_tables WHERE id=?').get(id)));
});

// List tables in a project (summaries — no row payloads)
app.get('/api/projects/:projectId/tables', requireAuth, (req, res) => {
  if (!getProjectOrFail(req.params.projectId, req.user.id, res)) return;
  const tables = db.prepare('SELECT * FROM data_tables WHERE project_id=? ORDER BY created_at DESC').all(req.params.projectId);
  res.json(tables.map(tableSummary));
});

function getTableOrFail(tableId, userId, res) {
  const t = db.prepare('SELECT t.* FROM data_tables t JOIN projects p ON t.project_id=p.id WHERE t.id=? AND p.user_id=?').get(tableId, userId);
  if (!t) { res.status(404).json({ error: 'Table not found' }); return null; }
  return t;
}

// Full table with rows
app.get('/api/tables/:id', requireAuth, (req, res) => {
  const t = getTableOrFail(req.params.id, req.user.id, res);
  if (!t) return;
  res.json({ ...tableSummary(t), rows: JSON.parse(t.rows) });
});

app.put('/api/tables/:id', requireAuth, (req, res) => {
  const t = getTableOrFail(req.params.id, req.user.id, res);
  if (!t) return;
  const { name, column_types } = req.body;
  db.prepare('UPDATE data_tables SET name=?, column_types=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name || t.name, column_types !== undefined ? JSON.stringify(column_types) : t.column_types, t.id);
  res.json(tableSummary(db.prepare('SELECT * FROM data_tables WHERE id=?').get(t.id)));
});

app.delete('/api/tables/:id', requireAuth, (req, res) => {
  const t = getTableOrFail(req.params.id, req.user.id, res);
  if (!t) return;
  db.prepare('DELETE FROM data_tables WHERE id=?').run(t.id);
  res.json({ success: true });
});

// Save a transformed table (client evaluates formulas, sends final columns+rows)
app.post('/api/tables/:id/transform', requireAuth, (req, res) => {
  const source = getTableOrFail(req.params.id, req.user.id, res);
  if (!source) return;
  const { name, columns, rows, formulas, output_table_id, column_types } = req.body;
  if (!columns || !rows) return res.status(400).json({ error: 'columns and rows required' });

  if (output_table_id) {
    // Re-running a transform: overwrite the existing output table
    const existing = db.prepare('SELECT t.* FROM data_tables t JOIN projects p ON t.project_id=p.id WHERE t.id=? AND p.user_id=?').get(output_table_id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Output table not found' });
    db.prepare(`UPDATE data_tables SET name=?, columns=?, column_types=?, rows=?, formulas=?, row_count=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(name || existing.name, JSON.stringify(columns), JSON.stringify(column_types || {}), JSON.stringify(rows), JSON.stringify(formulas || []), rows.length, output_table_id);
    return res.json(tableSummary(db.prepare('SELECT * FROM data_tables WHERE id=?').get(output_table_id)));
  }

  const id = uuidv4();
  db.prepare(`INSERT INTO data_tables (id, project_id, integration_id, name, kind, source_table_id, columns, column_types, rows, formulas, row_count)
    VALUES (?,?,?,?,'transformed',?,?,?,?,?,?)`)
    .run(id, source.project_id, source.integration_id, name || `${source.name} (Transformed)`,
      source.id, JSON.stringify(columns), JSON.stringify(column_types || {}), JSON.stringify(rows), JSON.stringify(formulas || []), rows.length);

  res.json(tableSummary(db.prepare('SELECT * FROM data_tables WHERE id=?').get(id)));
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Serve the built frontend (single-service deployment) ──────────────────────

const path = require('path');
const fs = require('fs');
const clientDist = path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API route returns index.html
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  loadSchedules();
});
