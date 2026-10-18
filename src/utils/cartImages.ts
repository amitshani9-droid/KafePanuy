import type { CoffeeCart } from '../types/cart'

const CART_PHOTOS = [
  '/images/cart-1.jpg',
  '/images/cart-2.jpg',
  '/images/cart-3.jpg',
  '/images/cart-4.jpg',
  '/images/cart-5.jpg',
]

/**
 * Returns a high-res editorial photo for a coffee cart.
 * Uses the cart's own image if present, or picks a consistent thematic photo.
 */
export function getCartPhoto(cart: CoffeeCart): string {
  if (cart.imageUrl) return cart.imageUrl
  // Hash the cart id to get a consistent photo
  let hash = 0
  for (let i = 0; i < cart.id.length; i++) {
    hash = (hash * 31 + cart.id.charCodeAt(i)) >>> 0
  }
  return CART_PHOTOS[hash % CART_PHOTOS.length]
}
