import { useCallback, useEffect, useRef, useState } from 'react'
import type { Place } from '../types'
import { fetchUserPlaces } from '../lib/backend'
import { boundsDiagonalKm, type Bounds } from '../lib/geo'
import {
  cachedPlaces,
  fetchPlaces,
  loadStaticPlaces,
  MAX_SEARCH_KM,
  OverpassError,
  type OverpassErrorKind,
} from '../lib/overpass'

export type PlacesState = 'idle' | 'loading' | 'ready' | 'too-large' | OverpassErrorKind

/**
 * Coffee places for the visible map area.
 * Primary source: the bundled Israel dataset (loaded once, instant after that).
 * Fallback when it's missing: a live Overpass search per area.
 * Places accumulate as the user pans, so pins don't vanish when the map moves.
 */
export function usePlaces(bounds: Bounds | null) {
  const [places, setPlaces] = useState<Map<string, Place>>(new Map())
  const [state, setState] = useState<PlacesState>('idle')
  /** undefined = still loading the dataset, null = unavailable */
  const [staticReady, setStaticReady] = useState<boolean | undefined>(undefined)
  const requestId = useRef(0)

  const merge = useCallback((list: Place[]) => {
    if (!list.length) return
    setPlaces((prev) => {
      const next = new Map(prev)
      for (const p of list) next.set(p.key, p)
      return next
    })
  }, [])

  useEffect(() => {
    let alive = true
    loadStaticPlaces().then((list) => {
      if (!alive) return
      if (list) merge(list)
      setStaticReady(Boolean(list))
    })
    return () => {
      alive = false
    }
  }, [merge])

  const load = useCallback(
    async (b: Bounds) => {
      fetchUserPlaces(b)
        .then(merge)
        .catch(() => {})

      if (boundsDiagonalKm(b) > MAX_SEARCH_KM) {
        setState('too-large')
        return
      }
      if (staticReady === undefined) {
        setState('loading')
        return
      }
      if (staticReady) {
        setState('ready')
        return
      }

      // Fallback: live search for this area
      const id = ++requestId.current
      const cached = cachedPlaces(b)
      if (cached) {
        merge(cached)
        setState('ready')
        return
      }
      setState('loading')
      try {
        merge(await fetchPlaces(b))
        if (id === requestId.current) setState('ready')
      } catch (e) {
        if (id === requestId.current) setState(e instanceof OverpassError ? e.kind : 'network')
      }
    },
    [merge, staticReady],
  )

  useEffect(() => {
    if (bounds) void load(bounds)
  }, [bounds, load])

  const retry = useCallback(() => {
    if (bounds) void load(bounds)
  }, [bounds, load])

  const addLocal = useCallback((p: Place) => merge([p]), [merge])

  return { places, state, retry, addLocal }
}
