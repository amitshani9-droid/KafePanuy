import { describe, expect, it } from 'vitest'
import { resolveRepository, localRepository, supabaseRepository } from './index'

describe('repository selection & Supabase adapter', () => {
  it('resolves to localRepository when URL is empty or undefined', () => {
    expect(resolveRepository(undefined)).toBe(localRepository)
    expect(resolveRepository('')).toBe(localRepository)
  })

  it('resolves to supabaseRepository when URL is provided', () => {
    expect(resolveRepository('https://my-project.supabase.co')).toBe(supabaseRepository)
  })

  it('exports supabaseRepository implementing the KafeRepository interface', () => {
    expect(typeof supabaseRepository.load).toBe('function')
    expect(typeof supabaseRepository.submitReport).toBe('function')
    expect(typeof supabaseRepository.addCarts).toBe('function')
    expect(typeof supabaseRepository.ownerUpdateStatus).toBe('function')
    expect(typeof supabaseRepository.startFlashDeal).toBe('function')
    expect(typeof supabaseRepository.endFlashDeal).toBe('function')
  })

  it('loads gracefully even with no network connection / unconfigured Supabase', async () => {
    const snapshot = await supabaseRepository.load()
    expect(Array.isArray(snapshot.carts)).toBe(true)
    expect(snapshot.carts.length).toBeGreaterThan(0)
    expect(typeof snapshot.points).toBe('number')
  })
})
