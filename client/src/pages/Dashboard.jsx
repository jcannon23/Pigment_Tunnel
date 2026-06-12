import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import IntegrationCard from '../components/IntegrationCard';
import IntegrationForm from '../components/IntegrationForm';
import DataTablesView from '../components/DataTablesView';

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-black/50 w-full max-w-md border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(name, desc);
    setSaving(false);
  }
  return (
    <Modal onClose={onClose} title="New Project">
      <form onSubmit={handleSave} className="p-6 space-y-4">
        <div>
          <label className="label">Project Name <span className="text-red-400">*</span></label>
          <input className="input" placeholder="e.g. FY2025 Finance Integrations" value={name}
            onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" placeholder="Optional — helps teammates understand the purpose" value={desc}
            onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={!name || saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${color}`}>
      <span className="font-bold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showIntegrationForm, setShowIntegrationForm] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [activeTab, setActiveTab] = useState('integrations');
  const [openTableId, setOpenTableId] = useState(null);

  useEffect(() => {
    api.get('/projects').then(r => {
      setProjects(r.data);
      if (r.data.length > 0) setSelectedProject(r.data[0]);
    });
  }, []);

  const loadIntegrations = useCallback(async () => {
    if (!selectedProject) return;
    const { data } = await api.get(`/projects/${selectedProject.id}/integrations`);
    setIntegrations(data);
  }, [selectedProject]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  async function createProject(name, description) {
    const { data } = await api.post('/projects', { name, description });
    setProjects(p => [data, ...p]);
    setSelectedProject(data);
    setShowNewProject(false);
  }

  async function deleteProject(project) {
    if (!confirm(`Delete "${project.name}" and all its integrations? This cannot be undone.`)) return;
    await api.delete(`/projects/${project.id}`);
    const remaining = projects.filter(x => x.id !== project.id);
    setProjects(remaining);
    setSelectedProject(remaining[0] || null);
    setIntegrations([]);
  }

  async function saveIntegration({ name, source_system, source_config, pigment_config, schedule }) {
    if (editingIntegration) {
      await api.put(`/projects/${selectedProject.id}/integrations/${editingIntegration.id}`, { name, source_config, pigment_config });
    } else {
      const { data } = await api.post(`/projects/${selectedProject.id}/integrations`, { name, source_system, source_config, pigment_config });
      if (schedule) await api.post(`/integrations/${data.id}/schedule`, schedule);
    }
    await loadIntegrations();
    setEditingIntegration(null);
  }

  async function deleteIntegration(integration) {
    if (!confirm(`Delete "${integration.name}"? This cannot be undone.`)) return;
    await api.delete(`/projects/${selectedProject.id}/integrations/${integration.id}`);
    setIntegrations(i => i.filter(x => x.id !== integration.id));
  }

  const activeCount = integrations.filter(i => i.status === 'active').length;
  const scheduledCount = integrations.filter(i => i.schedule?.enabled).length;

  return (
    <div className="flex min-h-screen bg-[#f8f9fc] dark:bg-[#0d0d10]">
      <Sidebar projects={projects} selectedProject={selectedProject}
        onSelectProject={p => { setSelectedProject(p); setIntegrations([]); setActiveTab('integrations'); setOpenTableId(null); }}
        onNewProject={() => setShowNewProject(true)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">
          {selectedProject ? (
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{selectedProject.name}</h1>
              {selectedProject.description && (
                <span className="text-gray-400 dark:text-gray-600 text-xs truncate hidden sm:block">— {selectedProject.description}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-600">Select or create a project</span>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {selectedProject && integrations.length > 0 && (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <StatPill label="active" value={activeCount} color="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400" />
                  <StatPill label="scheduled" value={scheduledCount} color="bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400" />
                </div>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
              </>
            )}
            {selectedProject && (
              <>
                <button onClick={() => deleteProject(selectedProject)} className="btn-ghost text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 dark:hover:bg-red-950/30">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  Delete Project
                </button>
                <button onClick={() => { setEditingIntegration(null); setShowIntegrationForm(true); }} className="btn-primary text-xs py-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Integration
                </button>
              </>
            )}
          </div>
        </header>

        {/* Tabs */}
        {selectedProject && (
          <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 flex gap-1 shrink-0">
            {[['integrations', 'Integrations'], ['tables', 'Data Tables']].map(([key, label]) => (
              <button key={key} onClick={() => { setActiveTab(key); setOpenTableId(null); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-5">
                <svg className="text-indigo-400 dark:text-indigo-500" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1.5">No project selected</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs">Create a project to organize your integrations by team, workflow, or data domain.</p>
              <button onClick={() => setShowNewProject(true)} className="btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create First Project
              </button>
            </div>
          ) : activeTab === 'tables' ? (
            <DataTablesView projectId={selectedProject.id} openTableId={openTableId} onOpenTable={setOpenTableId} />
          ) : integrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <svg className="text-gray-400 dark:text-gray-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                  <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1.5">No integrations yet</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-5 max-w-sm leading-relaxed">
                Add your first integration to start syncing data from Workday, SAP, Oracle, or Snowflake into Pigment.
              </p>
              <button onClick={() => setShowIntegrationForm(true)} className="btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add First Integration
              </button>
            </div>
          ) : (
            <div className="max-w-4xl space-y-3">
              {integrations.map(i => (
                <IntegrationCard key={i.id} integration={i} projectId={selectedProject.id}
                  onEdit={intg => { setEditingIntegration(intg); setShowIntegrationForm(true); }}
                  onDelete={deleteIntegration} onRefresh={loadIntegrations}
                  onImported={table => { setActiveTab('tables'); setOpenTableId(table.id); }} />
              ))}
            </div>
          )}
        </main>
      </div>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onSave={createProject} />}
      {showIntegrationForm && selectedProject && (
        <IntegrationForm projectId={selectedProject.id} existingIntegration={editingIntegration}
          onClose={() => { setShowIntegrationForm(false); setEditingIntegration(null); }}
          onSave={saveIntegration} />
      )}
    </div>
  );
}
