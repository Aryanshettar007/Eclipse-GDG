import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'volunteer' });

  const fetchVolunteers = async () => {
    try {
      const res = await api.get('/volunteers');
      setVolunteers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVolunteers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/volunteers', form);
      setShowModal(false);
      setForm({ name: '', role: 'volunteer' });
      fetchVolunteers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add volunteer');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await api.delete(`/volunteers/${id}`);
      fetchVolunteers();
    } catch (err) { alert('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Volunteers</h2>
          <p>{volunteers.length} total • {volunteers.filter(v => v.role === 'mentor').length} mentors</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Add Volunteer</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>RFID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Assigned Teams</th>
              <th>Inside</th>
              <th>Meals Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center text-muted" style={{ padding: 40 }}>Loading...</td></tr>
            ) : volunteers.length === 0 ? (
              <tr><td colSpan="7" className="text-center text-muted" style={{ padding: 40 }}>No volunteers yet</td></tr>
            ) : (
              volunteers.map(v => {
                const mealsUsed = Object.values(v.meals || {}).filter(m => m.used).length;
                return (
                  <tr key={v._id}>
                    <td>
                      {v.rfid
                        ? <span className="badge badge-accent">{v.rfid}</span>
                        : <span className="badge badge-muted">Unmapped</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.name}</td>
                    <td>
                      <span className={`badge ${v.role === 'mentor' ? 'badge-blue' : 'badge-muted'}`}>
                        {v.role}
                      </span>
                    </td>
                    <td>
                      {v.assignedTeamIds?.length > 0
                        ? v.assignedTeamIds.map(t => t.teamName || t).join(', ')
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td>
                      {v.isInside
                        ? <span className="badge badge-green">Inside</span>
                        : <span className="badge badge-muted">Outside</span>
                      }
                    </td>
                    <td><span className="badge badge-blue">{mealsUsed}/6</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v._id, v.name)}>Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Volunteer</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-input" placeholder="Full name" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-select" value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="volunteer">Volunteer</option>
                  <option value="mentor">Mentor</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Volunteer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
