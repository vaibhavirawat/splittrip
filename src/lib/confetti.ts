const COLORS = ['#ff4d9d', '#2dd4bf', '#ffd23f', '#8b5cf6', '#ffffff']

/** Tiny DOM confetti burst. No-op for reduced-motion users. */
export function confetti(x = window.innerWidth / 2, y = window.innerHeight / 2) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('i')
    const a = Math.random() * Math.PI * 2
    const d = 80 + Math.random() * 160
    el.className = 'confetti'
    el.style.cssText = `left:${x}px;top:${y}px;background:${COLORS[i % COLORS.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 80}px;--r:${Math.random() * 720 - 360}deg`
    document.body.appendChild(el)
    el.addEventListener('animationend', () => el.remove())
  }
}
