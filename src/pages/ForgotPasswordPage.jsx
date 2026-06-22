import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import styles from './LoginPage.module.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data && response.data.success) {
        setMessage(response.data.message || 'If the email exists, a password reset link has been sent.');
      } else {
        setError(response.data.message || 'Failed to request password reset.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
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
          <h1 className={styles.logoText}>Forgot Password</h1>
          <p className={styles.subText}>Enter your email to receive a password reset link</p>
        </div>

        {error && <div className={styles.errorText}>{error}</div>}
        {message && <div style={{ color: '#0f5132', backgroundColor: '#d1e7dd', padding: '10px', borderRadius: '4px', fontSize: '14px', marginBottom: '15px', textAlign: 'center' }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email"
              className="form-control"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className="loading-inline" style={{ color: '#fff' }}>
                <span className="spinner" style={{ borderTopColor: '#fff' }}></span> Sending...
              </span>
            ) : 'Send Reset Link'}
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

export default ForgotPasswordPage;
