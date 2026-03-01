import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ScanEntry from './pages/ScanEntry';
import ScanFood from './pages/ScanFood';
import Dashboard from './pages/Dashboard';
import Participants from './pages/Participants';
import Volunteers from './pages/Volunteers';
import Teams from './pages/Teams';
import Meals from './pages/Meals';
import RfidMapping from './pages/RfidMapping';
import ImportCSV from './pages/ImportCSV';
import Logs from './pages/Logs';
import Users from './pages/Users';
import AdminLayout from './components/AdminLayout';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center text-muted mt-20">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate page based on role
    if (user.role === 'volunteer_entry') return <Navigate to="/scan/entry" />;
    if (user.role === 'volunteer_food') return <Navigate to="/scan/food" />;
    return <Navigate to="/login" />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={
        user.role === 'admin' ? '/admin' :
        user.role === 'volunteer_entry' ? '/scan/entry' :
        '/scan/food'
      } /> : <Login />} />

      {/* Scanner Pages */}
      <Route path="/scan/entry" element={
        <ProtectedRoute roles={['admin', 'volunteer_entry']}>
          <ScanEntry />
        </ProtectedRoute>
      } />
      <Route path="/scan/food" element={
        <ProtectedRoute roles={['admin', 'volunteer_food']}>
          <ScanFood />
        </ProtectedRoute>
      } />

      {/* Admin Pages (with sidebar layout) */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="participants" element={<Participants />} />
        <Route path="volunteers" element={<Volunteers />} />
        <Route path="teams" element={<Teams />} />
        <Route path="meals" element={<Meals />} />
        <Route path="rfid-mapping" element={<RfidMapping />} />
        <Route path="import" element={<ImportCSV />} />
        <Route path="logs" element={<Logs />} />
        <Route path="users" element={<Users />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
