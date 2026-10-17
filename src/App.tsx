import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CoffeeCart, CrowdStatus, FilterTag, LatLng, ReportInput, Reward, SortOption } from './types/cart'
import { REPORT_POINTS, rankFor } from './data/rewards'
import { REGION_OPTIONS, regionForLatLng, type RegionFilter } from './data/regions'
import {
  addCarts,
  endFlashDeal,
  getCarts,
  getLifetimePoints,
  getPoints,
  getMyRatings,
  getWatches,
  getReports,
  isDealActive,
  makeCartId,
  ownerUpdateStatus,
  rateCart,
  RATING_POINTS,
  redeemReward,
  resetDemoData,
  startFlashDeal,
  submitReport,
  toggleWatch,
  withMyRating,
} from './services/cartService'
import { distanceKm, LOCATION_ERROR_TEXT, LocationError, requestUserLocation } from './services/geo'
import { fetchCafesInBounds, OsmSearchError, type MapBounds } from './services/osmImportService'
import Navbar from './components/Navbar'
import FilterBar from './components/FilterBar'
import CartList from './components/CartList'
import CartDetailsDrawer from './components/CartDetailsDrawer'
import MapView, { type AltRoute, type FitRequest } from './components/MapView'
import RegionSelector from './components/RegionSelector'
import AddCartModal, { EMPTY_DRAFT, draftCoordinates, type CartDraft } from './components/AddCartModal'
import ReportModal from './components/ReportModal'
import RewardsModal from './components/RewardsModal'
import OwnerDashboardModal from './components/OwnerDashboardModal'
import ResetDemoButton from './components/ResetDemoButton'
import Toast, { type ToastMessage } from './components/Toast'
import { findSmartAlternative, type SmartAlternative } from './utils/recommendations'
import { cartIdFromUrl, shareCart, syncCartInUrl } from './utils/share'
import { matchesQuery } from './utils/search'
import { ensureNotificationPermission, showSystemNotification } from './utils/notify'

type MobileView = 'map' | 'list'

const STATUS_RANK: Record<CrowdStatus, number> = { calm: 0, moderate: 1, busy: 2 }

const isMobile = () => window.matchMedia('(max-width: 767px)').matches

export default function App() {
  const [baseCarts, setCarts] = useState(getCarts)
  const [myRatings, setMyRatings] = useState(getMyRatings)
  const [watches, setWatches] = useState(getWatches)
  // What every screen shows: stored carts with this user's ratings blended in
  const carts = useMemo(
    () => baseCarts.map((c) => withMyRating(c, myRatings[c.id])),
    [baseCarts, myRatings],
  )
  const [points, setPoints] = useState(getPoints)
  const [lifetimePoints, setLifetimePoints] = useState(getLifetimePoints)
  const [reports, setReports] = useState(getReports)
  const [reportCartId, setReportCartId] = useState<string | null>(null)
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [ownerOpen, setOwnerOpen] = useState(false)
  // Unlocked with the owner PIN for this visit only (not persisted)
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  // Clock tick so flash deals expire on screen without a refresh
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const [query, setQuery] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [onlyDeals, setOnlyDeals] = useState(false)
  const [activeTags, setActiveTags] = useState<FilterTag[]>([])
  const [sort, setSort] = useState<SortOption>('freest')

  // A shared link (?cart=…) opens straight to that cart
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = cartIdFromUrl()
    return id && carts.some((c) => c.id === id) ? id : null
  })
  const [selectionNonce, setSelectionNonce] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(() => selectedId !== null)
  const [route, setRoute] = useState<AltRoute | null>(null)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('map')
  const [region, setRegion] = useState<RegionFilter>('all')
  const [fitRequest, setFitRequest] = useState<FitRequest | null>(null)
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [pickMode, setPickMode] = useState(false)
  const [draft, setDraft] = useState<CartDraft>(EMPTY_DRAFT)

  const origin = userLocation
  const regionCarts = useMemo(
    () => (region === 'all' ? carts : carts.filter((c) => c.region === region)),
    [carts, region],
  )
  const freeCount = regionCarts.filter((c) => c.status === 'calm').length
  const regionCounts = useMemo(() => {
    const counts = Object.fromEntries(REGION_OPTIONS.map((o) => [o.value, 0])) as Record<RegionFilter, number>
    counts.all = carts.length
    for (const c of carts) counts[c.region] += 1
    return counts
  }, [carts])

  const visibleCarts = useMemo(() => {
    const filtered = regionCarts.filter((c) => {
      if (onlyFree && c.status !== 'calm') return false
      if (onlyDeals && !isDealActive(c, now)) return false
      if (!activeTags.every((t) => c.tags.includes(t))) return false
      return matchesQuery(c, query)
    })
    return filtered.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'nearest' && origin) return distanceKm(origin, a.coordinates) - distanceKm(origin, b.coordinates)
      return STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.waitMinutes - b.waitMinutes
    })
  }, [regionCarts, query, onlyFree, onlyDeals, activeTags, sort, origin, now])

  // Look up in all carts: a smart alternative may be hidden by the current filters
  const selectedCart = carts.find((c) => c.id === selectedId) ?? null
  const alternative = useMemo(
    () => (selectedCart ? findSmartAlternative(selectedCart, carts) : null),
    [selectedCart, carts],
  )

  // Always show the selected cart (and the route's busy origin) on the map, even if filtered out
  const mapCarts = useMemo(() => {
    const extra = carts.filter(
      (c) =>
        !visibleCarts.includes(c) &&
        ((drawerOpen && c.id === selectedId) || c.id === route?.fromId),
    )
    return extra.length ? [...visibleCarts, ...extra] : visibleCarts
  }, [carts, visibleCarts, selectedId, drawerOpen, route])

  function toggleTag(tag: FilterTag) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function clearFilters() {
    setQuery('')
    setOnlyFree(false)
    setOnlyDeals(false)
    setActiveTags([])
  }

  function selectCart(id: string) {
    setSelectedId(id)
    setSelectionNonce((n) => n + 1)
    setDrawerOpen(true)
    setRoute(null)
  }

  function selectFromList(id: string) {
    selectCart(id)
    if (isMobile()) setMobileView('map')
  }

  function goToAlternative(alt: SmartAlternative) {
    if (!selectedCart) return
    setRoute({ fromId: selectedCart.id, from: selectedCart.coordinates, to: alt.cart.coordinates })
    setSelectedId(alt.cart.id)
    setSelectionNonce((n) => n + 1)
    setDrawerOpen(true)
    if (isMobile()) setMobileView('map')
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    syncCartInUrl(drawerOpen ? selectedId : null)
  }, [drawerOpen, selectedId])

  async function handleShare(cart: CoffeeCart) {
    const result = await shareCart(cart)
    if (result === 'copied') setToast({ id: Date.now(), emoji: '🔗', title: 'הקישור הועתק', subtitle: 'אפשר להדביק בוואטסאפ או בכל מקום' })
    if (result === 'failed') setToast({ id: Date.now(), emoji: '😕', title: 'לא הצלחנו לשתף', subtitle: 'אפשר להעתיק את הכתובת משורת הכתובת' })
  }
  const closeReport = useCallback(() => setReportCartId(null), [])
  const closeRewards = useCallback(() => setRewardsOpen(false), [])
  const clearToast = useCallback(() => setToast(null), [])

  function handleReport(input: ReportInput) {
    const prevRank = rankFor(lifetimePoints)
    const result = submitReport(input)
    setCarts(result.carts)
    setPoints(result.points)
    setLifetimePoints(result.lifetimePoints)
    setReports((prev) => [result.report, ...prev])
    setReportCartId(null)
    setRoute(null)

    const newRank = rankFor(result.lifetimePoints)
    const rankedUp = newRank.title !== prevRank.title
    setToast({
      id: Date.now(),
      emoji: rankedUp ? newRank.emoji : '🎉',
      title: rankedUp ? `עלית דרגה: ${newRank.title}!` : `תודה! קיבלת +${REPORT_POINTS} נקודות קפה`,
      subtitle: rankedUp
        ? `+${REPORT_POINTS} נק׳ על הדיווח · יש לך ${result.points} נק׳`
        : `הדיווח עודכן במפה · יש לך ${result.points} נק׳`,
      celebrate: true,
    })
  }

  // "Notify me when it's free": fire when a watched cart turns calm
  const prevStatuses = useRef(new Map(carts.map((c) => [c.id, c.status])))
  useEffect(() => {
    const prev = prevStatuses.current
    for (const cart of carts) {
      const before = prev.get(cart.id)
      if (watches.includes(cart.id) && before && before !== 'calm' && cart.status === 'calm') {
        const body = `${cart.area} · בערך ${cart.waitMinutes} דק׳ המתנה — זה הזמן לקפוץ ☕`
        showSystemNotification(`${cart.name} התפנתה! 🟢`, body)
        setToast({ id: Date.now(), emoji: '🔔', title: `${cart.name} התפנתה!`, subtitle: body, celebrate: true })
      }
    }
    prevStatuses.current = new Map(carts.map((c) => [c.id, c.status]))
  }, [carts, watches])

  async function handleToggleWatch(cart: CoffeeCart) {
    const watching = watches.includes(cart.id)
    setWatches(toggleWatch(cart.id))
    if (watching) {
      setToast({ id: Date.now(), emoji: '🔕', title: 'ההתראה בוטלה' })
      return
    }
    const permission = await ensureNotificationPermission()
    setToast({
      id: Date.now(),
      emoji: '🔔',
      title: `נודיע לך כש${cart.name} תתפנה`,
      subtitle:
        permission === 'granted'
          ? 'נשלח התראה גם כשהלשונית ברקע'
          : 'ההודעה תופיע כאן באפליקציה (התראות מערכת חסומות בדפדפן)',
    })
  }

  function handleRate(cartId: string, stars: number) {
    const result = rateCart(cartId, stars)
    setMyRatings(result.ratings)
    setPoints(result.points)
    setLifetimePoints(getLifetimePoints())
    setToast({
      id: Date.now(),
      emoji: '⭐',
      title: result.firstTime ? `תודה על הדירוג! +${RATING_POINTS} נק׳` : 'הדירוג עודכן',
      subtitle: `נתת ${stars} כוכבים`,
    })
  }

  function handleRedeem(reward: Reward) {
    const result = redeemReward(reward)
    if (!result) return null
    setPoints(result.points)
    return result.redemption
  }

  const closeOwner = useCallback(() => setOwnerOpen(false), [])

  function handleOwnerStatus(cartId: string, status: CrowdStatus, waitMinutes: number) {
    setCarts(ownerUpdateStatus(cartId, status, waitMinutes))
    setRoute(null)
    setToast({ id: Date.now(), emoji: '✔️', title: 'הסטטוס עודכן רשמית', subtitle: 'הלקוחות כבר רואים את זה במפה' })
  }

  function handleStartDeal(cartId: string, text: string, minutes: number) {
    setCarts(startFlashDeal(cartId, text, minutes))
    setNow(Date.now())
    setToast({ id: Date.now(), emoji: '🔥', title: 'הדיל באוויר!', subtitle: text, celebrate: true })
  }

  function handleEndDeal(cartId: string) {
    setCarts(endFlashDeal(cartId))
    setToast({ id: Date.now(), emoji: '👌', title: 'המבצע הסתיים' })
  }

  function handleResetDemo() {
    resetDemoData()
    setCarts(getCarts())
    setPoints(getPoints())
    setLifetimePoints(getLifetimePoints())
    setReports(getReports())
    setMyRatings(getMyRatings())
    setWatches(getWatches())
    setUnlockedIds([])
    setSelectedId(null)
    setDrawerOpen(false)
    setRoute(null)
    setOwnerOpen(false)
    setRewardsOpen(false)
    setAddOpen(false)
    setPickMode(false)
    setDraft(EMPTY_DRAFT)
    clearFilters()
    setRegion('all')
    setFitRequest({ id: Date.now(), points: getCarts().map((c) => c.coordinates) })
    setToast({ id: Date.now(), emoji: '🔄', title: 'נתוני הדמו אופסו', subtitle: 'הכל חזר למצב ההתחלתי' })
  }

  async function changeSort(next: SortOption) {
    if (next !== 'nearest' || userLocation) {
      setSort(next)
      return
    }
    // "Nearest" needs a real position — ask for it instead of guessing
    try {
      setUserLocation(await requestUserLocation())
      setSort('nearest')
    } catch (err) {
      setToast({
        id: Date.now(),
        emoji: '📍',
        title: 'כדי למיין לפי מרחק צריך מיקום',
        subtitle: LOCATION_ERROR_TEXT[err instanceof LocationError ? err.kind : 'unavailable'],
      })
    }
  }

  function chooseRegion(next: RegionFilter) {
    setRegion(next)
    setRoute(null)
    setDrawerOpen(false)
    setSelectedId(null)
    const points = (next === 'all' ? carts : carts.filter((c) => c.region === next)).map((c) => c.coordinates)
    setFitRequest({ id: Date.now(), points })
    if (isMobile()) setMobileView('map')
  }

  async function handleSearchArea(bounds: MapBounds) {
    setSearching(true)
    try {
      const found = await fetchCafesInBounds(bounds)
      const { carts: merged, added } = addCarts(found)
      setCarts(merged)
      if (added.length > 0 && region !== 'all' && added.some((c) => c.region !== region)) setRegion('all')
      setToast({
        id: Date.now(),
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
      setToast({
        id: Date.now(),
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
  }

  function openAddCart() {
    setAddOpen(true)
    setPickMode(false)
  }

  function startPickOnMap() {
    setAddOpen(false)
    setPickMode(true)
    setDrawerOpen(false)
    if (isMobile()) setMobileView('map')
  }

  const cancelPick = useCallback(() => {
    setPickMode(false)
    setAddOpen(true)
  }, [])

  function handlePick(loc: LatLng) {
    setDraft((d) => ({ ...d, lat: loc.lat.toFixed(5), lng: loc.lng.toFixed(5) }))
    setPickMode(false)
    setAddOpen(true)
  }

  const closeAdd = useCallback(() => setAddOpen(false), [])

  function handleAddCart() {
    const coordinates = draftCoordinates(draft)
    if (!coordinates) return
    const cart: CoffeeCart = {
      id: makeCartId('user'),
      name: draft.name.trim(),
      area: draft.area.trim() || 'נוסף ע״י משתמשים',
      description: draft.description.trim() || 'עגלה שנוספה ע״י הקהילה — עוד אין עליה הרבה מידע. נמצאים שם? דווחו!',
      coordinates,
      region: draft.region ?? regionForLatLng(coordinates),
      source: 'user',
      openingHours: 'שעות פתיחה לא ידועות',
      rating: 0,
      reviewCount: 0,
      status: draft.status,
      waitMinutes: { calm: 3, moderate: 10, busy: 22 }[draft.status],
      specialties: [],
      tags: draft.tags,
      lastUpdated: new Date().toISOString(),
      dataSource: 'live',
      fieldTags: [],
    }
    const { carts: merged, added } = addCarts([cart])
    if (added.length === 0) {
      setToast({ id: Date.now(), emoji: '📍', title: 'כבר יש עגלה בדיוק במיקום הזה', subtitle: 'אפשר לבחור נקודה אחרת על המפה' })
      return
    }
    setCarts(merged)
    setAddOpen(false)
    setDraft(EMPTY_DRAFT)
    clearFilters()
    if (region !== 'all' && region !== cart.region) setRegion('all')
    selectCart(cart.id)
    if (isMobile()) setMobileView('map')
    setToast({ id: Date.now(), emoji: '🎉', title: `${cart.name} נוספה למפה!`, subtitle: 'תודה שעזרת לקהילה ☕', celebrate: true })
  }

  const reportCart = carts.find((c) => c.id === reportCartId) ?? null

  function handleUserLocation(loc: LatLng) {
    setUserLocation(loc)
    setSort('nearest')
  }

  return (
    <div className="flex h-full flex-col">
      <Navbar
        freeCount={freeCount}
        onOpenOwner={() => setOwnerOpen(true)}
        onAddCart={openAddCart}
        points={points}
        onOpenRewards={() => setRewardsOpen(true)}
      />
      <FilterBar
        query={query}
        onQueryChange={setQuery}
        onlyFree={onlyFree}
        onToggleOnlyFree={() => setOnlyFree((v) => !v)}
        onlyDeals={onlyDeals}
        onToggleOnlyDeals={() => setOnlyDeals((v) => !v)}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        sort={sort}
        onSortChange={changeSort}
      />
      <RegionSelector value={region} onChange={chooseRegion} counts={regionCounts} />

      {/* Desktop: list on the right, map on the left (RTL grid). Mobile: one at a time. */}
      <main className="relative min-h-0 flex-1 overflow-hidden md:grid md:grid-cols-[400px_1fr]">
        <section
          aria-label="רשימת עגלות"
          className={`h-full overflow-y-auto pb-24 md:block md:border-e md:border-forest/10 md:pb-0 ${
            mobileView === 'list' ? 'block' : 'hidden'
          }`}
        >
          <div className="px-4 pt-3 text-sm text-ink/60">
            {visibleCarts.length === 0 ? (
              'לא מצאנו עגלות'
            ) : visibleCarts.length === 1 ? (
              'מצאנו עגלה אחת'
            ) : (
              <>
                מצאנו <span className="font-display font-bold text-forest">{visibleCarts.length}</span> עגלות
              </>
            )}
          </div>
          <CartList
            carts={visibleCarts}
            origin={origin}
            selectedId={selectedId}
            onSelect={selectFromList}
            onReport={setReportCartId}
            watches={watches}
            onClearFilters={clearFilters}
          />
          <footer className="border-t border-forest/10 px-4 py-4 text-center text-xs text-ink/40">
            <ResetDemoButton onReset={handleResetDemo} />
            <p className="mt-1">קפה פנוי · גרסת דמו</p>
          </footer>
        </section>

        <section
          aria-label="מפת עגלות"
          className={`h-full md:block ${mobileView === 'map' ? 'block' : 'hidden'}`}
        >
          <MapView
            carts={mapCarts}
            selectedId={selectedId}
            selectionNonce={selectionNonce}
            onSelect={selectCart}
            userLocation={userLocation}
            onUserLocation={handleUserLocation}
            route={route}
            drawerOpen={drawerOpen}
            now={now}
            fitRequest={fitRequest}
            onSearchArea={handleSearchArea}
            searching={searching}
            pickMode={pickMode}
            onPick={handlePick}
            onCancelPick={cancelPick}
          />
        </section>

        {drawerOpen && selectedCart && (
          <CartDetailsDrawer
            cart={selectedCart}
            distanceKm={origin ? distanceKm(origin, selectedCart.coordinates) : null}
            alternative={alternative}
            onClose={closeDrawer}
            onGoToAlternative={goToAlternative}
            onReport={() => setReportCartId(selectedCart.id)}
            onShare={() => handleShare(selectedCart)}
            myRating={myRatings[selectedCart.id]}
            onRate={(stars) => handleRate(selectedCart.id, stars)}
            watching={watches.includes(selectedCart.id)}
            onToggleWatch={() => handleToggleWatch(selectedCart)}
          />
        )}

        {/* Mobile map/list toggle */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-5 z-[1100] justify-center md:hidden ${
            drawerOpen && selectedCart ? 'hidden' : 'flex'
          }`}
        >
          <div className="pointer-events-auto flex rounded-full bg-forest p-1 shadow-xl">
            {(
              [
                ['map', 'מפה 🗺️'],
                ['list', 'רשימה 📋'],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                type="button"
                aria-pressed={mobileView === view}
                onClick={() => setMobileView(view)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  mobileView === view ? 'bg-cream text-forest' : 'text-cream/80 hover:text-cream'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {reportCart && <ReportModal key={reportCart.id} cart={reportCart} onClose={closeReport} onSubmit={handleReport} />}
      {rewardsOpen && (
        <RewardsModal
          points={points}
          lifetimePoints={lifetimePoints}
          reports={reports}
          carts={carts}
          onClose={closeRewards}
          onRedeem={handleRedeem}
        />
      )}
      {ownerOpen && (
        <OwnerDashboardModal
          carts={carts}
          onClose={closeOwner}
          onStatusUpdate={handleOwnerStatus}
          onStartDeal={handleStartDeal}
          onEndDeal={handleEndDeal}
          onResetDemo={handleResetDemo}
          unlockedIds={unlockedIds}
          onUnlock={(id) => setUnlockedIds((ids) => (ids.includes(id) ? ids : [...ids, id]))}
          onLock={(id) => setUnlockedIds((ids) => ids.filter((x) => x !== id))}
        />
      )}
      {addOpen && (
        <AddCartModal draft={draft} onChange={setDraft} onPickOnMap={startPickOnMap} onClose={closeAdd} onSubmit={handleAddCart} />
      )}
      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}
