import React, { useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import actualLogo from '../assets/agentblazer_actual_logo.png';

export type AdminTab = 'dashboard' | 'applications' | 'queries' | 'create-event' | 'events' | 'about' | 'members' | 'media';

interface AdminLayoutProps {
  currentTab: AdminTab;
  setTab: (tab: AdminTab) => void;
  children: React.ReactNode;
}

export function AdminLayout({ currentTab, setTab, children }: AdminLayoutProps) {
  const { user, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: AdminTab; label: string; icon: string; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'create-event', label: 'Create New Event', icon: '➕', badge: '+New' },
    { id: 'events', label: 'Events & Workshops', icon: '🗓️' },
    { id: 'applications', label: 'Membership Applications', icon: '📝' },
    { id: 'queries', label: 'Queries & Inquiries', icon: '💬', badge: 'Active' },
    { id: 'about', label: 'About Us Management', icon: '🏛️' },
    { id: 'members', label: 'Members Management', icon: '👥' },
    { id: 'media', label: 'Media & Image Library', icon: '🖼️' },
  ];

  return (
    <div className="adm-root adm-layout">
      {/* Sidebar */}
      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '2px',
              flexShrink: 0,
            }}
          >
            <img src={actualLogo} alt="AgentBlazer Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>AgentBlazer</div>
            <div style={{ color: '#38bdf8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Admin Console
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="adm-sidebar-nav" style={{ padding: '16px 0' }}>
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    padding: '2px 7px',
                    borderRadius: 12,
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* User profile & quick action */}
        <div className="adm-sidebar-footer" style={{ padding: 16, borderTop: '1px solid var(--adm-border)', background: '#0b1120' }}>
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

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="adm-sidebar-backdrop visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="adm-content-wrapper">
        {/* Top bar */}
        <header className="adm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="adm-btn-secondary adm-hamburger-btn"
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setTab('queries')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: currentTab === 'queries' ? 700 : 600,
                background: currentTab === 'queries' ? 'linear-gradient(135deg, #9333ea, #7c3aed)' : 'rgba(147, 51, 234, 0.15)',
                color: currentTab === 'queries' ? '#ffffff' : '#c084fc',
                border: '1px solid rgba(147, 51, 234, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="View & Reply to Student Queries"
            >
              <span>💬</span>
              <span>Queries</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn-secondary"
              style={{ fontSize: 12, padding: '7px 12px' }}
            >
              <span>🌐</span>
              <span className="adm-topbar-public-text">Open Public Website</span>
              <span style={{ fontSize: 10 }}>↗</span>
            </a>
          </div>
        </header>

        {/* Horizontal Quick-Tab Navigation Bar - visible on all screen sizes */}
        <div
          className="adm-quick-nav-bar"
          style={{
            background: '#0d1527',
            borderBottom: '1px solid var(--adm-border)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
          }}
        >
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive
                    ? item.id === 'queries'
                      ? 'linear-gradient(135deg, #9333ea, #7c3aed)'
                      : 'rgba(56, 189, 248, 0.18)'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isActive
                    ? '#ffffff'
                    : item.id === 'queries'
                    ? '#d8b4fe'
                    : 'var(--adm-text-muted)',
                  border: isActive
                    ? item.id === 'queries'
                      ? '1px solid #c084fc'
                      : '1px solid rgba(56, 189, 248, 0.5)'
                    : '1px solid var(--adm-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'queries' && (
                  <span
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(168, 85, 247, 0.3)',
                      color: isActive ? '#ffffff' : '#c084fc',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 10,
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                    }}
                  >
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <main className="adm-main-body">{children}</main>
      </div>
    </div>
  );
}
