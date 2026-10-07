import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { CURRENCIES } from '../lib/rates'
import Avatar from '../components/Avatar'
import { store, type Group } from '../store'

export default function Groups() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [cur, setCur] = useState('INR')
  const [others, setOthers] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => store.watchGroups(user!.uid, setGroups), [user])

  async function sample() {
    setBusy(true)
    nav(`/g/${await store.createSample(user!)}`)
  }

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    const id = await store.createGroup(user!, name.trim(), cur, others.split(',').map((s) => s.trim()).filter(Boolean))
    nav(`/g/${id}`)
  }

  return (
    <div className="wrap">
      <header className="top">
        <h1>Your <span className="tilt">groups</span></h1>
        <div className="row">
          <span className="who"><Avatar name={user!.name} size={32} /></span>
          <button onClick={() => store.signOut()}>Sign out</button>
        </div>
      </header>
      {groups === null && <p className="mute">Loading…</p>}
      {groups?.length === 0 && <div className="empty"><big>🧳</big>No groups yet.<br />Make one for your next trip or dinner.
        <div style={{ marginTop: 16 }}><button className="primary" disabled={busy} onClick={sample}>✨ Load a sample trip</button>
          <div className="mute" style={{ marginTop: 8 }}>See every feature with ready-made data</div></div></div>}
      {groups?.map((g, i) => (
        <Link key={g.id} to={`/g/${g.id}`} className="card row item" style={{ color: 'inherit', ['--i' as string]: i }}>
          <div className="who">
            <span className="emo">✈️</span>
            <div><b style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>{g.name}</b>
              <div className="mute">{Object.keys(g.members).length} people · {g.baseCurrency}</div></div>
          </div>
          <div className="chips" style={{ flexWrap: 'nowrap' }}>
            {Object.values(g.members).slice(0, 3).map((m, k) => <span key={k} style={{ marginLeft: k ? -12 : 0 }}><Avatar name={m.name} size={30} /></span>)}
          </div>
        </Link>
      ))}
      {groups && groups.length > 0 && <button className="link" disabled={busy} onClick={sample}>✨ Add a sample trip</button>}
      <button className="primary fab" onClick={() => setOpen(true)}>+ New group ✨</button>
      {open && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>New group</h2>
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa trip" autoFocus /></label>
            <label>Settle in currency
              <select value={cur} onChange={(e) => setCur(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label>Other people (comma separated, you can invite them later)
              <input value={others} onChange={(e) => setOthers(e.target.value)} placeholder="Aarav, Meera, Kabir" />
            </label>
            <button className="primary" disabled={busy || !name.trim()} onClick={create}>Create</button>
          </div>
        </div>
      )}
    </div>
  )
}
