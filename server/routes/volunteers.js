const express = require('express');
const Volunteer = require('../models/Volunteer');
const Participant = require('../models/Participant');
const Team = require('../models/Team');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// ───── GET /api/volunteers ─────
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const volunteers = await Volunteer.find().populate('assignedTeamIds', 'teamName');
    res.json(volunteers);
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/volunteers/unmapped ─────
router.get('/unmapped', auth, roleCheck('admin'), async (req, res) => {
  try {
    const unmapped = await Volunteer.find({ rfid: null }).sort('name');
    res.json(unmapped);
  } catch (error) {
    console.error('Get unmapped volunteers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/volunteers ─────
router.post('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { rfid, name, role, assignedTeamIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check duplicate RFID if provided
    if (rfid && rfid.trim()) {
      const existing = await Volunteer.findOne({ rfid: rfid.trim() });
      if (existing) {
        return res.status(409).json({ error: 'Volunteer with this RFID already exists' });
      }
      const existingPart = await Participant.findOne({ rfid: rfid.trim() });
      if (existingPart) {
        return res.status(409).json({ error: 'This RFID is already registered as a participant' });
      }
    }

    const volunteer = new Volunteer({
      rfid: rfid ? rfid.trim() : null,
      name: name.trim(),
      role: role || 'volunteer',
      assignedTeamIds: assignedTeamIds || []
    });

    await volunteer.save();

    // If mentor, update team's mentorId
    if (role === 'mentor' && assignedTeamIds && assignedTeamIds.length > 0) {
      for (const teamId of assignedTeamIds) {
        await Team.findByIdAndUpdate(teamId, { mentorId: volunteer._id });
      }
    }

    res.status(201).json(volunteer);
  } catch (error) {
    console.error('Add volunteer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── PUT /api/volunteers/:id ─────
router.put('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, assignedTeamIds } = req.body;

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    if (name) volunteer.name = name.trim();
    if (role) volunteer.role = role;

    if (assignedTeamIds !== undefined) {
      // Remove mentor from old teams
      if (volunteer.role === 'mentor') {
        for (const oldTeamId of volunteer.assignedTeamIds) {
          await Team.findByIdAndUpdate(oldTeamId, { mentorId: null });
        }
      }

      volunteer.assignedTeamIds = assignedTeamIds;

      // Set mentor on new teams
      if (volunteer.role === 'mentor' || role === 'mentor') {
        for (const newTeamId of assignedTeamIds) {
          await Team.findByIdAndUpdate(newTeamId, { mentorId: volunteer._id });
        }
      }
    }

    await volunteer.save();
    res.json(volunteer);
  } catch (error) {
    console.error('Update volunteer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── PUT /api/volunteers/:id/assign-rfid ─────
router.put('/:id/assign-rfid', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rfid } = req.body;

    if (!rfid || !rfid.trim()) {
      return res.status(400).json({ error: 'RFID is required' });
    }

    const rfidClean = rfid.trim();

    // Check if RFID already used
    const existingVol = await Volunteer.findOne({ rfid: rfidClean });
    if (existingVol) {
      return res.status(409).json({
        error: `This RFID is already assigned to ${existingVol.name}`
      });
    }
    const existingPart = await Participant.findOne({ rfid: rfidClean });
    if (existingPart) {
      return res.status(409).json({
        error: `This RFID is already assigned to participant ${existingPart.name}`
      });
    }

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    volunteer.rfid = rfidClean;
    await volunteer.save();

    res.json({
      message: `RFID ${rfidClean} assigned to ${volunteer.name}`,
      volunteer
    });
  } catch (error) {
    console.error('Assign RFID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── DELETE /api/volunteers/:id ─────
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Remove mentor from teams
    if (volunteer.role === 'mentor') {
      for (const teamId of volunteer.assignedTeamIds) {
        await Team.findByIdAndUpdate(teamId, { mentorId: null });
      }
    }

    await Volunteer.findByIdAndDelete(id);
    res.json({ message: `Volunteer ${volunteer.name} deleted` });
  } catch (error) {
    console.error('Delete volunteer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
