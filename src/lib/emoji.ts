const RULES: [RegExp, string][] = [
  [/(flight|airport|plane|taxi|cab|uber|ola|bus|train|metro|scooter|car|fuel|petrol)/i, '🚕'],
  [/(hotel|villa|stay|airbnb|hostel|room|resort)/i, '🏨'],
  [/(dinner|lunch|breakfast|food|pizza|cafe|coffee|restaurant|seafood|snack|drinks?|bar|beer)/i, '🍜'],
  [/(ticket|cruise|movie|show|entry|park|museum|tour|trek|ski|party|club)/i, '🎟️'],
  [/(grocer|market|shop|mall|gift)/i, '🛍️'],
  [/(rent|bill|wifi|electric|water|gas|internet)/i, '🧾'],
]
export const emojiFor = (text: string) => RULES.find(([r]) => r.test(text))?.[1] ?? '💸'
