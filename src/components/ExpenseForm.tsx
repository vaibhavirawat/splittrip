import { useEffect, useMemo, useState } from 'react'
import { allocate, formatMoney, parseMoney, toBase, type SplitType } from '../lib/split'
import { CURRENCIES, detectPlace, fetchRate } from '../lib/rates'
import type { Group, NewExpense } from '../store'

interface Props {
  group: Group
  meId: string
  onSave: (e: NewExpense) => Promise<void>
  onClose: () => void
}

export default function ExpenseForm({ group, meId, onSave, onClose }: Props) {
  const ids = Object.keys(group.members)
  const today = new Date().toISOString().slice(0, 10)
  const [description, setDescription] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [currency, setCurrency] = useState(group.baseCurrency)
  const [rateStr, setRateStr] = useState('1')
  const [rateNote, setRateNote] = useState('')
  const [date, setDate] = useState(today)
  const [paidBy, setPaidBy] = useState(ids.includes(meId) ? meId : ids[0])
  const [location, setLocation] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [included, setIncluded] = useState<Record<string, boolean>>(Object.fromEntries(ids.map((i) => [i, true])))
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const amount = parseMoney(amountStr)
  const rate = parseFloat(rateStr) || 0

  // Auto-fetch the FX rate for the chosen currency and date; the user can still override it.
  useEffect(() => {
    if (currency === group.baseCurrency) { setRateStr('1'); setRateNote(''); return }
    let live = true
    setRateNote('Fetching rate…')
    fetchRate(currency, group.baseCurrency, date).then((r) => {
      if (!live) return
      if (r) { setRateStr(String(r)); setRateNote(`Rate on ${date}`) } else setRateNote('Offline: enter the rate manually')
    })
    return () => { live = false }
  }, [currency, date, group.baseCurrency])

  const participants = ids.filter((i) => included[i])
  const split = useMemo(() => {
    const s: Record<string, number> = {}
    for (const i of participants) {
      if (splitType === 'equal') s[i] = 1
      else if (splitType === 'ratio') s[i] = parseFloat(weights[i] || '1') || 0
      else s[i] = parseMoney(weights[i] || '0')
    }
    return s
  }, [participants.join(), splitType, weights])

  const exactSum = Object.values(split).reduce((a, b) => a + b, 0)
  const preview = allocate(toBase(amount, rate || 1), splitType === 'exact' ? split : Object.fromEntries(Object.entries(split).map(([k, v]) => [k, splitType === 'equal' ? 1 : v])))

  async function submit() {
    if (!description.trim()) return setErr('Add a description')
    if (amount <= 0) return setErr('Enter an amount')
    if (rate <= 0) return setErr('Enter a valid rate')
    if (participants.length === 0) return setErr('Pick at least one person')
    if (splitType === 'exact' && exactSum !== amount) return setErr(`Amounts add up to ${formatMoney(exactSum, currency)}, not ${formatMoney(amount, currency)}`)
    if (splitType === 'ratio' && exactSum <= 0) return setErr('Ratios must be positive')
    setBusy(true)
    try {
      await onSave({
        description: description.trim(), amount, currency, rate, paidBy, splitType, split, date,
        ...(location.trim() && { location: location.trim() }),
        ...(dueDate && { dueDate }),
      })
      onClose()
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>Add expense</h2>
        <label>What was it for?<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner at the beach shack" autoFocus /></label>
        <div className="grid2">
          <label>Amount<input inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="0.00" /></label>
          <label>Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {[...new Set([group.baseCurrency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        {currency !== group.baseCurrency && (
          <label>1 {currency} = ? {group.baseCurrency} <span>{rateNote}</span>
            <input inputMode="decimal" value={rateStr} onChange={(e) => setRateStr(e.target.value)} />
          </label>
        )}
        <div className="grid2">
          <label>Paid by<select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>{ids.map((i) => <option key={i} value={i}>{group.members[i].name}</option>)}</select></label>
          <label>Date<input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label>Where?
          <div className="row">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or venue (optional)" />
            <button type="button" onClick={async () => { const p = await detectPlace(); if (p) setLocation(p) }}>📍</button>
          </div>
        </label>

        <div>
          <div className="mute" style={{ marginBottom: 6 }}>Split</div>
          <div className="chips">
            {([['equal', 'Equally (Dutch)'], ['ratio', 'By ratio'], ['exact', 'Exact amounts']] as const).map(([t, l]) => (
              <button key={t} type="button" className={'chip' + (splitType === t ? ' on' : '')} onClick={() => setSplitType(t)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="stack">
          {ids.map((i) => (
            <div key={i} className="share-row">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ink)', fontSize: '1rem' }}>
                <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={!!included[i]} onChange={(e) => setIncluded({ ...included, [i]: e.target.checked })} />
                {group.members[i].name}
                {included[i] && amount > 0 && <span className="mute">{formatMoney(preview[i] ?? 0, group.baseCurrency)}</span>}
              </label>
              {included[i] && splitType !== 'equal' && (
                <input inputMode="decimal" placeholder={splitType === 'ratio' ? '1' : '0.00'} value={weights[i] ?? ''} onChange={(e) => setWeights({ ...weights, [i]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        <label>Remind about this by (optional)<input type="date" value={dueDate} min={date} onChange={(e) => setDueDate(e.target.value)} /></label>
        {err && <p className="err">{err}</p>}
        <button className="primary" disabled={busy} onClick={submit}>Save expense</button>
      </div>
    </div>
  )
}
