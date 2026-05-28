"use client";

const DB_NAME = "hanzilens.pdf-assets.v1";
const STORE_NAME = "pdfs";
const DB_VERSION = 1;

type StoredPdfAsset = {
  id: string;
  data: ArrayBuffer;
  savedAt: string;
};

export async function savePdfAsset(id: string, data: ArrayBuffer) {
  const database = await openPdfDatabase();
  await runTransaction(database, "readwrite", (store) => {
    store.put({
      id,
      data,
      savedAt: new Date().toISOString(),
    } satisfies StoredPdfAsset);
  });
}

export async function loadPdfAsset(id: string) {
  const database = await openPdfDatabase();

  return new Promise<ArrayBuffer | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const asset = request.result as StoredPdfAsset | undefined;
      resolve(asset?.data ?? null);
    };
  });
}

export async function deletePdfAsset(id: string) {
  const database = await openPdfDatabase();
  await runTransaction(database, "readwrite", (store) => {
    store.delete(id);
  });
}

function openPdfDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB ist in diesem Browser nicht verfuegbar."));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

function runTransaction(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    operation(transaction.objectStore(STORE_NAME));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
