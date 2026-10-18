import { List, Map as MapIcon, Menu, Sparkles, Wallet } from 'lucide-react'

export type MobileTab = 'map' | 'feed' | 'list' | 'wallet' | 'more'

interface BottomTabsProps {
  tab: MobileTab
  onChange: (tab: MobileTab) => void
  points: number
}

const TABS = [
  { id: 'map', label: 'מפה', Icon: MapIcon },
  { id: 'feed', label: 'מהשטח', Icon: Sparkles },
  { id: 'list', label: 'רשימה', Icon: List },
  { id: 'wallet', label: 'ארנק', Icon: Wallet },
  { id: 'more', label: 'עוד', Icon: Menu },
] as const

/** Phone navigation bar (respects the home-indicator safe area with native glassmorphism). */
export default function BottomTabs({ tab, onChange, points }: BottomTabsProps) {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="z-[1300] border-t border-forest/10 bg-surface/90 backdrop-blur-2xl px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(27,67,50,0.08)]"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition-all duration-200 active:scale-90 ${
                active ? 'text-forest font-bold' : 'text-ink/45 hover:text-ink/75 font-medium'
              }`}
            >
              <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                  active
                    ? 'bg-forest/15 text-forest scale-105 shadow-sm ring-1 ring-forest/20'
                    : 'text-ink/50 group-hover:bg-oat/50'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {id === 'wallet' && (
                  <span className="absolute -top-1 -end-1 flex min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-espresso to-espresso-dark px-1 text-[9px] font-bold leading-4 text-white shadow-sm ring-1 ring-white">
                    {points > 999 ? '999+' : points}
                  </span>
                )}
                {id === 'feed' && !active && (
                  <span className="absolute top-1 end-2 h-1.5 w-1.5 rounded-full bg-espresso animate-pulse" />
                )}
              </span>
              <span className="text-[10.5px] leading-tight tracking-tight">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
