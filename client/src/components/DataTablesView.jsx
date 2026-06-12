import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../api';
import { applyFormulas, validateFormula, FORMULA_HELP } from '../lib/formulaEngine';
import { parseCSV } from '../lib/csvParser';
import { COLUMN_TYPES, TYPE_ORDER, formatCell, cellAlign } from '../lib/columnTypes';

function KindBadge({ kind }) {
  if (kind === 'transformed') return <span className="badge badge-blue">ƒ Transformed</span>;
  if (kind === 'csv') return <span className="badge badge-green">CSV File</span>;
  return <span className="badge badge-gray">Raw Import</span>;
}

// ─── Spreadsheet grid ──────────────────────────────────────────────────────────

function ColumnTypeMenu({ column, currentType, onSelect, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-0 top-full mt-1 z-30 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1">
        <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">Column Format</p>
        {TYPE_ORDER.map(t => (
          <button key={t} onClick={() => { onSelect(column, t); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left transition-colors ${
              (currentType || 'auto') === t
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            <span className="w-8 text-[10px] font-mono text-gray-400 shrink-0">{COLUMN_TYPES[t].abbr}</span>
            {COLUMN_TYPES[t].label}
            {(currentType || 'auto') === t && (
              <svg className="ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function DataGrid({ columns, rows, formulaColumns = [], maxRows = 200, columnTypes = {}, onTypeChange }) {
  const shown = rows.slice(0, maxRows);
  const formulaSet = new Set(formulaColumns);
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <div className="overflow-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 max-h-[60vh]">
      <table className="text-xs border-collapse w-full">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 text-gray-400 dark:text-gray-500 font-medium w-10 text-center">#</th>
            {columns.map(c => {
              const type = columnTypes[c] || 'auto';
              return (
                <th key={c} className={`relative border-b border-r border-gray-200 dark:border-gray-700 px-3 py-1.5 text-left font-semibold whitespace-nowrap ${
                  formulaSet.has(c)
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                  {onTypeChange ? (
                    <button onClick={() => setOpenMenu(m => m === c ? null : c)}
                      className="flex items-center gap-1.5 w-full hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                      title="Set column format">
                      {formulaSet.has(c) && <span className="font-mono">ƒ</span>}
                      <span>{c}</span>
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                        type !== 'auto'
                          ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'
                      }`}>
                        {COLUMN_TYPES[type].abbr}
                      </span>
                      <svg className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  ) : (
                    <span>{formulaSet.has(c) && <span className="mr-1 font-mono">ƒ</span>}{c}
                      {type !== 'auto' && <span className="ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">{COLUMN_TYPES[type].abbr}</span>}
                    </span>
                  )}
                  {openMenu === c && onTypeChange && (
                    <ColumnTypeMenu column={c} currentType={type} onSelect={onTypeChange} onClose={() => setOpenMenu(null)} />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="border-b border-r border-gray-100 dark:border-gray-800 px-2 py-1.5 text-gray-300 dark:text-gray-600 text-center font-mono">{i + 1}</td>
              {columns.map(c => {
                const v = row[c];
                const isError = v === '#ERROR';
                const type = columnTypes[c] || 'auto';
                const align = cellAlign(v, type);
                const isNumeric = align === 'right';
                return (
                  <td key={c} className={`border-b border-r border-gray-100 dark:border-gray-800 px-3 py-1.5 whitespace-nowrap ${
                    isError ? 'text-red-500 font-medium' :
                    `${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${isNumeric ? 'font-mono' : ''} text-gray-700 dark:text-gray-300`
                  } ${formulaSet.has(c) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                    {isError ? '#ERROR' : formatCell(v, type)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          Showing first {maxRows} of {rows.length.toLocaleString()} rows
        </div>
      )}
    </div>
  );
}

// ─── Transform editor ─────────────────────────────────────────────────────────

function TransformEditor({ table, onClose, onSaved }) {
  const [formulas, setFormulas] = useState(table.formulas?.length ? table.formulas : []);
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('');
  const [formulaError, setFormulaError] = useState(null);
  const [outputName, setOutputName] = useState(
    table.kind === 'transformed' ? table.name : `${table.name.split(' — ')[0]} — Transformed`
  );
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // For a transformed table we edit against its source's raw data if available;
  // here we just re-apply formulas on the table's current base columns.
  const baseColumns = useMemo(
    () => table.columns.filter(c => !(table.formulas || []).some(f => f.name === c)),
    [table]
  );
  const baseRows = useMemo(
    () => table.rows.map(r => {
      const out = {};
      baseColumns.forEach(c => { out[c] = r[c]; });
      return out;
    }),
    [table, baseColumns]
  );

  const preview = useMemo(() => {
    try {
      return { ...applyFormulas(baseColumns, baseRows, formulas), error: null };
    } catch (err) {
      return { columns: baseColumns, rows: baseRows, error: err.message };
    }
  }, [baseColumns, baseRows, formulas]);

  const availableColumns = useMemo(() => {
    const cols = [...baseColumns];
    formulas.forEach(f => { if (!cols.includes(f.name)) cols.push(f.name); });
    return cols;
  }, [baseColumns, formulas]);

  function checkFormula(value) {
    setNewFormula(value);
    setFormulaError(value.trim() ? validateFormula(value, availableColumns) : null);
  }

  function addFormula() {
    if (!newName.trim() || !newFormula.trim() || formulaError) return;
    setFormulas(f => [...f, { name: newName.trim(), formula: newFormula.trim() }]);
    setNewName('');
    setNewFormula('');
    setFormulaError(null);
  }

  function removeFormula(idx) {
    setFormulas(f => f.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    try {
      const sourceId = table.kind === 'transformed' ? table.source_table_id : table.id;
      await api.post(`/tables/${sourceId || table.id}/transform`, {
        name: outputName,
        columns: preview.columns,
        rows: preview.rows,
        formulas,
        column_types: table.column_types || {},
        output_table_id: table.kind === 'transformed' ? table.id : undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Formula builder */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <span className="font-mono text-indigo-500 mr-1.5">ƒ</span>Transformation Columns
          </p>
          <button onClick={() => setShowHelp(h => !h)} className="btn-ghost text-xs py-1 px-2">
            {showHelp ? 'Hide' : 'Formula'} Reference
          </button>
        </div>

        {showHelp && (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            {FORMULA_HELP.map(h => (
              <div key={h.fn} className="text-xs">
                <code className="font-mono text-indigo-600 dark:text-indigo-400">{h.fn}</code>
                <span className="text-gray-400 dark:text-gray-500 ml-2">{h.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Existing formulas */}
        {formulas.length > 0 && (
          <div className="space-y-1.5">
            {formulas.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                <span className="font-semibold text-indigo-800 dark:text-indigo-300 shrink-0">{f.name}</span>
                <span className="text-gray-400">=</span>
                <code className="font-mono text-gray-600 dark:text-gray-300 flex-1 truncate">{f.formula}</code>
                <button onClick={() => removeFormula(i)} className="text-gray-400 hover:text-red-500 shrink-0 p-0.5" title="Remove column">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New formula row */}
        <div className="flex gap-2 items-start">
          <input className="input w-44 shrink-0" placeholder="New column name"
            value={newName} onChange={e => setNewName(e.target.value)} />
          <div className="flex-1">
            <input className={`input font-mono text-xs ${formulaError ? 'border-red-300 dark:border-red-800 focus:ring-red-500/30' : ''}`}
              placeholder='e.g. IF([Region]="EMEA", [Revenue]*1.1, [Revenue])'
              value={newFormula} onChange={e => checkFormula(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFormula()} />
            {formulaError && <p className="text-xs text-red-500 mt-1">{formulaError}</p>}
          </div>
          <button onClick={addFormula} disabled={!newName.trim() || !newFormula.trim() || !!formulaError}
            className="btn-primary py-2 px-3 text-xs shrink-0">Add</button>
        </div>

        {/* Insert column chips */}
        <div className="flex flex-wrap gap-1.5">
          {availableColumns.map(c => (
            <button key={c} onClick={() => checkFormula(newFormula + `[${c}]`)}
              className="px-2 py-0.5 rounded text-[11px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              [{c}]
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className="section-title mb-2">Live Preview · {preview.rows.length.toLocaleString()} rows</p>
        {preview.error
          ? <p className="text-xs text-red-500 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">{preview.error}</p>
          : <DataGrid columns={preview.columns} rows={preview.rows} formulaColumns={formulas.map(f => f.name)}
              columnTypes={table.column_types || {}} maxRows={50} />}
      </div>

      {/* Save bar */}
      <div className="card p-4 flex items-center gap-3">
        <div className="flex-1">
          <label className="label">Output Table Name</label>
          <input className="input" value={outputName} onChange={e => setOutputName(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving || !outputName.trim() || !!preview.error} className="btn-primary">
            {saving
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : table.kind === 'transformed' ? 'Update Output Table' : 'Save as New Table'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Table detail (view / transform) ──────────────────────────────────────────

function TableDetail({ tableId, onBack, onChanged }) {
  const [table, setTable] = useState(null);
  const [mode, setMode] = useState('view');

  const load = useCallback(async () => {
    const { data } = await api.get(`/tables/${tableId}`);
    setTable(data);
  }, [tableId]);

  useEffect(() => { load(); }, [load]);

  async function setColumnType(column, type) {
    const next = { ...(table.column_types || {}) };
    if (type === 'auto') delete next[column];
    else next[column] = type;
    setTable(t => ({ ...t, column_types: next })); // optimistic
    await api.put(`/tables/${table.id}`, { column_types: next });
  }

  if (!table) return <p className="text-sm text-gray-400 py-8 text-center">Loading table…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="btn-ghost py-1.5 px-2.5 text-xs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          All Tables
        </button>
        <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{table.name}</h2>
        <KindBadge kind={table.kind} />
        <span className="text-xs text-gray-400">{table.row_count.toLocaleString()} rows · {table.columns.length} columns</span>
        {mode === 'view' && <span className="text-[11px] text-gray-400 dark:text-gray-600 hidden md:block">· Click a column header to set its format</span>}
        <div className="ml-auto flex gap-2">
          {mode === 'view' && (
            <button onClick={() => setMode('transform')} className="btn-primary text-xs py-1.5">
              <span className="font-mono">ƒ</span> {table.kind === 'transformed' ? 'Edit Transformations' : 'Transform Data'}
            </button>
          )}
        </div>
      </div>

      {mode === 'view'
        ? <DataGrid columns={table.columns} rows={table.rows} formulaColumns={(table.formulas || []).map(f => f.name)}
            columnTypes={table.column_types || {}} onTypeChange={setColumnType} />
        : <TransformEditor table={table}
            onClose={() => setMode('view')}
            onSaved={async () => { setMode('view'); await load(); onChanged(); }} />}
    </div>
  );
}

// ─── Main view: table list ────────────────────────────────────────────────────

export default function DataTablesView({ projectId, openTableId, onOpenTable }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get(`/projects/${projectId}/tables`);
    setTables(data);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function deleteTable(t) {
    if (!confirm(`Delete table "${t.name}"? This cannot be undone.`)) return;
    await api.delete(`/tables/${t.id}`);
    await load();
  }

  async function handleCSVFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const text = await file.text();
      const { columns, rows } = parseCSV(text);
      const { data } = await api.post(`/projects/${projectId}/tables`, {
        name: file.name.replace(/\.csv$/i, ''),
        columns, rows, kind: 'csv',
      });
      await load();
      onOpenTable(data.id);
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'Failed to parse CSV file.');
    } finally {
      setUploading(false);
    }
  }

  const uploadButton = (
    <>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVFile} />
      <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary text-xs py-1.5">
        {uploading
          ? <><span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> Uploading…</>
          : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload CSV</>}
      </button>
    </>
  );

  if (openTableId) {
    return <TableDetail tableId={openTableId} onBack={() => onOpenTable(null)} onChanged={load} />;
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading tables…</p>;

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
          <svg className="text-gray-400 dark:text-gray-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1.5">No data tables yet</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm leading-relaxed mb-5">
          Use <strong>Import Data</strong> on an integration to pull data from its source system, or upload a CSV flat file directly.
        </p>
        {uploadButton}
        {uploadError && <p className="text-xs text-red-500 mt-3 max-w-sm">{uploadError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-title">{tables.length} table{tables.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          {uploadButton}
        </div>
      </div>
      {tables.map(t => (
        <div key={t.id} className="card px-5 py-4 flex items-center gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            t.kind === 'transformed'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500'
              : t.kind === 'csv'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          }`}>
            {t.kind === 'transformed'
              ? <span className="font-mono text-lg font-semibold">ƒ</span>
              : t.kind === 'csv'
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{t.name}</h3>
              <KindBadge kind={t.kind} />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t.row_count.toLocaleString()} rows · {t.columns.length} columns
              {t.formulas?.length ? ` · ${t.formulas.length} formula column${t.formulas.length > 1 ? 's' : ''}` : ''}
              {' · '}{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onOpenTable(t.id)} className="btn-primary py-1.5 px-3 text-xs">Open</button>
            <button onClick={() => deleteTable(t)} className="btn-ghost py-1.5 px-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
