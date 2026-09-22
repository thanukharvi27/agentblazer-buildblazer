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

function AdminContent() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [currentTab, setTab] = useState<AdminTab>('dashboard');

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
      {currentTab === 'dashboard' && <AdminDashboard setTab={setTab} />}
      {currentTab === 'applications' && <AdminApplications />}
      {currentTab === 'about' && <AdminAboutUs />}
      {currentTab === 'members' && <AdminMembers />}
      {currentTab === 'events' && <AdminEvents />}
      {currentTab === 'media' && <AdminMedia />}
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
