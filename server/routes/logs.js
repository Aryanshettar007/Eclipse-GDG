const express = require('express');
const ScanLog = require('../models/ScanLog');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// ───── GET /api/logs ─────
// Full scan history with filters
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { rfid, action, personType, from, to, limit = 100, page = 1 } = req.query;

    const filter = {};

    if (rfid) filter.rfid = new RegExp(rfid, 'i');
    if (action) filter.action = action;
    if (personType) filter.personType = personType;

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ScanLog.countDocuments(filter);
    const logs = await ScanLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── GET /api/logs/export ─────
// Export logs as CSV
router.get('/export', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { action, from, to } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const logs = await ScanLog.find(filter).sort({ timestamp: -1 }).lean();

    const headers = ['RFID', 'Action', 'Meal Type', 'Person Type', 'Timestamp'];
    const rows = logs.map(log => [
      log.rfid,
      log.action,
      log.mealType || '',
      log.personType,
      new Date(log.timestamp).toISOString()
    ]);

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=scan_logs.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
