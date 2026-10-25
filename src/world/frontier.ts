// The persistent frontier: resolves sockets to districts, generating and committing new ones.
// A committed district is materialized in the save and registered for play; it is never
// regenerated. Generation runs in a worker; results from a previous world are discarded.
import { REGIONS } from '../content/ids.ts';
import { registerRegion, clearDynamicRegions } from '../content/registry.ts';
import type { GameData } from '../sim/gameData.ts';
import { generateDistrict, regionIdForSocket, toRegionDef, validateDistrict, type GenRequest, type GenResult, type SocketSpec } from './generator.ts';

/** Authored places where the hand-built world opens onto generated territory. */
export const AUTHORED_SOCKETS: Record<string, SocketSpec> = {
  street_storm_drain: { socketId: 'street_storm_drain', biome: 'storm_drains', entrySide: 'N', parentRegion: REGIONS.street, parentEntry: 'storm_drain', depth: 1 },
  service_south: { socketId: 'service_south', biome: 'service_veins', entrySide: 'N', parentRegion: REGIONS.service, parentEntry: 'south', depth: 1 },
  gallery_east: { socketId: 'gallery_east', biome: 'pump_works', entrySide: 'W', parentRegion: REGIONS.gallery, parentEntry: 'east', depth: 1 },
  gallery_south: { socketId: 'gallery_south', biome: 'storm_drains', entrySide: 'N', parentRegion: REGIONS.gallery, parentEntry: 'south', depth: 1 },
};

export const MANHOLES = ['a', 'b', 'c'];

export class Frontier {
  private worker: Worker | null = null;
  private jobSeq = 0;
  private epoch = 0;
  private pending = new Map<number, { epoch: number; resolve: (r: GenResult) => void; reject: (e: Error) => void }>();

  constructor() {
    try {
      this.worker = new Worker(new URL('../workers/generate.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<{ jobId: number; ok: boolean; res?: GenResult; error?: string }>) => {
        const job = this.pending.get(e.data.jobId);
        if (!job) return;
        this.pending.delete(e.data.jobId);
        if (job.epoch !== this.epoch) return job.reject(new Error('stale generation job discarded'));
        if (e.data.ok && e.data.res) job.resolve(e.data.res);
        else job.reject(new Error(e.data.error ?? 'generation failed'));
      };
      this.worker.onerror = () => {
        // fall back to main-thread generation if the worker cannot start
        this.worker = null;
        for (const [, j] of this.pending) j.reject(new Error('worker failed'));
        this.pending.clear();
      };
    } catch {
      this.worker = null;
    }
  }

  /** Called when a different world/slot becomes active: cancels in-flight jobs. */
  activate(data: GameData): void {
    this.epoch++;
    for (const [, j] of this.pending) j.reject(new Error('stale generation job discarded'));
    this.pending.clear();
    clearDynamicRegions();
    for (const rec of Object.values(data.world.generated)) registerRegion(toRegionDef(rec));
  }

  socketSpec(data: GameData, socketId: string): SocketSpec | null {
    if (AUTHORED_SOCKETS[socketId]) return AUTHORED_SOCKETS[socketId]!;
    for (const rec of Object.values(data.world.generated)) for (const s of rec.childSockets) if (s.socketId === socketId) return s;
    return null;
  }

  /** Resolve a socket to a committed region ID, generating and committing it if needed. */
  async resolve(data: GameData, socketId: string): Promise<string> {
    const existing = data.world.sockets[socketId];
    if (existing && data.world.generated[existing]) return existing;
    const spec = this.socketSpec(data, socketId);
    if (!spec) throw new Error(`Unknown frontier socket ${socketId}`);
    const req: GenRequest = {
      worldSeed: data.world.seed,
      socket: spec,
      ledger: {
        seenModules: data.world.seenModules,
        uniques: data.world.uniques,
        names: data.world.names,
        manholesFree: MANHOLES.filter((m) => !data.world.manholes[m]),
        districts: data.world.districts,
      },
    };
    const res = await this.run(req);
    // validate again on the main thread before committing: workers are trusted only as fast helpers
    const problems = validateDistrict(res.record);
    if (problems.length) throw new Error(`generated district failed validation: ${problems.join('; ')}`);
    this.commit(data, res);
    return res.record.id;
  }

  private commit(data: GameData, res: GenResult): void {
    const w = data.world;
    const rec = res.record;
    if (rec.id !== regionIdForSocket(w.seed, rec.socketId)) throw new Error('district id mismatch');
    w.generated[rec.id] = rec;
    w.sockets[rec.socketId] = rec.id;
    for (const m of res.reserved.modules) w.seenModules[m] = (w.seenModules[m] ?? 0) + 1;
    for (const u of res.reserved.uniques) if (!w.uniques.includes(u)) w.uniques.push(u);
    w.names.push(res.reserved.name);
    if (res.reserved.manhole) w.manholes[res.reserved.manhole] = rec.id;
    w.districts++;
    registerRegion(toRegionDef(rec));
  }

  private run(req: GenRequest): Promise<GenResult> {
    if (!this.worker) return Promise.resolve(generateDistrict(req));
    const jobId = ++this.jobSeq;
    const epoch = this.epoch;
    return new Promise<GenResult>((resolve, reject) => {
      this.pending.set(jobId, { epoch, resolve, reject });
      this.worker!.postMessage({ jobId, req: JSON.parse(JSON.stringify(req)) });
    }).catch((err: Error) => {
      if (err.message.includes('stale')) throw err;
      return generateDistrict(req); // worker trouble: generate here rather than blocking play
    });
  }
}
