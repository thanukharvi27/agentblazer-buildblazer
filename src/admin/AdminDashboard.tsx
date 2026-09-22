import React, { useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { AdminTab } from './AdminLayout';

interface Stats {
  totalMembers: number;
  totalEvents: number;
  totalMedia: number;
  totalGuests: number;
  totalApplications?: number;
  pendingApplications?: number;
}

export function AdminDashboard({ setTab }: { setTab: (tab: AdminTab) => void }) {
  const { authFetch } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authFetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Overview &amp; Content Status
        </h1>
        <p style={{ color: 'var(--adm-text-muted)', fontSize: 14, margin: 0 }}>
          Manage your club members, membership applications, workshop masterclasses, galleries, and public announcements.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="adm-stats-grid">
        <div
          className="adm-stat-card"
          onClick={() => setTab('applications')}
          style={{ cursor: 'pointer', transition: 'border-color 0.2s', border: stats?.pendingApplications ? '1px solid rgba(245, 158, 11, 0.4)' : undefined }}
        >
          <div className="adm-stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            📝
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Membership Applications
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{loading ? '...' : stats?.totalApplications ?? 0}</span>
              {(stats?.pendingApplications ?? 0) > 0 && (
                <span className="adm-badge adm-badge-orange" style={{ fontSize: 11 }}>
                  {stats?.pendingApplications} pending
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="adm-stat-card" onClick={() => setTab('members')} style={{ cursor: 'pointer' }}>
          <div className="adm-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            👥
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Club Members
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
              {loading ? '...' : stats?.totalMembers ?? 0}
            </div>
          </div>
        </div>

        <div className="adm-stat-card" onClick={() => setTab('events')} style={{ cursor: 'pointer' }}>
          <div className="adm-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            🗓️
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Events &amp; Workshops
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
              {loading ? '...' : stats?.totalEvents ?? 0}
            </div>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            🏛️
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Honored Guests
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
              {loading ? '...' : stats?.totalGuests ?? 0}
            </div>
          </div>
        </div>

        <div className="adm-stat-card" onClick={() => setTab('media')} style={{ cursor: 'pointer' }}>
          <div className="adm-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            🖼️
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Media Assets
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>
              {loading ? '...' : stats?.totalMedia ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0' }}>Quick Actions</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button className="adm-btn-primary" onClick={() => setTab('applications')} style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)' }}>
            <span>📝</span>
            <span>Review Applications {(stats?.pendingApplications ?? 0) > 0 ? `(${stats?.pendingApplications} New)` : ''}</span>
          </button>
          <button className="adm-btn-primary" onClick={() => setTab('members')}>
            <span>+</span>
            <span>Manage &amp; Add Members</span>
          </button>
          <button className="adm-btn-primary" onClick={() => setTab('events')} style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
            <span>+</span>
            <span>Manage &amp; Add Events</span>
          </button>
          <button className="adm-btn-secondary" onClick={() => setTab('media')}>
            <span>📁</span>
            <span>Upload New Images</span>
          </button>
          <button className="adm-btn-secondary" onClick={() => setTab('about')}>
            <span>✏️</span>
            <span>Edit About Us Content</span>
          </button>
        </div>
      </div>

      {/* System Status & Architecture Information */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#10b981' }}>●</span>
            <span>Persistent Database Status</span>
          </h3>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px 0' }}>
            SQLite database active with full ACID compliance. All edits made in this portal are automatically written to persistent storage and served live to visitors.
          </p>
          <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', background: '#0b1120', padding: '8px 12px', borderRadius: 6 }}>
            Storage: <code>server/data/agentblazer.db</code>
          </div>
        </div>

        <div style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#38bdf8' }}>●</span>
            <span>Image Storage &amp; CDN</span>
          </h3>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px 0' }}>
            Uploaded photos and workshop slideshow pictures are stored locally on the server filesystem and served with high-performance caching.
          </p>
          <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', background: '#0b1120', padding: '8px 12px', borderRadius: 6 }}>
            Directory: <code>server/uploads/</code>
          </div>
        </div>
      </div>
    </div>
  );
}
