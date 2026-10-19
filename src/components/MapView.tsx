import { memo, useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Bounds, LatLng } from '../lib/geo'
import type { RankedPlace } from '../lib/rank'
import { readJson, writeJson } from '../lib/storage'
import { LEVEL_LABEL } from '../lib/busyness'

const VIEW_KEY = 'kafe-panuy:last-view'
const DEFAULT_VIEW = { lat: 32.0853, lng: 34.7818, zoom: 15 }

export interface FlyTarget extends LatLng {
  zoom?: number
  /** Changes on every request so the same spot can be flown to twice */
  nonce: number
}

interface Props {
  items: RankedPlace[]
  selectedKey: string | null
  userPos: LatLng | null
  flyTo: FlyTarget | null
  /** Extra bottom padding (px) so flown-to pins aren't hidden under the sheet */
  bottomInset: number
  onSelect: (key: string | null) => void
  onBounds: (b: Bounds, center: LatLng) => void
  /** Gives the parent the Leaflet map (to read the point under the add-place crosshair) */
  onMap?: (map: L.Map) => void
}

const CUP =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>'

const iconCache = new Map<string, L.DivIcon>()
function pinIcon(level: string, kind: string, selected: boolean): L.DivIcon {
  const id = `${level}|${kind}|${selected}`
  let icon = iconCache.get(id)
  if (!icon) {
    // Selected pins grow via CSS transform, so the anchor stays the same
    icon = L.divIcon({
      className: 'pin',
      html: `<div class="pin-body pin-${level} ${kind}${selected ? ' selected' : ''}">${CUP}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })
    iconCache.set(id, icon)
  }
  return icon
}

const meIcon = L.divIcon({ className: 'pin', html: '<div class="me-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })

function toBounds(map: L.Map): Bounds {
  const b = map.getBounds()
  return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }
}

function Events({ onBounds, onSelect }: Pick<Props, 'onBounds' | 'onSelect'>) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter()
      onBounds(toBounds(map), { lat: c.lat, lng: c.lng })
      writeJson(VIEW_KEY, { lat: c.lat, lng: c.lng, zoom: map.getZoom() })
    },
    click: () => onSelect(null),
  })
  useEffect(() => {
    const c = map.getCenter()
    onBounds(toBounds(map), { lat: c.lat, lng: c.lng })
  }, [])
  return null
}

function MapRef({ onMap }: { onMap?: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onMap?.(map)
  }, [map, onMap])
  return null
}

function Flyer({ target, bottomInset }: { target: FlyTarget | null; bottomInset: number }) {
  const map = useMap()
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!target || target.nonce === last.current) return
    last.current = target.nonce
    const zoom = target.zoom ?? Math.max(map.getZoom(), 16)
    // Aim above the sheet: shift the center down by half the covered area
    const point = map.project([target.lat, target.lng], zoom).add([0, bottomInset / 2])
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.6 })
  }, [target, bottomInset, map])
  return null
}

function MapViewInner({ items, selectedKey, userPos, flyTo, bottomInset, onSelect, onBounds, onMap }: Props) {
  const initial = useMemo(() => readJson(VIEW_KEY, DEFAULT_VIEW), [])

  return (
    <div dir="ltr" className="absolute inset-0">
      <MapContainer
        center={[initial.lat, initial.lng]}
        zoom={initial.zoom}
        minZoom={8}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <Events onBounds={onBounds} onSelect={onSelect} />
        <MapRef onMap={onMap} />
        <Flyer target={flyTo} bottomInset={bottomInset} />
        {items.map(({ place, status }) => {
          const selected = place.key === selectedKey
          return (
            <Marker
              key={place.key}
              position={[place.lat, place.lng]}
              icon={pinIcon(status.level ?? 'closed', place.kind, selected)}
              zIndexOffset={selected ? 1000 : status.level === 'calm' ? 300 : status.level ? 200 : 0}
              title={`${place.name} — ${status.level ? LEVEL_LABEL[status.level] : 'סגור'}`}
              keyboard
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e)
                  onSelect(place.key)
                },
              }}
            />
          )
        })}
        {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={meIcon} interactive={false} />}
      </MapContainer>
    </div>
  )
}

export const MapView = memo(MapViewInner)
