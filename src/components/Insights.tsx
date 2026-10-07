import { useMemo } from 'react'
import { insights } from '../lib/insights'
import { formatMoney } from '../lib/split'
import type { GroupData } from '../store'
import Avatar from './Avatar'

const COLORS = ['#ff4d9d', '#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6', '#ef4444', '#84cc16']

function Bars({ title, data, name, money }: { title: string; data: Record<string, number>; name: (id: string) => string; money: (n: number) => string }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(([, v]) => v))
  return (
    <div className="card">
      <b className="ins-title">{title}</b>
      {rows.map(([id, v], i) => (
        <div key={id} className="bar-row item" style={{ ['--i' as string]: i }}>
          <Avatar name={name(id)} size={26} />
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(v / max) * 100}%` }} />
            <span className="bar-label">{name(id)}</span>
          </div>
          <b className="bar-val">{money(v)}</b>
        </div>
      ))}
    </div>
  )
}

export default function Insights({ data }: { data: GroupData }) {
  const { group, expenses } = data
  const cur = group.baseCurrency
  const money = (n: number) => formatMoney(n, cur)
  const name = (id: string) => group.members[id]?.name ?? 'Someone'
  const r = useMemo(() => insights(expenses, Object.keys(group.members), cur), [expenses, group.members, cur])

  if (expenses.length === 0) return <div className="empty"><big>📊</big>Add a few expenses and your trip stats show up here.</div>

  let acc = 0
  const stops = r.byCategory.map((c, i) => {
    const from = (acc / r.total) * 100
    acc += c.amount
    return `${COLORS[i % COLORS.length]} ${from}% ${(acc / r.total) * 100}%`
  })
  const maxDay = Math.max(1, ...r.byDay.map((d) => d.amount))
  const top = Object.entries(r.paid).sort((a, b) => b[1] - a[1])[0]

  return (
    <div>
      <div className="tiles">
        <div className="tile item"><span className="mute">Total spent</span><b>{money(r.total)}</b></div>
        <div className="tile item" style={{ ['--i' as string]: 1 }}><span className="mute">Expenses</span><b>{r.count}</b></div>
        <div className="tile item" style={{ ['--i' as string]: 2 }}><span className="mute">Per person / day</span><b>{money(r.perPersonPerDay)}</b></div>
        <div className="tile item" style={{ ['--i' as string]: 3 }}><span className="mute">Biggest</span><b>{r.biggest ? money(r.biggest.amount) : '-'}</b><span className="mute">{r.biggest?.description}</span></div>
      </div>

      {top && top[1] > 0 && (
        <div className="card row item" style={{ ['--i' as string]: 4 }}>
          <span className="who"><Avatar name={name(top[0])} /> <span><b>{name(top[0])}</b> fronted the most</span></span>
          <b className="pos">{money(top[1])}</b>
        </div>
      )}

      <div className="card">
        <b className="ins-title">Where the money went</b>
        <div className="donut-wrap">
          <div className="donut" style={{ background: `conic-gradient(${stops.join(',')})` }}><span>{r.byCategory.length}<small>types</small></span></div>
          <div className="legend">
            {r.byCategory.map((c, i) => (
              <div key={c.label} className="row"><span><i style={{ background: COLORS[i % COLORS.length] }} />{c.emoji} {c.label}</span>
                <span><b>{Math.round((c.amount / r.total) * 100)}%</b> <span className="mute">{money(c.amount)}</span></span></div>
            ))}
          </div>
        </div>
      </div>

      <Bars title="Who paid" data={r.paid} name={name} money={money} />
      <Bars title="Who consumed (their share of the costs)" data={r.consumed} name={name} money={money} />

      {r.byDay.length > 1 && (
        <div className="card">
          <b className="ins-title">Spend per day</b>
          <div className="days">
            {r.byDay.map((d, i) => (
              <div key={d.date} className="day" title={`${d.date}: ${money(d.amount)}`}>
                <div className="day-bar" style={{ height: `${Math.max(6, (d.amount / maxDay) * 100)}%`, animationDelay: `${i * 40}ms` }} />
                <span className="mute">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.foreign.length > 0 && (
        <div className="card"><b className="ins-title">Foreign spending</b>
          {r.foreign.map((f) => <div key={f.currency} className="row"><span>{f.currency}</span><b>{formatMoney(f.amount, f.currency)}</b></div>)}
        </div>
      )}
    </div>
  )
}
