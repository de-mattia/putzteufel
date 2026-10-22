// Lädt das Firebase JS SDK (fest gepinnte Version) vom CDN und richtet ein:
// anonyme Anmeldung (je Gerät/Browser eine eigene uid) und Firestore mit
// dauerhaftem lokalem Cache, damit die App auch offline die letzten Daten zeigt.
//
// Lokal (localhost/127.0.0.1) spricht die App mit dem Firebase-Emulator statt mit der
// echten Datenbank: npx firebase-tools@15.34.0 emulators:start --only auth,firestore

import { firebaseConfig, FIREBASE_SDK_VERSION } from './config.js';

const EMULATOR = ['localhost', '127.0.0.1'].includes(location.hostname);

let laedt = null;

export function firebase() {
  if (!laedt) {
    laedt = starte().catch((fehler) => {
      laedt = null; // beim nächsten Aufruf neu versuchen
      throw fehler;
    });
  }
  return laedt;
}

async function starte() {
  const basis = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appSdk, authSdk, fs] = await Promise.all([
    import(`${basis}/firebase-app.js`),
    import(`${basis}/firebase-auth.js`),
    import(`${basis}/firebase-firestore.js`),
  ]);

  // Eigener App-Name im Emulator, damit Anmeldung und Cache getrennt von echten Daten bleiben.
  const app = appSdk.initializeApp(firebaseConfig, EMULATOR ? 'emulator' : undefined);
  const auth = authSdk.getAuth(app);
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
  });
  if (EMULATOR) {
    authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  await auth.authStateReady();
  if (!auth.currentUser) await authSdk.signInAnonymously(auth);

  return { db, fs, uid: auth.currentUser.uid };
}
