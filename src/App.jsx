import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NewVisitPage from './pages/NewVisitPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import WalkInSalePage from './pages/WalkInSalePage';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes Nested inside Master Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              
              {/* Doctor Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Doctor']} />}>
                <Route path="/visits/new" element={<NewVisitPage />} />
              </Route>
              
              {/* Doctor and Pharmacist Allowed Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Doctor', 'Pharmacist']} />}>
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/sales/walkin" element={<WalkInSalePage />} />
              </Route>
            </Route>
          </Route>
          
          {/* Default Redirection */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
