const express = require('express');
const Participant = require('../models/Participant');
const Volunteer = require('../models/Volunteer');
const ScanLog = require('../models/ScanLog');
const MealConfig = require('../models/MealConfig');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// ───── GET /api/analytics ─────
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const totalParticipants = await Participant.countDocuments();
    const totalVolunteers = await Volunteer.countDocuments();
    const participantsInside = await Participant.countDocuments({ isInside: true });
    const volunteersInside = await Volunteer.countDocuments({ isInside: true });
    const mappedParticipants = await Participant.countDocuments({ rfid: { $ne: null } });
    const mappedVolunteers = await Volunteer.countDocuments({ rfid: { $ne: null } });

    const mealConfigs = await MealConfig.find();
    const mealStats = await Promise.all(mealConfigs.map(async (meal) => {
      const participantServed = await Participant.countDocuments({ [`meals.${meal.mealType}.used`]: true });
      const volunteerServed = await Volunteer.countDocuments({ [`meals.${meal.mealType}.used`]: true });

      return {
        mealType: meal.mealType,
        label: meal.label,
        enabled: meal.enabled,
        active: meal.active,
        served: {
          participants: participantServed,
          volunteers: volunteerServed,
          total: participantServed + volunteerServed
        },
        totalEligible: totalParticipants + totalVolunteers,
        remaining: (totalParticipants + totalVolunteers) - (participantServed + volunteerServed)
      };
    }));

    res.json({
      participants: { total: totalParticipants, inside: participantsInside, mapped: mappedParticipants },
      volunteers: { total: totalVolunteers, inside: volunteersInside, mapped: mappedVolunteers },
      totalInside: participantsInside + volunteersInside,
      totalRegistered: totalParticipants + totalVolunteers,
      totalMapped: mappedParticipants + mappedVolunteers,
      meals: mealStats
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/analytics/feed ─────
router.get('/feed', auth, roleCheck('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const recentScans = await ScanLog.find().sort({ timestamp: -1 }).limit(limit).lean();

    const enriched = await Promise.all(recentScans.map(async (scan) => {
      let person = await Participant.findOne({ rfid: scan.rfid }, { name: 1 });
      let personType = 'participant';
      if (!person) {
        person = await Volunteer.findOne({ rfid: scan.rfid }, { name: 1 });
        personType = 'volunteer';
      }

      return {
        ...scan,
        personName: person ? person.name : 'Unknown',
        personType
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
