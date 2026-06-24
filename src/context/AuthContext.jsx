/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const name = localStorage.getItem('name');
    const role = localStorage.getItem('role');
    const department = localStorage.getItem('department');
    return name && role ? { name, role, department } : null;
  });

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        identifier: email,
        password
      });

      if (response.data.success) {
        const { token, role, name, department } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('name', name);
        if (department) {
          localStorage.setItem('department', department);
        } else {
          localStorage.removeItem('department');
        }
        setToken(token);
        setUser({ name, role, department });
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
    localStorage.removeItem('department');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
