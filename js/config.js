// Zentrale Einstellungen der App.

// Bei jeder Veröffentlichung zusammen mit CACHE_VERSION in sw.js erhöhen.
export const APP_VERSION = '0.1.0';

// Firebase-Konfiguration – wird in Phase 2 eingetragen.
//
// Die Werte stammen aus der Firebase-Konsole (Projekteinstellungen → Allgemein →
// „Meine Apps“ → Web-App). Sie sind kein Geheimnis und dürfen ins öffentliche Repo:
// Geschützt werden die Daten ausschließlich über die Firestore-Sicherheitsregeln.
//
// Beispiel:
// export const firebaseConfig = {
//   apiKey: '…',
//   authDomain: 'putzteufel-xxxxx.firebaseapp.com',
//   projectId: 'putzteufel-xxxxx',
//   appId: '…',
// };
export const firebaseConfig = null;

// Das Firebase JS SDK wird in Phase 2 per CDN mit fest gepinnter Version geladen,
// z. B. https://www.gstatic.com/firebasejs/<VERSION>/firebase-app.js
// Die Version hier eintragen und nur bewusst anheben.
export const FIREBASE_SDK_VERSION = null;

export const firebaseBereit = () => firebaseConfig !== null && FIREBASE_SDK_VERSION !== null;
