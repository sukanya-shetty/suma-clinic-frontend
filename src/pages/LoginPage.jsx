import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/authService';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // Reset Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userType, setUserType] = useState('staff'); // 'staff' or 'admin'
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [adminQuestion, setAdminQuestion] = useState('');
  const [adminAnswer, setAdminAnswer] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (isModalOpen && userType === 'admin') {
      fetchAdminQuestion();
    }
  }, [userType, isModalOpen]);

  const fetchAdminQuestion = async () => {
    setModalError('');
    try {
      const res = await authService.getAdminQuestion();
      if (res.success) {
        setAdminQuestion(res.question);
      }
    } catch (err) {
      setModalError('Failed to fetch admin security question.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    setModalLoading(true);

    try {
      if (userType === 'staff') {
        const res = await authService.requestReset(resetEmail, resetPassword);
        if (res.success) {
          setModalSuccess(res.message);
          setResetEmail('');
          setResetPassword('');
        }
      } else {
        const res = await authService.resetAdminPassword(adminAnswer, resetPassword);
        if (res.success) {
          setModalSuccess('Admin password updated successfully! Redirecting to login in 3 seconds...');
          setAdminAnswer('');
          setResetPassword('');
          setTimeout(() => {
            setIsModalOpen(false);
            setModalSuccess('');
          }, 3000);
        }
      }
    } catch (err) {
      setModalError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setModalLoading(false);
    }
  };

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

        <button 
          type="button" 
          className={styles.forgotBtn} 
          onClick={() => {
            setIsModalOpen(true);
            setModalError('');
            setModalSuccess('');
          }}
        >
          Forgot Password?
        </button>

        {isModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>Reset Password</h2>
                <button 
                  type="button" 
                  className={styles.modalCloseBtn}
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {modalError && <div className={styles.errorText}>{modalError}</div>}
              {modalSuccess && <div className={styles.successBox}>{modalSuccess}</div>}

              <div className={styles.optionGroup}>
                <div 
                  className={`${styles.optionCard} ${userType === 'staff' ? styles.optionCardActive : ''}`}
                  onClick={() => {
                    setUserType('staff');
                    setModalError('');
                    setModalSuccess('');
                  }}
                >
                  <strong>Staff / Doctor</strong>
                  <p style={{ fontSize: '0.75rem', margin: '4px 0 0', color: 'var(--text-muted)' }}>Requires Admin Approval</p>
                </div>
                <div 
                  className={`${styles.optionCard} ${userType === 'admin' ? styles.optionCardActive : ''}`}
                  onClick={() => {
                    setUserType('admin');
                    setModalError('');
                    setModalSuccess('');
                  }}
                >
                  <strong>Administrator</strong>
                  <p style={{ fontSize: '0.75rem', margin: '4px 0 0', color: 'var(--text-muted)' }}>Answer Security Question</p>
                </div>
              </div>

              <form onSubmit={handleResetSubmit}>
                {userType === 'staff' ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="resetEmail">Your Registered Email</label>
                      <input 
                        type="email" 
                        id="resetEmail"
                        className="form-control"
                        placeholder="doctor@clinic.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.infoBox}>
                      <strong>Question:</strong> {adminQuestion || 'Loading security question...'}
                    </div>
                    <div className="form-group">
                      <label htmlFor="adminAnswer">Your Security Answer</label>
                      <input 
                        type="text" 
                        id="adminAnswer"
                        className="form-control"
                        placeholder="Enter case-insensitive answer"
                        value={adminAnswer}
                        onChange={(e) => setAdminAnswer(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="resetPassword">Proposed New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showResetPassword ? 'text' : 'password'} 
                      id="resetPassword"
                      className="form-control"
                      placeholder="Min 6 characters"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button 
                    type="button" 
                    className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                    disabled={modalLoading}
                  >
                    {modalLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
