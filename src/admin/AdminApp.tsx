import React, { useState } from 'react';
import './admin.css';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';
import { AdminLogin } from './AdminLogin';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { AdminMembers } from './AdminMembers';
import { AdminEvents } from './AdminEvents';
import { AdminAboutUs } from './AdminAboutUs';
import { AdminMedia } from './AdminMedia';
import { AdminApplications } from './AdminApplications';
import { AdminCreateEvent } from './AdminCreateEvent';
import { AdminQueries } from './AdminQueries';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTab: (tab: AdminTab) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminTabErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AdminTabErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: 'var(--adm-surface, #0f172a)',
            border: '1px solid var(--adm-border, #334155)',
            borderRadius: 16,
            maxWidth: 600,
            margin: '40px auto',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f87171', margin: '0 0 10px 0' }}>
            Section Rendering Notice
          </h2>
          <p style={{ color: 'var(--adm-text-muted, #94a3b8)', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected rendering state occurred. Please click below to reload.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.fallbackTab('dashboard');
            }}
            className="adm-btn-primary"
          >
            ← Return to Dashboard Overview
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminContent() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  const getInitialTab = (): AdminTab => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as AdminTab;
      const validTabs: AdminTab[] = ['dashboard', 'applications', 'queries', 'create-event', 'events', 'about', 'members', 'media'];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
    }
    return 'dashboard';
  };

  const [currentTab, setCurrentTabState] = useState<AdminTab>(getInitialTab);

  const setTab = (newTab: AdminTab) => {
    setCurrentTabState(newTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState(null, '', url.toString());
    }
  };

  if (isLoading) {
    return (
      <div className="adm-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
          <div style={{ color: 'var(--adm-text-muted)', fontSize: 14 }}>Authenticating admin session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setTab('dashboard')} />;
  }

  return (
    <AdminLayout currentTab={currentTab} setTab={setTab}>
      <AdminTabErrorBoundary fallbackTab={setTab}>
        {currentTab === 'dashboard' && <AdminDashboard setTab={setTab} />}
        {currentTab === 'create-event' && <AdminCreateEvent setTab={setTab} />}
        {currentTab === 'applications' && <AdminApplications />}
        {currentTab === 'queries' && <AdminQueries />}
        {currentTab === 'about' && <AdminAboutUs />}
        {currentTab === 'members' && <AdminMembers />}
        {currentTab === 'events' && <AdminEvents setTab={setTab} />}
        {currentTab === 'media' && <AdminMedia />}
      </AdminTabErrorBoundary>
    </AdminLayout>
  );
}

export function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminContent />
    </AdminAuthProvider>
  );
}

export default AdminApp;
