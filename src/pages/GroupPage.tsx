import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import ExpenseForm from '../components/ExpenseForm'
import { notifyOverdue, whatsappLink } from '../lib/notify'
import { payWithRazorpay, razorpayEnabled } from '../lib/razorpay'
import { balances, formatMoney, loans, settle, sharesInBase, toBase, type Loan, type Transfer } from '../lib/split'
import { store, type GroupData } from '../store'

type Tab = 'expenses' | 'balances' | 'loans' | 'members'

export default function GroupPage() {
  const { gid } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState<GroupData | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('expenses')
  const [adding, setAdding] = useState(false)
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
        {meId && <div style={{ textAlign: 'right' }}>
          <div className="mute">Your balance</div>
          <div className={calc.bal[meId] >= 0 ? 'pos' : 'neg'}>{calc.bal[meId] >= 0 ? 'you are owed ' : 'you owe '}{money(Math.abs(calc.bal[meId]))}</div>
        </div>}
      </header>

      <div className="tabs">
        {(['expenses', 'balances', 'loans', 'members'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}{t === 'loans' && overdueMine > 0 ? ` (${overdueMine}!)` : ''}
          </button>
        ))}
      </div>
      {msg && <p className="mute" role="status">{msg}</p>}

      {tab === 'expenses' && <>
        {expenses.length === 0 && <p className="mute">No expenses yet. Tap “Add expense”.</p>}
        {expenses.map((e) => {
          const foreign = e.currency !== cur
          const mine = meId ? sharesInBase(e)[meId] ?? 0 : 0
          return (
            <div key={e.id} className="card">
              <div className="row">
                <b>{e.description}</b>
                <b>{formatMoney(e.amount, e.currency)}</b>
              </div>
              <div className="mute">
                {gname(e.paidBy)} paid · {e.date}{e.location ? ` · 📍 ${e.location}` : ''} · {e.splitType === 'equal' ? 'split equally' : e.splitType === 'ratio' ? 'split by ratio' : 'exact amounts'} ({Object.keys(e.split).length})
              </div>
              {foreign && <div className="mute">≈ {money(toBase(e.amount, e.rate))} at {e.rate} {cur}/{e.currency}</div>}
              <div className="row">
                <span className="mute">{meId && e.split[meId] !== undefined ? `Your share ${money(mine)}` : 'You are not part of this'}</span>
                <button className="link" onClick={() => confirm('Delete this expense?') && store.deleteExpense(group.id, e.id)}>Delete</button>
              </div>
            </div>
          )
        })}
      </>}

      {tab === 'balances' && <>
        <h2>Net balances</h2>
        {Object.keys(group.members).map((id) => (
          <div key={id} className="card row">
            <span>{gname(id)}{id === meId && ' (you)'}</span>
            <span className={calc.bal[id] > 0 ? 'pos' : calc.bal[id] < 0 ? 'neg' : 'mute'}>
              {calc.bal[id] === 0 ? 'settled' : `${calc.bal[id] > 0 ? 'is owed ' : 'owes '}${money(Math.abs(calc.bal[id]))}`}
            </span>
          </div>
        ))}
        <h2>Settle up (fewest payments)</h2>
        {calc.transfers.length === 0 && <p className="mute">Everyone is settled. 🎉</p>}
        {calc.transfers.map((t, i) => (
          <div key={i} className="card stack">
            <div className="row"><span>{gname(t.from)} → {gname(t.to)}</span><b>{money(t.amount)}</b></div>
            <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <button onClick={() => markPaid(t)}>Mark as paid</button>
              {canRazorpay && t.from === meId && <button className="primary" onClick={() => razorpay(t)}>Pay with Razorpay (test)</button>}
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
        {calc.loans.length === 0 && <p className="mute">No outstanding loans.</p>}
        {calc.loans.map((l, i) => (
          <div key={i} className="card stack">
            <div className="row"><span>{gname(l.from)} owes {gname(l.to)}</span><b>{money(l.amount)}</b></div>
            <div className="mute">Outstanding {l.daysOutstanding} day{l.daysOutstanding === 1 ? '' : 's'} since {l.since}{l.dueDate ? ` · remind by ${l.dueDate}` : ''} {l.overdue && <span className="badge warn">Overdue</span>}</div>
            <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <a className="btn" href={whatsappLink(remindText(l))} target="_blank" rel="noreferrer">Send reminder</a>
              <button onClick={() => markPaid(l)}>Mark as paid</button>
            </div>
          </div>
        ))}
      </>}

      {tab === 'members' && <>
        {Object.entries(group.members).map(([id, m]) => (
          <div key={id} className="card row"><span>{m.name}{id === meId && ' (you)'}</span><span className="mute">{m.uid ? 'joined' : 'not joined'}</span></div>
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
      {adding && <ExpenseForm group={group} meId={meId ?? ''} onSave={(e) => store.addExpense(group.id, e)} onClose={() => setAdding(false)} />}
    </div>
  )
}
