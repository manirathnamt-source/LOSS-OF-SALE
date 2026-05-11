const DB_NAME = 'dashFileCache';
const DB_VERSION = 1;
const STORE = 'workbooks';
const KEY = 'current';

function openDb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function saveWorkbook(parsed) {
  try {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ ts: Date.now(), parsed }, KEY);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

export async function loadWorkbook() {
  try {
    const db = await openDb();
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearWorkbook() {
  try {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* ignore */ }
}
