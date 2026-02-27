import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { firebaseConfig } from './firebase-config.js'

const firebaseApp = initializeApp(firebaseConfig)

export const firestoreDatabase = getFirestore(firebaseApp)
