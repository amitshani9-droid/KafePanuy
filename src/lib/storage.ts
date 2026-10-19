/** localStorage helpers that never throw (private mode, quota, blocked storage) */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota or blocked — non-fatal
  }
}

const DEVICE_KEY = 'kafe-panuy:device-id'

/** Anonymous per-browser id, used only to rate-limit reports */
export function deviceId(): string {
  let id = readJson<string | null>(DEVICE_KEY, null)
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    writeJson(DEVICE_KEY, id)
  }
  return id
}
