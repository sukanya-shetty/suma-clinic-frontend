import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.message || 'Invalid credentials');
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Heart size={36} color="var(--primary)" fill="var(--primary)" style={{ margin: '0 auto' }} />
          <h1 className={styles.logoText}>Suma Clinic</h1>
          <p className={styles.subText}>Clinical Information Management System</p>
        </div>

        {error && <div className={styles.errorText}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email / Username</label>
            <input 
              type="text" 
              id="email"
              className="form-control"
              placeholder="Enter your email or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className={styles.passwordWrapper}>
              <input 
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className="loading-inline" style={{ color: '#fff' }}>
                <span className="spinner" style={{ borderTopColor: '#fff' }}></span> Logging in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className={styles.roleTip}>
          <p>Demo Credentials:</p>
          <p style={{ fontWeight: 600, marginTop: 4 }}>dr.shetty@clinic.com / password123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
