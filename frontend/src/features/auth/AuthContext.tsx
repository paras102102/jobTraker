import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { api, formatApiError } from '@/lib/api';
import { clearTokens, getRefreshToken, setAccessToken, setRefreshToken } from '@/lib/auth';
import { TokenResponse, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication on app boot
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedRefreshToken = getRefreshToken();
      if (!storedRefreshToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        // Exchange refresh token for fresh access token
        const { data } = await axios.post<TokenResponse>(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: storedRefreshToken }
        );

        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);

        // Fetch current user profile
        const userRes = await api.get<User>('/users/me');
        if (isMounted) {
          setUser(userRes.data);
        }
      } catch {
        clearTokens();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Backend expects application/x-www-form-urlencoded with username & password
      const formData = new URLSearchParams();
      formData.append('username', email.trim().toLowerCase());
      formData.append('password', password);

      const { data } = await api.post<TokenResponse>('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      setAccessToken(data.access_token);
      setRefreshToken(data.refresh_token);

      const userRes = await api.get<User>('/users/me');
      setUser(userRes.data);
    } catch (err) {
      throw new Error(formatApiError(err));
    }
  };

  const signup = async (email: string, password: string, fullName: string): Promise<void> => {
    try {
      // 1. Create account
      await api.post('/auth/signup', {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
      });

      // 2. Automatically log in after successful signup
      await login(email, password);
    } catch (err) {
      throw new Error(formatApiError(err));
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  if (isLoading) {
    // Quiet full-page skeleton on app load
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex flex-col gap-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-[4px]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-[6px]" />
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-[6px]" />
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-[6px]" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
