import { localRepository } from './localRepository'
import { supabaseRepository } from './supabaseRepository'
import type { KafeRepository } from './repository'

export function resolveRepository(envUrl?: string): KafeRepository {
  return envUrl ? supabaseRepository : localRepository
}

const hasSupabase = Boolean(
  typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL),
)

/**
 * The repository the app uses. Automatically switches to Supabase when
 * VITE_SUPABASE_URL is configured, otherwise falls back to localRepository.
 */
export const repo: KafeRepository = hasSupabase ? supabaseRepository : localRepository

export { localRepository } from './localRepository'
export { supabaseRepository } from './supabaseRepository'
export type { AppSnapshot, KafeRepository } from './repository'
