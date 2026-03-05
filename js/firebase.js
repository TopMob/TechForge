import {
  collection,
  addDoc,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  limit,
  query,
  getDocs,
  getDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { firestoreDatabase } from './firebase-app.js'
import { ensureFirebaseAuth } from './firebase-auth.js'

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function toComponentDoc(category, componentName) {
  return doc(firestoreDatabase, 'PC', normalizeText(category), 'components', normalizeText(componentName))
}

export async function watchFirebaseConnection(onChange) {
  try {
    await ensureFirebaseAuth()
  } catch {
    onChange(false)
    return () => {}
  }

  const statusQuery = query(collection(firestoreDatabase, 'PC_ACTIVITY_LOGS'), limit(1))
  return onSnapshot(
    statusQuery,
    () => onChange(true),
    () => onChange(false)
  )
}

export async function loadComponentsFromFirebase(category) {
  await ensureFirebaseAuth()
  const snapshot = await getDocs(collection(firestoreDatabase, 'PC', normalizeText(category), 'components'))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function loadComponentFromFirebase(category, componentName) {
  await ensureFirebaseAuth()
  const snapshot = await getDoc(toComponentDoc(category, componentName))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function saveComponent(category, componentPayload) {
  await ensureFirebaseAuth()

  const normalizedCategory = normalizeText(category)
  const normalizedName = normalizeText(componentPayload?.name)
  const createdAt = new Date().toISOString()

  const componentRef = toComponentDoc(normalizedCategory, normalizedName)
  await setDoc(componentRef, {
    name: normalizedName,
    categoryKey: normalizedCategory,
    price: componentPayload.price || null,
    vendor: componentPayload.vendor || '',
    model: componentPayload.model || '',
    specs: componentPayload.specs || {},
    raw: componentPayload.raw || {},
    source: 'firebase',
    createdAt,
    updatedAt: serverTimestamp()
  })

  await addDoc(collection(firestoreDatabase, 'PC_ACTIVITY_LOGS'), {
    category: normalizedCategory,
    componentName: normalizedName,
    createdAt,
    createdAtServer: serverTimestamp(),
    action: 'upsert'
  })

  return {
    name: normalizedName,
    categoryKey: normalizedCategory,
    specs: componentPayload.specs || {},
    raw: componentPayload.raw || {},
    price: componentPayload.price || null,
    createdAt
  }
}

export async function deleteComponent(category, componentName) {
  await ensureFirebaseAuth()
  const normalizedCategory = normalizeText(category)
  const normalizedName = normalizeText(componentName)
  if (!normalizedCategory || !normalizedName) return false

  await deleteDoc(toComponentDoc(normalizedCategory, normalizedName))
  await addDoc(collection(firestoreDatabase, 'PC_ACTIVITY_LOGS'), {
    category: normalizedCategory,
    componentName: normalizedName,
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
    action: 'delete'
  })
  return true
}
