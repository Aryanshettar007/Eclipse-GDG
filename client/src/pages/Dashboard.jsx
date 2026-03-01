import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, feedRes] = await Promise.all([
        api.get('/analytics'),
        api.get('/analytics/feed?limit=15')
      ]);
      setStats(statsRes.data);
      setFeed(feedRes.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center text-muted mt-20">Loading dashboard...</div>;
  if (!stats) return <div className="text-center text-muted mt-20">Failed to load stats</div>;

  const activeMeal = stats.meals?.find(m => m.active);

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Real-time hackathon overview • Auto-refreshes every 10s</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalRegistered}</div>
          <div className="stat-label">Registered</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">🏠</div>
          <div className="stat-value">{stats.totalInside}</div>
          <div className="stat-label">Inside Now</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🪪</div>
          <div className="stat-value">{stats.totalMapped}</div>
          <div className="stat-label">RFID Mapped</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">👤</div>
          <div className="stat-value">{stats.participants.total}</div>
          <div className="stat-label">Participants</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🙋</div>
          <div className="stat-value">{stats.volunteers.total}</div>
          <div className="stat-label">Volunteers</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🍽️</div>
          <div className="stat-value">{activeMeal?.label || '—'}</div>
          <div className="stat-label" style={{ fontSize: '0.7rem' }}>Active Meal</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Live Feed */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            ⚡ Live Scan Feed
          </h3>
          <div className="feed-list">
            {feed.length === 0 ? (
              <p className="text-muted text-sm">No scans yet</p>
            ) : (
              feed.map((item, i) => (
                <div key={i} className="feed-item">
                  <span className="feed-icon">
                    {item.action === 'entry' ? '✅' : item.action === 'exit' ? '🚪' : '🍽️'}
                  </span>
                  <span className="feed-name">{item.personName}</span>
                  <span className="feed-action">
                    {item.action === 'food' ? (
                      <span className="badge badge-accent">{item.mealType?.replace(/_/g, ' ')}</span>
                    ) : (
                      <span className={`badge ${item.action === 'entry' ? 'badge-green' : 'badge-orange'}`}>
                        {item.action}
                      </span>
                    )}
                  </span>
                  <span className="feed-time">
                    {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Meal Stats */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            🍕 Meal Statistics
          </h3>
          <div className="flex flex-col gap-8">
            {stats.meals?.map((meal) => (
              <div key={meal.mealType} className={`meal-card ${meal.active ? 'active' : ''}`}>
                <div className="meal-info">
                  <h4>
                    {meal.active && '🔥 '}{meal.label}
                  </h4>
                  <p>
                    {meal.served.total} / {meal.totalEligible} served
                    {!meal.enabled && ' • Disabled'}
                  </p>
                </div>
                <div>
                  {meal.active ? (
                    <span className="badge badge-green">Active</span>
                  ) : meal.enabled ? (
                    <span className="badge badge-muted">Ready</span>
                  ) : (
                    <span className="badge badge-red">Disabled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
