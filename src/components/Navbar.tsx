import { Plus, Store } from 'lucide-react'
import BrandLogo from './BrandLogo'

interface NavbarProps {
  freeCount: number
  onOpenOwner: () => void
  onAddCart: () => void
  points: number
  onOpenRewards: () => void
}

export default function Navbar({ freeCount, onOpenOwner, onAddCart, points, onOpenRewards }: NavbarProps) {
  return (
    <header className="z-20 border-b border-forest/10 bg-cream/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        <BrandLogo />

        <div className="hidden items-center gap-2 rounded-full bg-calm/10 px-3 py-1.5 text-sm font-medium text-forest sm:flex">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-calm animate-live-dot" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-calm" />
          </span>
          <span>
            <span className="font-display font-bold">{freeCount}</span> עגלות פנויות עכשיו באזורך
          </span>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onAddCart}
            aria-label="הוסף עגלה חדשה"
            className="flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1.5 text-sm font-medium text-cream transition hover:bg-forest-light active:scale-95 sm:px-3"
          >
            <Plus size={16} />
            <span className="hidden lg:inline">הוסף עגלה חדשה</span>
          </button>

          <button
            type="button"
            onClick={onOpenOwner}
            aria-label="כניסת בעלי עגלות"
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-forest ring-1 ring-forest/15 transition hover:bg-oat active:scale-95"
          >
            <Store size={16} />
            <span className="hidden lg:inline">כניסת בעלי עגלות 🏪</span>
          </button>

          <button
            type="button"
            onClick={onOpenRewards}
            aria-label={`${points} נקודות קפה — פתח ארנק`}
            className="flex items-center gap-1.5 rounded-full bg-espresso px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-95"
          >
            <span className="font-display font-bold">{points}</span>
            <span className="hidden sm:inline">נקודות קפה</span>
            <span aria-hidden="true">☕</span>
          </button>
        </div>
      </div>

      {/* Live counter on small screens */}
      <div className="flex items-center justify-center gap-2 pb-2 text-xs font-medium text-forest sm:hidden">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-calm animate-live-dot" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-calm" />
        </span>
        <span className="font-display font-bold">{freeCount}</span> עגלות פנויות עכשיו באזורך
      </div>

    </header>
  )
}
