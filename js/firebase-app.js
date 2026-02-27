import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { firebaseConfig } from './firebase-config.js'

export const firebaseApp = initializeApp(firebaseConfig)
export const firestoreDatabase = getFirestore(firebaseApp)
export const firebaseAuth = getAuth(firebaseApp)
