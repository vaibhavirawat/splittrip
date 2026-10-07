import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import Avatar from '../components/Avatar'
import CountUp from '../components/CountUp'
import ExpenseForm from '../components/ExpenseForm'
import Insights from '../components/Insights'
import { confetti } from '../lib/confetti'
import { emojiFor } from '../lib/emoji'
import { notifyOverdue, whatsappLink } from '../lib/notify'
import { payWithRazorpay, razorpayEnabled } from '../lib/razorpay'
import { balances, formatMoney, type Expense, loans, settle, sharesInBase, toBase, type Loan, type Transfer } from '../lib/split'
import { store, type GroupData } from '../store'

type Tab = 'expenses' | 'balances' | 'loans' | 'insights' | 'members'
const TAB_EMOJI: Record<Tab, string> = { expenses: '🧾', balances: '⚖️', loans: '⏰', insights: '📊', members: '👯' }

export default function GroupPage() {
  const { gid } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState<GroupData | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('expenses')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => store.watchGroup(gid!, setData), [gid])

  const calc = useMemo(() => {
    if (!data) return null
    const ids = Object.keys(data.group.members)
    const bal = balances(ids, data.expenses, data.payments)
    return { bal, transfers: settle(bal), loans: loans(bal, data.expenses, data.group.graceDays) }
  }, [data])

  const meId = data ? Object.entries(data.group.members).find(([, m]) => m.uid === user!.uid)?.[0] : undefined
  const overdueMine = calc?.loans.filter((l) => l.overdue && l.from === meId).length ?? 0
  const gname = (id: string) => data?.group.members[id]?.name ?? 'Someone'
  const who = (id: string) => (id === meId ? 'You' : gname(id))
  const v = (id: string, you: string, other: string) => (id === meId ? you : other)

  // One-time nudge when the user opens a group in which they have overdue payments.
  useEffect(() => {
    if (!data || !calc || !meId) return
    const mine = calc.loans.filter((l) => l.overdue && l.from === meId)
    notifyOverdue(mine.map((l) => `You owe ${gname(l.to)} ${formatMoney(l.amount, data.group.baseCurrency)}`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gid, meId, data === null])

  if (data === undefined) return <div className="wrap mute">Loading…</div>
  if (data === null || !calc) return <div className="wrap"><p>Group not found, or you are not a member.</p><Link to="/">Back</Link></div>
  const { group, expenses, payments } = data
  const cur = group.baseCurrency
  const money = (n: number) => formatMoney(n, cur)

  async function markPaid(t: Transfer, method: 'manual' | 'razorpay' = 'manual', ref?: string) {
    await store.addPayment(group.id, {
      from: t.from, to: t.to, amount: t.amount, date: new Date().toLocaleDateString('en-CA'), method, ...(ref && { ref }),
    })
    confetti()
  }

  async function razorpay(t: Transfer) {
    try {
      const id = await payWithRazorpay({
        amountPaise: t.amount, payeeName: gname(t.to), payerName: gname(t.from), note: `${group.name}: pay ${gname(t.to)}`,
      })
      await markPaid(t, 'razorpay', id)
      setMsg(`Test payment ${id} recorded`)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const canRazorpay = razorpayEnabled && cur === 'INR'
  const remindText = (l: Loan) =>
    `Hi ${gname(l.from)}, friendly reminder from SplitTrip: you owe ${gname(l.to)} ${money(l.amount)} for "${group.name}" (since ${l.since}).`
  const inviteUrl = `${location.origin}/join/${group.id}`

  return (
    <div className="wrap">
      <header className="top">
        <div><Link to="/">‹ Groups</Link><h1>{group.name}</h1></div>
        {meId && <div className="bal-card">
          <span className="mute">{calc.bal[meId] >= 0 ? 'You are owed' : 'You owe'}</span>
          <b><CountUp value={Math.abs(calc.bal[meId])} currency={cur} /></b>
        </div>}
      </header>

      <div className="tabs">
        {(['expenses', 'balances', 'loans', 'insights', 'members'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''}  aria-label={t} onClick={() => setTab(t)}>
            {TAB_EMOJI[t]}<span className="lbl"> {t[0].toUpperCase() + t.slice(1)}{t === 'loans' && overdueMine > 0 ? ` (${overdueMine}!)` : ''}</span>
          </button>
        ))}
      </div>
      {msg && <p className="mute" role="status">{msg}</p>}

      {tab === 'expenses' && <>
        {expenses.length === 0 && <div className="empty"><big>🧾</big>Nothing here yet.<br />Tap “Add expense” to log the first one.</div>}
        {expenses.map((e, i) => {
          const foreign = e.currency !== cur
          const mine = meId ? sharesInBase(e)[meId] ?? 0 : 0
          return (
            <div key={e.id} className="card item" style={{ ['--i' as string]: i }}>
              <div className="row">
                <span className="who"><span className="emo">{emojiFor(e.description)}</span><b>{e.description}</b></span>
                <b style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>{formatMoney(e.amount, e.currency)}</b>
              </div>
              <div className="mute">
                {gname(e.paidBy)} paid · {e.date}{e.location ? ` · 📍 ${e.location}` : ''} · {e.splitType === 'equal' ? 'split equally' : e.splitType === 'ratio' ? 'split by ratio' : 'exact amounts'} ({Object.keys(e.split).length})
              </div>
              {foreign && <div className="mute">≈ {money(toBase(e.amount, e.rate))} at {e.rate} {cur}/{e.currency}</div>}
              <div className="row">
                <span className="mute">{meId && e.split[meId] !== undefined ? `Your share ${money(mine)}` : 'You are not part of this'}</span>
                <span>
                  <button className="link" onClick={() => setEditing(e)}>Edit</button>
                  <button className="link" onClick={() => confirm('Delete this expense?') && store.deleteExpense(group.id, e.id)}>Delete</button>
                </span>
              </div>
            </div>
          )
        })}
      </>}

      {tab === 'balances' && <>
        <h2>Net balances</h2>
        {Object.keys(group.members).map((id, i) => (
          <div key={id} className="card row item" style={{ ['--i' as string]: i }}>
            <span className="who"><Avatar name={gname(id)} />{gname(id)}{id === meId && gname(id) !== 'You' && ' (you)'}</span>
            <span className={calc.bal[id] > 0 ? 'pos' : calc.bal[id] < 0 ? 'neg' : 'mute'}>
              {calc.bal[id] === 0 ? 'settled' : `${calc.bal[id] > 0 ? 'is owed ' : 'owes '}${money(Math.abs(calc.bal[id]))}`}
            </span>
          </div>
        ))}
        <h2>Settle up (fewest payments)</h2>
        {calc.transfers.length === 0 && <div className="empty"><big>🎉</big>Everyone is settled. Clean slate!</div>}
        {calc.transfers.map((t, i) => (
          <div key={i} className="card stack item" style={{ ['--i' as string]: i }}>
            <div className="row"><span className="who"><Avatar name={gname(t.from)} size={30} />→<Avatar name={gname(t.to)} size={30} /><span>{who(t.from)} {v(t.from, 'pay', 'pays')} {who(t.to)}</span></span><b>{money(t.amount)}</b></div>
            <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <button onClick={() => markPaid(t)}>Mark as paid ✅</button>
              {canRazorpay && t.from === meId && <button className="primary" onClick={() => razorpay(t)}>Pay with Razorpay (test) 💳</button>}
            </div>
          </div>
        ))}
        {payments.length > 0 && <>
          <h2>Payments made</h2>
          {payments.map((p) => (
            <div key={p.id} className="card row">
              <span>{gname(p.from)} → {gname(p.to)}<div className="mute">{p.date} · {p.method}{p.ref ? ` · ${p.ref}` : ''}</div></span>
              <b>{money(p.amount)}</b>
            </div>
          ))}
        </>}
      </>}

      {tab === 'loans' && <>
        <p className="mute">Unpaid shares tracked as loans. A share is overdue {group.graceDays} days after the expense, or after its reminder date.</p>
        {calc.loans.length === 0 && <div className="empty"><big>🕊️</big>No outstanding loans.</div>}
        {calc.loans.map((l, i) => (
          <div key={i} className="card stack item" style={{ ['--i' as string]: i }}>
            <div className="row"><span className="who"><Avatar name={gname(l.from)} size={30} /><span>{who(l.from)} {v(l.from, 'owe', 'owes')} {who(l.to)}</span></span><b>{money(l.amount)}</b></div>
            <div className="mute">Outstanding {l.daysOutstanding} day{l.daysOutstanding === 1 ? '' : 's'} since {l.since}{l.dueDate ? ` · remind by ${l.dueDate}` : ''} {l.overdue && <span className="badge warn">Overdue</span>}</div>
            <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <a className="btn" href={whatsappLink(remindText(l))} target="_blank" rel="noreferrer">Nudge on WhatsApp 👋</a>
              <button onClick={() => markPaid(l)}>Mark as paid</button>
            </div>
          </div>
        ))}
      </>}

      {tab === 'insights' && <Insights data={data} />}

      {tab === 'members' && <>
        {Object.entries(group.members).map(([id, m]) => (
          <div key={id} className="card row"><span className="who"><Avatar name={m.name} />{m.name}{id === meId && gname(id) !== 'You' && ' (you)'}</span><span className="mute">{m.uid ? 'joined' : 'not joined'}</span></div>
        ))}
        <button onClick={() => { const n = prompt('Name of the person to add'); if (n?.trim()) store.addMember(group.id, n.trim()) }}>+ Add person</button>
        {store.mode === 'cloud' && <div className="card stack" style={{ marginTop: 12 }}>
          <b>Invite link</b>
          <input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
          <button onClick={() => navigator.clipboard?.writeText(inviteUrl).then(() => setMsg('Link copied'))}>Copy link</button>
          <span className="mute">Anyone with this link can join and claim a placeholder name.</span>
        </div>}
      </>}

      {tab === 'expenses' && <button className="primary fab" onClick={() => setAdding(true)}>+ Add expense</button>}
      {editing && <ExpenseForm key={editing.id} group={group} meId={meId ?? ''} initial={editing}
        onSave={(x) => {
          const { location: _l, dueDate: _d, ...rest } = editing // so a cleared optional field is really removed
          return store.updateExpense(group.id, { ...rest, ...x })
        }} onClose={() => setEditing(null)} />}
      {adding && <ExpenseForm group={group} meId={meId ?? ''} onSave={(e) => store.addExpense(group.id, e)} onClose={() => setAdding(false)} />}
    </div>
  )
}
