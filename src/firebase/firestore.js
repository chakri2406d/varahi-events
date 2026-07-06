import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, writeBatch, Timestamp,
} from 'firebase/firestore'
import { db } from './config'

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
  totalAmount, amount, method = 'cash', note = '',
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
    machines:        [],
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

export const listenBookings = (callback) =>
  onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })

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

export const getExpenses = async (month = null) => {
  let q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
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
    pendingCount:     bookings.filter(b => b.status === 'requested' || b.status === 'pending').length,
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
