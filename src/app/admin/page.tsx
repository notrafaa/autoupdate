'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, Save, Plus, X, FileText, Image as ImageIcon, 
  History, CheckCircle, AlertCircle, Trash2, Package 
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
    fetch('/api/version')
      .then(res => res.text())
      .then(v => setVersion(v))
      .catch(() => {});
    
    // Fetch History
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

      // 1. Upload Main File (.all)
      if (mainFile) {
        setStatus({ type: '', message: 'Upload du fichier Menu (.all)...' });
        mainFileUrl = await handleUploadToSupabase(mainFile, `${folder}/${mainFile.name}`);
      }

      // 2. Upload Icon
      if (iconFile) {
        setStatus({ type: '', message: 'Upload de l\'icône...' });
        iconUrl = await handleUploadToSupabase(iconFile, `${folder}/icon.png`);
      }

      // 3. Upload Additional Files
      for (const file of additionalFiles) {
        setStatus({ type: '', message: `Upload de ${file.name}...` });
        const url = await handleUploadToSupabase(file, `${folder}/${file.name}`);
        uploadedAdditionalFiles.push({ name: file.name, url });
      }

      // 4. Update Metadata
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

      if (!res.ok) throw new Error('Échec de la mise à jour des métadonnées');

      setStatus({ type: 'success', message: 'Mise à jour publiée avec succès !' });
      // Reset files
      setMainFile(null);
      setIconFile(null);
      setAdditionalFiles([]);
      // Refresh history
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
      <div className="grid-layout">
        <div className="glass-card">
          <h1>🚀 Publier une Mise à jour</h1>
          
          <form onSubmit={handlePublish}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="input-group">
                <label>Numéro de Version</label>
                <input type="text" value={version} onChange={e => setVersion(e.target.value)} placeholder="ex: 1.0.2" required />
              </div>
              <div className="input-group">
                <label>Nom de l'Update</label>
                <input type="text" value={versionName} onChange={e => setVersionName(e.target.value)} placeholder="ex: The Big Update" required />
              </div>
            </div>

            <div className="input-group">
              <label>Fichier Menu (.all) & Icône</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className={`file-zone ${mainFile ? 'has-file' : ''}`} style={{ flex: 2 }}>
                  <input type="file" onChange={e => setMainFile(e.target.files?.[0] || null)} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Package size={24} color={mainFile ? '#10b981' : '#64748b'} />
                    <span style={{ fontSize: '0.9rem' }}>{mainFile ? mainFile.name : 'Glisser le fichier .all'}</span>
                  </div>
                </div>
                
                <div className={`file-zone ${iconFile ? 'has-file' : ''}`} style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={e => setIconFile(e.target.files?.[0] || null)} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {iconFile ? <img src={URL.createObjectURL(iconFile)} className="icon-preview" /> : <ImageIcon size={20} color="#64748b" />}
                    <span style={{ fontSize: '0.8rem' }}>Icône PNG</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label>Fichiers Additionnels (Optionnel)</label>
              <div className="file-list">
                {additionalFiles.map((f, i) => (
                  <div key={i} className="file-list-item">
                    <FileText size={16} />
                    <span style={{ flex: 1 }}>{f.name}</span>
                    <button type="button" onClick={() => setAdditionalFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={16} color="#ef4444" />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost" style={{ width: 'fit-content', marginTop: '0.5rem' }} onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e: any) => {
                    if (e.target.files?.[0]) setAdditionalFiles(prev => [...prev, e.target.files[0]]);
                  };
                  input.click();
                }}>
                  <Plus size={16} /> Ajouter un fichier
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Publication en cours...' : <><Save size={18} /> Publier la version {version}</>}
            </button>

            {status.message && (
              <div className={`status ${status.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {status.message}
              </div>
            )}
          </form>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="var(--accent)" /> Historique
          </h2>
          <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {history.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.9rem' }}>Aucune version publiée</p> : 
              history.map((h, i) => (
                <div key={i} className="history-item">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="tag tag-version">{h.version}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{h.versionName}</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.3rem' }}>
                      {new Date(h.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {h.iconUrl && <img src={h.iconUrl} style={{ width: 24, height: 24, borderRadius: 4 }} />}
                    <FileText size={18} color="#444" />
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </main>
  );
}
