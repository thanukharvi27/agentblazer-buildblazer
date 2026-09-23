/**
 * Central API & Asset URL Configuration
 * 
 * In development, VITE_API_URL defaults to empty, routing requests through
 * the Vite dev server proxy (e.g. /api/... -> http://localhost:5000/api/...).
 * 
 * In production, requests target the deployed Render backend origin
 * (https://agentblazer-api.onrender.com) or the configured VITE_API_URL.
 */

const DEFAULT_PROD_API = 'https://agentblazer-api.onrender.com';

export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_API : '')
).replace(/\/+$/, '');

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
