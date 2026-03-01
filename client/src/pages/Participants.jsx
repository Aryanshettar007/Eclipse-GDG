import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Participants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const fetchParticipants = async () => {
    try {
      const res = await api.get('/participants');
      setParticipants(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParticipants(); }, []);

  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.rfid && p.rfid.toLowerCase().includes(search.toLowerCase())) ||
    (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/participants', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '' });
      fetchParticipants();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add participant');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await api.delete(`/participants/${id}`);
      fetchParticipants();
    } catch (err) { alert('Failed to delete'); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('eclipse_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/participants/export`;
    window.open(`${url}?token=${token}`, '_blank');
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Participants</h2>
          <p>{participants.length} registered • {participants.filter(p => p.rfid).length} RFID mapped</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>📥 Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Add Participant</button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search">
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search by name, RFID, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted" style={{ padding: 40 }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>RFID</th>
                <th>Name</th>
                <th>Team</th>
                <th>Inside</th>
                <th>Meals Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const mealsUsed = Object.values(p.meals || {}).filter(m => m.used).length;
                return (
                  <tr key={p._id}>
                    <td>
                      {p.rfid
                        ? <span className="badge badge-accent">{p.rfid}</span>
                        : <span className="badge badge-muted">Unmapped</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                    <td>{p.teamId?.teamName || <span className="text-muted">—</span>}</td>
                    <td>
                      {p.isInside
                        ? <span className="badge badge-green">Inside</span>
                        : <span className="badge badge-muted">Outside</span>
                      }
                    </td>
                    <td><span className="badge badge-blue">{mealsUsed}/6</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id, p.name)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 40 }}>No participants found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Participant</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-input" placeholder="Full name" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-input" placeholder="Email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input className="form-input" placeholder="Phone" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Participant</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
