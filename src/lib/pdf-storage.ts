const DB_NAME = "tarjomaan";
const STORE = "files";
const KEY = "uploaded-pdf";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveUploadedPdf(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(
      { name: file.name, type: file.type, data: buf },
      KEY,
    );
  });
  db.close();
}

export async function loadUploadedPdf(): Promise<{
  name: string;
  data: ArrayBuffer;
} | null> {
  const db = await openDb();
  const result = await new Promise<{ name: string; data: ArrayBuffer } | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const value = req.result as
          | { name: string; data: ArrayBuffer }
          | undefined;
        resolve(value ?? null);
      };
      req.onerror = () => reject(req.error);
    },
  );
  db.close();
  return result;
}

export async function clearUploadedPdf(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(KEY);
  });
  db.close();
}
