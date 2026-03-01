import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ action: '', personType: '' });
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (filters.action) params.set('action', filters.action);
      if (filters.personType) params.set('personType', filters.personType);

      const res = await api.get(`/logs?${params}`);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [filters]);

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>📋 Scan Logs</h2>
          <p>{pagination.total} total scans recorded</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/logs/export`;
          window.open(url, '_blank');
        }}>
          📥 Export CSV
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="flex gap-8">
            <select className="form-select" style={{ width: 150 }}
              value={filters.action}
              onChange={e => setFilters({ ...filters, action: e.target.value })}>
              <option value="">All Actions</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
              <option value="food">Food</option>
            </select>
            <select className="form-select" style={{ width: 150 }}
              value={filters.personType}
              onChange={e => setFilters({ ...filters, personType: e.target.value })}>
              <option value="">All Types</option>
              <option value="participant">Participant</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted" style={{ padding: 40 }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>RFID</th>
                <th>Action</th>
                <th>Person Type</th>
                <th>Meal</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i}>
                  <td>{new Date(log.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}</td>
                  <td><span className="badge badge-accent">{log.rfid}</span></td>
                  <td>
                    <span className={`badge ${log.action === 'entry' ? 'badge-green' : log.action === 'exit' ? 'badge-orange' : 'badge-blue'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.personType}</td>
                  <td>{log.mealType ? log.mealType.replace(/_/g, ' ') : '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="5" className="text-center text-muted" style={{ padding: 40 }}>No logs found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}>
              ← Previous
            </button>
            <span className="text-sm text-muted">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLogs(pagination.page + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
