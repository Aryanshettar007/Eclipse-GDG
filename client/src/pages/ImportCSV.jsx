import { useState, useRef } from 'react';
import api from '../services/api';

export default function ImportCSV() {
  const [tab, setTab] = useState('participants');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return alert('Please select a CSV file');

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = tab === 'participants'
        ? '/admin/import/participants'
        : '/admin/import/volunteers';

      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult({ type: 'success', data: res.data });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || 'Import failed' });
    } finally {
      setLoading(false);
      fileRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>📤 Import CSV</h2>
        <p>Bulk import participants or volunteers from a CSV file</p>
      </div>

      <div className="flex gap-8 mb-20">
        <button className={`btn ${tab === 'participants' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => { setTab('participants'); setResult(null); }}>
          👥 Import Participants
        </button>
        <button className={`btn ${tab === 'volunteers' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => { setTab('volunteers'); setResult(null); }}>
          🙋 Import Volunteers
        </button>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 16 }}>
            Upload {tab === 'participants' ? 'Participants' : 'Volunteers'} CSV
          </h3>

          <div className="card mb-16" style={{ background: 'var(--bg-input)', padding: 16 }}>
            <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Expected CSV columns:</strong>
            </p>
            {tab === 'participants' ? (
              <code style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>
                name, email, phone, teamName
              </code>
            ) : (
              <code style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>
                name, role
              </code>
            )}
            <p className="text-sm text-muted" style={{ marginTop: 8 }}>
              RFID is NOT needed — you'll map RFID cards separately in the RFID Mapping page.
              {tab === 'participants' && ' Teams are auto-created if team name is provided.'}
            </p>
          </div>

          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>CSV File</label>
              <input ref={fileRef} type="file" accept=".csv" className="form-input" required />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? '⏳ Importing...' : '📤 Import CSV'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 16 }}>
            Import Result
          </h3>

          {!result ? (
            <div className="text-center text-muted" style={{ padding: '40px 20px' }}>
              Upload a CSV to see results here
            </div>
          ) : result.type === 'error' ? (
            <div style={{ background: 'var(--red-glow)', padding: 16, borderRadius: 'var(--radius-sm)', color: 'var(--red)' }}>
              ❌ {result.message}
            </div>
          ) : (
            <div>
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="stat-card green" style={{ padding: 14 }}>
                  <div className="stat-value" style={{ fontSize: '1.6rem' }}>{result.data.created}</div>
                  <div className="stat-label">Created</div>
                </div>
                <div className="stat-card orange" style={{ padding: 14 }}>
                  <div className="stat-value" style={{ fontSize: '1.6rem' }}>{result.data.skipped}</div>
                  <div className="stat-label">Skipped</div>
                </div>
                <div className="stat-card" style={{ padding: 14 }}>
                  <div className="stat-value" style={{ fontSize: '1.6rem' }}>{result.data.total}</div>
                  <div className="stat-label">Total Rows</div>
                </div>
              </div>

              <p style={{ color: 'var(--green)', fontWeight: 600, marginTop: 16 }}>✅ {result.data.message}</p>

              {result.data.errors && (
                <div style={{ marginTop: 16 }}>
                  <p className="text-muted text-sm mb-8">Errors:</p>
                  <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem', color: 'var(--red)' }}>
                    {result.data.errors.map((err, i) => <p key={i}>• {err}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
