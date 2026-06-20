import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Stethoscope, Lock, Mail, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
  // 1. Form States
  const [identifier, setIdentifier] = useState(''); // Stores email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 2. Submit Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    // Safety check: Validate inputs are not empty
    if (!identifier || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

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
        identifier,
        password,
      });

      if (response.data.success) {
        // Store JWT token, role, and name in localStorage for persistence
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('name', response.data.name);

        // Redirect user to the dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      // Display backend error message (e.g. "Invalid credentials")
      const errMsg = err.response?.data?.message || 'Connection failed. Ensure WAMP and backend are running.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gradient-bg">
      <div className="login-container glass-card animate-fade-in">
        
        {/* App Logo & Title */}
        <div className="login-header">
          <div className="logo-badge">
            <Stethoscope className="logo-icon" size={32} />
          </div>
          <h1>Suma Clinic</h1>
          <p>Automation & Pharmacy System</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="error-box animate-fade-in">
            <AlertCircle size={18} className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          
          {/* Email/Username Input */}
          <div className="input-group">
            <label htmlFor="identifier">Email or Name</label>
            <div className="input-wrapper">
              <Mail className="field-icon" size={18} />
              <input
                id="identifier"
                type="text"
                placeholder="Enter email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="field-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="spinner-text">
                <span className="spinner"></span> Logging in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

        </form>

        <div className="login-footer">
          <p>Role-based access control enabled.</p>
        </div>

      </div>
    </div>
  );
};

export default Login;
