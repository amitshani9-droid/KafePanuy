import { useCallback, useEffect, useRef, useState } from 'react'
import type { LearnedProfile, Level, Report } from '../types'
import { fetchLiveReports, fetchProfiles, submitReport } from '../lib/backend'

const LIVE_REFRESH_MS = 60_000

/** Live reports + learned profiles for the places currently on screen */
export function useCrowd(keys: string[]) {
  const [live, setLive] = useState<Map<string, Report[]>>(new Map())
  const [profiles, setProfiles] = useState<Map<string, LearnedProfile>>(new Map())
  const profiled = useRef(new Set<string>())
  const keysRef = useRef(keys)
  keysRef.current = keys
  const keySig = keys.slice().sort().join('|')

  const refreshLive = useCallback(async () => {
    const ks = keysRef.current
    if (!ks.length) return
    try {
      const fresh = await fetchLiveReports(ks)
      setLive((prev) => {
        const next = new Map(prev)
        for (const k of ks) {
          const r = fresh.get(k)
          if (r) next.set(k, r)
          else next.delete(k)
        }
        return next
      })
    } catch {
      // keep what we have; next tick retries
    }
  }, [])

  // Live: on view change (debounced) and every minute while visible
  useEffect(() => {
    const t = setTimeout(refreshLive, 400)
    return () => clearTimeout(t)
  }, [keySig, refreshLive])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshLive()
    }, LIVE_REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && void refreshLive()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshLive])

  // Learned profiles: once per place per session
  useEffect(() => {
    const missing = keysRef.current.filter((k) => !profiled.current.has(k))
    if (!missing.length) return
    const t = setTimeout(() => {
      missing.forEach((k) => profiled.current.add(k))
      fetchProfiles(missing)
        .then((got) => {
          if (!got.size) return
          setProfiles((prev) => {
            const next = new Map(prev)
            for (const [k, p] of got) next.set(k, p)
            return next
          })
        })
        .catch(() => missing.forEach((k) => profiled.current.delete(k)))
    }, 600)
    return () => clearTimeout(t)
  }, [keySig])

  /** Send a report; shows immediately, then syncs with the server */
  const report = useCallback(
    async (placeKey: string, level: Level) => {
      const mine: Report = { placeKey, level, createdAt: Date.now() }
      setLive((prev) => {
        const next = new Map(prev)
        next.set(placeKey, [mine, ...(prev.get(placeKey) ?? [])])
        return next
      })
      try {
        await submitReport(placeKey, level)
      } finally {
        void refreshLive()
      }
    },
    [refreshLive],
  )

  return { live, profiles, report }
}
