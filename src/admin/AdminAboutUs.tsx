import React, { useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export interface Guest {
  id: number;
  initials: string;
  name: string;
  org: string;
  role: string;
  label: string;
  label_color: string;
  border_color: string;
  display_order: number;
}

export function AdminAboutUs() {
  const { authFetch } = useAdminAuth();
  const [about, setAbout] = useState<Record<string, string>>({});
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAbout, setSavingAbout] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Guest modal state
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [guestForm, setGuestForm] = useState({
    initials: '',
    name: '',
    org: '',
    role: '',
    label: '',
    label_color: '#22d3ee',
    border_color: 'rgba(139, 92, 246, 0.5)',
    display_order: 0,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aboutRes, guestsRes] = await Promise.all([
        authFetch('/api/admin/about'),
        authFetch('/api/admin/guests'),
      ]);

      if (aboutRes.ok && guestsRes.ok) {
        const aboutData = await aboutRes.json();
        const guestsData = await guestsRes.json();
        setAbout(aboutData);
        setGuests(guestsData);
      } else {
        showToast('Failed to load About Us content', 'error');
      }
    } catch (err) {
      showToast('Network error loading content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAboutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAbout(true);
    try {
      const res = await authFetch('/api/admin/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(about),
      });
      if (res.ok) {
        showToast('About Us content saved successfully!');
      } else {
        showToast('Failed to save content', 'error');
      }
    } catch (err) {
      showToast('Network error saving content', 'error');
    } finally {
      setSavingAbout(false);
    }
  };

  const openCreateGuestModal = () => {
    setEditingGuest(null);
    setGuestForm({
      initials: '',
      name: '',
      org: '',
      role: '',
      label: '',
      label_color: '#22d3ee',
      border_color: 'rgba(139, 92, 246, 0.5)',
      display_order: guests.length + 1,
    });
    setIsGuestModalOpen(true);
  };

  const openEditGuestModal = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestForm({
      initials: guest.initials,
      name: guest.name,
      org: guest.org,
      role: guest.role,
      label: guest.label,
      label_color: guest.label_color || '#22d3ee',
      border_color: guest.border_color || 'rgba(139, 92, 246, 0.5)',
      display_order: guest.display_order,
    });
    setIsGuestModalOpen(true);
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingGuest ? `/api/admin/guests/${editingGuest.id}` : '/api/admin/guests';
      const method = editingGuest ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestForm),
      });

      if (res.ok) {
        showToast(editingGuest ? 'Guest updated!' : 'Guest added successfully!');
        setIsGuestModalOpen(false);
        fetchData();
      } else {
        showToast('Failed to save guest', 'error');
      }
    } catch (err) {
      showToast('Network error saving guest', 'error');
    }
  };

  const handleDeleteGuest = async (id: number) => {
    if (!confirm('Are you sure you want to delete this honored guest?')) return;
    try {
      const res = await authFetch(`/api/admin/guests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Guest removed');
        fetchData();
      } else {
        showToast('Failed to delete guest', 'error');
      }
    } catch (err) {
      showToast('Network error deleting guest', 'error');
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`adm-toast ${toast.type === 'success' ? 'adm-toast-success' : 'adm-toast-error'}`}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0' }}>About Us Management</h1>
        <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: 0 }}>
          Manage page titles, mission descriptions, inaugural ceremony details, and honored guest speakers.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
          Loading content...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Main Headings & Mission Form */}
          <form onSubmit={handleAboutSubmit} style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Page Headings &amp; Descriptions</h2>
              <button type="submit" className="adm-btn-primary" disabled={savingAbout}>
                {savingAbout ? 'Saving...' : 'Save Headings'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="adm-label">Section Tag / Badge</label>
                <input
                  type="text"
                  className="adm-input"
                  value={about.hero_badge || ''}
                  onChange={(e) => setAbout({ ...about, hero_badge: e.target.value })}
                />
              </div>
              <div>
                <label className="adm-label">Main Heading</label>
                <input
                  type="text"
                  className="adm-input"
                  value={about.hero_title || ''}
                  onChange={(e) => setAbout({ ...about, hero_title: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="adm-label">Subtitle / Motto</label>
              <input
                type="text"
                className="adm-input"
                value={about.hero_subtitle || ''}
                onChange={(e) => setAbout({ ...about, hero_subtitle: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="adm-label">About Us Overview Paragraph</label>
              <textarea
                rows={4}
                className="adm-input"
                value={about.hero_description || ''}
                onChange={(e) => setAbout({ ...about, hero_description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="adm-label">Inauguration Date</label>
                <input
                  type="text"
                  className="adm-input"
                  value={about.inauguration_date || ''}
                  onChange={(e) => setAbout({ ...about, inauguration_date: e.target.value })}
                />
              </div>
              <div>
                <label className="adm-label">Inauguration Venue</label>
                <input
                  type="text"
                  className="adm-input"
                  value={about.inauguration_venue || ''}
                  onChange={(e) => setAbout({ ...about, inauguration_venue: e.target.value })}
                />
              </div>
            </div>
          </form>

          {/* Honored Guests & Patrons List */}
          <div style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>Honored Guests &amp; Leadership</h2>
                <div style={{ fontSize: 12, color: 'var(--adm-text-dim)' }}>
                  Guests of honor, keynote speakers, patron leadership, and alumni guides.
                </div>
              </div>
              <button className="adm-btn-primary" onClick={openCreateGuestModal}>
                <span>+</span>
                <span>Add Honored Guest</span>
              </button>
            </div>

            <div className="adm-table-card" style={{ border: 'none' }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Order</th>
                    <th>Name &amp; Organization</th>
                    <th>Ceremony Role</th>
                    <th>Keynote Badge</th>
                    <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g) => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 700, color: 'var(--adm-text-dim)' }}>#{g.display_order}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: '#1e293b',
                              border: '1px solid var(--adm-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              color: g.label_color || '#38bdf8',
                            }}
                          >
                            {g.initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{g.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--adm-text-dim)' }}>{g.org}</div>
                          </div>
                        </div>
                      </td>
                      <td>{g.role}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: g.label_color || '#38bdf8',
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${g.border_color || 'rgba(139, 92, 246, 0.4)'}`,
                          }}
                        >
                          {g.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            onClick={() => openEditGuestModal(g)}
                            className="adm-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteGuest(g.id)}
                            className="adm-btn-danger"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Guest Modal */}
      {isGuestModalOpen && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content" style={{ maxWidth: 550 }}>
            <div className="adm-modal-header">
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editingGuest ? 'Edit Honored Guest' : 'Add Honored Guest'}
              </h3>
              <button
                onClick={() => setIsGuestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuestSubmit}>
              <div className="adm-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Full Name *</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={guestForm.name}
                      onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                      placeholder="e.g. Mr. Santosh Rebello"
                      required
                    />
                  </div>
                  <div>
                    <label className="adm-label">Initials</label>
                    <input
                      type="text"
                      className="adm-input"
                      maxLength={3}
                      value={guestForm.initials}
                      onChange={(e) => setGuestForm({ ...guestForm, initials: e.target.value.toUpperCase() })}
                      placeholder="e.g. SR"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Organization / College Role *</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={guestForm.org}
                      onChange={(e) => setGuestForm({ ...guestForm, org: e.target.value })}
                      placeholder="e.g. Salesforce or Principal, SJEC"
                      required
                    />
                  </div>
                  <div>
                    <label className="adm-label">Ceremony Role *</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={guestForm.role}
                      onChange={(e) => setGuestForm({ ...guestForm, role: e.target.value })}
                      placeholder="e.g. Guest of Honor"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Keynote Badge Label</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={guestForm.label}
                      onChange={(e) => setGuestForm({ ...guestForm, label: e.target.value })}
                      placeholder="e.g. Keynote Speaker"
                    />
                  </div>
                  <div>
                    <label className="adm-label">Display Order</label>
                    <input
                      type="number"
                      className="adm-input"
                      value={guestForm.display_order}
                      onChange={(e) => setGuestForm({ ...guestForm, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="adm-modal-footer">
                <button type="button" className="adm-btn-secondary" onClick={() => setIsGuestModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="adm-btn-primary">
                  {editingGuest ? 'Save Changes' : 'Create Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
