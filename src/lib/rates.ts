export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'JPY', 'AUD', 'CAD', 'CHF', 'IDR']

export interface Rate { rate: number; source: string }

const cache = new Map<string, Rate>()

async function getJson(url: string, ms = 6000): Promise<any> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctl.signal })
    if (!r.ok) throw new Error(String(r.status))
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

type Provider = { name: string; get: (from: string, to: string, date: string) => Promise<number | undefined> }

// Free, keyless, CORS-enabled sources, tried in order. The first two support historical dates.
const PROVIDERS: Provider[] = [
  {
    name: 'Frankfurter',
    get: async (from, to, date) => (await getJson(`https://api.frankfurter.dev/v1/${date}?base=${from}&symbols=${to}`)).rates?.[to],
  },
  {
    name: 'currency-api',
    get: async (from, to, date) => {
      const f = from.toLowerCase()
      const url = (v: string) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${v}/v1/currencies/${f}.json`
      const j = await getJson(url(date)).catch(() => getJson(url('latest'))) // today's snapshot may not exist yet
      return j[f]?.[to.toLowerCase()]
    },
  },
  {
    name: 'open.er-api (latest only)',
    get: async (from, to) => (await getJson(`https://open.er-api.com/v6/latest/${from}`)).rates?.[to],
  },
]

/** Exchange rate for `date` (1 `from` = N `to`). Falls through providers; null only if every one fails. */
export async function fetchRate(from: string, to: string, date: string): Promise<Rate | null> {
  if (from === to) return { rate: 1, source: 'same currency' }
  const k = `${from}-${to}-${date}`
  const hit = cache.get(k)
  if (hit) return hit
  for (const p of PROVIDERS) {
    try {
      const v = await p.get(from, to, date)
      if (typeof v === 'number' && v > 0 && isFinite(v)) {
        const r = { rate: v, source: p.name }
        cache.set(k, r)
        return r
      }
    } catch {
      /* try the next provider */
    }
  }
  return null
}

/** Best-effort place name from the device location (OpenStreetMap Nominatim, no key). */
export async function detectPlace(): Promise<string | null> {
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
    )
    const { latitude: la, longitude: lo } = pos.coords
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&lat=${la}&lon=${lo}`)
    const j = (await r.json()) as { address?: Record<string, string> }
    const a = j.address ?? {}
    const place = [a.city || a.town || a.village || a.suburb, a.country].filter(Boolean).join(', ')
    return place || `${la.toFixed(3)}, ${lo.toFixed(3)}`
  } catch {
    return null
  }
}
