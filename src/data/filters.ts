import type { CrowdStatus, FilterTag, SortOption } from '../types/cart'

export const TAG_LABELS: Record<FilterTag, { label: string; short: string; emoji: string }> = {
  saturday: { label: 'פתוח בשבת', short: 'פתוח בשבת', emoji: '☀️' },
  cyclist: { label: 'רוכבים ורצים', short: 'ידידותי לרוכבים/רצים', emoji: '🚴' },
  dogs: { label: 'ידידותי לכלבים', short: 'ידידותי לכלבים', emoji: '🐕' },
  kids: { label: 'משפחות ודשא', short: 'מתאים למשפחות/דשא', emoji: '🪁' },
  shaded: { label: 'מוצל', short: 'מוצל/מקורה', emoji: '🌳' },
  vegan: { label: 'טבעוני/ללא גלוטן', short: 'טבעוני/ללא גלוטן', emoji: '🌾' },
}

export const FILTER_TAG_ORDER: FilterTag[] = ['saturday', 'cyclist', 'dogs', 'kids', 'shaded', 'vegan']

export const STATUS_META: Record<CrowdStatus, { label: string; textClass: string; bgClass: string; softBgClass: string }> = {
  calm: { label: 'פנוי', textClass: 'text-calm', bgClass: 'bg-calm', softBgClass: 'bg-calm/10' },
  moderate: { label: 'בינוני', textClass: 'text-moderate', bgClass: 'bg-moderate', softBgClass: 'bg-moderate/10' },
  busy: { label: 'עמוס', textClass: 'text-busy', bgClass: 'bg-busy', softBgClass: 'bg-busy/10' },
}

export const SORT_LABELS: Record<SortOption, string> = {
  freest: 'הכי פנוי',
  nearest: 'הכי קרוב',
  rating: 'דירוג',
}
