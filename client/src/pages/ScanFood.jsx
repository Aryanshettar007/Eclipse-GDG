import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ScanFood() {
  const [rfid, setRfid] = useState('');
  const [result, setResult] = useState(null);
  const [activeMeal, setActiveMeal] = useState(null);
  const [servedCount, setServedCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const inputRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch active meal
  useEffect(() => {
    const fetchMeal = () => {
      api.get('/meals/config').then(res => {
        const active = res.data.find(m => m.active && m.enabled);
        setActiveMeal(active || null);
      }).catch(() => {});
    };
    fetchMeal();
    const interval = setInterval(fetchMeal, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cooldown && inputRef.current) inputRef.current.focus();
  }, [cooldown, result]);

  const handleScan = useCallback(async (e) => {
    e.preventDefault();
    if (!rfid.trim() || cooldown) return;

    try {
      const res = await api.post('/scan/food', { rfid: rfid.trim() });
      setResult({
        type: 'allowed',
        name: res.data.person.name,
        personType: res.data.person.type,
        meal: res.data.meal
      });
      setServedCount(res.data.servedCount.total);
    } catch (err) {
      const errData = err.response?.data;
      setResult({
        type: errData?.status || 'error',
        name: errData?.person?.name || '',
        message: errData?.error || 'Scan failed',
        meal: activeMeal?.label || ''
      });
    }

    setRfid('');
    setCooldown(true);
    setTimeout(() => {
      setCooldown(false);
      setResult(null);
    }, 3000);
  }, [rfid, cooldown, activeMeal]);

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

      {activeMeal && (
        <div className="scanner-active-meal">
          <div className="meal-label">Active Meal</div>
          <div className="meal-name">{activeMeal.label}</div>
        </div>
      )}

      {!result ? (
        <>
          <div className="scanner-header">
            <h1>FOOD COUPON</h1>
            <p>
              {activeMeal
                ? `Scanning for: ${activeMeal.label}`
                : '⚠️ No meal is currently active'}
            </p>
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
                disabled={cooldown || !activeMeal}
                autoFocus
              />
            </form>
            <p className="scanner-hint">
              {!activeMeal
                ? '⛔ Ask admin to activate a meal'
                : cooldown
                  ? '⏳ Cooldown...'
                  : '📡 Waiting for RFID scan'}
            </p>
          </div>
        </>
      ) : (
        <div className={`scanner-result ${result.type}`}>
          <div className="result-icon">
            {result.type === 'allowed' && '✅'}
            {result.type === 'already_used' && '❌'}
            {result.type === 'error' && '⛔'}
          </div>
          <div className="result-action">
            {result.type === 'allowed' && 'ALLOWED'}
            {result.type === 'already_used' && 'ALREADY USED'}
            {result.type === 'error' && 'DENIED'}
          </div>
          {result.name && <div className="result-name">{result.name}</div>}
          {result.message && result.type !== 'allowed' && (
            <div className="result-info">{result.message}</div>
          )}
          {result.meal && <div className="result-info">🍽️ {result.meal}</div>}
        </div>
      )}

      <div className="scanner-stats">
        <div className="scanner-stat">
          <div className="stat-num">{servedCount}</div>
          <div className="stat-lbl">Meals Served</div>
        </div>
        <div className="scanner-stat">
          <div className="stat-num">{activeMeal?.label || '—'}</div>
          <div className="stat-lbl">Active Meal</div>
        </div>
      </div>
    </div>
  );
}
