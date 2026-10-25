// Small noncritical preferences (localStorage only; saves live in IndexedDB).
export interface Settings {
  aimAssist: boolean;
  leftHanded: boolean;
  controlScale: number;
  reducedFlash: boolean;
  reducedShake: boolean;
  reducedMotion: boolean;
  highContrastThreats: boolean;
  visualSoundCues: boolean;
  quality: 'low' | 'medium' | 'high';
  volMaster: number;
  volAmbience: number;
  volEffects: number;
  gentleDeath: boolean;
  textScale: number;
  showStats: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  aimAssist: true,
  leftHanded: false,
  controlScale: 1,
  reducedFlash: false,
  reducedShake: false,
  reducedMotion: false,
  highContrastThreats: false,
  visualSoundCues: true,
  quality: 'high',
  volMaster: 0.8,
  volAmbience: 0.7,
  volEffects: 0.9,
  gentleDeath: false,
  textScale: 1,
  showStats: false,
};

const KEY = 'twb.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, reducedMotion: matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const out: Settings = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) {
      if (typeof parsed[k] === typeof DEFAULT_SETTINGS[k]) (out as unknown as Record<string, unknown>)[k] = parsed[k];
    }
    return out;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable (private mode); settings remain for this session
  }
}

export const PARTICLE_BUDGET = { low: 120, medium: 240, high: 400 } as const;
export const DYNAMIC_LIGHT_BUDGET = { low: 3, medium: 5, high: 8 } as const;
