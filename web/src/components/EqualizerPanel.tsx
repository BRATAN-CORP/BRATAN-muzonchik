import { useEffect, useState } from 'react';
import {
  EQ_PRESET_NAMES,
  gainsForPreset,
  readCustomPreset,
  readEqEnabled,
  readSelectedPreset,
  writeCustomPreset,
  writeEqEnabled,
  writeSelectedPreset,
  type EqGains,
  type EqPresetName,
} from '@/lib/eq-presets';
import {
  EQ_FREQS,
  setAllGains,
  setBandGain,
  setEqEnabled as applyEqEnabled,
} from '@/lib/audio-graph';
import { cn } from '@/lib/cn';

// Visible 10-band EQ. The Web Audio wiring lives in lib/audio-graph.ts —
// here we only read/write gains and keep sliders in sync. Moving a
// slider immediately switches the active preset to "Custom". Native
// vertical range inputs give us a native-feel thumb with proper dB
// position, with a fixed gridline rail for scale reference.
export function EqualizerPanel({ className }: { className?: string }) {
  const [preset, setPreset] = useState<EqPresetName>(() => readSelectedPreset());
  const [enabled, setEnabledState] = useState<boolean>(() => readEqEnabled());
  const [gains, setGains] = useState<EqGains>(() => {
    const p = readSelectedPreset();
    return p === 'Custom' ? readCustomPreset() : gainsForPreset(p);
  });

  // Apply on mount — no-op if the graph isn't built yet; reapplied later.
  useEffect(() => {
    setAllGains(gains);
    applyEqEnabled(enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseBuiltIn = (name: EqPresetName) => {
    setPreset(name);
    writeSelectedPreset(name);
    const g = gainsForPreset(name);
    setGains(g);
    setAllGains(g);
  };

  const chooseCustom = () => {
    setPreset('Custom');
    writeSelectedPreset('Custom');
    const g = readCustomPreset();
    setGains(g);
    setAllGains(g);
  };

  const onSlide = (i: number, value: number) => {
    const clamped = Math.max(-12, Math.min(12, value));
    const next = gains.slice() as EqGains;
    next[i] = clamped;
    setGains(next);
    setBandGain(i, clamped);
    if (preset !== 'Custom') {
      setPreset('Custom');
      writeSelectedPreset('Custom');
    }
    writeCustomPreset(next);
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabledState(next);
    writeEqEnabled(next);
    applyEqEnabled(next);
  };

  const dbMarks = [12, 6, 0, -6, -12];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {EQ_PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => (name === 'Custom' ? chooseCustom() : chooseBuiltIn(name))}
              aria-pressed={preset === name}
              className={cn(
                'h-7 px-2.5 rounded-[8px] text-[11px] font-medium border transition-colors duration-150',
                preset === name
                  ? 'bg-accent text-accent-foreground border-[rgba(255,255,255,0.1)]'
                  : 'bg-transparent border-[rgba(255,255,255,0.1)] text-muted-foreground hover:text-foreground hover:border-[rgba(255,255,255,0.22)]',
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          className={cn(
            'h-7 px-3 rounded-[8px] text-[11px] font-medium border transition-colors duration-150',
            enabled
              ? 'bg-[rgba(60,130,255,0.12)] border-[rgba(60,130,255,0.3)] text-foreground'
              : 'bg-transparent border-[rgba(255,255,255,0.1)] text-muted-foreground hover:text-foreground',
          )}
        >
          {enabled ? 'EQ on' : 'EQ off'}
        </button>
      </div>

      {/* Grid with dB scale on the left and 10 bands on the right */}
      <div className="flex gap-3">
        <div className="flex flex-col justify-between py-2 text-[10px] tabular-nums text-muted-foreground h-48 shrink-0">
          {dbMarks.map((m) => (
            <div key={m} className="w-8 text-right leading-none">
              {m > 0 ? `+${m}` : m}{m === dbMarks[0] ? ' dB' : ''}
            </div>
          ))}
        </div>

        <div className="relative flex-1 h-48">
          {/* Zero-line indicator */}
          <div
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-[rgba(255,255,255,0.08)]"
            aria-hidden
          />
          <div className="relative z-10 grid grid-cols-10 gap-1 sm:gap-2 h-full">
            {EQ_FREQS.map((freq, i) => (
              <div key={freq} className="flex flex-col items-center gap-1.5">
                <div className="flex-1 flex items-center justify-center w-full">
                  <input
                    type="range"
                    className="eq-slider"
                    min={-12}
                    max={12}
                    step={1}
                    value={gains[i] ?? 0}
                    onChange={(e) => onSlide(i, Number(e.target.value))}
                    disabled={!enabled}
                    aria-label={`Полоса ${freq} Гц, усиление ${gains[i] ?? 0} dB`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Frequency labels */}
      <div className="flex gap-3">
        <div className="w-8 shrink-0" aria-hidden />
        <div className="flex-1 grid grid-cols-10 gap-1 sm:gap-2">
          {EQ_FREQS.map((freq, i) => (
            <div key={freq} className="flex flex-col items-center gap-0.5">
              <div className="text-[10px] leading-3 text-muted-foreground tabular-nums">
                {freq >= 1000 ? `${freq / 1000}k` : freq}
              </div>
              <div
                className={cn(
                  'text-[10px] leading-3 tabular-nums',
                  (gains[i] ?? 0) === 0 ? 'text-muted-foreground' : 'text-accent',
                )}
              >
                {(gains[i] ?? 0) > 0 ? `+${gains[i]}` : gains[i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
