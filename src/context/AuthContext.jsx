import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, firebaseReady } from '../firebase/config'
import { getUserProfile } from '../firebase/auth'

const AuthContext = createContext(null)

// If Firebase never answers (bad config, blocked network, offline, slow 3G)
// we must NOT sit on the splash screen forever. After this long we give up
// waiting and render the site as a logged-out visitor.
const AUTH_TIMEOUT_MS = 8000

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let done = false
    const finish = () => { if (!done) { done = true; setLoading(false) } }

    // Misconfigured Firebase would otherwise just hang. Don't make people wait.
    if (!firebaseReady) {
      setAuthError('config')
      finish()
      return
    }

    // Safety net: whatever happens, stop blocking the UI after the timeout.
    const timer = setTimeout(() => {
      if (!done) {
        console.warn('Auth did not resolve in time — continuing as signed out.')
        setAuthError('slow')
        finish()
      }
    }, AUTH_TIMEOUT_MS)

    let unsub = () => {}
    try {
      unsub = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          setUser(firebaseUser)
          if (firebaseUser) {
            // A rejected profile read (permission denied, offline, rules change)
            // must never strand the user on the loading screen — this used to
            // throw out of the callback and setLoading(false) never ran.
            try {
              setProfile(await getUserProfile(firebaseUser.uid))
            } catch (err) {
              console.error('Could not load user profile:', err)
              setProfile(null)
            }
          } else {
            setProfile(null)
          }
          finish()
        },
        (err) => {
          // onAuthStateChanged's own error channel (bad config etc.)
          console.error('Auth listener failed:', err)
          setAuthError(err?.code || 'auth-failed')
          finish()
        },
      )
    } catch (err) {
      // initializeApp/getAuth itself blew up — usually missing env vars
      console.error('Firebase auth could not start:', err)
      setAuthError('config')
      finish()
    }

    return () => { clearTimeout(timer); unsub() }
  }, [])

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
