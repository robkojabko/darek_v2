"""
Složí celou hru do jednoho souboru (třeba jako dárek k poslání):
  jeden_soubor/hra_darek.html

Vezme index.html, místo <script src="js/…"> vloží obsah souborů z js/
a obrázky z obrazky/ a zvuky ze zvuky/ vloží jako base64. Výsledek funguje
sám o sobě, bez dalších složek – stačí ho otevřít v prohlížeči.

Použití (ze složky hry):
  python tools/slozit_do_jednoho.py
"""

import base64
import re
from pathlib import Path

HRA = Path(__file__).resolve().parent.parent
VYSTUP = HRA / 'jeden_soubor' / 'hra_darek.html'
TYPY = {'.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4'}
# 'obrazky/….png' nebo 'zvuky/….mp3' v kódu (v uvozovkách)
SOUBOR_V_KODU = re.compile(r"""(['"])((?:obrazky|zvuky)/[^'"\n]+\.(?:png|mp3|ogg|wav|m4a))\1""", re.IGNORECASE)   # i .MP3


def soubor_jako_data(m):
    soubor = HRA / m.group(2)
    if not soubor.exists():   # třeba písnička, která se teprve dodá – nechá se cesta
        print('chybí (nechávám cestu):', m.group(2))
        return m.group(0)
    data = base64.b64encode(soubor.read_bytes()).decode('ascii')
    return f'{m.group(1)}data:{TYPY[soubor.suffix.lower()]};base64,{data}{m.group(1)}'


def main():
    html = (HRA / 'index.html').read_text(encoding='utf-8')

    def vloz_skript(m):
        kod = (HRA / m.group(1)).read_text(encoding='utf-8')
        kod = SOUBOR_V_KODU.sub(soubor_jako_data, kod)
        assert '</script' not in kod, f'{m.group(1)} obsahuje </script>'
        return f'<script>\n// ===== {m.group(1)} =====\n{kod}</script>'

    html, pocet = re.subn(r'<script src="(js/[\w.-]+\.js)"></script>', vloz_skript, html)
    VYSTUP.parent.mkdir(exist_ok=True)
    VYSTUP.write_text(html, encoding='utf-8', newline='\n')
    print(f'hotovo: {VYSTUP.relative_to(HRA)} ({pocet} souborů kódu, {VYSTUP.stat().st_size // 1024} kB)')


if __name__ == '__main__':
    main()
