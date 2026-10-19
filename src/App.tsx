import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type L from 'leaflet'
import { LocateFixed, Loader2, Plus, RefreshCw } from 'lucide-react'
import type { Level, PlaceKind } from './types'
import { MapView, type FlyTarget } from './components/MapView'
import { Sheet, snapHeight, type Snap } from './components/Sheet'
import { TopBar } from './components/TopBar'
import { PlaceList } from './components/PlaceList'
import { PlaceDetail } from './components/PlaceDetail'
import { AddCrosshair, AddPlaceForm } from './components/AddPlace'
import { Toast } from './components/Toast'
import { usePlaces } from './hooks/usePlaces'
import { useCrowd } from './hooks/useCrowd'
import { useGeolocation } from './hooks/useGeolocation'
import { useNow } from './hooks/useNow'
import { useViewport } from './hooks/useViewport'
import { computeStatus } from './lib/busyness'
import { calmerNearby, rankPlaces, type Filters } from './lib/rank'
import { distanceKm, type Bounds, type LatLng } from './lib/geo'
import { addPlace, BackendError, isShared } from './lib/backend'

function padded(b: Bounds, f = 0.2): Bounds {
  const dLat = (b.north - b.south) * f
  const dLng = (b.east - b.west) * f
  return { south: b.south - dLat, north: b.north + dLat, west: b.west - dLng, east: b.east + dLng }
}

export default function App() {
  const now = useNow()
  const { height: viewportH, isDesktop } = useViewport()
  const geo = useGeolocation()

  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [center, setCenter] = useState<LatLng | null>(null)
  const [filters, setFilters] = useState<Filters>({ kind: 'all', calmOnly: false })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [snap, setSnap] = useState<Snap>('peek')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const { places, state: placesState, retry, addLocal } = usePlaces(bounds)

  // Places on (or just around) the screen
  const visible = useMemo(() => {
    if (!bounds) return []
    const b = padded(bounds)
    return [...places.values()].filter(
      (p) => p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east,
    )
  }, [places, bounds])

  const visibleKeys = useMemo(() => visible.map((p) => p.key), [visible])
  const crowd = useCrowd(visibleKeys)

  // Distances from the user when they're in the area, else from the map center
  const origin = useMemo(() => {
    if (geo.position && center && distanceKm(geo.position, center) < 25) return geo.position
    return center
  }, [geo.position, center])

  const withStatus = useMemo(
    () =>
      visible.map((place) => ({
        place,
        status: computeStatus(place, now, { reports: crowd.live.get(place.key), profile: crowd.profiles.get(place.key) }),
      })),
    [visible, now, crowd.live, crowd.profiles],
  )

  const ranked = useMemo(() => rankPlaces(withStatus, origin, filters), [withStatus, origin, filters])
  const allRanked = useMemo(
    () => rankPlaces(withStatus, origin, { kind: 'all', calmOnly: false }),
    [withStatus, origin],
  )

  // The selected place stays shown even if a filter would hide it
  const selected = useMemo(() => allRanked.find((r) => r.place.key === selectedKey) ?? null, [allRanked, selectedKey])
  const alternative = useMemo(() => (selected ? calmerNearby(selected, allRanked) : null), [selected, allRanked])
  const mapItems = useMemo(
    () => (selected && !ranked.some((r) => r.place.key === selected.place.key) ? [...ranked, selected] : ranked),
    [ranked, selected],
  )

  const counts = useMemo(() => {
    let calm = 0
    let busy = 0
    for (const r of allRanked) {
      if (r.status.level === 'calm') calm++
      else if (r.status.level === 'busy') busy++
    }
    return { calm, busy }
  }, [allRanked])

  const sheetH = isDesktop ? 0 : snapHeight(snap, viewportH, Boolean(selected) && !adding)
  // The add-place crosshair sits in the middle of the map area left visible above the sheet
  const crosshairTop = isDesktop ? '50%' : Math.round((viewportH - sheetH) / 2)
  const mapRef = useRef<L.Map | null>(null)
  const onMap = useCallback((m: L.Map) => {
    mapRef.current = m
  }, [])

  // Ask for location once on load; fly there on the first fix
  const flewToUser = useRef(false)
  useEffect(() => {
    geo.locate()
  }, [])
  useEffect(() => {
    if (geo.position && !flewToUser.current) {
      flewToUser.current = true
      setFlyTo({ ...geo.position, zoom: 15, nonce: Date.now() })
    }
  }, [geo.position])

  const onBounds = useCallback((b: Bounds, c: LatLng) => {
    setBounds(b)
    setCenter(c)
  }, [])

  const select = useCallback(
    (key: string | null) => {
      setSelectedKey(key)
      if (!key) return
      setAdding(false)
      setSnap((s) => (s === 'min' ? 'peek' : s))
      const p = places.get(key)
      if (p) setFlyTo({ lat: p.lat, lng: p.lng, nonce: Date.now() })
    },
    [places],
  )

  const report = useCallback(
    async (key: string, level: Level) => {
      await crowd.report(key, level)
      setToast(isShared() ? 'הדיווח נשלח — תודה!' : 'הדיווח נשמר')
    },
    [crowd],
  )

  const locate = () => {
    if (geo.position) setFlyTo({ ...geo.position, zoom: 16, nonce: Date.now() })
    else geo.locate()
    if (geo.state === 'denied') setToast('אין גישה למיקום — אפשרו אותה בהגדרות הדפדפן')
  }

  const startAdd = () => {
    setSelectedKey(null)
    setAddError(null)
    setAdding(true)
    setSnap('peek')
  }

  const saveNew = async ({ name, kind }: { name: string; kind: PlaceKind }) => {
    const map = mapRef.current
    if (!map) return
    const size = map.getSize()
    const y = typeof crosshairTop === 'number' ? crosshairTop : size.y / 2
    const at = map.containerPointToLatLng([size.x / 2, y])
    setAddError(null)
    try {
      const place = await addPlace({ name, kind, lat: at.lat, lng: at.lng })
      addLocal(place)
      setAdding(false)
      setSelectedKey(place.key)
      setToast(`${name} נוסף למפה`)
    } catch (e) {
      const kind = e instanceof BackendError ? e.kind : 'network'
      setAddError(
        kind === 'duplicate'
          ? 'כבר יש מקום בדיוק בנקודה הזו.'
          : kind === 'rate-limited'
            ? 'הוספת הרבה מקומות היום. נסו שוב מחר.'
            : 'לא הצלחנו לשמור — בדקו את החיבור ונסו שוב.',
      )
    }
  }

  const listHeading = origin === geo.position && geo.position ? 'פנוי עכשיו, קרוב אליך' : 'פנוי עכשיו באזור'

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ ['--sheet-h' as string]: `${sheetH}px` }}
    >
      <MapView
        items={mapItems}
        selectedKey={selectedKey}
        userPos={geo.position}
        flyTo={flyTo}
        bottomInset={sheetH}
        onSelect={select}
        onBounds={onBounds}
        onMap={onMap}
      />

      <TopBar filters={filters} onChange={setFilters} calmCount={counts.calm} />
      {adding && <AddCrosshair top={crosshairTop} />}
      <Toast message={toast} onDone={() => setToast(null)} />

      {/* Floating map buttons, kept above the sheet */}
      <div
        className={`absolute end-3 z-[1050] flex flex-col gap-2 transition-[bottom] duration-200 md:end-4 ${
          !isDesktop && snap === 'full' ? 'hidden' : ''
        }`}
        style={{ bottom: isDesktop ? 28 : sheetH + 12 }}
      >
        {!adding && (
          <button
            type="button"
            onClick={startAdd}
            aria-label="הוספת עגלה או בית קפה שחסרים במפה"
            className="grid size-12 place-items-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-line"
          >
            <Plus className="size-5" />
          </button>
        )}
        <button
          type="button"
          onClick={locate}
          aria-label="המיקום שלי"
          className="grid size-12 place-items-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-line"
        >
          {geo.state === 'locating' ? <Loader2 className="size-5 animate-spin" /> : <LocateFixed className="size-5" />}
        </button>
      </div>

      <Sheet snap={snap} onSnap={setSnap} viewportH={viewportH} isDesktop={isDesktop} tall={Boolean(selected) && !adding}>
        {adding ? (
          <AddPlaceForm onCancel={() => setAdding(false)} onSave={saveNew} error={addError} />
        ) : selected ? (
          <PlaceDetail
            key={selected.place.key}
            item={selected}
            profile={crowd.profiles.get(selected.place.key)}
            alternative={alternative}
            now={now}
            onClose={() => {
              setSelectedKey(null)
              setSnap('peek')
            }}
            onSelect={select}
            onReport={report}
          />
        ) : (
          <div className="pb-6">
            <div className="flex items-baseline justify-between gap-2 px-4">
              <h2 className="text-lg font-bold">{listHeading}</h2>
              {allRanked.length > 0 && (
                <p className="shrink-0 text-sm text-muted tabular-nums">
                  {counts.calm} פנויים · {counts.busy} עמוסים
                </p>
              )}
            </div>
            <ListState state={placesState} onRetry={retry} empty={ranked.length === 0} calmOnly={filters.calmOnly} onAdd={startAdd} />
            <div className="mt-1">
              <PlaceList items={ranked} onSelect={select} limit={60} />
            </div>
            {!isShared() && ranked.length > 0 && (
              <p className="px-4 pt-4 text-center text-xs text-muted">
                מצב מקומי: דיווחים נשמרים רק במכשיר הזה עד שיחובר שרת.
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}

function ListState({
  state,
  onRetry,
  empty,
  calmOnly,
  onAdd,
}: {
  state: string
  onRetry: () => void
  empty: boolean
  calmOnly: boolean
  onAdd: () => void
}) {
  const box = 'mx-4 mt-3 rounded-2xl bg-page px-4 py-3 text-sm'
  if (state === 'loading' && empty) {
    return (
      <p className={`${box} flex items-center gap-2 text-muted`}>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        מחפשים בתי קפה ועגלות באזור…
      </p>
    )
  }
  if (state === 'too-large') {
    return <p className={`${box} text-muted`}>התקרבו במפה כדי לראות בתי קפה ועגלות.</p>
  }
  if (state === 'busy' || state === 'network') {
    return (
      <div className={`${box} flex items-center justify-between gap-3`}>
        <span className="text-muted">
          {state === 'busy' ? 'שרת המפות עמוס כרגע.' : 'אין חיבור לשרת המפות.'}
        </span>
        <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-semibold">
          <RefreshCw className="size-4" aria-hidden />
          לנסות שוב
        </button>
      </div>
    )
  }
  if (empty && state === 'ready') {
    return (
      <div className={`${box} text-muted`}>
        {calmOnly ? 'אין כרגע מקומות פנויים באזור הזה.' : 'לא מצאנו פה בתי קפה או עגלות.'}{' '}
        <button type="button" onClick={onAdd} className="font-semibold text-ink underline">
          מכירים מקום? הוסיפו אותו
        </button>
      </div>
    )
  }
  return null
}
