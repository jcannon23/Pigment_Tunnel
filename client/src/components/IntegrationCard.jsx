import { useState } from 'react';
import api from '../api';
import { SOURCE_SYSTEMS } from './sourceConfigs';

const STATUS_CONFIG = {
  active:   { cls: 'badge-green', dot: 'bg-emerald-400', label: 'Active' },
  inactive: { cls: 'badge-gray',  dot: 'bg-gray-300 dark:bg-gray-600', label: 'Inactive' },
  running:  { cls: 'badge-blue',  dot: 'bg-indigo-400 animate-pulse', label: 'Running' },
  error:    { cls: 'badge-red',   dot: 'bg-red-400', label: 'Error' },
};

function RunRow({ run }) {
  const isSuccess = run.status === 'success';
  const isFailed = run.status === 'failed';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0 text-xs">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSuccess ? 'bg-emerald-400' : isFailed ? 'bg-red-400' : 'bg-indigo-400 animate-pulse'}`} />
      <span className={`font-medium w-14 ${isSuccess ? 'text-emerald-700 dark:text-emerald-400' : isFailed ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
      </span>
      <span className="text-gray-500 dark:text-gray-400 flex-1 truncate">{run.message || '—'}</span>
      {run.rows_synced > 0 && <span className="font-mono text-gray-500 dark:text-gray-400">{run.rows_synced.toLocaleString()} rows</span>}
      <span className="text-gray-400 dark:text-gray-600 shrink-0">
        {new Date(run.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export default function IntegrationCard({ integration, projectId, onEdit, onDelete, onRefresh, onImported }) {
  const sys = SOURCE_SYSTEMS.find(s => s.id === integration.source_system);
  const sc = STATUS_CONFIG[integration.status] || STATUS_CONFIG.inactive;
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function importData() {
    setImporting(true);
    try {
      const { data } = await api.post(`/integrations/${integration.id}/import`);
      onImported?.(data);
    } finally {
      setImporting(false);
    }
  }

  async function toggleExpand() {
    if (!expanded) {
      setLoadingHistory(true);
      const { data } = await api.get(`/integrations/${integration.id}/history`);
      setHistory(data);
      setLoadingHistory(false);
    }
    setExpanded(e => !e);
  }

  async function runNow() {
    setRunning(true);
    try {
      await api.post(`/integrations/${integration.id}/run`);
      await onRefresh();
      if (expanded) {
        const { data } = await api.get(`/integrations/${integration.id}/history`);
        setHistory(data);
      }
    } finally {
      setRunning(false);
    }
  }

  async function toggleSchedule() {
    if (!integration.schedule) return;
    await api.post(`/integrations/${integration.id}/schedule`, {
      cron_expression: integration.schedule.cron_expression,
      enabled: !integration.schedule.enabled,
    });
    await onRefresh();
  }

  const Logo = sys?.Logo;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden ${sys?.iconBg || 'bg-gray-50 dark:bg-gray-800'} ${sys?.cardBorder || 'border-gray-100 dark:border-gray-800'}`}>
            {Logo ? <Logo size={26} /> : <span className="text-lg">🔗</span>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{integration.name}</h3>
              <div className={`badge ${sc.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {sys?.name} → Pigment ·{' '}
              <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-[11px] text-gray-600 dark:text-gray-400">
                {integration.pigment_config?.dataset_id?.slice(0, 14)}…
              </code>
            </p>

            {integration.schedule && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <svg className="text-gray-400 dark:text-gray-600 shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <code className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{integration.schedule.cron_expression}</code>
                <span className={`badge text-[10px] py-0.5 ${integration.schedule.enabled ? 'badge-green' : 'badge-gray'}`}>
                  {integration.schedule.enabled ? 'Scheduled' : 'Paused'}
                </span>
                {integration.schedule.last_run && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-600">
                    Last run {new Date(integration.schedule.last_run).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={importData} disabled={importing} className="btn-secondary py-1.5 px-3 text-xs">
              {importing
                ? <><span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> Importing</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Import Data</>}
            </button>
            <button onClick={runNow} disabled={running} className="btn-primary py-1.5 px-3 text-xs">
              {running
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running</>
                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Now</>}
            </button>

            {integration.schedule && (
              <button onClick={toggleSchedule} className="btn-ghost py-1.5 px-2.5"
                title={integration.schedule.enabled ? 'Pause schedule' : 'Resume schedule'}>
                {integration.schedule.enabled
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
              </button>
            )}

            <button onClick={() => onEdit(integration)} className="btn-ghost py-1.5 px-2.5" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>

            <button onClick={() => onDelete(integration)} className="btn-ghost py-1.5 px-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>

            <button onClick={toggleExpand} className="btn-ghost py-1.5 px-2" title="Run history">
              <svg width="13" height="13" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-gray-50/50 dark:bg-gray-800/20">
          <p className="section-title mb-3">Run History</p>
          {loadingHistory && <p className="text-xs text-gray-400 py-2">Loading…</p>}
          {!loadingHistory && history.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-600 py-2">No runs yet. Click "Run Now" to trigger the first sync.</p>
          )}
          {!loadingHistory && history.map(r => <RunRow key={r.id} run={r} />)}
        </div>
      )}
    </div>
  );
}
