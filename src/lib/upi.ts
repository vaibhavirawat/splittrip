// UPI deep links: https://www.npci.org.in/ (UPI linking specs). Works with Google Pay, PhonePe, Paytm, BHIM...

/** A UPI ID (VPA) looks like name@bank: letters, digits, dot, dash, underscore, then @handle. */
export const isValidVpa = (s: string) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(s.trim())

export interface UpiRequest {
  vpa: string
  name: string
  amountMinor: number // paise
  note: string
}

/** upi://pay link. Amount is formatted with two decimals; the note is trimmed to a safe length. */
export function upiLink({ vpa, name, amountMinor, note }: UpiRequest): string {
  const q = new URLSearchParams({
    pa: vpa.trim(),
    pn: name,
    am: (amountMinor / 100).toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 80),
  })
  return `upi://pay?${q.toString().replace(/\+/g, '%20')}`
}

/** QR code as a data URL. qrcode is loaded on demand so it stays out of the main bundle. */
export async function upiQr(link: string): Promise<string> {
  const { toDataURL } = await import('qrcode')
  return toDataURL(link, { margin: 1, width: 280, errorCorrectionLevel: 'M' })
}
