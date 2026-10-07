const HUES = ['#ff4d9d', '#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6', '#ef4444']

export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <span className="avatar" style={{ width: size, height: size, background: HUES[h % HUES.length], fontSize: size * 0.45 }} aria-hidden>
      {(name[0] ?? '?').toUpperCase()}
    </span>
  )
}
