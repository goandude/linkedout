import type { LinkedInDataset, SavedQuery } from '../types/linkedin';

const DB_NAME = 'linkedout_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';
const DATASET_KEY = 'current_dataset';

const LS_SAVED_QUERIES = 'linkedout_saved_queries_v1';
const LS_SESSION_ONLY = 'linkedout_session_only_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDatasetToIndexedDB(dataset: LinkedInDataset): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataset, DATASET_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadDatasetFromIndexedDB(): Promise<LinkedInDataset | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(DATASET_KEY);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as LinkedInDataset | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

export async function clearAllLocalData(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // ignore if db doesn't exist
  }
  localStorage.removeItem(LS_SAVED_QUERIES);
  localStorage.removeItem(LS_SESSION_ONLY);
}

export function loadSavedQueries(): SavedQuery[] {
  try {
    const raw = localStorage.getItem(LS_SAVED_QUERIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedQueries(queries: SavedQuery[]): void {
  localStorage.setItem(LS_SAVED_QUERIES, JSON.stringify(queries));
}

export function getSessionOnlyMode(): boolean {
  return localStorage.getItem(LS_SESSION_ONLY) === 'true';
}

export function setSessionOnlyMode(enabled: boolean): void {
  localStorage.setItem(LS_SESSION_ONLY, enabled ? 'true' : 'false');
}
