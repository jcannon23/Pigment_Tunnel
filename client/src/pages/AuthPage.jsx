import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.email, form.password, form.name);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[480px] shrink-0 flex-col justify-between bg-[#0f1117] p-12 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Gradient orb */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-20" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600 rounded-full blur-[120px] opacity-15" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Pigment Connect</span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Sync any data<br />source to Pigment
          </h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Connect Workday, SAP, Oracle, and Snowflake to your Pigment workspace — no code required.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: '🔗', title: 'Multiple source systems', desc: 'Workday, SAP BDC, Oracle, Snowflake' },
              { icon: '⏱', title: 'Automated schedules', desc: 'Set it and forget it — hourly to monthly' },
              { icon: '📊', title: 'Full run history', desc: 'Monitor every sync with detailed logs' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-gray-600 text-xs">© 2025 Pigment Connect. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f8f9fc]">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Pigment Connect</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-gray-500">
              {mode === 'login' ? "Sign in to manage your integrations." : "Get started — it's free."}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1 gap-1">
              {[['login', 'Sign In'], ['register', 'Create Account']].map(([m, label]) => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="Jane Smith" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
                </div>
              )}
              <div>
                <label className="label">Work Email</label>
                <input className="input" type="email" placeholder="jane@company.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoFocus={mode === 'login'} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Password</label>
                </div>
                <input className="input" type="password" placeholder="••••••••" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
                  <svg className="text-red-500 mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-red-700 text-xs leading-relaxed">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading
                  ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Please wait…</>
                  : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
