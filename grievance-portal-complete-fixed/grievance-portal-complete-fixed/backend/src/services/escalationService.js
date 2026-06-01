const { getDb, COLLECTIONS, serverTimestamp } = require('../config/firebase');
const { logger } = require('../middleware/errorHandler');

/**
 * Escalation levels:
 *  0 = Not escalated
 *  1 = Level 1 — 72hr deadline missed → notify district supervisor
 *  2 = Level 2 — 48hr more → notify state authority
 *  3 = Level 3 — 24hr more → notify admin / national desk
 */

const ESCALATION_WINDOWS = {
  0: 72,  // hours before first escalation
  1: 48,  // hours before second escalation
  2: 24,  // hours before third escalation
};

const ESCALATION_REMARKS = {
  1: 'Auto-escalated: No action within 72 hours of assignment. Complaint flagged for supervisor review.',
  2: 'Auto-escalated (Level 2): No action within 48 hours of Level 1 escalation. Escalated to state authority.',
  3: 'Auto-escalated (Level 3): Complaint unresolved after maximum escalation window. Admin notified.',
};

/**
 * processEscalations — scan Firestore for overdue complaints and escalate them
 * Called by cron job in server.js
 */
const processEscalations = async (io) => {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    let snapshot;
    try {
      snapshot = await db
        .collection(COLLECTIONS.COMPLAINTS)
        .where('status', 'in', ['pending', 'under_review', 'investigating'])
        .where('escalationDue', '<=', now)
        .limit(100)
        .get();
    } catch (error) {
      if (error.code === 9 || error.message?.includes('index')) {
        logger.warn('⚠️ Firestore index missing for escalation processing. Falling back to in-memory filtering (may be inefficient). Please create a composite index for `status` and `escalationDue` fields.');
        // Fallback: Fetch all complaints with relevant statuses and filter in memory
        const statusSnapshot = await db
          .collection(COLLECTIONS.COMPLAINTS)
          .where('status', 'in', ['pending', 'under_review', 'investigating'])
          .get();

        const filteredDocs = statusSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.escalationDue && data.escalationDue <= now;
        });

        // Limit to 100 documents after in-memory filtering
        snapshot = { docs: filteredDocs.slice(0, 100), empty: filteredDocs.length === 0 };

      } else {
        throw error;
      }
    }

    if (snapshot.empty) return;

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentLevel = data.escalationLevel || 0;

      // Max escalation level
      if (currentLevel >= 3) continue;

      const nextLevel = currentLevel + 1;
      const nextWindowHours = ESCALATION_WINDOWS[nextLevel] || 24;
      const nextDue = new Date(Date.now() + nextWindowHours * 60 * 60 * 1000).toISOString();

      const statusEntry = {
        status: data.status,
        remarks: ESCALATION_REMARKS[nextLevel],
        timestamp: new Date().toISOString(),
        updatedBy: 'system',
        updatedByRole: 'system',
        isEscalation: true,
        escalationLevel: nextLevel,
      };

      batch.update(doc.ref, {
        isEscalated: true,
        escalationLevel: nextLevel,
        escalationDue: nextDue,
        updatedAt: serverTimestamp(),
        statusHistory: [...(data.statusHistory || []), statusEntry],
      });

      // Emit real-time alert to authority dashboard
      if (io && data.routing?.authorityId) {
        io.to(`authority_${data.routing.authorityId}`).emit('escalation_alert', {
          complaintId: data.complaintId,
          escalationLevel: nextLevel,
          message: ESCALATION_REMARKS[nextLevel],
          timestamp: new Date().toISOString(),
        });
      }

      count++;
    }

    if (count > 0) {
      await batch.commit();
      logger.info(`✅ Escalation cron: ${count} complaints escalated`);
    }

    return count;
  } catch (error) {
    logger.error('Escalation processing error:', error);
    throw error;
  }
};

/**
 * manualEscalate — Admin can manually escalate a specific complaint
 */
const manualEscalate = async (complaintId, adminUserId, reason) => {
  const db = getDb();

  const snapshot = await db
    .collection(COLLECTIONS.COMPLAINTS)
    .where('complaintId', '==', complaintId)
    .limit(1)
    .get();

  if (snapshot.empty) throw new Error('Complaint not found');

  const doc = snapshot.docs[0];
  const data = doc.data();

  const statusEntry = {
    status: data.status,
    remarks: `Manually escalated by administrator. Reason: ${reason}`,
    timestamp: new Date().toISOString(),
    updatedBy: adminUserId,
    updatedByRole: 'super_admin',
    isEscalation: true,
    isManual: true,
  };

  await doc.ref.update({
    isEscalated: true,
    escalationLevel: Math.min((data.escalationLevel || 0) + 1, 3),
    escalationDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: serverTimestamp(),
    statusHistory: [...(data.statusHistory || []), statusEntry],
  });

  return doc.id;
};

/**
 * getEscalationStats — for admin analytics
 */
const getEscalationStats = async () => {
  const db = getDb();

  const snapshot = await db
    .collection(COLLECTIONS.COMPLAINTS)
    .where('isEscalated', '==', true)
    .get();

  const stats = { total: 0, byLevel: { 1: 0, 2: 0, 3: 0 }, resolved: 0, pending: 0 };

  snapshot.forEach(doc => {
    const data = doc.data();
    stats.total++;
    stats.byLevel[data.escalationLevel] = (stats.byLevel[data.escalationLevel] || 0) + 1;
    if (data.status === 'closed') stats.resolved++;
    else stats.pending++;
  });

  return stats;
};

module.exports = { processEscalations, manualEscalate, getEscalationStats };
