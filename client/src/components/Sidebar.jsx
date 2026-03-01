import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/gdg_logo.png" alt="GDG JSSATEB" style={{ width: '80px', marginBottom: '8px' }} />
        <h1>ECLIPSE</h1>
        <span>Management System</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Overview</div>
        <NavLink to="/admin" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">📊</span> Dashboard
        </NavLink>

        <div className="sidebar-section">Scanners</div>
        <NavLink to="/scan/entry" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🚪</span> Entry/Exit
        </NavLink>
        <NavLink to="/scan/food" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🍽️</span> Food Scanner
        </NavLink>

        <div className="sidebar-section">Management</div>
        <NavLink to="/admin/participants" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">👥</span> Participants
        </NavLink>
        <NavLink to="/admin/volunteers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🙋</span> Volunteers
        </NavLink>
        <NavLink to="/admin/teams" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🏷️</span> Teams
        </NavLink>

        <div className="sidebar-section">Food & Meals</div>
        <NavLink to="/admin/meals" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🍕</span> Meal Config
        </NavLink>

        <div className="sidebar-section">Data</div>
        <NavLink to="/admin/rfid-mapping" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🪪</span> RFID Mapping
        </NavLink>
        <NavLink to="/admin/import" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">📤</span> Import CSV
        </NavLink>
        <NavLink to="/admin/logs" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">📋</span> Scan Logs
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🔐</span> Staff Users
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <strong>{user?.username}</strong>
          {user?.role}
        </div>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </aside>
  );
}
