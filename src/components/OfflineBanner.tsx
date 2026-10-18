import { WifiOff } from 'lucide-react'
import { useOnline } from '../hooks/useOnline'

/** Shown while the device is offline — the app keeps working from saved data. */
export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[3500] flex justify-center px-4"
    >
      <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream shadow-lg">
        <WifiOff size={16} />
        אין חיבור — מציגים את מה שנשמר במכשיר
      </div>
    </div>
  )
}
