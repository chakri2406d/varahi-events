import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// ─── Replace with your Firebase project config ───────────────────────────────
// Get this from: https://console.firebase.google.com → Project Settings → General
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// If these env vars are missing (e.g. not set in Vercel), Firebase does NOT
// throw — auth simply never responds, which left the app stuck on the splash
// screen forever. Detect it up front so we can fail fast and explain why.
const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k)

export const firebaseReady = missing.length === 0

if (!firebaseReady) {
  console.error(
    `[Varahi] Firebase is not configured — missing: ${missing.join(', ')}.\n` +
    'Set the VITE_FIREBASE_* variables (Vercel → Settings → Environment Variables) ' +
    'and redeploy. Until then the site runs signed-out and data will not load.'
  )
}

const app     = initializeApp(firebaseConfig)
export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)
export default app
