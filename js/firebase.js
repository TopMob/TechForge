import {
  collection,
  addDoc,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  limit,
  query,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { firestoreDatabase } from './firebase-app.js'
import { ensureFirebaseAuth } from './firebase-auth.js'

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
  const snapshot = await getDocs(collection(firestoreDatabase, 'PC', String(category).trim(), 'components'))
  return snapshot.docs.map((item) => item.data())
}

export async function saveComponent(category, componentPayload) {
  await ensureFirebaseAuth()

  const normalizedCategory = String(category).trim()
  const normalizedName = String(componentPayload?.name || '').trim()
  const createdAt = new Date().toISOString()

  const componentRef = doc(firestoreDatabase, 'PC', normalizedCategory, 'components', normalizedName)
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
    createdAtServer: serverTimestamp()
  })

  return {
    name: normalizedName,
    categoryKey: normalizedCategory,
    specs: componentPayload.specs || {},
    createdAt
  }
}
