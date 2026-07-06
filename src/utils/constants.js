export const BOOKING_STATUSES = {
  REQUESTED:          'requested',
  PAYMENT_PENDING:    'payment_pending',
  CONFIRMED:          'confirmed',
  EVENT_STARTED:      'event_started',
  COMPLETED:          'completed',
  CANCELLED:          'cancelled',
}

export const PAYMENT_METHODS = {
  CASH:   'cash',
  ONLINE: 'online',
}

export const PAYMENT_METHOD_LABELS = {
  cash:   'Cash',
  online: 'Online / UPI',
}

export const STATUS_LABELS = {
  requested:       'Requested',
  payment_pending: 'Payment Verification Pending',
  confirmed:       'Confirmed ✓',
  event_started:   'Event Started',
  completed:       'Completed',
  cancelled:       'Cancelled',
}

export const STATUS_COLORS = {
  requested:       'status-requested',
  payment_pending: 'status-pending',
  confirmed:       'status-confirmed',
  event_started:   'status-event-started',
  completed:       'status-completed',
  cancelled:       'status-cancelled',
}

export const MACHINE_STATUS = {
  AVAILABLE:   'available',
  RESERVED:    'reserved',
  IN_EVENT:    'in_event',
  MAINTENANCE: 'maintenance',
}

export const MACHINE_STATUS_COLORS = {
  available:   'badge-green',
  reserved:    'badge-gold',
  in_event:    'badge-blue',
  maintenance: 'badge-red',
}

export const ADDONS = [
  { id: 'transport',   label: 'Transport',        icon: '🚛', desc: 'Delivery & pickup' },
  { id: 'generator',   label: 'Generator',         icon: '⚡', desc: 'Power backup' },
  { id: 'paper_setup', label: 'Paper Setup',       icon: '🎊', desc: 'CO2 paper & confetti' },
  { id: 'operator',    label: 'Operator',          icon: '👤', desc: 'Trained staff on-site' },
  { id: 'full_setup',  label: 'Full Setup',        icon: '🎪', desc: 'Complete installation' },
  { id: 'lighting',    label: 'Lighting Package',  icon: '💡', desc: 'Stage lighting setup' },
  { id: 'smoke',       label: 'Smoke Machine',     icon: '🌫️', desc: 'Atmospheric fog' },
]

export const EVENT_CATEGORIES = [
  { id: 'all',       label: 'All Works',       icon: '✨' },
  { id: 'wedding',   label: 'Weddings',        icon: '💍' },
  { id: 'dj',        label: 'DJ Nights',       icon: '🎧' },
  { id: 'college',   label: 'College Fests',   icon: '🎓' },
  { id: 'concert',   label: 'Concerts',        icon: '🎤' },
  { id: 'corporate', label: 'Corporate',       icon: '🏢' },
]

export const EXPENSE_CATEGORIES = [
  { id: 'fuel',        label: 'Fuel',          color: 'text-orange-400' },
  { id: 'diesel',      label: 'Generator Diesel', color: 'text-yellow-400' },
  { id: 'repair',      label: 'Machine Repair', color: 'text-red-400' },
  { id: 'paper',       label: 'Paper/Confetti', color: 'text-pink-400' },
  { id: 'travel',      label: 'Travel',         color: 'text-blue-400' },
  { id: 'misc',        label: 'Miscellaneous',  color: 'text-gray-400' },
]

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@varahievents.com'

export const BUSINESS_INFO = {
  name:    'Varahi Events',
  tagline: 'Turning Events Into Experiences',
  phone:   '+91 XXXXXXXXXX',
  email:   'contact@varahievents.com',
  city:    'Vijayawada, Andhra Pradesh',
  upiId:   'varahievents@upi',
}
