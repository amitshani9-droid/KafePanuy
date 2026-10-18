import { useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    // Some browsers/emulators skip the media-query event on resize — check on resize too
    window.addEventListener('resize', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [query])
  return matches
}

/** Phone layout (bottom tabs, full-screen map) below Tailwind's `md` breakpoint. */
export const MOBILE_QUERY = '(max-width: 767px)'
