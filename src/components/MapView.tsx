import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Crosshair, LocateFixed, Loader2, Search, X } from 'lucide-react'
import type { CoffeeCart, LatLng } from '../types/cart'
import { initialCarts } from '../data/initialCarts'
import { isDealActive } from '../services/cartService'
import { LOCATION_ERROR_TEXT, LocationError, requestUserLocation } from '../services/geo'
import type { MapBounds } from '../services/osmImportService'

export interface AltRoute {
  fromId: string
  from: LatLng
  to: LatLng
}

/** Ask the map to fit these points; `id` changes to re-trigger with the same points. */
export interface FitRequest {
  id: number
  points: LatLng[]
}

interface MapViewProps {
  carts: CoffeeCart[]
  selectedId: string | null
  /** Bumped on every selection, so re-selecting the same cart re-centers on it */
  selectionNonce: number
  onSelect: (id: string) => void
  userLocation: LatLng | null
  onUserLocation: (loc: LatLng) => void
  /** Dashed line from a busy cart to its smart alternative */
  route: AltRoute | null
  /** On mobile the details drawer covers the bottom of the map */
  drawerOpen: boolean
  /** Clock tick from App so flash-deal badges expire on time */
  now: number
  fitRequest: FitRequest | null
  /** "Search this area" — OSM import for the visible bounds */
  onSearchArea: (bounds: MapBounds) => void
  searching: boolean
  /** Add-cart flow: next map click picks a location */
  pickMode: boolean
  onPick: (loc: LatLng) => void
  onCancelPick: () => void
}

type Focus =
  | { kind: 'point'; at: LatLng }
  | { kind: 'route'; route: AltRoute }
  | { kind: 'bounds'; points: LatLng[] }

/** Share of the map height the mobile drawer covers (matches max-h-[72%]) */
const MOBILE_DRAWER_FRACTION = 0.62
/** Below this zoom, markers show only the wait pill to avoid overlapping names. */
const NAME_ZOOM = 13
/** Below this zoom (country view), markers shrink to status dots. */
const DOT_ZOOM = 10

const STATUS_DOT_COLOR = { calm: '#10B981', moderate: '#F59E0B', busy: '#E11D48' } as const

const toBounds = (points: LatLng[]) => L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
const INITIAL_BOUNDS = toBounds(initialCarts.map((c) => c.coordinates))

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function cartIcon(cart: CoffeeCart, selected: boolean, hasDeal: boolean): L.DivIcon {
  return L.divIcon({
    className: `cart-marker${selected ? ' cart-marker--selected' : ''}`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div class="cart-marker__inner" role="button" aria-label="${escapeHtml(cart.name)}, ${cart.waitMinutes} דקות המתנה${hasDeal ? ', דיל חם' : ''}">
        ${hasDeal ? '<span class="cart-marker__deal">🔥 דיל חם</span>' : ''}
        <div class="cart-marker__card">
          <span class="cart-marker__name">${escapeHtml(cart.name)}</span>
          <span class="cart-marker__pill cart-marker__pill--${cart.status}">${cart.waitMinutes} דק׳</span>
        </div>
        <div class="cart-marker__tip"></div>
        <div class="cart-marker__dot" style="background:${STATUS_DOT_COLOR[cart.status]}"></div>
      </div>`,
  })
}

const userIcon = L.divIcon({
  className: 'user-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span></span>',
})

/** Flies to the selected cart / user location / alt route / region, keeping it clear of the mobile drawer. */
function MapController({ focus, drawerOpen }: { focus: Focus | null; drawerOpen: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    map.invalidateSize() // container may have just become visible (mobile list → map)
    const size = map.getSize()
    const inset = drawerOpen && size.x < 768 ? Math.round(size.y * MOBILE_DRAWER_FRACTION) : 0

    if (focus.kind === 'route') {
      const { from, to } = focus.route
      map.flyToBounds(toBounds([from, to]), {
        paddingTopLeft: [60, 80],
        paddingBottomRight: [60, inset + 50],
        maxZoom: 15,
        duration: 1.1,
      })
    } else if (focus.kind === 'bounds') {
      if (focus.points.length === 0) return
      map.flyToBounds(toBounds(focus.points), {
        paddingTopLeft: [40, 70],
        paddingBottomRight: [40, inset + 40],
        maxZoom: 13,
        duration: 1.2,
      })
    } else {
      const zoom = Math.max(map.getZoom(), 14)
      const shifted = map.project([focus.at.lat, focus.at.lng], zoom).add([0, inset / 2])
      map.flyTo(map.unproject(shifted, zoom), zoom, { duration: 0.8 })
    }
    // drawerOpen is read at fly time only; toggling it alone shouldn't move the map
  }, [map, focus])
  return null
}

/** Keeps Leaflet's size in sync when the container is shown/resized (mobile toggle, desktop split). */
function ResizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  useEffect(() => onZoom(map.getZoom()), [map, onZoom])
  return null
}

function PickHandler({ active, onPick }: { active: boolean; onPick: (loc: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      if (active) onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function MapView({
  carts,
  selectedId,
  selectionNonce,
  onSelect,
  userLocation,
  onUserLocation,
  route,
  drawerOpen,
  now,
  fitRequest,
  onSearchArea,
  searching,
  pickMode,
  onPick,
  onCancelPick,
}: MapViewProps) {
  const [map, setMap] = useState<L.Map | null>(null)
  const [focus, setFocus] = useState<Focus | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(8)

  const selected = carts.find((c) => c.id === selectedId) ?? null

  useEffect(() => {
    if (route) setFocus({ kind: 'route', route })
    else if (selected) setFocus({ kind: 'point', at: selected.coordinates })
    // fly only when the selection/route itself changes, not when cart data updates
  }, [selectedId, selectionNonce, route])

  useEffect(() => {
    if (fitRequest) setFocus({ kind: 'bounds', points: fitRequest.points })
  }, [fitRequest])

  const icons = useMemo(
    () => new Map(carts.map((c) => [c.id, cartIcon(c, c.id === selectedId, isDealActive(c, now))])),
    [carts, selectedId, now],
  )

  function searchHere() {
    if (!map) return
    const b = map.getBounds()
    onSearchArea({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() })
  }

  async function locate() {
    setLocating(true)
    setLocateError(null)
    try {
      const loc = await requestUserLocation()
      onUserLocation(loc)
      setFocus({ kind: 'point', at: loc })
    } catch (err) {
      setLocateError(LOCATION_ERROR_TEXT[err instanceof LocationError ? err.kind : 'unavailable'])
    } finally {
      setLocating(false)
    }
  }

  const zoomClass = zoom < DOT_ZOOM ? ' map-dots map-compact' : zoom < NAME_ZOOM ? ' map-compact' : ''

  return (
    // LTR wrapper with explicit size — see CLAUDE.md §4
    <div dir="ltr" className={`relative h-full w-full${zoomClass}${pickMode ? ' map-picking' : ''}`}>
      <MapContainer
        ref={setMap}
        bounds={INITIAL_BOUNDS}
        boundsOptions={{ padding: [30, 30] }}
        zoomControl={false}
        className="h-full w-full"
      >
        {/* CartoDB Positron now serves an "API key required" placeholder, so we use the
            OpenStreetMap fallback (CLAUDE.md §2), softened in CSS to keep the Positron feel. */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <MapController focus={focus} drawerOpen={drawerOpen} />
        <ResizeWatcher />
        <ZoomWatcher onZoom={setZoom} />
        <PickHandler active={pickMode} onPick={onPick} />

        {carts.map((cart) => (
          <Marker
            key={cart.id}
            position={[cart.coordinates.lat, cart.coordinates.lng]}
            icon={icons.get(cart.id)}
            zIndexOffset={cart.id === selectedId ? 1000 : isDealActive(cart, now) ? 200 : cart.status === 'calm' ? 100 : 0}
            eventHandlers={{ click: () => !pickMode && onSelect(cart.id) }}
          />
        ))}

        {route && (
          <>
            <Polyline
              positions={[
                [route.from.lat, route.from.lng],
                [route.to.lat, route.to.lng],
              ]}
              pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9, lineCap: 'round' }}
            />
            <Polyline
              positions={[
                [route.from.lat, route.from.lng],
                [route.to.lat, route.to.lng],
              ]}
              pathOptions={{ color: '#10B981', weight: 4, dashArray: '10 10', lineCap: 'round', className: 'alt-route' }}
            />
          </>
        )}

        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />}
      </MapContainer>

      {/* Floating overlays — back to RTL */}
      <div dir="rtl" className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-16">
        {pickMode ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-forest py-1.5 ps-4 pe-1.5 text-sm font-bold text-cream shadow-lg">
            <Crosshair size={16} />
            לחצו על המפה כדי לסמן את מיקום העגלה
            <button
              type="button"
              onClick={onCancelPick}
              aria-label="ביטול בחירת מיקום"
              className="rounded-full bg-white/15 p-1.5 hover:bg-white/25"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={searchHere}
            disabled={searching}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-bold text-cream shadow-lg transition hover:bg-forest-light active:scale-95 disabled:opacity-80"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searching ? (
              'מחפשים ב-OpenStreetMap… (עד דקה)'
            ) : (
              <>
                <span className="sm:hidden">חפש בתי קפה באזור</span>
                <span className="hidden sm:inline">🔍 חפש עגלות ובתי קפה נוספים באזור זה</span>
              </>
            )}
          </button>
        )}
      </div>

      <div dir="rtl" className="pointer-events-none absolute top-3 left-3 z-[1000] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label="המיקום שלי"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white p-2.5 text-sm font-bold text-forest shadow-lg ring-1 ring-forest/10 transition hover:bg-cream active:scale-95 disabled:opacity-70 sm:px-4"
        >
          {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          <span className="hidden sm:inline">המיקום שלי 📍</span>
        </button>
        {locateError && (
          <div className="pointer-events-auto max-w-xs rounded-xl bg-white px-3 py-2 text-sm text-ink shadow-lg">
            {locateError}
          </div>
        )}
      </div>
    </div>
  )
}
