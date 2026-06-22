import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import styles from './LoginPage.module.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(
    (!token || !email) ? 'Invalid reset link. Missing token or email parameter.' : ''
  );
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        token,
        newPassword
      });
      if (response.data && response.data.success) {
        setMessage(response.data.message || 'Password reset successful!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Heart size={36} color="var(--primary)" fill="var(--primary)" style={{ margin: '0 auto' }} />
          <h1 className={styles.logoText}>Reset Password</h1>
          <p className={styles.subText}>Enter your new password below</p>
        </div>

        {error && <div className={styles.errorText}>{error}</div>}
        {message && <div style={{ color: '#0f5132', backgroundColor: '#d1e7dd', padding: '10px', borderRadius: '4px', fontSize: '14px', marginBottom: '15px', textAlign: 'center' }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className={styles.passwordWrapper}>
              <input 
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                className="form-control"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading || !token || !email}
                required
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                disabled={!token || !email}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input 
              type="password"
              id="confirmPassword"
              className="form-control"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || !token || !email}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading || !token || !email}>
            {loading ? (
              <span className="loading-inline" style={{ color: '#fff' }}>
                <span className="spinner" style={{ borderTopColor: '#fff' }}></span> Resetting...
              </span>
            ) : 'Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => navigate('/login')} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
