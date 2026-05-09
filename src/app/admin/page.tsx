'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  Check,
  Clock3,
  Copy,
  FileCode2,
  Star,
  Trash2,
  History,
  KeyRound,
  LoaderCircle,
  Package,
  RefreshCcw,
  Save,
  Shield,
  Upload,
  Users,
} from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';

type License = {
  id: string;
  key: string;
  duration_days: number | null;
  status: string | null;
  hwid: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

type Theme = {
  id: string;
  name: string;
  author: string | null;
  status: string;
  is_default?: boolean;
  created_at: string | null;
};

type CloudConfig = {
  id: string;
  name: string;
  author: string | null;
  icon: string | null;
  color: string | null;
  status: string;
  created_at: string | null;
};

type AdminAction = {
  id: string;
  action: string;
  target_type: string;
  target_name: string | null;
  created_at: string | null;
};

type ReleaseHistory = {
  version: string;
  versionName: string;
  mainFileUrl: string;
  updatedAt: string;
};

export default function AdminDashboard() {
  const [version, setVersion] = useState('');
  const [versionName, setVersionName] = useState('');
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [configs, setConfigs] = useState<CloudConfig[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [history, setHistory] = useState<ReleaseHistory[]>([]);
  const [duration, setDuration] = useState('30');
  const [count, setCount] = useState(1);
  const [generated, setGenerated] = useState<string[]>([]);
  const [loading, setLoading] = useState('');
  const [status, setStatus] = useState('');

  const activeLicenses = useMemo(
    () => licenses.filter((license) => license.status === 'active').length,
    [licenses],
  );

  useEffect(() => {
    void refreshData();
  }, []);

  async function refreshData() {
    const [licenseRes, themeRes, configRes, actionRes, historyRes] = await Promise.all([
      fetch('/api/admin/licenses'),
      fetch('/api/admin/themes'),
      fetch('/api/configs/admin'),
      fetch('/api/admin/actions'),
      fetch('/api/admin/history'),
    ]);

    if (licenseRes.ok) setLicenses((await licenseRes.json()) as License[]);
    if (themeRes.ok) setThemes((await themeRes.json()) as Theme[]);
    if (configRes.ok) setConfigs((await configRes.json()) as CloudConfig[]);
    if (actionRes.ok) setActions((await actionRes.json()) as AdminAction[]);
    if (historyRes.ok) setHistory((await historyRes.json()) as ReleaseHistory[]);
  }

  async function uploadToSupabase(file: File, path: string) {
    const { error } = await supabaseClient.storage.from('releases').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('releases').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading('publish');
    setStatus('Uploading to Supabase Storage...');

    try {
      let mainFileUrl = '';
      if (mainFile) {
        const folder = `v_${version.replace(/\./g, '_')}_${Date.now()}`;
        mainFileUrl = await uploadToSupabase(mainFile, `${folder}/${mainFile.name}`);
      }

      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, versionName, mainFileUrl, additionalFiles: [] }),
      });

      if (!response.ok) throw new Error('Publish failed');

      setStatus('Release published. /api/download now points to this binary.');
      setVersion('');
      setVersionName('');
      setMainFile(null);
      await refreshData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading('');
    }
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading('keys');

    const response = await fetch('/api/admin/licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration, count }),
    });

    if (response.ok) {
      const data = (await response.json()) as { keys: License[] };
      setGenerated(data.keys.map((license) => license.key));
      await refreshData();
    }

    setLoading('');
  }

  async function resetHwid(id: string) {
    await fetch('/api/admin/licenses/reset-hwid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await refreshData();
  }

  async function deleteLicense(id: string, key: string) {
    const confirmed = window.confirm(`Delete license ${key}? This cannot be undone.`);
    if (!confirmed) return;

    setLoading(`delete-${id}`);
    const response = await fetch(`/api/admin/licenses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setLicenses((current) => current.filter((license) => license.id !== id));
    } else {
      const data = await response.json().catch(() => ({ error: 'Delete failed' }));
      setStatus(data.error ?? 'Delete failed');
    }

    setLoading('');
  }

  async function moderateTheme(id: string, nextStatus: 'approved' | 'rejected') {
    const response = await fetch('/api/admin/themes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    setStatus(response.ok ? `Theme ${nextStatus}.` : 'Theme moderation failed.');
    await refreshData();
  }

  async function setDefaultTheme(id: string) {
    const response = await fetch('/api/admin/themes/default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setStatus(response.ok ? 'Default theme updated.' : 'Default theme update failed.');
    await refreshData();
  }

  async function deleteTheme(id: string, name: string) {
    const confirmed = window.confirm(`Delete theme ${name}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/themes?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setStatus(response.ok ? 'Theme deleted.' : 'Theme delete failed.');
    await refreshData();
  }

  async function moderateConfig(id: string, nextStatus: 'approved' | 'rejected') {
    const response = await fetch(`/api/configs/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    setStatus(response.ok ? `Config ${nextStatus}.` : 'Config moderation failed.');
    await refreshData();
  }

  async function deleteConfig(id: string, name: string) {
    const confirmed = window.confirm(`Delete config ${name}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/configs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setStatus(response.ok ? 'Config deleted.' : 'Config delete failed.');
    await refreshData();
  }

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <span className="section-kicker">Secure Dashboard</span>
          <h1>Admin Console</h1>
          <p>Manage license keys, Supabase Storage releases, and submitted cloud themes.</p>
        </div>
        <div className="metric-strip">
          <div><KeyRound size={18} /><strong>{licenses.length}</strong><span>Keys</span></div>
          <div><Shield size={18} /><strong>{activeLicenses}</strong><span>Active</span></div>
          <div><Clock3 size={18} /><strong>{themes.filter((theme) => theme.status === 'pending').length + configs.filter((config) => config.status === 'pending').length}</strong><span>Pending</span></div>
        </div>
      </section>

      <section className="admin-grid">
        <div className="glass-card panel">
          <div className="panel-title"><Package size={20} /><h2>Release Manager</h2></div>
          <form onSubmit={handlePublish} className="stack">
            <div className="two-col">
              <div className="input-group">
                <label>Version</label>
                <input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.2.0" required />
              </div>
              <div className="input-group">
                <label>Release name</label>
                <input value={versionName} onChange={(event) => setVersionName(event.target.value)} placeholder="Loader stable" required />
              </div>
            </div>
            <label className={`file-zone ${mainFile ? 'has-file' : ''}`}>
              <input type="file" accept=".exe,application/x-msdownload" onChange={(event) => setMainFile(event.target.files?.[0] ?? null)} />
              <Upload size={22} />
              <span>{mainFile ? mainFile.name : 'Upload latest loader .exe'}</span>
            </label>
            <button className="btn btn-primary" disabled={loading === 'publish'}>
              {loading === 'publish' ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
              Publish Release
            </button>
            {status && <p className="muted">{status}</p>}
          </form>
        </div>

        <div className="glass-card panel">
          <div className="panel-title"><KeyRound size={20} /><h2>Key Generator</h2></div>
          <form onSubmit={handleGenerate} className="stack">
            <div className="segmented">
              {['1', '7', '30', 'lifetime'].map((value) => (
                <button key={value} type="button" className={duration === value ? 'active' : ''} onClick={() => setDuration(value)}>
                  {value === 'lifetime' ? 'Lifetime' : `${value}j`}
                </button>
              ))}
            </div>
            <div className="input-group">
              <label>Quantity</label>
              <input type="number" min={1} max={250} value={count} onChange={(event) => setCount(Number(event.target.value))} />
            </div>
            <button className="btn btn-primary" disabled={loading === 'keys'}>
              {loading === 'keys' ? <LoaderCircle className="spin" size={18} /> : <BadgeCheck size={18} />}
              Generate
            </button>
          </form>
          {generated.length > 0 && (
            <div className="generated-box">
              <button className="icon-action" onClick={() => void navigator.clipboard.writeText(generated.join('\n'))} aria-label="Copy keys">
                <Copy size={16} />
              </button>
              {generated.map((key) => <code key={key}>{key}</code>)}
            </div>
          )}
        </div>

        <div className="glass-card panel wide">
          <div className="panel-title"><Users size={20} /><h2>User Licenses</h2></div>
          <div className="table-list">
            {licenses.map((license) => (
              <div className="table-row" key={license.id}>
                <code>{license.key}</code>
                <span>{license.duration_days === 0 ? 'Lifetime' : `${license.duration_days ?? 30}j`}</span>
                <span className={`pill ${license.status ?? 'unused'}`}>{license.status ?? 'unused'}</span>
                <span className="truncate">{license.hwid ?? 'No HWID'}</span>
                <div className="license-actions">
                  <button className="btn btn-ghost small" onClick={() => void resetHwid(license.id)}>
                    <RefreshCcw size={15} /> Reset HWID
                  </button>
                  <button
                    className="icon-action danger"
                    onClick={() => void deleteLicense(license.id, license.key)}
                    disabled={loading === `delete-${license.id}`}
                    aria-label={`Delete license ${license.key}`}
                  >
                    {loading === `delete-${license.id}` ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
            {licenses.length === 0 && <p className="muted">No license keys yet.</p>}
          </div>
        </div>

        <div className="glass-card panel">
          <div className="panel-title"><History size={20} /><h2>Release History</h2></div>
          <div className="compact-list">
            {history.map((item) => (
              <div key={`${item.version}-${item.updatedAt}`} className="compact-item">
                <span className="pill active">{item.version}</span>
                <strong>{item.versionName}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card panel">
          <div className="panel-title"><Check size={20} /><h2>Cloud Themes</h2></div>
          <div className="compact-list">
            {themes.map((theme) => (
              <div key={theme.id} className="theme-item">
                <div>
                  <strong>{theme.name} {theme.is_default && <span className="pill active" style={{marginLeft: 8}}>Default</span>}</strong>
                  <span>{theme.author ?? 'Anonymous'} / {theme.status}</span>
                </div>
                <div className="theme-actions">
                  {theme.status === 'approved' && !theme.is_default && (
                    <button className="icon-action" onClick={() => void setDefaultTheme(theme.id)} aria-label="Set as default">
                      <Star size={16} />
                    </button>
                  )}
                  <button className="icon-action approve" onClick={() => void moderateTheme(theme.id, 'approved')} aria-label="Approve theme">
                    <Check size={16} />
                  </button>
                  <button className="icon-action reject" onClick={() => void moderateTheme(theme.id, 'rejected')} aria-label="Reject theme">
                    <Ban size={16} />
                  </button>
                  <button className="icon-action danger" onClick={() => void deleteTheme(theme.id, theme.name)} aria-label="Delete theme">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {themes.length === 0 && <p className="muted">No submitted themes.</p>}
          </div>
        </div>

        <div className="glass-card panel">
          <div className="panel-title"><FileCode2 size={20} /><h2>Cloud Configs</h2></div>
          <div className="compact-list">
            {configs.map((config) => (
              <div key={config.id} className="theme-item">
                <div>
                  <strong>{config.name}</strong>
                  <span>{config.author ?? 'Anonymous'} / {config.status} / {config.icon ?? 'file'}</span>
                </div>
                <div className="theme-actions">
                  <button className="icon-action approve" onClick={() => void moderateConfig(config.id, 'approved')} aria-label="Approve config">
                    <Check size={16} />
                  </button>
                  <button className="icon-action reject" onClick={() => void moderateConfig(config.id, 'rejected')} aria-label="Reject config">
                    <Ban size={16} />
                  </button>
                  <button className="icon-action danger" onClick={() => void deleteConfig(config.id, config.name)} aria-label="Delete config">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {configs.length === 0 && <p className="muted">No submitted configs.</p>}
          </div>
        </div>

        <div className="glass-card panel wide">
          <div className="panel-title"><History size={20} /><h2>Admin Actions</h2></div>
          <div className="compact-list">
            {actions.map((action) => (
              <div key={action.id} className="compact-item">
                <span className="pill">{action.target_type}</span>
                <strong>{action.action.replace(/_/g, ' ')}</strong>
                <span className="muted">{action.target_name ?? action.target_type}</span>
              </div>
            ))}
            {actions.length === 0 && <p className="muted">No admin actions yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
