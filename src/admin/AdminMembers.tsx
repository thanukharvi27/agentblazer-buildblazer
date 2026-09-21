import React, { useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export interface Member {
  id: number;
  category: 'faculty' | 'student' | 'cwc';
  name: string;
  role: string;
  title: string;
  title_class: string;
  description: string;
  image_url: string;
  initials: string;
  initials_color: string;
  highlighted: number;
  display_order: number;
  active: number;
}

const BADGE_OPTIONS = [
  { value: 'badge-violet', label: 'Violet' },
  { value: 'badge-green', label: 'Green' },
  { value: 'badge-gold', label: 'Gold' },
  { value: 'badge-cyan', label: 'Cyan' },
  { value: 'badge-orange', label: 'Orange' },
  { value: 'badge-red', label: 'Red' },
  { value: 'badge-blue', label: 'Blue' },
];

export function AdminMembers() {
  const { authFetch } = useAdminAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'faculty' | 'student' | 'cwc'>('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form states
  const [form, setForm] = useState({
    category: 'student' as 'faculty' | 'student' | 'cwc',
    name: '',
    role: '',
    title: '',
    title_class: 'badge-gold',
    description: '',
    image_url: '',
    initials: '',
    initials_color: '',
    highlighted: 0,
    display_order: 0,
    active: 1,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        showToast('Failed to load members', 'error');
      }
    } catch (err) {
      showToast('Network error loading members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openCreateModal = () => {
    setEditingMember(null);
    setForm({
      category: categoryFilter === 'all' ? 'student' : categoryFilter,
      name: '',
      role: '',
      title: '',
      title_class: 'badge-gold',
      description: '',
      image_url: '',
      initials: '',
      initials_color: '',
      highlighted: 0,
      display_order: members.length + 1,
      active: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setForm({
      category: member.category,
      name: member.name,
      role: member.role,
      title: member.title || '',
      title_class: member.title_class || 'badge-violet',
      description: member.description || '',
      image_url: member.image_url || '',
      initials: member.initials || '',
      initials_color: member.initials_color || '',
      highlighted: member.highlighted,
      display_order: member.display_order,
      active: member.active,
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('images', file);

    setUploadingImage(true);
    try {
      const res = await authFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({ ...prev, image_url: data.url }));
        showToast('Member photo uploaded successfully!');
      } else {
        showToast(data.error || 'Failed to upload photo', 'error');
      }
    } catch (err) {
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMember
        ? `/api/admin/members/${editingMember.id}`
        : '/api/admin/members';
      const method = editingMember ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showToast(editingMember ? 'Member updated!' : 'Member added successfully!');
        setIsModalOpen(false);
        fetchMembers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showToast('Network error saving member', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/members/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Member removed');
        setDeleteConfirmId(null);
        fetchMembers();
      } else {
        showToast('Failed to delete member', 'error');
      }
    } catch (err) {
      showToast('Network error deleting member', 'error');
    }
  };

  const filteredMembers = members.filter(
    (m) => categoryFilter === 'all' || m.category === categoryFilter
  );

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`adm-toast ${toast.type === 'success' ? 'adm-toast-success' : 'adm-toast-error'}`}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0' }}>Members Management</h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: 0 }}>
            Add, update, and manage Faculty Advisory Council, Student Core Team, and CWC representatives.
          </p>
        </div>
        <button className="adm-btn-primary" onClick={openCreateModal}>
          <span>+</span>
          <span>Add New Member</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--adm-border)', paddingBottom: 12 }}>
        {[
          { id: 'all', label: `All Members (${members.length})` },
          { id: 'faculty', label: `Faculty Council (${members.filter((m) => m.category === 'faculty').length})` },
          { id: 'student', label: `Student Core Team (${members.filter((m) => m.category === 'student').length})` },
          { id: 'cwc', label: `Core Working Committee (${members.filter((m) => m.category === 'cwc').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id as any)}
            className={`adm-btn-secondary ${categoryFilter === tab.id ? 'active' : ''}`}
            style={{
              fontSize: 13,
              borderColor: categoryFilter === tab.id ? '#38bdf8' : 'var(--adm-border)',
              background: categoryFilter === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'var(--adm-surface)',
              color: categoryFilter === tab.id ? '#38bdf8' : 'var(--adm-text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Members Table */}
      <div className="adm-table-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
            Loading member records...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
            No members found in this category. Click "Add New Member" to create one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Order</th>
                  <th>Member</th>
                  <th>Category</th>
                  <th>Role &amp; Badge</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 700, color: 'var(--adm-text-dim)' }}>#{m.display_order}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {m.image_url ? (
                          <img
                            src={m.image_url}
                            alt={m.name}
                            style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              background: '#1e293b',
                              border: '1px solid var(--adm-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              color: '#38bdf8',
                            }}
                          >
                            {m.initials || m.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>
                            {m.name} {m.highlighted ? <span title="Highlighted Card" style={{ color: '#fbbf24' }}>★</span> : null}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--adm-text-dim)' }}>{m.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="adm-badge adm-badge-blue" style={{ textTransform: 'capitalize' }}>
                        {m.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`badge ${m.title_class || 'badge-violet'}`} style={{ fontSize: 10 }}>
                          {m.title || m.role}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-badge ${m.active ? 'adm-badge-green' : 'adm-badge-orange'}`}>
                        {m.active ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          onClick={() => openEditModal(m)}
                          className="adm-btn-secondary"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(m.id)}
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Confirm Deletion</h3>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <p style={{ margin: 0, color: 'var(--adm-text-muted)', fontSize: 14 }}>
                Are you sure you want to remove this member? This action cannot be undone.
              </p>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className="adm-btn-danger" onClick={() => handleDelete(deleteConfirmId)}>
                Yes, Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content">
            <div className="adm-modal-header">
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editingMember ? 'Edit Member Information' : 'Add New Member'}
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
                {/* Category & Order */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Member Category</label>
                    <select
                      className="adm-input"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                      required
                    >
                      <option value="student">Student Core Team</option>
                      <option value="faculty">Faculty Advisory Council</option>
                      <option value="cwc">Core Working Committee (CWC)</option>
                    </select>
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

                {/* Name & Role */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Full Name *</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="adm-label">Role / Department *</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="e.g. Executive President"
                      required
                    />
                  </div>
                </div>

                {/* Title & Badge Class */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Card Badge Title</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. President"
                    />
                  </div>
                  <div>
                    <label className="adm-label">Badge Color Accent</label>
                    <select
                      className="adm-input"
                      value={form.title_class}
                      onChange={(e) => setForm({ ...form, title_class: e.target.value })}
                    >
                      {BADGE_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Initials & Highlight */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="adm-label">Initials (2 letters)</label>
                    <input
                      type="text"
                      className="adm-input"
                      maxLength={3}
                      value={form.initials}
                      onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
                      placeholder="e.g. JD"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 26 }}>
                    <input
                      type="checkbox"
                      id="highlighted"
                      checked={!!form.highlighted}
                      onChange={(e) => setForm({ ...form, highlighted: e.target.checked ? 1 : 0 })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="highlighted" style={{ fontSize: 13, color: 'var(--adm-text-main)', cursor: 'pointer' }}>
                      Highlight Card (Default glowing active card)
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="adm-label">Description / Bio</label>
                  <textarea
                    rows={3}
                    className="adm-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe their contribution, leadership focus, or research domain..."
                  />
                </div>

                {/* Photo Upload & Preview */}
                <div>
                  <label className="adm-label">Member Photo (Image Upload or URL)</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt="Preview"
                        style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--adm-border)' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 10,
                          background: '#0b1120',
                          border: '1px dashed var(--adm-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                        }}
                      >
                        📷
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        style={{ fontSize: 12 }}
                      />
                      {uploadingImage && <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4 }}>Uploading photo...</div>}
                    </div>
                  </div>
                  <input
                    type="text"
                    className="adm-input"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Or enter image URL manually (/uploads/...)"
                    style={{ marginTop: 8 }}
                  />
                </div>
              </div>

              <div className="adm-modal-footer">
                <button type="button" className="adm-btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="adm-btn-primary">
                  {editingMember ? 'Save Changes' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
