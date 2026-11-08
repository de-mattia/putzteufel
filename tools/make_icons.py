"""Erzeugt alle App-Icons aus Christophs Icon-Quelle (icons/putzteufel-icon-quelle.webp).

Aufruf im Projektordner:  py tools/make_icons.py
Benötigt Pillow (py -m pip install pillow).

Die Quelle ist ein Waschbärkopf mit roten Teufelshörnern in einem roten Kreis, außerhalb
transparent.
- „any“-Icons und Favicon: der runde Kreis mit transparenten Ecken
- „maskable“-Icons (Android schneidet rund/als Tropfen zu): Fläche durchgehend rot, der Kopf
  liegt in der Sicherheitszone (Radius ≤ 37 % statt der erlaubten 40 %), keine weißen Ecken
- Apple-Touch-Icon: wie maskable, etwas größer (iOS rundet nur die Ecken ab)
"""

from pathlib import Path

from PIL import Image

ORDNER = Path(__file__).resolve().parent.parent / "icons"
QUELLE = ORDNER / "putzteufel-icon-quelle.webp"

ROT = (240, 11, 21)  # Kreisfarbe der Quelle, zugleich background_color im Manifest
MITTE = (626.5, 626.5)  # Kreismitte in der Quelle (gemessen)
KOPF_RADIUS = 604  # weitester Punkt des Kopfes (Ohrspitzen) ab Kreismitte, in Quellpixeln


def vollflaechig(quelle, groesse, radius_anteil):
    """Kopf mittig auf roter Fläche, weitester Punkt bei radius_anteil × Kantenlänge."""
    skala = radius_anteil * groesse / KOPF_RADIUS
    neu = round(quelle.width * skala)
    klein = quelle.resize((neu, neu), Image.LANCZOS)
    bild = Image.new("RGBA", (groesse, groesse), ROT + (255,))
    x = round(groesse / 2 - MITTE[0] * skala)
    y = round(groesse / 2 - MITTE[1] * skala)
    bild.alpha_composite(klein, (x, y))
    return bild.convert("RGB")


def speichern(bild, name):
    bild.save(ORDNER / name, optimize=True)
    print("geschrieben:", name)


def main():
    quelle = Image.open(QUELLE).convert("RGBA")
    assert quelle.size == (1254, 1254), "Quelle muss 1254 × 1254 sein (sonst Maße oben anpassen)"

    for groesse, name in [(512, "icon-512.png"), (192, "icon-192.png"), (64, "icon-64.png")]:
        speichern(quelle.resize((groesse, groesse), Image.LANCZOS), name)
    for groesse, name in [(512, "icon-maskable-512.png"), (192, "icon-maskable-192.png")]:
        speichern(vollflaechig(quelle, groesse, 0.37), name)
    speichern(vollflaechig(quelle, 180, 0.44), "apple-touch-icon.png")


if __name__ == "__main__":
    main()
