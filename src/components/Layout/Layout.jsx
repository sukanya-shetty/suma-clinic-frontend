import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  return (
    <div className="app-layout">
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
