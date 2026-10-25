// Immutable domain events. Presentation (FX, audio, HUD) subscribes; it never awards items
// or decides deaths. Sequence numbers make exactly-once processing checkable in tests.
import type { WeaponId } from '../content/ids.ts';
import type { EnemyType, ItemId } from '../content/types.ts';

export type Material = 'wall' | 'metal' | 'flesh' | 'jelly' | 'armor' | 'water' | 'tin';

export type SimEvent =
  | { type: 'WeaponFired'; weaponId: WeaponId; x: number; y: number; angle: number }
  | { type: 'DryFire' }
  | { type: 'ReloadStarted'; weaponId: WeaponId }
  | { type: 'ReloadFinished'; weaponId: WeaponId }
  | { type: 'Impact'; x: number; y: number; angle: number; material: Material }
  | { type: 'DamageApplied'; target: string; amount: number; x: number; y: number; material: Material; source: string; fatal: boolean }
  | { type: 'PlayerHurt'; amount: number; source: string; angle: number }
  | { type: 'PlayerDied'; source: string }
  | { type: 'Dodged'; x: number; y: number; dx: number; dy: number }
  | { type: 'DodgeRejected' }
  | { type: 'HealStarted' }
  | { type: 'Healed'; amount: number }
  | { type: 'HealCancelled' }
  | { type: 'Footstep'; x: number; y: number; surface: 'hard' | 'wet' | 'wood' | 'metal' | 'gravel' }
  | { type: 'EnemyAlerted'; id: string; enemy: EnemyType; x: number; y: number }
  | { type: 'EnemyTelegraph'; id: string; enemy: EnemyType; attack: string; x: number; y: number; angle: number; duration: number }
  | { type: 'EnemyAttack'; id: string; enemy: EnemyType; attack: string; x: number; y: number; angle: number }
  | { type: 'EnemyDied'; id: string; enemy: EnemyType; x: number; y: number }
  | { type: 'LeechLatched'; id: string }
  | { type: 'LeechDetached'; id: string }
  | { type: 'LeechFled'; id: string }
  | { type: 'BossPhase'; id: string; phase: number }
  | { type: 'BossStunned'; id: string; x: number; y: number }
  | { type: 'VentTelegraph'; group: 'a' | 'b' }
  | { type: 'VentBurst'; x: number; y: number }
  | { type: 'PickedUp'; id: string; item: ItemId; amount: number; x: number; y: number; ref?: string }
  | { type: 'BoltFired'; x: number; y: number; angle: number }
  | { type: 'MaxHealthUp'; maxHp: number }
  | { type: 'TargetKnocked'; id: string; x: number; y: number }
  | { type: 'ActionRequested'; action: string; entityId: string }
  | { type: 'Locked'; textId: string }
  | { type: 'ExitRequested'; region: string; entry: string }
  | { type: 'WeaponSwapped'; weaponId: WeaponId }
  | { type: 'TorchToggled'; on: boolean }
  | { type: 'CacheRecovered' };

export type SequencedEvent = SimEvent & { seq: number };
