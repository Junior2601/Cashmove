import React, { createContext, useState, useEffect, useCallback } from 'react';
import {jwtDecode} from 'jwt-decode';
import api from '../api/axios';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('admin_token'); // 🔧 Uniformiser le nom
    if (!token) return null;
    try {
      const payload = jwtDecode(token);
      return { token, payload };
    } catch {
      localStorage.removeItem('admin_token'); // 🔧 Nettoyer si token invalide
      return null;
    }
  });

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token'); // 🔧 Même nom partout
    setUser(null);
  }, []);

  const login = async (email, password) => { // 🔧 Accepter email et password directement
    try {
      const res = await api.post('/admin/login', { email, password });
      const { token } = res.data;
      localStorage.setItem('admin_token', token); // 🔧 Même nom partout
      const payload = jwtDecode(token);
      setUser({ token, payload });
      return res.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const isAuthenticated = !!user;

  useEffect(() => {
    if (user) {
      const now = Date.now() / 1000;
      if (user.payload.exp && user.payload.exp < now) {
        logout();
      }
    }
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}