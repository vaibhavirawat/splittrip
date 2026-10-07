import { useState } from 'react'
import { store } from '../store'

export default function Login() {
  const [err, setErr] = useState('')
  const run = (f: () => Promise<void>) => f().catch((e) => setErr(e.message || 'Sign-in failed'))
  return (
    <div className="wrap">
      <div className="hero">
        <img className="logo" src="/icon.svg" width={84} height={84} alt="" />
        <h1>Split<span>Trip</span></h1>
        <p className="lead">Split bills, track who owes who, and settle up across currencies. No more awkward “you owe me” texts.</p>
        <div className="feats">
          {['🍕 Dutch treat', '💸 Loan tracker', '🌍 Any currency', '⚡ Live sync'].map((f, i) => (
            <span key={f} style={{ animationDelay: `${i * 80}ms` }}>{f}</span>
          ))}
        </div>
        <div className="stack" style={{ maxWidth: 320, margin: '0 auto' }}>
          {store.mode === 'cloud' && (
            <button className="primary" onClick={() => run(store.signInGoogle)}>Continue with Google</button>
          )}
          <button className={store.mode === 'cloud' ? '' : 'primary'} onClick={() => run(store.signInGuest)}>
            {store.mode === 'cloud' ? 'Try as guest 👀' : 'Open demo'}
          </button>
          {store.mode === 'local' && <p className="mute">Demo mode: data stays in this browser.</p>}
          {err && <p className="err">{err}</p>}
        </div>
      </div>
    </div>
  )
}
