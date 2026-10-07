# SplitTrip

Group expense manager built from the PBL paper: equal/ratio/exact bill splitting (Dutch treat), automatic loan tracking with overdue reminders, multi-currency and multi-location expenses with historical FX, minimum-payment settle-up, and Razorpay test-mode payments. Installable PWA with live sync through Firebase.

**Stack:** React + TypeScript + Vite · Firebase Auth + Firestore (real-time) · Razorpay Checkout (test mode) · Vitest

## Run locally
```bash
npm install
npm run dev      # no .env needed: runs in offline demo mode with sample data
npm test         # unit tests for the split / balance / settle / loan engine
```

## Go live (so your resume link works)
1. **Firebase project:** console.firebase.google.com → Add project → Build → **Authentication** → Sign-in method: enable **Google** and **Anonymous**. Build → **Firestore Database** → Create (production mode).
2. **Web app config:** Project settings → Your apps → add a Web app → copy the config into `.env` (copy `.env.example`).
3. **Razorpay (optional):** dashboard.razorpay.com → switch to *Test Mode* → Settings → API Keys → put the `rzp_test_...` key id in `.env` as `VITE_RAZORPAY_KEY_ID`.
4. **Deploy:**
   ```bash
   npx firebase login
   npx firebase use --add          # pick your project
   npm run deploy                  # builds, then publishes hosting + Firestore rules
   ```
   Your link will be `https://<project-id>.web.app`. Add that domain under Authentication → Settings → Authorized domains if it isn't there already.
5. Put the link in your resume. Use *Try as guest* on the login page to check it works without your Google account.

## How it maps to the paper
| Paper section | Where |
|---|---|
| 5.1 Bill splitting / Dutch treat | `src/lib/split.ts` (`allocate`, `sharesInBase`), `ExpenseForm.tsx` |
| 5.2 Loan tracking | `loans()` in `split.ts`, Loans tab |
| 5.3 Multi-location / multi-currency | per-expense currency + date-based FX rate (`lib/rates.ts`), location with GPS detect |
| 5.4 Real-time adjustment | Firestore `onSnapshot` in `store/cloud.ts`; balances recomputed on every change |
| 5.5 Reminders | overdue badges, browser notification on open, WhatsApp reminder link |
| 6.3 Payments | Razorpay test checkout in `lib/razorpay.ts` |

## Notes and limits
- Money is stored as integer minor units; shares use largest-remainder rounding so they always sum exactly.
- Razorpay runs in **test mode** only (no real money). Production would need server-created orders and signature verification.
- Reminders are in-app, WhatsApp-share links and browser notifications while the app is open. True background push (FCM) needs a server, which is out of scope for the free tier.
