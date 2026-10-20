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
  'flex items-center gap-1.5 rounded-full bg-surface/90 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-forest ring-1 ring-forest/10 transition-all duration-200 hover:bg-oat/70 hover:ring-forest/20 hover:-translate-y-0.5 active:scale-95 shadow-2xs'

/** Desktop header (phones use the bottom tab bar instead). */
export default function Navbar({ freeCount, points, theme, onCycleTheme, onOpenOwner, onAddCart, onOpenRewards }: NavbarProps) {
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  return (
    <header className="z-20 flex items-center gap-3 border-b border-forest/10 bg-surface/85 px-5 py-2.5 backdrop-blur-xl shadow-[0_4px_20px_rgba(58,36,24,0.03)] transition-colors">
      <BrandLogo />

      <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 animate-live-dot" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
        </span>
        <span>
          <span className="font-display font-extrabold text-sm">{freeCount}</span> עגלות פנויות עכשיו
        </span>
      </div>

      <div className="ms-auto flex items-center gap-2.5">
        <button type="button" onClick={onCycleTheme} aria-label={`${THEME_LABEL[theme]} — לחצו להחלפה`} title={THEME_LABEL[theme]} className={iconButton}>
          <ThemeIcon size={15} />
        </button>
        <button type="button" onClick={onAddCart} className={iconButton}>
          <Plus size={15} />
          <span className="hidden lg:inline">הוסף עגלה</span>
          <span className="sr-only lg:hidden">הוסף עגלה חדשה</span>
        </button>
        <button type="button" onClick={onOpenOwner} className={iconButton}>
          <Store size={15} />
          <span className="hidden lg:inline">לבעלי עגלות</span>
          <span className="sr-only lg:hidden">כניסת בעלי עגלות</span>
        </button>
        <button
          type="button"
          onClick={onOpenRewards}
          aria-label={`${points} נקודות קפה — פתח ארנק`}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-espresso to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-espresso/20 transition-all duration-200 hover:shadow-lg hover:shadow-espresso/30 hover:-translate-y-0.5 active:scale-95"
        >
          <span className="font-display font-extrabold text-sm">{points}</span>
          <span>נקודות קפה</span>
          <span aria-hidden="true" className="text-sm">☕</span>
        </button>
      </div>
    </header>
  )
}
