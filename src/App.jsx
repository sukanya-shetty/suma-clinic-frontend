import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NewVisitPage from './pages/NewVisitPage';
import ReportsPage from './pages/ReportsPage';
import RegisterStaffPage from './pages/RegisterStaffPage';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected Routes Nested inside Master Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              
              {/* Doctor Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Doctor']} />}>
                <Route path="/visits/new" element={<NewVisitPage />} />
                <Route path="/register-staff" element={<RegisterStaffPage />} />
              </Route>
              
              {/* Doctor, Pharmacist, and Nurse Allowed Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Doctor', 'Pharmacist', 'Nurse']} />}>
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/patients/:id" element={<PatientDetailPage />} />
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
