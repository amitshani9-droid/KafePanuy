import type { PlaceStatus } from '../types'
import { LEVEL_LABEL } from '../lib/busyness'

const DOT: Record<string, string> = {
  calm: 'bg-calm',
  moderate: 'bg-moderate',
  busy: 'bg-busy',
  closed: 'bg-closed',
}
const TEXT: Record<string, string> = {
  calm: 'text-calm-ink',
  moderate: 'text-moderate-ink',
  busy: 'text-busy-ink',
  closed: 'text-muted',
}

/** Colored dot + Hebrew label; live reports get a pulsing ring so they read as "now" */
export function StatusTag({ status }: { status: PlaceStatus }) {
  const key = status.level ?? 'closed'
  const label = status.level ? LEVEL_LABEL[status.level] : 'סגור'
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${TEXT[key]}`}>
      <span className="relative flex size-2.5">
        {status.source === 'live' && (
          <span className={`absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden ${DOT[key]}`} />
        )}
        <span className={`relative size-2.5 rounded-full ${DOT[key]}`} />
      </span>
      {label}
    </span>
  )
}

export const LEVEL_BG = DOT
export const LEVEL_TEXT = TEXT
