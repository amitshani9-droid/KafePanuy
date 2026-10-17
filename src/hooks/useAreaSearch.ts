import { useCallback, useState } from 'react'
import type { CoffeeCart } from '../types/cart'
import { fetchCafesInBounds, OsmSearchError, type MapBounds } from '../services/osmImportService'
import type { Notify } from './useToast'

/** "Search this area": imports named cafés from OpenStreetMap for the visible map. */
export function useAreaSearch(
  addCarts: (carts: CoffeeCart[]) => Promise<CoffeeCart[]>,
  notify: Notify,
  onAdded: (added: CoffeeCart[]) => void,
) {
  const [searching, setSearching] = useState(false)

  const searchArea = useCallback(
    async (bounds: MapBounds) => {
      setSearching(true)
      try {
        const found = await fetchCafesInBounds(bounds)
        const added = await addCarts(found)
        if (added.length > 0) onAdded(added)
        notify({
          emoji: added.length > 0 ? '🗺️' : '🤷',
          title: added.length > 0 ? `נוספו ${added.length} בתי קפה ועגלות חדשות למפה!` : 'לא מצאנו בתי קפה חדשים באזור הזה',
          subtitle:
            added.length > 0
              ? 'מתוך OpenStreetMap · דווחו עומס ותעזרו לכולם'
              : found.length > 0
                ? `כל ה-${found.length} שמצאנו כבר במפה`
                : 'נסו להזיז את המפה לאזור אחר',
          celebrate: added.length > 0,
        })
      } catch (err) {
        const kind = err instanceof OsmSearchError ? err.kind : 'network'
        notify({
          emoji: kind === 'too-large' ? '🔎' : '😕',
          title:
            kind === 'too-large'
              ? 'האזור גדול מדי לחיפוש'
              : kind === 'busy' || kind === 'timeout'
                ? 'שרת המפות של OpenStreetMap עמוס כרגע'
                : 'לא הצלחנו להתחבר ל-OpenStreetMap',
          subtitle: kind === 'too-large' ? 'התקרבו קצת במפה (עד עיר או מועצה) ונסו שוב' : 'נסו שוב בעוד דקה',
        })
      } finally {
        setSearching(false)
      }
    },
    [addCarts, notify, onAdded],
  )

  return { searching, searchArea }
}
