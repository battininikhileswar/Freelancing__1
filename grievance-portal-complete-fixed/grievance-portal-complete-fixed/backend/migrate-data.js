const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function migrateData() {
  console.log('🚀 Starting Migration to Firebase Firestore...');
  
  const keyPath = path.join(__dirname, 'firebase-key.json');
  const dbPath = path.join(__dirname, '.mockdb.json');
  
  if (!fs.existsSync(keyPath)) {
    console.error('❌ Error: firebase-key.json not found');
    return;
  }
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Error: .mockdb.json not found');
    return;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const mockData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();

  for (const collectionName of Object.keys(mockData)) {
    const items = mockData[collectionName];
    const itemIds = Object.keys(items);
    
    if (itemIds.length === 0) {
      console.log(`ℹ️  Skipping empty collection: ${collectionName}`);
      continue;
    }

    console.log(`📦 Migrating ${itemIds.length} items to "${collectionName}"...`);
    
    const batch = db.batch();
    let count = 0;

    for (const id of itemIds) {
      const data = { ...items[id] };
      // Remove the id from the data object as it's used as the document ID
      delete data.id;
      
      const docRef = db.collection(collectionName).doc(id);
      batch.set(docRef, data);
      count++;

      // Firestore batches are limited to 500 operations
      if (count === 500) {
        await batch.commit();
        console.log(`✅ Committed intermediate batch of 500 for ${collectionName}`);
      }
    }

    await batch.commit();
    console.log(`✅ Successfully migrated "${collectionName}"`);
  }

  console.log('\n✨ MIGRATION COMPLETE! Check your Firebase Console at:');
  console.log(`https://console.firebase.google.com/project/${serviceAccount.project_id}/firestore`);
}

migrateData().catch(err => {
  console.error('❌ Migration Failed:', err);
});
