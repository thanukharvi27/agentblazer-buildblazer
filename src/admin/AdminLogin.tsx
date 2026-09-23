import React, { useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export function AdminLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await login(username, password);
    setSubmitting(false);

    if (res.success) {
      onLoginSuccess();
    } else {
      setError(res.error || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div className="adm-root adm-login-wrapper">
      <div className="adm-login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              marginBottom: 16,
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            }}
          >
            🛡️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            AgentBlazer Admin Portal
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: 0 }}>
            Sign in to manage club website content &amp; media
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label className="adm-label">Administrator Email / Username</label>
            <input
              type="text"
              className="adm-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter email or username"
              autoComplete="off"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="adm-label">Password</label>
            <input
              type="password"
              className="adm-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="adm-btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: 8, height: 44 }}
          >
            {submitting ? 'Authenticating...' : 'Sign In to Dashboard →'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid var(--adm-border)', paddingTop: 16 }}>
          <a
            href="/"
            style={{
              color: 'var(--adm-text-dim)',
              fontSize: 12,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-dim)')}
          >
            ← Return to Public Website
          </a>
        </div>
      </div>
    </div>
  );
}
