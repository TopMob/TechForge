rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /PC/{category}/components/{componentName} {
      allow read: if true;
      allow create, update: if true;
      allow delete: if false;
    }

    match /PC_ACTIVITY_LOGS/{logId} {
      allow read, create: if true;
      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
