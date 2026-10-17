import type { CoffeeCart } from '../types/cart'
import { STATUS_META } from '../data/filters'

const CART_PARAM = 'cart'

/** Cart id from the page URL (?cart=…), if any. */
export function cartIdFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(CART_PARAM)
  } catch {
    return null
  }
}

/** Keeps ?cart=… in the address bar in sync with the open drawer, without adding history entries. */
export function syncCartInUrl(cartId: string | null): void {
  const url = new URL(window.location.href)
  if (cartId) url.searchParams.set(CART_PARAM, cartId)
  else url.searchParams.delete(CART_PARAM)
  if (url.href !== window.location.href) window.history.replaceState(null, '', url)
}

export function cartShareUrl(cartId: string): string {
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set(CART_PARAM, cartId)
  return url.href
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** Native share sheet on phones; copies the link elsewhere. */
export async function shareCart(cart: CoffeeCart): Promise<ShareResult> {
  const url = cartShareUrl(cart.id)
  const text = `${cart.name} (${cart.area}) — ${STATUS_META[cart.status].label} עכשיו, בערך ${cart.waitMinutes} דק׳ המתנה ☕`
  if (navigator.share) {
    try {
      await navigator.share({ title: `${cart.name} · קפה פנוי`, text, url })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // fall through to copying
    }
  }
  const payload = `${text}\n${url}`
  try {
    await navigator.clipboard.writeText(payload)
    return 'copied'
  } catch {
    return legacyCopy(payload) ? 'copied' : 'failed'
  }
}

/** Fallback for browsers/contexts where the async Clipboard API is blocked. */
function legacyCopy(value: string): boolean {
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}
