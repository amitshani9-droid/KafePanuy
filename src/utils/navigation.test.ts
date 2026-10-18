import { describe, expect, it } from 'vitest'
import { getAppleMapsUrl, getGoogleMapsUrl, getWazeUrl } from './navigation'

describe('navigation utility', () => {
  const coords = { lat: 32.355, lng: 34.882 }
  const name = 'קפה בפרדס'

  it('generates valid Waze deep link with navigate=yes', () => {
    const url = getWazeUrl(coords)
    expect(url).toBe('https://waze.com/ul?ll=32.355,34.882&navigate=yes')
  })

  it('generates valid Google Maps navigation link', () => {
    const url = getGoogleMapsUrl(coords, name)
    expect(url).toContain('google.com/maps/dir/')
    expect(url).toContain('32.355,34.882')
  })

  it('generates valid Apple Maps navigation link', () => {
    const url = getAppleMapsUrl(coords, name)
    expect(url).toContain('maps.apple.com/?daddr=32.355,34.882')
  })
})
