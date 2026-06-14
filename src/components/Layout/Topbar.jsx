import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './Topbar.module.css';

const Topbar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/patients') return 'Patient Management';
    if (pathname.startsWith('/patients/')) return 'Patient Details';
    if (pathname === '/visits/new') return 'New Consultation Visit';
    if (pathname === '/inventory') return 'Medicine Inventory';
    if (pathname === '/sales') return 'Billing & Sales Records';
    return 'Suma Clinic';
  };

  return (
    <header className={styles.topbar}>
      <h2 className={styles.title}>{getPageTitle(location.pathname)}</h2>
      
      {user && (
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{user.role}</span>
        </div>
      )}
    </header>
  );
};

export default Topbar;
