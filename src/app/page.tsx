import { Download, Terminal } from 'lucide-react';

export default function Home() {
  return (
    <main>
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
            <Terminal size={48} color="var(--accent)" />
          </div>
        </div>
        <h1>Software Update Center</h1>
        <p style={{ color: '#888', marginBottom: '2rem', lineHeight: '1.6' }}>
          Welcome to the official distribution portal. Access the latest builds and documentation directly through our API.
        </p>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          <a href="/api/download" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Download size={18} /> Get Latest Release
          </a>
          
          <div style={{ fontSize: '0.75rem', color: '#444', marginTop: '1rem' }}>
            API endpoints: /api/version • /api/download
          </div>
        </div>
      </div>
    </main>
  );
}
