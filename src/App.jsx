import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Layout from './components/Layout/Layout';
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
              
              {/* Admin and Doctor Allowed Reports */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Pharmacist']} />}>
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
              
              {/* Doctor & Receptionist Allowed Route */}
              <Route element={<ProtectedRoute allowedRoles={['Doctor', 'Receptionist']} />}>
                <Route path="/visits/new" element={<NewVisitPage />} />
              </Route>
              
              {/* Admin, Doctor, Pharmacist, Receptionist, and Nurse Allowed Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Pharmacist', 'Receptionist', 'Nurse']} />}>
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/patients/:id" element={<PatientDetailPage />} />
              </Route>
              
              {/* Admin, Doctor, and Pharmacist Allowed Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Pharmacist']} />}>
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>
              
              {/* Admin and Pharmacist Allowed Sales Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Pharmacist']} />}>
                <Route path="/sales" element={<SalesPage />} />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['Pharmacist']} />}>
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
