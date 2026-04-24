import { useEffect, useState } from 'react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
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
// slider immediately switches the active preset to "Custom".
export function EqualizerPanel({ className }: { className?: string }) {
  const [preset, setPreset] = useState<EqPresetName>(() => readSelectedPreset());
  const [enabled, setEnabledState] = useState<boolean>(() => readEqEnabled());
  const [gains, setGains] = useState<EqGains>(() => {
    const p = readSelectedPreset();
    return p === 'Custom' ? readCustomPreset() : gainsForPreset(p);
  });

  // Apply on mount in case the user hasn't touched audio yet — no-op when
  // the graph isn't built; we'll reapply once it is.
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
    const next = gains.slice() as EqGains;
    next[i] = value;
    setGains(next);
    setBandGain(i, value);
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

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {EQ_PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => (name === 'Custom' ? chooseCustom() : chooseBuiltIn(name))}
              aria-pressed={preset === name}
              className={cn(
                'h-8 px-3 rounded-full text-[12px] font-medium border transition-colors',
                preset === name
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-secondary',
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <Button variant={enabled ? 'secondary' : 'outline'} size="sm" onClick={toggleEnabled}>
          {enabled ? 'EQ включён' : 'EQ выключен'}
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-10 gap-2 sm:gap-3">
        {EQ_FREQS.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center gap-2">
            <div className="h-40 sm:h-52 flex items-center">
              <VerticalSlider
                value={gains[i] ?? 0}
                onChange={(v) => onSlide(i, v)}
                disabled={!enabled}
              />
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {freq >= 1000 ? `${freq / 1000}k` : freq}
            </div>
            <div className="text-[10px] text-foreground tabular-nums">
              {gains[i] > 0 ? `+${gains[i].toFixed(0)}` : gains[i].toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal Slider rotated 90° — gives a vertical dB slider without
// a separate primitive.
function VerticalSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="h-full w-5 flex items-center justify-center">
      <div className="h-full w-40 sm:w-52 -rotate-90 origin-center">
        <Slider
          value={value}
          min={-12}
          max={12}
          step={1}
          onChange={onChange}
          disabled={disabled}
          aria-label={`Усиление полосы, ${value > 0 ? '+' : ''}${value} dB`}
          aria-valuetext={`${value > 0 ? '+' : ''}${value} dB`}
          trackClassName="h-1.5"
          rangeClassName="bg-accent"
          thumbClassName="size-3.5 bg-foreground"
        />
      </div>
    </div>
  );
}
