import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './Topbar.module.css';

const Topbar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  console.log('Topbar state - path:', location.pathname, 'role:', user?.role);

  const getPageTitle = (pathname) => {
    const cleanPath = pathname.toLowerCase().replace(/\/$/, '');
    if (cleanPath === '/dashboard') return 'Dashboard';
    if (cleanPath === '/patients') return 'Patient Management';
    if (cleanPath.startsWith('/patients/')) return 'Patient Details';
    if (cleanPath === '/visits/new') return 'New Consultation Visit';
    if (cleanPath === '/inventory') return 'Medicine Inventory';
    if (cleanPath === '/sales') return 'Billing & Sales Records';
    return 'Suma Clinic';
  };

  const handleScrollToStaff = () => {
    const element = document.getElementById('staff-management-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isDashboard = location.pathname.toLowerCase().replace(/\/$/, '') === '/dashboard';

  return (
    <header className={styles.topbar}>
      <h2 className={styles.title}>{getPageTitle(location.pathname)}</h2>
      
      {user && (
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{user.role}</span>
          {user.role === 'Doctor' && isDashboard && (
            <button onClick={handleScrollToStaff} className={styles.addStaffBtn}>
              + Register Staff
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Topbar;
