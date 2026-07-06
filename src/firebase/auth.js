import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'

const googleProvider = new GoogleAuthProvider()

// ── Register ──────────────────────────────────────────────────────────────────
export async function register(name, email, password, phone = '') {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: name })
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid:       cred.user.uid,
    name,
    email,
    phone,
    role:      'user',
    createdAt: serverTimestamp(),
  })
  return cred.user
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

// ── Google Sign-In ────────────────────────────────────────────────────────────
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  const ref  = doc(db, 'users', cred.user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:       cred.user.uid,
      name:      cred.user.displayName || '',
      email:     cred.user.email || '',
      phone:     cred.user.phoneNumber || '',
      role:      'user',
      createdAt: serverTimestamp(),
    })
  }
  return cred.user
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth)
}

// ── Password Reset ────────────────────────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

// ── Get user profile ──────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

// ── Check if admin ────────────────────────────────────────────────────────────
export async function isAdmin(uid) {
  const profile = await getUserProfile(uid)
  return profile?.role === 'admin'
}
