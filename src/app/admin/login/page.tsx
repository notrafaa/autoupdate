'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple cookie-based auth simulation for this demo
    // In a real app, you'd call a login API that sets a secure cookie
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      setError('Invalid password');
    }
  };

  return (
    <main>
      <div className="glass-card">
        <h1>Admin Access</h1>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="password">Access Key</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <Lock size={18} /> Authenticate
          </button>
          {error && <p className="status error">{error}</p>}
        </form>
      </div>
    </main>
  );
}
