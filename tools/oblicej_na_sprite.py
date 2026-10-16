"""
Z fotky vyřízne obličej (hlavu), udělá z něj malý sprite pro hru
a uloží ho do složky obrazky/ (hra si ho odtamtud načte).

Postup:
  1. najde obličej podle barvy kůže (největší souvislá plocha v horní části fotky)
     – kdo chce, může výřez zadat ručně přes --vyrez
  2. výřez rozšíří nahoru a do stran, aby se vešly vlasy, a udělá z něj čtverec
  3. pozadí odstraní: oválná maska kolem hlavy + odmazání barvy pozadí od okraje oválu
  4. zmenší na 48 × 48 px a sníží počet barev (pixel-art vzhled jako zbytek hry)
  5. přidá tmavý obrys, uloží náhled do fotky/ a hlavu do obrazky/hrac.png
     (pro učitele přes --cil, např. --cil MALA → obrazky/mala.png;
     nového učitele je pak potřeba přidat do FACE_FILES v js/03_postavy.js)

Použití (ze složky hry):
  python tools/oblicej_na_sprite.py
  python tools/oblicej_na_sprite.py --foto fotky/kamos.JPEG --barvy 20
  python tools/oblicej_na_sprite.py --vyrez 40,20,303,330      (ruční výřez x0,y0,x1,y1)
  python tools/oblicej_na_sprite.py --bez-vlozeni              (jen náhled, hru nemění)
  python tools/oblicej_na_sprite.py --foto fotky/Mála.jpg --vyrez -20,245,250,515 --cil MALA   (učitel)

Potřebuje jen Pillow a numpy.
"""

import argparse
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HRA = Path(__file__).resolve().parent.parent
VYCHOZI_FOTO = HRA / 'fotky' / 'kamos 1.JPEG'   # celý obličej s úsměvem (kamos.JPEG má obličej uříznutý okrajem)
OBRAZKY = HRA / 'obrazky'   # sem si hra sahá pro hlavy (obrazky/hrac.png, obrazky/mala.png …)
NAHLED = HRA / 'fotky' / 'hrac_hlava.png'          # 48 × 48 – přesně to, co je ve hře
NAHLED_VELKY = HRA / 'fotky' / 'hrac_hlava_x8.png'  # zvětšený náhled pro kontrolu

VELIKOST = 48
OBRYS = (42, 29, 24, 255)   # tmavě hnědý obrys, ladí se stíny ve hře


# ---------------------------------------------------------------- 1) hledání obličeje
def maska_kuze(img):
    """Pixely, které barvou odpovídají kůži (prostor YCbCr)."""
    ycc = np.asarray(img.convert('YCbCr')).astype(np.int16)
    y, cb, cr = ycc[..., 0], ycc[..., 1], ycc[..., 2]
    return (y > 70) & (cr >= 135) & (cr <= 178) & (cb >= 82) & (cb <= 132)


def nejvetsi_plocha(maska, horni_podil=0.75):
    """Maska největší souvislé plochy kůže (jen v horní části fotky – níž bývají ruce)."""
    h, w = maska.shape
    maska = maska.copy()
    maska[int(h * horni_podil):, :] = False
    navstiveno = np.zeros_like(maska)
    nejlepsi = None
    for sy, sx in zip(*np.nonzero(maska)):
        if navstiveno[sy, sx]:
            continue
        fronta = deque([(sy, sx)])
        navstiveno[sy, sx] = True
        body = []
        while fronta:
            cy, cx = fronta.popleft()
            body.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and maska[ny, nx] and not navstiveno[ny, nx]:
                    navstiveno[ny, nx] = True
                    fronta.append((ny, nx))
        if nejlepsi is None or len(body) > len(nejlepsi):
            nejlepsi = body
    if not nejlepsi:
        return None
    plocha = np.zeros_like(maska)
    ys, xs = zip(*nejlepsi)
    plocha[list(ys), list(xs)] = True
    return plocha


def vyrez_hlavy(plocha):
    """Z plochy kůže najde čelo a bradu a udělá čtverec celé hlavy (s vlasy).

    Plocha kůže bývá obličej + krk (a někdy kus světlých vlasů). Po řádcích se změří
    šířka: čelo = první řádek širší než polovina obličeje, brada = první řádek pod
    nejširším místem, kde je kůže užší než 60 % (začíná krk)."""
    sirky = plocha.sum(axis=1)
    max_w = sirky.max()
    nejsirsi = int(np.argmax(sirky))
    celo = int(np.argmax(sirky > 0.5 * max_w))
    pod = np.nonzero(sirky[nejsirsi:] < 0.6 * max_w)[0]
    brada = nejsirsi + int(pod[0]) if len(pod) else len(sirky) - 1
    vyska_obliceje = brada - celo
    # střed obličeje = průměr středů řádků mezi čelem a bradou
    stredy = []
    for y in range(celo, brada):
        xs = np.nonzero(plocha[y])[0]
        if len(xs):
            stredy.append((xs.min() + xs.max()) / 2)
    cx = float(np.mean(stredy))
    horni = celo - 0.32 * vyska_obliceje      # vlasy nad čelem
    dolni = brada + 0.03 * vyska_obliceje
    strana = dolni - horni
    cy = (horni + dolni) / 2
    return (round(cx - strana / 2), round(cy - strana / 2), round(cx + strana / 2), round(cy + strana / 2))


# ---------------------------------------------------------------- 2) sprite
def odstran_pozadi(rgb, alfa, prah=48):
    """Uvnitř oválu odmaže pozadí: od okraje oválu se „rozlévá“ dovnitř po pixelech,
    které mají podobnou barvu jako pozadí (medián pixelů těsně za oválem)."""
    h, w = alfa.shape
    # prstenec těsně vně oválu = vzorek pozadí
    okoli = np.zeros_like(alfa)
    okoli[1:, :] |= alfa[:-1, :]
    okoli[:-1, :] |= alfa[1:, :]
    okoli[:, 1:] |= alfa[:, :-1]
    okoli[:, :-1] |= alfa[:, 1:]
    for _ in range(3):
        rozsir = okoli.copy()
        rozsir[1:, :] |= okoli[:-1, :]
        rozsir[:-1, :] |= okoli[1:, :]
        okoli = rozsir
    prstenec = okoli & ~alfa
    if not prstenec.any():
        return alfa
    pozadi = np.median(rgb[prstenec], axis=0)
    podobne = np.sqrt(((rgb - pozadi) ** 2).sum(axis=2)) < prah
    # rozlévání od okraje oválu dovnitř
    vysledek = alfa.copy()
    fronta = deque((y, x) for y, x in zip(*np.nonzero(alfa & podobne & okoli)))
    for y, x in fronta:
        vysledek[y, x] = False
    while fronta:
        y, x = fronta.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and vysledek[ny, nx] and podobne[ny, nx]:
                vysledek[ny, nx] = False
                fronta.append((ny, nx))
    return vysledek


def maska_grabcut(rgb, strana, pracovni=360):
    """Odhad, co je hlava: mimo ovál pozadí, v oválu „asi hlava“, uprostřed „určitě hlava“.
    GrabCut dohledá hranici vlasů a tváře; díry uvnitř se vyplní, nechá se jen největší kus."""
    import cv2
    k = min(1.0, pracovni / strana)
    n = max(8, int(round(strana * k)))
    obr = cv2.resize(np.ascontiguousarray(rgb[..., ::-1]).astype(np.uint8), (n, n), interpolation=cv2.INTER_AREA)
    m = np.full((n, n), cv2.GC_BGD, np.uint8)
    cv2.ellipse(m, (n // 2, n // 2), (int(n * 0.47), int(n * 0.49)), 0, 0, 360, int(cv2.GC_PR_FGD), -1)
    cv2.ellipse(m, (n // 2, int(n * 0.55)), (int(n * 0.2), int(n * 0.24)), 0, 0, 360, int(cv2.GC_FGD), -1)
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(obr, m, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    hlava = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    hlava = cv2.morphologyEx(hlava, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    pocet, znacky, stat, _ = cv2.connectedComponentsWithStats(hlava)   # jen největší souvislý kus
    if pocet > 1:
        hlava = np.where(znacky == 1 + np.argmax(stat[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    okraj = hlava.copy()   # díry uvnitř vyplnit (pozadí = to, kam se dá dostat od okraje)
    cv2.floodFill(okraj, np.zeros((n + 2, n + 2), np.uint8), (0, 0), 255)
    hlava = hlava | (255 - okraj)
    return cv2.resize(hlava, (strana, strana), interpolation=cv2.INTER_NEAREST) > 0


def maska_z_obrysu(img, cesta):
    """Screenshot fotky, na kterém uživatel modře obtáhl hlavu → maska hlavy ve velikosti fotky.
    Fotka ve screenshotu se najde jako obdélník bez tmavého okraje kolem (černé pruhy po stranách)."""
    from scipy import ndimage
    s = np.asarray(Image.open(cesta).convert('RGB')).astype(int)
    modra = (s[..., 2] > 120) & (s[..., 2] - s[..., 0] > 60)
    svetle = s.sum(2) > 150
    radky = np.where(svetle.mean(1) > 0.5)[0]
    sloupce = np.where(svetle.mean(0) > 0.5)[0]
    x0, x1, y0, y1 = sloupce.min(), sloupce.max() + 1, radky.min(), radky.max() + 1
    uvnitr = ndimage.binary_fill_holes(ndimage.binary_dilation(modra, iterations=2))
    m = Image.fromarray((uvnitr[y0:y1, x0:x1] * 255).astype(np.uint8)).resize(img.size, Image.NEAREST)
    return np.asarray(m) > 0


def doplnek_z_car(sprite, cesta, strana):
    """Screenshot hotové (zvětšené) hlavy s modrou čarou, která ukazuje, kam hlavu doplnit:
    plocha mezi čarou a hlavou se přidá. Vrací masku ve výřezu fotky (strana × strana)."""
    from scipy import ndimage
    s = np.asarray(Image.open(cesta).convert('RGB')).astype(int)
    modra = (s[..., 2] > 120) & (s[..., 2] - s[..., 0] > 60)
    hlava_ss = (np.abs(s - s[2, 2]).sum(2) > 40) & ~modra
    ys, xs = np.where(hlava_ss)
    sp = np.asarray(sprite)
    plna = (sp[..., 3] > 0) & ~np.all(sp == OBRYS, axis=2)   # hlava bez obrysu
    ay, ax = np.where(plna)
    kx = (xs.max() - xs.min() + 1) / (ax.max() - ax.min() + 1)
    ky = (ys.max() - ys.min() + 1) / (ay.max() - ay.min() + 1)
    # plocha uzavřená čarou a hlavou (čára se trochu zesílí, ať dosáhne na hlavu)
    hranice = hlava_ss | ndimage.binary_dilation(modra, iterations=5)
    pridat_ss = ndimage.binary_fill_holes(hranice) & ~hlava_ss
    pridat = np.zeros((VELIKOST, VELIKOST), bool)
    for py in range(VELIKOST):
        for px in range(VELIKOST):
            X = int(xs.min() + (px - ax.min() + 0.5) * kx)
            Y = int(ys.min() + (py - ay.min() + 0.5) * ky)
            if 0 <= X < s.shape[1] and 0 <= Y < s.shape[0]:
                pridat[py, px] = pridat_ss[Y, X]
    print('doplněno pixelů hlavy:', int((pridat & ~plna).sum()))
    # pixely spritu 1..46 odpovídají výřezu (1 px okraj na obrys)
    vnitrek = Image.fromarray((pridat[1:-1, 1:-1] * 255).astype(np.uint8)).resize((strana, strana), Image.NEAREST)
    return np.asarray(vnitrek) > 0


def udelej_sprite(img, vyrez, barvy, prah=48, oval=0.8, grabcut=False, obrys=None, pridat=None):
    # výřez může přesahovat fotku – chybějící část zůstane průhledná
    x0, y0, x1, y1 = vyrez
    strana = x1 - x0
    hlava = Image.new('RGBA', (strana, strana), (0, 0, 0, 0))
    hlava.paste(img.convert('RGBA'), (-x0, -y0))

    # oválná maska kolem hlavy (o kousek užší než výška – hlava je protáhlá)
    maska = Image.new('L', (strana, strana), 0)
    ImageDraw.Draw(maska).ellipse(
        (strana * (1 - oval) / 2, strana * 0.01, strana * (1 + oval) / 2, strana * 0.99), fill=255)
    # co je mimo fotku, je průhledné i uvnitř oválu
    uvnitr_fotky = Image.new('L', (strana, strana), 0)
    uvnitr_fotky.paste(255, (max(0, -x0), max(0, -y0),
                             min(strana, img.width - x0), min(strana, img.height - y0)))
    alfa = np.minimum(np.asarray(maska), np.asarray(uvnitr_fotky)) > 0
    if obrys is not None:   # hlava obtažená modře – místo oválu
        o = Image.new('L', (strana, strana), 0)
        o.paste(Image.fromarray((obrys * 255).astype(np.uint8)), (-x0, -y0))
        alfa = np.asarray(o) > 0
    if prah > 0:   # 0 = pozadí podle barvy neodmazávat, jen ovál
        alfa = odstran_pozadi(np.asarray(hlava)[..., :3].astype(np.int16), alfa, prah)
    if grabcut:    # pestré pozadí: postavu od pozadí oddělí GrabCut (OpenCV)
        alfa = alfa & maska_grabcut(np.asarray(hlava)[..., :3], strana)
    if pridat is not None:   # doplnění podle modré čáry (--doplnit)
        alfa = alfa | pridat
    hlava.putalpha(Image.fromarray((alfa * 255).astype(np.uint8)))

    # zmenšení: necháme 1 px okraj na obrys
    vnitrek = VELIKOST - 2
    mala = hlava.resize((vnitrek, vnitrek), Image.LANCZOS)
    mala = mala.filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))

    # méně barev = pixel-art; průhlednost jen ano/ne, ať jsou hrany ostré
    rgb = mala.convert('RGB').quantize(colors=barvy, method=Image.Quantize.MEDIANCUT).convert('RGB')
    a = (np.asarray(mala.getchannel('A')) >= 128)
    out = np.zeros((VELIKOST, VELIKOST, 4), dtype=np.uint8)
    out[1:-1, 1:-1, :3] = np.asarray(rgb)
    out[1:-1, 1:-1, 3] = a * 255

    # tmavý obrys: průhledné pixely sousedící s neprůhlednými
    plny = out[..., 3] > 0
    soused = np.zeros_like(plny)
    soused[1:, :] |= plny[:-1, :]
    soused[:-1, :] |= plny[1:, :]
    soused[:, 1:] |= plny[:, :-1]
    soused[:, :-1] |= plny[:, 1:]
    out[soused & ~plny] = OBRYS
    return Image.fromarray(out, 'RGBA')


# ---------------------------------------------------------------- 3) vložení do hry
def bile_pozadi_na_zelene(img, prah=185):
    """Skoro bílé pixely spojené s okrajem fotky (pozadí) přebarví na čistě zelenou.
    Za pozadí se bere i šedý stín na zdi (světlejší, skoro bez barvy) – pleť má barvu, zůstane."""
    a = np.array(img).astype(int)
    h, w, _ = a.shape
    sytost = a.max(axis=2) - a.min(axis=2)
    svetle = (a.min(axis=2) > prah) | ((a.min(axis=2) > 95) & (sytost < 34))
    videno = np.zeros((h, w), bool)
    fronta = deque([(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)])
    while fronta:
        y, x = fronta.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or videno[y, x] or not svetle[y, x]:
            continue
        videno[y, x] = True
        fronta.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    a[videno] = (0, 255, 0)
    return Image.fromarray(a.astype('uint8'), 'RGB')


def uloz(obr, cesta, pokusy=6):
    """Uloží obrázek; když soubor zrovna drží jiný program (Windows), zkusí to znovu."""
    import time
    for i in range(pokusy):
        try:
            obr.save(cesta)
            return
        except OSError:
            if i == pokusy - 1:
                raise
            time.sleep(0.4)


def vloz_do_hry(sprite, znacka):
    jmeno = 'hrac' if znacka == 'PLAYER_FACE' else znacka[len('FACE_'):].lower()
    OBRAZKY.mkdir(exist_ok=True)
    cil = OBRAZKY / f'{jmeno}.png'
    uloz(sprite, cil)
    postavy = (HRA / 'js' / '03_postavy.js').read_text(encoding='utf-8')
    if jmeno != 'hrac' and f"'obrazky/{jmeno}.png'" not in postavy:
        print(f"POZOR: nový učitel – přidej do FACE_FILES v js/03_postavy.js řádek  {jmeno}: 'obrazky/{jmeno}.png',")
    return cil


def main():
    ap = argparse.ArgumentParser(description='Obličej z fotky → sprite hlavy do obrazky/')
    ap.add_argument('--foto', default=str(VYCHOZI_FOTO), help='cesta k fotce')
    ap.add_argument('--barvy', type=int, default=16, help='počet barev (méně = víc pixel-art)')
    ap.add_argument('--vyrez', help='ruční výřez hlavy x0,y0,x1,y1 (px ve fotce)')
    ap.add_argument('--bez-vlozeni', action='store_true', help='jen uložit náhled, hru neměnit')
    ap.add_argument('--oval', type=float, default=0.8,
                    help='šířka oválu hlavy jako podíl výřezu (u těsného výřezu víc, třeba 0.92)')
    ap.add_argument('--prah', type=int, default=48,
                    help='jak moc odmazávat pozadí podobné barvy (0 = vůbec, jen ovál; víc = víc)')
    ap.add_argument('--grabcut', action='store_true',
                    help='pestré pozadí: hlavu od pozadí oddělí GrabCut (potřebuje opencv-python-headless)')
    ap.add_argument('--bile-pozadi', action='store_true',
                    help='fotka s bílým pozadím (vyříznutá): pozadí od okraje se nejdřív nahradí zelenou, ať se neodmaže světlá tvář')
    ap.add_argument('--obrys',
                    help='screenshot fotky s hlavou obtaženou modrou čarou: vyřízne se přesně podle ní (výřez se spočítá sám)')
    ap.add_argument('--doplnit',
                    help='screenshot hotové hlavy s modrou čarou: plocha mezi čarou a hlavou se doplní z fotky (ostatní volby stejné jako při výrobě té hlavy)')
    ap.add_argument('--cil', default='PLAYER_FACE',
                    help='čí hlava: PLAYER_FACE (hráč → obrazky/hrac.png) nebo jméno učitele, např. MALA → obrazky/mala.png')
    args = ap.parse_args()

    img = Image.open(args.foto).convert('RGB')
    if args.bile_pozadi:
        img = bile_pozadi_na_zelene(img)
    obrys = maska_z_obrysu(img, args.obrys) if args.obrys else None
    if obrys is not None and not args.vyrez:   # čtverec kolem obrysu s malým okrajem
        ys, xs = np.where(obrys)
        s = int(max(xs.max() - xs.min(), ys.max() - ys.min()) * 1.04)
        cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
        vyrez = (cx - s // 2, cy - s // 2, cx - s // 2 + s, cy - s // 2 + s)
        print('výřez podle obrysu:', vyrez)
    elif args.vyrez:
        vyrez = tuple(int(v) for v in args.vyrez.split(','))
        if vyrez[2] - vyrez[0] != vyrez[3] - vyrez[1]:   # sjednotit na čtverec
            s = max(vyrez[2] - vyrez[0], vyrez[3] - vyrez[1])
            vyrez = (vyrez[0], vyrez[1], vyrez[0] + s, vyrez[1] + s)
        print('ruční výřez hlavy:', vyrez)
    else:
        plocha = nejvetsi_plocha(maska_kuze(img))
        if plocha is None:
            sys.exit('Obličej se nepodařilo najít – zadej výřez ručně přes --vyrez x0,y0,x1,y1')
        vyrez = vyrez_hlavy(plocha)
        print('výřez hlavy:', vyrez)

    sprite = udelej_sprite(img, vyrez, args.barvy, args.prah, args.oval, args.grabcut, obrys)
    if args.doplnit:
        pridat = doplnek_z_car(sprite, args.doplnit, vyrez[2] - vyrez[0])
        sprite = udelej_sprite(img, vyrez, args.barvy, args.prah, args.oval, args.grabcut, obrys, pridat)
    znacka = 'PLAYER_FACE' if args.cil == 'PLAYER_FACE' else 'FACE_' + args.cil.upper()
    nahled, velky = NAHLED, NAHLED_VELKY
    if znacka != 'PLAYER_FACE':
        nahled = HRA / 'fotky' / f'hlava_{args.cil.lower()}.png'
        velky = HRA / 'fotky' / f'hlava_{args.cil.lower()}_x8.png'
    uloz(sprite, nahled)
    uloz(sprite.resize((VELIKOST * 8, VELIKOST * 8), Image.NEAREST), velky)
    print('náhled:', nahled.relative_to(HRA), 'a', velky.relative_to(HRA))

    if not args.bez_vlozeni:
        cil = vloz_do_hry(sprite, znacka)
        print('uloženo do hry:', cil.relative_to(HRA))


if __name__ == '__main__':
    main()
