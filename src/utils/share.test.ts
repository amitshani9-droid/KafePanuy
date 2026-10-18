import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cartIdFromUrl, cartShareUrl, syncCartInUrl, CART_PARAM } from './share'

describe('cartShareUrl', () => {
  it('generates a URL that includes ?cart=${cartId}', () => {
    const url = cartShareUrl('sharon-1', 'https://kafepanuy.co.il/')
    expect(url).toBe('https://kafepanuy.co.il/?cart=sharon-1')
  })

  it('updates the cart parameter if one already exists in the baseUrl', () => {
    const url = cartShareUrl('sharon-2', 'https://kafepanuy.co.il/?cart=old-cart')
    expect(url).toBe('https://kafepanuy.co.il/?cart=sharon-2')
  })

  it('preserves other path and query parameters', () => {
    const url = cartShareUrl('north-5', 'https://kafepanuy.co.il/map?region=north')
    const parsed = new URL(url)
    expect(parsed.searchParams.get(CART_PARAM)).toBe('north-5')
    expect(parsed.searchParams.get('region')).toBe('north')
    expect(parsed.pathname).toBe('/map')
  })
})

describe('cartIdFromUrl', () => {
  it('extracts the cart ID from query string', () => {
    expect(cartIdFromUrl('?cart=emek-hefer-1')).toBe('emek-hefer-1')
    expect(cartIdFromUrl('?filter=dogs&cart=center-2&sort=nearest')).toBe('center-2')
  })

  it('returns null when no cart parameter is present', () => {
    expect(cartIdFromUrl('')).toBeNull()
    expect(cartIdFromUrl('?region=sharon')).toBeNull()
  })
})

describe('syncCartInUrl', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/app')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
  })

  it('adds ?cart=<id> to the URL via replaceState when a cart is selected', () => {
    const spy = vi.spyOn(window.history, 'replaceState')
    syncCartInUrl('cart-999')
    expect(spy).toHaveBeenCalledWith(
      null,
      '',
      '/app?cart=cart-999',
    )
  })

  it('cleans ?cart= from the URL when deselected (cartId is null)', () => {
    window.history.pushState({}, '', '/app?cart=cart-999')
    const spy = vi.spyOn(window.history, 'replaceState')
    syncCartInUrl(null)
    expect(spy).toHaveBeenCalledWith(
      null,
      '',
      '/app',
    )
  })

  it('preserves other query parameters when removing cart', () => {
    window.history.pushState({}, '', '/app?region=sharon&cart=cart-999')
    const spy = vi.spyOn(window.history, 'replaceState')
    syncCartInUrl(null)
    expect(spy).toHaveBeenCalledWith(
      null,
      '',
      '/app?region=sharon',
    )
  })
})
