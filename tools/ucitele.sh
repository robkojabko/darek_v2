#!/bin/sh
# Hlavy postav pro hru – výřezy jsou ručně nastavené pro tyto fotky.
# Spouštět ze složky hry:  sh tools/ucitele.sh
#   --grabcut      pestré pozadí: hlavu od pozadí oddělí GrabCut (pip install opencv-python-headless)
#   --bile-pozadi  bílá zeď / vyříznutá fotka: pozadí i stín na zdi se odmažou podle barvy
#   --obrys X.jpg  screenshot fotky s hlavou obtaženou modře: vyřízne se přesně podle čáry
#   --doplnit X.jpg  screenshot hotové hlavy s modrou čarou: plocha mezi čarou a hlavou se doplní z fotky
cd "$(dirname "$0")/.." || exit 1
put() { python tools/oblicej_na_sprite.py --foto "fotky/$1" --vyrez="$2" --cil "$3" --prah 0 --barvy 24 --oval "$4"; }
gc()  { python tools/oblicej_na_sprite.py --foto "fotky/$1" --vyrez="$2" --cil "$3" --prah 0 --barvy 24 --oval 0.95 --grabcut; }

# učitelé
put "Rauscher.jpg" "20,190,250,420"  RAUSCHER 0.9
gc  "holub 3.jpg"  "370,300,610,540" HOLUB
# Šmahel: fotka je nakřivo – "Šmahel rovně.jpg" je narovnaná o 23° (PIL rotate(23, center=(300,265)))
put "Šmahel rovně.jpg" "152,100,472,420" SMAHEL 0.92
# Bečvář: nová fotka (béžová zeď splývá s pletí, proto GrabCut s okrajem vlevo), vlevo doplněný obličej podle „Bečvář oprava 2.jpg“
python tools/oblicej_na_sprite.py --foto "fotky/Bečvář oprava.jpg" --vyrez=5,15,175,185 --cil BECVAR --prah 0 --barvy 24 --oval 0.95 --grabcut --doplnit "fotky/Bečvář oprava 2.jpg"
put "Mála.jpg"     "0,285,215,500"   MALA     0.92
gc  "Křiváček oprava.jpg" "60,55,520,515" KRIVACEK   # nová fotka (zahrada), i s vousy
gc  "Karel Chán.jpg" "10,15,466,471" CHAN

# studenti
python tools/oblicej_na_sprite.py --foto "fotky/Kuba Vozábal.png" --bile-pozadi --vyrez=-20,160,1430,1610 --cil VOZABAL --barvy 24 --oval 0.97 --prah 60
python tools/oblicej_na_sprite.py --foto fotky/Myky.jpg --bile-pozadi --vyrez=165,330,605,770 --cil MYKY --barvy 24 --oval 0.95 --prah 60
gc  "David.jpg"    "36,26,164,154"   DAVID
gc  "Emma.jpg"     "85,55,275,245"   EMMA
python tools/oblicej_na_sprite.py --foto fotky/Zita.jpg --vyrez=160,120,590,590 --cil ZITA --prah 0 --barvy 24 --oval 0.88
python tools/oblicej_na_sprite.py --foto fotky/Lili.jpg --vyrez=160,65,410,315 --cil LILI --prah 0 --barvy 24 --oval 0.92

# ruční opravy: ořízne hlavy podle modrých čar ve „X oprava.jpg“ (spouštět jen po vygenerování hlavy)
cut() { python tools/oriznout_podle_car.py --oprava "fotky/$1" --hlava "$2" $3; }
cut "Rauscher oprava.jpg" rauscher
cut "šmahel oprava.jpg"   smahel --obrys
cut "Zita oprava.jpg"     zita "--posun 3"   # posunutá doprava, aby seděla na těle

# noví učitelé (Soumar a Lencová v A211, Veselá v C301, Mráz = učitel na dozoru)
gc  "Soumar.jpg"     "35,40,255,260"    SOUMAR
# Lencová: hlava přesně podle modrého obrysu ve „Lencová oprava.jpg“ (screenshot fotky)
python tools/oblicej_na_sprite.py --foto "fotky/Lencová.jpg" --obrys "fotky/Lencová oprava.jpg" --cil LENCOVA --prah 0 --barvy 24
# Veselá: doplněná brada a límec podle „veselá oprava.jpg“
python tools/oblicej_na_sprite.py --foto "fotky/Veselá.jpg" --vyrez=35,5,375,345 --cil VESELA --prah 0 --barvy 24 --oval 0.95 --grabcut --doplnit "fotky/veselá oprava.jpg"
gc  "Láďa Mráz.jpg"  "25,35,155,165"    MRAZ

# Jelínek (A302): fotka byla nakřivo – „Jelínek rovně.jpg“ je narovnaná o 40° (PIL rotate(-40, center=(165,290)))
gc  "Jelínek rovně.jpg" "28,140,288,400" JELINEK

# Binková (učitelka) a Mišák (student) v C109
put "Binková.jpg" "55,295,335,575" BINKOVA 0.86   # GrabCut jí uřízl vlasy, proto jen ovál
python tools/oriznout_podle_car.py --oprava "fotky/Binková oprava.jpg" --hlava binkova   # žlutý pruh vpravo nahoře a proužek vlevo pryč
gc  "Mišák.jpg"   "105,105,585,585" MISAK
gc  "Lukášková.jpg"  "18,22,178,182"   LUKASKOVA   # chemie, A114
# Kája: „Kája upravená.jpg“ = Kája.jpg se zesvětlenými stíny od listí (HSV, jas k průměru okolí)
python tools/oblicej_na_sprite.py --foto "fotky/Kája upravená.jpg" --vyrez=225,130,475,380 --cil KAJA --prah 0 --barvy 48 --oval 0.92 --grabcut

# Terka (chodí s Rauscherem), Láďa (kabinet tělocviku), Vozábalová (kancelář), Chválová (kabinet pod sborovnou),
# ředitelka (ředitelna), Švecová (Kabinet 8 u C308)
python tools/oblicej_na_sprite.py --foto "fotky/Terka.jpg" --vyrez=205,130,455,380 --cil TERKA --prah 0 --barvy 24 --oval 0.88
python tools/oriznout_podle_car.py --oprava "fotky/Terka oprava.jpg" --hlava terka   # pruh vpravo za čárou pryč
gc  "Láďa.jpg"        "2,10,138,146"  LADA
gc  "Vozábalová.jpg"  "0,0,160,160"   VOZABALOVA
python tools/oblicej_na_sprite.py --foto "fotky/Chválová.jpg" --vyrez=0,0,160,160 --cil CHVALOVA --prah 40 --barvy 24 --oval 0.95
gc  "Ředitelka.jpg"   "0,0,160,160"   REDITELKA
gc  "Švecová.jpg"     "0,0,120,120"   SVECOVA
python tools/oblicej_na_sprite.py --foto "fotky/školník.jpg" --vyrez=9,11,41,43 --cil SKOLNIK --prah 0 --barvy 32 --oval 0.8   # Vrah: školník (fotka je malá)
python tools/oriznout_podle_car.py --oprava "fotky/školník oprava.jpg" --hlava skolnik --vrsek   # pravá čára jde i přes vršek čepice
# zarovnání: pozadí vpravo vedle tváře pryč (sloupce 34+ od řádku 13), obličej na střed – ručně v Pythonu (README)
# studenti Damien, Robin, Michele (jméno se píše Michele, fotka se jmenuje Michaelle)
python tools/oblicej_na_sprite.py --foto "fotky/Michaelle .jpg" --vyrez=0,20,180,200 --cil MICHAELLE --prah 0 --barvy 24 --oval 0.9
python tools/oblicej_na_sprite.py --foto "fotky/Robin.jpg" --vyrez=10,70,490,550 --cil ROBIN --prah 0 --barvy 24 --oval 0.95 --grabcut
python tools/oblicej_na_sprite.py --foto "fotky/Damien.jpg" --vyrez=0,12,124,136 --cil DAMIEN --prah 0 --barvy 24 --oval 0.98
# Damien: béžová zeď splývá s pletí (GrabCut nefunguje) – pak ručně užší elipsa (cx 0.54, rx 0.36, ry 0.49 šířky/výšky) a tmavý obrys
# Ládová, Telingerová, Kučerová (malé kulaté fotky ze školního webu)
python tools/oblicej_na_sprite.py --foto "fotky/Telingerová .jpg" --vyrez=9,3,57,51 --cil TELINGEROVA --prah 0 --barvy 32 --oval 0.92
python tools/oblicej_na_sprite.py --foto "fotky/Ládová.jpg" --vyrez=9,3,45,39 --cil LADOVA --prah 0 --barvy 32 --oval 0.88
python tools/oblicej_na_sprite.py --foto "fotky/Kučerová .jpg" --vyrez=8,3,46,41 --cil KUCEROVA --prah 0 --barvy 32 --oval 0.92
