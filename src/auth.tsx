import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { store, type User } from './store'

const Ctx = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false })
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, set] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false })
  useEffect(() => store.onAuth((user) => set({ user, ready: true })), [])
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}
