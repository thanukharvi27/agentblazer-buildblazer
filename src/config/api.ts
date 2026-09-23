/**
 * Central API & Asset URL Configuration
 * 
 * In development, VITE_API_URL is typically empty, routing requests through
 * the Vite dev server proxy (e.g. /api/... -> http://localhost:5000/api/...).
 * 
 * In production (e.g. deployed to Vercel/Netlify), set VITE_API_URL to your backend
 * origin (e.g. https://agentblazer-backend.onrender.com).
 */

export const API_BASE_URL: string = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/**
 * Returns the fully qualified URL for an API endpoint.
 * @param path - e.g. '/api/public/data' or 'api/auth/login'
 */
export function getApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Returns the fully qualified URL for uploaded media.
 * @param mediaPath - e.g. '/uploads/image.png'
 */
export function getMediaUrl(mediaPath: string | null | undefined): string {
  if (!mediaPath) return '';
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://') || mediaPath.startsWith('data:')) {
    return mediaPath;
  }
  const cleanPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}
