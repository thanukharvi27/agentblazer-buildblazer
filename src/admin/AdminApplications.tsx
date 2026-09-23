import React, { useEffect, useState, useMemo } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export interface MembershipApplication {
  id: number;
  name: string;
  email: string;
  year: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  email_notified?: number;
  email_notified_at?: string;
  created_at: string;
}

interface EmailConfig {
  service: string;
  host: string;
  port: number;
  user: string;
  hasPassword: boolean;
  from: string;
  isConfigured: boolean;
}

export function AdminApplications() {
  const { authFetch } = useAdminAuth();
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals & Action loading
  const [selectedApp, setSelectedApp] = useState<MembershipApplication | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  // Email Config State
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    service: 'gmail',
    host: '',
    port: 587,
    user: '',
    pass: '',
    from: '',
  });
  const [testRecipient, setTestRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchEmailConfig = async () => {
    try {
      const res = await authFetch('/api/admin/email-settings');
      if (res.ok) {
        const data = await res.json();
        setEmailConfig(data);
        setEmailForm({
          service: data.service || 'gmail',
          host: data.host || '',
          port: data.port || 587,
          user: data.user || '',
          pass: '',
          from: data.from || '',
        });
      }
    } catch (e) {
      console.error('Failed to load email settings:', e);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      } else {
        showToast('Failed to load membership applications', 'error');
      }
    } catch (err) {
      showToast('Network error loading applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchEmailConfig();
  }, []);

  const handleStatusChange = async (id: number, newStatus: 'pending' | 'approved' | 'rejected') => {
    try {
      setUpdatingId(id);
      const res = await authFetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setApplications(prev => prev.map(a => (a.id === id ? updated : a)));
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(updated);
        }

        const isLive = emailConfig?.isConfigured;
        if (newStatus === 'approved') {
          showToast(
            isLive
              ? `Application APPROVED! Live email sent to applicant.`
              : `Application APPROVED! (Logged in DB. Configure Email Setup for real inbox delivery.)`
          );
        } else if (newStatus === 'rejected') {
          showToast(
            isLive
              ? `Application REJECTED. Live email sent to applicant.`
              : `Application REJECTED. (Logged in DB. Configure Email Setup for real inbox delivery.)`
          );
        } else {
          showToast(`Application moved back to PENDING review.`);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Network error updating application status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendEmail = async (id: number) => {
    try {
      setSendingEmailId(id);
      const res = await authFetch(`/api/admin/applications/${id}/send-email`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setApplications(prev => prev.map(a => (a.id === id ? data.application : a)));
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(data.application);
        }
        showToast(
          emailConfig?.isConfigured
            ? 'Live notification email sent to applicant inbox!'
            : 'Email notification logged in database. Set up SMTP for live inbox delivery.'
        );
      } else {
        showToast(data.error || 'Failed to dispatch email', 'error');
      }
    } catch (err) {
      showToast('Network error dispatching email', 'error');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEmail(true);
      const res = await authFetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailConfig(data.config);
        showToast('Email sender settings saved successfully!');
        setTestResult(null);
      } else {
        showToast(data.error || 'Failed to save email settings', 'error');
      }
    } catch (err) {
      showToast('Network error saving email settings', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmailConnection = async () => {
    try {
      setTestingEmail(true);
      setTestResult(null);
      const res = await authFetch('/api/admin/email-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRecipient: testRecipient || emailForm.user }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: 'Network error communicating with server' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/applications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setApplications(prev => prev.filter(a => a.id !== id));
        if (selectedApp?.id === id) setSelectedApp(null);
        setDeleteConfirmId(null);
        showToast('Application deleted successfully');
      } else {
        showToast('Failed to delete application', 'error');
      }
    } catch (err) {
      showToast('Network error deleting application', 'error');
    }
  };

  // Metrics calculation
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  // Filtered & searched data
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        app.name.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.year.toLowerCase().includes(query) ||
        (app.message && app.message.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, searchQuery]);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return <span className="adm-badge adm-badge-green">● Approved</span>;
      case 'rejected':
        return (
          <span
            className="adm-badge"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
          >
            ● Rejected
          </span>
        );
      case 'pending':
      default:
        return <span className="adm-badge adm-badge-orange">● Pending Review</span>;
    }
  };

  const getMailtoLink = (app: MembershipApplication) => {
    const isApproved = app.status === 'approved';
    const subject = isApproved
      ? '🎉 Congratulations! Your AgentBlazer Club Application is Approved'
      : 'Update on your AgentBlazer Club Membership Application';

    const body = isApproved
      ? `Dear ${app.name} (${app.year}),\n\nWe are pleased to inform you that your application for membership in the AgentBlazer Club at St Joseph Engineering College (Dept of CSE) has been APPROVED!\n\nWelcome to the team! Our committee will reach out shortly with onboarding details, community group invite links, and upcoming meeting dates.\n\nWarm regards,\nAgentBlazer Club • Dept of CSE\nSt Joseph Engineering College, Mangaluru`
      : `Dear ${app.name},\n\nThank you for your interest in joining the AgentBlazer Club at SJEC CSE.\n\nDue to high demand and limited spots for this cohort, we are unable to approve your application at this time. However, all our open workshops and seminars remain open to you!\n\nWarm regards,\nAgentBlazer Club • Dept of CSE\nSt Joseph Engineering College, Mangaluru`;

    return `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div
        className="adm-page-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Membership Applications
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 14, margin: 0 }}>
            Review, evaluate, and notify student applicants submitted through the public Join &amp; Connect portal.
          </p>
        </div>

        <div className="adm-page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* SMTP Status Pill */}
          <div
            onClick={() => setIsEmailModalOpen(true)}
            style={{
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: emailConfig?.isConfigured ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: '1px solid',
              borderColor: emailConfig?.isConfigured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
              color: emailConfig?.isConfigured ? '#34d399' : '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Click to configure sender email"
          >
            <span>{emailConfig?.isConfigured ? '●' : '⚠️'}</span>
            <span>
              {emailConfig?.isConfigured
                ? `Sender: ${emailConfig.user}`
                : 'Setup Sender Email'}
            </span>
          </div>

          <button
            className="adm-btn-secondary"
            onClick={() => setIsEmailModalOpen(true)}
            title="Configure SMTP sender credentials"
          >
            <span>⚙️</span>
            <span>Email Setup</span>
          </button>

          <button
            className="adm-btn-secondary"
            onClick={fetchApplications}
            disabled={loading}
            title="Refresh applications list"
          >
            <span style={{ display: 'inline-block', transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}>
              🔄
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="adm-stats-grid" style={{ marginBottom: 24 }}>
        <div
          className="adm-stat-card"
          onClick={() => setStatusFilter('all')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'all' ? 'var(--adm-primary)' : 'var(--adm-border)',
            background: statusFilter === 'all' ? 'rgba(59, 130, 246, 0.08)' : 'var(--adm-surface)',
          }}
        >
          <div className="adm-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Applications
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{loading ? '...' : totalCount}</div>
          </div>
        </div>

        <div
          className="adm-stat-card"
          onClick={() => setStatusFilter('pending')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'pending' ? '#fbbf24' : 'var(--adm-border)',
            background: statusFilter === 'pending' ? 'rgba(245, 158, 11, 0.08)' : 'var(--adm-surface)',
          }}
        >
          <div className="adm-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Review
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, color: pendingCount > 0 ? '#fbbf24' : 'inherit' }}>
              {loading ? '...' : pendingCount}
            </div>
          </div>
        </div>

        <div
          className="adm-stat-card"
          onClick={() => setStatusFilter('approved')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'approved' ? '#34d399' : 'var(--adm-border)',
            background: statusFilter === 'approved' ? 'rgba(16, 185, 129, 0.08)' : 'var(--adm-surface)',
          }}
        >
          <div className="adm-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            ✅
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Approved
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, color: '#34d399' }}>
              {loading ? '...' : approvedCount}
            </div>
          </div>
        </div>

        <div
          className="adm-stat-card"
          onClick={() => setStatusFilter('rejected')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'rejected' ? '#f87171' : 'var(--adm-border)',
            background: statusFilter === 'rejected' ? 'rgba(239, 68, 68, 0.08)' : 'var(--adm-surface)',
          }}
        >
          <div className="adm-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            ❌
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Rejected
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, color: '#f87171' }}>
              {loading ? '...' : rejectedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="adm-filter-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          background: 'var(--adm-surface)',
          border: '1px solid var(--adm-border)',
          borderRadius: 12,
          padding: '12px 18px',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                background: statusFilter === tab ? 'var(--adm-primary)' : 'rgba(255,255,255,0.04)',
                color: statusFilter === tab ? '#ffffff' : 'var(--adm-text-muted)',
                border: '1px solid',
                borderColor: statusFilter === tab ? 'var(--adm-primary)' : 'var(--adm-border)',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'all' ? `All (${totalCount})` : `${tab} (${applications.filter(a => a.status === tab).length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="adm-search-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--adm-text-dim)',
                fontSize: 14,
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, email, year..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="adm-input"
              style={{ paddingLeft: 34, fontSize: 13, height: 38 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--adm-text-dim)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="adm-table-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            Loading membership applications...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Applications Found</div>
            <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, maxWidth: 400, margin: '0 auto 16px' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter tab to view other applications.'
                : 'No membership applications have been submitted yet through the public Join page.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                className="adm-btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Applicant</th>
                  <th style={{ width: '12%' }}>Year</th>
                  <th style={{ width: '15%' }}>Date Applied</th>
                  <th style={{ width: '16%' }}>Status &amp; Notification</th>
                  <th style={{ width: '18%' }}>Statement Preview</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {app.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--adm-text-main)', fontSize: 13 }}>
                            {app.name}
                          </div>
                          <a
                            href={`mailto:${app.email}`}
                            style={{
                              color: 'var(--adm-text-muted)',
                              fontSize: 12,
                              textDecoration: 'none',
                              display: 'inline-block',
                              marginTop: 2,
                            }}
                            onMouseOver={e => (e.currentTarget.style.color = '#38bdf8')}
                            onMouseOut={e => (e.currentTarget.style.color = 'var(--adm-text-muted)')}
                          >
                            ✉️ {app.email}
                          </a>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="adm-badge adm-badge-blue">{app.year}</span>
                    </td>

                    <td style={{ color: 'var(--adm-text-muted)', fontSize: 12 }}>
                      {formatDate(app.created_at)}
                    </td>

                    <td>
                      <div>
                        {getStatusBadge(app.status)}
                        {app.status !== 'pending' && (
                          <div style={{ fontSize: 11, color: app.email_notified ? '#38bdf8' : '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{app.email_notified ? '✉️ Notified' : '⚠️ Pending Email'}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div
                        style={{
                          color: 'var(--adm-text-muted)',
                          fontSize: 12,
                          maxWidth: 220,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedApp(app)}
                        title="Click to read full statement"
                      >
                        {app.message || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No statement provided</span>}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="adm-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={() => setSelectedApp(app)}
                          title="View complete application details"
                        >
                          👁️ View
                        </button>

                        {app.status !== 'approved' && (
                          <button
                            className="adm-btn-secondary"
                            style={{
                              padding: '6px 10px',
                              fontSize: 12,
                              color: '#34d399',
                              borderColor: 'rgba(16,185,129,0.3)',
                              fontWeight: 700,
                            }}
                            disabled={updatingId === app.id}
                            onClick={() => handleStatusChange(app.id, 'approved')}
                            title="Approve applicant & send email notification"
                          >
                            {updatingId === app.id ? '...' : '✓ Approve'}
                          </button>
                        )}

                        {app.status !== 'rejected' && (
                          <button
                            className="adm-btn-secondary"
                            style={{
                              padding: '6px 10px',
                              fontSize: 12,
                              color: '#f87171',
                              borderColor: 'rgba(239,68,68,0.3)',
                              fontWeight: 700,
                            }}
                            disabled={updatingId === app.id}
                            onClick={() => handleStatusChange(app.id, 'rejected')}
                            title="Reject applicant & send email notification"
                          >
                            {updatingId === app.id ? '...' : '✕ Reject'}
                          </button>
                        )}

                        <button
                          className="adm-btn-danger"
                          style={{ padding: '6px 8px', fontSize: 12 }}
                          onClick={() => setDeleteConfirmId(app.id)}
                          title="Delete application"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="adm-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="adm-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="adm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📝</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Membership Application Details</h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                style={{ background: 'none', border: 'none', color: 'var(--adm-text-muted)', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body">
              {/* Applicant Card */}
              <div
                style={{
                  background: 'var(--adm-surface-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {selectedApp.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--adm-text-main)' }}>
                    {selectedApp.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--adm-text-muted)', marginTop: 2 }}>
                    <a href={`mailto:${selectedApp.email}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                      {selectedApp.email}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <span className="adm-badge adm-badge-blue">Year: {selectedApp.year}</span>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--adm-text-dim)', paddingLeft: 4 }}>
                <div>
                  Submitted: <strong style={{ color: 'var(--adm-text-muted)' }}>{formatDate(selectedApp.created_at)}</strong>
                </div>
                {selectedApp.email_notified_at && (
                  <div>
                    Email Sent: <strong style={{ color: '#38bdf8' }}>{formatDate(selectedApp.email_notified_at)}</strong>
                  </div>
                )}
              </div>

              {/* Statement of Interest */}
              <div>
                <label className="adm-label">Statement of Interest / Why Join AgentBlazer:</label>
                <div
                  style={{
                    background: '#0b1120',
                    border: '1px solid var(--adm-border)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: selectedApp.message ? 'var(--adm-text-main)' : 'var(--adm-text-dim)',
                    minHeight: 80,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedApp.message || 'No statement was provided with this application.'}
                </div>
              </div>

              {/* Status Update Quick Toggles */}
              <div>
                <label className="adm-label">Change Status &amp; Dispatch Notification:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    style={{
                      flex: 1,
                      background: selectedApp.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : undefined,
                      borderColor: selectedApp.status === 'pending' ? '#fbbf24' : undefined,
                      color: selectedApp.status === 'pending' ? '#fbbf24' : undefined,
                    }}
                    onClick={() => handleStatusChange(selectedApp.id, 'pending')}
                    disabled={updatingId === selectedApp.id}
                  >
                    ⏳ Pending Review
                  </button>
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    style={{
                      flex: 1,
                      background: selectedApp.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : undefined,
                      borderColor: selectedApp.status === 'approved' ? '#34d399' : undefined,
                      color: selectedApp.status === 'approved' ? '#34d399' : undefined,
                    }}
                    onClick={() => handleStatusChange(selectedApp.id, 'approved')}
                    disabled={updatingId === selectedApp.id}
                  >
                    {updatingId === selectedApp.id ? 'Updating...' : '✅ Approve & Notify'}
                  </button>
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    style={{
                      flex: 1,
                      background: selectedApp.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : undefined,
                      borderColor: selectedApp.status === 'rejected' ? '#f87171' : undefined,
                      color: selectedApp.status === 'rejected' ? '#f87171' : undefined,
                    }}
                    onClick={() => handleStatusChange(selectedApp.id, 'rejected')}
                    disabled={updatingId === selectedApp.id}
                  >
                    {updatingId === selectedApp.id ? 'Updating...' : '❌ Reject & Notify'}
                  </button>
                </div>
              </div>

              {/* Email Notification Panel */}
              {selectedApp.status !== 'pending' && (
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.05)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text-main)' }}>
                        ✉️ Email Notification Status
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--adm-text-muted)', marginTop: 2 }}>
                        {selectedApp.email_notified
                          ? `Notification logged & sent on ${formatDate(selectedApp.email_notified_at)}`
                          : 'Notification has not been sent yet.'}
                        {!emailConfig?.isConfigured && (
                          <span style={{ color: '#fbbf24', display: 'block', marginTop: 2 }}>
                            ⚠️ Sender email is unconfigured; notification recorded in database only.
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        className="adm-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        disabled={sendingEmailId === selectedApp.id}
                        onClick={() => handleSendEmail(selectedApp.id)}
                      >
                        {sendingEmailId === selectedApp.id ? 'Sending...' : '📨 Re-send Email'}
                      </button>

                      <a
                        href={getMailtoLink(selectedApp)}
                        className="adm-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}
                        title="Open your system mail client with pre-filled subject and letter"
                      >
                        📬 Open in Mail App
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn-danger"
                onClick={() => {
                  setDeleteConfirmId(selectedApp.id);
                  setSelectedApp(null);
                }}
              >
                🗑️ Delete Application
              </button>
              <button type="button" className="adm-btn-primary" onClick={() => setSelectedApp(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="adm-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="adm-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="adm-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f87171' }}>
                Confirm Deletion
              </h3>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--adm-text-muted)', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <p style={{ margin: 0, fontSize: 14, color: 'var(--adm-text-muted)', lineHeight: 1.5 }}>
                Are you sure you want to delete this membership application? This action cannot be undone.
              </p>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className="adm-btn-danger" onClick={() => handleDelete(deleteConfirmId)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Sender Setup Modal */}
      {isEmailModalOpen && (
        <div className="adm-modal-overlay" onClick={() => setIsEmailModalOpen(false)}>
          <div className="adm-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="adm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>⚙️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Email Sender Configuration</h3>
                  <div style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>
                    Connect an email account to send real approval/rejection emails to applicants
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--adm-text-muted)', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmailSettings}>
              <div className="adm-modal-body">
                {/* Method selector */}
                <div>
                  <label className="adm-label">Mail Provider / Protocol:</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button
                      type="button"
                      className="adm-btn-secondary"
                      style={{
                        flex: 1,
                        background: emailForm.service === 'gmail' ? 'rgba(56, 189, 248, 0.15)' : undefined,
                        borderColor: emailForm.service === 'gmail' ? '#38bdf8' : undefined,
                        color: emailForm.service === 'gmail' ? '#38bdf8' : undefined,
                        fontWeight: 600,
                      }}
                      onClick={() => setEmailForm(prev => ({ ...prev, service: 'gmail', host: '', port: 587 }))}
                    >
                      Gmail (Recommended)
                    </button>
                    <button
                      type="button"
                      className="adm-btn-secondary"
                      style={{
                        flex: 1,
                        background: emailForm.service !== 'gmail' ? 'rgba(56, 189, 248, 0.15)' : undefined,
                        borderColor: emailForm.service !== 'gmail' ? '#38bdf8' : undefined,
                        color: emailForm.service !== 'gmail' ? '#38bdf8' : undefined,
                        fontWeight: 600,
                      }}
                      onClick={() => setEmailForm(prev => ({ ...prev, service: '', host: prev.host || 'smtp.gmail.com', port: 587 }))}
                    >
                      Custom SMTP / SJEC Server
                    </button>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="adm-label">Sender Email Address:</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. agentblazer@sjec.ac.in or yourname@gmail.com"
                    value={emailForm.user}
                    onChange={e => setEmailForm(prev => ({ ...prev, user: e.target.value }))}
                    className="adm-input"
                  />
                </div>

                {/* App Password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="adm-label" style={{ margin: 0 }}>
                      App Password {emailConfig?.hasPassword ? '(Saved • Leave blank to keep)' : '(Required)'}:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={emailConfig?.hasPassword ? '••••••••••••••••' : 'Enter 16-character App Password'}
                    value={emailForm.pass}
                    onChange={e => setEmailForm(prev => ({ ...prev, pass: e.target.value }))}
                    className="adm-input"
                  />
                </div>

                {/* Custom host & port if not Gmail */}
                {emailForm.service !== 'gmail' && (
                  <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                    <div>
                      <label className="adm-label">SMTP Host:</label>
                      <input
                        type="text"
                        placeholder="smtp.example.com"
                        value={emailForm.host}
                        onChange={e => setEmailForm(prev => ({ ...prev, host: e.target.value }))}
                        className="adm-input"
                      />
                    </div>
                    <div>
                      <label className="adm-label">Port:</label>
                      <input
                        type="number"
                        placeholder="587"
                        value={emailForm.port}
                        onChange={e => setEmailForm(prev => ({ ...prev, port: Number(e.target.value) }))}
                        className="adm-input"
                      />
                    </div>
                  </div>
                )}

                {/* From Name Header */}
                <div>
                  <label className="adm-label">Display From Name (Optional):</label>
                  <input
                    type="text"
                    placeholder='"AgentBlazer Club • SJEC CSE" <agentblazer@sjec.ac.in>'
                    value={emailForm.from}
                    onChange={e => setEmailForm(prev => ({ ...prev, from: e.target.value }))}
                    className="adm-input"
                  />
                </div>

                {/* How to get Gmail App Password Instructions */}
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: '#93c5fd',
                  }}
                >
                  <strong style={{ color: '#ffffff', display: 'block', marginBottom: 4 }}>
                    💡 How to generate a Gmail App Password in 2 minutes:
                  </strong>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Open your Google Account (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>myaccount.google.com/security</a>).</li>
                    <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
                    <li>Search for <strong>App passwords</strong> in the search bar.</li>
                    <li>Name it <code>AgentBlazer</code>, copy the generated 16-character code, and paste it into the password box above.</li>
                  </ol>
                </div>

                {/* Connection Test Section */}
                <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: 14 }}>
                  <label className="adm-label">Verify Connection / Send Test Email:</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="email"
                      placeholder="Recipient for test email (e.g. your email)"
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      className="adm-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="adm-btn-secondary"
                      disabled={testingEmail || !emailConfig?.isConfigured && !emailForm.user}
                      onClick={handleTestEmailConnection}
                    >
                      {testingEmail ? 'Testing...' : '🧪 Test SMTP'}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 12,
                        background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid',
                        borderColor: testResult.success ? '#10b981' : '#ef4444',
                        color: testResult.success ? '#34d399' : '#f87171',
                      }}
                    >
                      {testResult.success ? `✓ ${testResult.message}` : `✕ ${testResult.error}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="adm-modal-footer">
                <button type="button" className="adm-btn-secondary" onClick={() => setIsEmailModalOpen(false)}>
                  Close
                </button>
                <button type="submit" className="adm-btn-primary" disabled={savingEmail}>
                  {savingEmail ? 'Saving...' : '💾 Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
