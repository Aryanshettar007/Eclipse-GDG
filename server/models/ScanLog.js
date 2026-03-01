const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  rfid: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['entry', 'exit', 'food'],
    required: true
  },
  mealType: {
    type: String,
    default: null   // set only when action = 'food'
  },
  personType: {
    type: String,
    enum: ['participant', 'volunteer'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now  // full ISO datetime with timezone
  }
});

// Index for fast queries on recent scans
scanLogSchema.index({ timestamp: -1 });
scanLogSchema.index({ rfid: 1, timestamp: -1 });

module.exports = mongoose.model('ScanLog', scanLogSchema);
