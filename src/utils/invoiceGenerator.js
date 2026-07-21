import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { BUSINESS_INFO, STATUS_LABELS, ADDONS } from './constants'

/* ────────────────────────────────────────────────────────────────────────────
   Varahi Events — professional invoice (A4, light theme, brand maroon + gold).
   jsPDF's built-in Helvetica can't render the ₹ glyph, so currency uses "Rs.".
──────────────────────────────────────────────────────────────────────────── */

// Brand palette (RGB)
const MAROON = [107, 15, 26]   // #6B0F1A
const WINE   = [139, 26, 44]   // #8B1A2C
const GOLD   = [201, 147, 58]  // #C9933A
const INK    = [34, 30, 32]    // near-black text
const BODY   = [90, 88, 92]    // body grey
const MUTED  = [140, 136, 142] // labels
const SOFT   = [248, 244, 245] // zebra / panel fill
const LINE   = [228, 222, 224] // hairlines
const WHITE  = [255, 255, 255]

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const safeDate = (value, fmt = 'dd MMM yyyy', fallback = '—') => {
  if (!value) return fallback
  const d = new Date(value)
  return isNaN(d.getTime()) ? fallback : format(d, fmt)
}

export const generateInvoice = (booking) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const M = 14          // left margin
  const R = W - M       // right edge (196)

  const fill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const text = (c) => doc.setTextColor(c[0], c[1], c[2])
  const draw = (c) => doc.setDrawColor(c[0], c[1], c[2])

  let y = 0

  const ensureSpace = (need) => {
    if (y + need > 285) { doc.addPage(); y = 20 }
  }

  /* ── DERIVE DATA ─────────────────────────────────────────────────────────── */
  // A sequential number is issued by getInvoiceNumber() before we get here and
  // cached on the booking; fall back to the booking reference if unavailable.
  const invoiceNo = booking.invoiceNo
    ? `VE-${String(booking.invoiceNo).padStart(4, '0')}`
    : (booking.bookingId || booking.id?.slice(0, 8).toUpperCase() || 'DRAFT')
  const invoiceDate = safeDate(booking.createdAt?.toDate?.() || new Date(), 'dd MMM yyyy', format(new Date(), 'dd MMM yyyy'))
  const dueDate = safeDate(booking.dueDate || booking.eventDate)

  const lastMethod = Array.isArray(booking.payments) && booking.payments.length
    ? booking.payments[booking.payments.length - 1].method
    : (booking.onlinePaid ? 'online' : booking.cashPaid ? 'cash' : null)
  const paymentTerms = lastMethod === 'cash' ? 'Cash' : 'Online / UPI'

  // Line items — machines carry name/qty and (optionally) price. Fall back to a
  // single "Event Services" line for walk-in / offline bookings with no machines.
  const rawItems = Array.isArray(booking.machines) ? booking.machines : []
  let items = rawItems.map((m) => {
    const qty = Number(m.qty || 1)
    const rate = m.price != null ? Number(m.price) : null
    return { name: m.name || String(m), qty, rate, amount: rate != null ? rate * qty : null }
  })
  if (items.length === 0) {
    const t = Number(booking.totalAmount || booking.amountPaid || 0)
    items = [{ name: 'Event Services & Equipment', qty: 1, rate: t || null, amount: t || null }]
  }

  // totalAmount is what the customer actually owes (GST-inclusive). We derive
  // the pre-tax subtotal from it so Subtotal + GST always equals the Total.
  const lineTotal = items.reduce((s, i) => s + (i.amount || 0), 0)
  const total     = Number(booking.totalAmount || lineTotal || 0)
  const gstRate   = Number(BUSINESS_INFO.gstRate || 0)
  const subtotal  = gstRate > 0 ? total / (1 + gstRate / 100) : (lineTotal || total)
  const gstAmount = gstRate > 0 ? total - subtotal : 0
  const amountPaid = Number(booking.amountPaid || 0)
  const balanceDue = Math.max(0, total - amountPaid)

  const addonLabels = (booking.addons || [])
    .map((id) => ADDONS.find((a) => a.id === id)?.label || id)

  /* ── TOP ACCENT BAR ──────────────────────────────────────────────────────── */
  fill(MAROON); doc.rect(0, 0, W, 6, 'F')
  fill(GOLD);   doc.rect(0, 6, W, 1, 'F')

  /* ── HEADER ──────────────────────────────────────────────────────────────── */
  // Logo monogram
  fill(WINE); doc.roundedRect(M, 13, 24, 24, 3, 3, 'F')
  draw(GOLD); doc.setLineWidth(0.6); doc.roundedRect(M, 13, 24, 24, 3, 3, 'S')
  text(GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('VE', M + 12, 26, { align: 'center' })
  text(WHITE); doc.setFontSize(4.5); doc.setFont('helvetica', 'normal')
  doc.text('VARAHI EVENTS', M + 12, 32, { align: 'center' })

  // Company block
  const cx = M + 30
  text(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text(BUSINESS_INFO.name.toUpperCase(), cx, 20)
  text(GOLD); doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5)
  doc.text(BUSINESS_INFO.tagline, cx, 26)
  text(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text(BUSINESS_INFO.city, cx, 31)
  doc.text(`${BUSINESS_INFO.phone}, ${BUSINESS_INFO.phone2}  |  ${BUSINESS_INFO.email}`, cx, 35.5)
  if (BUSINESS_INFO.gstin) {
    doc.text(`GSTIN: ${BUSINESS_INFO.gstin}`, cx, 39.5)
  }

  // INVOICE title
  text(MAROON); doc.setFont('helvetica', 'bold'); doc.setFontSize(28)
  doc.text('INVOICE', R, 22, { align: 'right' })
  text(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`# ${invoiceNo}`, R, 29, { align: 'right' })

  // header divider
  draw(LINE); doc.setLineWidth(0.4); doc.line(M, 43, R, 43)

  /* ── BILL TO / EVENT (left)  +  META (right) ─────────────────────────────── */
  const topY = 52
  // Left — Bill To
  text(GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text('BILL TO', M, topY)
  text(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(booking.customerName || '—', M, topY + 6)
  text(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  let by = topY + 11
  if (booking.customerEmail) { doc.text(booking.customerEmail, M, by); by += 4.5 }
  if (booking.customerPhone) { doc.text(booking.customerPhone, M, by); by += 4.5 }

  // Left — Event / Service location
  const evY = topY + 24
  text(GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text('EVENT / SERVICE AT', M, evY)
  text(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(booking.eventLocation || '—', M, evY + 5.5)
  text(MUTED); doc.setFontSize(8)
  doc.text(`Event date: ${safeDate(booking.eventDate)}`, M, evY + 10.5)

  // Right — meta panel
  const px = 122, pw = R - px
  fill(SOFT); doc.roundedRect(px, topY - 4, pw, 25, 2, 2, 'F')
  const metaRows = [
    ['Invoice Date', invoiceDate],
    ['Payment Terms', paymentTerms],
    ['Due Date', dueDate],
  ]
  let my = topY + 1
  metaRows.forEach(([k, v]) => {
    text(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    doc.text(k, px + 4, my)
    text(INK); doc.setFont('helvetica', 'bold')
    doc.text(String(v), R - 4, my, { align: 'right' })
    my += 6.5
  })

  // Right — balance due highlight
  const bdY = topY + 24
  fill(MAROON); doc.roundedRect(px, bdY, pw, 12, 2, 2, 'F')
  text(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text('BALANCE DUE', px + 4, bdY + 7.5)
  doc.setFontSize(11)
  doc.text(money(balanceDue), R - 4, bdY + 7.7, { align: 'right' })

  /* ── ITEMS TABLE ─────────────────────────────────────────────────────────── */
  y = 89
  const colQty = 122, colRate = 158, colAmt = R   // right-aligned anchors
  // header
  fill(MAROON); doc.rect(M, y, R - M, 9, 'F')
  text(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text('ITEM / DESCRIPTION', M + 3, y + 6)
  doc.text('QTY', colQty, y + 6, { align: 'right' })
  doc.text('RATE', colRate, y + 6, { align: 'right' })
  doc.text('AMOUNT', colAmt - 3, y + 6, { align: 'right' })
  y += 9

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
  items.forEach((it, i) => {
    ensureSpace(10)
    const rowH = 9
    if (i % 2 === 1) { fill(SOFT); doc.rect(M, y, R - M, rowH, 'F') }
    text(INK)
    const nameLines = doc.splitTextToSize(it.name, colQty - M - 8)
    doc.text(nameLines[0], M + 3, y + 6)
    text(BODY)
    doc.text(String(it.qty), colQty, y + 6, { align: 'right' })
    doc.text(it.rate != null ? money(it.rate) : '—', colRate, y + 6, { align: 'right' })
    text(INK); doc.setFont('helvetica', 'bold')
    doc.text(it.amount != null ? money(it.amount) : 'As quoted', colAmt - 3, y + 6, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += rowH
  })
  // table bottom border
  draw(LINE); doc.setLineWidth(0.4); doc.line(M, y, R, y)

  // add-ons line
  if (addonLabels.length) {
    y += 6
    text(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('ADD-ONS', M + 3, y)
    text(BODY); doc.setFont('helvetica', 'normal')
    const al = doc.splitTextToSize(addonLabels.join('  •  '), R - M - 30)
    doc.text(al, M + 22, y)
    y += al.length * 4
  }

  /* ── TOTALS ──────────────────────────────────────────────────────────────── */
  y += 8
  const lblX = 150, valX = R - 3
  const totalRow = (label, value, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size || 9.5)
    text(opts.color || BODY); doc.text(label, lblX, y, { align: 'right' })
    text(opts.valColor || INK); doc.text(value, valX, y, { align: 'right' })
    y += opts.gap || 6
  }
  totalRow('Subtotal', money(subtotal))
  totalRow(gstRate > 0 ? `GST (${gstRate}%)` : 'Tax (0%)', money(gstAmount))
  draw(LINE); doc.setLineWidth(0.4); doc.line(lblX - 34, y - 2, R, y - 2)
  y += 1
  totalRow('TOTAL', money(total), { bold: true, size: 12, color: MAROON, valColor: MAROON, gap: 7 })
  if (amountPaid > 0) {
    totalRow('Amount Paid', `- ${money(amountPaid)}`, { color: MUTED, valColor: BODY })
    // balance due emphasis strip on the right
    fill(SOFT); doc.roundedRect(lblX - 34, y - 4, R - (lblX - 34), 9, 1.5, 1.5, 'F')
    totalRow('Balance Due', money(balanceDue), { bold: true, size: 10, color: INK, valColor: MAROON, gap: 8 })
  }

  /* ── NOTES ───────────────────────────────────────────────────────────────── */
  y += 2
  ensureSpace(20)
  fill(SOFT); doc.roundedRect(M, y, R - M, 15, 2, 2, 'F')
  fill(GOLD); doc.rect(M, y, 1.5, 15, 'F')
  text(MAROON); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text('NOTES', M + 5, y + 5.5)
  text(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  const note = booking.notes ||
    'Full payment is mandatory before the start of the event. Services will only be executed once the payment is cleared.'
  doc.text(doc.splitTextToSize(note, R - M - 10), M + 5, y + 10)
  y += 19

  /* ── TERMS & CONDITIONS ──────────────────────────────────────────────────── */
  ensureSpace(18)
  draw(LINE); doc.setLineWidth(0.4); doc.line(M, y, R, y); y += 5
  text(MAROON); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text('Terms & Conditions', M, y); y += 5

  const terms = [
    ['Booking Confirmation', 'All bookings are confirmed only after receiving the booking amount as agreed at the time of quotation. Final confirmation will be communicated in writing (via email, WhatsApp, or signed agreement).'],
    ['Payment Terms', 'Full payment must be completed before the event starts. Any delay in payment may result in postponement or cancellation of services without prior notice.'],
    ['Changes to Event Plan', 'Any changes to the event setup, theme, or services must be communicated at least 5 days before the event. Additional costs may apply for last-minute changes.'],
    ['Responsibilities & Liabilities', 'Varahi Events is not responsible for delays or cancellations caused by factors beyond our control (e.g., natural disasters, strikes, power outages). The client is responsible for providing necessary permissions, venue access, and safety measures. Damage to Varahi Events property or equipment during the event will be charged to the client.'],
    ['Media & Promotion', 'Varahi Events reserves the right to capture photos/videos during the event for promotional purposes, unless agreed otherwise in writing.'],
    ['Acceptance', 'By confirming the booking, the client acknowledges and agrees to the above Terms & Conditions.'],
  ]
  terms.forEach(([h, b], i) => {
    ensureSpace(11)
    text(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.text(`${i + 1}. ${h}`, M, y); y += 4
    text(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.splitTextToSize(b, R - M).forEach((ln) => { ensureSpace(5); doc.text(ln, M, y); y += 3.6 })
    y += 1.8
  })

  /* ── FOOTER (every page) ─────────────────────────────────────────────────── */
  const pages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    fill(MAROON); doc.rect(0, 289, W, 8, 'F')
    fill(GOLD);   doc.rect(0, 288, W, 0.8, 'F')
    text(WHITE); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text(`${BUSINESS_INFO.name}  ·  ${BUSINESS_INFO.phone}, ${BUSINESS_INFO.phone2}  ·  ${BUSINESS_INFO.email}`, W / 2, 294, { align: 'center' })
    doc.setFontSize(6.5); text(GOLD)
    doc.text('Thank you for choosing Varahi Events — Turning Events Into Experiences', W / 2, 285, { align: 'center' })
  }

  doc.save(`Varahi-Invoice-${invoiceNo}.pdf`)
}
