export type PlaceKind = 'cafe' | 'cart'

export type Level = 'calm' | 'moderate' | 'busy'

export interface Place {
  /** Stable key: "osm:node/123" or "user:<uuid>" */
  key: string
  name: string
  kind: PlaceKind
  lat: number
  lng: number
  /** Raw OSM opening_hours string, if known */
  openingHours?: string
  address?: string
  source: 'osm' | 'user'
}

/** A crowd report submitted by someone at the place */
export interface Report {
  placeKey: string
  level: Level
  createdAt: number // epoch ms
}

/** Live aggregate for one place from recent reports */
export interface LiveStatus {
  placeKey: string
  /** Weighted score 0–100 */
  score: number
  reports: number
  lastAt: number // epoch ms
}

/** Learned typical busyness from past reports: score per [dayOfWeek][hour] with sample counts */
export interface LearnedProfile {
  placeKey: string
  /** key `${dow}-${hour}` → { score, n } */
  slots: Record<string, { score: number; n: number }>
}

export type StatusSource = 'live' | 'learned' | 'estimate' | 'closed'

export interface PlaceStatus {
  level: Level | null // null when closed
  score: number // 0–100
  source: StatusSource
  /** For live: minutes since last report */
  minutesAgo?: number
  reports?: number
}
