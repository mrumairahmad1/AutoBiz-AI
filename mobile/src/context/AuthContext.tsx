import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  role: 'admin' | 'manager' | 'viewer';
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

function decodeToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      email: payload.sub || '',
      role: payload.role || 'viewer',
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('autobiz_token')
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('autobiz_token');
    return stored ? decodeToken(stored) : null;
  });

  const login = (newToken: string) => {
    localStorage.setItem('autobiz_token', newToken);
    setToken(newToken);
    setUser(decodeToken(newToken));
  };

  const logout = () => {
    localStorage.removeItem('autobiz_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}