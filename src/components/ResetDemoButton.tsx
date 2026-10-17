import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

/** Two-step reset so a stray tap doesn't wipe the demo. */
export default function ResetDemoButton({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false)
  return (
    <button
      type="button"
      onClick={() => (armed ? onReset() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
        armed ? 'bg-busy text-white' : 'text-ink/60 hover:bg-oat'
      }`}
    >
      <RotateCcw size={15} />
      {armed ? 'בטוחים? לחצו שוב כדי לאפס הכל' : 'איפוס נתוני דמו'}
    </button>
  )
}
