import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'
import { firebaseConfig } from './firebase-config.js'

const firebaseApp = initializeApp(firebaseConfig)

export const firebaseDatabase = getDatabase(firebaseApp)
