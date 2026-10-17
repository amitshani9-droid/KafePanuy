import type { CrowdStatus, Reward } from '../types/cart'

export const REPORT_POINTS = 15

export const REPORT_FIELD_TAGS = [
  'מאפים חמים מהתנור 🥐',
  'נגמר הקרואסון שקדים ❌',
  'חניה בשפע 🚗',
  'אין חניה קרובה ⚠️',
  'מלא מקום בצל 🌳',
  'קבוצת רוכבים גדולה 🚴',
] as const

/** Report-modal status options; ranges drive the wait-time slider sync. */
export const REPORT_STATUS_OPTIONS: {
  status: CrowdStatus
  emoji: string
  label: string
  range: string
  hint: string
  defaultWait: number
}[] = [
  { status: 'calm', emoji: '🟢', label: 'רגוע', range: 'עד 5 דק׳', hint: 'הזמנה מהירה ויש מקום לשבת', defaultWait: 3 },
  { status: 'moderate', emoji: '🟡', label: 'סביר', range: '5-15 דק׳', hint: 'תור קצר וזורם', defaultWait: 10 },
  { status: 'busy', emoji: '🔴', label: 'עמוס', range: '15+ דק׳', hint: 'תור ארוך ועומס בשולחנות', defaultWait: 22 },
]

export const MAX_REPORT_WAIT = 45

export function statusForWait(min: number): CrowdStatus {
  if (min <= 5) return 'calm'
  if (min <= 15) return 'moderate'
  return 'busy'
}

export const REWARDS: Reward[] = [
  { id: 'free-coffee', title: 'קפה הפוך / אספרסו חינם', description: 'כוס אחת על חשבוננו, בכל עגלה שותפה', cost: 100, emoji: '☕' },
  { id: 'iced-coffee', title: 'כוס קפה קר לדרך', description: 'אייס אמריקנו או אייס לאטה, לבחירתך', cost: 80, emoji: '🧊' },
  { id: 'pastry-half', title: 'מאפה בוקר ב-50% הנחה', description: 'קרואסון, מאפין או עוגת שמרים', cost: 60, emoji: '🥐' },
]

/** Ranks are based on lifetime points earned, so redeeming never demotes you. */
export const RANKS = [
  { min: 0, title: 'טועם מתחיל', emoji: '🌱' },
  { min: 150, title: 'סייר קפה מקומי', emoji: '🏆' },
  { min: 300, title: 'שגריר העמק', emoji: '🌿' },
  { min: 600, title: 'אגדת הבריסטות', emoji: '👑' },
] as const

export type Rank = (typeof RANKS)[number]

export function rankFor(lifetimePoints: number): Rank & { next: Rank | null } {
  let index = 0
  RANKS.forEach((r, i) => {
    if (lifetimePoints >= r.min) index = i
  })
  return { ...RANKS[index], next: RANKS[index + 1] ?? null }
}
