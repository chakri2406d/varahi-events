# Varahi Events — Go-Live Verification Checklist

Work through this once end to end. Nothing here has been tested in a running
browser yet, so treat every ✅ as unverified until you've clicked it yourself.

Report back anything that errors and I'll fix it.

---

## 0. Before you start (blocking)

- [ ] **Set the real UPI ID** in `src/utils/constants.js` → `BUSINESS_INFO.upiId`.
      Until this is done, **no customer can pay you** — the QR points at a fake ID.
- [ ] Publish `firestore.rules` in Firebase Console → Firestore → Rules.
- [ ] Firebase Console → Authentication → Settings → Authorized domains →
      add `varahi-events-alpha.vercel.app`.
- [ ] Make yourself admin: Firestore → `users` → your doc → `role: "admin"`.
- [ ] Keep the browser **DevTools Console open** (F12) the whole time. Firestore
      "needs an index" errors appear there with a one-click fix link — see §7.

---

## 1. Seed your real data (admin)

- [ ] **Admin → Equipment**: add each real machine with name, description,
      total qty, available qty, and **rate per unit**.
- [ ] **Admin → Pricing**: confirm each machine shows the right rate and the
      "Customer sees" preview reads correctly. Try clearing one rate → it should
      show "Price on request", **not** ₹0.
- [ ] **Admin → Crew**: add your operators/drivers.
- [ ] **Admin → Gallery**: upload 2–3 photos. Confirm a large photo (>2 MB) is
      accepted and compressed rather than rejected.

---

## 2. Customer journey (use a private window / second account)

- [ ] Register a new account. Confirm it lands on the dashboard.
- [ ] **Equipment page**: search for a machine; sort by price low→high and
      high→low. Confirm "price on request" items sort **last**, not as ₹0.
- [ ] Select 2 machines, set quantities, click Proceed.
- [ ] **Booking flow**:
  - [ ] Try to continue with no date → blocked.
  - [ ] Try no start time → blocked.
  - [ ] Try a bad phone number → blocked.
  - [ ] Set an end date **before** the start date → blocked.
  - [ ] Confirm the **Estimated Total** matches rate × qty.
- [ ] Submit the request. Confirm you reach the payment step.
- [ ] **Payment step**: confirm the hold badge counts **down** in real time.
      Leave it 30 min (or temporarily shorten the hold) → it should flip to
      "Hold expired".
- [ ] Scan the UPI QR with a real UPI app — confirm it resolves to **your real
      UPI ID** (do not complete a payment; just check the name/ID shown).
- [ ] Submit a transaction ID + screenshot. Confirm success.
- [ ] **Dashboard**: booking appears, status "Payment Verification Pending".
- [ ] Click **View Full Details** → timeline, equipment, payments all correct.

---

## 3. Admin processing

- [ ] **Admin → Bookings**: the new request appears. Open it.
- [ ] Try to Accept with total set but **less than 40% paid** → must be blocked.
- [ ] Set a total where the advance ≥ 40% → Accept succeeds.
- [ ] **Calendar** (public): the event date now shows blocked. For a multi-day
      booking, confirm **every day in the range** is blocked.
- [ ] Confirm the block says "Booked — Unavailable" and does **not** show the
      customer's name or address.
- [ ] Customer side: the bell icon shows an unread notification.
- [ ] **Assign crew** on the booking. Then create a second booking on the same
      date and confirm the crew picker flags that person as already committed.
- [ ] **Message on WhatsApp** button opens WhatsApp with the message pre-filled.

### Double-booking (the important one)
- [ ] Note a machine's total qty (say 2). Create and confirm a booking using all 2
      on a date.
- [ ] Create a second booking for the **same machine, same date** → Accept must
      be **refused** with "need X, only Y free".
- [ ] Repeat via **Add Offline Booking** with equipment selected → also refused.

---

## 4. Money

- [ ] **Record a payment** (cash) on a booking → totals update.
- [ ] Customer side: on a confirmed booking with a balance, use
      **Pay Remaining Balance**. Submit amount + txn ID.
- [ ] Admin: the booking shows "Payment submitted — needs verification".
      **Approve** it → amount is added, notice clears.
- [ ] Try **Reject** on another submission → clears without adding money.
- [ ] **Record a refund** → confirm it appears as a negative payment and the
      collected total drops. Try refunding more than collected → blocked.
- [ ] **Download Invoice**: check invoice number (VE-0001), both phone numbers,
      Hyderabad address, correct totals, and that "Rs." renders (not a blank box).
- [ ] Download the invoice **again** → the invoice number must be **the same**,
      not incremented.

---

## 5. Event day (QR)

- [ ] Customer: open a confirmed booking → **Show Event QR Codes**.
- [ ] Admin (on a phone, over HTTPS): **Admin → Scan QR** → allow camera.
- [ ] Scan the **Start** code → status becomes "Event Started"; camera stops and
      shows "Scan Another Code".
- [ ] Scan **Start** again → says already started (no duplicate).
- [ ] Scan **End** → status becomes Completed.
- [ ] Scan **End** on a booking that never started → must say "Scan the START
      code first".
- [ ] Customer gets notifications for both.

---

## 6. Cancellation & the rest

- [ ] Customer cancels a booking >48h out → shows **free cancellation**.
- [ ] Cancel one <48h out → shows the **50% charge** before confirming.
- [ ] After cancelling, check the **public calendar** — the date must be **free
      again** (this was previously broken).
- [ ] Admin cancels a booking → same: date released, charge shown in the dialog.
- [ ] **Completed booking** → customer sees "How did we do?" → leave a review.
- [ ] **Admin → Reviews**: the review is Pending. Approve it.
- [ ] **Homepage**: the testimonial now appears. Unapprove → it disappears.
- [ ] **Contact form**: submit an inquiry → **Admin → Inquiries** shows it.
      Mark handled, then delete.
- [ ] **Admin → Today**: confirm today's/tomorrow's events show with times,
      equipment, crew and balance due.
- [ ] **Admin → Analytics**: check with real data that revenue attribution and
      top customers look sane.
- [ ] **Admin → Backup**: download the JSON backup; open it and confirm dates
      are readable ISO strings, not empty objects.
- [ ] **Calendar**: tap a free future date → lands on Equipment with that date
      pre-filled in the booking flow.
- [ ] Footer links: FAQ, Terms, Privacy all load.
- [ ] Refresh the page on `/booking/<id>` directly → must load, not 404
      (this verifies the Vercel rewrite).
- [ ] Try opening **someone else's** booking id at `/booking/<other-id>` →
      must show "Booking not found".

---

## 7. Firestore indexes (expect these)

Several new queries filter and sort on multiple fields. The first time each runs
you may see in the console:

> The query requires an index. You can create it here: https://console.firebase.google.com/...

**Click the link, create the index, wait ~1 minute, retry.** Most likely to
appear on: availability checks (`eventDate` range), P&L (`createdAt` range),
inquiries and reviews. This is normal, not a bug.

---

## 8. Mobile

- [ ] Whole flow once on a real phone.
- [ ] PWA install prompt appears; install and launch from the home screen.
- [ ] QR scanner works from the installed app (needs HTTPS).

---

## Known limitations (by design, not bugs)

- Payments are verified manually — there's no payment gateway (avoids fees).
- WhatsApp messages are pre-filled links you tap to send (avoids API costs).
- Reviews require your approval before appearing publicly.
- GST is off until you set `gstin` and `gstRate: 18` in `constants.js`.
- Events longer than 30 days aren't supported by the availability check.
