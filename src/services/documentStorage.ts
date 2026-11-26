import { DocumentItem } from '../types';

const DB_NAME = 'leia_library_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este entorno.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllDocumentsFromDB(): Promise<DocumentItem[]> {
  try {
    const db = await openDatabase();

    // Check if there are legacy documents in localStorage to migrate
    let legacyDocs: DocumentItem[] = [];
    try {
      const rawLegacy = localStorage.getItem('leia_documents');
      if (rawLegacy) {
        legacyDocs = JSON.parse(rawLegacy);
        localStorage.removeItem('leia_documents');
      }
    } catch (e) {
      console.warn('No se pudo migrar documentos previos de localStorage:', e);
    }

    const existingDocs = await new Promise<DocumentItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (existingDocs.length === 0) {
      if (legacyDocs.length > 0) {
        await saveManyDocumentsToDB(legacyDocs);
        return legacyDocs;
      }
      return [];
    }

    // Ensure sample documents are present if user didn't delete them, or merge legacy custom docs
    if (legacyDocs.length > 0) {
      const existingIds = new Set(existingDocs.map((d) => d.id));
      const newOnes = legacyDocs.filter((d) => !existingIds.has(d.id));
      if (newOnes.length > 0) {
        await saveManyDocumentsToDB(newOnes);
        return [...newOnes, ...existingDocs];
      }
    }

    // Sort newest custom docs first, samples after
    return existingDocs.sort((a, b) => {
      if (a.sourceType !== 'sample' && b.sourceType === 'sample') return -1;
      if (a.sourceType === 'sample' && b.sourceType !== 'sample') return 1;
      return (b.dateAdded || '').localeCompare(a.dateAdded || '');
    });
  } catch (err) {
    console.warn('No se pudieron cargar los documentos locales:', err);
    return [];
  }
}

export async function saveDocumentToDB(doc: DocumentItem): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveManyDocumentsToDB(docs: DocumentItem[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const d of docs) {
      store.put(d);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteDocumentFromDB(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
