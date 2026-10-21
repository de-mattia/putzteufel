// Kleine DOM-Helfer. Texte werden immer als Textknoten eingefügt (kein innerHTML),
// damit spätere Eingaben der Familie nie als HTML ausgeführt werden.

export function el(tag, attribute = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [name, wert] of Object.entries(attribute || {})) {
    if (wert == null || wert === false) continue;
    if (name === 'class') e.className = wert;
    else if (name.startsWith('on')) e.addEventListener(name.slice(2), wert);
    else if (name === 'style') Object.entries(wert).forEach(([k, v]) => e.style.setProperty(k, v));
    else e.setAttribute(name, wert === true ? '' : wert);
  }
  return anhaengen(e, kinder);
}

// Ersetzt den Inhalt eines Elements; bedingte Kinder (false, null) entfallen wie bei el().
export function fuelle(e, ...kinder) {
  e.textContent = '';
  return anhaengen(e, kinder);
}

function anhaengen(e, kinder) {
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    e.append(kind instanceof Node ? kind : String(kind));
  }
  return e;
}

// Schriftfarbe (hell oder dunkel), die auf der Personenfarbe gut lesbar ist.
export function textfarbe(hex) {
  const kanal = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const helligkeit = 0.2126 * kanal(1) + 0.7152 * kanal(3) + 0.0722 * kanal(5);
  return helligkeit > 0.3 ? '#16141f' : '#ffffff';
}

// Initiale im Farbkreis der Person (leerer Kreis, wenn niemand zugeordnet ist).
export function avatar(mitglied) {
  if (!mitglied) return el('span', { class: 'avatar avatar-leer', 'aria-hidden': 'true' });
  return el(
    'span',
    {
      class: 'avatar',
      style: { '--farbe': mitglied.farbe, color: textfarbe(mitglied.farbe) },
      title: mitglied.name,
      'aria-label': mitglied.name,
    },
    mitglied.name.charAt(0).toUpperCase(),
  );
}

export const beispielMarke = () => el('span', { class: 'beispiel-marke', title: 'Platzhalter für Phase 1' }, 'Beispiel');

const uhrzeitFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const wechselFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

export const uhrzeit = (d) => uhrzeitFormat.format(d);
export const datumLang = (d) => datumFormat.format(d);
export const wechselText = (d) => `${wechselFormat.format(d)} ${uhrzeitFormat.format(d)}`;

export const STATUS_NAMEN = { offen: 'Offen', uebernommen: 'Übernommen', erledigt: 'Erledigt' };
