import { Lock, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { usePlayer } from '@/hooks/player-context'
import { freePlaysLeft } from '@/lib/store'

const TG_BOT_USERNAME = 'bratan_muzonchik_bot'
const PAYWALL_TG_URL = `https://t.me/${TG_BOT_USERNAME}?start=pay`

const FEATURES = [
  'Unlimited tracks',
  'Lossless FLAC 16/44.1 (Tidal)',
  'Download to device',
]

export function PaywallModal() {
  const { showPaywall, setShowPaywall } = usePlayer()
  const remaining = freePlaysLeft()

  return (
    <Dialog open={showPaywall} onClose={() => setShowPaywall(false)}>
      <div className="text-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 right-3"
          onClick={() => setShowPaywall(false)}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mx-auto mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>

        <h3 className="text-lg font-bold mb-2">Free plays used up</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Free tier: <strong className="text-foreground">3 tracks per day</strong>.
          {remaining > 0 && ` (${remaining} left today)`}
          <br />
          Subscribe for unlimited listening — <strong className="text-foreground">99 RUB/mo</strong>.
        </p>

        <div className="space-y-2 mb-5">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-secondary text-sm">
              <Check className="w-4 h-4 text-success shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <a
          href={PAYWALL_TG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          Subscribe 99 RUB/mo
        </a>

        <p className="text-xs text-muted-foreground mt-3">
          Payment via Telegram bot. Cancel anytime.
        </p>
      </div>
    </Dialog>
  )
}
