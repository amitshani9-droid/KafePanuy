import { List, Map as MapIcon, Menu, Wallet } from 'lucide-react'

export type MobileTab = 'map' | 'list' | 'wallet' | 'more'

interface BottomTabsProps {
  tab: MobileTab
  onChange: (tab: MobileTab) => void
  points: number
}

const TABS = [
  { id: 'map', label: 'מפה', Icon: MapIcon },
  { id: 'list', label: 'רשימה', Icon: List },
  { id: 'wallet', label: 'ארנק', Icon: Wallet },
  { id: 'more', label: 'עוד', Icon: Menu },
] as const

/** Phone navigation bar (respects the home-indicator safe area). */
export default function BottomTabs({ tab, onChange, points }: BottomTabsProps) {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="z-[1300] grid grid-cols-4 border-t border-forest/10 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-bold transition ${
              active ? 'text-forest' : 'text-ink/45 hover:text-ink/70'
            }`}
          >
            {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-forest" aria-hidden="true" />}
            <span className="relative">
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {id === 'wallet' && (
                <span className="absolute -top-1.5 -end-4 rounded-full bg-espresso px-1 font-display text-[10px] leading-4 text-white">
                  {points}
                </span>
              )}
            </span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}
