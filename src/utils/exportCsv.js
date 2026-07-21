import { format } from 'date-fns'

// UTF-8 BOM so Excel picks up the encoding and renders ₹ / other non-ASCII chars correctly
const BOM = '﻿'

// Firestore Timestamps expose .toDate(); plain Date objects don't — handle both
const isTimestamp = v => v && typeof v === 'object' && typeof v.toDate === 'function'

const formatValue = (value) => {
  if (value === null || value === undefined) return ''

  if (isTimestamp(value)) {
    const d = value.toDate()
    return isNaN(d.getTime()) ? '' : format(d, 'dd MMM yyyy')
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : format(value, 'dd MMM yyyy')
  }

  return String(value)
}

// Excel-safe escaping: quote the field and double up any embedded quotes
// whenever the value contains a comma, quote or newline
const escapeCell = (raw) => {
  const str = formatValue(raw)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Build a CSV string from rows + an explicit header list (array of {key,label} or plain strings)
export function toCsv(rows, headers) {
  const cols = headers.map(h => (typeof h === 'string' ? { key: h, label: h } : h))

  const headerLine = cols.map(c => escapeCell(c.label)).join(',')
  const lines = rows.map(row => cols.map(c => escapeCell(row[c.key])).join(','))

  return [headerLine, ...lines].join('\r\n')
}

// Derive headers from the union of keys across all rows, preserving first-seen order
function deriveHeaders(rows) {
  const keys = []
  rows.forEach(row => {
    Object.keys(row).forEach(k => { if (!keys.includes(k)) keys.push(k) })
  })
  return keys
}

// Trigger a client-side CSV download — no external libraries needed
export function downloadCsv(filename, rows) {
  const headers = deriveHeaders(rows)
  const csv = BOM + toCsv(rows, headers)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}
