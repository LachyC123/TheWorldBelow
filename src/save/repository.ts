// IndexedDB save slots with a rotating backup per slot. Writes are serialized; "Saved" is only
// reported after the transaction commits. Falls back to an in-memory store (clearly reported)
// when IndexedDB is unavailable, e.g. some private browsing modes.
import { validateEnvelope, type SaveEnvelope } from './envelope.ts';

export const SLOT_IDS = ['slot_1', 'slot_2', 'slot_3'] as const;
const DB_NAME = 'the-world-below';
const DB_VERSION = 1;

export interface SlotSummary {
  slotId: string;
  envelope: SaveEnvelope | null;
  error: string | null;
  hasBackup: boolean;
}

export class SaveRepository {
  private db: IDBDatabase | null = null;
  private memory = new Map<string, SaveEnvelope>();
  private memoryBackups = new Map<string, SaveEnvelope>();
  private queue: Promise<unknown> = Promise.resolve();
  persistent = false;
  available = false;

  async open(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('slots')) db.createObjectStore('slots', { keyPath: 'slotId' });
          if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups', { keyPath: 'slotId' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('Storage blocked by another tab'));
      });
      this.available = true;
    } catch {
      this.db = null;
    }
  }

  async requestPersistence(): Promise<boolean> {
    try {
      if (navigator.storage?.persisted && (await navigator.storage.persisted())) return (this.persistent = true);
      if (navigator.storage?.persist) this.persistent = await navigator.storage.persist();
    } catch {
      this.persistent = false;
    }
    return this.persistent;
  }

  async estimate(): Promise<{ usage: number; quota: number } | null> {
    try {
      const e = await navigator.storage?.estimate?.();
      return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
    } catch {
      return null;
    }
  }

  private req<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async rawGet(slotId: string, backup = false): Promise<unknown> {
    if (!this.db) return (backup ? this.memoryBackups : this.memory).get(slotId) ?? null;
    return (await this.req(backup ? 'backups' : 'slots', 'readonly', (s) => s.get(slotId))) ?? null;
  }

  /** Load a slot, falling back to its backup if the latest record fails validation. */
  async load(slotId: string): Promise<{ envelope: SaveEnvelope | null; error: string | null; fromBackup: boolean }> {
    const raw = await this.rawGet(slotId);
    if (!raw) return { envelope: null, error: null, fromBackup: false };
    const v = validateEnvelope(raw);
    if (v.ok) return { envelope: v.envelope, error: null, fromBackup: false };
    const b = await this.rawGet(slotId, true);
    if (b) {
      const vb = validateEnvelope(b);
      if (vb.ok) return { envelope: vb.envelope, error: `Latest save was damaged (${v.error}); restored the previous save.`, fromBackup: true };
    }
    return { envelope: null, error: v.error, fromBackup: false };
  }

  async list(): Promise<SlotSummary[]> {
    const out: SlotSummary[] = [];
    for (const id of SLOT_IDS) {
      const r = await this.load(id);
      const hasBackup = !!(await this.rawGet(id, true));
      out.push({ slotId: id, envelope: r.envelope, error: r.error, hasBackup });
    }
    return out;
  }

  /** Serialized atomic write: previous record becomes the backup in the same transaction. */
  save(env: SaveEnvelope): Promise<void> {
    const run = async (): Promise<void> => {
      if (!this.db) {
        const prev = this.memory.get(env.slotId);
        if (prev) this.memoryBackups.set(env.slotId, prev);
        this.memory.set(env.slotId, structuredClone(env));
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction(['slots', 'backups'], 'readwrite');
        const slots = tx.objectStore('slots');
        const backups = tx.objectStore('backups');
        const g = slots.get(env.slotId);
        g.onsuccess = () => {
          if (g.result) backups.put(g.result);
          slots.put(env);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Save transaction failed'));
        tx.onabort = () => reject(tx.error ?? new Error('Save transaction aborted'));
      });
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  async remove(slotId: string): Promise<void> {
    if (!this.db) {
      this.memory.delete(slotId);
      this.memoryBackups.delete(slotId);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(['slots', 'backups'], 'readwrite');
      tx.objectStore('slots').delete(slotId);
      tx.objectStore('backups').delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
