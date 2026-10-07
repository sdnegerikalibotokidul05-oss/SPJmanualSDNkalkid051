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
    // Check session storage and local storage on mount
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.user) {
          setUser(parsed.user);
          setToken(parsed.token);
          return;
        }
      }
      const localStored = localStorage.getItem('user_session');
      if (localStored) {
        const parsedUser = JSON.parse(localStored);
        if (parsedUser && parsedUser.username) {
          setUser({
            id: parsedUser.id || 'usr-1',
            username: parsedUser.username,
            fullName: parsedUser.fullName || 'Administrator Sekolah',
            role: parsedUser.role || 'admin',
          });
          setToken('tok_local_session');
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string) => {
    // 1. Coba login melalui API backend terlebih dahulu
    try {
      const res = await api.login(username, pass);
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ token: res.token, user: res.user })
        );
        localStorage.setItem('user_session', JSON.stringify(res.user));
        return { success: true };
      }
    } catch {
      // Jika API tidak merespons, lanjutkan ke fallback lokal
    }

    // 2. Fallback verifikasi lokal langsung di browser
    if (username.trim() === 'admin' && pass.trim() === 'admin123') {
      const userData: AuthUser = {
        id: 'usr-1',
        username: 'admin',
        fullName: 'Administrator Sekolah',
        role: 'admin',
      };
      const token = `tok_local_${Date.now()}`;
      setUser(userData);
      setToken(token);
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ token, user: userData })
      );
      localStorage.setItem('user_session', JSON.stringify(userData));
      return { success: true };
    }

    return { 
      success: false, 
      error: 'Username atau password salah.' 
    };
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
      localStorage.removeItem('user_session');
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
