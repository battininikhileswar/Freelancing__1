const { getDb, COLLECTIONS } = require('../config/firebase');

/**
 * Award reputation points to a citizen and check for new badge unlocks
 * @param {string} userId - User ID to award reputation
 * @param {number} pointsEarned - Reputation Points (XP) earned
 * @returns {object} { reputationPoints, badges, newlyAwarded }
 */
const awardReputation = async (userId, pointsEarned) => {
  try {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn(`⚠️ User not found in database: ${userId}. Skipping reputation award.`);
      return null;
    }

    const userData = userDoc.data();
    
    // Auth role must be citizen to earn reputation points
    if (userData.role !== 'citizen') {
      return null;
    }

    const currentPoints = userData.reputationPoints || 0;
    const newPoints = currentPoints + pointsEarned;
    const complaintsCount = userData.complaintsCount || 0;

    const badges = userData.badges || [];
    const newBadges = [...badges];

    const addBadgeIfMissing = (badgeName) => {
      if (!newBadges.includes(badgeName)) {
        newBadges.push(badgeName);
        return true;
      }
      return false;
    };

    const newlyAwarded = [];

    // 1. First Reporter (1 or more complaints submitted)
    if (complaintsCount >= 1) {
      if (addBadgeIfMissing('First Reporter')) {
        newlyAwarded.push('First Reporter');
      }
    }

    // 2. Community Helper (3 or more complaints OR >= 50 XP)
    if (complaintsCount >= 3 || newPoints >= 50) {
      if (addBadgeIfMissing('Community Helper')) {
        newlyAwarded.push('Community Helper');
      }
    }

    // 3. Top Contributor (5 or more complaints OR >= 150 XP)
    if (complaintsCount >= 5 || newPoints >= 150) {
      if (addBadgeIfMissing('Top Contributor')) {
        newlyAwarded.push('Top Contributor');
      }
    }

    // 4. City Guardian (10 or more complaints OR >= 300 XP)
    if (complaintsCount >= 10 || newPoints >= 300) {
      if (addBadgeIfMissing('City Guardian')) {
        newlyAwarded.push('City Guardian');
      }
    }

    await userRef.update({
      reputationPoints: newPoints,
      badges: newBadges
    });

    console.log(`📡 [ReputationService] User ${userData.name} (+${pointsEarned} XP). Total: ${newPoints} XP. Badges: [${newBadges.join(', ')}].`);

    return {
      reputationPoints: newPoints,
      badges: newBadges,
      newlyAwarded
    };
  } catch (err) {
    console.error('❌ Error inside ReputationService.awardReputation:', err);
    throw err;
  }
};

module.exports = { awardReputation };
