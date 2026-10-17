import type { CoffeeCart } from '../types/cart'
import { TAG_LABELS } from '../data/filters'
import { REGION_LABELS } from '../data/regions'

/**
 * Loosens text for matching: lowercase, no niqqud, no geresh/gershayim or quotes
 * (so "מהרל" finds "מהר״ל"), dashes as spaces, collapsed whitespace.
 */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[׳״'"`’”]/g, '')
    .replace(/[-–—_.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function haystack(cart: CoffeeCart): string {
  return normalizeForSearch(
    [
      cart.name,
      ...(cart.aliases ?? []),
      cart.area,
      cart.description,
      REGION_LABELS[cart.region],
      ...cart.specialties,
      ...cart.tags.flatMap((t) => [TAG_LABELS[t].label, TAG_LABELS[t].short]),
    ].join(' '),
  )
}

/** Every word of the query must appear somewhere in the cart's text. */
export function matchesQuery(cart: CoffeeCart, query: string): boolean {
  const words = normalizeForSearch(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const text = haystack(cart)
  return words.every((w) => text.includes(w))
}
