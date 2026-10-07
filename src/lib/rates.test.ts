import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRate } from './rates'

const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response
const bad = (status = 500) => ({ ok: false, status, json: async () => ({}) }) as Response

afterEach(() => vi.unstubAllGlobals())

describe('fetchRate', () => {
  it('same currency is 1 with no network', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    expect(await fetchRate('INR', 'INR', '2026-01-01')).toEqual({ rate: 1, source: 'same currency' })
    expect(f).not.toHaveBeenCalled()
  })
  it('uses the first provider when it works', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ rates: { USD: 0.012 } })))
    expect(await fetchRate('INR', 'USD', '2026-02-01')).toEqual({ rate: 0.012, source: 'Frankfurter' })
  })
  it('falls through to the next provider when one fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (u: string) => (u.includes('frankfurter') ? bad() : ok({ eur: { inr: 90.5 } }))))
    expect(await fetchRate('EUR', 'INR', '2026-03-01')).toEqual({ rate: 90.5, source: 'currency-api' })
  })
  it('returns null when every provider fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await fetchRate('GBP', 'INR', '2026-04-01')).toBeNull()
  })
  it('rejects nonsense values and caches good ones', async () => {
    const f = vi.fn(async (u: string) => (u.includes('frankfurter') ? ok({ rates: { JPY: 0 } }) : ok({ aud: { jpy: 100 } })))
    vi.stubGlobal('fetch', f)
    expect((await fetchRate('AUD', 'JPY', '2026-05-01'))?.rate).toBe(100)
    const calls = f.mock.calls.length
    await fetchRate('AUD', 'JPY', '2026-05-01')
    expect(f.mock.calls.length).toBe(calls)
  })
})
