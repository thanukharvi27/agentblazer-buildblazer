import React, { useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export interface EventItem {
  id: number;
  title: string;
  date: string;
  badge: string;
  badge_class: string;
  description: string;
  meta: string | null;
  tracks: string[];
  leads: string | null;
  platform: string | null;
  cover_image: string | null;
  gallery: string[];
  display_order: number;
  active: number;
  isUpcoming?: boolean;
  venue?: string;
  time?: string;
  registrationUrl?: string;
}

const BADGE_OPTIONS = [
  { value: 'badge-violet', label: 'Violet (Masterclass)' },
  { value: 'badge-orange', label: 'Orange (Contest)' },
  { value: 'badge-cyan', label: 'Cyan (Keynote)' },
  { value: 'badge-green', label: 'Green (Student Lab)' },
  { value: 'badge-red', label: 'Red (Security)' },
  { value: 'badge-blue', label: 'Blue (Developer Lab)' },
];

export function AdminEvents({ setTab }: { setTab?: (tab: any) => void }) {
  const { authFetch } = useAdminAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form states
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    badge: 'WORKSHOP',
    badge_class: 'badge-violet',
    description: '',
    isUpcoming: false,
    venue: '',
    registrationUrl: '',
    meta: '',
    tracksString: '',
    leads: '',
    platform: '',
    cover_image: '',
    gallery: [] as string[],
    display_order: 0,
    active: 1,
  });
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        showToast('Failed to load events', 'error');
      }
    } catch (err) {
      showToast('Network error loading events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm({
      title: '',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: '10:00 AM – 1:00 PM IST',
      badge: 'UPCOMING WORKSHOP',
      badge_class: 'badge-violet',
      description: '',
      isUpcoming: true,
      venue: 'CSE Seminar Hall, 3rd Floor',
      registrationUrl: '',
      meta: '',
      tracksString: '',
      leads: '',
      platform: '',
      cover_image: '',
      gallery: [],
      display_order: events.length + 1,
      active: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      date: event.date,
      time: event.time || '',
      badge: event.badge,
      badge_class: event.badge_class,
      description: event.description,
      isUpcoming: Boolean(event.isUpcoming),
      venue: event.venue || '',
      registrationUrl: event.registrationUrl || '',
      meta: event.meta || '',
      tracksString: Array.isArray(event.tracks) ? event.tracks.join(', ') : '',
      leads: event.leads || '',
      platform: event.platform || '',
      cover_image: event.cover_image || '',
      gallery: Array.isArray(event.gallery) ? event.gallery : [],
      display_order: event.display_order,
      active: event.active,
    });
    setIsModalOpen(true);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setUploadingGallery(true);
    try {
      const res = await authFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.files) {
        const newUrls = data.files.map((f: any) => f.url);
        setForm((prev) => ({
          ...prev,
          gallery: [...prev.gallery, ...newUrls],
          meta: prev.meta || `${prev.gallery.length + newUrls.length} Contest Photos`,
        }));
        showToast(`${newUrls.length} gallery image(s) uploaded!`);
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tracks = form.tracksString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      date: form.date,
      time: form.time || null,
      venue: form.venue || null,
      isUpcoming: form.isUpcoming,
      registrationUrl: form.registrationUrl || null,
      badge: form.badge,
      badge_class: form.badge_class,
      description: form.description,
      meta: form.meta || (form.gallery.length > 0 ? `${form.gallery.length} Photos` : null),
      tracks,
      leads: form.leads || null,
      platform: form.platform || null,
      cover_image: form.cover_image || (form.gallery[0] || null),
      gallery: form.gallery,
      display_order: form.display_order,
      active: form.active,
    };

    try {
      const url = editingEvent
        ? `/api/admin/events/${editingEvent.id}`
        : '/api/admin/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingEvent ? 'Event updated successfully!' : 'Event created successfully!');
        setIsModalOpen(false);
        fetchEvents();
      } else {
        const data = await res.json();
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showToast('Network error saving event', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Event removed');
        setDeleteConfirmId(null);
        fetchEvents();
      } else {
        showToast('Failed to delete event', 'error');
      }
    } catch (err) {
      showToast('Network error deleting event', 'error');
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
      <div className="adm-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0' }}>Events &amp; Workshops Management</h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: 0 }}>
            Manage masterclasses, hackathons, and symposiums. Upload multiple photos to power the public hover slideshow!
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {setTab && (
            <button
              className="adm-btn-primary"
              onClick={() => setTab('create-event')}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                borderColor: '#10b981',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 15 }}>➕</span>
              <span>Create New Event</span>
              <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.22)', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>+New</span>
            </button>
          )}
          <button className="adm-btn-secondary" onClick={openCreateModal}>
            <span>+ Quick Add Dialog</span>
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="adm-table-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
            No events found. Click "Create New Event" to publish one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Order</th>
                  <th>Event Title &amp; Details</th>
                  <th>Badge Category</th>
                  <th>Gallery Slideshow</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 700, color: 'var(--adm-text-dim)' }}>#{ev.display_order}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--adm-text-main)', fontSize: 14 }}>{ev.title}</span>
                        {Boolean(ev.isUpcoming) && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                            UPCOMING
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>📅 {ev.date}</span>
                        {ev.time && <span>⏰ {ev.time}</span>}
                        {ev.venue && <span>📍 {ev.venue}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ev.badge_class || 'badge-violet'}`} style={{ fontSize: 10 }}>
                        {ev.badge}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>🖼️</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ev.gallery?.length > 0 ? '#34d399' : 'var(--adm-text-dim)' }}>
                          {ev.gallery?.length || 0} photo(s)
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-badge ${ev.active ? 'adm-badge-green' : 'adm-badge-orange'}`}>
                        {ev.active ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          onClick={() => openEditModal(ev)}
                          className="adm-btn-secondary"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(ev.id)}
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
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content" style={{ maxWidth: 420 }}>
            <div className="adm-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Delete Event</h3>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <p style={{ margin: 0, color: 'var(--adm-text-muted)', fontSize: 14 }}>
                Are you sure you want to delete this event? This will remove it from the public workshops directory.
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content" style={{ maxWidth: 720 }}>
            <div className="adm-modal-header">
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editingEvent ? 'Edit Event / Workshop' : 'Create New Event'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="adm-modal-body">
                {/* Title */}
                <div>
                  <label className="adm-label">Workshop / Event Title *</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Master the Future: A Hands-on GSoC & LLMs Workshop"
                    required
                  />
                </div>

                {/* Date & Order */}
                <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Event Date String *</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      placeholder="e.g. March 25, 2026"
                      required
                    />
                  </div>
                  <div>
                    <label className="adm-label">Display Order Index</label>
                    <input
                      type="number"
                      className="adm-input"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Badge & Badge Class */}
                <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Badge Label</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.badge}
                      onChange={(e) => setForm({ ...form, badge: e.target.value.toUpperCase() })}
                      placeholder="e.g. LIVE CONTEST"
                      required
                    />
                  </div>
                  <div>
                    <label className="adm-label">Badge Color Accent</label>
                    <select
                      className="adm-input"
                      value={form.badge_class}
                      onChange={(e) => setForm({ ...form, badge_class: e.target.value })}
                    >
                      {BADGE_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="adm-label">Event Description *</label>
                  <textarea
                    rows={3}
                    className="adm-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide a compelling technical summary of topics, hands-on labs, and objectives..."
                    required
                  />
                </div>

                {/* Mark as Upcoming Event Toggle */}
                <div style={{ background: form.isUpcoming ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)', border: `1px solid ${form.isUpcoming ? 'rgba(16, 185, 129, 0.3)' : 'var(--adm-border)'}`, borderRadius: 10, padding: '14px 16px', margin: '14px 0', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: form.isUpcoming ? '#34d399' : 'var(--adm-text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🚀 Mark as Upcoming Event</span>
                        {form.isUpcoming && <span style={{ fontSize: 10, background: '#10b981', color: '#000', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginTop: 2 }}>
                        When enabled, this event will appear in the public "Upcoming Events" radar scanner page.
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.isUpcoming}
                        onChange={(e) => setForm({ ...form, isUpcoming: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: form.isUpcoming ? '#10b981' : '#334155',
                        borderRadius: 24, transition: '0.2s',
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: 18, width: 18,
                          left: form.isUpcoming ? 22 : 3, bottom: 3,
                          background: 'white', borderRadius: '50%', transition: '0.2s'
                        }}></span>
                      </span>
                    </label>
                  </div>

                  {form.isUpcoming && (
                    <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div>
                        <label className="adm-label">Venue / Physical Location *</label>
                        <input
                          type="text"
                          className="adm-input"
                          value={form.venue}
                          onChange={(e) => setForm({ ...form, venue: e.target.value })}
                          placeholder="e.g. CSE Seminar Hall, 3rd Floor"
                        />
                      </div>
                      <div>
                        <label className="adm-label">Schedule / Time *</label>
                        <input
                          type="text"
                          className="adm-input"
                          value={form.time}
                          onChange={(e) => setForm({ ...form, time: e.target.value })}
                          placeholder="e.g. 10:00 AM – 1:00 PM IST"
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="adm-label">Registration / RSVP Link URL</label>
                        <input
                          type="url"
                          className="adm-input"
                          value={form.registrationUrl}
                          onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })}
                          placeholder="https://forms.gle/... or https://lu.ma/..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tracks & Meta */}
                <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Tracks (Comma-separated)</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.tracksString}
                      onChange={(e) => setForm({ ...form, tracksString: e.target.value })}
                      placeholder="Track 1: 1st Year, Track 2: 2nd Year"
                    />
                  </div>
                  <div>
                    <label className="adm-label">Meta Text (Location / Attendance)</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.meta}
                      onChange={(e) => setForm({ ...form, meta: e.target.value })}
                      placeholder="e.g. 10 Contest Photos or CSE Auditorium"
                    />
                  </div>
                </div>

                {/* Leads or Platform */}
                <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Session Leads (Optional)</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.leads}
                      onChange={(e) => setForm({ ...form, leads: e.target.value })}
                      placeholder="Session Leads: Name 1 & Name 2"
                    />
                  </div>
                  <div>
                    <label className="adm-label">Platform Sandbox (Optional)</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.platform}
                      onChange={(e) => setForm({ ...form, platform: e.target.value })}
                      placeholder="Platform: Salesforce Developer Sandbox"
                    />
                  </div>
                </div>

                {/* Hover Slideshow Gallery Management */}
                <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <label className="adm-label" style={{ marginBottom: 2 }}>
                        Hover Slideshow Gallery Images ({form.gallery.length} photos)
                      </label>
                      <div style={{ fontSize: 11, color: 'var(--adm-text-dim)' }}>
                        When a visitor hovers over this card, these photos automatically cycle in the floating preview modal.
                      </div>
                    </div>
                  </div>

                  {/* Upload input */}
                  <div style={{ marginBottom: 14 }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      disabled={uploadingGallery}
                      style={{ fontSize: 12 }}
                    />
                    {uploadingGallery && (
                      <span style={{ fontSize: 12, color: '#38bdf8', marginLeft: 10 }}>
                        Uploading gallery images...
                      </span>
                    )}
                  </div>

                  {/* Gallery thumbnails grid */}
                  {form.gallery.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, maxHeight: 200, overflowY: 'auto', padding: 8, background: '#0b1120', borderRadius: 8 }}>
                      {form.gallery.map((imgUrl, idx) => (
                        <div key={idx} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--adm-border)', height: 70 }}>
                          <img src={imgUrl} alt={`Gallery ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              background: 'rgba(239, 68, 68, 0.85)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              fontSize: 10,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Remove image from gallery"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="adm-modal-footer">
                <button type="button" className="adm-btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="adm-btn-primary">
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
