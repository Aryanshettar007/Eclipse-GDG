const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Participant = require('../models/Participant');
const Volunteer = require('../models/Volunteer');
const Team = require('../models/Team');
const User = require('../models/User');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ───── POST /api/admin/import/participants ─────
// CSV format: name,email,phone,teamName
// (RFID is NOT in the CSV — it gets mapped later)
router.post('/import/participants', auth, roleCheck('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const results = [];
    const errors = [];

    const readable = Readable.from(req.file.buffer.toString());
    await new Promise((resolve, reject) => {
      readable
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let created = 0;
    let skipped = 0;

    for (const row of results) {
      try {
        const name = (row.name || row.Name || '').trim();

        if (!name) {
          errors.push(`Skipped row: missing name — ${JSON.stringify(row)}`);
          skipped++;
          continue;
        }

        // Find/create team if teamName provided
        let teamId = null;
        const teamName = (row.teamName || row.team || row.Team || row['Team Name'] || '').trim();
        if (teamName) {
          let team = await Team.findOne({ teamName });
          if (!team) {
            team = await Team.create({ teamName });
          }
          teamId = team._id;
        }

        const participant = await Participant.create({
          name,
          email: (row.email || row.Email || '').trim(),
          phone: (row.phone || row.Phone || '').trim(),
          teamId
        });

        // Add to team's members
        if (teamId) {
          await Team.findByIdAndUpdate(teamId, {
            $addToSet: { members: participant._id }
          });
        }

        created++;
      } catch (err) {
        errors.push(`Error on row ${JSON.stringify(row)}: ${err.message}`);
        skipped++;
      }
    }

    res.json({
      message: `Import complete: ${created} created, ${skipped} skipped`,
      created,
      skipped,
      total: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/admin/import/volunteers ─────
// CSV format: name,role
router.post('/import/volunteers', auth, roleCheck('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const results = [];
    const errors = [];

    const readable = Readable.from(req.file.buffer.toString());
    await new Promise((resolve, reject) => {
      readable
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let created = 0;
    let skipped = 0;

    for (const row of results) {
      try {
        const name = (row.name || row.Name || '').trim();
        if (!name) {
          errors.push(`Skipped row: missing name`);
          skipped++;
          continue;
        }

        await Volunteer.create({
          name,
          role: (row.role || row.Role || 'volunteer').trim().toLowerCase()
        });

        created++;
      } catch (err) {
        errors.push(`Error: ${err.message}`);
        skipped++;
      }
    }

    res.json({
      message: `Import complete: ${created} created, ${skipped} skipped`,
      created,
      skipped,
      total: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import volunteers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/admin/users ─────
router.post('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password, and role are required' });
    }

    if (!['admin', 'volunteer_entry', 'volunteer_food'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: admin, volunteer_entry, or volunteer_food' });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = new User({
      username: username.toLowerCase(),
      passwordHash: password,
      role
    });
    await user.save();

    res.status(201).json({
      message: `User ${username} created with role ${role}`,
      user: { username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/admin/users ─────
router.get('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── DELETE /api/admin/users/:id ─────
router.delete('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete the main admin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `User ${user.username} deleted` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
