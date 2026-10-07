import {
  GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut as fbSignOut,
} from 'firebase/auth'
import {
  addDoc, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc, where,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { Expense, Payment } from '../lib/split'
import { buildSample, uid as rid, type Group, type GroupData, type Store, type User } from './types'

const A = () => auth!
const D = () => db!

const toUser = (u: import('firebase/auth').User): User => ({
  uid: u.uid,
  name: u.displayName || (u.isAnonymous ? 'Guest' : u.email?.split('@')[0] || 'Me'),
  email: u.email ?? undefined,
  isGuest: u.isAnonymous,
})

export const cloudStore: Store = {
  mode: 'cloud',
  onAuth: (cb) => onAuthStateChanged(A(), (u) => cb(u ? toUser(u) : null)),
  signInGoogle: async () => {
    await signInWithPopup(A(), new GoogleAuthProvider())
  },
  signInGuest: async () => {
    await signInAnonymously(A())
  },
  signOut: () => fbSignOut(A()),

  watchGroups: (uid, cb) =>
    onSnapshot(query(collection(D(), 'groups'), where('memberUids', 'array-contains', uid)), (s) =>
      cb(s.docs.map((d) => ({ ...(d.data() as Group), id: d.id })).sort((a, b) => b.createdAt - a.createdAt)),
    ),

  watchGroup: (gid, cb) => {
    let group: Group | null = null
    let expenses: Expense[] = []
    let payments: Payment[] = []
    const emit = () => cb(group ? { group, expenses, payments } : null)
    const g = doc(D(), 'groups', gid)
    const u1 = onSnapshot(g, (s) => {
      group = s.exists() ? ({ ...(s.data() as Group), id: s.id }) : null
      emit()
    }, () => cb(null))
    const u2 = onSnapshot(query(collection(g, 'expenses'), orderBy('date', 'desc')), (s) => {
      expenses = s.docs.map((d) => ({ ...(d.data() as Expense), id: d.id }))
      emit()
    })
    const u3 = onSnapshot(query(collection(g, 'payments'), orderBy('createdAt', 'desc')), (s) => {
      payments = s.docs.map((d) => ({ ...(d.data() as Payment), id: d.id }))
      emit()
    })
    return () => { u1(); u2(); u3() }
  },

  previewGroup: async (gid) => {
    const s = await getDoc(doc(D(), 'groups', gid))
    return s.exists() ? ({ ...(s.data() as Group), id: s.id }) : null
  },

  createGroup: async (user, name, baseCurrency, others) => {
    const members: Group['members'] = { [user.uid]: { name: user.name, uid: user.uid } }
    for (const n of others) members['g_' + rid()] = { name: n }
    const ref = await addDoc(collection(D(), 'groups'), {
      name, baseCurrency, graceDays: 7, members, memberUids: [user.uid], createdBy: user.uid, createdAt: Date.now(),
    })
    return ref.id
  },

  joinGroup: async (user, gid, claim) => {
    const ref = doc(D(), 'groups', gid)
    const joined = claim
      ? { [`members.${claim}.uid`]: user.uid }
      : { [`members.${user.uid}`]: { name: user.name, uid: user.uid } }
    await updateDoc(ref, { memberUids: arrayUnion(user.uid), ...joined })
  },

  createSample: async (user) => {
    const { sample, members } = buildSample(user)
    const ref = await addDoc(collection(D(), 'groups'), {
      name: sample.name, baseCurrency: sample.baseCurrency, graceDays: 7, members, memberUids: [user.uid], createdBy: user.uid, createdAt: Date.now(),
    })
    const now = Date.now()
    await Promise.all([
      ...sample.expenses.map((e, i) => addDoc(collection(ref, 'expenses'), clean({ ...e, createdAt: now + i }))),
      ...sample.payments.map((p) => addDoc(collection(ref, 'payments'), clean({ ...p, createdAt: now }))),
    ])
    return ref.id
  },
  setMemberUpi: async (gid, memberId, upi) => {
    await updateDoc(doc(D(), 'groups', gid), { [`members.${memberId}.upi`]: upi ? upi : deleteField() })
  },
  addMember: async (gid, name) => {
    await updateDoc(doc(D(), 'groups', gid), { [`members.g_${rid()}`]: { name } })
  },
  addExpense: async (gid, e) => {
    await addDoc(collection(D(), 'groups', gid, 'expenses'), clean({ ...e, createdAt: Date.now() }))
  },
  updateExpense: async (gid, e) => {
    await setDoc(doc(D(), 'groups', gid, 'expenses', e.id), clean(e))
  },
  deleteExpense: async (gid, id) => {
    await deleteDoc(doc(D(), 'groups', gid, 'expenses', id))
  },
  addPayment: async (gid, p) => {
    const id = rid()
    await setDoc(doc(D(), 'groups', gid, 'payments', id), clean({ ...p, createdAt: Date.now() }))
  },
}

// Firestore rejects `undefined` values.
const clean = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o))

export type { GroupData }
