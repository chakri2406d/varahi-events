// Tracks whether an admin has explicitly chosen to browse the public site
// during this session. When false, the "/" route defaults admins to the
// admin dashboard. Stored in sessionStorage so it survives client-side
// navigation but resets on a fresh login (see Login.jsx).
const KEY = 'varahi_admin_view_public'

export const adminWantsPublic = () => sessionStorage.getItem(KEY) === '1'
export const setAdminWantsPublic = () => sessionStorage.setItem(KEY, '1')
export const resetAdminWantsPublic = () => sessionStorage.removeItem(KEY)
