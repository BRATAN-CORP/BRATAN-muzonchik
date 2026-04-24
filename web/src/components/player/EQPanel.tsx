import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { audioEngine } from '@/lib/audio-engine'
import { EQ_BANDS, EQ_PRESETS } from '@/types/media'
import { cn } from '@/lib/utils'

interface EQPanelProps {
  onClose: () => void
}

export function EQPanel({ onClose }: EQPanelProps) {
  const [gains, setGains] = useState<number[]>(() => audioEngine.getEQGains())
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(() => audioEngine.eqEnabled)

  useEffect(() => {
    audioEngine.setEQEnabled(enabled)
  }, [enabled])

  const handleBandChange = useCallback((index: number, value: number) => {
    audioEngine.setEQBand(index, value)
    setGains(audioEngine.getEQGains())
    setActivePreset(null)
  }, [])

  const applyPreset = useCallback((preset: typeof EQ_PRESETS[number]) => {
    audioEngine.setEQGains(preset.gains)
    setGains([...preset.gains])
    setActivePreset(preset.name)
    if (!enabled) setEnabled(true)
  }, [enabled])

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 bg-card border border-border rounded-2xl shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold">Equalizer</h3>
          <button
            className={cn(
              'relative w-9 h-5 rounded-full transition-colors',
              enabled ? 'bg-primary' : 'bg-secondary'
            )}
            onClick={() => setEnabled(!enabled)}
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle equalizer"
          >
            <span className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              enabled ? 'left-[18px]' : 'left-0.5'
            )} />
          </button>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close equalizer">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-4 py-3">
        <div className="flex gap-1 flex-wrap mb-3">
          {EQ_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                activePreset === preset.name
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-1 h-32">
          {EQ_BANDS.map((freq, i) => (
            <div key={freq} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={gains[i] || 0}
                  onChange={(e) => handleBandChange(i, Number(e.target.value))}
                  className="h-20 w-4"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                    WebkitAppearance: 'slider-vertical',
                  }}
                  aria-label={`${freq >= 1000 ? `${freq / 1000}k` : freq}Hz`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">
                {freq >= 1000 ? `${freq / 1000}k` : freq}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border">
        <Slider
          min={0}
          max={100}
          value={50}
          className="w-full"
          aria-label="Master gain"
          disabled
        />
      </div>
    </div>
  )
}
