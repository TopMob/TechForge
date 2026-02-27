import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import { getDatabase, ref, set, onValue, push } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'

const firebaseConfig = {
  apiKey: 'AIzaSyCXpjYd9BKqAhD3ssCMVoIultLG-Dhqnb8',
  authDomain: 'techforge-c4.firebaseapp.com',
  projectId: 'techforge-c4',
  storageBucket: 'techforge-c4.firebasestorage.app',
  messagingSenderId: '13366452809',
  appId: '1:13366452809:web:ef2f7af86cfcdaf3f5d598',
  databaseURL: 'https://techforge-c4-default-rtdb.firebaseio.com'
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export function watchFirebaseConnection(onChange) {
  const connectedRef = ref(database, '.info/connected')
  return onValue(connectedRef, (snapshot) => {
    const connected = Boolean(snapshot.val())
    onChange(connected)
  })
}

export async function saveComponent(category, componentName, specs) {
  const sanitizedCategory = String(category).trim()
  const sanitizedName = String(componentName).trim()
  const payload = {
    name: sanitizedName,
    specs,
    createdAt: new Date().toISOString()
  }
  await set(ref(database, `PC/${sanitizedCategory}/${sanitizedName}`), payload)
  await push(ref(database, 'PC_ACTIVITY_LOGS'), {
    category: sanitizedCategory,
    componentName: sanitizedName,
    createdAt: payload.createdAt
  })
  return payload
}
