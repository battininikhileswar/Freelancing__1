const bcrypt = require('bcryptjs');
const { getDb, COLLECTIONS, serverTimestamp } = require('../config/firebase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { ROLES } = require('../middleware/auth');

// ======= Get All Users =======
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, state, page = 1, limit = 20 } = req.query;
  const db = getDb();

  let query = db.collection(COLLECTIONS.USERS);
  if (role) query = query.where('role', '==', role);
  if (state) query = query.where('state', '==', state.toLowerCase());

  query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
  const snapshot = await query.get();

  const users = snapshot.docs.map((doc) => {
    const data = doc.data();
    delete data.password;
    return { id: doc.id, ...data };
  });

  res.json({ success: true, data: { users, total: users.length } });
});

// ======= Create Authority Account =======
const createAuthority = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, authorityType, jurisdiction, authorityId, badgeNumber, department } = req.body;
  const db = getDb();

  const validRoles = [ROLES.PS_OFFICER, ROLES.ACB_OFFICER, ROLES.MUNICIPAL_OFFICER];
  if (!validRoles.includes(role)) throw new AppError('Invalid authority role.', 400);

  const existingQuery = await db.collection(COLLECTIONS.USERS).where('email', '==', email.toLowerCase()).limit(1).get();
  if (!existingQuery.empty) throw new AppError('Email already registered.', 400);

  const hashedPassword = await bcrypt.hash(password, 12);

  const authorityData = {
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    phone: phone || null,
    role,
    authorityType: authorityType || role.split('_')[0],
    authorityId: authorityId || null,
    jurisdiction: {
      state: jurisdiction?.state?.toLowerCase() || '',
      district: jurisdiction?.district?.toLowerCase() || '',
      districts: jurisdiction?.districts?.map((d) => d.toLowerCase()) || [],
    },
    badgeNumber: badgeNumber || null,
    department: department || null,
    isActive: true,
    isVerified: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: req.user.id,
  };

  const userRef = await db.collection(COLLECTIONS.USERS).add(authorityData);

  // Also create in authorities collection
  await db.collection(COLLECTIONS.AUTHORITIES).doc(authorityId || userRef.id).set({
    userId: userRef.id,
    name,
    email: email.toLowerCase(),
    phone: phone || null,
    type: authorityType || 'ps',
    jurisdiction: authorityData.jurisdiction,
    isActive: true,
    createdAt: serverTimestamp(),
  });

  res.status(201).json({ success: true, message: 'Authority account created successfully.', data: { id: userRef.id } });
});

// ======= Get All Complaints (Admin view) =======
const getAllComplaints = asyncHandler(async (req, res) => {
  const { status, category, state, authorityType, startDate, endDate, limit = 50, page = 1 } = req.query;
  const db = getDb();

  let query = db.collection(COLLECTIONS.COMPLAINTS);
  if (status) query = query.where('status', '==', status);
  if (category) query = query.where('category', '==', category);
  if (state) query = query.where('location.state', '==', state.toLowerCase());

  query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
  const snapshot = await query.get();

  const complaints = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Bubble emergency complaints to the very top dynamically
  complaints.sort((a, b) => {
    const aEmerg = a.isEmergency || a.severity === 'Emergency' ? 1 : 0;
    const bEmerg = b.isEmergency || b.severity === 'Emergency' ? 1 : 0;
    if (aEmerg !== bEmerg) {
      return bEmerg - aEmerg; // High priority emergencies first
    }
    const timeA = a.createdAt?._seconds || new Date(a.createdAt).getTime() || 0;
    const timeB = b.createdAt?._seconds || new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });

  res.json({ success: true, data: { complaints, total: complaints.length } });
});

// ======= Reassign Complaint =======
const reassignComplaint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newAuthorityId, reason } = req.body;
  const db = getDb();

  const complaintDoc = await db.collection(COLLECTIONS.COMPLAINTS).doc(id).get();
  if (!complaintDoc.exists) throw new AppError('Complaint not found.', 404);

  const authorityDoc = await db.collection(COLLECTIONS.AUTHORITIES).doc(newAuthorityId).get();
  if (!authorityDoc.exists) throw new AppError('Authority not found.', 404);

  const prevData = complaintDoc.data();
  await complaintDoc.ref.update({
    routing: {
      ...prevData.routing,
      authorityId: newAuthorityId,
      authorityName: authorityDoc.data().name,
      reassignedAt: serverTimestamp(),
      reassignedBy: req.user.id,
      reassignReason: reason,
      previousAuthorityId: prevData.routing?.authorityId,
    },
    updatedAt: serverTimestamp(),
    statusHistory: [
      ...(prevData.statusHistory || []),
      {
        status: prevData.status,
        remarks: `Complaint reassigned by admin. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        updatedBy: req.user.name,
        updatedByRole: 'super_admin',
      },
    ],
  });

  res.json({ success: true, message: 'Complaint reassigned successfully.' });
});

// ======= Toggle User Status =======
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(id).get();
  if (!userDoc.exists) throw new AppError('User not found.', 404);

  const currentStatus = userDoc.data().isActive;
  await userDoc.ref.update({ isActive: !currentStatus, updatedAt: serverTimestamp() });

  res.json({ success: true, message: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully.` });
});

// ======= Get All Authorities =======
const getAllAuthorities = asyncHandler(async (req, res) => {
  const { type, state } = req.query;
  const db = getDb();

  let query = db.collection(COLLECTIONS.AUTHORITIES);
  if (type) query = query.where('type', '==', type);
  if (state) query = query.where('jurisdiction.state', '==', state.toLowerCase());

  const snapshot = await query.get();
  const authorities = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  res.json({ success: true, data: authorities });
});

// ======= Get Full Analytics =======
const getFullAnalytics = asyncHandler(async (req, res) => {
  const db = getDb();

  const snapshot = await db.collection(COLLECTIONS.COMPLAINTS).get();
  const complaints = snapshot.docs.map((doc) => doc.data());

  const byStatus = {};
  const byCategory = {};
  const byState = {};
  const byMonth = {};

  complaints.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    byState[c.location?.state] = (byState[c.location?.state] || 0) + 1;

    const month = c.createdAt?.toDate
      ? c.createdAt.toDate().toISOString().substring(0, 7)
      : new Date().toISOString().substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      total: complaints.length,
      byStatus,
      byCategory,
      byState,
      byMonth: Object.entries(byMonth).sort().map(([month, count]) => ({ month, count })),
    },
  });
});

module.exports = { getAllUsers, createAuthority, getAllComplaints, reassignComplaint, toggleUserStatus, getAllAuthorities, getFullAnalytics };
