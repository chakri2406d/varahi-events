import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { BUSINESS_INFO, STATUS_LABELS } from './constants'

export const generateInvoice = (booking) => {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W    = 210
  const gray = '#9CA3AF'
  const dark = '#1a1a2e'
  const violet = '#7C3AED'

  // ── BACKGROUND ──────────────────────────────────────────────────────────────
  doc.setFillColor(5, 5, 8)
  doc.rect(0, 0, 210, 297, 'F')

  // ── HEADER BAR ──────────────────────────────────────────────────────────────
  doc.setFillColor(13, 13, 26)
  doc.rect(0, 0, 210, 50, 'F')
  doc.setDrawColor(124, 58, 237)
  doc.setLineWidth(0.5)
  doc.line(0, 50, 210, 50)

  // ── LOGO AREA ───────────────────────────────────────────────────────────────
  doc.setFillColor(124, 58, 237)
  doc.roundedRect(15, 10, 30, 30, 4, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('VE', 30, 29, { align: 'center' })

  // ── COMPANY NAME ────────────────────────────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(241, 240, 255)
  doc.text(BUSINESS_INFO.name, 52, 22)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(BUSINESS_INFO.tagline, 52, 30)
  doc.text(BUSINESS_INFO.city, 52, 38)

  // ── INVOICE TITLE ───────────────────────────────────────────────────────────
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(124, 58, 237)
  doc.text('INVOICE', W - 15, 22, { align: 'right' })
  doc.setFontSize(9)
  doc.setTextColor(156, 163, 175)
  doc.text(`#${booking.bookingId || booking.id?.slice(0, 8).toUpperCase()}`, W - 15, 31, { align: 'right' })
  doc.text(format(new Date(booking.createdAt?.toDate() || new Date()), 'dd MMM yyyy'), W - 15, 39, { align: 'right' })

  // ── CUSTOMER SECTION ────────────────────────────────────────────────────────
  let y = 65
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(124, 58, 237)
  doc.text('BILLED TO', 15, y)

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(241, 240, 255)
  doc.setFontSize(12)
  doc.text(booking.customerName || '—', 15, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(156, 163, 175)
  doc.text(booking.customerEmail || '', 15, y)
  doc.text(booking.customerPhone || '', 15, y + 5)

  // ── EVENT DETAILS ───────────────────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(124, 58, 237)
  doc.text('EVENT DETAILS', W / 2, 65, { align: 'left' })

  y = 72
  const details = [
    ['Event Date', format(new Date(booking.eventDate), 'dd MMM yyyy')],
    ['Location',   booking.eventLocation || '—'],
    ['Status',     STATUS_LABELS[booking.status] || booking.status],
  ]
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    doc.text(label, W / 2, y)
    doc.setTextColor(241, 240, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(val, W - 15, y, { align: 'right' })
    y += 7
  })

  // ── ITEMS TABLE HEADER ───────────────────────────────────────────────────────
  y = 110
  doc.setFillColor(13, 13, 26)
  doc.rect(10, y - 5, W - 20, 10, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(124, 58, 237)
  doc.text('ITEM / EQUIPMENT', 15, y)
  doc.text('QTY', 130, y, { align: 'center' })
  doc.text('AMOUNT', W - 15, y, { align: 'right' })

  // ── ITEMS ────────────────────────────────────────────────────────────────────
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(241, 240, 255)
  doc.setFontSize(10)

  const items = booking.machines || []
  items.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(13, 13, 26)
      doc.rect(10, y - 5, W - 20, 9, 'F')
    }
    doc.setTextColor(241, 240, 255)
    doc.text(item.name || item, 15, y)
    doc.setTextColor(156, 163, 175)
    doc.text(String(item.qty || 1), 130, y, { align: 'center' })
    doc.setTextColor(245, 158, 11)
    doc.text(item.price ? `₹${item.price.toLocaleString()}` : 'As quoted', W - 15, y, { align: 'right' })
    y += 9
  })

  // Add-ons
  const addons = booking.addons || []
  if (addons.length > 0) {
    y += 3
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text('Add-ons: ' + addons.join(', '), 15, y)
    y += 7
  }

  // ── TOTALS ────────────────────────────────────────────────────────────────────
  doc.setDrawColor(124, 58, 237)
  doc.setLineWidth(0.3)
  doc.line(10, y, W - 10, y)
  y += 8

  if (booking.totalAmount) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(241, 240, 255)
    doc.text('Total Amount', 15, y)
    doc.setTextColor(124, 58, 237)
    doc.text(`₹${booking.totalAmount.toLocaleString()}`, W - 15, y, { align: 'right' })
    y += 8
  }

  // ── PAYMENT STATUS ───────────────────────────────────────────────────────────
  const payColor = booking.paymentVerified ? [34, 197, 94] : [245, 158, 11]
  doc.setFillColor(...payColor)
  doc.roundedRect(15, y, 60, 9, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(booking.paymentVerified ? '✓ Payment Verified' : '⏳ Payment Pending', 45, y + 5.5, { align: 'center' })

  // ── TERMS ─────────────────────────────────────────────────────────────────────
  y = 240
  doc.setDrawColor(30, 30, 60)
  doc.line(10, y, W - 10, y)
  y += 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(124, 58, 237)
  doc.text('TERMS & CONDITIONS', 15, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.setFontSize(7.5)

  const terms = [
    '1. Cancellation within 48 hours of event: 50% charge applies.',
    '2. Cancellation within 24 hours: no refund.',
    '3. Client is responsible for delays beyond agreed setup time (₹500/hr extra).',
    '4. Varahi Events is not liable for event cancellations due to weather or force majeure.',
    '5. Payment is due before equipment deployment. UPI transfers only.',
    '6. Equipment damage at the event venue is billable to the client.',
    '7. Operator assignment is subject to availability.',
  ]
  terms.forEach(t => { doc.text(t, 15, y); y += 5 })

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  doc.setFillColor(13, 13, 26)
  doc.rect(0, 285, 210, 12, 'F')
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text(`${BUSINESS_INFO.name} · ${BUSINESS_INFO.email} · ${BUSINESS_INFO.phone}`, W / 2, 292, { align: 'center' })

  doc.save(`Varahi-Invoice-${booking.id?.slice(0, 8).toUpperCase() || 'DRAFT'}.pdf`)
}
