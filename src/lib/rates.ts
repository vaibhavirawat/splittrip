export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'JPY', 'AUD', 'CAD', 'CHF', 'IDR']

const cache = new Map<string, number>()

/** Historical FX via the free, keyless Frankfurter API. Returns null if offline / unsupported pair. */
export async function fetchRate(from: string, to: string, date: string): Promise<number | null> {
  if (from === to) return 1
  const k = `${from}-${to}-${date}`
  const hit = cache.get(k)
  if (hit) return hit
  try {
    const r = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`)
    if (!r.ok) return null
    const j = (await r.json()) as { rates?: Record<string, number> }
    const v = j.rates?.[to]
    if (!v) return null
    cache.set(k, v)
    return v
  } catch {
    return null
  }
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
