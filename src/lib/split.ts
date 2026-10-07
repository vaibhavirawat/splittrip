// Pure money logic. All amounts are integer minor units (cents/paise) to avoid float drift.

export type SplitType = 'equal' | 'ratio' | 'exact'

export interface Expense {
  id: string
  description: string
  amount: number // minor units, in `currency`
  currency: string
  rate: number // 1 unit of `currency` = `rate` units of the group's base currency, at expense time
  paidBy: string
  splitType: SplitType
  // equal: keys = participants (values ignored). ratio: weights. exact: minor units in `currency`.
  split: Record<string, number>
  date: string // ISO yyyy-mm-dd
  location?: string
  dueDate?: string
  createdAt: number
}

export interface Payment {
  id: string
  from: string
  to: string
  amount: number // minor units in base currency
  date: string
  method: 'manual' | 'razorpay'
  ref?: string
  createdAt: number
}

/** Split `total` across weights using the largest-remainder method so shares always sum to `total`. */
export function allocate(total: number, weights: Record<string, number>): Record<string, number> {
  const ids = Object.keys(weights).filter((k) => weights[k] > 0)
  const out: Record<string, number> = {}
  for (const k of Object.keys(weights)) out[k] = 0
  const sum = ids.reduce((s, k) => s + weights[k], 0)
  if (ids.length === 0 || sum <= 0) return out
  let given = 0
  const rems: [string, number][] = []
  for (const k of ids) {
    const exact = (total * weights[k]) / sum
    const floor = Math.floor(exact)
    out[k] = floor
    given += floor
    rems.push([k, exact - floor])
  }
  rems.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  for (let i = 0; i < total - given; i++) out[rems[i % rems.length][0]]++
  return out
}

export const toBase = (minor: number, rate: number) => Math.round(minor * rate)

/** Each participant's share of an expense, in base-currency minor units. Sums exactly to the base total. */
export function sharesInBase(e: Expense): Record<string, number> {
  const total = toBase(e.amount, e.rate)
  const weights: Record<string, number> = {}
  for (const [k, v] of Object.entries(e.split)) weights[k] = e.splitType === 'equal' ? 1 : v
  return allocate(total, weights)
}

/** Net position per member in base minor units: positive = is owed, negative = owes. */
export function balances(memberIds: string[], expenses: Expense[], payments: Payment[]): Record<string, number> {
  const b: Record<string, number> = {}
  for (const m of memberIds) b[m] = 0
  const add = (id: string, n: number) => (b[id] = (b[id] ?? 0) + n)
  for (const e of expenses) {
    add(e.paidBy, toBase(e.amount, e.rate))
    for (const [id, s] of Object.entries(sharesInBase(e))) add(id, -s)
  }
  for (const p of payments) {
    add(p.from, p.amount)
    add(p.to, -p.amount)
  }
  return b
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

/** Greedy minimum-cash-flow: at most (n-1) transfers that clear every balance. */
export function settle(bal: Record<string, number>): Transfer[] {
  const debtors = Object.entries(bal).filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }))
  const creditors = Object.entries(bal).filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }))
  debtors.sort((a, b) => b.v - a.v)
  creditors.sort((a, b) => b.v - a.v)
  const out: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v)
    if (amt > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: amt })
    debtors[i].v -= amt
    creditors[j].v -= amt
    if (debtors[i].v === 0) i++
    if (creditors[j].v === 0) j++
  }
  return out
}

export interface Loan extends Transfer {
  since: string // date of the oldest expense still contributing to this debt
  dueDate?: string
  daysOutstanding: number
  overdue: boolean
}

const DAY = 86_400_000

/**
 * Loans = outstanding transfers, enriched with age. The debtor's oldest expense that they
 * took part in (and did not pay for) dates the loan; an explicit due date wins over the default grace period.
 */
export function loans(
  bal: Record<string, number>,
  expenses: Expense[],
  graceDays: number,
  now = Date.now(),
): Loan[] {
  return settle(bal).map((t) => {
    const relevant = expenses
      .filter((e) => e.paidBy === t.to && t.from in e.split)
      .sort((a, b) => a.date.localeCompare(b.date))
    const oldest = relevant[0]
    const since = oldest?.date ?? new Date(now).toISOString().slice(0, 10)
    const dueDate = relevant.map((e) => e.dueDate).filter(Boolean).sort()[0]
    const days = Math.max(0, Math.floor((now - new Date(since).getTime()) / DAY))
    const dueTs = dueDate ? new Date(dueDate).getTime() + DAY : new Date(since).getTime() + graceDays * DAY
    return { ...t, since, dueDate, daysOutstanding: days, overdue: now > dueTs }
  })
}

export const parseMoney = (s: string): number => Math.round(parseFloat(s.replace(/,/g, '')) * 100) || 0

export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`
  }
}
