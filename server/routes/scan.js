const express = require('express');
const Participant = require('../models/Participant');
const Volunteer = require('../models/Volunteer');
const ScanLog = require('../models/ScanLog');
const MealConfig = require('../models/MealConfig');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// Helper: find person by RFID (checks participants then volunteers)
async function findPersonByRfid(rfid) {
  let person = await Participant.findOne({ rfid });
  if (person) return { person, personType: 'participant' };

  person = await Volunteer.findOne({ rfid });
  if (person) return { person, personType: 'volunteer' };

  return { person: null, personType: null };
}

// ───── POST /api/scan/entry ─────
// RFID entry/exit toggle
router.post('/entry', auth, roleCheck('admin', 'volunteer_entry'), async (req, res) => {
  try {
    const { rfid } = req.body;

    if (!rfid || !rfid.trim()) {
      return res.status(400).json({ error: 'RFID is required' });
    }

    const rfidClean = rfid.trim();
    const { person, personType } = await findPersonByRfid(rfidClean);

    if (!person) {
      return res.status(404).json({ error: 'Unknown RFID. Not registered.' });
    }

    // 5-second cooldown check
    if (person.lastScanAt) {
      const diffMs = Date.now() - new Date(person.lastScanAt).getTime();
      if (diffMs < 5000) {
        return res.status(429).json({
          error: 'Cooldown active. Please wait before scanning again.',
          remainingMs: 5000 - diffMs
        });
      }
    }

    // Toggle isInside
    const newStatus = !person.isInside;
    const action = newStatus ? 'entry' : 'exit';
    const now = new Date();

    person.isInside = newStatus;
    person.lastScanAt = now;
    await person.save();

    // Log the scan
    await ScanLog.create({
      rfid: rfidClean,
      action,
      personType,
      timestamp: now
    });

    // Get current inside count
    const participantInside = await Participant.countDocuments({ isInside: true });
    const volunteerInside = await Volunteer.countDocuments({ isInside: true });

    res.json({
      success: true,
      action,
      person: {
        id: person._id,
        rfid: person.rfid,
        name: person.name,
        type: personType,
        isInside: person.isInside
      },
      insideCount: {
        participants: participantInside,
        volunteers: volunteerInside,
        total: participantInside + volunteerInside
      },
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Entry scan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/scan/food ─────
// Mark food coupon for active meal
router.post('/food', auth, roleCheck('admin', 'volunteer_food'), async (req, res) => {
  try {
    const { rfid } = req.body;

    if (!rfid || !rfid.trim()) {
      return res.status(400).json({ error: 'RFID is required' });
    }

    const rfidClean = rfid.trim();

    // Get the currently active meal
    const activeMeal = await MealConfig.findOne({ active: true, enabled: true });
    if (!activeMeal) {
      return res.status(400).json({ error: 'No meal is currently active. Ask admin to set an active meal.' });
    }

    const mealType = activeMeal.mealType;
    const { person, personType } = await findPersonByRfid(rfidClean);

    if (!person) {
      return res.status(404).json({ error: 'Unknown RFID. Not registered.' });
    }

    // Check if meal already used
    if (person.meals[mealType] && person.meals[mealType].used) {
      return res.status(409).json({
        status: 'already_used',
        error: `${activeMeal.label} already used`,
        person: { id: person._id, rfid: person.rfid, name: person.name, type: personType },
        usedAt: person.meals[mealType].usedAt
      });
    }

    // Mark meal as used
    const now = new Date();
    person.meals[mealType] = { used: true, usedAt: now };
    person.markModified('meals');
    await person.save();

    // Log the scan
    await ScanLog.create({
      rfid: rfidClean,
      action: 'food',
      mealType,
      personType,
      timestamp: now
    });

    // Get served count for this meal
    const participantServed = await Participant.countDocuments({ [`meals.${mealType}.used`]: true });
    const volunteerServed = await Volunteer.countDocuments({ [`meals.${mealType}.used`]: true });

    res.json({
      success: true,
      status: 'allowed',
      meal: activeMeal.label,
      mealType,
      person: {
        id: person._id,
        rfid: person.rfid,
        name: person.name,
        type: personType
      },
      servedCount: {
        participants: participantServed,
        volunteers: volunteerServed,
        total: participantServed + volunteerServed
      },
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Food scan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
