import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 768px)'

/** Viewport height (for sheet snap points) and whether we're on a desktop-width screen */
export function useViewport() {
  const read = () => ({
    height: window.innerHeight,
    isDesktop: window.matchMedia(DESKTOP_QUERY).matches,
  })
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const update = () => setVp(read())
    window.addEventListener('resize', update)
    window.matchMedia(DESKTOP_QUERY).addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      window.matchMedia(DESKTOP_QUERY).removeEventListener('change', update)
    }
  }, [])
  return vp
}
