import { useCallback, useMemo, useState } from 'react'
import type { CoffeeCart, CrowdStatus, FilterTag, LatLng, SortOption } from '../types/cart'
import { REGION_OPTIONS, type RegionFilter } from '../data/regions'
import { isDealActive } from '../services/cartService'
import { distanceKm } from '../services/geo'
import { matchesQuery } from '../utils/search'

const STATUS_RANK: Record<CrowdStatus, number> = { calm: 0, moderate: 1, busy: 2 }

/** Search, quick filters, tags, region and sort → the carts to show. */
export function useCartFilters(carts: CoffeeCart[], now: number, userLocation: LatLng | null) {
  const [query, setQuery] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [onlyDeals, setOnlyDeals] = useState(false)
  const [activeTags, setActiveTags] = useState<FilterTag[]>([])
  const [sort, setSort] = useState<SortOption>('freest')
  const [region, setRegion] = useState<RegionFilter>('all')

  const regionCarts = useMemo(
    () => (region === 'all' ? carts : carts.filter((c) => c.region === region)),
    [carts, region],
  )

  const visibleCarts = useMemo(() => {
    const filtered = regionCarts.filter((c) => {
      if (onlyFree && c.status !== 'calm') return false
      if (onlyDeals && !isDealActive(c, now)) return false
      if (!activeTags.every((t) => c.tags.includes(t))) return false
      return matchesQuery(c, query)
    })
    return filtered.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'nearest' && userLocation)
        return distanceKm(userLocation, a.coordinates) - distanceKm(userLocation, b.coordinates)
      return STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.waitMinutes - b.waitMinutes
    })
  }, [regionCarts, query, onlyFree, onlyDeals, activeTags, sort, userLocation, now])

  const regionCounts = useMemo(() => {
    const counts = Object.fromEntries(REGION_OPTIONS.map((o) => [o.value, 0])) as Record<RegionFilter, number>
    counts.all = carts.length
    for (const c of carts) counts[c.region] += 1
    return counts
  }, [carts])

  const freeCount = regionCarts.filter((c) => c.status === 'calm').length
  const dealCount = regionCarts.filter((c) => isDealActive(c, now)).length
  /** Filters beyond the default view (shown as a badge on the filter button). */
  const activeFilterCount = (onlyFree ? 1 : 0) + (onlyDeals ? 1 : 0) + activeTags.length + (region !== 'all' ? 1 : 0)

  const toggleTag = useCallback(
    (tag: FilterTag) => setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])),
    [],
  )

  const clearFilters = useCallback(() => {
    setQuery('')
    setOnlyFree(false)
    setOnlyDeals(false)
    setActiveTags([])
  }, [])

  return {
    query, setQuery,
    onlyFree, setOnlyFree,
    onlyDeals, setOnlyDeals,
    activeTags, toggleTag,
    sort, setSort,
    region, setRegion,
    visibleCarts, regionCounts, freeCount, dealCount, activeFilterCount,
    clearFilters,
  }
}

export type CartFilters = ReturnType<typeof useCartFilters>
