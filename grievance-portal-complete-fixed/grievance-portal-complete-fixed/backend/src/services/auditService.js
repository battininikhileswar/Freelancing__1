const { getDb, COLLECTIONS, serverTimestamp } = require('../config/firebase');

/**
 * AuditLog — record sensitive actions for compliance and forensic review
 *
 * Action types:
 *  - complaint.submitted
 *  - complaint.status_updated
 *  - complaint.reassigned
 *  - user.created
 *  - user.deactivated
 *  - user.login
 *  - authority.created
 *  - file.uploaded
 *  - escalation.triggered
 */

const createAuditLog = async ({
  action,
  actorId,
  actorRole,
  actorEmail,
  targetId,
  targetType,
  details = {},
  ipAddress = null,
}) => {
  const db = getDb();
  try {
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      action,
      actor: { id: actorId, role: actorRole, email: actorEmail },
      target: { id: targetId, type: targetType },
      details,
      ipAddress,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // Never throw — audit log failure should not break the main flow
    console.error('Audit log error:', error.message);
  }
};

/**
 * getAuditLogs — paginated query for admin review
 */
const getAuditLogs = async ({ limit = 50, targetId, actorId, action } = {}) => {
  const db = getDb();

  let query = db.collection(COLLECTIONS.AUDIT_LOGS).orderBy('createdAt', 'desc');

  if (targetId) query = query.where('target.id', '==', targetId);
  if (actorId) query = query.where('actor.id', '==', actorId);
  if (action) query = query.where('action', '==', action);

  query = query.limit(limit);
  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Audit middleware — attach to any route that needs logging
const auditMiddleware = (action, targetType) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (body.success) {
        createAuditLog({
          action,
          actorId: req.user?.id,
          actorRole: req.user?.role,
          actorEmail: req.user?.email,
          targetId: req.params?.id || body.data?.id,
          targetType,
          details: { method: req.method, path: req.path, body: req.body },
          ipAddress: req.ip,
        });
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { createAuditLog, getAuditLogs, auditMiddleware };
