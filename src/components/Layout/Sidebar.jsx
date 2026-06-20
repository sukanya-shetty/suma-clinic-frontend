import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  Pill, 
  DollarSign, 
  LogOut, 
  Heart,
  BarChart2,
  ShoppingCart
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);

  const isDoctor = user && user.role === 'Doctor';
  const isPharmacist = user && user.role === 'Pharmacist';
  const isNurse = user && user.role === 'Nurse';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, show: true },
    { path: '/patients', label: 'Patients', icon: <Users size={18} />, show: isDoctor || isPharmacist || isNurse },
    { path: '/visits/new', label: 'New Visit', icon: <PlusCircle size={18} />, show: isDoctor },
    { path: '/inventory', label: 'Inventory', icon: <Pill size={18} />, show: isDoctor || isPharmacist },
    { path: '/sales/walkin', label: 'Direct Dispensing', icon: <ShoppingCart size={18} />, show: isDoctor || isPharmacist },
    { path: '/reports', label: 'Reports', icon: <BarChart2 size={18} />, show: isDoctor || isPharmacist },
  ].filter(item => item.show);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <Heart size={20} color="var(--primary)" fill="var(--primary)" />
        <span className={styles.logoText}>Suma Clinic</span>
      </div>
      
      <nav className={styles.navSection}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => 
                  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className={styles.footerSection}>
        {user && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userRole}>{user.role}</span>
          </div>
        )}
        <button onClick={logout} className={styles.logoutBtn}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
