// Razorpay Checkout in TEST mode. With a rzp_test_ key no real money moves.
declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open(): void; on(e: string, f: (r: unknown) => void): void } }
}

export const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined
export const razorpayEnabled = Boolean(razorpayKey)

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => res()
    s.onerror = () => rej(new Error('Could not load Razorpay'))
    document.head.appendChild(s)
  })
}

/** Resolves with the Razorpay payment id on success, rejects if the user closes the dialog or it fails. */
export async function payWithRazorpay(opts: { amountPaise: number; payeeName: string; payerName: string; note: string }): Promise<string> {
  await loadScript()
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay!({
      key: razorpayKey,
      amount: opts.amountPaise,
      currency: 'INR',
      name: 'SplitTrip',
      description: opts.note,
      prefill: { name: opts.payerName },
      notes: { payee: opts.payeeName },
      theme: { color: '#0f766e' },
      handler: (r: { razorpay_payment_id: string }) => resolve(r.razorpay_payment_id),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    })
    rz.on('payment.failed', () => reject(new Error('Payment failed')))
    rz.open()
  })
}
