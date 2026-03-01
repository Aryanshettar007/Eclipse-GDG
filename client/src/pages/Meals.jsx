import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Meals() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = async () => {
    try {
      const res = await api.get('/meals/config');
      setMeals(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeals(); }, []);

  const setActiveMeal = async (mealType) => {
    try {
      const res = await api.put('/meals/config', { mealType, active: true });
      setMeals(res.data.meals);
    } catch (err) { alert('Failed to set active meal'); }
  };

  const deactivateMeal = async (mealType) => {
    try {
      const res = await api.put('/meals/config', { mealType, active: false });
      setMeals(res.data.meals);
    } catch (err) { alert('Failed to deactivate meal'); }
  };

  const toggleEnabled = async (mealType, enabled) => {
    try {
      const res = await api.put('/meals/config', { mealType, enabled });
      setMeals(res.data.meals);
    } catch (err) { alert('Failed to toggle meal'); }
  };

  const resetMeal = async (mealType, label) => {
    if (!confirm(`Reset ALL ${label} records? This will mark it as unused for everyone.`)) return;
    try {
      await api.post('/meals/reset', { mealType });
      alert(`${label} reset successfully`);
    } catch (err) { alert('Failed to reset meal'); }
  };

  if (loading) return <div className="text-center text-muted mt-20">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Meal Configuration</h2>
        <p>Set the active meal, enable/disable meals, reset meal data</p>
      </div>

      <div className="flex flex-col gap-12">
        {meals.map(meal => (
          <div key={meal.mealType} className={`meal-card ${meal.active ? 'active' : ''}`}>
            <div className="meal-info" style={{ flex: 1 }}>
              <h4>
                {meal.active && '🔥 '}{meal.label}
              </h4>
              <p>
                {meal.active ? 'Currently serving' : meal.enabled ? 'Ready to serve' : 'Disabled'}
              </p>
            </div>

            <div className="meal-actions">
              {meal.active ? (
                <button className="btn btn-secondary btn-sm" onClick={() => deactivateMeal(meal.mealType)}>
                  ⏸ Deactivate
                </button>
              ) : (
                <button className="btn btn-primary btn-sm"
                  onClick={() => setActiveMeal(meal.mealType)}
                  disabled={!meal.enabled}>
                  ▶ Activate
                </button>
              )}

              <label className="toggle">
                <input type="checkbox" checked={meal.enabled}
                  onChange={e => toggleEnabled(meal.mealType, e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>

              <button className="btn btn-danger btn-sm" onClick={() => resetMeal(meal.mealType, meal.label)}>
                🔄 Reset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
