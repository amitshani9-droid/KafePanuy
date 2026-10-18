import type { ReactNode } from 'react'
import { ChevronLeft, Monitor, Moon, Plus, Store, Sun } from 'lucide-react'
import { rankFor } from '../data/rewards'
import type { ThemeChoice } from '../hooks/useTheme'
import BrandLogo from './BrandLogo'
import ResetDemoButton from './ResetDemoButton'

interface MoreScreenProps {
  points: number
  lifetimePoints: number
  theme: ThemeChoice
  onThemeChange: (theme: ThemeChoice) => void
  onOpenWallet: () => void
  onAddCart: () => void
  onOpenOwner: () => void
  onResetDemo: () => void
}

function Row({ icon, title, subtitle, onClick }: { icon: ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-start hover:bg-oat">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest/10 text-forest">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-sm text-ink/55">{subtitle}</span>
      </span>
      <ChevronLeft size={18} className="shrink-0 text-ink/30" />
    </button>
  )
}

const THEMES: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'לפי המכשיר', Icon: Monitor },
  { value: 'light', label: 'בהיר', Icon: Sun },
  { value: 'dark', label: 'כהה', Icon: Moon },
]

/** The phone "עוד" tab: profile summary, actions, settings and about. */
export default function MoreScreen({
  points,
  lifetimePoints,
  theme,
  onThemeChange,
  onOpenWallet,
  onAddCart,
  onOpenOwner,
  onResetDemo,
}: MoreScreenProps) {
  const rank = rankFor(lifetimePoints)
  return (
    <div className="h-full overflow-y-auto bg-cream px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24 touch-scroll">
      <BrandLogo />

      <button
        type="button"
        onClick={onOpenWallet}
        className="relative mt-5 flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D1B13] via-[#3A2418] to-[#4F2F1E] p-4 text-start text-cream shadow-[0_12px_32px_rgba(58,36,24,0.22)] ring-1 ring-[#C8772C]/30 transition active:scale-95"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl shadow-inner ring-1 ring-white/15" aria-hidden="true">
          {rank.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#DDA776]">מועדון קפה פנוי VIP</span>
          <span className="block font-display text-xl font-bold text-white">{rank.title}</span>
        </span>
        <span className="text-end">
          <span className="block font-display text-3xl font-extrabold leading-none text-[#F6EFE4]">{points}</span>
          <span className="text-xs font-medium text-cream/70">נקודות</span>
        </span>
      </button>

      <div className="mt-5 divide-y divide-forest/5 overflow-hidden rounded-2xl bg-surface ring-1 ring-forest/10">
        <Row icon={<Plus size={20} />} title="הוספת עגלה חדשה" subtitle="מכירים מקום שחסר במפה?" onClick={onAddCart} />
        <Row icon={<Store size={20} />} title="כניסת בעלי עגלות" subtitle="עדכון עומס רשמי ודילים" onClick={onOpenOwner} />
      </div>

      <section className="mt-5">
        <h2 className="mb-2 px-1 text-sm font-bold text-forest">מראה</h2>
        <div className="flex rounded-2xl bg-oat p-1" role="radiogroup" aria-label="ערכת צבעים">
          {THEMES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => onThemeChange(value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
                theme === value ? 'bg-surface text-forest shadow-sm' : 'text-forest/60'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-surface p-4 text-sm text-ink/70 ring-1 ring-forest/10">
        <h2 className="mb-1 font-bold text-forest">על קפה פנוי</h2>
        <p>רואים בזמן אמת איפה התור קצר, מדווחים מהשטח ואוספים נקודות קפה.</p>
        <p className="mt-2 text-xs text-ink/50">
          גרסת דמו: הדירוגים, השעות והעומסים של העגלות המובנות הם נתוני הדגמה. נתוני מפה ובתי קפה מיובאים © תורמי
          OpenStreetMap.
        </p>
      </section>

      <div className="mt-4">
        <ResetDemoButton onReset={onResetDemo} />
      </div>
    </div>
  )
}
