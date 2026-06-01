const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function testConnection() {
  console.log('🔍 Testing Firebase Connection...');
  
  const keyPath = path.join(__dirname, 'backend/firebase-key.json');
  if (!fs.existsSync(keyPath)) {
    console.error('❌ Error: firebase-key.json not found at ' + keyPath);
    return;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  console.log('Project ID:', serviceAccount.project_id);

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    console.log('⏳ Attempting to list collections...');
    
    const collections = await db.listCollections();
    console.log('✅ Success! Found ' + collections.length + ' collections.');
    
    if (collections.length === 0) {
      console.log('ℹ️  Note: Database is empty, but connection is working.');
    } else {
      collections.forEach(c => console.log(' - ' + c.id));
    }

  } catch (error) {
    console.error('❌ CONNECTION FAILED:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
      console.log('\n💡 SUGGESTION: This error usually means the "Cloud Firestore" database has not been created yet in the Firebase Console.');
      console.log('1. Go to: https://console.firebase.google.com/project/' + serviceAccount.project_id + '/firestore');
      console.log('2. Click "Create Database"');
      console.log('3. Choose "Native Mode" and follow the prompts.');
    }
  }
}

testConnection();
