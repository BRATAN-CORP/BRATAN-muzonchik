// 10-band EQ presets. Gains are in dB and map 1:1 to the biquad filters
// created in lib/audio-graph.ts. The user-defined "Custom" slot is held in
// localStorage so it survives reloads.

export const EQ_PRESET_NAMES = [
  'Flat',
  'Bass Boost',
  'Vocal',
  'Rock',
  'Electronic',
  'Jazz',
  'Classical',
  'Custom',
] as const;

export type EqPresetName = (typeof EQ_PRESET_NAMES)[number];

// 10 values, one per frequency band (32Hz → 16kHz).
export type EqGains = [
  number, number, number, number, number, number, number, number, number, number,
];

export const EQ_PRESETS: Record<Exclude<EqPresetName, 'Custom'>, EqGains> = {
  Flat:         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  Vocal:        [-2, -1, 0, 1, 2, 4, 3, 2, 1, 0],
  Rock:         [5, 3, 1, -1, -2, 0, 2, 4, 5, 5],
  Electronic:   [4, 3, 1, 0, -2, 2, 1, 2, 4, 5],
  Jazz:         [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  Classical:    [4, 3, 2, 0, 0, 0, -1, -1, 2, 3],
};

const LS_CUSTOM = 'bratan.eq.custom.v1';
const LS_SELECTED = 'bratan.eq.preset.v1';
const LS_ENABLED = 'bratan.eq.enabled.v1';

const FLAT: EqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export function readCustomPreset(): EqGains {
  try {
    const raw = localStorage.getItem(LS_CUSTOM);
    if (!raw) return [...FLAT] as EqGains;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 10 && parsed.every((n) => typeof n === 'number')) {
      return parsed as EqGains;
    }
  } catch {
    /* ignore */
  }
  return [...FLAT] as EqGains;
}

export function writeCustomPreset(gains: EqGains) {
  try {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(gains));
  } catch {
    /* ignore */
  }
}

export function readSelectedPreset(): EqPresetName {
  try {
    const raw = localStorage.getItem(LS_SELECTED);
    if (raw && (EQ_PRESET_NAMES as readonly string[]).includes(raw)) {
      return raw as EqPresetName;
    }
  } catch {
    /* ignore */
  }
  return 'Flat';
}

export function writeSelectedPreset(name: EqPresetName) {
  try {
    localStorage.setItem(LS_SELECTED, name);
  } catch {
    /* ignore */
  }
}

export function readEqEnabled(): boolean {
  try {
    const raw = localStorage.getItem(LS_ENABLED);
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return true;
}

export function writeEqEnabled(on: boolean) {
  try {
    localStorage.setItem(LS_ENABLED, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function gainsForPreset(name: EqPresetName): EqGains {
  if (name === 'Custom') return readCustomPreset();
  return [...EQ_PRESETS[name]] as EqGains;
}
