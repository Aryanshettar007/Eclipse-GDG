import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ScanEntry() {
  const [rfid, setRfid] = useState('');
  const [result, setResult] = useState(null);
  const [insideCount, setInsideCount] = useState({ participants: 0, volunteers: 0, total: 0 });
  const [cooldown, setCooldown] = useState(false);
  const inputRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Auto-focus input
  useEffect(() => {
    if (!cooldown && inputRef.current) {
      inputRef.current.focus();
    }
  }, [cooldown, result]);

  // Fetch initial inside count
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/analytics').then(res => {
        setInsideCount({
          participants: res.data.participants.inside,
          volunteers: res.data.volunteers.inside,
          total: res.data.totalInside
        });
      }).catch(() => {});
    }
  }, []);

  const handleScan = useCallback(async (e) => {
    e.preventDefault();
    if (!rfid.trim() || cooldown) return;

    try {
      const res = await api.post('/scan/entry', { rfid: rfid.trim() });
      setResult({
        type: res.data.action,
        name: res.data.person.name,
        personType: res.data.person.type,
        rfid: res.data.person.rfid
      });
      setInsideCount(res.data.insideCount);
    } catch (err) {
      const errData = err.response?.data;
      setResult({
        type: 'error',
        message: errData?.error || 'Scan failed'
      });
    }

    setRfid('');
    setCooldown(true);
    setTimeout(() => {
      setCooldown(false);
      setResult(null);
    }, 2000);
  }, [rfid, cooldown]);

  return (
    <div className="scanner-page">
      <div className="scanner-nav">
        {user?.role === 'admin' && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin')}>
            ⬅ Dashboard
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={logout}>Logout</button>
      </div>

      {!result ? (
        <>
          <div className="scanner-header">
            <h1>ENTRY / EXIT</h1>
            <p>Scan RFID card to check in or check out</p>
          </div>

          <div className="scanner-input-area">
            <form onSubmit={handleScan}>
              <input
                ref={inputRef}
                type="text"
                className="scanner-input"
                placeholder="Scan RFID..."
                value={rfid}
                onChange={e => setRfid(e.target.value)}
                disabled={cooldown}
                autoFocus
              />
            </form>
            <p className="scanner-hint">
              {cooldown ? '⏳ Cooldown...' : '📡 Waiting for RFID scan'}
            </p>
          </div>
        </>
      ) : (
        <div className={`scanner-result ${result.type}`}>
          <div className="result-icon">
            {result.type === 'entry' && '✅'}
            {result.type === 'exit' && '🚪'}
            {result.type === 'error' && '❌'}
          </div>
          <div className="result-action">
            {result.type === 'entry' && 'ENTRY'}
            {result.type === 'exit' && 'EXIT'}
            {result.type === 'error' && 'ERROR'}
          </div>
          {result.name && <div className="result-name">{result.name}</div>}
          {result.message && <div className="result-name">{result.message}</div>}
          {result.personType && (
            <div className="result-info">{result.personType.toUpperCase()}</div>
          )}
        </div>
      )}

      <div className="scanner-stats">
        <div className="scanner-stat">
          <div className="stat-num">{insideCount.total}</div>
          <div className="stat-lbl">Inside Now</div>
        </div>
        <div className="scanner-stat">
          <div className="stat-num">{insideCount.participants}</div>
          <div className="stat-lbl">Participants</div>
        </div>
        <div className="scanner-stat">
          <div className="stat-num">{insideCount.volunteers}</div>
          <div className="stat-lbl">Volunteers</div>
        </div>
      </div>
    </div>
  );
}
