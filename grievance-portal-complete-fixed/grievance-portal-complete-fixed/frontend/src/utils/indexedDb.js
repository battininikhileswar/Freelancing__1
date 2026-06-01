const DB_NAME = 'JanShaktiPwaDb';
const DB_VERSION = 1;
const STORE_NAME = 'offlineComplaints';

const initDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('❌ IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true });
        console.log('📦 Offline complaints ObjectStore created inside IndexedDB.');
      }
    };
  });
};

export const saveOfflineComplaint = async (complaint) => {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      const record = {
        ...complaint,
        savedAt: new Date().toISOString()
      };

      const request = objectStore.add(record);

      request.onsuccess = () => {
        console.log('💾 Complaint saved offline in IndexedDB:', record);
        resolve(true);
      };

      request.onerror = (event) => {
        console.error('❌ Failed to save complaint offline:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB saveOfflineComplaint error:', err);
    throw err;
  }
};

export const getOfflineComplaints = async () => {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB getOfflineComplaints error:', err);
    return [];
  }
};

export const clearOfflineComplaints = async () => {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('🧹 Offline IndexedDB cache cleared.');
        resolve(true);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB clearOfflineComplaints error:', err);
    throw err;
  }
};

export const deleteOfflineComplaint = async (localId) => {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(localId);

      request.onsuccess = () => {
        console.log(`🗑️ Successfully deleted offline complaint with localId: ${localId}`);
        resolve(true);
      };

      request.onerror = (event) => {
        console.error(`❌ Failed to delete offline complaint: ${localId}`, event.target.error);
        reject(event.target.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB deleteOfflineComplaint error:', err);
    throw err;
  }
};
