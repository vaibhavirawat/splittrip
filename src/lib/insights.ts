import { categoryFor } from './emoji'
import { sharesInBase, toBase, type Expense } from './split'

export interface Insights {
  total: number
  count: number
  paid: Record<string, number> // member id -> base minor units they paid out
  consumed: Record<string, number> // member id -> base minor units of their own shares
  byCategory: { label: string; emoji: string; amount: number }[]
  byDay: { date: string; amount: number }[]
  biggest?: { description: string; amount: number; paidBy: string }
  perPersonPerDay: number
  foreign: { currency: string; amount: number }[] // original-currency totals for non-base currencies
}

/** Everything the Insights tab shows, derived purely from expenses (base-currency minor units). */
export function insights(expenses: Expense[], memberIds: string[], baseCurrency: string): Insights {
  const paid: Record<string, number> = {}
  const consumed: Record<string, number> = {}
  for (const m of memberIds) { paid[m] = 0; consumed[m] = 0 }
  const cats = new Map<string, { label: string; emoji: string; amount: number }>()
  const days = new Map<string, number>()
  const fx = new Map<string, number>()
  let total = 0
  let biggest: Insights['biggest']

  for (const e of expenses) {
    const base = toBase(e.amount, e.rate)
    total += base
    paid[e.paidBy] = (paid[e.paidBy] ?? 0) + base
    for (const [id, s] of Object.entries(sharesInBase(e))) consumed[id] = (consumed[id] ?? 0) + s
    const c = categoryFor(e.description)
    cats.set(c.label, { ...c, amount: (cats.get(c.label)?.amount ?? 0) + base })
    days.set(e.date, (days.get(e.date) ?? 0) + base)
    if (e.currency !== baseCurrency) fx.set(e.currency, (fx.get(e.currency) ?? 0) + e.amount)
    if (!biggest || base > biggest.amount) biggest = { description: e.description, amount: base, paidBy: e.paidBy }
  }

  const byDay = [...days].map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date))
  let spanDays = 1
  if (byDay.length > 1) {
    spanDays = Math.max(1, Math.round((new Date(byDay[byDay.length - 1].date).getTime() - new Date(byDay[0].date).getTime()) / 86_400_000) + 1)
  }
  return {
    total,
    count: expenses.length,
    paid,
    consumed,
    byCategory: [...cats.values()].sort((a, b) => b.amount - a.amount),
    byDay,
    biggest,
    perPersonPerDay: memberIds.length ? Math.round(total / memberIds.length / spanDays) : 0,
    foreign: [...fx].map(([currency, amount]) => ({ currency, amount })),
  }
}
