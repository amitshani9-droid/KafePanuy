import { useCallback, useEffect, useRef, useState } from 'react'
import type { CoffeeCart } from '../types/cart'
import type { AltRoute } from '../components/MapView'
import type { SmartAlternative } from '../utils/recommendations'
import { cartIdFromUrl, syncCartInUrl } from '../utils/share'

/** Which cart is open, the alternative-route line, and the ?cart= deep link. */
export function useSelection(carts: CoffeeCart[], loading: boolean) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Bumped on every selection, so re-selecting the same cart re-centers the map */
  const [selectionNonce, setSelectionNonce] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [route, setRoute] = useState<AltRoute | null>(null)

  const select = useCallback((id: string) => {
    setSelectedId(id)
    setSelectionNonce((n) => n + 1)
    setDrawerOpen(true)
    setRoute(null)
  }, [])

  // A shared link (?cart=…) opens straight to that cart once data has loaded
  const initialHandledRef = useRef(false)
  useEffect(() => {
    if (loading || initialHandledRef.current) return
    const id = cartIdFromUrl()
    if (id && carts.some((c) => c.id === id)) {
      select(id)
      initialHandledRef.current = true
    }
  }, [loading, carts, select])

  // Sync ?cart= in the URL seamlessly on selection / deselection
  useEffect(() => {
    if (!loading) syncCartInUrl(drawerOpen ? selectedId : null)
  }, [drawerOpen, selectedId, loading])

  // Handle browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const id = cartIdFromUrl()
      if (id && carts.some((c) => c.id === id)) {
        select(id)
      } else {
        setDrawerOpen(false)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [carts, select])

  const goToAlternative = useCallback((from: CoffeeCart, alt: SmartAlternative) => {
    setRoute({ fromId: from.id, from: from.coordinates, to: alt.cart.coordinates })
    setSelectedId(alt.cart.id)
    setSelectionNonce((n) => n + 1)
    setDrawerOpen(true)
  }, [])

  const close = useCallback(() => setDrawerOpen(false), [])

  const clear = useCallback(() => {
    setSelectedId(null)
    setDrawerOpen(false)
    setRoute(null)
  }, [])

  const selectedCart = carts.find((c) => c.id === selectedId) ?? null

  return { selectedId, selectedCart, selectionNonce, drawerOpen, route, setRoute, select, goToAlternative, close, clear }
}
