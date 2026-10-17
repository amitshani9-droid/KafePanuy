import { localRepository } from './localRepository'
import type { KafeRepository } from './repository'

/**
 * The repository the app uses. To move to a real backend, add e.g.
 * `supabaseRepository.ts` implementing `KafeRepository` and switch it here.
 */
export const repo: KafeRepository = localRepository

export type { AppSnapshot, KafeRepository } from './repository'
