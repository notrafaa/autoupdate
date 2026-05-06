'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Save, CheckCircle, AlertCircle, FileCode } from 'lucide-react';

export default function AdminDashboard() {
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.text())
      .then(v => setVersion(v))
      .catch(() => {});
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('version', version);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: `Published version ${data.version} successfully!` });
        setFile(null);
      } else {
        setStatus({ type: 'error', message: data.error || 'Something went wrong' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="glass-card">
        <h1>Update Management</h1>
        
        <form onSubmit={handlePublish}>
          <div className="input-group">
            <label htmlFor="version">Release Version</label>
            <input
              type="text"
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 1.0.1"
              required
            />
          </div>

          <div className="input-group">
            <label>Executable File (.exe)</label>
            <div className="file-upload">
              <Upload size={24} color="#888" />
              <p style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.9rem' }}>
                {file ? file.name : 'Click or drag .exe here'}
              </p>
              <input
                type="file"
                accept=".exe"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (
              <><Save size={18} /> Publish Update</>
            )}
          </button>

          {status.message && (
            <div className={`status ${status.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {status.message}
            </div>
          )}
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
           <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
             Current Live Endpoint: <code style={{ color: '#aaa' }}>/api/download</code>
           </p>
        </div>
      </div>
    </main>
  );
}
