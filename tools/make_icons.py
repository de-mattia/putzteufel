"""Erzeugt die App-Icons (SVG + PNG) aus einer gemeinsamen Formbeschreibung.

Aufruf im Projektordner:  py tools/make_icons.py
Benötigt Pillow (py -m pip install pillow).
"""

from pathlib import Path

from PIL import Image, ImageDraw

ZIEL = Path(__file__).resolve().parent.parent / "icons"
BASIS = 512  # Koordinatensystem der Formen
UEBERABTASTUNG = 4  # für glatte Kanten groß zeichnen, dann verkleinern

HINTERGRUND = "#16141f"
ROT = "#ff5a4e"
DUNKEL = "#16141f"
WEISS = "#ffffff"
GELB = "#ffd54a"


def bezier(p0, p1, p2, schritte=24):
    """Punkte einer quadratischen Bézierkurve (ohne Startpunkt)."""
    punkte = []
    for i in range(1, schritte + 1):
        t = i / schritte
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        punkte.append((round(x, 1), round(y, 1)))
    return punkte


def horn(gespiegelt=False):
    a, t, b = (150, 215), (112, 72), (212, 170)
    punkte = [a] + bezier(a, (100, 160), t) + bezier(t, (150, 150), b)
    if gespiegelt:
        punkte = [(BASIS - x, y) for x, y in punkte]
    return punkte


def stern(cx, cy, aussen, innen):
    """Vierzackiges Funkeln."""
    punkte = []
    for i in range(8):
        r = aussen if i % 2 == 0 else innen
        dx, dy = [(0, -1), (0.7071, -0.7071), (1, 0), (0.7071, 0.7071),
                  (0, 1), (-0.7071, 0.7071), (-1, 0), (-0.7071, -0.7071)][i]
        punkte.append((round(cx + dx * r, 1), round(cy + dy * r, 1)))
    return punkte


# Formen in Zeichenreihenfolge: (art, daten, farbe)
FORMEN = [
    ("polygon", horn(), ROT),
    ("polygon", horn(gespiegelt=True), ROT),
    ("ellipse", (256, 292, 148, 138), ROT),
    ("ellipse", (205, 278, 36, 42), WEISS),
    ("ellipse", (307, 278, 36, 42), WEISS),
    ("ellipse", (213, 287, 17, 17), DUNKEL),
    ("ellipse", (299, 287, 17, 17), DUNKEL),
    ("linie", ((165, 226), (234, 250), 18), DUNKEL),
    ("linie", ((347, 226), (278, 250), 18), DUNKEL),
    ("polygon", [(186, 350)] + bezier((186, 350), (256, 440), (326, 350)), DUNKEL),
    ("polygon", [(220, 350), (240, 350), (230, 372)], WEISS),
    ("polygon", [(272, 350), (292, 350), (282, 372)], WEISS),
    ("polygon", stern(444, 128, 38, 9), GELB),
    ("polygon", stern(468, 214, 18, 4.5), GELB),
]

# Varianten: Dateiname → (Größe, Inhalt-Skalierung, Eckenradius des Hintergrunds)
VARIANTEN = {
    "icon-192.png": (192, 0.92, 96),
    "icon-512.png": (512, 0.92, 96),
    "icon-maskable-192.png": (192, 0.76, 0),  # Inhalt im sicheren Kreis (80 %)
    "icon-maskable-512.png": (512, 0.76, 0),
    "apple-touch-icon.png": (180, 0.84, 0),
}


def transformiere(x, y, skala):
    mitte = BASIS / 2
    return mitte + (x - mitte) * skala, mitte + (y - mitte) * skala


def png(groesse, skala, radius):
    f = groesse * UEBERABTASTUNG / BASIS  # Basis-Koordinaten → Pixel
    bild = Image.new("RGBA", (groesse * UEBERABTASTUNG,) * 2, (0, 0, 0, 0))
    zeichnen = ImageDraw.Draw(bild)
    zeichnen.rounded_rectangle((0, 0, bild.width - 1, bild.height - 1), radius=radius * f, fill=HINTERGRUND)

    def p(x, y):
        tx, ty = transformiere(x, y, skala)
        return tx * f, ty * f

    for art, daten, farbe in FORMEN:
        if art == "polygon":
            zeichnen.polygon([p(x, y) for x, y in daten], fill=farbe)
        elif art == "ellipse":
            cx, cy, rx, ry = daten
            (x0, y0), (x1, y1) = p(cx - rx, cy - ry), p(cx + rx, cy + ry)
            zeichnen.ellipse((x0, y0, x1, y1), fill=farbe)
        elif art == "linie":
            start, ende, breite = daten
            b = breite * skala * f
            zeichnen.line([p(*start), p(*ende)], fill=farbe, width=round(b))
            for punkt in (start, ende):  # runde Enden
                x, y = p(*punkt)
                zeichnen.ellipse((x - b / 2, y - b / 2, x + b / 2, y + b / 2), fill=farbe)
    return bild.resize((groesse, groesse), Image.LANCZOS)


def svg(skala=0.92, radius=96):
    teile = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BASIS} {BASIS}">',
        f'<rect width="{BASIS}" height="{BASIS}" rx="{radius}" fill="{HINTERGRUND}"/>',
        f'<g transform="translate(256 256) scale({skala}) translate(-256 -256)">',
    ]
    for art, daten, farbe in FORMEN:
        if art == "polygon":
            punkte = " ".join(f"{x:g},{y:g}" for x, y in daten)
            teile.append(f'<polygon points="{punkte}" fill="{farbe}"/>')
        elif art == "ellipse":
            cx, cy, rx, ry = daten
            teile.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{farbe}"/>')
        elif art == "linie":
            (x1, y1), (x2, y2), breite = daten
            teile.append(
                f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{farbe}" '
                f'stroke-width="{breite}" stroke-linecap="round"/>'
            )
    teile += ["</g>", "</svg>"]
    return "\n".join(teile) + "\n"


def main():
    ZIEL.mkdir(exist_ok=True)
    for name, (groesse, skala, radius) in VARIANTEN.items():
        png(groesse, skala, radius).save(ZIEL / name, optimize=True)
        print("geschrieben:", name)
    (ZIEL / "icon.svg").write_text(svg(), encoding="utf-8")
    print("geschrieben: icon.svg")


if __name__ == "__main__":
    main()
