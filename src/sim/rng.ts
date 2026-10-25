// Seeded, independent RNG streams (sfc32). A new decorative stream must never shift gameplay streams.
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  constructor(seed: string) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    const next = (): number => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
  }

  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }
}

export type StreamName = 'combat' | 'ai' | 'loot' | 'decoration' | 'audio';

export function streams(seed: string): Record<StreamName, Rng> {
  return {
    combat: new Rng(`${seed}:combat`),
    ai: new Rng(`${seed}:ai`),
    loot: new Rng(`${seed}:loot`),
    decoration: new Rng(`${seed}:decoration`),
    audio: new Rng(`${seed}:audio`),
  };
}
