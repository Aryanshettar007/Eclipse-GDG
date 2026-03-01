const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer',
    default: null
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
