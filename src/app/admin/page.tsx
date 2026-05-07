'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, Save, Plus, X, FileText, Image as ImageIcon, 
  History, CheckCircle, AlertCircle, Package 
} from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';

export default function AdminDashboard() {
  const [version, setVersion] = useState('');
  const [versionName, setVersionName] = useState('');
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const router = useRouter();

  useEffect(() => {
    // On ne pré-remplit plus la version, mais on récupère l'historique
    fetch('/api/admin/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(() => {});
  }, []);

  const handleUploadToSupabase = async (file: File, path: string) => {
    const { data, error } = await supabaseClient.storage
      .from('releases')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabaseClient.storage.from('releases').getPublicUrl(path);
    return publicUrl;
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: 'Préparation de l\'envoi...' });

    try {
      let mainFileUrl = '';
      let iconUrl = '';
      const uploadedAdditionalFiles = [];

      const timestamp = Date.now();
      const folder = `v_${version.replace(/\./g, '_')}_${timestamp}`;

      if (mainFile) {
        setStatus({ type: '', message: 'Upload du fichier Menu...' });
        mainFileUrl = await handleUploadToSupabase(mainFile, `${folder}/${mainFile.name}`);
      }

      if (iconFile) {
        setStatus({ type: '', message: 'Upload de l\'icône...' });
        iconUrl = await handleUploadToSupabase(iconFile, `${folder}/icon.png`);
      }

      for (const file of additionalFiles) {
        setStatus({ type: '', message: `Upload de ${file.name}...` });
        const url = await handleUploadToSupabase(file, `${folder}/${file.name}`);
        uploadedAdditionalFiles.push({ name: file.name, url });
      }

      setStatus({ type: '', message: 'Mise à jour des métadonnées...' });
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          version, 
          versionName,
          mainFileUrl, 
          iconUrl,
          additionalFiles: uploadedAdditionalFiles 
        }),
      });

      if (!res.ok) throw new Error('Échec de la publication');

      setStatus({ type: 'success', message: 'Mise à jour publiée avec succès !' });
      setVersion('');
      setVersionName('');
      setMainFile(null);
      setIconFile(null);
      setAdditionalFiles([]);
      
      const histRes = await fetch('/api/admin/history');
      setHistory(await histRes.json());

    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Une erreur est survenue' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="grid-layout" style={{ maxWidth: '600px' }}>
        <div className="glass-card">
          <h1>🚀 Nouvelle Mise à jour</h1>
          
          <form onSubmit={handlePublish}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Version</label>
                <input type="text" value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Nom</label>
                <input type="text" value={versionName} onChange={e => setVersionName(e.target.value)} placeholder="Update Title" required />
              </div>
            </div>

            <div className="input-group">
              <label>Fichier Menu & Icône</label>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div className={`file-zone ${mainFile ? 'has-file' : ''}`} style={{ flex: 2, padding: '1.5rem' }}>
                  <input type="file" onChange={e => setMainFile(e.target.files?.[0] || null)} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Package size={20} color={mainFile ? '#10b981' : '#64748b'} />
                    <span style={{ fontSize: '0.85rem' }}>{mainFile ? mainFile.name : 'Choisir le Menu'}</span>
                  </div>
                </div>
                
                <div className={`file-zone ${iconFile ? 'has-file' : ''}`} style={{ flex: 1, padding: '1.5rem' }}>
                  <input type="file" accept="image/*" onChange={e => setIconFile(e.target.files?.[0] || null)} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {iconFile ? <img src={URL.createObjectURL(iconFile)} className="icon-preview" style={{ width: 24, height: 24 }} /> : <ImageIcon size={20} color="#64748b" />}
                    <span style={{ fontSize: '0.8rem' }}>PNG</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label>Fichiers Additionnels</label>
              <div className="file-list">
                {additionalFiles.map((f, i) => (
                  <div key={i} className="file-list-item">
                    <FileText size={14} />
                    <span style={{ flex: 1 }}>{f.name}</span>
                    <button type="button" onClick={() => setAdditionalFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none' }}>
                      <X size={14} color="#ef4444" />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e: any) => {
                    if (e.target.files?.[0]) setAdditionalFiles(prev => [...prev, e.target.files[0]]);
                  };
                  input.click();
                }}>
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Publication...' : <><Save size={18} /> Publier</>}
            </button>

            {status.message && (
              <p className={`status ${status.type}`} style={{ marginTop: '1rem' }}>{status.message}</p>
            )}
          </form>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--accent)" /> Historique des versions
          </h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {history.map((h, i) => (
              <div key={i} className="history-item" style={{ padding: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="tag tag-version">{h.version}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{h.versionName}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                   {h.iconUrl && <img src={h.iconUrl} style={{ width: 20, height: 20, borderRadius: 4 }} />}
                   <Package size={16} color="#444" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
