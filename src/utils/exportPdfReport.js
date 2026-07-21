import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { BUSINESS_INFO, STATUS_LABELS } from './constants'
import { paymentBreakdown } from '../firebase/firestore'

/* ────────────────────────────────────────────────────────────────────────────
   Varahi Events — branded business report (A4 landscape). Built by hand with
   jsPDF, same approach as invoiceGenerator.js (no jspdf-autotable). Replaces
   the JSON backup with something an owner can actually forward to an
   accountant. jsPDF's built-in Helvetica can't render ₹, so money uses "Rs.".
──────────────────────────────────────────────────────────────────────────── */

// Brand palette (RGB) — matches invoiceGenerator.js
const MAROON = [107, 15, 26]   // #6B0F1A
const GOLD   = [201, 147, 58]  // #C9933A
const INK    = [34, 30, 32]    // #221E20
const MUTED  = [140, 136, 142]
const SOFT   = [248, 244, 245]
const WHITE  = [255, 255, 255]

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// Accepts a Firestore Timestamp, a Date, or a plain date string.
const safeDate = (value, fmt = 'dd MMM yyyy', fallback = '—') => {
  if (!value) return fallback
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return isNaN(d.getTime()) ? fallback : format(d, fmt)
}

const MACHINE_STATUS_LABELS = {
  available:   'Available',
  reserved:    'Reserved',
  in_event:    'In Event',
  maintenance: 'Maintenance',
}

// Page geometry — landscape A4
const W = 297
const H = 210
const M = 14
const R = W - M
const BOTTOM = H - 16 // leave room for the footer bar

export function downloadPdfReport(data = {}) {
  const bookings  = Array.isArray(data.bookings)  ? data.bookings  : []
  const machines  = Array.isArray(data.machines)  ? data.machines  : []
  const events    = Array.isArray(data.events)    ? data.events    : []
  const expenses  = Array.isArray(data.expenses)  ? data.expenses  : []
  const crew      = Array.isArray(data.crew)      ? data.crew      : []
  const inquiries = Array.isArray(data.inquiries) ? data.inquiries : []
  const reviews   = Array.isArray(data.reviews)   ? data.reviews   : []

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const fill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const text = (c) => doc.setTextColor(c[0], c[1], c[2])

  // ctx.y is mutated in place so every helper below sees the current cursor.
  const ctx = { y: 0 }

  // Slim brand accent used on every page after the first (the first page
  // gets the full cover banner drawn separately, below).
  const slimTopBar = () => {
    fill(MAROON); doc.rect(0, 0, W, 6, 'F')
    fill(GOLD);   doc.rect(0, 6, W, 0.8, 'F')
  }

  const addPage = () => {
    doc.addPage()
    slimTopBar()
    ctx.y = 16
  }

  const ensureSpace = (need) => {
    if (ctx.y + need > BOTTOM) addPage()
  }

  /* ── COVER / HEADER ─────────────────────────────────────────────────────── */
  fill(MAROON); doc.rect(0, 0, W, 32, 'F')
  fill(GOLD);   doc.rect(0, 32, W, 1, 'F')

  text(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
  doc.text('VARAHI EVENTS', M, 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  doc.text('Business Data Report', M, 22)
  doc.setFontSize(8); text(GOLD)
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, M, 28)

  text(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text(BUSINESS_INFO.name, R, 13, { align: 'right' })
  text(GOLD); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text(`${BUSINESS_INFO.phone}  |  ${BUSINESS_INFO.email}`, R, 19, { align: 'right' })
  doc.text(BUSINESS_INFO.city, R, 24.5, { align: 'right' })

  ctx.y = 42

  /* ── EXECUTIVE SUMMARY ───────────────────────────────────────────────────── */
  text(MAROON); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text('Executive Summary', M, ctx.y)
  ctx.y += 8

  const confirmedCompleted = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
  const totalCollected = bookings.reduce((s, b) => s + paymentBreakdown(b).total, 0)
  const totalExpenses  = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netProfit      = totalCollected - totalExpenses
  const pendingInquiries = inquiries.filter(i => !i.handled).length
  const bookedValue = bookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0)
  const avgBookingValue = bookings.length > 0 ? bookedValue / bookings.length : 0

  const stats = [
    { label: 'TOTAL BOOKINGS',        value: String(bookings.length) },
    { label: 'CONFIRMED / COMPLETED', value: String(confirmedCompleted) },
    { label: 'TOTAL COLLECTED',       value: rupees(totalCollected) },
    { label: 'TOTAL EXPENSES',        value: rupees(totalExpenses) },
    { label: 'NET PROFIT',            value: rupees(netProfit) },
    { label: 'EQUIPMENT COUNT',       value: String(machines.length) },
    { label: 'CREW COUNT',            value: String(crew.length) },
    { label: 'PENDING INQUIRIES',     value: String(pendingInquiries) },
    { label: 'AVG. BOOKING VALUE',    value: rupees(avgBookingValue) },
  ]

  const cols = 3
  const gap = 6
  const availW = R - M
  const cardW = (availW - gap * (cols - 1)) / cols
  const cardH = 20
  const gridY0 = ctx.y
  stats.forEach((s, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = M + col * (cardW + gap)
    const y = gridY0 + row * (cardH + gap)
    fill(SOFT); doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F')
    fill(GOLD); doc.rect(x, y, 1.2, cardH, 'F')
    text(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text(s.label, x + 5, y + 7)
    text(MAROON); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5)
    doc.text(s.value, x + 5, y + 15.5)
  })
  const gridRows = Math.ceil(stats.length / cols)
  ctx.y = gridY0 + gridRows * (cardH + gap) + 4

  /* ── GENERIC TABLE RENDERER ───────────────────────────────────────────────
     columns: [{ label, width, align }]. mapRow(row) -> array of cell values
     in the same order as columns. Truncates long text to fit its column and
     paginates cleanly, redrawing the header row on every new page. */
  const fitCell = (str, width) => {
    const lines = doc.splitTextToSize(str, width - 4)
    if (lines.length <= 1) return lines[0] || ''
    let line = lines[0]
    while (line.length > 1 && doc.getTextWidth(`${line}…`) > width - 4) {
      line = line.slice(0, -1)
    }
    return `${line}…`
  }

  const renderSection = (title, columns, rows, mapRow) => {
    if (!rows || rows.length === 0) return // don't print an empty table
    const totalW = columns.reduce((s, c) => s + c.width, 0)
    const rowH = 7

    const drawHeader = () => {
      fill(MAROON); doc.rect(M, ctx.y, totalW, 8, 'F')
      text(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      let x = M
      columns.forEach((c) => {
        const tx = c.align === 'right' ? x + c.width - 2 : x + 2
        doc.text(c.label, tx, ctx.y + 5.5, { align: c.align === 'right' ? 'right' : 'left' })
        x += c.width
      })
      ctx.y += 8
    }

    ensureSpace(8 + 8) // title line + header row
    text(MAROON); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text(title, M, ctx.y)
    ctx.y += 7
    drawHeader()

    doc.setFontSize(7.5)
    rows.forEach((row, i) => {
      if (ctx.y + rowH > BOTTOM) {
        addPage()
        drawHeader()
      }
      if (i % 2 === 1) { fill(SOFT); doc.rect(M, ctx.y, totalW, rowH, 'F') }
      text(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      const values = mapRow(row)
      let x = M
      columns.forEach((c, ci) => {
        const raw = values[ci] == null ? '' : String(values[ci])
        const cell = fitCell(raw, c.width)
        const tx = c.align === 'right' ? x + c.width - 2 : x + 2
        doc.text(cell, tx, ctx.y + 5, { align: c.align === 'right' ? 'right' : 'left' })
        x += c.width
      })
      ctx.y += rowH
    })
    ctx.y += 8 // gap before next section
  }

  /* ── BOOKINGS ─────────────────────────────────────────────────────────────── */
  renderSection('Bookings', [
    { label: 'REF',    width: 26 },
    { label: 'CUSTOMER', width: 46 },
    { label: 'PHONE',  width: 30 },
    { label: 'EVENT DATE', width: 26 },
    { label: 'STATUS', width: 34 },
    { label: 'TOTAL',  width: 30, align: 'right' },
    { label: 'PAID',   width: 30, align: 'right' },
    { label: 'BALANCE', width: 30, align: 'right' },
  ], bookings, (b) => {
    const { total: paid } = paymentBreakdown(b)
    const total = Number(b.totalAmount || 0)
    const balance = Math.max(0, total - paid)
    return [
      b.bookingId || b.id?.slice(0, 8)?.toUpperCase() || '—',
      b.customerName || '—',
      b.customerPhone || '—',
      safeDate(b.eventDate),
      STATUS_LABELS[b.status] || b.status || '—',
      rupees(total),
      rupees(paid),
      rupees(balance),
    ]
  })

  /* ── EQUIPMENT ────────────────────────────────────────────────────────────── */
  renderSection('Equipment', [
    { label: 'NAME',      width: 75 },
    { label: 'STATUS',    width: 45 },
    { label: 'TOTAL QTY', width: 40, align: 'right' },
    { label: 'AVAILABLE', width: 40, align: 'right' },
    { label: 'RATE',      width: 40, align: 'right' },
  ], machines, (m) => [
    m.name || '—',
    MACHINE_STATUS_LABELS[m.status] || m.status || '—',
    String(m.totalQty ?? m.availableQty ?? 0),
    String(m.availableQty ?? m.totalQty ?? 0),
    m.rate != null && m.rate !== '' ? rupees(m.rate) : 'On request',
  ])

  /* ── EXPENSES ─────────────────────────────────────────────────────────────── */
  renderSection('Expenses', [
    { label: 'DATE',        width: 30 },
    { label: 'CATEGORY',    width: 45 },
    { label: 'DESCRIPTION', width: 120 },
    { label: 'AMOUNT',      width: 40, align: 'right' },
  ], expenses, (e) => [
    safeDate(e.date || e.createdAt),
    e.category || '—',
    e.description || '—',
    rupees(e.amount),
  ])

  /* ── CREW ─────────────────────────────────────────────────────────────────── */
  renderSection('Crew', [
    { label: 'NAME',  width: 70 },
    { label: 'PHONE', width: 45 },
    { label: 'ROLE',  width: 80 },
    { label: 'ACTIVE', width: 35 },
  ], crew, (c) => [
    c.name || '—',
    c.phone || '—',
    c.role || '—',
    c.active !== false ? 'Yes' : 'No',
  ])

  /* ── INQUIRIES ────────────────────────────────────────────────────────────── */
  renderSection('Inquiries', [
    { label: 'DATE',       width: 28 },
    { label: 'NAME',       width: 55 },
    { label: 'PHONE',      width: 40 },
    { label: 'EVENT TYPE', width: 60 },
    { label: 'HANDLED',    width: 35 },
  ], inquiries, (i) => [
    safeDate(i.createdAt),
    i.name || '—',
    i.phone || '—',
    i.eventType || '—',
    i.handled ? 'Yes' : 'No',
  ])

  /* ── REVIEWS ──────────────────────────────────────────────────────────────── */
  renderSection('Reviews', [
    { label: 'DATE',     width: 26 },
    { label: 'CUSTOMER', width: 45 },
    { label: 'RATING',   width: 20, align: 'right' },
    { label: 'APPROVED', width: 30 },
    { label: 'COMMENT',  width: 130 },
  ], reviews, (r) => [
    safeDate(r.createdAt),
    r.customerName || '—',
    r.rating != null ? String(r.rating) : '—',
    r.approved ? 'Yes' : 'No',
    r.comment || '—',
  ])

  /* ── EVENTS ───────────────────────────────────────────────────────────────── */
  renderSection('Events', [
    { label: 'DATE',     width: 28 },
    { label: 'NAME',     width: 80 },
    { label: 'LOCATION', width: 100 },
    { label: 'CATEGORY', width: 40 },
  ], events, (e) => [
    safeDate(e.date),
    e.name || '—',
    e.location || '—',
    e.category || '—',
  ])

  /* ── FOOTER (every page) ──────────────────────────────────────────────────── */
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    fill(MAROON); doc.rect(0, H - 8, W, 8, 'F')
    fill(GOLD);   doc.rect(0, H - 8.8, W, 0.8, 'F')
    text(WHITE); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text(BUSINESS_INFO.name, M, H - 3)
    doc.text(`Page ${p} of ${totalPages}`, R, H - 3, { align: 'right' })
  }

  doc.save(`Varahi-Business-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
