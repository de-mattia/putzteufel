// Lädt das Firebase JS SDK (fest gepinnte Version) vom CDN und richtet ein:
// anonyme Anmeldung (je Gerät/Browser eine eigene uid) und Firestore mit
// dauerhaftem lokalem Cache, damit die App auch offline die letzten Daten zeigt.

import { firebaseConfig, FIREBASE_SDK_VERSION } from './config.js';

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

  const app = appSdk.initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
  });

  await auth.authStateReady();
  if (!auth.currentUser) await authSdk.signInAnonymously(auth);

  return { db, fs, uid: auth.currentUser.uid };
}
