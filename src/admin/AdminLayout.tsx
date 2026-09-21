import React, { useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export type AdminTab = 'dashboard' | 'about' | 'members' | 'events' | 'media';

interface AdminLayoutProps {
  currentTab: AdminTab;
  setTab: (tab: AdminTab) => void;
  children: React.ReactNode;
}

export function AdminLayout({ currentTab, setTab, children }: AdminLayoutProps) {
  const { user, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'about', label: 'About Us Management', icon: '🏛️' },
    { id: 'members', label: 'Members Management', icon: '👥' },
    { id: 'events', label: 'Events & Workshops', icon: '🗓️' },
    { id: 'media', label: 'Media & Image Library', icon: '🖼️' },
  ];

  return (
    <div className="adm-root adm-layout">
      {/* Sidebar */}
      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
              color: '#ffffff',
            }}
          >
            ⬡
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>AgentBlazer</div>
            <div style={{ color: '#38bdf8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Admin Console
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '0 24px 8px 24px', fontSize: 11, fontWeight: 700, color: 'var(--adm-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Management
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setSidebarOpen(false);
              }}
              className={`adm-nav-item ${currentTab === item.id ? 'active' : ''}`}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* User profile & quick action */}
        <div style={{ padding: 16, borderTop: '1px solid var(--adm-border)', background: '#0b1120' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#1e293b',
                border: '1px solid var(--adm-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}
            >
              👤
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--adm-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username || 'Administrator'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--adm-text-dim)' }}>Super Admin</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="adm-btn-danger"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="adm-content-wrapper">
        {/* Top bar */}
        <header className="adm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="adm-btn-secondary md:hidden"
              style={{ padding: '6px 10px', fontSize: 16 }}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <div style={{ fontSize: 14, color: 'var(--adm-text-muted)' }}>
              <span>Admin</span>
              <span style={{ margin: '0 8px' }}>/</span>
              <span style={{ color: 'var(--adm-text-main)', fontWeight: 600 }}>
                {navItems.find((i) => i.id === currentTab)?.label || 'Console'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn-secondary"
              style={{ fontSize: 12, padding: '7px 12px' }}
            >
              <span>🌐</span>
              <span>Open Public Website</span>
              <span style={{ fontSize: 10 }}>↗</span>
            </a>
          </div>
        </header>

        {/* Body */}
        <main className="adm-main-body">{children}</main>
      </div>
    </div>
  );
}
