const { getDb, COLLECTIONS, geoPoint } = require('../config/firebase');

/**
 * Routing Rules:
 * - crime → nearest Police Station (PS)
 * - corruption → ACB department for that district
 * - civic_issue → Municipal authority for that district
 */

const AUTHORITY_TYPE_MAP = {
  crime: 'ps',
  corruption: 'acb',
  civic_issue: 'municipal',
  fire: 'fire',
  hospital: 'hospital',
};

// Subcategory overrides
const SUBCATEGORY_OVERRIDES = {
  // Crime subcategories → always PS
  theft: 'ps',
  assault: 'ps',
  murder: 'ps',
  kidnapping: 'ps',
  cybercrime: 'ps',
  fraud: 'ps',
  harassment: 'ps',
  domestic_violence: 'ps',

  // Corruption subcategories → always ACB
  bribery: 'acb',
  embezzlement: 'acb',
  government_misconduct: 'acb',
  land_grabbing: 'acb',

  // Civic subcategories → municipal
  road_damage: 'municipal',
  pothole: 'municipal',
  potholes: 'municipal',
  water_supply: 'municipal',
  sewage: 'municipal',
  garbage: 'municipal',
  electricity: 'municipal',
  noise_pollution: 'municipal',

  // Fire subcategories
  fire_outbreak: 'fire',
  safety_hazard: 'fire',
  gas_leak: 'fire',
  other_fire: 'fire',

  // Hospital subcategories
  ambulance_delay: 'hospital',
  medical_negligence: 'hospital',
  hospital_infra: 'hospital',
  other_hospital: 'hospital',

  // Emergency subcategories
  emergency_fire: 'fire',
  emergency_flood: 'municipal',
  emergency_accident: 'ps',
  emergency_electrical: 'municipal',
};

/**
 * Route a complaint to the appropriate authority
 * @param {string} category - crime | corruption | civic_issue
 * @param {string} subcategory
 * @param {object} location - { lat, lng, state, district }
 * @returns {object} { authorityId, authorityType, authorityName }
 */
const routeComplaint = async (category, subcategory, location) => {
  const db = getDb();

  // Determine authority type: Prioritize category-level map (crime->ps, corruption->acb, civic_issue->municipal)
  const authorityType =
    AUTHORITY_TYPE_MAP[category] || SUBCATEGORY_OVERRIDES[subcategory?.toLowerCase()] || 'ps';

  try {
    // Find authority for the given district/state
    let query = db
      .collection(COLLECTIONS.AUTHORITIES)
      .where('type', '==', authorityType)
      .where('isActive', '==', true)
      .where('jurisdiction.state', '==', location.state.toLowerCase());

    if (location.district) {
      query = query.where('jurisdiction.district', '==', location.district.toLowerCase());
    }

    const snapshot = await query.limit(1).get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        authorityId: doc.id,
        authorityType,
        authorityName: doc.data().name,
        authorityEmail: doc.data().email,
        authorityPhone: doc.data().phone,
      };
    }

    // Fallback: find any authority of the same type in the state
    const fallbackSnapshot = await db
      .collection(COLLECTIONS.AUTHORITIES)
      .where('type', '==', authorityType)
      .where('isActive', '==', true)
      .where('jurisdiction.state', '==', location.state.toLowerCase())
      .limit(1)
      .get();

    if (!fallbackSnapshot.empty) {
      const doc = fallbackSnapshot.docs[0];
      return {
        authorityId: doc.id,
        authorityType,
        authorityName: doc.data().name,
        authorityEmail: doc.data().email,
        authorityPhone: doc.data().phone,
        isFallback: true,
      };
    }

    // Ultimate fallback: assign to super admin queue
    return {
      authorityId: 'unassigned',
      authorityType,
      authorityName: 'State Headquarters',
      isFallback: true,
      requiresManualAssignment: true,
    };
  } catch (error) {
    console.error('Routing engine error:', error);
    throw error;
  }
};

/**
 * Get nearest police stations using geospatial query
 * (Firestore doesn't natively support geo queries; use bounding box approximation)
 */
const getNearestAuthority = async (lat, lng, authorityType, radiusKm = 50) => {
  const db = getDb();

  // Approximate bounding box (1 degree ≈ 111km)
  const delta = radiusKm / 111;
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLng = lng - delta;
  const maxLng = lng + delta;

  const snapshot = await db
    .collection(COLLECTIONS.AUTHORITIES)
    .where('type', '==', authorityType)
    .where('isActive', '==', true)
    .where('location.lat', '>=', minLat)
    .where('location.lat', '<=', maxLat)
    .limit(5)
    .get();

  const authorities = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.location?.lng >= minLng && data.location?.lng <= maxLng) {
      const distance = calculateDistance(lat, lng, data.location.lat, data.location.lng);
      authorities.push({ id: doc.id, ...data, distance });
    }
  });

  return authorities.sort((a, b) => a.distance - b.distance);
};

// Haversine formula for distance calculation
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = { routeComplaint, getNearestAuthority, AUTHORITY_TYPE_MAP };
