import { useCallback, useEffect, useRef, useState } from 'react'
import type { Place } from '../types'
import { fetchUserPlaces } from '../lib/backend'
import { boundsDiagonalKm, type Bounds } from '../lib/geo'
import { cachedPlaces, fetchPlaces, MAX_SEARCH_KM, OverpassError, type OverpassErrorKind } from '../lib/overpass'

export type PlacesState = 'idle' | 'loading' | 'ready' | 'too-large' | OverpassErrorKind

/**
 * Coffee places for the visible map area. Places accumulate as the user pans,
 * so pins don't vanish when the map moves.
 */
export function usePlaces(bounds: Bounds | null) {
  const [places, setPlaces] = useState<Map<string, Place>>(new Map())
  const [state, setState] = useState<PlacesState>('idle')
  const requestId = useRef(0)

  const merge = useCallback((list: Place[]) => {
    if (!list.length) return
    setPlaces((prev) => {
      const next = new Map(prev)
      for (const p of list) next.set(p.key, p)
      return next
    })
  }, [])

  const load = useCallback(
    async (b: Bounds) => {
      if (boundsDiagonalKm(b) > MAX_SEARCH_KM) {
        setState('too-large')
        return
      }
      const id = ++requestId.current
      const cached = cachedPlaces(b)
      if (cached) merge(cached)
      else setState('loading')

      fetchUserPlaces(b)
        .then(merge)
        .catch(() => {})

      if (cached) {
        setState('ready')
        return
      }
      try {
        const list = await fetchPlaces(b)
        merge(list)
        if (id === requestId.current) setState('ready')
      } catch (e) {
        if (id === requestId.current) setState(e instanceof OverpassError ? e.kind : 'network')
      }
    },
    [merge],
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
