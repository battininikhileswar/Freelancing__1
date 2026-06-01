const bcrypt = require('bcryptjs');
const { getDb, COLLECTIONS, serverTimestamp, forceMockDb, updateDoc } = require('../config/firebase');
const { generateToken, generateRefreshToken, ROLES } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ======= Register =======
const register = asyncHandler(async (req, res) => {
  console.log('Registering user:', req.body);
  const { name, email, password, phone, state, district } = req.body;
  
  let db;
  try {
    db = getDb();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Database service temporarily unavailable. Please try again later.',
    });
  }

  try {
    // Check existing user
    let existingQuery;
    try {
      existingQuery = await db
        .collection(COLLECTIONS.USERS)
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();
    } catch (firestoreError) {
      console.error('❌ Firestore Query Error:', {
        code: firestoreError.code,
        message: firestoreError.message,
        details: firestoreError.details
      });
      // If Firestore API is disabled or unavailable, use mock db
      if (firestoreError.code === 7 || firestoreError.code === 5 || firestoreError.code === 3 ||
          firestoreError.message?.includes('PERMISSION_DENIED') ||
          firestoreError.message?.includes('NOT_FOUND') ||
          firestoreError.message?.includes('Firestore')) {
        console.log('⚠️  Firestore unavailable, switching to mock database...');
        db = forceMockDb(); // Use the new forceMockDb function
        existingQuery = await db
          .collection(COLLECTIONS.USERS)
          .where('email', '==', email.toLowerCase())
          .limit(1)
          .get();
      } else {
        throw firestoreError;
      }
    }

    if (!existingQuery.empty) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please login.',
        errors: [{ field: 'email', message: 'This email is already in use' }],
      });
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, and number',
        errors: [{ field: 'password', message: 'Password does not meet complexity requirements' }],
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Prepare user object
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone && phone.trim() ? phone.trim() : null,
      role: ROLES.CITIZEN,
      state: state.toLowerCase(),
      district: district.toLowerCase(),
      isActive: true,
      isVerified: false,
      complaintsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Add user to Firebase
    let userRef;
    try {
      userRef = await db.collection(COLLECTIONS.USERS).add(newUser);
    } catch (addError) {
      // If add also fails, try with mock db
      if (addError.code === 7 || addError.code === 5 || addError.code === 3 ||
          addError.message?.includes('PERMISSION_DENIED') ||
          addError.message?.includes('NOT_FOUND') ||
          addError.message?.includes('Firestore')) {
        console.log('⚠️  Add operation failed, using mock database...');
        db = forceMockDb();
        userRef = await db.collection(COLLECTIONS.USERS).add(newUser);
      } else {
        throw addError;
      }
    }
    
    const token = generateToken(userRef.id, ROLES.CITIZEN);
    const refreshToken = generateRefreshToken(userRef.id);

    console.log('✅ Registration successful for:', email);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        refreshToken,
        user: {
          id: userRef.id,
          name,
          email,
          role: ROLES.CITIZEN,
          state,
          district,
          phone: newUser.phone,
        },
      },
    });
  } catch (error) {
    console.error('❌ Registration Error:', error);

    // Handle Firebase-specific errors
    if (error.code === 'PERMISSION_DENIED') {
      return res.status(403).json({
        success: false,
        message: 'Database permission denied. Please contact support.',
        errors: [{ field: 'database', message: 'Access denied' }],
      });
    }

    if (error.code === 'UNAUTHENTICATED') {
      return res.status(401).json({
        success: false,
        message: 'Firebase authentication failed. Please try again later.',
        errors: [{ field: 'auth', message: 'Authentication error' }],
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      errors: [{ field: 'general', message: error.message || 'Unknown error occurred' }],
    });
  }
});

// ======= Login =======
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  const snapshot = await db
    .collection(COLLECTIONS.USERS)
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new AppError('Invalid email or password.', 401);
  }

  const userDoc = snapshot.docs[0];
  const user = userDoc.data();

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Contact support.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Update last login
  try {
    await updateDoc(userDoc, { lastLoginAt: serverTimestamp() });
  } catch (updateError) {
    console.warn('⚠️ Failed to update last login time:', updateError.message);
  }

  const token = generateToken(userDoc.id, user.role);
  const refreshToken = generateRefreshToken(userDoc.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      refreshToken,
      user: {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state,
        district: user.district,
        phone: user.phone,
        authorityType: user.authorityType,
        jurisdiction: user.jurisdiction,
      },
    },
  });
});

// ======= Get Profile =======
const getProfile = asyncHandler(async (req, res) => {
  const db = getDb();
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.id).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found.', 404);
  }

  const user = userDoc.data();
  delete user.password;

  res.json({ success: true, data: { id: userDoc.id, ...user } });
});

// ======= Update Profile =======
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, state, district } = req.body;
  const db = getDb();

  const updates = {};
  if (name) updates.name = name.trim();
  if (phone) updates.phone = phone.trim();
  if (state) updates.state = state.toLowerCase();
  if (district) updates.district = district.toLowerCase();
  updates.updatedAt = serverTimestamp();

  await db.collection(COLLECTIONS.USERS).doc(req.user.id).update(updates);
  res.json({ success: true, message: 'Profile updated successfully.' });
});

// ======= Change Password =======
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDb();

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.id).get();
  const user = userDoc.data();

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect.', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await updateDoc(userDoc, { password: hashedPassword, updatedAt: serverTimestamp() });

  res.json({ success: true, message: 'Password changed successfully.' });
});

// ======= Refresh Token =======
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    throw new AppError('Refresh token required.', 400);
  }

  const jwt = require('jsonwebtoken');
  
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const db = getDb();
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(decoded.userId).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found.', 404);
  }

  const user = userDoc.data();
  const newToken = generateToken(userDoc.id, user.role);

  res.json({ success: true, data: { token: newToken } });
});

// ======= Get Notifications =======
const getNotifications = asyncHandler(async (req, res) => {
  const db = getDb();
  let query = db.collection(COLLECTIONS.NOTIFICATIONS).where('userId', '==', req.user.id);

  let snapshot;
  try {
    snapshot = await query.orderBy('createdAt', 'desc').limit(20).get();
  } catch (error) {
    if (error.code === 9 || error.message?.includes('index')) {
      console.warn('⚠️ Firestore index missing, falling back to in-memory sorting for getNotifications');
      snapshot = await query.get();
      snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?._seconds || new Date(a.data().createdAt).getTime() || 0;
        const timeB = b.data().createdAt?._seconds || new Date(b.data().createdAt).getTime() || 0;
        return timeB - timeA;
      });
      snapshot.docs = snapshot.docs.slice(0, 20);
    } else {
      throw error;
    }
  }

  const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  res.json({ success: true, data: notifications });
});

// ======= Mark Notification Read =======
const markNotificationRead = asyncHandler(async (req, res) => {
  const db = getDb();
  await db.collection(COLLECTIONS.NOTIFICATIONS).doc(req.params.id).update({ isRead: true });
  res.json({ success: true, message: 'Notification marked as read.' });
});

// ======= Google Sign-In =======
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    throw new AppError('Google credentials ID Token is required.', 400);
  }

  // 1. Verify Google token against Google's API
  let payload;
  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!googleRes.ok) {
      const errTxt = await googleRes.text();
      console.error('❌ Google Tokeninfo API failed:', errTxt);
      throw new Error('Google token validation failed.');
    }
    payload = await googleRes.json();
  } catch (err) {
    console.error('❌ Google token verification error:', err.message);
    throw new AppError('Invalid Google authentication token.', 401);
  }

  const { email, name, picture, sub: googleId } = payload;
  if (!email) {
    throw new AppError('Google account does not expose email address.', 400);
  }

  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  // 2. Query USERS collection by email
  let snapshot = await db
    .collection(COLLECTIONS.USERS)
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  let userDoc;
  let user;

  if (snapshot.empty) {
    // 3. User does not exist, create automatically
    console.log(`👤 Creating new Google user: ${normalizedEmail}`);
    const newUser = {
      name: name ? name.trim() : 'Google User',
      email: normalizedEmail,
      googleId: googleId,
      profilePicture: picture || null,
      authProvider: 'google',
      role: ROLES.CITIZEN,
      phone: null,
      state: 'andhra pradesh',   // Default required fields
      district: 'guntur',
      isActive: true,
      isVerified: true,
      complaintsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };

    userDoc = await db.collection(COLLECTIONS.USERS).add(newUser);
    user = newUser;
  } else {
    // 4. User exists, check if active
    userDoc = snapshot.docs[0];
    user = userDoc.data();

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Contact support.', 401);
    }

    // Update last login & check auth provider
    const updates = { 
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (picture && !user.profilePicture) {
      updates.profilePicture = picture;
    }
    if (!user.authProvider) {
      updates.authProvider = 'google';
    }

    try {
      await db.collection(COLLECTIONS.USERS).doc(userDoc.id).update(updates);
      user = { ...user, ...updates };
    } catch (updateError) {
      console.warn('⚠️ Failed to update Google user metadata:', updateError.message);
    }
  }

  // 5. Generate Auth Tokens
  const token = generateToken(userDoc.id, user.role);
  const refreshToken = generateRefreshToken(userDoc.id);

  console.log(`✅ Google Sign-In successful for: ${normalizedEmail}`);

  res.status(200).json({
    success: true,
    message: 'Google login successful',
    data: {
      token,
      refreshToken,
      user: {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state,
        district: user.district,
        phone: user.phone,
        profilePicture: user.profilePicture || picture || null,
        authProvider: 'google',
        authorityType: user.authorityType,
        jurisdiction: user.jurisdiction,
      },
    },
  });
});

module.exports = {
  register,
  login,
  googleLogin,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  getNotifications,
  markNotificationRead,
};
