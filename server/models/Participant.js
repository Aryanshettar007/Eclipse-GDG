const mongoose = require('mongoose');

const mealSlotSchema = {
  used: { type: Boolean, default: false },
  usedAt: { type: Date, default: null }
};

const participantSchema = new mongoose.Schema({
  rfid: {
    type: String,
    unique: true,
    sparse: true,    // allows multiple null values (unmapped participants)
    trim: true,
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
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

// Index for fast RFID lookups during scanning
participantSchema.index({ rfid: 1 });

module.exports = mongoose.model('Participant', participantSchema);
