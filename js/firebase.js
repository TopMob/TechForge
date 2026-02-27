import { ref, set, onValue, push } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'
import { firebaseDatabase } from './firebase-app.js'

export function watchFirebaseConnection(onChange) {
  const connectedRef = ref(firebaseDatabase, '.info/connected')
  return onValue(connectedRef, (snapshot) => {
    onChange(Boolean(snapshot.val()))
  })
}

export async function saveComponent(category, componentName, specs) {
  const normalizedCategory = String(category).trim()
  const normalizedName = String(componentName).trim()
  const createdAt = new Date().toISOString()
  const payload = {
    name: normalizedName,
    specs,
    createdAt
  }

  await set(ref(firebaseDatabase, `PC/${normalizedCategory}/${normalizedName}`), payload)
  await push(ref(firebaseDatabase, 'PC_ACTIVITY_LOGS'), {
    category: normalizedCategory,
    componentName: normalizedName,
    createdAt
  })

  return payload
}
