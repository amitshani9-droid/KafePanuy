import { Monitor, Moon, Plus, Store, Sun } from 'lucide-react'
import type { ThemeChoice } from '../hooks/useTheme'
import BrandLogo from './BrandLogo'

interface NavbarProps {
  freeCount: number
  points: number
  theme: ThemeChoice
  onCycleTheme: () => void
  onOpenOwner: () => void
  onAddCart: () => void
  onOpenRewards: () => void
}

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'ערכת צבעים: לפי המכשיר',
  light: 'ערכת צבעים: בהירה',
  dark: 'ערכת צבעים: כהה',
}

const iconButton =
  'flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-sm font-medium text-forest ring-1 ring-forest/15 transition hover:bg-oat active:scale-95'

/** Desktop header (phones use the bottom tab bar instead). */
export default function Navbar({ freeCount, points, theme, onCycleTheme, onOpenOwner, onAddCart, onOpenRewards }: NavbarProps) {
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  return (
    <header className="z-20 flex items-center gap-3 border-b border-forest/10 bg-cream/95 px-4 py-2.5 backdrop-blur">
      <BrandLogo />

      <div className="flex items-center gap-2 rounded-full bg-calm/10 px-3 py-1.5 text-sm font-medium text-forest">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-calm animate-live-dot" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-calm" />
        </span>
        <span>
          <span className="font-display font-bold">{freeCount}</span> עגלות פנויות עכשיו
        </span>
      </div>

      <div className="ms-auto flex items-center gap-2">
        <button type="button" onClick={onCycleTheme} aria-label={`${THEME_LABEL[theme]} — לחצו להחלפה`} title={THEME_LABEL[theme]} className={iconButton}>
          <ThemeIcon size={16} />
        </button>
        <button type="button" onClick={onAddCart} className={iconButton}>
          <Plus size={16} />
          <span className="hidden lg:inline">הוסף עגלה</span>
          <span className="sr-only lg:hidden">הוסף עגלה חדשה</span>
        </button>
        <button type="button" onClick={onOpenOwner} className={iconButton}>
          <Store size={16} />
          <span className="hidden lg:inline">לבעלי עגלות</span>
          <span className="sr-only lg:hidden">כניסת בעלי עגלות</span>
        </button>
        <button
          type="button"
          onClick={onOpenRewards}
          aria-label={`${points} נקודות קפה — פתח ארנק`}
          className="flex items-center gap-1.5 rounded-full bg-espresso px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-95"
        >
          <span className="font-display font-bold">{points}</span>
          <span>נקודות קפה</span>
          <span aria-hidden="true">☕</span>
        </button>
      </div>
    </header>
  )
}
