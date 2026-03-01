const mongoose = require('mongoose');

const mealSlotSchema = {
  used: { type: Boolean, default: false },
  usedAt: { type: Date, default: null }
};

const volunteerSchema = new mongoose.Schema({
  rfid: {
    type: String,
    unique: true,
    sparse: true,    // allows multiple null values (unmapped volunteers)
    trim: true,
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['volunteer', 'mentor'],
    default: 'volunteer'
  },
  assignedTeamIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  isInside: {
    type: Boolean,
    default: false
  },
  lastScanAt: {
    type: Date,
    default: null
  },
  meals: {
    day1_lunch:      mealSlotSchema,
    snacks:          mealSlotSchema,
    dinner:          mealSlotSchema,
    midnight_snacks: mealSlotSchema,
    day2_breakfast:  mealSlotSchema,
    day2_lunch:      mealSlotSchema
  }
}, {
  timestamps: true
});

volunteerSchema.index({ rfid: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);
