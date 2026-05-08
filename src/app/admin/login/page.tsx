'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      router.push('/admin');
      router.refresh();
      return;
    }

    setError('Invalid password');
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <Lock size={22} />
          </div>
          <div>
            <h1>Admin Access</h1>
            <p>Authenticate to manage licenses and releases.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="password">Access Key</label>
            <div className="input-shell">
              <Lock size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="primary-button">
            <Lock size={18} />
            Authenticate
          </button>
        </form>

        {error && (
          <div className="auth-message bad">
            <strong>Error</strong>
            <span>{error}</span>
          </div>
        )}
      </section>
    </main>
  );
}
