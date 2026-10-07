export interface Category { emoji: string; label: string }

const RULES: [RegExp, Category][] = [
  [/(flight|airport|plane|taxi|cab|uber|ola|bus|train|metro|scooter|car|fuel|petrol)/i, { emoji: '🚕', label: 'Travel' }],
  [/(hotel|villa|stay|airbnb|hostel|room|resort)/i, { emoji: '🏨', label: 'Stay' }],
  [/(dinner|lunch|breakfast|food|pizza|cafe|coffee|restaurant|seafood|snack|drinks?|bar|beer)/i, { emoji: '🍜', label: 'Food' }],
  [/(ticket|cruise|movie|show|entry|park|museum|tour|trek|ski|party|club)/i, { emoji: '🎟️', label: 'Fun' }],
  [/(grocer|market|shop|mall|gift)/i, { emoji: '🛍️', label: 'Shopping' }],
  [/(rent|bill|wifi|electric|water|gas|internet)/i, { emoji: '🧾', label: 'Bills' }],
]
const OTHER: Category = { emoji: '💸', label: 'Other' }

export const categoryFor = (text: string): Category => RULES.find(([r]) => r.test(text))?.[1] ?? OTHER
export const emojiFor = (text: string) => categoryFor(text).emoji
