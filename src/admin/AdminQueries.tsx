import React, { useState, useEffect } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export interface QueryRecord {
  id: number;
  name: string;
  email: string;
  year: string;
  query: string;
  status: 'pending' | 'resolved' | 'replied';
  admin_reply: string | null;
  replied_at: string | null;
  reply_email_status: string | null;
  reply_email_error: string | null;
  created_at: string;
}

export function AdminQueries() {
  const { authFetch } = useAdminAuth();
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<QueryRecord | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5500);
  };

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/queries');
      if (res.ok) {
        const data = await res.json();
        setQueries(data);
      } else {
        showToast('Failed to load queries', 'error');
      }
    } catch {
      showToast('Network error loading queries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleOpenReplyModal = (q: QueryRecord) => {
    setSelectedQuery(q);
    setReplyText(q.admin_reply || '');
  };

  const buildQueryMailContent = (q: QueryRecord, customReply?: string) => {
    const replyContent = (customReply !== undefined ? customReply : (replyText || q.admin_reply || '')).trim();
    const subject = `Response to your Inquiry: ${q.query.slice(0, 36)}... – Dept of CSE, SJEC`;
    const body = `Dear ${q.name || 'Student'},

Thank you for reaching out to the Department of Computer Science & Engineering (AgentBlazer Club) at St Joseph Engineering College.

Regarding your inquiry:
"${q.query}"

${replyContent || '[Response from CSE Coordinators]'}

If you need any further assistance, feel free to reply directly to this email or visit the Department of CSE office.

Warm regards,
Department of Computer Science & Engineering
AgentBlazer Club • St Joseph Engineering College
Vamanjoor, Mangaluru – 575028`;

    return { subject, body };
  };

  const handleOpenQueryGmailWeb = async (q: QueryRecord, customReply?: string) => {
    const effectiveReply = (customReply !== undefined ? customReply : replyText).trim();
    const { subject, body } = buildQueryMailContent(q, effectiveReply);

    // Save reply to DB if provided
    if (effectiveReply) {
      try {
        await authFetch(`/api/admin/queries/${q.id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: effectiveReply }),
        });
      } catch {
        // ignore
      }
    }

    // Open Gmail Web compose tab
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(q.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');

    // Mark email as sent in DB
    try {
      await authFetch(`/api/admin/queries/${q.id}/mark-email-sent`, { method: 'POST' });
      setQueries(prev => prev.map(item => item.id === q.id ? { ...item, status: 'replied', reply_email_status: 'sent', admin_reply: effectiveReply || item.admin_reply } : item));
      if (selectedQuery?.id === q.id) {
        setSelectedQuery(prev => (prev ? { ...prev, status: 'replied', reply_email_status: 'sent', admin_reply: effectiveReply || prev.admin_reply } : null));
      }
    } catch {
      // ignore
    }

    showToast('Opened in Gmail Web! Reply saved & marked as sent.');
  };

  const handleOpenQueryMailApp = async (q: QueryRecord, customReply?: string) => {
    const effectiveReply = (customReply !== undefined ? customReply : replyText).trim();
    const { subject, body } = buildQueryMailContent(q, effectiveReply);

    if (effectiveReply) {
      try {
        await authFetch(`/api/admin/queries/${q.id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: effectiveReply }),
        });
      } catch {
        // ignore
      }
    }

    const mailtoUrl = `mailto:${encodeURIComponent(q.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    try {
      await authFetch(`/api/admin/queries/${q.id}/mark-email-sent`, { method: 'POST' });
      setQueries(prev => prev.map(item => item.id === q.id ? { ...item, status: 'replied', reply_email_status: 'sent', admin_reply: effectiveReply || item.admin_reply } : item));
      if (selectedQuery?.id === q.id) {
        setSelectedQuery(prev => (prev ? { ...prev, status: 'replied', reply_email_status: 'sent', admin_reply: effectiveReply || prev.admin_reply } : null));
      }
    } catch {
      // ignore
    }

    showToast('Opened in Mail App! Reply saved & marked as sent.');
  };

  const handleCopyQueryReply = (q: QueryRecord, customReply?: string) => {
    const { subject, body } = buildQueryMailContent(q, customReply || replyText);
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    showToast('Copied full email reply to clipboard!');
  };

  const handleSendReply = async () => {
    if (!selectedQuery) return;
    if (!replyText.trim()) {
      showToast('Please type a reply message.', 'error');
      return;
    }

    try {
      setSubmittingReply(true);
      const res = await authFetch(`/api/admin/queries/${selectedQuery.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.query;
        setQueries(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        setSelectedQuery(updated);
        showToast('Reply saved successfully in database!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save reply', 'error');
      }
    } catch {
      showToast('Network error saving reply', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusToggle = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    try {
      const res = await authFetch(`/api/admin/queries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setQueries(prev => prev.map(q => (q.id === id ? { ...q, status: updated.status } : q)));
        if (selectedQuery && selectedQuery.id === id) {
          setSelectedQuery(prev => (prev ? { ...prev, status: updated.status } : null));
        }
        showToast(`Query marked as ${nextStatus.toUpperCase()}`);
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch {
      showToast('Network error updating status', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/queries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQueries(prev => prev.filter(q => q.id !== id));
        if (selectedQuery && selectedQuery.id === id) {
          setSelectedQuery(null);
        }
        setDeleteConfirmId(null);
        showToast('Query deleted successfully');
      } else {
        showToast('Failed to delete query', 'error');
      }
    } catch {
      showToast('Network error deleting query', 'error');
    }
  };

  const filteredQueries = queries.filter(q => {
    const matchesFilter =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? q.status === 'pending'
        : q.status === 'replied' || q.status === 'resolved';

    const qSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !qSearch ||
      q.name.toLowerCase().includes(qSearch) ||
      q.email.toLowerCase().includes(qSearch) ||
      q.year.toLowerCase().includes(qSearch) ||
      q.query.toLowerCase().includes(qSearch);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = queries.filter(q => q.status === 'pending').length;
  const repliedCount = queries.filter(q => q.status === 'replied' || q.status === 'resolved').length;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const applyTemplate = (type: 'general' | 'club' | 'workshop') => {
    if (!selectedQuery) return;
    const name = selectedQuery.name.split(' ')[0] || selectedQuery.name;
    if (type === 'general') {
      setReplyText(
        `Dear ${name},\n\nThank you for reaching out to the Department of Computer Science & Engineering. Regarding your inquiry, our team has reviewed your query and here are the details:\n\n[Please enter response details here]\n\nFeel free to write back if you need any additional clarification.`
      );
    } else if (type === 'club') {
      setReplyText(
        `Dear ${name},\n\nThank you for your interest in the AgentBlazer Club at SJEC CSE. Our membership opens at the start of each semester, offering hands-on autonomous AI projects, Trailhead org credits, and mentorship.\n\nYou can also submit a membership application via the club website.\n\nBest regards,\nAgentBlazer Working Committee`
      );
    } else if (type === 'workshop') {
      setReplyText(
        `Dear ${name},\n\nRegarding your question about upcoming workshops: We organize regular hands-on sessions on Agentforce, LLM fine-tuning, and multi-agent workflows in the CSE Department Turing Hall.\n\nKeep an eye on the Events section of our website for registration dates!\n\nBest regards,\nFaculty Coordinator & Student Leads`
      );
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: 10,
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Student &amp; Visitor Queries
            </h1>
            {pendingCount > 0 && (
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                }}
              >
                {pendingCount} Pending Response
              </span>
            )}
          </div>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 14, margin: 0, maxWidth: 650 }}>
            Inquiries received via the <strong>Contact CSE Department</strong> form on the public website. Read each question, review student details, and dispatch email replies directly from this dashboard.
          </p>
        </div>

        <button
          className="adm-btn-secondary"
          onClick={fetchQueries}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'all', label: `All (${queries.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'replied', label: `Replied (${repliedCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={statusFilter === tab.id ? 'adm-btn-primary' : 'adm-btn-secondary'}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ minWidth: 260, position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--adm-text-dim)',
              fontSize: 14,
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search queries, names, emails..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="adm-input"
            style={{ paddingLeft: 34, fontSize: 13, height: 38, width: '100%' }}
          />
        </div>
      </div>

      {/* Queries Table Card */}
      <div className="adm-table-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            Loading inquiries...
          </div>
        ) : filteredQueries.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Queries Found</div>
            <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, maxWidth: 420, margin: '0 auto 16px' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search keywords or filter tab.'
                : 'No inquiries have been submitted yet through the CSE Department contact form.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Inquirer</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Year / Role</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Query Message</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries.map(q => {
                  const isReplied = q.status === 'replied' || Boolean(q.admin_reply);
                  return (
                    <tr
                      key={q.id}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                        background: q.status === 'pending' ? 'rgba(245, 158, 11, 0.02)' : undefined,
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #1e293b, #334155)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              color: '#38bdf8',
                              flexShrink: 0,
                            }}
                          >
                            {q.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{q.name}</div>
                            <a
                              href={`mailto:${q.email}`}
                              style={{ color: 'var(--adm-text-muted)', fontSize: 12, textDecoration: 'none' }}
                            >
                              ✉️ {q.email}
                            </a>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className="adm-badge adm-badge-blue">{q.year}</span>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--adm-text-muted)', fontSize: 12 }}>
                        {formatDate(q.created_at)}
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: 280 }}>
                        <div
                          onClick={() => handleOpenReplyModal(q)}
                          style={{
                            color: '#cbd5e1',
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                          }}
                          title={q.query}
                        >
                          {q.query}
                        </div>
                        {q.admin_reply && (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#34d399',
                              marginTop: 4,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            ↳ Response: "{q.admin_reply}"
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {isReplied ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              ✓ Replied
                            </span>
                            {q.reply_email_status === 'sent' && (
                              <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 3 }}>✉️ Email Sent</div>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            ● Pending
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            className="adm-btn-primary"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => handleOpenReplyModal(q)}
                            title="View inquiry and compose email reply"
                          >
                            {isReplied ? '👁️ View / Reply' : '💬 Respond'}
                          </button>

                          <button
                            className="adm-btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: 12,
                              color: '#38bdf8',
                              borderColor: 'rgba(56,189,248,0.3)',
                              fontWeight: 600,
                            }}
                            onClick={() => handleOpenReplyModal(q)}
                            title="Open pre-filled email composer (Gmail Web / Mail App)"
                          >
                            ✉️ Mail
                          </button>

                          <button
                            className="adm-btn-secondary"
                            style={{ padding: '5px 8px', fontSize: 12 }}
                            onClick={() => handleStatusToggle(q.id, q.status)}
                            title={q.status === 'pending' ? 'Mark as Resolved' : 'Mark as Pending'}
                          >
                            {q.status === 'pending' ? '✓ Resolve' : '↺ Reopen'}
                          </button>

                          <button
                            className="adm-btn-danger"
                            style={{ padding: '5px 8px', fontSize: 12 }}
                            onClick={() => setDeleteConfirmId(q.id)}
                            title="Delete query"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View & Respond Modal */}
      {selectedQuery && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedQuery(null)}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>
                  Inquiry from {selectedQuery.name}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--adm-text-muted)', marginTop: 2 }}>
                  Submitted on {formatDate(selectedQuery.created_at)}
                </div>
              </div>
              <button
                onClick={() => setSelectedQuery(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--adm-text-dim)',
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              {/* Inquirer Details Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  background: '#090d16',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #1e293b',
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--adm-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Inquirer Name
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 2 }}>
                    {selectedQuery.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--adm-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Year / Group
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', marginTop: 2 }}>
                    {selectedQuery.year}
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: 'var(--adm-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Email Address
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 2 }}>
                    <a href={`mailto:${selectedQuery.email}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                      ✉️ {selectedQuery.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Inquiry Query Message */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 6,
                  }}
                >
                  Inquiry Message:
                </div>
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    padding: '14px 16px',
                    color: '#e2e8f0',
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  "{selectedQuery.query}"
                </div>
              </div>

              {/* Previous Response If Exists */}
              {selectedQuery.admin_reply && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#34d399',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      ✓ Previously Sent Response:
                    </div>
                    {selectedQuery.replied_at && (
                      <span style={{ fontSize: 11, color: 'var(--adm-text-dim)' }}>
                        {formatDate(selectedQuery.replied_at)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 10,
                      padding: '14px 16px',
                      color: '#f8fafc',
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedQuery.admin_reply}
                  </div>
                </div>
              )}

              {/* Compose Reply Form */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#f8fafc',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {selectedQuery.admin_reply ? 'Send Follow-up / Update Reply' : 'Compose Email Response'}
                  </label>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => applyTemplate('general')}
                      style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Template: General
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('club')}
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Template: Club
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('workshop')}
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Template: Workshop
                    </button>
                  </div>
                </div>

                <textarea
                  className="adm-textarea"
                  rows={5}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Write an email response to ${selectedQuery.name}...`}
                  style={{ width: '100%', fontSize: 13, lineHeight: 1.6 }}
                />

                <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', marginTop: 6 }}>
                  ✉️ This response will be dispatched directly to <strong>{selectedQuery.email}</strong> via configured SMTP.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <button
                className="adm-btn-secondary"
                onClick={() => setSelectedQuery(null)}
                disabled={submittingReply}
              >
                Close
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="adm-btn-secondary"
                  onClick={() => handleCopyQueryReply(selectedQuery)}
                  title="Copy formatted email response to clipboard"
                >
                  📋 Copy Text
                </button>

                <button
                  type="button"
                  className="adm-btn-secondary"
                  onClick={() => handleOpenQueryMailApp(selectedQuery)}
                  title="Save reply and open in Outlook / default mail client"
                >
                  📬 Open in Mail App
                </button>

                <button
                  type="button"
                  className="adm-btn-secondary"
                  onClick={handleSendReply}
                  disabled={submittingReply || !replyText.trim()}
                  title="Save response in database only"
                >
                  💾 Save in DB
                </button>

                <button
                  type="button"
                  className="adm-btn-primary"
                  style={{
                    background: '#ef4444',
                    borderColor: '#ef4444',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                  }}
                  onClick={() => handleOpenQueryGmailWeb(selectedQuery)}
                  title="Save reply and open Google Gmail composer in a new tab"
                >
                  <span>✉️</span> Open in Gmail Web
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #ef4444',
              borderRadius: 14,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>
              Delete Inquiry?
            </h3>
            <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, marginBottom: 20 }}>
              Are you sure you want to permanently delete this query record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="adm-btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className="adm-btn-danger" onClick={() => handleDelete(deleteConfirmId)}>
                Delete Query
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
