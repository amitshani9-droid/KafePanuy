import { useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { REPORT_POINTS } from '../data/rewards'
import Modal from './Modal'

/** Per-browser flag (not app data, so the demo reset doesn't show the welcome again). */
const SEEN_KEY = 'kafe-panuy:welcome-seen'

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true // storage blocked — don't nag on every visit
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // ignore
  }
}

const SLIDES = [
  {
    art: '☕',
    title: 'ברוכים הבאים לקפה פנוי',
    body: 'רואים בזמן אמת איפה התור קצר — ומוצאים עגלת קפה רגועה בסביבה, בלי לנחש.',
  },
  {
    art: '🟢🟡🔴',
    title: 'הצבע אומר הכל',
    body: 'ירוק = פנוי, צהוב = תור קצר, אדום = עמוס. עגלה עמוסה? נציע לך חלופה שקטה קרובה ונראה כמה זמן תחסוך.',
  },
  {
    art: '🎁',
    title: 'מדווחים ומרוויחים',
    body: `כל דיווח מהשטח שווה +${REPORT_POINTS} נקודות קפה, שאפשר לממש בקפה חינם ומאפים בעגלות.`,
  },
]

interface WelcomeSheetProps {
  onDone: () => void
  /** Ask for location and sort by distance */
  onUseLocation: () => void
}

export default function WelcomeSheet({ onDone, onUseLocation }: WelcomeSheetProps) {
  const [i, setI] = useState(0)
  const slide = SLIDES[i]
  const last = i === SLIDES.length - 1

  function finish(useLocation: boolean) {
    markSeen()
    onDone()
    if (useLocation) onUseLocation()
  }

  return (
    <Modal
      onClose={() => finish(false)}
      title={<span className="sr-only">ברוכים הבאים</span>}
      footer={
        <div className="space-y-2">
          {last ? (
            <>
              <button
                type="button"
                onClick={() => finish(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3.5 font-display text-base font-bold text-cream transition hover:bg-forest-light active:scale-[0.98]"
              >
                <LocateFixed size={18} />
                הראו לי מה קרוב אליי
              </button>
              <button
                type="button"
                onClick={() => finish(false)}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-forest hover:bg-oat"
              >
                אחר כך, יאללה לקפה ☕
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => finish(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-forest/70 hover:bg-oat">
                דלג
              </button>
              <button
                type="button"
                onClick={() => setI(i + 1)}
                className="flex-1 rounded-xl bg-forest py-3 font-display font-bold text-cream transition hover:bg-forest-light active:scale-[0.98]"
              >
                הבא
              </button>
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center px-2 pt-2 pb-4 text-center" aria-live="polite">
        <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-forest/10 text-5xl" aria-hidden="true">
          {slide.art}
        </div>
        <h2 className="font-display text-2xl font-bold text-forest">{slide.title}</h2>
        <p className="mt-2 max-w-sm text-base text-ink/75">{slide.body}</p>
        <div className="mt-5 flex gap-1.5" aria-label={`שלב ${i + 1} מתוך ${SLIDES.length}`}>
          {SLIDES.map((_, k) => (
            <span key={k} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-forest' : 'w-2 bg-forest/20'}`} />
          ))}
        </div>
      </div>
    </Modal>
  )
}
