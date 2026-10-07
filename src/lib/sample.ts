import type { Expense, Payment } from './split'

export interface Sample {
  name: string
  baseCurrency: string
  others: Record<string, { name: string; upi?: string }> // placeholder member id -> details
  expenses: Omit<Expense, 'id' | 'createdAt'>[]
  payments: Omit<Payment, 'id' | 'createdAt'>[]
}

const day = (n: number) => {
  const d = new Date(Date.now() - n * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A realistic Goa trip that touches every feature: all split types, a USD expense, an overdue loan, a part-payment. */
export function sampleTrip(me: string): Sample {
  const A = 'g_aarav', M = 'g_meera', K = 'g_kabir'
  const all = { [me]: 1, [A]: 1, [M]: 1, [K]: 1 }
  const e = (o: Partial<Expense> & Pick<Expense, 'description' | 'amount' | 'paidBy' | 'split'>): Omit<Expense, 'id' | 'createdAt'> => ({
    currency: 'INR', rate: 1, splitType: 'equal', date: day(0), ...o,
  })
  return {
    name: 'Goa Trip (sample)',
    baseCurrency: 'INR',
    others: { [A]: { name: 'Aarav', upi: 'aarav@okaxis' }, [M]: { name: 'Meera', upi: 'meera@ybl' }, [K]: { name: 'Kabir', upi: 'kabir@paytm' } },
    expenses: [
      e({ description: 'Beach villa, 2 nights', amount: 2400000, paidBy: A, split: all, date: day(12), location: 'Calangute, India', dueDate: day(8) }),
      e({ description: 'Seafood dinner', amount: 520000, paidBy: me, split: all, date: day(11), location: 'Baga, India' }),
      e({ description: 'Scooter rental', amount: 180000, paidBy: M, splitType: 'ratio', split: { [me]: 1, [A]: 1, [K]: 2 }, date: day(10), location: 'Panjim, India' }),
      e({ description: 'Airport taxi (paid in USD)', amount: 6000, currency: 'USD', rate: 83.5, paidBy: K, split: all, date: day(9), location: 'Dabolim, India' }),
      e({ description: 'Sunset cruise tickets', amount: 360000, paidBy: me, splitType: 'exact', split: { [me]: 90000, [A]: 90000, [M]: 90000, [K]: 90000 }, date: day(8), location: 'Mandovi river' }),
      e({ description: 'Groceries and snacks', amount: 140000, paidBy: A, split: { [me]: 1, [A]: 1, [M]: 1 }, date: day(3) }),
    ],
    payments: [{ from: M, to: A, amount: 200000, date: day(2), method: 'manual' }],
  }
}
