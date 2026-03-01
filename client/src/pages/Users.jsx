import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'volunteer_entry' });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', form);
      setShowModal(false);
      setForm({ username: '', password: '', role: 'volunteer_entry' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`Delete user ${username}?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const roleLabel = (role) => {
    switch (role) {
      case 'admin': return { text: 'Admin', class: 'badge-accent' };
      case 'volunteer_entry': return { text: 'Entry Volunteer', class: 'badge-green' };
      case 'volunteer_food': return { text: 'Food Volunteer', class: 'badge-blue' };
      default: return { text: role, class: 'badge-muted' };
    }
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>🔐 Staff Users</h2>
          <p>Manage login accounts for admin and volunteers</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Create User</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="text-center text-muted" style={{ padding: 40 }}>Loading...</td></tr>
            ) : users.map(u => {
              const role = roleLabel(u.role);
              return (
                <tr key={u._id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.username}</td>
                  <td><span className={`badge ${role.class}`}>{role.text}</span></td>
                  <td>
                    {u.username !== 'admin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id, u.username)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Staff User</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Username *</label>
                <input className="form-input" placeholder="e.g. entry_desk1" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input className="form-input" type="password" placeholder="Choose a password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-select" value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="volunteer_entry">Entry/Exit Volunteer</option>
                  <option value="volunteer_food">Food Volunteer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <p className="text-sm text-muted mb-16">
                Entry volunteers can only scan entry/exit. Food volunteers can only scan food coupons.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
