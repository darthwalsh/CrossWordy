# CrossWordy

Play crossword with friends at https://xw.carlwa.com.

CrossWordy is similar to downforacross.com but you need to upload your own puzzle.

## Local development

You can open the HTML file directly i.e. ~/code/CrossWordy/index.html?id=005M6KfPJZybaIoGCRA3

You can view an existing puzzle i.e. ~/code/CrossWordy/index.html?id=005M6KfPJZybaIoGCRA3

This uses the production FireStore database, but users don't have permission to cause any harm.


## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" 
3. Follow the setup wizard

### 2. Setup Firestore Database
1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (we'll configure rules below)
4. Select a location for your database

### 3. Configure Security Rules
In Firestore Database → Rules, set the rule to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /puzzles/{document=**} {
      allow get, write: if true;
      allow list: if false;
    }
    
    match /calendars/{document=**} {
      allow get, write: if true;
      allow list: if false;
    }
  }
}
```

### 4. Get Firebase Config
1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" → Web app
4. Register your app
5. Copy the Firebase config object
6. Update `firebaseConfig` in `main.js` with your values

## Dependencies

- [puz.js](https://github.com/downforacross/puzjs) to parse PUZ files
    - [ ] Using a fork that supports UTF-8 through jsdelivr github CDN until [PR is merged](https://github.com/downforacross/puzjs/pull/22)
- [Firebase](https://firebase.google.com/) for data syncing
