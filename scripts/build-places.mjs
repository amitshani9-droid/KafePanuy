#!/usr/bin/env node
/**
 * Builds public/data/places.json from an `osmium export -f geojsonseq -a type,id` file.
 * Run by .github/workflows/places.yml on the Geofabrik Israel extract.
 *
 *   node scripts/build-places.mjs <input.geojsonseq> <output.json>
 *
 * Output: { generated, attribution, places: [[ "n123", lat, lng, {tags} ], ...] }
 * The app turns each row into an Overpass-style element and runs the same parser.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const KEEP_TAGS = [
  'name',
  'name:he',
  'name:en',
  'amenity',
  'shop',
  'street_vendor',
  'cuisine',
  'opening_hours',
  'addr:street',
  'addr:housenumber',
  'addr:city',
]

export function isCoffeePlace(t) {
  if (t.disused === 'yes' || t['disused:amenity'] || t['abandoned:amenity']) return false
  const coffee = /coffee/.test(t.cuisine ?? '')
  const named = Boolean(t.name || t['name:he'])
  if (t.amenity === 'cafe' || t.shop === 'coffee') return named
  if ((t.amenity === 'fast_food' || t.amenity === 'kiosk') && coffee) return named
  if (t.street_vendor === 'yes' && coffee) return true
  return false
}

/** A representative point: the point itself, or the average of a polygon's outer ring */
export function representativePoint(geometry) {
  if (!geometry) return null
  if (geometry.type === 'Point') return geometry.coordinates
  let ring
  if (geometry.type === 'Polygon') ring = geometry.coordinates[0]
  else if (geometry.type === 'MultiPolygon') ring = geometry.coordinates[0]?.[0]
  else if (geometry.type === 'LineString') ring = geometry.coordinates
  if (!ring?.length) return null
  const pts = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return [lng, lat]
}

const TYPE_CODE = { node: 'n', way: 'w', relation: 'r' }

export function buildPlaces(text) {
  const places = []
  const seen = new Set()
  // geojsonseq lines may start with the RS (0x1e) record separator
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^\x1e/, '').trim()
    if (!line) continue
    let f
    try {
      f = JSON.parse(line)
    } catch {
      continue
    }
    const p = f.properties ?? {}
    if (!isCoffeePlace(p)) continue
    const code = TYPE_CODE[p['@type']]
    if (!code || p['@id'] == null) continue
    const id = `${code}${p['@id']}`
    if (seen.has(id)) continue
    const pt = representativePoint(f.geometry)
    if (!pt) continue
    seen.add(id)
    const tags = {}
    for (const k of KEEP_TAGS) if (p[k]) tags[k] = p[k]
    places.push([id, Math.round(pt[1] * 1e5) / 1e5, Math.round(pt[0] * 1e5) / 1e5, tags])
  }
  places.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return places
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output) {
    console.error('usage: build-places.mjs <input.geojsonseq> <output.json>')
    process.exit(2)
  }
  const places = buildPlaces(readFileSync(input, 'utf8'))
  if (places.length < 100) {
    console.error(`Only ${places.length} places — refusing to overwrite (bad extract?)`)
    process.exit(1)
  }
  const out = {
    generated: new Date().toISOString(),
    attribution: '© OpenStreetMap contributors (ODbL)',
    places,
  }
  writeFileSync(output, JSON.stringify(out) + '\n')
  console.log(`Wrote ${places.length} places to ${output}`)
}
