const express = require('express');
const MealConfig = require('../models/MealConfig');
const Participant = require('../models/Participant');
const Volunteer = require('../models/Volunteer');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// ───── GET /api/meals/config ─────
router.get('/config', auth, async (req, res) => {
  try {
    const meals = await MealConfig.find().sort('mealType');
    res.json(meals);
  } catch (error) {
    console.error('Get meal config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── PUT /api/meals/config ─────
router.put('/config', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { mealType, enabled, active } = req.body;

    if (!mealType) {
      return res.status(400).json({ error: 'mealType is required' });
    }

    const meal = await MealConfig.findOne({ mealType });
    if (!meal) {
      return res.status(404).json({ error: 'Meal type not found' });
    }

    if (active === true) {
      await MealConfig.updateMany({}, { active: false });
      meal.active = true;
    } else if (active === false) {
      meal.active = false;
    }

    if (typeof enabled === 'boolean') {
      meal.enabled = enabled;
      if (!enabled) meal.active = false;
    }

    await meal.save();

    const allMeals = await MealConfig.find().sort('mealType');
    res.json({ message: `${meal.label} updated`, meals: allMeals });
  } catch (error) {
    console.error('Update meal config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/meals/override ─────
// Body: { rfid, mealType, used: true/false }
router.post('/override', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { rfid, mealType, used } = req.body;

    if (!rfid || !mealType || typeof used !== 'boolean') {
      return res.status(400).json({ error: 'rfid, mealType, and used (boolean) are required' });
    }

    let person = await Participant.findOne({ rfid: rfid.trim() });
    let personType = 'participant';
    if (!person) {
      person = await Volunteer.findOne({ rfid: rfid.trim() });
      personType = 'volunteer';
    }
    if (!person) {
      return res.status(404).json({ error: 'RFID not found' });
    }

    person.meals[mealType] = { used, usedAt: used ? new Date() : null };
    person.markModified('meals');
    await person.save();

    res.json({
      message: `Meal ${mealType} override for ${person.name}: ${used ? 'USED' : 'RESET'}`,
      person: { id: person._id, rfid: person.rfid, name: person.name, type: personType },
      meal: person.meals[mealType]
    });
  } catch (error) {
    console.error('Meal override error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/meals/reset ─────
router.post('/reset', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { mealType } = req.body;

    if (!mealType) {
      return res.status(400).json({ error: 'mealType is required' });
    }

    const mealConfig = await MealConfig.findOne({ mealType });
    if (!mealConfig) {
      return res.status(404).json({ error: 'Invalid meal type' });
    }

    await Participant.updateMany({}, { $set: { [`meals.${mealType}`]: { used: false, usedAt: null } } });
    await Volunteer.updateMany({}, { $set: { [`meals.${mealType}`]: { used: false, usedAt: null } } });

    res.json({ message: `${mealConfig.label} has been reset for all participants and volunteers` });
  } catch (error) {
    console.error('Meal reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
