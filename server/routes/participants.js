const express = require('express');
const Participant = require('../models/Participant');
const Volunteer = require('../models/Volunteer');
const Team = require('../models/Team');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// ───── GET /api/participants ─────
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const participants = await Participant.find().populate('teamId', 'teamName');
    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/participants/unmapped ─────
// Get participants without RFID assigned (for RFID mapping page)
router.get('/unmapped', auth, roleCheck('admin'), async (req, res) => {
  try {
    const unmapped = await Participant.find({ rfid: null })
      .populate('teamId', 'teamName')
      .sort('name');
    res.json(unmapped);
  } catch (error) {
    console.error('Get unmapped error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/participants/search?q=query ─────
router.get('/search', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const regex = new RegExp(q, 'i');

    const participants = await Participant.find({
      $or: [
        { rfid: regex },
        { name: regex },
        { email: regex }
      ]
    }).populate('teamId', 'teamName');

    const volunteers = await Volunteer.find({
      $or: [
        { rfid: regex },
        { name: regex }
      ]
    });

    const teams = await Team.find({ teamName: regex });

    res.json({ participants, volunteers, teams });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/participants/export ─────
router.get('/export', auth, roleCheck('admin'), async (req, res) => {
  try {
    const participants = await Participant.find().populate('teamId', 'teamName').lean();

    const headers = ['RFID', 'Name', 'Email', 'Phone', 'Team', 'Inside',
      'Day1 Lunch', 'Snacks', 'Dinner', 'Midnight Snacks', 'Day2 Breakfast', 'Day2 Lunch'];

    const rows = participants.map(p => [
      p.rfid || 'UNMAPPED',
      p.name,
      p.email || '',
      p.phone || '',
      p.teamId ? p.teamId.teamName : '',
      p.isInside ? 'Yes' : 'No',
      p.meals?.day1_lunch?.used ? 'Yes' : 'No',
      p.meals?.snacks?.used ? 'Yes' : 'No',
      p.meals?.dinner?.used ? 'Yes' : 'No',
      p.meals?.midnight_snacks?.used ? 'Yes' : 'No',
      p.meals?.day2_breakfast?.used ? 'Yes' : 'No',
      p.meals?.day2_lunch?.used ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/participants ─────
router.post('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { rfid, name, email, phone, teamId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check duplicate RFID if provided
    if (rfid && rfid.trim()) {
      const existing = await Participant.findOne({ rfid: rfid.trim() });
      if (existing) {
        return res.status(409).json({ error: 'Participant with this RFID already exists' });
      }
      // Also check volunteers
      const existingVol = await Volunteer.findOne({ rfid: rfid.trim() });
      if (existingVol) {
        return res.status(409).json({ error: 'This RFID is already registered as a volunteer' });
      }
    }

    const participant = new Participant({
      rfid: rfid ? rfid.trim() : null,
      name: name.trim(),
      email: email || '',
      phone: phone || '',
      teamId: teamId || null
    });

    await participant.save();

    // If teamId provided, add to team's members
    if (teamId) {
      await Team.findByIdAndUpdate(teamId, {
        $addToSet: { members: participant._id }
      });
    }

    res.status(201).json(participant);
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── PUT /api/participants/:id ─────
router.put('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, teamId } = req.body;

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // If team changed, update old and new team's members
    if (teamId !== undefined && String(teamId) !== String(participant.teamId)) {
      if (participant.teamId) {
        await Team.findByIdAndUpdate(participant.teamId, {
          $pull: { members: participant._id }
        });
      }
      if (teamId) {
        await Team.findByIdAndUpdate(teamId, {
          $addToSet: { members: participant._id }
        });
      }
      participant.teamId = teamId || null;
    }

    if (name) participant.name = name.trim();
    if (email !== undefined) participant.email = email;
    if (phone !== undefined) participant.phone = phone;

    await participant.save();
    res.json(participant);
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── PUT /api/participants/:id/assign-rfid ─────
// Assign/map an RFID card to a participant
router.put('/:id/assign-rfid', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rfid } = req.body;

    if (!rfid || !rfid.trim()) {
      return res.status(400).json({ error: 'RFID is required' });
    }

    const rfidClean = rfid.trim();

    // Check if RFID already used
    const existingParticipant = await Participant.findOne({ rfid: rfidClean });
    if (existingParticipant) {
      return res.status(409).json({
        error: `This RFID is already assigned to ${existingParticipant.name}`,
        existingPerson: { id: existingParticipant._id, name: existingParticipant.name }
      });
    }

    const existingVolunteer = await Volunteer.findOne({ rfid: rfidClean });
    if (existingVolunteer) {
      return res.status(409).json({
        error: `This RFID is already assigned to volunteer ${existingVolunteer.name}`,
        existingPerson: { id: existingVolunteer._id, name: existingVolunteer.name }
      });
    }

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    participant.rfid = rfidClean;
    await participant.save();

    res.json({
      message: `RFID ${rfidClean} assigned to ${participant.name}`,
      participant
    });
  } catch (error) {
    console.error('Assign RFID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── DELETE /api/participants/:id ─────
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Remove from team
    if (participant.teamId) {
      await Team.findByIdAndUpdate(participant.teamId, {
        $pull: { members: participant._id }
      });
    }

    await Participant.findByIdAndDelete(id);
    res.json({ message: `Participant ${participant.name} deleted` });
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
