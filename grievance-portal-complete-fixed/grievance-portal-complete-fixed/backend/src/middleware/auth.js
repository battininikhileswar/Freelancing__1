const jwt = require('jsonwebtoken');
const { getDb, COLLECTIONS } = require('../config/firebase');

// ========= JWT Token Generation =========
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

// ========= Verify JWT Middleware =========
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const db = getDb();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(decoded.userId).get();

    if (!userDoc.exists) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const userData = userDoc.data();

    if (!userData.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      ...userData,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ========= RBAC Middleware =========
const ROLES = {
  CITIZEN: 'citizen',
  PS_OFFICER: 'ps_officer',
  ACB_OFFICER: 'acb_officer',
  MUNICIPAL_OFFICER: 'municipal_officer',
  FIRE_OFFICER: 'fire_officer',
  HOSPITAL_OFFICER: 'hospital_officer',
  SUPER_ADMIN: 'super_admin',
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

// ========= Optional Auth (for anonymous complaints) =========
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDb();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(decoded.userId).get();
      if (userDoc.exists) {
        req.user = { id: decoded.userId, role: decoded.role, ...userDoc.data() };
      }
    }
    next();
  } catch {
    next(); // Continue without auth
  }
};

module.exports = {
  verifyToken,
  authorize,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  ROLES,
};
