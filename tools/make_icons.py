"""Erzeugt alle App-Icons aus Christophs Original-Icon (icons/putzteufel-original.png).

Aufruf im Projektordner:  py tools/make_icons.py
Benötigt Pillow (py -m pip install pillow).

Das Original ist eine cremefarbene Kachel mit abgerundeten Ecken auf weißem Grund.
- „any“-Icons: die Kachel mit transparenten Ecken
- „maskable“-Icons (Android schneidet rund/als Tropfen zu): der Inhalt verkleinert und
  mittig auf vollflächigem Creme, damit Hörner und Schriftzug im sicheren Bereich liegen
- Apple-Touch-Icon: wie maskable, aber etwas größer (iOS rundet nur die Ecken ab)
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ORDNER = Path(__file__).resolve().parent.parent / "icons"
ORIGINAL = ORDNER / "putzteufel-original.png"

# Lage der Kachel im 1024er-Original (gemessen) und ihr Eckenradius
KACHEL = (22, 22, 998, 998)
RADIUS = 225
# Mittelpunkt des eigentlichen Inhalts (Waschbär + Schriftzug), etwas über der Bildmitte
INHALT_MITTE = (512, 470)


def kachel_maske(groesse, kachel, radius, weich=0):
    maske = Image.new("L", (groesse, groesse), 0)
    ImageDraw.Draw(maske).rounded_rectangle(kachel, radius=radius, fill=255)
    return maske.filter(ImageFilter.GaussianBlur(weich)) if weich else maske


def kachel_mit_transparenten_ecken(original):
    # 4-fach groß maskieren für glatte Kanten
    gross = original.resize((4096, 4096), Image.LANCZOS)
    maske = kachel_maske(4096, tuple(4 * k for k in KACHEL), 4 * RADIUS)
    gross.putalpha(ImageChops.multiply(gross.getchannel("A"), maske))
    return gross.resize(original.size, Image.LANCZOS)


def verlauf(groesse, oben_links, unten_rechts):
    """Diagonaler Farbverlauf wie der Hintergrund der Kachel."""
    klein = Image.new("RGB", (2, 2))
    mitte = tuple((a + b) // 2 for a, b in zip(oben_links, unten_rechts))
    klein.putdata([oben_links, mitte, mitte, unten_rechts])
    return klein.resize((groesse, groesse), Image.BILINEAR)


def vollflaechig(original, skala):
    """Inhalt der Kachel verkleinert auf vollflächigem Creme-Verlauf (1024 × 1024)."""
    groesse = original.width
    hintergrund = verlauf(groesse, (246, 242, 236), (221, 211, 200)).convert("RGBA")
    # Kachelinneres mit weichem Rand, damit Kante und Schatten verschwinden
    inneres = original.copy()
    inset = 34
    rand = (KACHEL[0] + inset, KACHEL[1] + inset, KACHEL[2] - inset, KACHEL[3] - inset - 14)
    inneres.putalpha(kachel_maske(groesse, rand, RADIUS - inset, weich=14))
    neu = round(groesse * skala)
    inneres = inneres.resize((neu, neu), Image.LANCZOS)
    x = round(groesse / 2 - INHALT_MITTE[0] * skala)
    y = round(groesse / 2 - INHALT_MITTE[1] * skala)
    hintergrund.alpha_composite(inneres, (x, y))
    return hintergrund.convert("RGB")


def speichern(bild, groesse, name):
    bild.resize((groesse, groesse), Image.LANCZOS).save(ORDNER / name, optimize=True)
    print("geschrieben:", name)


def main():
    original = Image.open(ORIGINAL).convert("RGBA")
    assert original.size == (1024, 1024), "Original muss 1024 × 1024 sein"

    any_icon = kachel_mit_transparenten_ecken(original)
    maskable = vollflaechig(original, 0.66)
    apple = vollflaechig(original, 0.8)

    speichern(any_icon, 512, "icon-512.png")
    speichern(any_icon, 192, "icon-192.png")
    speichern(any_icon, 64, "icon-64.png")
    speichern(maskable, 512, "icon-maskable-512.png")
    speichern(maskable, 192, "icon-maskable-192.png")
    speichern(apple, 180, "apple-touch-icon.png")


if __name__ == "__main__":
    main()
