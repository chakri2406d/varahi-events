import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, writeBatch, Timestamp, runTransaction,
} from 'firebase/firestore'
import { db } from './config'

// Statuses that actually hold equipment on a date (a cancelled or merely
// requested booking does not reserve stock).
export const HOLDING_STATUSES = ['confirmed', 'event_started', 'completed']

/* ═══════════════════════════════════════════════════════════════
   MACHINES
═══════════════════════════════════════════════════════════════ */
export const getMachines = async () => {
  const snap = await getDocs(query(collection(db, 'machines'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addMachine = (data) =>
  addDoc(collection(db, 'machines'), { ...data, createdAt: serverTimestamp() })

export const updateMachine = (id, data) =>
  updateDoc(doc(db, 'machines', id), data)

export const deleteMachine = (id) =>
  deleteDoc(doc(db, 'machines', id))

/* ═══════════════════════════════════════════════════════════════
   BOOKINGS
═══════════════════════════════════════════════════════════════ */
export const createBooking = async (data) => {
  const ref = await addDoc(collection(db, 'bookings'), {
    ...data,
    status:    'requested',
    createdAt: serverTimestamp(),
    holdUntil: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)), // 30-min hold
  })
  return ref.id
}

// Admin-created walk-in / offline booking. There is no online request and no
// user account — the admin fills in the basics and the cash (or online) amount
// received. It's saved as "confirmed" so it counts toward revenue immediately.
export const createOfflineBooking = async ({
  customerName, customerPhone = '', eventDate = '', eventLocation = '',
  totalAmount, amount, method = 'cash', note = '', machines = [],
} = {}) => {
  const amt   = Number(amount) || 0
  const total = Number(totalAmount) || amt
  const cashPaid   = method === 'cash'   ? amt : 0
  const onlinePaid = method === 'online' ? amt : 0
  const payments = amt > 0 ? [{
    amount:    amt,
    method,
    reference: note.trim(),
    date:      new Date().toISOString(),
    addedBy:   'admin',
  }] : []

  const ref = await addDoc(collection(db, 'bookings'), {
    customerName,
    customerPhone,
    eventDate,
    eventLocation,
    userId:          null,
    // Walk-ins MUST carry their equipment too, otherwise they're invisible to
    // getCommittedQtyForDate() and silently allow double-booking.
    machines:        Array.isArray(machines) ? machines : [],
    status:          'confirmed',
    source:          'offline',
    walkIn:          true,
    totalAmount:     total,
    payments,
    cashPaid,
    onlinePaid,
    amountPaid:      cashPaid + onlinePaid,
    paymentVerified: true,
    confirmedAt:     new Date().toISOString(),
    createdAt:       serverTimestamp(),
  })
  return ref.id
}

export const getUserBookings = async (uid) => {
  // No orderBy in the query so we don't need a composite index
  // (userId + createdAt). We sort client-side instead.
  const snap = await getDocs(query(
    collection(db, 'bookings'),
    where('userId', '==', uid),
  ))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

// Real-time listener for a single user's bookings so the user dashboard
// updates instantly when the admin confirms or changes a booking.
export const listenUserBookings = (uid, callback) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('userId', '==', uid)),
    snap => {
      const rows = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      callback(rows)
    },
  )

export const getAllBookings = async () => {
  const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getBookingById = async (id) => {
  const snap = await getDoc(doc(db, 'bookings', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const updateBookingStatus = (id, status, extra = {}) =>
  updateDoc(doc(db, 'bookings', id), { status, updatedAt: serverTimestamp(), ...extra })

/* ── QR check-in / check-out ───────────────────────────────────────────────
   The customer portal shows two QR codes per confirmed booking:
     start → "VARAHI:<bookingId>:start"   end → "VARAHI:<bookingId>:end"
   The admin scans them. Scanning start marks the event started (records the
   start time); scanning end marks it completed (records the end time). */
export const applyQrScan = async (payload) => {
  const parts = String(payload || '').trim().split(':')
  if (parts[0] !== 'VARAHI' || parts.length < 3) throw new Error('Not a valid Varahi event QR')
  const bookingId = parts[1]
  const action    = parts[2]

  const ref  = doc(db, 'bookings', bookingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Booking not found')
  const b = snap.data()

  if (action === 'start') {
    if (b.status === 'completed')      throw new Error('This event is already completed')
    if (b.status === 'cancelled')      throw new Error('This booking is cancelled')
    if (b.status === 'event_started')  return { action, name: b.customerName, already: true, at: b.startedAt }
    const startedAt = new Date().toISOString()
    await updateDoc(ref, { status: 'event_started', startedAt, updatedAt: serverTimestamp() })
    return { action, name: b.customerName, at: startedAt }
  }

  if (action === 'end') {
    if (b.status === 'cancelled')      throw new Error('This booking is cancelled')
    if (b.status === 'completed')      return { action, name: b.customerName, already: true, at: b.endedAt }
    if (b.status !== 'event_started')  throw new Error('Scan the START code first')
    const endedAt = new Date().toISOString()
    await updateDoc(ref, { status: 'completed', endedAt, updatedAt: serverTimestamp() })
    return { action, name: b.customerName, at: endedAt }
  }

  throw new Error('Unknown QR action')
}

/* ── Payments ─────────────────────────────────────────────────────────────
   Each booking can hold multiple method-tagged payments. cashPaid / onlinePaid
   / amountPaid are cached on the doc so the UI and stats can read them cheaply.
   paymentBreakdown() is the single source of truth for reading the split and
   is back-compatible with older bookings that only had a single amountPaid. */

// Returns { cash, online, total } for a booking, handling legacy data.
export const paymentBreakdown = (b) => {
  if (!b) return { cash: 0, online: 0, total: 0 }
  if (Array.isArray(b.payments) && b.payments.length) {
    const cash   = b.payments.filter(p => p.method === 'cash')
                             .reduce((s, p) => s + Number(p.amount || 0), 0)
    const online = b.payments.filter(p => p.method === 'online')
                             .reduce((s, p) => s + Number(p.amount || 0), 0)
    return { cash, online, total: cash + online }
  }
  // Cached split from a previous write
  if (b.cashPaid != null || b.onlinePaid != null) {
    const cash = Number(b.cashPaid || 0), online = Number(b.onlinePaid || 0)
    return { cash, online, total: cash + online }
  }
  // Legacy: single amountPaid came from the customer UPI flow → treat as online
  const total = Number(b.amountPaid || 0)
  return { cash: 0, online: total, total }
}

// Builds a payments array for a booking, migrating legacy single-payment data.
const normalizePayments = (b) => {
  if (Array.isArray(b.payments) && b.payments.length) return [...b.payments]
  if (Number(b.amountPaid || 0) > 0) {
    return [{
      amount:    Number(b.amountPaid),
      method:    'online',
      reference: b.transactionId || '',
      date:      b.paymentSubmittedAt || b.confirmedAt || new Date().toISOString(),
      addedBy:   b.transactionId ? 'customer' : 'admin',
    }]
  }
  return []
}

// Records a payment (cash or online) against a booking and refreshes the
// cached cashPaid / onlinePaid / amountPaid totals.
export const recordPayment = async (bookingId, { amount, method, reference = '', date } = {}) => {
  const amt = Number(amount)
  if (!amt || amt <= 0)  throw new Error('Enter a valid amount')
  if (method !== 'cash' && method !== 'online') throw new Error('Invalid payment method')

  const ref  = doc(db, 'bookings', bookingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Booking not found')

  const payments = normalizePayments(snap.data())
  payments.push({
    amount:    amt,
    method,
    reference: reference.trim(),
    date:      date || new Date().toISOString(),
    addedBy:   'admin',
  })

  const cashPaid   = payments.filter(p => p.method === 'cash')
                             .reduce((s, p) => s + Number(p.amount || 0), 0)
  const onlinePaid = payments.filter(p => p.method === 'online')
                             .reduce((s, p) => s + Number(p.amount || 0), 0)

  await updateDoc(ref, {
    payments,
    cashPaid,
    onlinePaid,
    amountPaid: cashPaid + onlinePaid,
    updatedAt:  serverTimestamp(),
  })

  return { cashPaid, onlinePaid, total: cashPaid + onlinePaid }
}

/* ── Refunds ──────────────────────────────────────────────────────────────
   recordPayment only ever ADDS money. A refund is stored as a negative-amount
   payment entry so the cash/online totals, P&L and invoices all stay correct
   without any special-casing elsewhere. */
export const recordRefund = async (bookingId, { amount, method, reason = '' } = {}) => {
  const amt = Number(amount)
  if (!amt || amt <= 0) throw new Error('Enter a valid refund amount')
  if (method !== 'cash' && method !== 'online') throw new Error('Invalid refund method')

  const ref  = doc(db, 'bookings', bookingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Booking not found')

  const b = snap.data()
  const { total: alreadyPaid } = paymentBreakdown(b)
  if (amt > alreadyPaid) throw new Error(`Cannot refund more than the ${alreadyPaid} collected`)

  const payments = normalizePayments(b)
  payments.push({
    amount:    -amt,                 // negative = money going back out
    method,
    reference: reason.trim() || 'Refund',
    date:      new Date().toISOString(),
    addedBy:   'admin',
    refund:    true,
  })

  const cashPaid   = payments.filter(p => p.method === 'cash')
                             .reduce((s, p) => s + Number(p.amount || 0), 0)
  const onlinePaid = payments.filter(p => p.method === 'online')
                             .reduce((s, p) => s + Number(p.amount || 0), 0)

  await updateDoc(ref, {
    payments,
    cashPaid,
    onlinePaid,
    amountPaid: cashPaid + onlinePaid,
    updatedAt:  serverTimestamp(),
  })
  return { cashPaid, onlinePaid, total: cashPaid + onlinePaid }
}

// Realtime bookings feed. Capped so an admin tab doesn't re-download years of
// history on every session; raise the cap if you ever need a longer window.
export const listenBookings = (callback, max = 300) =>
  onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(max)), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })

/* ═══════════════════════════════════════════════════════════════
   SLOT HOLD  (the "held for 30 minutes" promise, actually enforced)
═══════════════════════════════════════════════════════════════ */

// Milliseconds left on the payment hold, or 0 once it has lapsed.
export const holdRemainingMs = (booking) => {
  const until = booking?.holdUntil?.toDate ? booking.holdUntil.toDate().getTime()
              : booking?.holdUntil ? new Date(booking.holdUntil).getTime()
              : null
  if (!until || isNaN(until)) return 0
  return Math.max(0, until - Date.now())
}

// A hold only matters while the customer still hasn't paid.
export const isHoldExpired = (booking) =>
  !!booking && booking.status === 'requested' && holdRemainingMs(booking) === 0

/* ═══════════════════════════════════════════════════════════════
   BALANCE PAYMENTS  (customer pays the rest after the advance)
═══════════════════════════════════════════════════════════════ */

// The customer submits proof of a further payment. We DON'T touch the money
// fields here — the admin verifies and calls recordPayment(), which is the
// only path that changes what the business has actually collected.
export const submitBalancePayment = async (bookingId, { amount, transactionId, proofUrl = null }) => {
  const amt = Number(amount)
  if (!amt || amt <= 0) throw new Error('Enter a valid amount')
  if (!String(transactionId || '').trim()) throw new Error('Enter the transaction ID')

  await updateDoc(doc(db, 'bookings', bookingId), {
    pendingPayment: {
      amount:        amt,
      transactionId: String(transactionId).trim(),
      proofUrl,
      submittedAt:   new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
  })
}

// Admin accepts the submitted balance payment.
export const approveBalancePayment = async (bookingId) => {
  const ref  = doc(db, 'bookings', bookingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Booking not found')
  const p = snap.data().pendingPayment
  if (!p) throw new Error('No payment awaiting approval')

  await recordPayment(bookingId, {
    amount:    p.amount,
    method:    'online',
    reference: p.transactionId || '',
  })
  await updateDoc(ref, { pendingPayment: null, updatedAt: serverTimestamp() })
}

export const rejectBalancePayment = (bookingId) =>
  updateDoc(doc(db, 'bookings', bookingId), { pendingPayment: null, updatedAt: serverTimestamp() })

/* ═══════════════════════════════════════════════════════════════
   INQUIRIES  (contact form — saved BEFORE the WhatsApp handoff so a
   lead is never lost if WhatsApp fails to open)
═══════════════════════════════════════════════════════════════ */
export const addInquiry = (data) =>
  addDoc(collection(db, 'inquiries'), {
    ...data,
    handled:   false,
    createdAt: serverTimestamp(),
  })

export const getInquiries = async () => {
  const snap = await getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const markInquiryHandled = (id, handled = true) =>
  updateDoc(doc(db, 'inquiries', id), { handled })

export const deleteInquiry = (id) => deleteDoc(doc(db, 'inquiries', id))

/* ═══════════════════════════════════════════════════════════════
   REVIEWS  (customer feedback after a completed event)
═══════════════════════════════════════════════════════════════ */

// Reviews start unapproved so nothing appears publicly without the admin's OK.
export const addReview = (data) =>
  addDoc(collection(db, 'reviews'), {
    ...data,
    approved:  false,
    createdAt: serverTimestamp(),
  })

// Public: only approved reviews. No composite index needed (sorted in JS).
export const getApprovedReviews = async () => {
  const snap = await getDocs(query(collection(db, 'reviews'), where('approved', '==', true)))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export const getAllReviews = async () => {
  const snap = await getDocs(collection(db, 'reviews'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export const getReviewForBooking = async (bookingId) => {
  const snap = await getDocs(query(collection(db, 'reviews'), where('bookingId', '==', bookingId)))
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export const approveReview = (id, approved = true) =>
  updateDoc(doc(db, 'reviews', id), { approved })

export const deleteReview = (id) => deleteDoc(doc(db, 'reviews', id))

/* ═══════════════════════════════════════════════════════════════
   AVAILABILITY  (double-booking prevention)
═══════════════════════════════════════════════════════════════ */

// How much of each machine is already committed on a given date.
// Returns a Map: machineId -> units booked that day.
export const getCommittedQtyForDate = async (dateStr, ignoreBookingId = null) => {
  const committed = new Map()
  if (!dateStr) return committed

  const snap = await getDocs(query(collection(db, 'bookings'), where('eventDate', '==', dateStr)))
  snap.docs.forEach(d => {
    if (d.id === ignoreBookingId) return
    const b = d.data()
    if (!HOLDING_STATUSES.includes(b.status)) return
    ;(b.machines || []).forEach(m => {
      const id = m.id || m.name
      if (!id) return
      committed.set(id, (committed.get(id) || 0) + Number(m.qty || 1))
    })
  })
  return committed
}

// Availability snapshot for a date: [{ id, name, total, booked, free }]
export const getDateAvailability = async (dateStr, ignoreBookingId = null) => {
  const [machines, committed] = await Promise.all([
    getMachines(),
    getCommittedQtyForDate(dateStr, ignoreBookingId),
  ])
  return machines.map(m => {
    const total  = Number(m.totalQty ?? m.availableQty ?? 0)
    const booked = Number(committed.get(m.id) || 0)
    return { id: m.id, name: m.name, total, booked, free: Math.max(0, total - booked) }
  })
}

// Returns [] when the booking can be confirmed, otherwise a list of clashes.
// Call this BEFORE confirming a booking so equipment is never double-committed.
export const findBookingConflicts = async (booking) => {
  if (!booking?.eventDate || !Array.isArray(booking.machines) || !booking.machines.length) return []
  const availability = await getDateAvailability(booking.eventDate, booking.id)
  const byId = new Map(availability.map(a => [a.id, a]))

  const conflicts = []
  booking.machines.forEach(m => {
    const id   = m.id || m.name
    const want = Number(m.qty || 1)
    const info = byId.get(id)
    if (!info) return                       // machine no longer in inventory
    if (want > info.free) {
      conflicts.push({ name: m.name || info.name, requested: want, free: info.free, total: info.total })
    }
  })
  return conflicts
}

/* ═══════════════════════════════════════════════════════════════
   INVOICE NUMBERING  (sequential, transaction-safe)
═══════════════════════════════════════════════════════════════ */

// Atomically issues the next invoice number and caches it on the booking so
// the same booking always shows the same number.
export const getInvoiceNumber = async (booking) => {
  if (booking?.invoiceNo) return booking.invoiceNo
  if (!booking?.id) return null

  const counterRef = doc(db, 'counters', 'invoices')
  const bookingRef = doc(db, 'bookings', booking.id)

  const next = await runTransaction(db, async (tx) => {
    const snap    = await tx.get(counterRef)
    const current = snap.exists() ? Number(snap.data().value || 0) : 0
    const value   = current + 1
    tx.set(counterRef, { value, updatedAt: serverTimestamp() }, { merge: true })
    tx.update(bookingRef, { invoiceNo: value })
    return value
  })
  return next
}

/* ═══════════════════════════════════════════════════════════════
   CANCELLATION
═══════════════════════════════════════════════════════════════ */

// Cancellation charge based on how close to the event we are.
// >48h: free · 24-48h: 50% · <24h: no refund.
export const cancellationCharge = (booking) => {
  const total = Number(booking?.totalAmount || 0)
  if (!booking?.eventDate) return { pct: 0, amount: 0, label: 'No cancellation charge' }
  const hours = (new Date(booking.eventDate).getTime() - Date.now()) / 36e5
  if (isNaN(hours))  return { pct: 0,   amount: 0,           label: 'No cancellation charge' }
  if (hours >= 48)   return { pct: 0,   amount: 0,           label: 'Free cancellation (more than 48 hours before the event)' }
  if (hours >= 24)   return { pct: 50,  amount: total * 0.5, label: '50% charge applies (within 48 hours of the event)' }
  return               { pct: 100, amount: total,      label: 'No refund (within 24 hours of the event)' }
}

export const cancelBooking = async (bookingId, { reason = '', by = 'customer' } = {}) => {
  const ref  = doc(db, 'bookings', bookingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Booking not found')
  const b = { id: snap.id, ...snap.data() }

  if (b.status === 'cancelled') throw new Error('This booking is already cancelled')
  if (b.status === 'completed') throw new Error('A completed event cannot be cancelled')
  if (b.status === 'event_started') throw new Error('This event has already started')

  const charge = cancellationCharge(b)
  await updateDoc(ref, {
    status:             'cancelled',
    cancelledAt:        new Date().toISOString(),
    cancelledBy:        by,
    cancellationReason: reason,
    cancellationCharge: charge.amount,
    updatedAt:          serverTimestamp(),
  })

  // Free the date back up on the public calendar
  try {
    const evs = await getDocs(query(collection(db, 'events'), where('bookingId', '==', bookingId)))
    await Promise.all(evs.docs.map(d => deleteDoc(doc(db, 'events', d.id))))
  } catch { /* calendar cleanup is best-effort */ }

  return charge
}

/* ═══════════════════════════════════════════════════════════════
   CREW / OPERATORS
═══════════════════════════════════════════════════════════════ */
export const getCrew = async () => {
  const snap = await getDocs(query(collection(db, 'crew'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addCrew = (data) =>
  addDoc(collection(db, 'crew'), { ...data, active: true, createdAt: serverTimestamp() })

export const updateCrew = (id, data) => updateDoc(doc(db, 'crew', id), data)
export const deleteCrew = (id) => deleteDoc(doc(db, 'crew', id))

// Who is already assigned elsewhere on this date (prevents clashing a person).
export const getCrewCommitmentsForDate = async (dateStr, ignoreBookingId = null) => {
  const busy = new Map()
  if (!dateStr) return busy
  const snap = await getDocs(query(collection(db, 'bookings'), where('eventDate', '==', dateStr)))
  snap.docs.forEach(d => {
    if (d.id === ignoreBookingId) return
    const b = d.data()
    if (!HOLDING_STATUSES.includes(b.status)) return
    ;(b.crew || []).forEach(c => busy.set(c.id, b.customerName || 'another event'))
  })
  return busy
}

export const assignCrew = (bookingId, crew) =>
  updateDoc(doc(db, 'bookings', bookingId), { crew, updatedAt: serverTimestamp() })

/* ═══════════════════════════════════════════════════════════════
   PUBLIC EVENTS
═══════════════════════════════════════════════════════════════ */
export const getPublicEvents = async () => {
  // orderBy removed to avoid requiring a composite index (public + date);
  // sorting is handled client-side.
  const snap = await getDocs(query(
    collection(db, 'events'),
    where('public', '==', true),
  ))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

// Real-time listener for public + blocked events, used by the calendar so
// newly-confirmed bookings show up as blocked dates without a refresh.
export const listenPublicEvents = (callback) =>
  onSnapshot(
    query(collection(db, 'events'), where('public', '==', true)),
    snap => {
      const rows = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      callback(rows)
    },
  )

// Admin-only: every event, including ones hidden from the public calendar.
// getPublicEvents() filters on public==true, so hidden events would otherwise
// disappear from the admin's own list and become unmanageable.
export const getAllEvents = async () => {
  const snap = await getDocs(collection(db, 'events'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

export const addPublicEvent = (data) =>
  addDoc(collection(db, 'events'), { ...data, createdAt: serverTimestamp() })

export const updatePublicEvent = (id, data) =>
  updateDoc(doc(db, 'events', id), data)

export const deletePublicEvent = (id) =>
  deleteDoc(doc(db, 'events', id))

/* ═══════════════════════════════════════════════════════════════
   EXPENSES
═══════════════════════════════════════════════════════════════ */
export const addExpense = (data) =>
  addDoc(collection(db, 'expenses'), { ...data, createdAt: serverTimestamp() })

export const getExpenses = async () => {
  const snap = await getDocs(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const deleteExpense = (id) => deleteDoc(doc(db, 'expenses', id))

/* ═══════════════════════════════════════════════════════════════
   GALLERY
═══════════════════════════════════════════════════════════════ */
export const getGalleryItems = async () => {
  const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addGalleryItem = (data) =>
  addDoc(collection(db, 'gallery'), { ...data, createdAt: serverTimestamp() })

export const deleteGalleryItem = (id) => deleteDoc(doc(db, 'gallery', id))

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */
export const addNotification = (userId, data) =>
  addDoc(collection(db, 'notifications'), {
    userId,
    ...data,
    read:      false,
    createdAt: serverTimestamp(),
  })

export const getUserNotifications = async (uid) => {
  const snap = await getDocs(query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20),
  ))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const markNotificationRead = (id) =>
  updateDoc(doc(db, 'notifications', id), { read: true })

// Live unread-aware feed for the navbar bell. No composite index needed —
// we filter by userId only and sort client-side.
export const listenUserNotifications = (uid, callback) =>
  onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', uid)),
    snap => {
      const rows = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 30)
      callback(rows)
    },
    () => callback([]),
  )

export const markAllNotificationsRead = async (uid) => {
  const snap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', uid)))
  const unread = snap.docs.filter(d => !d.data().read)
  if (!unread.length) return
  const batch = writeBatch(db)
  unread.forEach(d => batch.update(doc(db, 'notifications', d.id), { read: true }))
  await batch.commit()
}

/* Human-friendly messages for each booking status change. Called by the admin
   screens so the customer is told what happened without any paid service. */
const STATUS_MESSAGES = {
  confirmed:     { title: 'Booking confirmed 🎉', body: 'Your booking is confirmed. We look forward to your event!' },
  payment_pending:{ title: 'Payment received',    body: 'We received your payment details and are verifying them.' },
  event_started: { title: 'Event started',        body: 'Your event has been marked as started. Have a great time!' },
  completed:     { title: 'Event completed',      body: 'Thanks for choosing Varahi Events. Your invoice is ready to download.' },
  cancelled:     { title: 'Booking cancelled',    body: 'Your booking has been cancelled. Contact us if this was unexpected.' },
}

export const notifyBookingStatus = async (booking, status) => {
  if (!booking?.userId) return          // walk-in bookings have no account
  const msg = STATUS_MESSAGES[status]
  if (!msg) return
  try {
    await addNotification(booking.userId, {
      title:     msg.title,
      body:      msg.body,
      status,
      bookingId: booking.id,
    })
  } catch { /* never block the admin action because a notification failed */ }
}

/* ═══════════════════════════════════════════════════════════════
   STATS (admin)
═══════════════════════════════════════════════════════════════ */
export const getDashboardStats = async () => {
  const [bookingsSnap, expensesSnap] = await Promise.all([
    getDocs(collection(db, 'bookings')),
    getDocs(collection(db, 'expenses')),
  ])
  const bookings = bookingsSnap.docs.map(d => d.data())
  const expenses = expensesSnap.docs.map(d => d.data())

  // Revenue is only counted for confirmed + completed bookings (an advance
  // becomes revenue once the admin confirms the booking).
  const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')

  let cashCollected = 0, onlineCollected = 0, bookedValue = 0
  confirmed.forEach(b => {
    const { cash, online } = paymentBreakdown(b)
    cashCollected   += cash
    onlineCollected += online
    bookedValue     += Number(b.totalAmount || 0)
  })
  // Total Revenue is simply the money actually received: cash + online.
  const totalCollected = cashCollected + onlineCollected
  const totalExpense   = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return {
    totalBookings:    bookings.length,
    confirmedCount:   confirmed.length,
    pendingCount:     bookings.filter(b => b.status === 'requested' || b.status === 'payment_pending').length,
    // Actual money received, split by method
    cashCollected,
    onlineCollected,
    totalCollected,
    totalRevenue:     totalCollected,   // = cashCollected + onlineCollected
    // Contracted value vs what's still to be received
    bookedValue,
    outstanding:      Math.max(0, bookedValue - totalCollected),
    totalExpense,
    netProfit:        totalCollected - totalExpense,
  }
}
