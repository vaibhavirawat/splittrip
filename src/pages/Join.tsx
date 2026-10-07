import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { store, type Group } from '../store'

export default function Join() {
  const { gid } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [g, setG] = useState<Group | null | undefined>(undefined)
  const [err, setErr] = useState('')

  useEffect(() => {
    store.previewGroup(gid!).then(setG).catch(() => setG(null))
  }, [gid])

  async function join(claim?: string) {
    try {
      await store.joinGroup(user!, gid!, claim)
      nav(`/g/${gid}`, { replace: true })
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  if (g === undefined) return <div className="wrap mute">Loading…</div>
  if (g === null) return <div className="wrap"><p>This invite link is not valid.</p></div>
  if (g.memberUids.includes(user!.uid)) { nav(`/g/${gid}`, { replace: true }); return null }
  const open = Object.entries(g.members).filter(([, m]) => !m.uid)
  return (
    <div className="wrap stack">
      <h1>Join <span className="tilt">{g.name}</span> 🎉</h1>
      {open.length > 0 && <>
        <p className="mute">Are you one of these people? Pick yourself to take over their existing expenses.</p>
        {open.map(([id, m]) => <button key={id} onClick={() => join(id)}>I’m {m.name}</button>)}
      </>}
      <button className="primary" onClick={() => join()}>Join as {user!.name}</button>
      {err && <p className="err">{err}</p>}
    </div>
  )
}
