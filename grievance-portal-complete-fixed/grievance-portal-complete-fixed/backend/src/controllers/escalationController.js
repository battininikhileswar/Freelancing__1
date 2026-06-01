// Append this to the adminRouter section in routes/index.js
// Manual escalation endpoint
const escalationHandler = async (req, res, next) => {
  try {
    const { manualEscalate, getEscalationStats } = require('../services/escalationService');
    const { asyncHandler } = require('../middleware/errorHandler');

    if (req.method === 'GET') {
      const stats = await getEscalationStats();
      return res.json({ success: true, data: stats });
    }

    const { complaintId, reason } = req.body;
    if (!complaintId || !reason) {
      return res.status(400).json({ success: false, message: 'complaintId and reason required' });
    }
    const id = await manualEscalate(complaintId, req.user.id, reason);
    res.json({ success: true, message: 'Complaint escalated.', data: { id } });
  } catch (err) {
    next(err);
  }
};

module.exports = { escalationHandler };
