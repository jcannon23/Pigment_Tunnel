import { useState, useEffect } from 'react';
import api from '../api';
import { SOURCE_SYSTEMS, CRON_PRESETS } from './sourceConfigs';

const STEPS = ['Source', 'Connection', 'Destination', 'Schedule'];

function EyeIcon({ open }) {
  return open
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

function FieldInput({ field, value, onChange }) {
  const [show, setShow] = useState(false);
  if (field.type === 'textarea') return (
    <div>
      <label className="label">{field.label}{field.required && <span className="text-red-400 ml-1">*</span>}</label>
      {field.help && <p className="field-hint -mt-1 mb-1.5">{field.help}</p>}
      <textarea className="input font-mono text-xs" rows={4} placeholder={field.placeholder}
        value={value || ''} onChange={e => onChange(e.target.value)} required={field.required} />
    </div>
  );
  return (
    <div>
      <label className="label">{field.label}{field.required && <span className="text-red-400 ml-1">*</span>}</label>
      {field.help && <p className="field-hint -mt-1 mb-1.5">{field.help}</p>}
      <div className="relative">
        <input className="input" type={field.sensitive ? (show ? 'text' : 'password') : (field.type || 'text')}
          placeholder={field.placeholder} value={value || ''}
          onChange={e => onChange(e.target.value)} required={field.required} />
        {field.sensitive && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <EyeIcon open={show} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function IntegrationForm({ projectId, onClose, onSave, existingIntegration }) {
  const isEdit = !!existingIntegration;
  const [step, setStep] = useState(isEdit ? 1 : 0);
  const [selectedSource, setSelectedSource] = useState(
    isEdit ? SOURCE_SYSTEMS.find(s => s.id === existingIntegration.source_system) : null
  );
  const [name, setName] = useState(existingIntegration?.name || '');
  const [sourceConfig, setSourceConfig] = useState(existingIntegration?.source_config || {});
  const [pigmentConfig, setPigmentConfig] = useState(existingIntegration?.pigment_config || {});
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [cronExpression, setCronExpression] = useState('0 6 * * *');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [projectTables, setProjectTables] = useState([]);

  useEffect(() => {
    api.get(`/projects/${projectId}/tables`).then(r => setProjectTables(r.data)).catch(() => {});
  }, [projectId]);

  const canNext = () => {
    if (step === 0) return !!selectedSource;
    if (step === 1) return !!name && selectedSource?.fields.filter(f => f.required).every(f => sourceConfig[f.key]);
    if (step === 2) return pigmentConfig.api_key && pigmentConfig.workspace_id && pigmentConfig.dataset_id;
    return true;
  };

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      await onSave({ name, source_system: selectedSource.id, source_config: sourceConfig, pigment_config: pigmentConfig, schedule: scheduleEnabled ? { cron_expression: cronExpression, enabled: true } : null });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-black/50 w-full max-w-xl max-h-[88vh] flex flex-col border border-gray-100 dark:border-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Integration' : 'New Integration'}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-indigo-500' : 'bg-gray-100 dark:bg-gray-800'}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 0: source picker */}
          {step === 0 && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Which system do you want to pull data from?</p>
              <div className="grid grid-cols-2 gap-3">
                {SOURCE_SYSTEMS.map(sys => {
                  const Logo = sys.Logo;
                  const isSelected = selectedSource?.id === sys.id;
                  return (
                    <button key={sys.id} onClick={() => setSelectedSource(sys)}
                      className={`border-2 rounded-xl p-4 text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm'
                          : `border-gray-100 dark:border-gray-800 ${sys.cardBg} ${sys.cardBorder} hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm`
                      }`}>
                      <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white ring-1 ring-gray-200 shadow-sm p-1.5">
                        <Logo size={32} />
                      </div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{sys.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{sys.description}</p>
                      {isSelected && (
                        <div className="mt-2.5 flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: connection */}
          {step === 1 && selectedSource && (() => {
            const Logo = selectedSource.Logo;
            return (
              <div className="space-y-5">
                <div>
                  <label className="label">Integration Name <span className="text-red-400">*</span></label>
                  <input className="input" placeholder={`e.g. ${selectedSource.name} → Pigment Headcount`}
                    value={name} onChange={e => setName(e.target.value)} required autoFocus />
                  <p className="field-hint">Give this integration a descriptive name so it's easy to identify.</p>
                </div>
                <div className={`border rounded-xl p-4 space-y-4 ${selectedSource.cardBg} ${selectedSource.cardBorder}`}>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2.5">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white ring-1 ring-gray-200 shadow-sm p-1">
                      <Logo size={20} />
                    </span>
                    {selectedSource.name} Connection Details
                  </p>
                  {selectedSource.fields.map(field => (
                    <FieldInput key={field.key} field={field} value={sourceConfig[field.key]}
                      onChange={val => setSourceConfig(c => ({ ...c, [field.key]: val }))} />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Step 2: pigment destination */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                <svg className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <div>
                  <p className="font-medium text-indigo-900 dark:text-indigo-300 text-xs">Where should data land?</p>
                  <p className="text-indigo-600 dark:text-indigo-400 text-xs mt-0.5">Find these values in your Pigment workspace under <strong>Settings → API & Integrations</strong>.</p>
                </div>
              </div>
              <div>
                <label className="label">Pigment API Key <span className="text-red-400">*</span></label>
                <input className="input font-mono text-xs" type="password" placeholder="pk_live_••••••••••••••••"
                  value={pigmentConfig.api_key || ''} onChange={e => setPigmentConfig(c => ({ ...c, api_key: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Workspace ID <span className="text-red-400">*</span></label>
                  <input className="input font-mono text-xs" placeholder="ws_xxxxxxxxxxxx"
                    value={pigmentConfig.workspace_id || ''} onChange={e => setPigmentConfig(c => ({ ...c, workspace_id: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Dataset ID <span className="text-red-400">*</span></label>
                  <input className="input font-mono text-xs" placeholder="ds_xxxxxxxxxxxx"
                    value={pigmentConfig.dataset_id || ''} onChange={e => setPigmentConfig(c => ({ ...c, dataset_id: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Update Mode</label>
                <select className="input" value={pigmentConfig.update_mode || 'upsert'}
                  onChange={e => setPigmentConfig(c => ({ ...c, update_mode: e.target.value }))}>
                  <option value="upsert">Upsert — add new rows, update existing ones</option>
                  <option value="replace">Full Replace — overwrite entire dataset</option>
                  <option value="append">Append Only — add rows without modifying existing</option>
                </select>
              </div>
              <div>
                <label className="label">Data Source</label>
                <select className="input" value={pigmentConfig.table_id || ''}
                  onChange={e => setPigmentConfig(c => ({ ...c, table_id: e.target.value || undefined }))}>
                  <option value="">Live extract — pull directly from source on each run</option>
                  {projectTables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.kind === 'transformed' ? 'ƒ ' : ''}{t.name} ({t.row_count.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Choose a staged data table (e.g. a transformed table) to send its rows to Pigment instead of a direct source extract.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: schedule */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable automatic schedule</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sync automatically on a recurring basis</p>
                </div>
                <button type="button" onClick={() => setScheduleEnabled(s => !s)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${scheduleEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${scheduleEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {scheduleEnabled && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Quick Presets</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CRON_PRESETS.map(p => (
                        <button key={p.value} type="button" onClick={() => setCronExpression(p.value)}
                          className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                            cronExpression === p.value
                              ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900'
                          }`}>
                          {p.label}
                          <span className={`block font-mono font-normal mt-0.5 text-[10px] ${cronExpression === p.value ? 'text-indigo-400 dark:text-indigo-500' : 'text-gray-400 dark:text-gray-600'}`}>{p.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Custom Cron Expression</label>
                    <input className="input font-mono text-sm" placeholder="0 6 * * *" value={cronExpression}
                      onChange={e => setCronExpression(e.target.value)} />
                    <p className="field-hint">Format: <code className="font-mono text-gray-600 dark:text-gray-400">minute hour day month weekday</code></p>
                  </div>
                </div>
              )}

              {!scheduleEnabled && (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg className="text-gray-400 dark:text-gray-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No schedule set</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">You can run this integration manually or add a schedule later.</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg px-3.5 py-3">
              <svg className="text-red-500 mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 rounded-b-2xl">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="btn-primary">
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            : <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : isEdit ? 'Save Changes' : 'Create Integration'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
