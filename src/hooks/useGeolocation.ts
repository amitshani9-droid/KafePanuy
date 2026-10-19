import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLng } from '../lib/geo'

export type GeoState = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable'

/** Watches the user's position once they allow it. `locate()` asks (again) on demand. */
export function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null)
  const [state, setState] = useState<GeoState>('idle')
  const watchId = useRef<number | null>(null)

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unavailable')
      return
    }
    setState((s) => (s === 'ok' ? s : 'locating'))
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude })
        setState('ok')
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    )
  }, [])

  useEffect(
    () => () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    },
    [],
  )

  return { position, state, locate }
}
