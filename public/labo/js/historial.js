const DB_NAME = 'eni-labo';
const DB_VERSION = 1;
const STORE = 'interacciones';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('createdAt', 'createdAt');
      store.createIndex('query', 'query');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(mode, operation) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let value;
    try { value = operation(store); } catch (error) { reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(value?.result ?? value); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}

export function addInteraction(record) {
  return transaction('readwrite', store => store.add({
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    evaluation: null,
    ...record,
  }));
}

export async function getInteraction(id) {
  return transaction('readonly', store => store.get(Number(id)));
}

export async function listInteractions() {
  const rows = await transaction('readonly', store => store.getAll());
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function patchInteraction(id, patch) {
  const row = await getInteraction(id);
  if (!row) throw new Error('No se encontró la consulta guardada.');
  return transaction('readwrite', store => store.put({ ...row, ...patch, updatedAt: new Date().toISOString() }));
}

export function deleteInteraction(id) {
  return transaction('readwrite', store => store.delete(Number(id)));
}

export function clearInteractions() {
  return transaction('readwrite', store => store.clear());
}

export async function exportInteractions(corpus) {
  return {
    format: 'eni-labo-history',
    version: 1,
    exportedAt: new Date().toISOString(),
    corpus: { version: corpus.version, contentHash: corpus.contentHash },
    interactions: await listInteractions(),
  };
}

export async function importInteractions(payload) {
  if (payload?.format !== 'eni-labo-history' || payload?.version !== 1 || !Array.isArray(payload.interactions)) {
    throw new Error('El archivo no es una exportación compatible del Labo.');
  }
  let imported = 0;
  for (const row of payload.interactions) {
    const { id, ...copy } = row;
    await transaction('readwrite', store => store.add({ ...copy, importedAt: new Date().toISOString(), importedFromId: id || null }));
    imported += 1;
  }
  return imported;
}
