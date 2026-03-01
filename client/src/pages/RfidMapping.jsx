import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function RfidMapping() {
  const [unmapped, setUnmapped] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rfid, setRfid] = useState('');
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('participants');
  const [search, setSearch] = useState('');
  const rfidInputRef = useRef(null);

  const fetchUnmapped = async () => {
    try {
      const endpoint = tab === 'participants' ? '/participants/unmapped' : '/volunteers/unmapped';
      const res = await api.get(endpoint);
      setUnmapped(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); fetchUnmapped(); }, [tab]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selected || !rfid.trim()) return;

    try {
      const endpoint = tab === 'participants'
        ? `/participants/${selected._id}/assign-rfid`
        : `/volunteers/${selected._id}/assign-rfid`;

      const res = await api.put(endpoint, { rfid: rfid.trim() });
      setResult({ type: 'success', message: res.data.message });
      setRfid('');
      setSelected(null);
      fetchUnmapped();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || 'Failed to assign' });
    }

    setTimeout(() => setResult(null), 3000);
  };

  const selectPerson = (person) => {
    setSelected(person);
    setRfid('');
    setTimeout(() => rfidInputRef.current?.focus(), 100);
  };

  return (
    <div>
      <div className="page-header">
        <h2>🪪 RFID Mapping</h2>
        <p>Scan an RFID card and assign it to a participant or volunteer</p>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`card mb-20`} style={{
          borderColor: result.type === 'success' ? 'var(--green)' : 'var(--red)',
          background: result.type === 'success' ? 'var(--green-glow)' : 'var(--red-glow)',
          textAlign: 'center', padding: '14px', fontWeight: 600
        }}>
          {result.type === 'success' ? '✅' : '❌'} {result.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-8 mb-20">
        <button
          className={`btn ${tab === 'participants' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setTab('participants')}>
          👥 Participants ({tab === 'participants' ? unmapped.length : '...'})
        </button>
        <button
          className={`btn ${tab === 'volunteers' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setTab('volunteers')}>
          🙋 Volunteers ({tab === 'volunteers' ? unmapped.length : '...'})
        </button>
      </div>

      <div className="grid-2">
        {/* Unmapped list */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 12 }}>
            Unmapped {tab === 'participants' ? 'Participants' : 'Volunteers'} ({unmapped.length})
          </h3>

          <input
            type="text"
            className="form-input mb-16"
            placeholder="🔍 Search by name or team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : unmapped.length === 0 ? (
            <p className="text-muted">🎉 All {tab} have been mapped!</p>
          ) : (
            <div className="flex flex-col gap-4">
              {unmapped.filter(p =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.teamId?.teamName || '').toLowerCase().includes(search.toLowerCase())
              ).map(person => (
                <div key={person._id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: selected?._id === person._id ? 'var(--accent-glow)' : 'transparent',
                    border: selected?._id === person._id ? '1px solid var(--accent)' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => selectPerson(person)}>
                  <span style={{ fontWeight: 500 }}>{person.name}</span>
                  {person.teamId && (
                    <span className="badge badge-muted">{person.teamId.teamName || ''}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RFID Assignment */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 16 }}>
            Assign RFID Card
          </h3>

          {selected ? (
            <div>
              <div className="stat-card accent mb-16" style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{selected.name}</div>
                <div className="stat-label">Selected for mapping</div>
              </div>

              <form onSubmit={handleAssign}>
                <div className="form-group">
                  <label>Scan RFID Card</label>
                  <input
                    ref={rfidInputRef}
                    type="text"
                    className="form-input"
                    placeholder="Tap RFID card or type number..."
                    value={rfid}
                    onChange={e => setRfid(e.target.value)}
                    autoFocus
                    style={{ fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px', padding: '14px' }}
                  />
                </div>
                <div className="flex gap-8">
                  <button type="button" className="btn btn-secondary w-full" onClick={() => setSelected(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary w-full" disabled={!rfid.trim()}>
                    ✅ Assign RFID
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '60px 20px' }}>
              <p style={{ fontSize: '2rem', marginBottom: 8 }}>👈</p>
              <p>Select a person from the list to assign an RFID card</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
