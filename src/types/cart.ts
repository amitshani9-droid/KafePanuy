export type CrowdStatus = 'calm' | 'moderate' | 'busy'

export type FilterTag = 'cyclist' | 'dogs' | 'kids' | 'shaded' | 'vegan'

/** 'live' = a recent field report; 'estimate' = predicted from typical busy hours */
export type DataSource = 'live' | 'estimate'

export type SortOption = 'freest' | 'nearest' | 'rating'

export type Region = 'sharon' | 'north' | 'center' | 'south'

/** curated = hand-picked seed data; osm = imported from OpenStreetMap; user = added in the app */
export type CartSource = 'curated' | 'osm' | 'user'

export interface LatLng {
  lat: number
  lng: number
}

export interface CoffeeCart {
  id: string
  name: string
  /** Other spellings people search for, e.g. the English name */
  aliases?: string[]
  /** Short place name shown under the cart name, e.g. "חוף בית ינאי" */
  area: string
  description: string
  coordinates: LatLng
  region: Region
  source: CartSource
  openingHours: string
  /** 0 with reviewCount 0 means "not rated yet" (OSM / user-added carts) */
  rating: number
  reviewCount: number
  status: CrowdStatus
  waitMinutes: number
  specialties: string[]
  tags: FilterTag[]
  /** ISO timestamp of the last crowd update */
  lastUpdated: string
  dataSource: DataSource
  /** Short live notes from people on site, e.g. "נשארו מאפים חמים 🥐" */
  fieldTags: string[]
  /** Latest free-text tip from a field report */
  latestTip?: string
  /** True when the current status was set by the cart owner (cleared by the next field report) */
  ownerVerified?: boolean
  /** True when the latest live report was submitted within 350m of the cart */
  verifiedGps?: boolean
  imageUrl?: string
  flashDeal?: FlashDeal
}

export interface FlashDeal {
  text: string
  /** ISO timestamp; the deal is inactive once this passes */
  expiresAt: string
}

export interface FieldReport {
  id: string
  cartId: string
  status: CrowdStatus
  waitMinutes: number
  fieldTags: string[]
  note?: string
  pointsEarned: number
  createdAt: string
  verifiedGps?: boolean
  imageUrl?: string
  likesCount?: number
}

export type ReportInput = Pick<
  FieldReport,
  'cartId' | 'status' | 'waitMinutes' | 'fieldTags' | 'note' | 'verifiedGps' | 'imageUrl'
>

export interface Reward {
  id: string
  title: string
  description: string
  cost: number
  emoji: string
}

export interface Redemption {
  id: string
  rewardId: string
  code: string
  createdAt: string
}
