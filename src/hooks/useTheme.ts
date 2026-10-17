import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

/** Per-browser preference (not app data, so the demo reset leaves it alone). */
const THEME_KEY = 'kafe-panuy:theme'
const META_COLORS = { light: '#1B4332', dark: '#111a15' }

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
  const dark = choice === 'dark' || (choice === 'system' && systemPrefersDark())
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? META_COLORS.dark : META_COLORS.light)
}

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice)

  useEffect(() => {
    apply(choice)
    try {
      if (choice === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, choice)
    } catch {
      // storage blocked — the choice just won't be remembered
    }
    if (choice !== 'system') return
    // Follow the OS while on "system"
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [choice])

  const cycle = useCallback(() => setChoice((c) => NEXT[c]), [])
  return { choice, setChoice, cycle }
}
