/** Proposed contracts, not an engine implementation. Units are explicit. */
export type StableId = string;
export type WorldPixels = number;
export type Milliseconds = number;
export type RegionId = string;
export interface Point { x: WorldPixels; y: WorldPixels }
export interface ContentVersion { registry: number; generator: number; saveSchema: number }
export interface RegionManifest {
  id: RegionId;
  worldId: StableId;
  seed: string;
  versions: ContentVersion;
  biomeId: StableId;
  modules: Array<{ instanceId: StableId; definitionId: StableId; origin: Point; rotation: 0 | 90 | 180 | 270 }>;
  connections: Array<{ id: StableId; targetRegionId: RegionId; socketId: StableId; gateId?: StableId }>;
  reservedUniqueIds: StableId[];
  materializedGeometryRef: StableId;
}
export interface RegionDelta {
  regionId: RegionId;
  revision: number;
  doors: Record<StableId, 'closed' | 'open' | 'locked'>;
  switches: Record<StableId, boolean>;
  defeatedUniqueEntities: StableId[];
  collectedUniqueRewards: StableId[];
  persistentEntities: Array<{ instanceId: StableId; definitionId: StableId; position: Point; hp: number }>;
}
export type Condition =
  | { type: 'flag'; id: StableId; value: boolean }
  | { type: 'hasCapability'; id: StableId }
  | { type: 'all'; conditions: Condition[] }
  | { type: 'any'; conditions: Condition[] };
export interface SecretDefinition {
  id: StableId;
  uniquePerWorld: boolean;
  eligibleBiomes: StableId[];
  clueIds: StableId[];
  entry: Condition;
  rewardIds: StableId[];
  resolvedFlag: StableId;
  recoveryPolicyId: StableId;
}
export interface WeaponDefinition {
  id: StableId;
  ammoPool: StableId;
  magazine: number;
  damagePerProjectile: number;
  projectilesPerShot: number;
  cadenceMs: Milliseconds;
  reloadMs: Milliseconds;
  maxRangePx: WorldPixels;
  flashPeakMs: Milliseconds;
  flashDecayMs: Milliseconds;
  flashRadiusPx: WorldPixels;
  spriteId: StableId;
  shotCueId: StableId;
}
export type DomainEvent =
  | { type: 'WeaponFired'; eventId: StableId; actorId: StableId; weaponId: StableId; muzzle: Point; angleRadians: number }
  | { type: 'DamageApplied'; eventId: StableId; targetId: StableId; amount: number; position: Point; materialId: StableId }
  | { type: 'DiscoveryResolved'; eventId: StableId; discoveryId: StableId; regionId: RegionId }
  | { type: 'SaveCommitted'; revision: number; slotId: StableId };
export interface GenerationRequest {
  jobId: StableId; worldId: StableId; regionId: RegionId;
  seed: string; versions: ContentVersion; parentSocketId: StableId;
  permittedModuleIds: StableId[]; reservedUniqueIds: StableId[];
}
// Validate all external data. Branded types, runtime schemas and ID registries
// should be added during implementation; TypeScript alone cannot validate imports.
