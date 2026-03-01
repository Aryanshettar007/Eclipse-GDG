const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MealConfig = require('../models/MealConfig');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ───── POST /api/auth/login ─────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      console.log(`❌ Login failed: User "${username}" not found`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`❌ Login failed: Password mismatch for "${username}"`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log(`✅ Login successful: "${username}"`);

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/auth/me ─────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/auth/seed ─────
// Creates default admin + meal configs (run once)
router.post('/seed', async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }

    // Create admin user
    const admin = new User({
      username: 'admin',
      passwordHash: 'admin123',  // will be hashed by pre-save hook
      role: 'admin'
    });
    await admin.save();

    // Seed meal configs
    const meals = [
      { mealType: 'day1_lunch',      label: 'Day 1 Lunch',      enabled: true, active: false },
      { mealType: 'snacks',          label: 'Snacks',            enabled: true, active: false },
      { mealType: 'dinner',          label: 'Dinner',            enabled: true, active: false },
      { mealType: 'midnight_snacks', label: 'Midnight Snacks',   enabled: true, active: false },
      { mealType: 'day2_breakfast',  label: 'Day 2 Breakfast',   enabled: true, active: false },
      { mealType: 'day2_lunch',      label: 'Day 2 Lunch',       enabled: true, active: false }
    ];

    for (const meal of meals) {
      await MealConfig.findOneAndUpdate(
        { mealType: meal.mealType },
        meal,
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      message: '✅ Seed complete! Admin user created & meal configs initialized.',
      admin: { username: 'admin', password: 'admin123', role: 'admin' },
      meals: meals.map(m => m.label)
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
