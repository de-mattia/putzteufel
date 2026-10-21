// PLATZHALTER für Phase 1: Beispieldaten, damit sich das Layout am Handy und
// am Fernseher beurteilen lässt. Ab Phase 2 kommen die Daten aus Firestore.

export const DEMO_MITGLIEDER = [
  { id: 'christoph', name: 'Christoph', farbe: '#3b82f6' },
  { id: 'sandra', name: 'Sandra', farbe: '#a855f7' },
  { id: 'moira', name: 'Moira', farbe: '#14b8a6' },
  { id: 'paula', name: 'Paula', farbe: '#f59e0b' },
  { id: 'laura', name: 'Laura', farbe: '#ec4899' },
];

// status: 'offen' | 'uebernommen' | 'erledigt'; uebernommenVon: Mitglieds-ID
const AUFGABEN = [
  ['Bad putzen', 'Bad', 'woche', 'erledigt', 'sandra'],
  ['Gäste-WC putzen', 'Bad', 'woche', 'erledigt', 'paula'],
  ['Spülmaschine ausräumen', 'Küche', 'woche', 'erledigt', 'laura'],
  ['Küchenboden wischen', 'Küche', 'woche', 'uebernommen', 'christoph'],
  ['Herd & Arbeitsplatte putzen', 'Küche', 'woche', 'erledigt', 'sandra'],
  ['Kühlschrank aufräumen', 'Küche', 'woche', 'offen', null],
  ['Staubsaugen Erdgeschoss', 'Wohnzimmer', 'woche', 'erledigt', 'moira'],
  ['Staub wischen', 'Wohnzimmer', 'woche', 'uebernommen', 'moira'],
  ['Pflanzen gießen', 'Wohnzimmer', 'woche', 'erledigt', 'laura'],
  ['Staubsaugen Obergeschoss', 'Flur', 'woche', 'offen', null],
  ['Treppe saugen', 'Flur', 'woche', 'erledigt', 'paula'],
  ['Müll rausbringen', 'Allgemein', 'woche', 'erledigt', 'christoph'],
  ['Altpapier & Gelber Sack', 'Allgemein', 'woche', 'erledigt', 'christoph'],
  ['Wäsche waschen', 'Waschküche', 'woche', 'erledigt', 'sandra'],
  ['Wäsche zusammenlegen', 'Waschküche', 'woche', 'uebernommen', 'paula'],
  ['Betten frisch beziehen', 'Schlafzimmer', 'woche', 'offen', null],
  ['Kinderzimmer aufräumen', 'Kinderzimmer', 'woche', 'erledigt', 'moira'],
  ['Keller entrümpeln', 'Keller', 'einmalig', 'offen', null],
];

export function demoAufgaben(wochenSchluessel) {
  return AUFGABEN.map(([titel, raum, typ, status, uebernommenVon], i) => ({
    id: `demo-${i + 1}`,
    titel,
    raum,
    typ,
    aktiv: true,
    status,
    uebernommenVon,
    statusWoche: status === 'offen' ? null : wochenSchluessel,
  }));
}
