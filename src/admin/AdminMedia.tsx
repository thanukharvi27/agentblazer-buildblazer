import React, { useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';

export interface MediaItem {
  id: number;
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export function AdminMedia() {
  const { authFetch } = useAdminAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/media');
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      } else {
        showToast('Failed to load media assets', 'error');
      }
    } catch (err) {
      showToast('Network error loading media', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setUploading(true);
    try {
      const res = await authFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully uploaded ${data.files?.length || 1} image(s)!`);
        fetchMedia();
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload error', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast(`Copied URL: ${url}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this media file?')) return;
    try {
      const res = await authFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Image deleted');
        fetchMedia();
      } else {
        showToast('Failed to delete image', 'error');
      }
    } catch (err) {
      showToast('Error deleting media', 'error');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0' }}>Media &amp; Image Library</h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 13, margin: 0 }}>
            Upload, browse, copy URLs, and manage all images used across team profiles and workshop galleries.
          </p>
        </div>

        <div>
          <label className="adm-btn-primary" style={{ cursor: 'pointer' }}>
            <span>📤</span>
            <span>{uploading ? 'Uploading Images...' : 'Upload Media Files'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Drag & Drop banner */}
      <div
        style={{
          border: '2px dashed var(--adm-border)',
          borderRadius: 14,
          padding: 28,
          textAlign: 'center',
          marginBottom: 28,
          background: 'rgba(15, 23, 42, 0.4)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
          Upload New Images
        </div>
        <div style={{ fontSize: 12, color: 'var(--adm-text-dim)', marginBottom: 14 }}>
          Supports JPG, PNG, WEBP, and GIF up to 10MB each.
        </div>
        <label className="adm-btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
          <span>Choose Files</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
          Loading media library...
        </div>
      ) : media.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
          No images uploaded yet. Upload images above to populate the media library.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', gap: 16 }}>
          {media.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--adm-surface)',
                border: '1px solid var(--adm-border)',
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ width: '100%', height: 140, background: '#0b1120', position: 'relative' }}>
                <img
                  src={item.url}
                  alt={item.original_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>

              <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--adm-text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.original_name}
                  >
                    {item.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--adm-text-dim)', marginTop: 2 }}>
                    {formatBytes(item.size)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button
                    onClick={() => copyToClipboard(item.url)}
                    className="adm-btn-secondary"
                    style={{ flex: 1, padding: '5px 8px', fontSize: 11, justifyContent: 'center' }}
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="adm-btn-danger"
                    style={{ padding: '5px 8px', fontSize: 11 }}
                    title="Delete image"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
