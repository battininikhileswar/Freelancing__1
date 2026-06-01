const { getDb, COLLECTIONS } = require('../config/firebase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ======= Get My Reputation =======
const getMyReputation = asyncHandler(async (req, res) => {
  const db = getDb();
  
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401);
  }

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.id).get();

  if (!userDoc.exists) {
    throw new AppError('User not found.', 404);
  }

  const data = userDoc.data();

  res.json({
    success: true,
    data: {
      reputationPoints: data.reputationPoints || 0,
      badges: data.badges || [],
      complaintsCount: data.complaintsCount || 0,
      name: data.name
    }
  });
});

// ======= Get City Leaderboard =======
const getLeaderboard = asyncHandler(async (req, res) => {
  const db = getDb();

  // Fetch all citizen users
  const snapshot = await db.collection(COLLECTIONS.USERS)
    .where('role', '==', 'citizen')
    .get();

  const leaderboard = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    leaderboard.push({
      id: doc.id,
      name: data.name,
      reputationPoints: data.reputationPoints || 0,
      badges: data.badges || [],
      complaintsCount: data.complaintsCount || 0
    });
  });

  // Sort by points desc, then by complaint count, then by name
  leaderboard.sort((a, b) => {
    if (b.reputationPoints !== a.reputationPoints) {
      return b.reputationPoints - a.reputationPoints;
    }
    return b.complaintsCount - a.complaintsCount;
  });

  // Return top 10 citizens
  res.json({
    success: true,
    data: leaderboard.slice(0, 10)
  });
});

module.exports = { getMyReputation, getLeaderboard };
