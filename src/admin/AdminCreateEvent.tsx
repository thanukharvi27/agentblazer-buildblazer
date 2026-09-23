import React, { useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { AdminTab } from './AdminLayout';
import { getApiUrl } from '../config/api';

export const apiUrl = (input: string) => {
  return getApiUrl(input);
};

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = sessionStorage.getItem('agentblazer_admin_token');
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return window.fetch(apiUrl(input), { ...init, headers });
}

const BADGE_OPTIONS = [
  { value: 'badge-violet', label: 'Violet (Masterclass)' },
  { value: 'badge-orange', label: 'Orange (Contest / Hackathon)' },
  { value: 'badge-cyan', label: 'Cyan (Keynote / Seminar)' },
  { value: 'badge-green', label: 'Green (Student Lab)' },
  { value: 'badge-red', label: 'Red (Security Summit)' },
  { value: 'badge-blue', label: 'Blue (Developer Lab)' },
];

export interface CreateNewEventSectionProps {
  onSuccess?: () => void;
  setTab?: (tab: AdminTab) => void;
}

export function CreateNewEventSection({ onSuccess, setTab }: CreateNewEventSectionProps) {
  const initialForm = {
    title: '',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    time: '10:00 AM – 1:00 PM IST',
    badge: 'UPCOMING WORKSHOP',
    badge_class: 'badge-violet',
    description: '',
    isUpcoming: true,
    venue: 'CSE Seminar Hall, 3rd Floor, Academic Block II',
    registrationUrl: 'https://forms.gle/agentblazer-rsvp',
    tracksString: 'Track 1: AI Agent Foundations, Track 2: Tool Calling Hands-on',
    leads: 'Core Working Committee & Student Mentors',
    platform: 'Salesforce Agentforce Sandbox & Python Dev Environment',
    cover_image: '',
    gallery: [] as string[],
    display_order: 1,
    active: 1,
  };

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
      const res = await apiFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.files) {
        const newUrls = data.files.map((f: any) => f.url);
        setForm((prev) => ({
          ...prev,
          gallery: [...prev.gallery, ...newUrls],
          cover_image: prev.cover_image || newUrls[0],
        }));
        showToast(`${newUrls.length} image(s) uploaded!`);
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
    setForm((prev) => {
      const updated = prev.gallery.filter((_, i) => i !== index);
      return {
        ...prev,
        gallery: updated,
        cover_image: prev.cover_image === prev.gallery[index] ? (updated[0] || '') : prev.cover_image,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date.trim()) {
      showToast('Title and Date are required.', 'error');
      return;
    }

    setSubmitting(true);

    const tracks = form.tracksString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      date: form.date.trim(),
      time: form.time.trim(),
      badge: form.badge.trim() || 'WORKSHOP',
      badge_class: form.badge_class,
      description: form.description.trim(),
      isUpcoming: form.isUpcoming,
      venue: form.isUpcoming ? form.venue.trim() : null,
      registrationUrl: form.isUpcoming ? form.registrationUrl.trim() : null,
      tracks,
      leads: form.leads.trim() || null,
      platform: form.platform.trim() || null,
      cover_image: form.cover_image || (form.gallery[0] || null),
      gallery: form.gallery,
      meta: form.gallery.length > 0 ? `${form.gallery.length} Event Photos` : null,
      display_order: Number(form.display_order) || 0,
      active: 1,
    };

    try {
      const res = await apiFetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('🎉 Event created & published to website successfully!');
        setForm(initialForm);
        if (onSuccess) {
          onSuccess();
        } else if (setTab) {
          setTimeout(() => setTab('events'), 800);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create event', 'error');
      }
    } catch (err) {
      showToast('Network error saving event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ color: 'var(--adm-text-main, #f8fafc)' }}>
      {/* Toast Notification */}
      {toast && (
        <div className={`adm-toast ${toast.type === 'success' ? 'adm-toast-success' : 'adm-toast-error'}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>➕</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--adm-text-main, #ffffff)' }}>
              Create New Event &amp; Workshop
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 20,
              }}
            >
              Live Sync
            </span>
          </div>
          <p style={{ color: 'var(--adm-text-muted, #94a3b8)', fontSize: 14, margin: 0 }}>
            Publish workshops, contests, and flag upcoming events to appear immediately on the public website.
          </p>
        </div>

        {setTab && (
          <button className="adm-btn-secondary" onClick={() => setTab('events')}>
            <span>← Back to Events List</span>
          </button>
        )}
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="adm-event-create-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 28, alignItems: 'start' }}>
        {/* Left Column: Form */}
        <div style={{ background: 'var(--adm-surface, #0f172a)', border: '1px solid var(--adm-border, #334155)', borderRadius: 16, padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Title */}
            <div>
              <label className="adm-label">Event / Workshop Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Master the Future: A Hands-on GSoC & LLMs Workshop"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="adm-input"
              />
            </div>

            {/* Date & Time */}
            <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="adm-label">Date String *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 15, 2026"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="adm-input"
                />
              </div>
              <div>
                <label className="adm-label">Schedule / Time</label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM – 1:00 PM IST"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="adm-input"
                />
              </div>
            </div>

            {/* Badge & Color */}
            <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="adm-label">Badge Label</label>
                <input
                  type="text"
                  placeholder="e.g. UPCOMING WORKSHOP"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="adm-input"
                />
              </div>
              <div>
                <label className="adm-label">Badge Palette Style</label>
                <select
                  value={form.badge_class}
                  onChange={(e) => setForm({ ...form, badge_class: e.target.value })}
                  className="adm-input"
                  style={{ background: '#0b1120' }}
                >
                  {BADGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="adm-label">Event Description *</label>
              <textarea
                required
                rows={3}
                placeholder="Overview of curriculum, learning objectives, and hands-on deliverables..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="adm-input"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Mark as Upcoming Event Toggle */}
            <div
              style={{
                background: form.isUpcoming ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: '1px solid',
                borderColor: form.isUpcoming ? 'rgba(16, 185, 129, 0.3)' : 'var(--adm-border, #334155)',
                borderRadius: 12,
                padding: '16px 18px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: form.isUpcoming ? '#34d399' : 'var(--adm-text-main, #f8fafc)' }}>
                    {form.isUpcoming ? '🟢 Marked as Upcoming Event' : '⚪ Past / Standard Event'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--adm-text-muted, #94a3b8)', marginTop: 2 }}>
                    When enabled, this event automatically appears on the public "Upcoming Events" page with RSVP options.
                  </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isUpcoming}
                    onChange={(e) => setForm({ ...form, isUpcoming: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: form.isUpcoming ? '#10b981' : '#334155',
                      borderRadius: 24,
                      transition: '0.2s',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      height: 18,
                      width: 18,
                      left: form.isUpcoming ? 22 : 3,
                      bottom: 3,
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }}
                  />
                </label>
              </div>

              {/* Conditional Upcoming Inputs */}
              {form.isUpcoming && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="adm-label">Venue / Hall Location</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE Seminar Hall, 3rd Floor, Academic Block II"
                      value={form.venue}
                      onChange={(e) => setForm({ ...form, venue: e.target.value })}
                      className="adm-input"
                    />
                  </div>
                  <div>
                    <label className="adm-label">Registration / RSVP URL (Google Form, Eventbrite, etc.)</label>
                    <input
                      type="url"
                      placeholder="https://forms.gle/..."
                      value={form.registrationUrl}
                      onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })}
                      className="adm-input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Curriculum Tracks & Leads */}
            <div className="adm-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="adm-label">Tracks (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Track 1: AI, Track 2: Agents"
                  value={form.tracksString}
                  onChange={(e) => setForm({ ...form, tracksString: e.target.value })}
                  className="adm-input"
                />
              </div>
              <div>
                <label className="adm-label">Speaker / Lead Mentor</label>
                <input
                  type="text"
                  placeholder="e.g. Keith Fernandes &amp; CWC"
                  value={form.leads}
                  onChange={(e) => setForm({ ...form, leads: e.target.value })}
                  className="adm-input"
                />
              </div>
            </div>

            {/* Photo Gallery & Slideshow Upload */}
            <div>
              <label className="adm-label">Hover Slideshow Gallery Photos (Upload multiple)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <label
                  className="adm-btn-secondary"
                  style={{ cursor: uploadingGallery ? 'not-allowed' : 'pointer', margin: 0, padding: '8px 14px', fontSize: 13 }}
                >
                  <span>📷</span>
                  <span>{uploadingGallery ? 'Uploading Photos...' : 'Upload Photos'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    disabled={uploadingGallery}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: 12, color: 'var(--adm-text-dim, #64748b)' }}>
                  {form.gallery.length} image(s) in slideshow
                </span>
              </div>

              {/* Thumbnails list */}
              {form.gallery.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxHeight: 180, overflowY: 'auto', padding: 4 }}>
                  {form.gallery.map((url, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid var(--adm-border, #334155)',
                      }}
                      onMouseEnter={() => setActivePreviewImage(url)}
                    >
                      <img src={url} alt={`Upload ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          background: 'rgba(0,0,0,0.7)',
                          color: '#f87171',
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
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="adm-form-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                className="adm-btn-primary"
                disabled={submitting}
                style={{ flex: 2, padding: '12px 20px', fontSize: 14 }}
              >
                <span>{submitting ? 'Publishing Event...' : '🚀 Publish Event to Website'}</span>
              </button>
              <button
                type="button"
                className="adm-btn-secondary"
                onClick={() => setForm(initialForm)}
                style={{ flex: 1 }}
              >
                Reset Form
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Sticky Real-Time Live Preview */}
        <div className="adm-sticky-preview" style={{ position: 'sticky', top: 90 }}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-text-dim, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              👁️ Real-Time Website Card Preview
            </span>
            <span style={{ fontSize: 11, color: 'var(--adm-text-dim, #64748b)' }}>Updates as you type</span>
          </div>

          {/* Live Card Container matching public site styling */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: form.isUpcoming ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 18,
              padding: 24,
              boxShadow: form.isUpcoming ? '0 10px 30px rgba(16, 185, 129, 0.15)' : '0 10px 30px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top decorative glow */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: form.isUpcoming
                  ? 'linear-gradient(90deg, #10b981, #34d399, #059669)'
                  : 'linear-gradient(90deg, #8b5cf6, #22d3ee)',
              }}
            />

            {/* Badges Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                }}
              >
                {form.badge || 'WORKSHOP'}
              </span>

              {form.isUpcoming && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '3px 8px',
                    borderRadius: 20,
                  }}
                >
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                  UPCOMING
                </span>
              )}
            </div>

            {/* Schedule & Date */}
            <div style={{ color: '#22d3ee', fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📅 {form.date || 'Date TBD'}</span>
              {form.time && <span style={{ color: '#94a3b8' }}>• 🕒 {form.time}</span>}
            </div>

            {/* Title */}
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {form.title || 'Your Event Title Will Appear Here'}
            </h3>

            {/* Venue (if upcoming) */}
            {form.isUpcoming && form.venue && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <span>📍</span>
                <span style={{ fontWeight: 600 }}>{form.venue}</span>
              </div>
            )}

            {/* Description */}
            <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px 0' }}>
              {form.description || 'Provide an overview of the masterclass, challenge mechanics, or lab hands-on tracks...'}
            </p>

            {/* Image Preview / Gallery Slideshow Mock */}
            {form.gallery.length > 0 && (
              <div style={{ marginBottom: 14, borderRadius: 10, overflow: 'hidden', maxHeight: 160, position: 'relative' }}>
                <img
                  src={activePreviewImage || form.gallery[0]}
                  alt="Gallery preview"
                  style={{ width: '100%', height: 160, objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 8,
                    background: 'rgba(0,0,0,0.7)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    color: '#fff',
                  }}
                >
                  📷 {form.gallery.length} Photos in Gallery
                </div>
              </div>
            )}

            {/* Tracks */}
            {form.tracksString && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {form.tracksString
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                    >
                      {t}
                    </span>
                  ))}
              </div>
            )}

            {/* Registration RSVP Button (if upcoming) */}
            {form.isUpcoming && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    background: form.registrationUrl
                      ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: form.registrationUrl ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                    cursor: form.registrationUrl ? 'pointer' : 'default',
                    opacity: form.registrationUrl ? 1 : 0.6,
                    boxShadow: form.registrationUrl ? '0 0 16px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                >
                  Register / RSVP Now ↗
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminCreateEvent({ setTab }: { setTab?: (tab: AdminTab) => void }) {
  return (
    <CreateNewEventSection
      onSuccess={() => setTab && setTab('events')}
      setTab={setTab}
    />
  );
}

export default AdminCreateEvent;
