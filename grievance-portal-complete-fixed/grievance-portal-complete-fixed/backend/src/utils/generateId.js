const { v4: uuidv4 } = require('uuid');

// Category prefix map
const CATEGORY_PREFIX = {
  crime: 'PS',
  corruption: 'ACB',
  civic_issue: 'MUN',
};

// State code map (Indian states)
const STATE_CODES = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  assam: 'AS',
  bihar: 'BR',
  chhattisgarh: 'CG',
  goa: 'GA',
  gujarat: 'GJ',
  haryana: 'HR',
  'himachal pradesh': 'HP',
  jharkhand: 'JH',
  karnataka: 'KA',
  kerala: 'KL',
  'madhya pradesh': 'MP',
  maharashtra: 'MH',
  manipur: 'MN',
  meghalaya: 'ML',
  mizoram: 'MZ',
  nagaland: 'NL',
  odisha: 'OD',
  punjab: 'PB',
  rajasthan: 'RJ',
  sikkim: 'SK',
  'tamil nadu': 'TN',
  telangana: 'TG',
  tripura: 'TR',
  'uttar pradesh': 'UP',
  uttarakhand: 'UK',
  'west bengal': 'WB',
  delhi: 'DL',
};

/**
 * Generates a unique complaint ID
 * Format: CATEGORY-STATECODE-YYYYMMDD-XXXXXX
 * Example: PS-AP-20240115-A3X9K2
 */
const generateComplaintId = (category, state) => {
  const prefix = CATEGORY_PREFIX[category] || 'GEN';
  const stateCode = STATE_CODES[state?.toLowerCase()] || 'XX';
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const randomPart = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
  return `${prefix}-${stateCode}-${dateStr}-${randomPart}`;
};

/**
 * Generate OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate secure token
 */
const generateSecureToken = () => {
  return uuidv4().replace(/-/g, '') + Date.now().toString(36);
};

module.exports = { generateComplaintId, generateOTP, generateSecureToken, STATE_CODES };
