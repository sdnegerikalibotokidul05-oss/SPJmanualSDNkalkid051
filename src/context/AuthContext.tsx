import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/apiClient';
import { UserRole } from '../types';

interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserSession: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'app_school_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check session storage on mount
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.user) {
          setUser(parsed.user);
          setToken(parsed.token);
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string) => {
  // Langsung cek kredensial secara lokal di browser
  if (username === 'admin' && pass === 'admin123') {
    const userData = { username: 'admin', role: 'admin' };
    setUser(userData);
    localStorage.setItem('user_session', JSON.stringify(userData));
    return { success: true };
  } else {
    return { 
      success: false, 
      error: 'Username atau password salah.' 
    };
  }
};

  const logout = async () => {
    try {
      if (user?.username) {
        await api.logout(user.username);
      }
    } catch (e) {
      // Ignore network error on logout
    } finally {
      setUser(null);
      setToken(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const updateUserSession = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ ...parsed, user: updatedUser })
        );
      } catch (e) {
        // ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
