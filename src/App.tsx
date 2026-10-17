import { useCallback, useMemo, useState } from 'react'
import type { CoffeeCart, LatLng, ReportInput, SortOption } from './types/cart'
import type { RegionFilter } from './data/regions'
import { distanceKm, LOCATION_ERROR_TEXT, LocationError, requestUserLocation } from './services/geo'
import { findSmartAlternative } from './utils/recommendations'
import { shareCart } from './utils/share'
import { useToast } from './hooks/useToast'
import { useNow } from './hooks/useNow'
import { useKafeStore } from './hooks/useKafeStore'
import { useCartFilters } from './hooks/useCartFilters'
import { useSelection } from './hooks/useSelection'
import { useTheme } from './hooks/useTheme'
import { MOBILE_QUERY, useMediaQuery } from './hooks/useMediaQuery'
import { useAreaSearch } from './hooks/useAreaSearch'
import { useAddCartFlow } from './hooks/useAddCartFlow'
import MapView, { type FitRequest } from './components/MapView'
import Navbar from './components/Navbar'
import ListPanel from './components/ListPanel'
import CartDetailsDrawer from './components/CartDetailsDrawer'
import BottomTabs, { type MobileTab } from './components/BottomTabs'
import MobileMapOverlay, { MOBILE_OVERLAY_HEIGHT } from './components/MobileMapOverlay'
import MoreScreen from './components/MoreScreen'
import FiltersSheet from './components/FiltersSheet'
import ReportModal from './components/ReportModal'
import RewardsModal, { WalletContent } from './components/RewardsModal'
import OwnerDashboardModal from './components/OwnerDashboardModal'
import AddCartModal from './components/AddCartModal'
import ResetDemoButton from './components/ResetDemoButton'
import Toast from './components/Toast'

export default function App() {
  const { toast, notify, clear: clearToast } = useToast()
  const store = useKafeStore(notify)
  const [now, setNow] = useNow()
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const filters = useCartFilters(store.carts, now, userLocation)
  const selection = useSelection(store.carts, store.loading)
  const theme = useTheme()
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const [tab, setTab] = useState<MobileTab>('map')
  const [fitRequest, setFitRequest] = useState<FitRequest | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [reportCartId, setReportCartId] = useState<string | null>(null)
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  /** Carts unlocked with their owner PIN for this visit only */
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])

  const fitTo = useCallback((carts: CoffeeCart[]) => {
    setFitRequest({ id: Date.now(), points: carts.map((c) => c.coordinates) })
  }, [])

  /** Opens a cart; on phones that means the map tab with its sheet. */
  const openCart = useCallback(
    (id: string) => {
      selection.select(id)
      setTab('map')
    },
    [selection],
  )

  const areaSearch = useAreaSearch(store.addCarts, notify, (added) => {
    if (filters.region !== 'all' && added.some((c) => c.region !== filters.region)) filters.setRegion('all')
  })

  const addFlow = useAddCartFlow(store.addCarts, notify, (cart) => {
    filters.clearFilters()
    if (filters.region !== 'all' && filters.region !== cart.region) filters.setRegion('all')
    openCart(cart.id)
  })

  const selectedCart = selection.selectedCart
  const alternative = useMemo(
    () => (selectedCart ? findSmartAlternative(selectedCart, store.carts) : null),
    [selectedCart, store.carts],
  )

  // Keep the open cart (and the alternative route's origin) on the map even if filters hide it
  const mapCarts = useMemo(() => {
    const extra = store.carts.filter(
      (c) =>
        !filters.visibleCarts.includes(c) &&
        ((selection.drawerOpen && c.id === selection.selectedId) || c.id === selection.route?.fromId),
    )
    return extra.length ? [...filters.visibleCarts, ...extra] : filters.visibleCarts
  }, [store.carts, filters.visibleCarts, selection.drawerOpen, selection.selectedId, selection.route])

  function chooseRegion(next: RegionFilter) {
    filters.setRegion(next)
    selection.clear()
    fitTo(next === 'all' ? store.carts : store.carts.filter((c) => c.region === next))
  }

  async function changeSort(next: SortOption) {
    if (next !== 'nearest' || userLocation) {
      filters.setSort(next)
      return
    }
    // "Nearest" needs a real position — ask for it instead of guessing
    try {
      setUserLocation(await requestUserLocation())
      filters.setSort('nearest')
    } catch (err) {
      notify({
        emoji: '📍',
        title: 'כדי למיין לפי מרחק צריך מיקום',
        subtitle: LOCATION_ERROR_TEXT[err instanceof LocationError ? err.kind : 'unavailable'],
      })
    }
  }

  async function handleReport(input: ReportInput) {
    await store.submitReport(input)
    setReportCartId(null)
    selection.setRoute(null)
  }

  async function handleShare(cart: CoffeeCart) {
    const result = await shareCart(cart)
    if (result === 'copied') notify({ emoji: '🔗', title: 'הקישור הועתק', subtitle: 'אפשר להדביק בוואטסאפ או בכל מקום' })
    if (result === 'failed') notify({ emoji: '😕', title: 'לא הצלחנו לשתף', subtitle: 'אפשר להעתיק את הכתובת משורת הכתובת' })
  }

  async function handleResetDemo() {
    const snapshot = await store.reset()
    selection.clear()
    filters.clearFilters()
    filters.setRegion('all')
    addFlow.reset()
    setUnlockedIds([])
    setOwnerOpen(false)
    setRewardsOpen(false)
    setFiltersOpen(false)
    setTab('map')
    fitTo(snapshot.carts)
  }

  function showFreeList() {
    filters.setOnlyFree(true)
    setTab('list')
  }

  const drawerVisible = selection.drawerOpen && selectedCart !== null && (!isMobile || tab === 'map')

  const mapView = (
    <MapView
      carts={mapCarts}
      selectedId={selection.selectedId}
      selectionNonce={selection.selectionNonce}
      onSelect={selection.select}
      userLocation={userLocation}
      onUserLocation={(loc) => {
        setUserLocation(loc)
        filters.setSort('nearest')
      }}
      route={selection.route}
      drawerOpen={drawerVisible}
      now={now}
      fitRequest={fitRequest}
      onSearchArea={areaSearch.searchArea}
      searching={areaSearch.searching}
      pickMode={addFlow.pickMode}
      onPick={addFlow.pick}
      onCancelPick={addFlow.cancelPick}
      topInset={isMobile && !addFlow.pickMode ? MOBILE_OVERLAY_HEIGHT : 12}
      bottomInset={16}
    />
  )

  const drawer = drawerVisible && selectedCart && (
    <CartDetailsDrawer
      cart={selectedCart}
      distanceKm={userLocation ? distanceKm(userLocation, selectedCart.coordinates) : null}
      alternative={alternative}
      onClose={selection.close}
      onGoToAlternative={(alt) => selection.goToAlternative(selectedCart, alt)}
      onReport={() => setReportCartId(selectedCart.id)}
      onShare={() => handleShare(selectedCart)}
      myRating={store.myRatings[selectedCart.id]}
      onRate={(stars) => store.rate(selectedCart.id, stars)}
      watching={store.watches.includes(selectedCart.id)}
      onToggleWatch={() => store.toggleWatch(selectedCart)}
    />
  )

  const listPanel = (variant: 'mobile' | 'desktop') => (
    <ListPanel
      variant={variant}
      filters={filters}
      loading={store.loading}
      origin={userLocation}
      selectedId={selection.selectedId}
      watches={store.watches}
      onSelect={openCart}
      onReport={setReportCartId}
      onOpenFilters={() => setFiltersOpen(true)}
      onRegionChange={chooseRegion}
      onSortChange={changeSort}
      footer={
        variant === 'desktop' && (
          <footer className="border-t border-forest/10 px-4 py-4 text-center text-xs text-ink/40">
            <ResetDemoButton onReset={handleResetDemo} />
            <p className="mt-1">קפה פנוי · גרסת דמו</p>
          </footer>
        )
      }
    />
  )

  const reportCart = store.carts.find((c) => c.id === reportCartId) ?? null

  return (
    <div className="flex h-full flex-col">
      {isMobile ? (
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {/* The map stays mounted across tabs so it keeps its position */}
          <section aria-label="מפת עגלות" className={tab === 'map' ? 'absolute inset-0' : 'hidden'}>
            {mapView}
            {!addFlow.pickMode && (
              <MobileMapOverlay
                filters={filters}
                onOpenFilters={() => setFiltersOpen(true)}
                hideCounter={drawerVisible}
                onShowFree={showFreeList}
              />
            )}
          </section>
          {tab === 'list' && <section className="h-full" aria-label="רשימת עגלות">{listPanel('mobile')}</section>}
          {tab === 'wallet' && (
            <section className="h-full overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8" aria-label="ארנק">
              <h1 className="mb-4 font-display text-2xl font-bold text-forest">ארנק נקודות הקפה ☕</h1>
              <WalletContent
                points={store.points}
                lifetimePoints={store.lifetimePoints}
                reports={store.reports}
                carts={store.carts}
                onRedeem={store.redeem}
              />
            </section>
          )}
          {tab === 'more' && (
            <MoreScreen
              points={store.points}
              lifetimePoints={store.lifetimePoints}
              theme={theme.choice}
              onThemeChange={theme.setChoice}
              onOpenWallet={() => setTab('wallet')}
              onAddCart={addFlow.start}
              onOpenOwner={() => setOwnerOpen(true)}
              onResetDemo={handleResetDemo}
            />
          )}
          {drawer}
        </main>
      ) : (
        <>
          <Navbar
            freeCount={filters.freeCount}
            points={store.points}
            theme={theme.choice}
            onCycleTheme={theme.cycle}
            onOpenOwner={() => setOwnerOpen(true)}
            onAddCart={addFlow.start}
            onOpenRewards={() => setRewardsOpen(true)}
          />
          {/* RTL grid: list on the right, map on the left */}
          <main className="relative grid min-h-0 flex-1 grid-cols-[400px_1fr] overflow-hidden">
            <section aria-label="רשימת עגלות" className="min-h-0 border-e border-forest/10">
              {listPanel('desktop')}
            </section>
            <section aria-label="מפת עגלות" className="h-full">
              {mapView}
            </section>
            {drawer}
          </main>
        </>
      )}

      {isMobile && !addFlow.pickMode && <BottomTabs tab={tab} onChange={setTab} points={store.points} />}

      {filtersOpen && (
        <FiltersSheet
          filters={filters}
          onRegionChange={chooseRegion}
          onSortChange={changeSort}
          onClose={() => setFiltersOpen(false)}
        />
      )}
      {reportCart && (
        <ReportModal key={reportCart.id} cart={reportCart} onClose={() => setReportCartId(null)} onSubmit={handleReport} />
      )}
      {rewardsOpen && (
        <RewardsModal
          points={store.points}
          lifetimePoints={store.lifetimePoints}
          reports={store.reports}
          carts={store.carts}
          onClose={() => setRewardsOpen(false)}
          onRedeem={store.redeem}
        />
      )}
      {ownerOpen && (
        <OwnerDashboardModal
          carts={store.carts}
          onClose={() => setOwnerOpen(false)}
          onStatusUpdate={(id, status, wait) => {
            selection.setRoute(null)
            void store.ownerUpdateStatus(id, status, wait)
          }}
          onStartDeal={async (id, text, minutes) => {
            await store.startDeal(id, text, minutes)
            setNow(Date.now())
          }}
          onEndDeal={store.endDeal}
          onResetDemo={handleResetDemo}
          unlockedIds={unlockedIds}
          onUnlock={(id) => setUnlockedIds((ids) => (ids.includes(id) ? ids : [...ids, id]))}
          onLock={(id) => setUnlockedIds((ids) => ids.filter((x) => x !== id))}
        />
      )}
      {addFlow.open && (
        <AddCartModal
          draft={addFlow.draft}
          onChange={addFlow.setDraft}
          onPickOnMap={() => {
            selection.close()
            setTab('map')
            addFlow.startPick()
          }}
          onClose={addFlow.close}
          onSubmit={addFlow.submit}
        />
      )}
      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}

