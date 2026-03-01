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

  useEffect(() => {
    const fetchMeal = () => {
      api.get('/meals/config').then(res => {
        const active = res.data.find(m => m.active && m.enabled);
        setActiveMeal(active || null);
      }).catch(() => {});
    };
    fetchMeal();
    const interval = setInterval(fetchMeal, 10000);
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
    }, 1500);
  }, [rfid, cooldown, activeMeal]);

  return (
    <div className="scanner-page">
      {/* Top branding bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/gdg_logo.png" alt="GDG" style={{ height: '36px' }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem',
              background: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>ECLIPSE</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              24 HR National Level Hackathon
            </div>
          </div>
        </div>

        <div className="flex gap-8" style={{ display: 'flex', alignItems: 'center' }}>
          {activeMeal && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)', padding: '6px 14px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Active</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-light)', fontSize: '0.9rem' }}>
                {activeMeal.label}
              </div>
            </div>
          )}
          {user?.role === 'admin' && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin')}>⬅ Dashboard</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>

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
                  ? '⏳ Processing...'
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
