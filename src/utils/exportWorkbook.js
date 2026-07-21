import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { BUSINESS_INFO } from './constants'

/* ────────────────────────────────────────────────────────────────────────────
   Varahi Events — multi-sheet Excel export (one sheet per Firestore collection
   plus a Summary sheet). Replaces the old JSON backup: the owner wants a file
   they can actually open and read in Excel, not a data dump.
──────────────────────────────────────────────────────────────────────────── */

const isTimestamp = (v) => v && typeof v === 'object' && typeof v.toDate === 'function'

// Turn one array item (a machine/payment/crew-style object) into a short
// human phrase, e.g. "CO2 Blaster x2" or "Rs. 5,000 (cash)".
function summarizeItem(item) {
  if (item === null || item === undefined) return ''
  if (isTimestamp(item)) {
    try {
      const d = item.toDate()
      return isNaN(d.getTime()) ? '' : format(d, 'dd MMM yyyy HH:mm')
    } catch { return '' }
  }
  if (typeof item !== 'object') return String(item)

  const name = item.name || item.role || item.label
  if (name && item.qty != null) return `${name} x${item.qty}`
  if (item.amount != null && item.method) {
    return `Rs. ${Number(item.amount).toLocaleString('en-IN')} (${item.method})`
  }
  if (name) return String(name)

  // Fallback: join whatever scalar fields the object has so we never emit
  // "[object Object]" into a cell.
  return Object.entries(item)
    .filter(([, v]) => v !== null && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

// Flatten a single value into something a spreadsheet cell can hold.
function flattenValue(value) {
  if (value === null || value === undefined) return ''

  if (isTimestamp(value)) {
    try {
      const d = value.toDate()
      return isNaN(d.getTime()) ? '' : format(d, 'dd MMM yyyy HH:mm')
    } catch { return '' }
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : format(value, 'dd MMM yyyy HH:mm')
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return ''
    // Arrays of objects (machines, payments, crew) get a readable summary;
    // arrays of strings/numbers are just comma-joined.
    const isObjectArray = typeof value[0] === 'object' && value[0] !== null && !isTimestamp(value[0])
    return isObjectArray ? value.map(summarizeItem).join('; ') : value.join(', ')
  }

  if (typeof value === 'object') {
    // Plain nested object (rare) — stringify a flattened version so nested
    // timestamps/arrays still read sensibly instead of "[object Object]".
    try { return JSON.stringify(flattenRow(value)) } catch { return '' }
  }

  return value
}

// Flattens every field of a Firestore-shaped row into spreadsheet-safe values.
// Exported so exportPdfReport.js can reuse the same logic if useful.
export function flattenRow(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  Object.keys(obj).forEach((k) => { out[k] = flattenValue(obj[k]) })
  return out
}

// Excel sheet names: max 31 chars, and : \ / ? * [ ] are illegal.
function sanitizeSheetName(name, used) {
  let clean = String(name || 'Sheet').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31)
  if (!clean) clean = 'Sheet'
  let unique = clean
  let n = 2
  while (used.has(unique)) {
    const suffix = `_${n++}`
    unique = clean.slice(0, 31 - suffix.length) + suffix
  }
  used.add(unique)
  return unique
}

// Union of keys across all rows, first-seen order preserved — matches what
// XLSX.utils.json_to_sheet will end up using as headers.
function deriveHeaders(rows) {
  const keys = []
  rows.forEach((row) => {
    Object.keys(row).forEach((k) => { if (!keys.includes(k)) keys.push(k) })
  })
  return keys
}

// Auto-size columns from the longest cell value per column, capped so one
// giant comment field doesn't blow the sheet out.
function autoSizeColumns(ws, rows, headers) {
  ws['!cols'] = headers.map((key) => {
    let max = key.length
    rows.forEach((row) => {
      const len = String(row[key] ?? '').length
      if (len > max) max = len
    })
    return { wch: Math.min(50, Math.max(10, max + 2)) }
  })
}

// Build and download one .xlsx workbook — one sheet per collection.
// sheets = [{ name, rows }], rows = array of plain objects.
export function downloadWorkbook(filename, sheets) {
  const wb = XLSX.utils.book_new()

  // Summary sheet always comes first.
  const summaryRows = [
    { Field: 'Business',      Value: BUSINESS_INFO.name },
    { Field: 'Exported At',   Value: format(new Date(), 'dd MMM yyyy HH:mm') },
  ]
  sheets.forEach(({ name, rows }) => {
    const count = Array.isArray(rows) ? rows.length : 0
    summaryRows.push({
      Field: name,
      Value: count ? `${count} record${count === 1 ? '' : 's'}` : 'No records (sheet skipped)',
    })
  })
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  autoSizeColumns(summaryWs, summaryRows, ['Field', 'Value'])
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const used = new Set(['Summary'])
  sheets.forEach(({ name, rows }) => {
    if (!Array.isArray(rows) || rows.length === 0) return // noted in Summary, sheet itself is skipped

    const flatRows = rows.map(flattenRow)
    const headers = deriveHeaders(flatRows)
    const ws = XLSX.utils.json_to_sheet(flatRows, { header: headers })
    autoSizeColumns(ws, flatRows, headers)
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name, used))
  })

  XLSX.writeFile(wb, filename)
}
