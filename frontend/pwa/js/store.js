// Estado global simple + persistencia en localStorage.
// Cache offline-first básico para viajes usando IndexedDB (estilo PouchDB local).

const KEY_AUTH = 'cv:auth';

function loadAuth() {
  try { return JSON.parse(localStorage.getItem(KEY_AUTH) || 'null'); } catch { return null; }
}

export const store = {
  auth: loadAuth(),
  setAuth(data) {
    this.auth = data;
    if (data) localStorage.setItem(KEY_AUTH, JSON.stringify(data));
    else localStorage.removeItem(KEY_AUTH);
  },
  logout() { this.setAuth(null); },
  get token() { return this.auth && this.auth.accessToken; },
  get user() { return this.auth && this.auth.user; },
  get roles() { return (this.user && this.user.roles) || []; },
};

// IndexedDB helpers para cache local de viajes (simula PouchDB).
const DB_NAME = 'compartoviaje';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('trips')) db.createObjectStore('trips', { keyPath: '_id' });
      if (!db.objectStoreNames.contains('bookings')) db.createObjectStore('bookings', { keyPath: '_id' });
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const localDb = {
  async putAll(storeName, docs) {
    const db = await openDb();
    const tx = db.transaction(storeName, 'readwrite');
    for (const d of docs) tx.objectStore(storeName).put(d);
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
  async getAll(storeName) {
    const db = await openDb();
    const tx = db.transaction(storeName, 'readonly');
    const os = tx.objectStore(storeName);
    return new Promise((res, rej) => {
      const req = os.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  },
  async enqueueOutbox(op) {
    const db = await openDb();
    const tx = db.transaction('outbox', 'readwrite');
    tx.objectStore('outbox').add({ ...op, queuedAt: Date.now() });
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
};
