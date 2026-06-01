const fs = require('fs');
const path = require('path');

// Simple in-memory + file-based database for testing
const DB_FILE = path.join(__dirname, '../../.mockdb.json');

class MockDatabase {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      }
    } catch (error) {
      console.log('Creating new mock database...');
    }
    return {
      users: {},
      complaints: {},
      escalations: {},
      authorities: {},
      notifications: {},
      jurisdictions: {},
      audit_logs: {},
    };
  }

  saveData() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
  }

  batch() {
    const operations = [];
    return {
      update: (docRef, data) => {
        operations.push({ type: 'update', docRef, data });
      },
      set: (docRef, data) => {
        operations.push({ type: 'set', docRef, data });
      },
      delete: (docRef) => {
        operations.push({ type: 'delete', docRef });
      },
      commit: async () => {
        for (const op of operations) {
          const { type, docRef, data } = op;
          const id = docRef.id;
          const collectionName = id.split('-')[0];
          
          if (!this.data[collectionName]) this.data[collectionName] = {};
          
          if (type === 'update') {
            this.data[collectionName][id] = { ...this.data[collectionName][id], ...data };
          } else if (type === 'set') {
            this.data[collectionName][id] = { ...data, id };
          } else if (type === 'delete') {
            delete this.data[collectionName][id];
          }
        }
        this.saveData();
      }
    };
  }

  // Collections simulation
  collection(name) {
    this.data = this.loadData();
    const self = this;
    
    const createQuery = (docs) => {
      let currentDocs = [...docs];

      const query = {
        where: (field, operator, value) => {
          const filtered = currentDocs.filter((doc) => {
            const docValue = field.split('.').reduce((obj, key) => obj?.[key], doc);
            if (operator === '==') return docValue === value;
            if (operator === '!=') return docValue !== value;
            if (operator === '>') return docValue > value;
            if (operator === '<') return docValue < value;
            if (operator === '>=') return docValue >= value;
            if (operator === '<=') return docValue <= value;
            if (operator === 'array-contains') return Array.isArray(docValue) && docValue.includes(value);
            return false;
          });
          return createQuery(filtered);
        },

        orderBy: (field, direction = 'asc') => {
          const sorted = [...currentDocs].sort((a, b) => {
            const valA = field.split('.').reduce((obj, key) => obj?.[key], a);
            const valB = field.split('.').reduce((obj, key) => obj?.[key], b);
            
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
          });
          return createQuery(sorted);
        },

        limit: (n) => {
          return createQuery(currentDocs.slice(0, n));
        },

        count: () => {
          return {
            get: async () => ({
              data: () => ({ count: currentDocs.length })
            })
          };
        },

        get: async () => {
          return {
            empty: currentDocs.length === 0,
            size: currentDocs.length,
            docs: currentDocs.map((doc) => ({
              data: () => doc,
              id: doc.id,
              ref: {
                update: async (data) => {
                  self.data[name][doc.id] = { ...self.data[name][doc.id], ...data };
                  self.saveData();
                  return {};
                },
                delete: async () => {
                  delete self.data[name][doc.id];
                  self.saveData();
                  return {};
                }
              }
            })),
          };
        }
      };
      return query;
    };

    const initialDocs = Object.values(this.data[name] || {});

    return {
      add: async (data) => {
        const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (!this.data[name]) {
          this.data[name] = {};
        }
        const docData = { ...data, id };
        this.data[name][id] = docData;
        this.saveData();
        
        // Return a docRef-like object
        return {
          id,
          update: async (updates) => {
            this.data[name][id] = { ...this.data[name][id], ...updates };
            this.saveData();
            return {};
          },
          get: async () => ({
            exists: true,
            data: () => this.data[name][id],
            id
          })
        };
      },
      
      doc: (id) => ({
        get: async () => {
          self.data = self.loadData();
          const doc = self.data[name]?.[id];
          return {
            exists: !!doc,
            data: () => doc || {},
            id: id,
          };
        },
        set: async (data) => {
          if (!this.data[name]) this.data[name] = {};
          this.data[name][id] = { ...data, id };
          this.saveData();
          return {};
        },
        update: async (data) => {
          if (!this.data[name]) this.data[name] = {};
          this.data[name][id] = { ...this.data[name][id], ...data };
          this.saveData();
          return {};
        },
        delete: async () => {
          if (this.data[name]) {
            delete this.data[name][id];
            this.saveData();
          }
          return {};
        }
      }),

      ...createQuery(initialDocs)
    };
  }
}

module.exports = new MockDatabase();
