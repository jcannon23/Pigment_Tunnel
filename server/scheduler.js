const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const activeTasks = new Map();

function computeNextRun(expression) {
  // Simple next-run estimate — real impl would use cron-parser
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return now.toISOString();
}

async function runIntegration(integrationId) {
  const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(integrationId);
  if (!integration) return;

  const runId = uuidv4();
  db.prepare(`INSERT INTO run_history (id, integration_id, status, started_at) VALUES (?, ?, 'running', CURRENT_TIMESTAMP)`)
    .run(runId, integrationId);

  try {
    // Simulate integration execution — real impl connects to source & calls Pigment API
    await new Promise(r => setTimeout(r, 500));

    // If the integration references a staged data table, send that table's rows
    const pigmentConfig = JSON.parse(integration.pigment_config || '{}');
    let rowsSynced, message;
    if (pigmentConfig.table_id) {
      // Scope to the integration's own project — never read across tenants
      const table = db.prepare('SELECT name, row_count FROM data_tables WHERE id=? AND project_id=?')
        .get(pigmentConfig.table_id, integration.project_id);
      if (!table) throw new Error('Referenced data table no longer exists');
      rowsSynced = table.row_count;
      message = `Sent ${table.row_count} rows from table "${table.name}" to Pigment`;
    } else {
      rowsSynced = Math.floor(Math.random() * 1000) + 10;
      message = 'Sync completed successfully';
    }

    db.prepare(`UPDATE run_history SET status='success', rows_synced=?, completed_at=CURRENT_TIMESTAMP, message=? WHERE id=?`)
      .run(rowsSynced, message, runId);
    db.prepare(`UPDATE integrations SET status='active', updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(integrationId);
    db.prepare(`UPDATE schedules SET last_run=CURRENT_TIMESTAMP WHERE integration_id=?`)
      .run(integrationId);
  } catch (err) {
    db.prepare(`UPDATE run_history SET status='failed', completed_at=CURRENT_TIMESTAMP, message=? WHERE id=?`)
      .run(err.message, runId);
  }
}

function scheduleIntegration(integrationId, cronExpression) {
  if (activeTasks.has(integrationId)) {
    activeTasks.get(integrationId).destroy();
  }

  if (!cron.validate(cronExpression)) return false;

  const task = cron.schedule(cronExpression, () => runIntegration(integrationId));
  activeTasks.set(integrationId, task);

  db.prepare(`UPDATE schedules SET next_run=? WHERE integration_id=?`)
    .run(computeNextRun(cronExpression), integrationId);

  return true;
}

function unscheduleIntegration(integrationId) {
  if (activeTasks.has(integrationId)) {
    activeTasks.get(integrationId).destroy();
    activeTasks.delete(integrationId);
  }
}

function loadSchedules() {
  const schedules = db.prepare('SELECT * FROM schedules WHERE enabled=1').all();
  for (const s of schedules) {
    scheduleIntegration(s.integration_id, s.cron_expression);
  }
  console.log(`Loaded ${schedules.length} active schedules`);
}

module.exports = { scheduleIntegration, unscheduleIntegration, loadSchedules, runIntegration };
