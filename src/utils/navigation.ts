import type { LatLng } from '../types/cart'

/**
 * Builds direct deep-links for navigation apps (Waze, Google Maps, Apple Maps).
 */
export function getWazeUrl(coords: LatLng): string {
  return `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`
}

export function getGoogleMapsUrl(coords: LatLng, name?: string): string {
  const dest = `${coords.lat},${coords.lng}`
  const query = name ? `${dest}+(${encodeURIComponent(name)})` : dest
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`
}

export function getAppleMapsUrl(coords: LatLng, name?: string): string {
  const q = name ? `&q=${encodeURIComponent(name)}` : ''
  return `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}${q}`
}

/**
 * Attempts to open Waze or Google Maps natively or in browser.
 */
export function navigateTo(coords: LatLng, name?: string, preferApp: 'waze' | 'google' = 'waze'): void {
  const url = preferApp === 'waze' ? getWazeUrl(coords) : getGoogleMapsUrl(coords, name)
  window.open(url, '_blank', 'noopener,noreferrer')
}
