// Zentrale Einstellungen der App.

// Bei jeder Veröffentlichung zusammen mit CACHE_VERSION in sw.js erhöhen.
export const APP_VERSION = '0.3.1';

// Firebase-Konfiguration der Web-App „putzteufel-web“ im Projekt putzteufel-b6e23.
//
// Die Werte stammen aus der Firebase-Konsole (Projekteinstellungen → Allgemein →
// „Meine Apps“ → Web-App). Sie sind kein Geheimnis und dürfen ins öffentliche Repo:
// Geschützt werden die Daten ausschließlich über die Firestore-Sicherheitsregeln.
export const firebaseConfig = {
  apiKey: 'AIzaSyCTdTIMdo2SUBadLgCM4KqRAWl9iAQyJ90',
  authDomain: 'putzteufel-b6e23.firebaseapp.com',
  projectId: 'putzteufel-b6e23',
  storageBucket: 'putzteufel-b6e23.firebasestorage.app',
  messagingSenderId: '760228148425',
  appId: '1:760228148425:web:00b97fce9ed77a34084918',
};

// Das Firebase JS SDK wird per CDN mit fest gepinnter Version geladen
// (https://www.gstatic.com/firebasejs/<VERSION>/…). Nur bewusst anheben.
export const FIREBASE_SDK_VERSION = '12.19.0';

export const firebaseBereit = () => firebaseConfig !== null && FIREBASE_SDK_VERSION !== null;
