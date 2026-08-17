// Thin promise-based wrapper around the native IndexedDB API. No external
// dependency is used so the build stays lightweight and dependency-free.

const DB_NAME = 'dicoding-stories-db';
const DB_VERSION = 1;

const STORE_SAVED = 'saved-stories';
const STORE_OUTBOX = 'outbox';

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_SAVED)) {
        const savedStore = db.createObjectStore(STORE_SAVED, { keyPath: 'id' });
        savedStore.createIndex('by-name', 'name', { unique: false });
        savedStore.createIndex('by-createdAt', 'createdAt', { unique: false });
        savedStore.createIndex('by-savedAt', 'savedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'localId', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });

  return dbPromise;
}

async function runTransaction(storeName, mode, executor) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;

    Promise.resolve(executor(store))
      .then((value) => {
        result = value;
      })
      .catch(reject);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Saved stories: user-facing CRUD (create/read/delete) -----------------

export async function saveStory(story) {
  const record = { ...story, savedAt: new Date().toISOString() };
  return runTransaction(STORE_SAVED, 'readwrite', (store) => requestToPromise(store.put(record)));
}

export async function getSavedStories() {
  return runTransaction(STORE_SAVED, 'readonly', (store) => requestToPromise(store.getAll()));
}

export async function getSavedStoryById(id) {
  return runTransaction(STORE_SAVED, 'readonly', (store) => requestToPromise(store.get(id)));
}

export async function isStorySaved(id) {
  const story = await getSavedStoryById(id);
  return !!story;
}

export async function deleteSavedStory(id) {
  return runTransaction(STORE_SAVED, 'readwrite', (store) => requestToPromise(store.delete(id)));
}

// --- Outbox: stories created while offline, synced once back online -------

export async function addToOutbox(entry) {
  const record = {
    ...entry,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  return runTransaction(STORE_OUTBOX, 'readwrite', (store) => requestToPromise(store.add(record)));
}

export async function getOutboxEntries() {
  return runTransaction(STORE_OUTBOX, 'readonly', (store) => requestToPromise(store.getAll()));
}

export async function updateOutboxEntry(localId, changes) {
  return runTransaction(STORE_OUTBOX, 'readwrite', async (store) => {
    const existing = await requestToPromise(store.get(localId));
    if (!existing) return null;
    const updated = { ...existing, ...changes };
    await requestToPromise(store.put(updated));
    return updated;
  });
}

export async function removeFromOutbox(localId) {
  return runTransaction(STORE_OUTBOX, 'readwrite', (store) => requestToPromise(store.delete(localId)));
}

export async function countOutboxEntries() {
  const entries = await getOutboxEntries();
  return entries.length;
}
