import {
  collection,
  addDoc,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  limit,
  query
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { firestoreDatabase } from './firebase-app.js'

export function watchFirebaseConnection(onChange) {
  const statusQuery = query(collection(firestoreDatabase, 'PC_ACTIVITY_LOGS'), limit(1))
  const unsubscribe = onSnapshot(
    statusQuery,
    () => onChange(true),
    () => onChange(false)
  )
  return unsubscribe
}

export async function saveComponent(category, componentName, specs) {
  const normalizedCategory = String(category).trim()
  const normalizedName = String(componentName).trim()
  const createdAt = new Date().toISOString()

  const componentRef = doc(firestoreDatabase, 'PC', normalizedCategory, 'components', normalizedName)
  await setDoc(componentRef, {
    name: normalizedName,
    specs,
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
    specs,
    createdAt
  }
}
