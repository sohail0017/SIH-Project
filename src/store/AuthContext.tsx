import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, getAuthToken, setAuthToken } from '../services/api';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user';
  district?: string;
  phone?: string;
  traineeId?: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  district?: string;
  phone?: string;
}

export interface ProfileInput {
  fullName?: string;
  phone?: string;
  district?: string;
  oldPassword?: string;
  newPassword?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    apiRequest<{ user: AuthUser }>('/api/auth/me')
      .then((res) => {
        if (res.user) setUser(res.user);
      })
      .catch(() => {
        // No valid HTTP-only session or token expired. Stay signed out.
        setUser(null);
        setAuthToken(null);
        setTokenState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ user: AuthUser; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      setAuthToken(res.token);
      setTokenState(res.token);
    }
    setUser(res.user);
  };

  const register = async (input: RegisterInput) => {
    const res = await apiRequest<{ user: AuthUser; token?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.token) {
      setAuthToken(res.token);
      setTokenState(res.token);
    }
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    } finally {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
      if (typeof window !== 'undefined' && window.location.hash !== '#login') {
        window.location.hash = '#login';
      }
    }
  };

  const updateProfile = async (input: ProfileInput) => {
    const res = await apiRequest<{ user: AuthUser }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    if (res.user) {
      setUser(res.user);
    }
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

