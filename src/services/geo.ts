import type { LatLng } from '../types/cart'
import { getDistanceKm } from '../utils/recommendations'

export function distanceKm(a: LatLng, b: LatLng): number {
  return getDistanceKm(a.lat, a.lng, b.lat, b.lng)
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} מ׳` : `${km.toFixed(1)} ק״מ`
}

export type LocationErrorKind = 'unsupported' | 'denied' | 'unavailable'

export class LocationError extends Error {
  constructor(public kind: LocationErrorKind) {
    super(kind)
  }
}

/** Asks the browser for the user's position (prompts for permission the first time). */
export function requestUserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new LocationError('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new LocationError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  })
}

export const LOCATION_ERROR_TEXT: Record<LocationErrorKind, string> = {
  unsupported: 'הדפדפן שלך לא תומך במיקום 😕',
  denied: 'אין לנו גישה למיקום — אפשר לאשר אותה בהגדרות הדפדפן',
  unavailable: 'לא הצלחנו למצוא אותך כרגע — נסו שוב בעוד רגע',
}
