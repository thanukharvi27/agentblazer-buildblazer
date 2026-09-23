import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';

interface AdminUser {
  id: number;
  username: string;
}

interface AuthContextType {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('agentblazer_admin_token');
  });
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = sessionStorage.getItem('agentblazer_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(getApiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          error: 'Backend API is not reachable. If hosted on Vercel, please set VITE_API_URL in Vercel settings to your deployed backend URL.',
        };
      }

      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        setUser(data.user);
        sessionStorage.setItem('agentblazer_admin_token', data.token);
        sessionStorage.setItem('agentblazer_admin_user', JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Authentication failed' };
      }
    } catch (err: any) {
      return {
        success: false,
        error: 'Cannot connect to authentication service. Ensure your backend server is deployed and running.',
      };
    }
  };

  const logout = () => {
    if (token) {
      fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('agentblazer_admin_token');
    sessionStorage.removeItem('agentblazer_admin_user');
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(getApiUrl(url), { ...options, headers });
  };

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        authFetch,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
