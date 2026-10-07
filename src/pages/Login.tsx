import { useState } from 'react'
import { store } from '../store'

export default function Login() {
  const [err, setErr] = useState('')
  const run = (f: () => Promise<void>) => f().catch((e) => setErr(e.message || 'Sign-in failed'))
  return (
    <div className="wrap">
      <div className="hero">
        <img src="/icon.svg" width={72} height={72} alt="" style={{ borderRadius: 18 }} />
        <h1 style={{ fontSize: '2rem', marginTop: 12 }}>SplitTrip</h1>
        <p className="mute" style={{ maxWidth: 420, margin: '8px auto 24px' }}>
          Split bills, track who owes whom, and settle up across currencies, even when everyone is in a different place.
        </p>
        <div className="stack" style={{ maxWidth: 320, margin: '0 auto' }}>
          {store.mode === 'cloud' && (
            <button className="primary" onClick={() => run(store.signInGoogle)}>Continue with Google</button>
          )}
          <button className={store.mode === 'cloud' ? '' : 'primary'} onClick={() => run(store.signInGuest)}>
            {store.mode === 'cloud' ? 'Try as guest' : 'Open demo'}
          </button>
          {store.mode === 'local' && <p className="mute">Demo mode: data stays in this browser.</p>}
          {err && <p className="err">{err}</p>}
        </div>
      </div>
    </div>
  )
}
