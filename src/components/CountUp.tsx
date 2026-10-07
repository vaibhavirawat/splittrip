import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../lib/split'

/** Animates a money value toward its target; snaps instantly for reduced-motion users. */
export default function CountUp({ value, currency }: { value: number; currency: string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600)
      const v = a + (value - a) * (1 - Math.pow(1 - p, 3))
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{formatMoney(Math.round(shown), currency)}</>
}
