import { describe, expect, it } from 'vitest'
import { insights } from './insights'
import { allocate, balances, loans, settle, sharesInBase, type Expense, type Payment } from './split'

const exp = (o: Partial<Expense>): Expense => ({
  id: 'e', description: 'x', amount: 10000, currency: 'INR', rate: 1, paidBy: 'a',
  splitType: 'equal', split: { a: 1, b: 1, c: 1 }, date: '2026-01-01', createdAt: 0, ...o,
})

describe('allocate', () => {
  it('always sums to the total (largest remainder)', () => {
    const r = allocate(10000, { a: 1, b: 1, c: 1 })
    expect(Object.values(r).reduce((s, v) => s + v, 0)).toBe(10000)
    expect(Object.values(r).sort()).toEqual([3333, 3333, 3334])
  })
  it('honours ratios', () => {
    expect(allocate(1000, { a: 3, b: 1 })).toEqual({ a: 750, b: 250 })
  })
})

describe('balances', () => {
  it('equal split: payer is owed the others’ shares', () => {
    const b = balances(['a', 'b', 'c'], [exp({})], [])
    expect(b.a).toBe(6666)
    expect(b.b + b.c).toBe(-6666)
    expect(b.a + b.b + b.c).toBe(0)
  })
  it('exact split', () => {
    const e = exp({ splitType: 'exact', split: { a: 2000, b: 3000, c: 5000 } })
    expect(balances(['a', 'b', 'c'], [e], [])).toEqual({ a: 8000, b: -3000, c: -5000 })
  })
  it('converts foreign currency using the stored rate', () => {
    const e = exp({ amount: 3000, currency: 'EUR', rate: 90, split: { a: 1, b: 1 } })
    expect(sharesInBase(e)).toEqual({ a: 135000, b: 135000 })
  })
  it('payments reduce debt', () => {
    const p: Payment = { id: 'p', from: 'b', to: 'a', amount: 3333, date: '', method: 'manual', createdAt: 0 }
    const b = balances(['a', 'b', 'c'], [exp({})], [p])
    expect(b.b).toBe(0)
  })
})

describe('settle', () => {
  it('clears all balances in ≤ n-1 transfers', () => {
    const bal = { a: 5000, b: -2000, c: -1000, d: -2000 }
    const t = settle(bal)
    expect(t.length).toBeLessThanOrEqual(3)
    const after = { ...bal }
    for (const x of t) { after[x.from as 'a'] += x.amount; after[x.to as 'a'] -= x.amount }
    expect(Object.values(after).every((v) => v === 0)).toBe(true)
  })
})

describe('loans', () => {
  it('flags overdue debts after the grace period', () => {
    const e = exp({ date: '2026-01-01' })
    const bal = balances(['a', 'b', 'c'], [e], [])
    const l = loans(bal, [e], 7, new Date('2026-01-20').getTime())
    expect(l.every((x) => x.overdue)).toBe(true)
    const fresh = loans(bal, [e], 7, new Date('2026-01-03').getTime())
    expect(fresh.some((x) => x.overdue)).toBe(false)
  })
  it('explicit due date wins', () => {
    const e = exp({ date: '2026-01-01', dueDate: '2026-02-01' })
    const bal = balances(['a', 'b', 'c'], [e], [])
    expect(loans(bal, [e], 7, new Date('2026-01-20').getTime()).some((x) => x.overdue)).toBe(false)
  })
})


describe('insights', () => {
  const e1 = exp({ id: '1', description: 'Seafood dinner', amount: 30000, date: '2026-01-01' })
  const e2 = exp({ id: '2', description: 'Airport taxi', amount: 6000, currency: 'USD', rate: 50, paidBy: 'b', date: '2026-01-03' })
  const r = insights([e1, e2], ['a', 'b', 'c'], 'INR')
  it('totals in base currency', () => expect(r.total).toBe(30000 + 300000))
  it('who paid and who consumed both sum to the total', () => {
    expect(Object.values(r.paid).reduce((s, v) => s + v, 0)).toBe(r.total)
    expect(Object.values(r.consumed).reduce((s, v) => s + v, 0)).toBe(r.total)
  })
  it('groups by category, biggest first, and finds the biggest expense', () => {
    expect(r.byCategory.map((c) => c.label)).toEqual(['Travel', 'Food'])
    expect(r.biggest?.description).toBe('Airport taxi')
  })
  it('averages per person per day over the trip span', () => expect(r.perPersonPerDay).toBe(Math.round(330000 / 3 / 3)))
  it('reports foreign-currency totals', () => expect(r.foreign).toEqual([{ currency: 'USD', amount: 6000 }]))
})
