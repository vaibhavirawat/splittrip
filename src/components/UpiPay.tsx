import { useEffect, useState } from 'react'
import { formatMoney } from '../lib/split'
import { upiLink, upiQr } from '../lib/upi'
import Avatar from './Avatar'

interface Props {
  payee: { name: string; upi: string }
  payerName: string
  amountMinor: number
  note: string
  onPaid: () => Promise<void> | void
  onClose: () => void
}

/** Shows a scannable UPI QR plus an "open in UPI app" deep link. Payment is self-confirmed with "I've paid". */
export default function UpiPay({ payee, payerName, amountMinor, note, onPaid, onClose }: Props) {
  const link = upiLink({ vpa: payee.upi, name: payee.name, amountMinor, note })
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { upiQr(link).then(setQr).catch(() => setQr('')) }, [link])

  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet stack" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>Pay with UPI 📲</h2>
        <div className="who" style={{ justifyContent: 'center' }}>
          <Avatar name={payerName} size={30} />→<Avatar name={payee.name} size={30} /><b>{payee.name}</b>
        </div>
        <div className="upi-amt">{formatMoney(amountMinor, 'INR')}</div>
        <div className="mute">to {payee.upi}</div>
        <div className="qr">{qr ? <img src={qr} alt={`UPI QR code to pay ${payee.name}`} width={220} height={220} /> : <span className="mute">Making QR…</span>}</div>
        <p className="mute" style={{ margin: 0 }}>On a computer, scan this with any UPI app. On your phone, tap the button.</p>
        <a className="btn primary" href={link}>Open UPI app</a>
        <button disabled={busy} onClick={async () => { setBusy(true); await onPaid(); onClose() }}>I've paid ✅</button>
        <p className="mute" style={{ margin: 0, fontSize: '.78rem' }}>SplitTrip can't see your bank, so tap “I've paid” after the payment succeeds in your UPI app.</p>
      </div>
    </div>
  )
}
