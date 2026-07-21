// .ics generation + Google Calendar "add event" link, no external libraries.
// Booking shape: { id, bookingId, machines:[{name,qty,price}], eventDate:'YYYY-MM-DD',
//                  eventTime?:'HH:mm', eventLocation, totalAmount }

const pad = (n) => String(n).padStart(2, '0')

// RFC 5545 §3.3.11 text escaping — backslash first, then the rest, then newlines.
const escapeIcs = (str) => String(str ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r\n|\n|\r/g, '\\n')

const isValidDateStr = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false
  const [y, mo, d] = s.split('-').map(Number)
  // Guard rollover (e.g. Feb 30) — the Date constructor would silently roll it forward.
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
}

const isValidTimeStr = (s) => {
  if (!/^\d{2}:\d{2}$/.test(s || '')) return false
  const [h, m] = s.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

// Local (floating) start/end as Date objects — no TZID is emitted, so readers
// interpret them in their own local time, which matches "the event is at 6pm
// wherever you are looking at your calendar".
const buildTimedDates = (dateStr, timeStr) => {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const start = new Date(y, mo - 1, d, h, mi, 0)
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000) // 4-hour default duration
  return { start, end }
}

const fmtLocalStamp = (dt) =>
  `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`

const fmtUtcStamp = (dt) =>
  `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`

// All-day DTEND is exclusive per spec, so it's the day AFTER the event date.
const buildAllDayStamps = (dateStr) => {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const start = new Date(y, mo - 1, d)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const fmtDate = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`
  return { dtStart: fmtDate(start), dtEnd: fmtDate(end) }
}

const equipmentSummary = (booking) => {
  const names = (booking.machines || []).map(m => m?.name || m).filter(Boolean)
  return names.length ? names.join(', ') : 'Event'
}

const equipmentListText = (booking) => {
  const list = (booking.machines || [])
    .map(m => `${m?.name || m} x${m?.qty || 1}`)
    .join(', ')
  return list || 'Equipment as booked'
}

const buildDescriptionLines = (booking) => {
  const ref = booking.bookingId || (booking.id ? String(booking.id).slice(0, 8).toUpperCase() : '')
  const total = booking.totalAmount != null ? Number(booking.totalAmount).toLocaleString('en-IN') : null
  return [
    ref ? `Booking Reference: ${ref}` : null,
    `Equipment: ${equipmentListText(booking)}`,
    total != null ? `Total Amount: Rs. ${total}` : null,
  ].filter(Boolean)
}

// Builds and downloads a .ics file for the booking's event date/time.
// Returns false (no download) when there's no usable eventDate.
export const downloadIcs = (booking) => {
  if (!booking || !isValidDateStr(booking.eventDate)) return false

  const hasTime = isValidTimeStr(booking.eventTime)
  let dtStartLine, dtEndLine

  if (hasTime) {
    const { start, end } = buildTimedDates(booking.eventDate, booking.eventTime)
    dtStartLine = `DTSTART:${fmtLocalStamp(start)}`
    dtEndLine = `DTEND:${fmtLocalStamp(end)}`
  } else {
    const { dtStart, dtEnd } = buildAllDayStamps(booking.eventDate)
    dtStartLine = `DTSTART;VALUE=DATE:${dtStart}`
    dtEndLine = `DTEND;VALUE=DATE:${dtEnd}`
  }

  const ref = booking.bookingId || (booking.id ? String(booking.id).slice(0, 8).toUpperCase() : 'event')
  const description = buildDescriptionLines(booking).join('\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Varahi Events//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id || ref}@varahievents`,
    `DTSTAMP:${fmtUtcStamp(new Date())}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${escapeIcs(`Varahi Events — ${equipmentSummary(booking)}`)}`,
    booking.eventLocation ? `LOCATION:${escapeIcs(booking.eventLocation)}` : null,
    `DESCRIPTION:${escapeIcs(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const icsContent = lines.join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `varahi-booking-${ref}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return true
}

// Google Calendar "add event" deep link — same timed/all-day logic as the .ics,
// but Google wants UTC (Z-suffixed) timestamps for timed events.
export const googleCalendarUrl = (booking) => {
  if (!booking || !isValidDateStr(booking.eventDate)) return ''

  const hasTime = isValidTimeStr(booking.eventTime)
  let datesParam
  if (hasTime) {
    const { start, end } = buildTimedDates(booking.eventDate, booking.eventTime)
    datesParam = `${fmtUtcStamp(start)}/${fmtUtcStamp(end)}`
  } else {
    const { dtStart, dtEnd } = buildAllDayStamps(booking.eventDate)
    datesParam = `${dtStart}/${dtEnd}`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Varahi Events — ${equipmentSummary(booking)}`,
    dates: datesParam,
    details: buildDescriptionLines(booking).join('\n'),
    location: booking.eventLocation || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
