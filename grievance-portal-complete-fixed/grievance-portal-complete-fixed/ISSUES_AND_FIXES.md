# 🔧 Grievance Portal - Issues & Fixes

## 📋 Problem Summary
**Registration is failing** with various validation and backend errors.

---

## 🐛 Issues Identified & Solutions

### **Issue #1: Phone Number Validation Problem**
**Severity:** 🔴 HIGH

**Problem:**
- Phone validation regex in `backend/src/middleware/validate.js` (line 27) is too strict
- Pattern: `/^[6-9]\d{9}$/` - This requires phone to start with 6-9 (valid for India)
- However, when phone is optional and empty string is sent, validation fails

**Location:** `backend/src/middleware/validate.js` (Line 25-28)

**Current Code:**
```javascript
body('phone')
  .optional({ values: 'falsy' })
  .matches(/^[6-9]\d{9}$/)
  .withMessage('Valid Indian mobile number required'),
```

**Fix:**
```javascript
body('phone')
  .optional({ checkFalsy: true })
  .if((value) => value && value.trim() !== '')
  .matches(/^[6-9]\d{9}$/)
  .withMessage('Valid Indian mobile number required (10 digits starting with 6-9)'),
```

---

### **Issue #2: Missing Error Handling in Registration Controller**
**Severity:** 🔴 HIGH

**Problem:**
- Validation errors are not being properly caught and formatted
- Firebase errors not properly formatted for frontend
- Error response structure inconsistent

**Location:** `backend/src/controllers/authController.js` (Lines 7-54)

**Current Issue:**
- When validation fails, errors array format doesn't match error handler output
- Firebase connection errors are thrown without proper error messages

**Fix - Updated Register Controller:**
```javascript
const register = asyncHandler(async (req, res) => {
  console.log('Registering user:', req.body);
  const { name, email, password, phone, state, district } = req.body;
  const db = getDb();

  try {
    // Check existing user
    const existingQuery = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    if (!existingQuery.empty) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please login.',
        errors: [{ field: 'email', message: 'This email is already in use' }]
      });
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, and number',
        errors: [{ field: 'password', message: 'Password requirements not met' }]
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: (phone && phone.trim()) || null,
      role: ROLES.CITIZEN,
      state: state.toLowerCase(),
      district: district.toLowerCase(),
      isActive: true,
      isVerified: false,
      complaintsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const userRef = await db.collection(COLLECTIONS.USERS).add(newUser);
    const token = generateToken(userRef.id, ROLES.CITIZEN);
    const refreshToken = generateRefreshToken(userRef.id);

    console.log('Registration successful for:', email);
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
          phone: newUser.phone 
        },
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    
    // Handle Firebase-specific errors
    if (error.code === 'PERMISSION_DENIED') {
      return res.status(403).json({
        success: false,
        message: 'Database permission denied. Please contact support.',
        errors: [{ field: 'database', message: 'Access denied' }]
      });
    }
    
    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      errors: [{ field: 'general', message: error.message || 'Unknown error' }]
    });
  }
});
```

---

### **Issue #3: Validation Middleware Not Properly Configured**
**Severity:** 🔴 HIGH

**Problem:**
- The validation middleware chains validators but doesn't properly handle the `validate` function
- The last item in array is the `validate` function which should run after all validators

**Location:** `backend/src/middleware/validate.js` (Lines 17-31)

**Current Code Issue:**
The validators array ends with `validate` function, which is correct, but the phone validation needs better handling.

**Fixed Version:**
```javascript
const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email address required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password must contain: uppercase letter, lowercase letter, and number'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (value && value !== '') {
        if (!/^[6-9]\d{9}$/.test(value)) {
          throw new Error('Valid 10-digit Indian mobile number required (starting with 6-9)');
        }
      }
      return true;
    }),
  
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Invalid state'),
  
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Invalid district'),
  
  validate, // This runs AFTER all validators and returns formatted errors
];
```

---

### **Issue #4: API Response Format Inconsistency**
**Severity:** 🟡 MEDIUM

**Problem:**
- Frontend expects `res.data.data.user` structure
- Backend sometimes returns different error structures
- Error handling in authStore needs to account for validation errors

**Location:** `frontend/src/store/authStore.js` (Lines 28-40)

**Enhanced Error Handling:**
```javascript
register: async (formData) => {
  set({ isLoading: true });
  try {
    const res = await api.post('/auth/register', formData);
    const { token, refreshToken, user } = res.data.data;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ user, token, refreshToken, isAuthenticated: true, isLoading: false });
    return { success: true, user };
  } catch (err) {
    set({ isLoading: false });
    
    // Enhance error with consistent structure
    const errorResponse = {
      ...err,
      validationErrors: err.response?.data?.errors || [],
      message: err.response?.data?.message || err.message || 'Registration failed'
    };
    
    throw errorResponse;
  }
},
```

---

### **Issue #5: Firebase Configuration - Private Key Format**
**Severity:** 🟡 MEDIUM

**Problem:**
- Private key in `.env` file has escaped newlines that might not be properly handled
- Could cause Firebase initialization to fail silently

**Location:** `backend/src/config/firebase.js` (Lines 17-21)

**Current Code:**
```javascript
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, '\n');
```

**Enhanced Fix:**
```javascript
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

// Remove surrounding quotes if present
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

// Handle both literal \n and actual newlines
privateKey = privateKey.replace(/\\n/g, '\n');

// Verify private key is properly formatted
if (!privateKey.includes('BEGIN PRIVATE KEY')) {
  console.error('❌ FIREBASE ERROR: Invalid private key format');
  throw new Error('Firebase private key is not properly formatted');
}
```

---

### **Issue #6: Frontend District Selection Logic**
**Severity:** 🟡 MEDIUM

**Problem:**
- Districts are case-sensitive in the DISTRICTS object (lowercase keys)
- Frontend lowercases state but districts remain as defined
- Mismatch can cause registration to fail

**Location:** `frontend/src/pages/auth/Register.jsx` (Lines 10-14, 23)

**Current Code:**
```javascript
const DISTRICTS = {
  'andhra pradesh': ['Guntur', 'Krishna', 'Visakhapatnam', ...],
  telangana: ['Hyderabad', 'Warangal', ...],
  maharashtra: ['Mumbai', 'Pune', ...],
};

const districts = DISTRICTS[form.state.toLowerCase()] || [];
```

**The issue:** When user selects "Andhra Pradesh", it's converted to lowercase but DISTRICTS key is 'andhra pradesh' with space.

**Fix:** Normalize state names:
```javascript
const normalizeStateName = (state) => {
  return state.toLowerCase().trim().replace(/\s+/g, ' ');
};

const districts = form.state ? DISTRICTS[normalizeStateName(form.state)] || [] : [];
```

---

### **Issue #7: Missing CORS Configuration for Requests**
**Severity:** 🟡 MEDIUM

**Problem:**
- If frontend and backend are on different origins, CORS might block requests
- Rate limiting on `/api/auth/register` might block legitimate requests

**Location:** `backend/src/app.js` (Lines 28-48)

**Current Configuration:**
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Issue:** Frontend .env has `VITE_API_URL=http://localhost:5000/api` but backend expects `http://localhost:5173` as CLIENT_URL

**Fix:** Update `.env`:
```bash
# backend/.env
CLIENT_URL=http://localhost:5173
```

---

### **Issue #8: Express Validator not properly validating array responses**
**Severity:** 🟡 MEDIUM

**Problem:**
- When validation fails, errors are returned as array but frontend tries to map over them
- Some error fields might be undefined

**Location:** `frontend/src/pages/auth/Register.jsx` (Lines 81-90)

**Current Error Handling:**
```javascript
if (err.response?.data?.errors) {
  errorMessage = err.response.data.errors.map(e => `${e.field}: ${e.message}`).join(', ');
}
```

**Enhanced Error Handling:**
```javascript
if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
  errorMessage = err.response.data.errors
    .map(e => `${e.field || 'Field'}: ${e.message || 'Invalid'}`)
    .join('\n');
} else if (err.response?.data?.message) {
  errorMessage = err.response.data.message;
}
```

---

### **Issue #9: Missing JWT Refresh Secret**
**Severity:** 🔴 HIGH

**Problem:**
- In `backend/.env`, `JWT_REFRESH_SECRET` is set to `your_refresh_secret_key`
- This is a placeholder and should be a real secure key

**Location:** `backend/.env` (Line 14)

**Current:**
```bash
JWT_REFRESH_SECRET=your_refresh_secret_key
```

**Fix:**
```bash
JWT_REFRESH_SECRET=a7f3k9m2n8p5q1r4s6t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8
```

---

### **Issue #10: Incomplete State/District Mapping**
**Severity:** 🟡 MEDIUM

**Problem:**
- Only 3 states are defined in frontend DISTRICTS object
- User trying to register from other states will fail
- INDIAN_STATES might have all states but DISTRICTS doesn't

**Location:** `frontend/src/pages/auth/Register.jsx` (Lines 10-14)

**Current:**
```javascript
const DISTRICTS = {
  'andhra pradesh': ['Guntur', 'Krishna', ...],
  telangana: ['Hyderabad', ...],
  maharashtra: ['Mumbai', ...],
};
```

**Fix:** Expand with all states or make district optional:
```javascript
const DISTRICTS = {
  'andhra pradesh': ['Guntur', 'Krishna', 'Visakhapatnam', 'East Godavari', 'West Godavari', 'Kurnool', 'Kadapa', 'Chittoor', 'Nellore', 'Srikakulam'],
  'telangana': ['Hyderabad', 'Warangal', 'Khammam', 'Karimnagar', 'Nizamabad', 'Rangareddy', 'Medak', 'Hyderabad'],
  'maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Akola'],
  'karnataka': ['Bangalore', 'Mysore', 'Belgaum', 'Mangalore', 'Hubli'],
  'tamil nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
  // Add more states...
};
```

Or mark district as optional with fallback:
```javascript
{districts.length > 0
  ? districts.map((d) => <option key={d} value={d.toLowerCase()}>{d}</option>)
  : <option value="other">Select District / Other</option>}
```

---

## 🔧 Quick Fix Implementation Steps

### Step 1: Fix Backend Validation
Apply the fixed `registerValidator` in `backend/src/middleware/validate.js`

### Step 2: Update Environment Variables
```bash
# backend/.env
JWT_REFRESH_SECRET=a7f3k9m2n8p5q1r4s6t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8
CLIENT_URL=http://localhost:5173
```

### Step 3: Fix Controller Error Handling
Update the register function in `backend/src/controllers/authController.js`

### Step 4: Update Frontend Error Handling
Enhance error handling in `frontend/src/pages/auth/Register.jsx` and `frontend/src/store/authStore.js`

### Step 5: Expand District Mapping
Add more states/districts to `frontend/src/pages/auth/Register.jsx`

### Step 6: Test Registration Flow
```bash
# Terminal 1: Start Backend
cd grievance-portal/backend
npm install
npm run dev

# Terminal 2: Start Frontend  
cd grievance-portal/frontend
npm install
npm run dev
```

---

## ✅ Testing Checklist

- [ ] Backend starts without Firebase errors
- [ ] Frontend connects to backend API (check Network tab)
- [ ] Registration form validates email format
- [ ] Registration form validates password strength
- [ ] Registration form accepts valid phone (optional)
- [ ] Registration form requires state selection
- [ ] Registration form requires district selection
- [ ] Submit button is disabled during loading
- [ ] Success message appears after registration
- [ ] User is redirected to dashboard after registration
- [ ] Error messages are displayed clearly for validation failures
- [ ] Duplicate email prevents registration
- [ ] All environment variables are set

---

## 📝 Additional Recommendations

1. **Add Loading States:** Disable form fields while submitting
2. **Add Email Verification:** Implement OTP verification before account activation
3. **Add Comprehensive Logging:** Log registration attempts for audit trail
4. **Implement Rate Limiting:** Already done but verify it's working
5. **Add Terms & Conditions:** Make it a required checkbox
6. **Add CAPTCHA:** Prevent bot registrations
7. **Sanitize All Inputs:** Already done but verify effectiveness

---

## 🆘 If Issues Persist

1. **Check Browser Console:** Look for network errors (Network tab)
2. **Check Backend Logs:** Look for validation or database errors
3. **Verify Firebase:** Ensure Firebase credentials are valid
4. **Check CORS:** Verify CLIENT_URL matches frontend origin
5. **Clear Cache:** Clear browser cache and restart servers
6. **Check Ports:** Ensure ports 5000 (backend) and 5173 (frontend) are available

