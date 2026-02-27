import {
  onAuthStateChanged,
  signInAnonymously
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { firebaseAuth } from './firebase-app.js'

let authReadyPromise

export function ensureFirebaseAuth() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        firebaseAuth,
        async (user) => {
          if (user) {
            unsubscribe()
            resolve(user)
            return
          }
          try {
            await signInAnonymously(firebaseAuth)
          } catch (error) {
            unsubscribe()
            reject(error)
          }
        },
        (error) => {
          unsubscribe()
          reject(error)
        }
      )
    })
  }

  return authReadyPromise
}
