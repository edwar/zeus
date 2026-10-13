/**
 * Base local del teléfono (IndexedDB) para el modo campo: la última copia de los proyectos, la cola de operaciones sin enviar y las
 * fotos pendientes. Sin dependencias. Se vacía al cerrar sesión o si entra otra persona en el mismo teléfono.
 */
import { enqueue, type FieldProject, type Op } from "@/lib/field-sync";

/**
 * Tras cerrar sesión no se guarda nada más: una descarga o un envío que estaba a medias podría escribir justo después de borrar y dejar
 * datos de la persona anterior en el teléfono. El bloqueo dura hasta que la página se recarga (la página de inicio de sesión ya es otra).
 */
let locked = false;

const NAME = "zeus-field";
const VERSION = 1;

export type PendingPhoto = { id: string; projectId: string; checkKey: string | null; takenAt: string; blob: Blob; tries: number };
export type Snapshot = { userId: string; fetchedAt: string; projects: FieldProject[] };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("kv");
      db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
      db.createObjectStore("photos", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export const getSnapshot = () => run<Snapshot | undefined>("kv", "readonly", (s) => s.get("snapshot")) as Promise<Snapshot | undefined>;
export const setSnapshot = (v: Snapshot) => (locked ? Promise.resolve() : run("kv", "readwrite", (s) => s.put(v, "snapshot")).then(() => undefined));

/**
 * Guardar en la cola es leer-y-reescribir: si dos cambios llegan casi a la vez (marcar varios pasos seguidos), el segundo leería la cola
 * sin el primero y lo pisaría. Por eso todas las escrituras de la cola se hacen de a una, en orden.
 */
let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
};

type Row = { seq?: number; op: Op };
export async function getOutbox(): Promise<Op[]> {
  const rows = ((await run<Row[]>("outbox", "readonly", (s) => s.getAll())) ?? []) as Row[];
  return rows.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map((r) => r.op);
}
/** Guarda la nueva operación; si ya había una pendiente sobre lo mismo, la reemplaza (misma regla que `enqueue`). */
export const pushOp = (op: Op): Promise<Op[]> => serial(() => (locked ? Promise.resolve([] as Op[]) : pushOpNow(op)));
async function pushOpNow(op: Op): Promise<Op[]> {
  const next = enqueue(await getOutbox(), op);
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const s = tx.objectStore("outbox");
    s.clear();
    next.forEach((o) => s.add({ op: o }));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
  return next;
}
/** Quita de la cola las operaciones ya enviadas (por id). */
export const dropOps = (ids: string[]): Promise<void> => serial(() => (locked ? Promise.resolve() : dropOpsNow(ids)));
async function dropOpsNow(ids: string[]): Promise<void> {
  const keep = (await getOutbox()).filter((o) => !ids.includes(o.id));
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const s = tx.objectStore("outbox");
    s.clear();
    keep.forEach((o) => s.add({ op: o }));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export const putPhoto = (p: PendingPhoto) => (locked ? Promise.resolve() : run("photos", "readwrite", (s) => s.put(p)).then(() => undefined));
export const getPhotos = async () => (((await run<PendingPhoto[]>("photos", "readonly", (s) => s.getAll())) ?? []) as PendingPhoto[]).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
export const dropPhoto = (id: string) => (locked ? Promise.resolve() : run("photos", "readwrite", (s) => s.delete(id)).then(() => undefined));

/** Borra todo lo del modo campo en este teléfono: copia de proyectos, cola, fotos y cachés del service worker. */
export async function clearFieldData(lock = false): Promise<void> {
  // `lock`: al cerrar sesión no se guarda nada más. Al limpiar por cambio de persona, la nueva sí tiene que poder guardar.
  if (lock) locked = true;
  await queue.catch(() => undefined); // que termine lo que se estaba guardando antes de borrar
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(["kv", "outbox", "photos"], "readwrite");
      ["kv", "outbox", "photos"].forEach((n) => tx.objectStore(n).clear());
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch {
    /* sin IndexedDB: no hay nada que borrar */
  }
  try {
    for (const k of await caches.keys()) if (k.startsWith("zeus-")) await caches.delete(k);
    (await navigator.serviceWorker?.getRegistration())?.active?.postMessage({ type: "clear" });
  } catch {
    /* sin Cache API */
  }
}
