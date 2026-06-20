/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from 'react';
import axios from 'axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const name = localStorage.getItem('name');
    const role = localStorage.getItem('role');
    return name && role ? { name, role } : null;
  });

  const login = async (email, password) => {
    try {
      const getApiUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          return 'https://clinic-backend.sumaclinic.workers.dev/api';
        }
        return 'http://localhost:3001/api';
      };
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/auth/login`, {
        identifier: email, // identifier is used by the backend login controller
        password
      });

      if (response.data.success) {
        const { token, role, name } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('name', name);
        setToken(token);
        setUser({ name, role });
        return { success: true };
      } else {
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login request failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.error || 'Server error occurred during login.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
