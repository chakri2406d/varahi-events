import { format, isToday, isTomorrow, isPast, isFuture, differenceInDays } from 'date-fns'

export const fmt = (date, pattern = 'dd MMM yyyy') => {
  try { return format(new Date(date), pattern) }
  catch { return '—' }
}

export const fmtTime = (date) => fmt(date, 'hh:mm a')
export const fmtFull = (date) => fmt(date, 'dd MMM yyyy, hh:mm a')

export const relativeDay = (date) => {
  const d = new Date(date)
  if (isToday(d))    return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  const diff = differenceInDays(d, new Date())
  if (diff > 0 && diff <= 7) return `In ${diff} days`
  return fmt(date)
}

export const isEventPast = (date) => isPast(new Date(date))
export const isEventFuture = (date) => isFuture(new Date(date))

export const generateBookingId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = 'VE-'
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

export const getMonthYear = (date) => fmt(date, 'MMMM yyyy')

export const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]
