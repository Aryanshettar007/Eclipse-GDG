const express = require('express');
const Team = require('../models/Team');
const Participant = require('../models/Participant');
const Volunteer = require('../models/Volunteer');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// ───── GET /api/teams ─────
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('members', 'name rfid isInside')
      .populate('mentorId', 'name rfid isInside');

    // Enrich with check-in count
    const enrichedTeams = teams.map(team => {
      const teamObj = team.toObject();
      teamObj.checkedInCount = teamObj.members.filter(m => m.isInside).length;
      teamObj.totalMembers = teamObj.members.length;
      teamObj.mentor = teamObj.mentorId;  // rename for clarity
      delete teamObj.mentorId;
      return teamObj;
    });

    res.json(enrichedTeams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── POST /api/teams ─────
router.post('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { teamName, mentorId, memberIds } = req.body;

    if (!teamName) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = new Team({
      teamName: teamName.trim(),
      mentorId: mentorId || null,
      members: memberIds || []
    });

    await team.save();

    // Update participants' teamId
    if (memberIds && memberIds.length > 0) {
      await Participant.updateMany(
        { _id: { $in: memberIds } },
        { teamId: team._id }
      );
    }

    // Update mentor's assignedTeamIds
    if (mentorId) {
      await Volunteer.findByIdAndUpdate(mentorId, {
        $addToSet: { assignedTeamIds: team._id }
      });
    }

    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── PUT /api/teams/:id ─────
router.put('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, mentorId, memberIds } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (teamName) team.teamName = teamName.trim();

    // Update mentor
    if (mentorId !== undefined && String(mentorId) !== String(team.mentorId)) {
      if (team.mentorId) {
        await Volunteer.findByIdAndUpdate(team.mentorId, {
          $pull: { assignedTeamIds: team._id }
        });
      }
      if (mentorId) {
        await Volunteer.findByIdAndUpdate(mentorId, {
          $addToSet: { assignedTeamIds: team._id }
        });
      }
      team.mentorId = mentorId || null;
    }

    // Update members
    if (memberIds !== undefined) {
      const oldMemberIds = team.members.map(m => String(m));
      const newMemberIds = memberIds.map(m => String(m));

      const removedMembers = oldMemberIds.filter(r => !newMemberIds.includes(r));
      if (removedMembers.length > 0) {
        await Participant.updateMany(
          { _id: { $in: removedMembers } },
          { teamId: null }
        );
      }

      const addedMembers = newMemberIds.filter(r => !oldMemberIds.includes(r));
      if (addedMembers.length > 0) {
        await Participant.updateMany(
          { _id: { $in: addedMembers } },
          { teamId: team._id }
        );
      }

      team.members = memberIds;
    }

    await team.save();
    res.json(team);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── DELETE /api/teams/:id ─────
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Clear participants' teamId
    await Participant.updateMany(
      { _id: { $in: team.members } },
      { teamId: null }
    );

    // Clear mentor's assignedTeamIds
    if (team.mentorId) {
      await Volunteer.findByIdAndUpdate(team.mentorId, {
        $pull: { assignedTeamIds: team._id }
      });
    }

    await Team.findByIdAndDelete(id);
    res.json({ message: `Team ${team.teamName} deleted` });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
