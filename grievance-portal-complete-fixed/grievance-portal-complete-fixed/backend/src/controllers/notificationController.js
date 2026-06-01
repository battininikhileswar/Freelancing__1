// Add this to authController.js as a new export
// Mark all notifications read
const markAllNotificationsRead = async (req, res) => {
  const { asyncHandler } = require('../middleware/errorHandler');
  const { getDb, COLLECTIONS } = require('../config/firebase');
  const db = getDb();

  const snapshot = await db
    .collection(COLLECTIONS.NOTIFICATIONS)
    .where('userId', '==', req.user.id)
    .where('isRead', '==', false)
    .get();

  const batch = db.batch();
  snapshot.forEach(doc => {
    const docRef = doc.ref || { id: doc.id };
    batch.update(docRef, { isRead: true });
  });
  if (!snapshot.empty) await batch.commit();

  res.json({ success: true, message: `${snapshot.size} notifications marked as read.` });
};

module.exports = { markAllNotificationsRead };
