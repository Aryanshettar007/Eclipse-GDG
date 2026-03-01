import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(null); // team id
  const [teamName, setTeamName] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');

  const fetchTeams = async () => {
    try {
      const [teamsRes, volunteersRes] = await Promise.all([
        api.get('/teams'),
        api.get('/volunteers')
      ]);
      setTeams(teamsRes.data);
      setMentors(volunteersRes.data.filter(v => v.role === 'mentor'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teams', { teamName });
      setShowModal(false);
      setTeamName('');
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create team');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete team ${name}? Members will be unassigned.`)) return;
    try {
      await api.delete(`/teams/${id}`);
      fetchTeams();
    } catch (err) { alert('Failed to delete'); }
  };

  const openMentorModal = (team) => {
    setShowMentorModal(team._id);
    setSelectedMentor(team.mentor?._id || '');
  };

  const handleAssignMentor = async () => {
    try {
      await api.put(`/teams/${showMentorModal}`, {
        mentorId: selectedMentor || null
      });
      setShowMentorModal(null);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign mentor');
    }
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Teams</h2>
          <p>{teams.length} teams registered</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Create Team</button>
      </div>

      {loading ? (
        <div className="text-center text-muted mt-20">Loading...</div>
      ) : teams.length === 0 ? (
        <div className="text-center text-muted mt-20">No teams yet. Import participants with team names or create manually.</div>
      ) : (
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {teams.map(team => (
            <div key={team._id} className="card">
              <div className="flex justify-between items-center mb-16">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                  {team.teamName}
                </h3>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(team._id, team.teamName)}>✕</button>
              </div>

              <div className="flex gap-12 mb-16">
                <div className="stat-card" style={{ flex: 1, padding: '12px 16px' }}>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>{team.totalMembers}</div>
                  <div className="stat-label">Members</div>
                </div>
                <div className="stat-card green" style={{ flex: 1, padding: '12px 16px' }}>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>{team.checkedInCount}</div>
                  <div className="stat-label">Inside</div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }} className="flex items-center justify-between">
                <div>
                  <span className="text-muted text-sm">Mentor: </span>
                  {team.mentor
                    ? <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{team.mentor.name}</span>
                    : <span className="text-muted">Unassigned</span>
                  }
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => openMentorModal(team)}>
                  {team.mentor ? '✏️ Change' : '➕ Assign'}
                </button>
              </div>

              <div>
                <span className="text-muted text-sm">Members:</span>
                <div className="flex flex-col gap-4" style={{ marginTop: 6 }}>
                  {team.members?.map(m => (
                    <div key={m._id} className="flex items-center justify-between" style={{ fontSize: '0.85rem' }}>
                      <span>{m.name}</span>
                      {m.isInside
                        ? <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>In</span>
                        : <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>Out</span>
                      }
                    </div>
                  ))}
                  {(!team.members || team.members.length === 0) && (
                    <span className="text-muted text-sm">No members assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Team</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Team Name *</label>
                <input className="form-input" placeholder="e.g. Team Eclipse" value={teamName}
                  onChange={e => setTeamName(e.target.value)} required autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Mentor Modal */}
      {showMentorModal && (
        <div className="modal-overlay" onClick={() => setShowMentorModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Assign Mentor</h3>
            <div className="form-group">
              <label>Select Mentor</label>
              <select className="form-select" value={selectedMentor}
                onChange={e => setSelectedMentor(e.target.value)}>
                <option value="">— No Mentor —</option>
                {mentors.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
            {mentors.length === 0 && (
              <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
                No mentors found. Add volunteers with the "Mentor" role first.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowMentorModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignMentor}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
