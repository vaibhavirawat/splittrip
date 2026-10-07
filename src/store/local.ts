import type { Expense, Payment } from '../lib/split'
import { buildSample, uid as rid, type Group, type GroupData, type Store, type Unsub, type User } from './types'

// Offline demo store: one user, data persisted in localStorage. Used when Firebase env vars are absent.
const KEY = 'splittrip-local-v1'
const ME: User = { uid: 'local', name: 'You', isGuest: true }

interface DB {
  signedIn: boolean
  groups: Group[]
  expenses: Record<string, Expense[]>
  payments: Record<string, Payment[]>
}

function seed(): DB {
  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
  const gid = 'demo-goa'
  const e = (o: Partial<Expense> & Pick<Expense, 'description' | 'amount' | 'paidBy' | 'split'>, n: number): Expense => ({
    id: rid(), currency: 'INR', rate: 1, splitType: 'equal', date: day(n), createdAt: Date.now() - n, ...o,
  })
  const all = { local: 1, aarav: 1, meera: 1, kabir: 1 }
  return {
    signedIn: false,
    groups: [{
      id: gid, name: 'Goa Trip', baseCurrency: 'INR', graceDays: 7, createdBy: 'local', createdAt: Date.now(),
      memberUids: ['local'],
      members: { local: { name: 'You', uid: 'local' }, aarav: { name: 'Aarav', upi: 'aarav@okaxis' }, meera: { name: 'Meera', upi: 'meera@ybl' }, kabir: { name: 'Kabir', upi: 'kabir@paytm' } },
    }],
    expenses: {
      [gid]: [
        e({ description: 'Beach villa (2 nights)', amount: 2400000, paidBy: 'aarav', split: all, location: 'Calangute' }, 12),
        e({ description: 'Seafood dinner', amount: 520000, paidBy: 'local', split: all, location: 'Baga' }, 11),
        e({ description: 'Scooter rental', amount: 180000, paidBy: 'meera', splitType: 'ratio', split: { local: 1, aarav: 1, kabir: 2 }, location: 'Panjim' }, 10),
        e({ description: 'Airport taxi (paid in USD)', amount: 6000, currency: 'USD', rate: 83.5, paidBy: 'kabir', split: all, location: 'Dabolim' }, 9),
        e({ description: 'Cruise tickets', amount: 360000, paidBy: 'local', splitType: 'exact', split: { local: 90000, aarav: 90000, meera: 90000, kabir: 90000 }, location: 'Mandovi' }, 8),
      ],
    },
    payments: { [gid]: [] },
  }
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fall through */ }
  return seed()
}

let db = load()
const subs = new Set<() => void>()
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* private mode */ }
  subs.forEach((f) => f())
}
const watch = (f: () => void): Unsub => { subs.add(f); f(); return () => { subs.delete(f) } }
const find = (gid: string) => db.groups.find((g) => g.id === gid)

export const localStore: Store = {
  mode: 'local',
  onAuth: (cb) => watch(() => cb(db.signedIn ? ME : null)),
  signInGoogle: async () => { db.signedIn = true; save() },
  signInGuest: async () => { db.signedIn = true; save() },
  signOut: async () => { db.signedIn = false; save() },
  watchGroups: (_u, cb) => watch(() => cb([...db.groups])),
  watchGroup: (gid, cb) =>
    watch(() => {
      const group = find(gid)
      cb(group ? { group, expenses: db.expenses[gid] ?? [], payments: db.payments[gid] ?? [] } as GroupData : null)
    }),
  previewGroup: async (gid) => find(gid) ?? null,
  createGroup: async (user, name, baseCurrency, others) => {
    const id = rid()
    const members: Group['members'] = { [user.uid]: { name: user.name, uid: user.uid } }
    for (const n of others) members['g_' + rid()] = { name: n }
    db.groups = [{ id, name, baseCurrency, graceDays: 7, members, memberUids: [user.uid], createdBy: user.uid, createdAt: Date.now() }, ...db.groups]
    db.expenses[id] = []
    db.payments[id] = []
    save()
    return id
  },
  joinGroup: async () => { throw new Error('Joining groups needs the cloud version') },
  createSample: async (user) => {
    const { sample, members } = buildSample(user)
    const id = rid()
    db.groups = [{ id, name: sample.name, baseCurrency: sample.baseCurrency, graceDays: 7, members, memberUids: [user.uid], createdBy: user.uid, createdAt: Date.now() }, ...db.groups]
    db.expenses[id] = sample.expenses.map((e) => ({ ...e, id: rid(), createdAt: Date.now() })).reverse()
    db.payments[id] = sample.payments.map((p) => ({ ...p, id: rid(), createdAt: Date.now() }))
    save()
    return id
  },
  setMemberUpi: async (gid, memberId, upi) => {
    const m = find(gid)?.members[memberId]
    if (m) { if (upi) m.upi = upi; else delete m.upi }
    save()
  },
  addMember: async (gid, name) => {
    const g = find(gid)
    if (g) g.members['g_' + rid()] = { name }
    save()
  },
  addExpense: async (gid, e) => {
    ;(db.expenses[gid] ??= []).unshift({ ...e, id: rid(), createdAt: Date.now() })
    save()
  },
  updateExpense: async (gid, e) => {
    db.expenses[gid] = (db.expenses[gid] ?? []).map((x) => (x.id === e.id ? e : x))
    save()
  },
  deleteExpense: async (gid, id) => {
    db.expenses[gid] = (db.expenses[gid] ?? []).filter((x) => x.id !== id)
    save()
  },
  addPayment: async (gid, p) => {
    ;(db.payments[gid] ??= []).unshift({ ...p, id: rid(), createdAt: Date.now() })
    save()
  },
}
