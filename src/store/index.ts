import { cloudEnabled } from '../lib/firebase'
import { cloudStore } from './cloud'
import { localStore } from './local'

export const store = cloudEnabled ? cloudStore : localStore
export * from './types'
