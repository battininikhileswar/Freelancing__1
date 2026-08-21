const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db, storage, auth;
let usesMockDb = false;

const initFirebase = () => {
  if (!admin.apps.length) {
    let serviceAccount;

    // Try to load from firebase-key.json file first
    const keyPath = path.join(__dirname, '../../firebase-key.json');
    if (fs.existsSync(keyPath)) {
      console.log('📁 Loading Firebase credentials from firebase-key.json');
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } else {
      console.log('🔑 Loading Firebase credentials from environment variables');
      
      // Load and process private key
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
        console.error('   Private key must start with "-----BEGIN PRIVATE KEY-----"');
        throw new Error('Firebase private key is not properly formatted. Check your .env file.');
      }

      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      };

      // Validate required fields
      const requiredFields = ['project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
      const missingFields = requiredFields.filter(field => !serviceAccount[field]);
      
      if (missingFields.length > 0) {
        console.error('❌ FIREBASE ERROR: Missing required environment variables');
        console.error('   Missing:', missingFields.join(', '));
        throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
      }
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });

      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error.message);
      throw error;
    }
  }

  db = admin.firestore();
  storage = admin.storage();
  auth = admin.auth();

  // Firestore settings
  db.settings({ ignoreUndefinedProperties: true });

  return { db, storage, auth };
};

const getDb = () => {
  // Return mock db if we're already using it
  if (usesMockDb) {
    return require('../services/mockDb');
  }
  
  if (!db) {
    try {
      initFirebase();
    } catch (error) {
      console.error('❌ Firestore initialization failed:', error.message);
      console.log('⚠️  Switching to mock database for testing...');
      usesMockDb = true;
      return require('../services/mockDb');
    }
  }
  return db;
};

// Function to force mock db
const forceMockDb = () => {
  usesMockDb = true;
  return require('../services/mockDb');
};

const getStorage = () => {
  if (!storage) {
    try {
      initFirebase();
    } catch (error) {
      console.error('❌ Storage initialization failed:', error.message);
      throw error;
    }
  }
  return storage;
};

const getAuth = () => {
  if (!auth) {
    try {
      initFirebase();
    } catch (error) {
      console.error('❌ Auth initialization failed:', error.message);
      throw error;
    }
  }
  return auth;
};

// ====== Firestore Collection References ======
const COLLECTIONS = {
  USERS: 'users',
  COMPLAINTS: 'complaints',
  AUTHORITIES: 'authorities',
  NOTIFICATIONS: 'notifications',
  JURISDICTIONS: 'jurisdictions',
  AUDIT_LOGS: 'audit_logs',
  ESCALATIONS: 'escalations',
};

// ====== Firestore Helpers ======
const serverTimestamp = () => {
  if (usesMockDb) {
    return new Date().toISOString();
  }
  try {
    return admin.firestore.FieldValue.serverTimestamp();
  } catch (error) {
    usesMockDb = true;
    return new Date().toISOString();
  }
};
const increment = (n) => {
  if (usesMockDb) return n;
  try {
    return admin.firestore.FieldValue.increment(n);
  } catch (error) {
    usesMockDb = true;
    return n;
  }
};
const arrayUnion = (...elements) => {
  if (usesMockDb) return elements;
  try {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  } catch (error) {
    usesMockDb = true;
    return elements;
  }
};
const deleteField = () => {
  if (usesMockDb) return null;
  return admin.firestore.FieldValue.delete();
};

// GeoPoint helper
const geoPoint = (lat, lng) => new admin.firestore.GeoPoint(lat, lng);

// Helper to update a document safely (works with Firestore and MockDB)
const updateDoc = async (docRef, updates) => {
  if (usesMockDb || !docRef.ref) {
    const db = require('../services/mockDb');
    // If it's a mock doc object from where().get()
    if (docRef.id && !docRef.collection) {
      // Find collection name from id (mock-db format: collection-timestamp-random)
      const collectionName = docRef.id.split('-')[0];
      return db.collection(collectionName).doc(docRef.id).update(updates);
    }
    // If it's a standard mock doc ref
    return docRef.update(updates);
  }
  return docRef.ref.update(updates);
};

module.exports = {
  initFirebase,
  getDb,
  forceMockDb,
  getStorage,
  getAuth,
  admin,
  COLLECTIONS,
  serverTimestamp,
  increment,
  arrayUnion,
  deleteField,
  geoPoint,
  updateDoc,
};
