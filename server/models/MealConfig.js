const mongoose = require('mongoose');

const mealConfigSchema = new mongoose.Schema({
  mealType: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: false   // only ONE meal should be active at a time
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MealConfig', mealConfigSchema);
