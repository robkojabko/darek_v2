"""Ořízne hotovou hlavu (obrazky/X.png) podle modrých čar, které uživatel nakreslil
do screenshotu zvětšené hlavy (fotky/„X oprava.jpg“). Co je za čarou, zprůhlední.

  python tools/oriznout_podle_car.py --oprava "fotky/Zita oprava.jpg" --hlava zita
  python tools/oriznout_podle_car.py --oprava "fotky/šmahel oprava.jpg" --hlava smahel --obrys
  --posun 3 = po oříznutí posune hlavu o 3 px doprava (aby seděla na těle)
  --vrsek = čára vpravo jde i přes vršek hlavy (oblouk shora a pak dolů po boku): v každém
            řádku se bere její nejpravější bod a co je nad obloukem, taky zmizí (školník)

Screenshot se na sprite napasuje podle obdélníku kolem hlavy (pozadí = barva v rohu).
Bez --obrys: každá čára je svislá hranice. Čára vlevo od středu odřízne, co je vlevo od ní,
čára vpravo odřízne, co je vpravo. Nad a pod koncem čáry pokračuje svisle.
--obrys: čára obtáčí hlavu (i shora). Nechá se jen to, co je spojené se středem obličeje.
Tmavé vlasy u tmavého pozadí se tím můžou ztratit, proto jen na světlou hlavu.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HRA = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--oprava', required=True, help='screenshot s modrými čarami')
    ap.add_argument('--hlava', required=True, help='jméno v obrazky/ (bez .png)')
    ap.add_argument('--obrys', action='store_true', help='čára obtáčí hlavu, nechá se vnitřek')
    ap.add_argument('--posun', type=int, default=0, help='po oříznutí posunout hlavu o N px doprava (záporné = doleva)')
    ap.add_argument('--vrsek', action='store_true', help='pravá čára obtáčí i vršek hlavy')
    args = ap.parse_args()

    s = np.asarray(Image.open(HRA / args.oprava).convert('RGB')).astype(int)
    blue = (s[:, :, 2] > 120) & (s[:, :, 2] - s[:, :, 0] > 60)
    diff = np.abs(s - s[2, 2]).sum(2) > 40
    # okraje čáry (rozmazané do pozadí) se nesmí počítat do hlavy, jinak se screenshot napasuje vedle
    ys, xs = np.where(diff & ~(ndimage.binary_dilation(blue, iterations=3) if args.vrsek else blue))
    cil = HRA / 'obrazky' / f'{args.hlava}.png'
    a = np.asarray(Image.open(cil).convert('RGBA')).copy()
    ay, ax = np.where(a[:, :, 3] > 0)
    kx = (xs.max() - xs.min() + 1) / (ax.max() - ax.min() + 1)
    ky = (ys.max() - ys.min() + 1) / (ay.max() - ay.min() + 1)
    cx = (xs.min() + xs.max()) / 2

    if args.obrys:
        bar = ndimage.binary_dilation(blue, iterations=4)
        lab, _ = ndimage.label((diff | blue) & ~bar)
        keep = lab == lab[int((ys.min() + ys.max()) / 2), int(cx)]
        keep |= ndimage.binary_dilation(keep, iterations=6) & bar   # pixely pod čarou patří k obličeji

        def pryc(X, Y):
            return not keep[min(max(Y, 0), s.shape[0] - 1), min(max(int(X), 0), s.shape[1] - 1)]
    else:
        lab, n = ndimage.label(ndimage.binary_dilation(blue, iterations=2))
        if args.vrsek:   # přerušená čára (víc kousků) = jedna čára vlevo a jedna vpravo
            strana = np.zeros_like(lab)
            for i in range(1, n + 1):   # kousek patří k levé čáře, jen když leží u levého okraje hlavy
                by, bx = np.where(lab == i)
                strana[by, bx] = 1 if bx.mean() < xs.min() + 0.25 * (xs.max() - xs.min()) else 2
            lab, n = strana, 2
        cary = []
        for i in range(1, n + 1):
            by, bx = np.where(lab == i)
            if len(by) < 30:   # šmouha, ne čára
                continue
            vpravo = (i == 2) if args.vrsek else bx.mean() > cx
            radky, sloupce = {}, {}
            for y, x in zip(by, bx):
                radky.setdefault(y, []).append(x)
                sloupce.setdefault(x, []).append(y)
            oblouk = {}
            if vpravo and args.vrsek:   # horní čtvrtina čáry = oblouk přes vršek hlavy
                horni = by.min() + (by.max() - by.min()) * 0.25
                oblouk = {x: min(v) for x, v in sloupce.items() if min(v) <= horni}
            cary.append((vpravo, {y: (max(v) if vpravo and args.vrsek else min(v) if vpravo else max(v)) for y, v in radky.items()}, oblouk))

        def pryc(X, Y):
            for vpravo, radky, oblouk in cary:
                L = radky[Y] if Y in radky else radky[min(radky, key=lambda y: abs(y - Y))]
                if (X > L) if vpravo else (X < L):
                    return True
                if int(X) in oblouk and Y < oblouk[int(X)]:   # nad obloukem přes vršek
                    return True
                if oblouk and int(X) > max(oblouk) and Y < min(oblouk.values()):
                    return True
            return False

    odebrano = 0
    for py in range(a.shape[0]):
        for px in range(a.shape[1]):
            if a[py, px, 3] and pryc(xs.min() + (px - ax.min() + 0.5) * kx, int(ys.min() + (py - ay.min() + 0.5) * ky)):
                a[py, px, 3] = 0
                odebrano += 1
    if args.posun:   # aby hlava lépe seděla na těle
        a = np.roll(a, args.posun, axis=1)
    Image.fromarray(a).save(cil)
    print(f'{cil.relative_to(HRA)}: odebráno {odebrano} px')


if __name__ == '__main__':
    main()
