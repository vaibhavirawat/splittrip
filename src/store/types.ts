import type { Expense, Payment } from '../lib/split'
import { sampleTrip } from '../lib/sample'

export interface User {
  uid: string
  name: string
  email?: string
  isGuest: boolean
}

export interface Member {
  name: string
  uid?: string // set once a real account has claimed this member
  upi?: string // UPI ID (VPA) other members can pay
}

export interface Group {
  id: string
  name: string
  baseCurrency: string
  graceDays: number // days before an unpaid share is flagged overdue
  members: Record<string, Member>
  memberUids: string[]
  createdBy: string
  createdAt: number
}

export interface GroupData {
  group: Group
  expenses: Expense[]
  payments: Payment[]
}

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>
export type NewPayment = Omit<Payment, 'id' | 'createdAt'>
export type Unsub = () => void

export interface Store {
  mode: 'cloud' | 'local'
  onAuth(cb: (u: User | null) => void): Unsub
  signInGoogle(): Promise<void>
  signInGuest(): Promise<void>
  signOut(): Promise<void>
  watchGroups(uid: string, cb: (g: Group[]) => void): Unsub
  watchGroup(gid: string, cb: (d: GroupData | null) => void): Unsub
  previewGroup(gid: string): Promise<Group | null>
  createGroup(user: User, name: string, baseCurrency: string, others: string[]): Promise<string>
  joinGroup(user: User, gid: string, claimMemberId?: string): Promise<void>
  addMember(gid: string, name: string): Promise<void>
  setMemberUpi(gid: string, memberId: string, upi: string): Promise<void> // empty string clears it
  addExpense(gid: string, e: NewExpense): Promise<void>
  updateExpense(gid: string, e: Expense): Promise<void>
  deleteExpense(gid: string, id: string): Promise<void>
  addPayment(gid: string, p: NewPayment): Promise<void>
  createSample(user: User): Promise<string>
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** Shared by both stores: turn the sample trip into a group plus its records. */
export function buildSample(user: User) {
  const s = sampleTrip(user.uid)
  const members: Group['members'] = { [user.uid]: { name: user.name, uid: user.uid } }
  for (const [id, o] of Object.entries(s.others)) members[id] = { name: o.name, ...(o.upi && { upi: o.upi }) }
  return { sample: s, members }
}
