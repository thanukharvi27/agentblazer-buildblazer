import React, { useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { getApiUrl } from '../config/api';

type AuthView = 'login' | 'forgot' | 'reset-code' | 'success';

export function AdminLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { login } = useAdminAuth();

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View Navigation: 'login' | 'forgot' | 'reset-code' | 'success'
  const [view, setView] = useState<AuthView>('login');

  // Password Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Standard Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  // Step 1: Request 6-digit verification code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccessMessage(null);

    const cleanEmail = resetEmail.trim();
    if (!cleanEmail) {
      setError('Please enter your administrator email.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Backend endpoint not found (404). Please ensure the latest backend deployment is complete on Render.');
        }
        throw new Error(data.error || `Server returned error (${res.status}).`);
      }

      setResetSuccessMessage(data.message || 'Verification code sent to your email.');
      setView('reset-code');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please check your connection.');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: Verify code and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = resetCode.trim();
    if (!cleanCode) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          code: cleanCode,
          newPassword,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Backend endpoint not found (404). Please ensure the latest backend deployment is complete on Render.');
        }
        throw new Error(data.error || `Server returned error (${res.status}).`);
      }

      setView('success');
      setUsername(resetEmail.trim());
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="adm-root adm-login-wrapper">
      <div className="adm-login-card">
        {/* ===================== VIEW 1: SIGN IN ===================== */}
        {view === 'login' && (
          <>
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

            <form onSubmit={handleLoginSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="adm-label" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError(null);
                      setResetEmail(username || '');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#7dd3fc')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="adm-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="new-password"
                    style={{ paddingRight: 40 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--adm-text-dim)',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: 4,
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
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
          </>
        )}

        {/* ===================== VIEW 2: FORGOT PASSWORD (REQUEST CODE) ===================== */}
        {view === 'forgot' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  marginBottom: 16,
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
                }}
              >
                🔑
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Reset Admin Password
              </h1>
              <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Enter your administrator email to receive a 6-digit verification code.
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

            <form onSubmit={handleRequestCode} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="adm-label">Administrator Registered Email</label>
                <input
                  type="email"
                  className="adm-input"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@agentblazer.ac.in"
                  autoComplete="off"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="adm-btn-primary"
                disabled={resetLoading}
                style={{ width: '100%', height: 44 }}
              >
                {resetLoading ? 'Sending Verification Code...' : 'Send Verification Code →'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError(null);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-dim)',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-dim)')}
              >
                ← Back to Sign In
              </button>
            </form>
          </>
        )}

        {/* ===================== VIEW 3: ENTER CODE & SET NEW PASSWORD ===================== */}
        {view === 'reset-code' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  marginBottom: 16,
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                }}
              >
                ✉️
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Enter Verification Code
              </h1>
              <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                We sent a 6-digit code to <strong style={{ color: '#38bdf8' }}>{resetEmail}</strong>.
              </p>
            </div>

            {resetSuccessMessage && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#6ee7b7',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>✓</span>
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  padding: '12px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="adm-label">6-Digit Verification Code</label>
                <input
                  type="text"
                  className="adm-input"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: 8,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="adm-label">New Password (min. 6 characters)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="adm-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    style={{ paddingRight: 40 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--adm-text-dim)',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: 4,
                    }}
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="adm-label">Confirm New Password</label>
                <input
                  type="password"
                  className="adm-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="adm-btn-primary"
                disabled={resetLoading}
                style={{ width: '100%', height: 44, marginTop: 4 }}
              >
                {resetLoading ? 'Updating Password...' : 'Reset Password & Save →'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={resetLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--adm-text-dim)',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ← Cancel
                </button>
              </div>
            </form>
          </>
        )}

        {/* ===================== VIEW 4: RESET SUCCESS ===================== */}
        {view === 'success' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.5)',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 18,
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px 0', color: '#f8fafc' }}>
              Password Reset Complete!
            </h2>
            <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Your administrator password has been updated successfully. You can now sign in with your new credentials.
            </p>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={() => {
                setView('login');
                setError(null);
              }}
              style={{ width: '100%', height: 44 }}
            >
              Sign In to Dashboard →
            </button>
          </div>
        )}

        {/* Return to public site footer link */}
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
              transition: 'color 0.2s',
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
