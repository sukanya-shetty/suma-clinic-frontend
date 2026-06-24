import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AuthContext } from '../../context/AuthContext';

const Layout = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className={`app-layout ${user && user.role === 'Admin' ? 'theme-admin' : ''}`}>
      {/* Fixed Sidebar */}
      <Sidebar />
      
      {/* Top Header and Content area */}
      <div className="main-content">
        <Topbar />
        
        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
