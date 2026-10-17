export function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
}

export function timeAgo(iso: string): string {
  const min = minutesSince(iso)
  if (min < 1) return 'עכשיו'
  if (min === 1) return 'לפני דקה'
  if (min < 60) return `לפני ${min} דק׳`
  const hours = Math.floor(min / 60)
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'אתמול' : `לפני ${days} ימים`
}

export function updatedLabel(iso: string): string {
  const min = minutesSince(iso)
  if (min < 1) return 'עודכן עכשיו'
  if (min < 60) return `עודכן ${timeAgo(iso)}`
  return 'עודכן לפני יותר משעה'
}

export function minutesUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000))
}
