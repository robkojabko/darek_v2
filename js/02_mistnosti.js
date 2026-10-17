// Místnosti, dveře, nábytek (ROOMS) a spojené chodby
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// MÍSTNOSTI A DVEŘE – čistě data. Novou místnost přidáš jen sem.
//
// Místnost:  name (zobrazený název), where (kde – „v šatnách“, pro texty úkolů),
//            w/h (vnější rozměr včetně zdí),
//            floorColor, volitelně wallColor, volitelně start {x, y} – kde hráč
//            stojí, když do místnosti nepřijde dveřmi (začátek hry).
//            Místnost se sama vycentruje na plátno.
// Dveře:     side  – na které zdi jsou: 'top' | 'bottom' | 'left' | 'right'
//            at    – poloha středu dveří podél zdi, 0..1 (0.5 = uprostřed)
//            to    – id cílové místnosti
//            local – volitelně {x, y, w, h}: dveře mimo zeď (v px od levého horního
//                    rohu místnosti); side pak říká, kterým směrem se do nich vchází
//            style – volitelně vzhled jen těchto dveří ('glass' = skleněné)
//            hidden – volitelně neviditelný průchod (třeba konec schodů do dalšího patra)
//            spawnLocal – volitelně {x, y}: kde se hráč objeví v cílové místnosti
//                    (střed hráče v px od jejího levého horního rohu)
//            spawn – volitelně {x, y}: kde se hráč objeví v cílové místnosti.
//                    Když chybí, dopočítá se kousek před dveřmi cílové
//                    místnosti, které vedou zpátky sem.
// Pro cestu tam i zpět musí mít dveře obě místnosti (každá ty své).
// =====================================================================
// Překážky: obstacles: [{ kind, at: {x, y}, w, h }] – pevné jako zdi,
//            kind určuje vzhled (viz OBSTACLE_ART), at = střed jako u učitelů.
// Lavice v učebně: mřížka 3 × 3 (vrací seznam překážek)
function classroomDesks() {
  const desks = [];
  for (const y of [0.48, 0.65, 0.82]) {
    for (const x of [0.25, 0.5, 0.75]) desks.push({ kind: 'desk', at: { x, y }, w: 60, h: 26 });
  }
  return desks;
}

// Lavice otočené o 180° (tabule dole): řady blíž horní zdi, židle nad lavicí
function classroomDesksFlipped(rows = [0.24, 0.41, 0.58]) {
  const desks = [];
  for (const y of rows) {
    for (const x of [0.25, 0.5, 0.75]) desks.push({ kind: 'desk', at: { x, y }, w: 60, h: 26, flip: true });
  }
  return desks;
}

// Lavice pro učebnu s tabulí na boční zdi: sloupce lavic nastojato,
// face = kam se žáci dívají ('left' / 'right'), židle jsou na opačné straně
function classroomDesksSide(face, columns, rows, h = 60) {
  const desks = [];
  for (const x of columns) {
    for (const row of rows) {
      const [y, hh] = Array.isArray(row) ? row : [row, h];
      desks.push({ kind: 'desk', at: { x, y }, w: 26, h: hh, face });
    }
  }
  return desks;
}

// Zvonek ve vstupní chodbě (vlevo na zdi): mezerníkem / ťuknutím se zazvoní
// a ukáže se jedna z hlášek. Hlášky jsou zatím provizorní – nahradí se těmi od autora.
const BELL = {
  part: 'vstup',
  local: { x: 12, y: 220, w: 10, h: 18 },   // px od rohu vstupní chodby
  // zvonek do kanceláře – ozve se Vozábalová
  lines: [
    'Romane, přestaň na mě zvonit.',
  ],
};

// Parkoviště je oproti původní kresbě (640 × 480) zvětšené – i s auty
const PARKOVISTE_SCALE = 1.4;

// Nabídka bufetu (podle tabule u kantýny na fotce): id, název, cena v Kč
const BUFET_MENU = [
  { id: 'parek',      name: 'Párek v rohlíku',      price: 35 },
  { id: 'sekana',     name: 'Sekaná v housce',      price: 55 },
  { id: 'livance',    name: 'Americké lívance',     price: 50 },
  { id: 'toastSlan',  name: 'Toast se slaninou',    price: 35 },
  { id: 'toastSunka', name: 'Toast se šunkou',      price: 45 },
  { id: 'quesadilla', name: 'Quesadilla',           price: 45 },
  { id: 'caj',        name: 'Čaj ovocný / černý',   price: 30 },
  { id: 'kava',       name: 'Káva instantní',       price: 40, group: 'kava' },
];

// Nabídka kávovaru café+co v chodbě před schody; group 'kava' = počítá se jako káva do úkolu
const KAVOVAR_MENU = [
  { id: 'espresso',   name: 'Espresso',             price: 25, group: 'kava' },
  { id: 'kavaMleko',  name: 'Káva s mlékem',        price: 30, group: 'kava' },
  { id: 'cappuccino', name: 'Cappuccino',           price: 35, group: 'kava' },
  { id: 'latte',      name: 'Latte macchiato',      price: 40, group: 'kava' },
  { id: 'cokolada',   name: 'Horká čokoláda',       price: 30 },
  { id: 'cajCitron',  name: 'Čaj s citronem',       price: 20 },
];

// Zdi Céčka: bílé s vínovým soklem (podle fotky schodů do Céčka)
const CECKO_WALL = { top: '#f3f1ec', edge: '#9b3b4a', base: '#5a2430', outline: '#9a948a' };

const ROOMS = {
  // ---------------------------------------------------------------- venku
  venku: {
    name: 'Venkovní učebna',
    where: 've venkovní učebně',
    // podle fotky: dřevěná paluba se stoly a lavicemi a velkou černou tabulí
    // (natočená tabulí doleva), kolem záhony s mulčem, lampičkami a kameny,
    // dole uprostřed schody nahoru z ulice
    // (px v místnosti 640 × 520: paluba x 20–360, y 170–470; záhon do L kolem ní vpravo a dole
    //  x 20–390, y 170–500 – leží na spodním plotu; schody x 405–505, y 400–520 – naproti školníkovi)
    w: 640, h: 520,
    floorColor: '#c9c7c2',   // betonový chodník
    start: { x: 430, y: 240 }, // hra začíná na chodníku vedle učebny
    doors: [
      { side: 'top', at: 450 / 640, to: 'chodba' }, // hlavní vchod do budovy
      // dolů po schodech ven před školu (neviditelný průchod na konci schodů)
      { side: 'bottom', local: { x: 405, y: 500, w: 100, h: 20 }, to: 'ulice', hidden: true, spawnLocal: { x: 800, y: 484 } },
    ],
    obstacles: [
      // velká černá tabule vlevo na palubě
      { kind: 'board', at: { x: 36 / 640, y: 317 / 520 }, w: 14, h: 182, frame: '#2a2a2a', face: '#111316' },
      // dřevěné stoly s černýma nohama (nastojato, čelem k tabuli); mezi řadami ulička
      { kind: 'outtable', at: { x: 126 / 640, y: 244 / 520 }, w: 40, h: 86 },
      { kind: 'outtable', at: { x: 126 / 640, y: 391 / 520 }, w: 40, h: 86 },
      { kind: 'outtable', at: { x: 253 / 640, y: 244 / 520 }, w: 40, h: 86 },
      { kind: 'outtable', at: { x: 253 / 640, y: 391 / 520 }, w: 40, h: 86 },
      // dlouhé lavice kolem paluby (dřevo, černý rám)
      { kind: 'bench', at: { x: 350 / 640, y: 320 / 520 }, w: 16,  h: 254, frame: '#2b2b2b' }, // vpravo (dřív vpředu)
      { kind: 'bench', at: { x: 192 / 640, y: 450 / 520 }, w: 266, h: 16,  frame: '#2b2b2b' }, // dole
      { kind: 'bench', at: { x: 226 / 640, y: 185 / 520 }, w: 200, h: 16,  frame: '#2b2b2b' }, // nahoře
      // zábradlí u schodů dole
      { kind: 'railing', at: { x: 402 / 640, y: 450 / 520 }, w: 6, h: 100 },
      { kind: 'railing', at: { x: 508 / 640, y: 450 / 520 }, w: 6, h: 100 },
    ],
  },

  // ---------------------------------------------------------------- přízemí
  chodba: {
    name: 'Chodba za hlavním vchodem',
    where: 'na chodbě za hlavním vchodem',
    w: 760, h: 440,          // trochu užší
    floorColor: '#5b5e60',   // tmavé teracové dlaždice
    doors: [
      { side: 'right',  at: 0.8, to: 'kabinet3' },   // pod východní chodbou
      { side: 'bottom', at: 0.2, to: 'bufet' },      // bufet (A111 Kantýna) vlevo od vstupní chodby
    ],
    obstacles: [
      // levý horní kout patří k chodbě před schody – zdi mezi ním a Hlavní chodbou
      { kind: 'void', at: { x: 190 / 760, y: 70 / 440 },  w: 20,  h: 100, edges: ['left'] },
      { kind: 'void', at: { x: 100 / 760, y: 110 / 440 }, w: 200, h: 20,  edges: ['top'] },
      // (levá zeď hlavní chodby v koutě je průchod – kout navazuje na chodbu před schody vlevo)
      // řada mohutných bílých sloupů uprostřed chodby (uprostřed volný průchod)
      { kind: 'pillar', at: { x: 0.25, y: 0.58 }, w: 48, h: 48 },
      { kind: 'pillar', at: { x: 0.39, y: 0.58 }, w: 48, h: 48 },
      { kind: 'pillar', at: { x: 0.61, y: 0.58 }, w: 48, h: 48 },
      { kind: 'pillar', at: { x: 0.75, y: 0.58 }, w: 48, h: 48 },
      // modré židle u spodní zdi
      { kind: 'chair', at: { x: 0.86, y: 408 / 440 }, w: 22, h: 22 },
      { kind: 'chair', at: { x: 0.9,  y: 408 / 440 }, w: 22, h: 22 },
      { kind: 'chair', at: { x: 0.94, y: 408 / 440 }, w: 22, h: 22 },
    ],
  },
  zapad: {
    name: 'Západní chodba',
    where: 'v západní chodbě',
    // od hlavní chodby vede doleva, stáčí se nahoru (až nad chodbu před schody)
    // a nahoře na konci ještě kousek doleva
    // (díl 780 × 1140; svislé rameno je v pásu x 160–380, výběžek vlevo nahoře y 20–200,
    //  vodorovné rameno dole y 920–1120 – vpravo otevřené do hlavní chodby)
    w: 780, h: 1140,
    floorColor: '#5b5e60',
    doors: [
      { side: 'bottom', at: 236 / 780, to: 'a113' },   // spodní zeď v levém rohu vodorovného ramene
      { side: 'top',    at: 280 / 780, to: 'kabinet' }, // nahoře uprostřed svislého ramene
      // dveře ve vnitřních zdech (local = px od rohu dílu)
      { side: 'left',   local: { x: 160, y: 560, w: 20, h: 56 }, to: 'a114' },     // levá zeď svislého ramene
      { side: 'bottom', local: { x: 62,  y: 200, w: 56, h: 20 }, to: 'kabinet2' }, // spodní zeď výběžku
      { side: 'right',  local: { x: 380, y: 40,  w: 20, h: 56 }, to: 'wcKluci0' }, // nahoře vpravo, nad chodbou před schody
    ],
    obstacles: [
      // plné zdi mimo chodbu; edges = strany, podél kterých vede chodba
      // (vpravo od svislého ramene a nad vodorovným ramenem leží chodba před schody)
      { kind: 'void', at: { x: 90 / 780,  y: 670 / 1140 }, w: 180, h: 940, edges: ['top', 'right'] },
      { kind: 'void', at: { x: 580 / 780, y: 65 / 1140 },  w: 400, h: 130, edges: ['left'] },   // vpravo nahoře nad chodbou před schody
    ],
  },
  vychod: {
    name: 'Východní chodba',
    where: 've východní chodbě',
    // tvar L: od dveří z hlavní chodby vede doprava, na konci se stáčí nahoru;
    // vodorovné rameno má uvnitř 160 px (dolní zeď o dlaždici výš než dřív)
    w: 700, h: 440,
    floorColor: '#5b5e60',
    doors: [
      { side: 'bottom', at: 0.85, to: 'a107' },  // na spodní zdi v pravé části (vlevo otevřené do hlavní chodby)
    ],
    obstacles: [
      // horní kus obdélníku je plná zeď (ramena chodby mají uvnitř 200 px);
      // vlevo nahoře (x 0–140) je schodiště do patra
      { kind: 'void', at: { x: 310 / 700, y: 130 / 440 }, w: 340, h: 260, edges: ['right', 'bottom'] },
    ],
  },
  // Chodba před schody (podle fotky): vyplňuje celý prostor mezi západní a hlavní
  // chodbou (tvar L – vlevo sahá až nad vodorovné rameno západní chodby). Vlevo
  // pult a květiny, vzadu zeď s rámem průchodu na pravém kraji; nízká zídka se
  // sloupem začíná u levého kraje rámu a vede do půlky chodby. Za rámem předsíň
  // a schodiště – 1. rameno doprava, podesta, 2. rameno nahoru rovnou do prosklené
  // chodby (bez dveří). Díl 1080 × 800, souřadnice v px od jeho rohu:
  //   hala chodby  x 20–820, y 260–680; vlevo (x 20–380) až k y 780
  //   zadní zeď    y 240–260, rám průchodu x 680–820
  //   za rámem     předsíň x 680–820, y 20–240 (modré skříňky, mozaika)
  //   1. rameno    x 820–960, y 140–240 (stoupá doprava), podesta x 960–1060
  //   2. rameno    x 960–1060, y 20–140 (stoupá nahoru) → prosklená chodba
  //   vpravo dole (x 380–1080, y 680–800) leží hlavní chodba
  predSchody: {
    name: 'Chodba před schody',
    where: 'v chodbě před schody',
    w: 1080, h: 800,
    floorColor: '#e2b8a2',   // béžové a vínové dlaždice
    doors: [
      // kávovar u levé zdi: kdo do něj vejde, nakupuje (pohled zepředu)
      { side: 'left', local: { x: 80, y: 414, w: 6, h: 72 }, to: 'kavovar', hidden: true },
      // prostor za schody → dolní šatny
      { side: 'right', local: { x: 944, y: 34, w: 12, h: 76 }, to: 'satnyDole' },   // pod 2. ramenem, před zábradlím
    ],
    obstacles: [
      // vlevo za zadní zdí plná zeď; vpravo od haly chodby plná zeď až ke schodišti do patra
      { kind: 'void', at: { x: 340 / 1080, y: 130 / 800 }, w: 680, h: 260, edges: ['left', 'bottom', 'right'] },   // vlevo zeď k západní chodbě
      { kind: 'void', at: { x: 950 / 1080, y: 350 / 800 }, w: 260, h: 220, edges: ['left', 'top'] },
      { kind: 'void', at: { x: 880 / 1080, y: 520 / 800 }, w: 120, h: 120, edges: ['left', 'bottom'] },
      // za schody mezi rameny (x 820–957, y 20–137) prostor pod schodištěm, od ramen ho dělí zábradlí
      { kind: 'railing', at: { x: 890 / 1080, y: 140 / 800 }, w: 146, h: 6 },
      { kind: 'railing', at: { x: 960 / 1080, y: 80 / 800 },  w: 6,   h: 120 },   // od 2. ramene dělí zábradlí (ze schodů se ke dveřím nedostaneš)
      // modré skříňky v předsíni
      { kind: 'lockers', at: { x: 691 / 1080, y: 120 / 800 }, w: 22, h: 140, color: '#2f6fb0', face: 'right' },
      // prostor za schody (podle fotky): velké okno vpravo, modré sedačky s křeslem,
      // vitrína s poháry, betonový sloup
      // vlevo u zdi kávovar (dá se u něj nakupovat) a velké květiny
      { kind: 'coffeemachine', at: { x: 50 / 1080, y: 450 / 800 }, w: 60, h: 92 },
      { kind: 'plant',   at: { x: 49 / 1080,  y: 295 / 800 }, w: 30, h: 30 },
      { kind: 'plant',   at: { x: 40 / 1080,  y: 758 / 800 }, w: 30, h: 30 },
      { kind: 'plant',   at: { x: 630 / 1080, y: 300 / 800 }, w: 34, h: 34 },   // palma u zídky
      // společenská místnost (podle fotek): vitrína s poháry, modré sedačky
      // s konferenčními stolky, fotbálek, šachový stolek se sedacími vaky
      { kind: 'trophies',  at: { x: 100 / 1080, y: 271 / 800 }, w: 60, h: 22 },
      // modré sedačky do L v pravém dolním rohu, před nimi stolek
      { kind: 'chairrow',  at: { x: 466 / 1080, y: 766 / 800 }, w: 132, h: 24, face: 'up' },
      { kind: 'chairrow',  at: { x: 546 / 1080, y: 684 / 800 }, w: 24, h: 188, face: 'left' },
      { kind: 'lowtable',  at: { x: 476 / 1080, y: 690 / 800 }, w: 64, h: 34 },
      { kind: 'chairrow',  at: { x: 33 / 1080,  y: 655 / 800 }, w: 24, h: 154, face: 'right' },
      { kind: 'lowtable',  at: { x: 88 / 1080,  y: 655 / 800 }, w: 34, h: 64 },
      { kind: 'chesstable', at: { x: 210 / 1080, y: 738 / 800 }, w: 34, h: 34 },
      { kind: 'beanbag',   at: { x: 160 / 1080, y: 742 / 800 }, w: 30, h: 26 },
      { kind: 'beanbag',   at: { x: 262 / 1080, y: 740 / 800 }, w: 30, h: 26 },
      { kind: 'foosball',  at: { x: 330 / 1080, y: 470 / 800 }, w: 104, h: 58 },
      // u zadní zdi: automat na kávu, kiosek, skříňka s 3D tiskárnou, koše na tříděný odpad
      { kind: 'kiosk',     at: { x: 509 / 1080, y: 276 / 800 }, w: 42, h: 30 },
      { kind: 'showcase',  at: { x: 560 / 1080, y: 281 / 800 }, w: 40, h: 40 },
      { kind: 'bins',      at: { x: 597 / 1080, y: 270 / 800 }, w: 26, h: 16 },

      // nízká zídka s květinami: pod levým krajem rámu do půlky chodby, na konci sloup
      { kind: 'lowwall', at: { x: 671 / 1080, y: 324 / 800 }, w: 18, h: 128 },   // od zadní zdi přes první tři dlaždice
      { kind: 'pillar',  at: { x: 671 / 1080, y: 410 / 800 }, w: 44, h: 44 },
    ],
  },

  // ---------------------------------------------------------------- učebny
  a113: {
    name: 'A113',
    where: 'v A113',
    w: 520, h: 400,
    floorColor: '#c9a46c',
    doors: [
      { side: 'right', at: 0.5, to: 'chodba' },  // vpravo uprostřed (do západní chodby)
    ],
    obstacles: [],   // laboratoř stejná jako A114 (doplní se pod ROOMS)
  },
  // A114 – laboratoř (podle fotky): parkety do stromečku, vpředu bílé tabule a
  // katedra s umyvadlem, vlevo okna s radiátory a skříň; uprostřed dlouhý stůl
  // s umyvadly a na něj z obou stran napojené tři řady stolů; žluté židle se zeleným rámem
  a114: {
    name: 'A114',
    where: 'v A114',
    w: 520, h: 400,
    floorColor: '#b49a7c',
    doors: [
      { side: 'right', at: 0.5, to: 'chodba' },  // západní chodba
      { side: 'top', at: 0.85, to: 'kabinet2' },   // nahoře vpravo do Křiváčkova kabinetu
    ],
    obstacles: [
      { kind: 'labbench', at: { x: 260 / 520, y: 40 / 400 },  w: 200, h: 24, sinks: [0.88] },              // katedra
      { kind: 'wardrobe', at: { x: 36 / 520,  y: 53 / 400 },  w: 30, h: 54 },
      ...[120, 272].map((y) => ({ kind: 'radiator', at: { x: 27 / 520, y: y / 400 }, w: 10, h: 50, color: '#ece9e0', rib: '#c9c4b6', outline: '#a9a396' })),
      // uprostřed rovná dlouhá lavice s umyvadly, na ni z obou stran napojené řady se židlemi;
      // kolem všude ulička (vlevo i vpravo 78 px, mezi řadami 42 px)
      { kind: 'labbench', at: { x: 260 / 520, y: 196 / 400 }, w: 24, h: 192, sinks: [0.12, 0.5, 0.88] },
      ...[118, 196, 274].flatMap((y) => [173, 347].map((x) => ({ kind: 'labbench', at: { x: x / 520, y: y / 400 }, w: 150, h: 36, chairs: ['bottom'] }))),
    ],
  },
  a107: {
    name: 'A107',
    where: 'v A107',
    w: 520, h: 400,
    floorColor: '#c9a46c',
    doors: [
      { side: 'right', at: 0.19, to: 'chodba' },  // na pravé zdi nahoře (A107 oprava.jpg)
    ],
    // podle fotky A107 (focená ode dveří vpravo nahoře): jazyková učebna se sluchátky
    obstacles: [
    // stoly do U (A107 oprava.jpg): levé křídlo od katedry, spodní řada, pravé křídlo; židle zvenku
      { kind: 'langbench', at: { x: 48 / 520, y: 205 / 400 }, w: 36, h: 226, chairs: ['left'] },     // levé křídlo pod okny, navazuje na katedru
      { kind: 'langbench', at: { x: 243 / 520, y: 300 / 400 }, w: 354, h: 36, chairs: ['bottom'] },  // spodní řada mezi křídly
      { kind: 'langbench', at: { x: 438 / 520, y: 224 / 400 }, w: 36, h: 188, chairs: ['right'] },   // pravé křídlo (za ním se dá projít)
      { kind: 'langbench', at: { x: 94 / 520, y: 215 / 400 }, w: 56, h: 36, chairs: ['top'] },       // lavice pro dva u levého křídla
      { kind: 'pcdesk', at: { x: 100 / 520, y: 70 / 400 }, w: 84, h: 44, wall: 'top', chair: '#455a64' },   // katedra s počítačem
      { kind: 'sink', at: { x: 372 / 520, y: 36 / 400 }, w: 34, h: 28 },                            // umyvadlo u dveří
      { kind: 'trashbin', at: { x: 330 / 520, y: 34 / 400 }, w: 26, h: 24 },                        // koš na tříděný odpad
    ],
  },
  kabinet: {
    name: 'Kabinet',
    where: 'v kabinetě',
    w: 360, h: 300,
    floorColor: '#8a5c4c',   // koberec
    doors: [
      { side: 'bottom', at: 0.5, to: 'chodba' },  // západní chodba (nahoře)
    ],
    // Málův kabinet: stůl po celé pravé zdi se dvěma židlemi, okno nahoře, na levé zdi
    // stůl od shora do půlky, pod ním knihovna, vlevo dole kytara, druhá knihovna u spodní zdi
    obstacles: [
      { kind: 'desk',  at: { x: 320 / 360, y: 0.5 },      w: 40, h: 260, chairs: false },   // po celé pravé zdi
      { kind: 'chair', at: { x: 287 / 360, y: 0.33 },     w: 20, h: 20 },
      { kind: 'chair', at: { x: 287 / 360, y: 0.67 },     w: 20, h: 20 },
      { kind: 'desk',  at: { x: 40 / 360, y: 85 / 300 },  w: 40, h: 130, chairs: false },   // levá zeď shora do půlky
      { kind: 'shelf', at: { x: 30 / 360, y: 192 / 300 }, w: 20, h: 70 },                   // knihovna na levé zdi
      { kind: 'shelf', at: { x: 100 / 360, y: 270 / 300 }, w: 80, h: 20 },                  // knihovna u spodní zdi
      { kind: 'guitar', at: { x: 36 / 360, y: 254 / 300 }, w: 18, h: 46, color: '#8d5524', mala: true },   // Málova kytara vlevo dole
    ],
  },

  // Křiváčkův kabinet podle „kabinet křiváček.jpg“: vlevo vysoké rozšíření (kout vpravo nahoře
  // je plná zeď – void), dveře do chodby nahoře vpravo, dole vpravo dveře do A114, v rozšíření
  // velký stůl se dvěma počítači a dvěma židlemi, knihovna na pravé zdi
  kabinet2: {
    name: 'Kabinet 2',
    where: 'v kabinetu 2',
    w: 460, h: 420,
    floorColor: '#8a5c4c',
    doors: [
      { side: 'top', local: { x: 402 - 28, y: 160, w: 56, h: 20 }, to: 'chodba' },   // nahoře vpravo (původní místnost)
      { side: 'bottom', at: 0.87, to: 'a114' },                                     // dole vpravo do A114
    ],
    obstacles: [
      { kind: 'void', at: { x: 345.5 / 460, y: 90 / 420 }, w: 229, h: 180, edges: ['left', 'bottom'] },   // kout vpravo nahoře
      { kind: 'desk', at: { x: 55 / 460, y: 236 / 420 }, w: 66, h: 172, chairs: false },   // velký stůl v rozšíření
      { kind: 'monitor', at: { x: 38 / 460, y: 172 / 420 }, w: 16, h: 30 },
      { kind: 'monitor', at: { x: 38 / 460, y: 300 / 420 }, w: 16, h: 30 },
      { kind: 'chair', at: { x: 55 / 460, y: 128 / 420 }, w: 22, h: 22 },
      { kind: 'chair', at: { x: 55 / 460, y: 344 / 420 }, w: 22, h: 22 },
      { kind: 'shelf', at: { x: 430 / 460, y: 279 / 420 }, w: 20, h: 130 },   // knihovna na pravé zdi
    ],
  },
  kabinet3: {
    name: 'Kabinet 3',
    where: 'v kabinetu 3',
    w: 320, h: 260,
    floorColor: '#8a5c4c',
    doors: [
      { side: 'left', at: 0.5, to: 'chodba' },  // z hlavní chodby, pod východní chodbou
    ],
    obstacles: [
      { kind: 'shelf', at: { x: 0.92, y: 0.5 },  w: 20, h: 140 },
      { kind: 'desk',  at: { x: 0.5,  y: 0.35 }, w: 80, h: 40 },
    ],
  },

  // ---------------------------------------------------------------- nová budova
  satny: {
    name: 'Šatny',
    where: 'v šatnách',
    w: 560, h: 420,
    floorColor: '#d9d9d5',   // světlé dlaždice
    doors: [
      { side: 'bottom', at: 0.15, to: 'chodba' },        // prosklená chodba (část haly) – vlevo na spodní zdi
      { side: 'top',    at: 0.27, to: 'satny2' },      // vlevo nahoře k druhým schodům
    ],
    obstacles: [
      // zelené skříňky podél zdí (face = kam směřují dvířka)
      { kind: 'lockers', at: { x: 320 / 560, y: 389 / 420 }, w: 360, h: 22, color: '#2f7a46', face: 'up' },   // podél spodní zdi
      { kind: 'lockers', at: { x: 0.73,  y: 0.074 }, w: 200, h: 22, color: '#2f7a46', face: 'down' },
      { kind: 'lockers', at: { x: 0.055, y: 0.5 },   w: 22, h: 260, color: '#2f7a46', face: 'right' },
      { kind: 'lockers', at: { x: 0.945, y: 0.5 },   w: 22, h: 260, color: '#2f7a46', face: 'left' },
      // žlutý blok skříněk uprostřed (zády k sobě)
      { kind: 'lockers', at: { x: 0.36, y: 0.5 }, w: 150, h: 40, color: '#e8c21c', face: 'both' },
      { kind: 'lockers', at: { x: 0.36 + 150 / 560, y: 0.5 }, w: 150, h: 40, color: '#e8c21c', face: 'both' }, // druhý blok hned vedle
      // dřevěná lavička se zeleným rámem
      { kind: 'bench', at: { x: 0.7, y: 0.62 }, w: 90, h: 24 },
    ],
  },
  // Druhé schody k šatnám (podle fotky, focené od dveří ze šaten): vlevo schody
  // dolů se zábradlím, vpravo chodbička se skříňkami, vzadu velké okno s lavičkou.
  satny2: {
    name: 'Druhé schody k šatnám',
    where: 'u druhých schodů k šatnám',
    w: 380, h: 440,
    floorColor: '#d9d9d5',
    doors: [
      { side: 'right', at: 0.86, to: 'satny' },   // vpravo dole
      // konec schodů dolů → Šatny 3 (přijde se dole pod jejich schody – schody už jsou sejité)
      { side: 'top', local: { x: 20, y: 123, w: 150, h: 8 }, to: 'satny3', hidden: true, spawnLocal: { x: 340, y: 355 } },
    ],
    obstacles: [
      // schody dolů do Šaten 3 (podle fotky): z podlahy vlevo dole pár schodů doleva,
      // podesta a schody zatočí doprava – dlouhé rameno dolů podél levé zdi;
      // od chodbičky je dělí zábradlí
      { kind: 'railing', at: { x: 173 / 380, y: 230 / 440 }, w: 6, h: 220 },
      { kind: 'railing', at: { x: 205 / 380, y: 337 / 440 }, w: 76, h: 6 },
      { kind: 'railing', at: { x: 96 / 380,  y: 120 / 440 }, w: 158, h: 6 },
      // skříňky: vpravo podél zdi (posunuté nahoru) a vzadu vlevo vedle okna
      // na pravé zdi: barvy se střídají po dvířkách – modrá, žlutá, zelená a dokola
      { kind: 'lockers', at: { x: 349 / 380, y: 165 / 440 }, w: 22, h: 250, color: '#2f6fb0', colors: ['#2f6fb0', '#e8c21c', '#2f7a46'], face: 'left' },
      { kind: 'lockers', at: { x: 31 / 380,  y: 67 / 440 },  w: 22, h: 90, color: '#2f6fb0', face: 'right' },
      // lavička pod oknem
      { kind: 'bench', at: { x: 262 / 380, y: 50 / 440 }, w: 110, h: 20 },
    ],
  },
  telocvicna: {
    name: 'Tělocvična',
    where: 'v tělocvičně',
    w: 680, h: 480,
    floorColor: '#c99a5e',   // dubové parkety
    doors: [
      // spodní zeď, zleva doprava (dveře se vyhýbají žebřinám a tyči na síť uprostřed)
      { side: 'bottom', at: 0.1,  to: 'satnaKluci' },
      { side: 'bottom', at: 0.62, to: 'satnaHolky' },
      { side: 'bottom', at: 0.88, to: 'chodba' },
    ],
    obstacles: [
      // žebřiny u spodní zdi
      { kind: 'wallbars', at: { x: 0.22, y: 0.944 }, w: 120, h: 14 },
      { kind: 'wallbars', at: { x: 0.4,  y: 0.944 }, w: 120, h: 14 },
      // modré tyče na síť
      { kind: 'pole', at: { x: 0.5, y: 0.06 }, w: 12, h: 12 },
      { kind: 'pole', at: { x: 0.5, y: 0.94 }, w: 12, h: 12 },
    ],
  },
  prosklena: {
    name: 'Spojovačka',
    where: 'na spojovačce',
    w: 240, h: 520,          // svislá, vede od schodů nahoru
    floorColor: '#dfb39d',   // béžové dlaždice s vínovými
    doors: [
      { side: 'right',  at: 0.85, to: 'satny' },      // hned na začátku vpravo
    ],
    obstacles: [
      // zábradlí podél oken (levá zeď) a bílé radiátory
      { kind: 'railing', at: { x: 0.096, y: 0.5 }, w: 6, h: 480 },
      { kind: 'radiator', at: { x: 0.133, y: 0.35 }, w: 10, h: 60, color: '#eef0f1', rib: '#c9cdd0', outline: '#a3a8ac' },
      { kind: 'radiator', at: { x: 0.133, y: 0.55 }, w: 10, h: 60, color: '#eef0f1', rib: '#c9cdd0', outline: '#a3a8ac' },
      { kind: 'radiator', at: { x: 0.133, y: 0.75 }, w: 10, h: 60, color: '#eef0f1', rib: '#c9cdd0', outline: '#a3a8ac' },
    ],
  },
  // šatny u tělocvičny – zatím jen podlaha a lavičky; dveře do tělocvičny nahoře, do haly vpravo
  satnaKluci: {
    name: 'Klučičí šatna',
    where: 'v klučičí šatně',
    w: 320, h: 260,
    floorColor: '#dadad6',
    doors: [
      { side: 'left',  at: 0.2, to: 'telocvicna' }, // levá zeď nahoře, nad lavičkou
      { side: 'right', at: 0.5, to: 'chodba' },
    ],
    obstacles: [
      { kind: 'bench', at: { x: 0.12, y: 0.62 }, w: 20,  h: 110 }, // pod dveřmi do tělocvičny
      { kind: 'bench', at: { x: 0.5,  y: 0.85 }, w: 140, h: 20 },
    ],
  },
  satnaHolky: {
    name: 'Holčičí šatna',
    where: 'v holčičí šatně',
    w: 320, h: 260,
    floorColor: '#dadad6',
    doors: [
      { side: 'left',  at: 0.2, to: 'telocvicna' }, // levá zeď nahoře, nad lavičkou
      { side: 'right', at: 0.5, to: 'chodba' },
    ],
    obstacles: [
      { kind: 'bench', at: { x: 0.12, y: 0.62 }, w: 20,  h: 110 }, // pod dveřmi do tělocvičny
      { kind: 'bench', at: { x: 0.5,  y: 0.85 }, w: 140, h: 20 },
    ],
  },
  hala: {
    name: 'Hala s pingpongem',
    where: 'v hale s pingpongem',
    w: 360, h: 420,          // užší a delší
    floorColor: '#e2b8a2',   // béžové a vínové dlaždice jako v prosklené chodbě
    doors: [
      { side: 'right',  at: 320 / 420, to: 'cecko' }, // vpravo dole, 80 px nad rohem
      { side: 'top',    at: 0.5, to: 'kabinet6' },     // nahoře uprostřed
      // levá zeď, odshora dolů
      { side: 'left', at: 0.2, to: 'telocvicna' },
      { side: 'left', at: 0.5, to: 'satnaHolky' },
      { side: 'left', at: 0.8, to: 'satnaKluci' },
    ],
    obstacles: [
      // dva stoly nastojato, jeden za druhým
      { kind: 'pingpong', at: { x: 0.5, y: 0.3 },  w: 54, h: 96 },
      { kind: 'pingpong', at: { x: 0.5, y: 0.66 }, w: 54, h: 96 },
    ],
  },
  // Bufet (A111 Kantýna) – pohled zepředu (front + shop): pultík v pootevřených dveřích,
  // za ním paní z bufetu a regály; vlevo tabule s nabídkou. Šipkami se vybírá, mezerníkem kupuje.
  bufet: {
    name: 'Bufet',
    where: 'v bufetu',
    w: 800, h: 528,
    front: true,
    shop: true,
    floorColor: '#c9c7c2',
    doors: [
      { side: 'bottom', local: { x: 380, y: 508, w: 40, h: 20 }, to: 'chodba', hidden: true },   // odchod zpět do chodby
    ],
  },
  // Kávovar café+co (chodba před schody) – pohled zepředu, nakupuje se jako v bufetu
  kavovar: {
    name: 'Kávovar',
    where: 'u kávovaru',
    w: 800, h: 528,
    front: true,
    shop: true,
    floorColor: '#e2b8a2',
    doors: [
      { side: 'bottom', local: { x: 380, y: 508, w: 40, h: 20 }, to: 'chodba', hidden: true },   // zpět do chodby
    ],
  },
  // Před školou – pohled zepředu (front: true): budova školy, plot a brána, chodník.
  // Hráč chodí po chodníku doleva/doprava; u brány šipka nahoru / ťuknutí = vejde
  // (krátká animace) a je ve venkovní učebně nahoře na schodech.
  ulice: {
    name: 'Před školou',
    where: 'před školou',
    w: 1600, h: 528,
    front: true,
    floorColor: '#c9c7c2',
    start: { x: 520, y: 484 },
    doors: [
      { side: 'top', local: { x: 760, y: 420, w: 80, h: 20 }, to: 'venku', spawnLocal: { x: 455, y: 462 } },   // brána
    ],
  },
  // Vchod do Céčka (podle fotky): dole vstup z haly naproti schodům, schody
  // nahoru, nahoře rovnou chodba 1. patra – vše jedna místnost (780 × 500)
  //   před schody:  x 120–366, y 400–480 (vstup ve spodní zdi naproti schodům)
  //   schody:       x 120–240, y 140–400 (podesta 260–290)
  //   vedle schodů: rameno do 2. patra x 246–366, y 140–400 (stoupá dolů); na jeho konci
  //                 neviditelný průchod do 2. patra, pod ním zeď k přízemí
  //   1. patro:     chodba y 20–140 až k x 760; vlevo od schodů zeď (y 80–140) s dveřmi do C101,
  //                 nad ní průchod doleva (y 20–80) a na levé zdi Kabinet 4; nahoře východ na
  //                 parkoviště, WC kluci a WC holky; dole C109; na konci vpravo Kabinet 5
  cecko: {
    name: 'Vchod do Céčka',
    where: 've vchodu do Céčka',
    w: 780, h: 500,          // chodba v patře pokračuje doprava (x 400–760)
    floorColor: '#e2b8a2',
    doors: [
      { side: 'bottom', at: 180 / 780, to: 'chodba' },   // naproti schodům
      // konec ramene do 2. patra (neviditelný průchod) – nahoře se hráč objeví na podestě 2. patra
      { side: 'bottom', local: { x: 246, y: 400, w: 120, h: 20 }, to: 'cecko2', hidden: true, spawnLocal: { x: 306, y: 262 } },
      // nahoře hned vlevo od schodů zeď s dveřmi do C101 (ve vnitřní zdi – local)
      { side: 'left', local: { x: 100, y: 82, w: 20, h: 56 }, to: 'c101' },
      // za zdí průchod doleva a na levé zdi Kabinet 4
      { side: 'left', at: 50 / 500, to: 'kabinet4' },
      // horní zeď: východ na parkoviště (mezi bývalými okny), WC kluci a vedle WC holky
      { side: 'top', at: 210 / 780, to: 'parkoviste', style: 'glass' },
      { side: 'top', at: 520 / 780, to: 'wcKluci' },
      { side: 'top', at: 620 / 780, to: 'wcHolky' },
      // dole v prodloužení C109 (naproti WC kluci), na konci vpravo Kabinet 5
      { side: 'bottom', local: { x: 492, y: 140, w: 56, h: 20 }, to: 'c109' },
      { side: 'right', at: 80 / 500, to: 'kabinet5' },
    ],
    obstacles: [
      // plné zdi (vínový sokl jako na fotce)
      // vlevo od schodů až dolů a nahoře ještě 60 px (1½ dlaždice) nad schody – v ní dveře do C101;
      // nad ní zůstává 60 px průchod doleva ke Kabinetu 4
      { kind: 'void', at: { x: 60 / 780,  y: 290 / 500 }, w: 120, h: 420, edges: ['top', 'right'], wall: CECKO_WALL },
      { kind: 'void', at: { x: 306 / 780, y: 410 / 500 }, w: 120, h: 20,  edges: ['top', 'bottom'], wall: CECKO_WALL }, // zeď mezi koncem ramene do 2. patra a přízemím
      { kind: 'void', at: { x: 573 / 780, y: 320 / 500 }, w: 414, h: 360, edges: ['top', 'left'], wall: CECKO_WALL },   // vpravo od schodů a pod prodlouženou chodbou
      // tmavé zábradlí po celé délce schodů – z dlažby na schody se nedá
      // tmavé zábradlí mezi oběma rameny – z jednoho na druhé se nedá
      { kind: 'railing', at: { x: 243 / 780, y: 270 / 500 }, w: 6, h: 260, color: '#3b3330', handrail: '#241d1a' },
    ],
  },
  // Céčko – 2. patro (420 × 528, px):
  //   rameno z 1. patra x 246–366, y 20–240 (sestupuje nahoru; nahoře průchod dolů)
  //   rameno do 3. patra x 120–240, y 20–240 (nahoře průchod do 3. patra)
  //   podesta y 240–280, 4 schody dolů y 280–320, hala x 20–400, y 320–508
  //   (od konce schodů protažená doleva); C202 uprostřed spodní zdi, C203 na levé zdi
  cecko2: {
    name: 'Céčko – 2. patro',
    where: 've 2. patře Céčka',
    w: 420, h: 528,
    floorColor: '#e2b8a2',
    doors: [
      { side: 'top', local: { x: 246, y: 0, w: 120, h: 20 }, to: 'cecko', hidden: true, spawnLocal: { x: 306, y: 108 } }, // sejde dolů → chodba 1. patra u začátku ramene
      { side: 'top', local: { x: 120, y: 0, w: 120, h: 20 }, to: 'cecko3', hidden: true, spawnLocal: { x: 180, y: 108 } }, // vyjde nahoru → chodba 3. patra u konce ramene
      { side: 'bottom', at: 0.5,       to: 'c202' },   // uprostřed spodní zdi
      { side: 'left',   at: 414 / 528, to: 'c203' },   // naproti místu, kde byla dřív (pravá zeď)
    ],
    obstacles: [
      { kind: 'void', at: { x: 60 / 420,  y: 160 / 528 }, w: 120, h: 320, edges: ['right', 'bottom'], wall: CECKO_WALL }, // vlevo od schodů jen nad halou
      { kind: 'void', at: { x: 393 / 420, y: 160 / 528 }, w: 54,  h: 320, edges: ['left', 'bottom'], wall: CECKO_WALL },
      { kind: 'railing', at: { x: 243 / 420, y: 130 / 528 }, w: 6, h: 220, color: '#3b3330', handrail: '#241d1a' },
    ],
  },
  c202: {
    name: 'C202',
    where: 'v C202',
    w: 600, h: 400,          // širší – vlevo je pás pro bicí a klávesy
    floorColor: '#c9a46c',
    // otočená o 180°: tabule a katedra dole; v každé řadě lavice pro čtyři,
    // ulička a zase pro čtyři; vlevo nahoře bicí, pod nimi klávesy nastojato
    doors: [
      { side: 'top', at: 0.5, to: 'cecko2' },   // hala je nad učebnou – vchod uprostřed horní zdi
    ],
    obstacles: [
      ...[0.24, 0.41, 0.58].flatMap((y) => [245 / 600, 445 / 600].map((x) => ({ kind: 'desk', at: { x, y }, w: 120, h: 26, flip: true }))),
      { kind: 'drums',    at: { x: 58 / 600, y: 60 / 400 },  w: 58, h: 56 },     // bicí vlevo nahoře
      { kind: 'keyboard', at: { x: 46 / 600, y: 160 / 400 }, w: 26, h: 90 },     // klávesy pootočené, pod bicími
      { kind: 'guitar',   at: { x: 0.56, y: 0.84 }, w: 18, h: 46, color: '#c0392b' },
      { kind: 'guitar',   at: { x: 0.62, y: 0.84 }, w: 18, h: 46, color: '#d4a055' },
      { kind: 'desk', at: { x: 0.8, y: 0.8 }, w: 70, h: 30, chairs: false },    // katedra vpravo dole (u tabule)
    ],
  },
  c203: {
    name: 'C203',
    where: 'v C203',
    w: 520, h: 460,          // vyšší, ať se dveře vejdou na pravou zeď nad tabuli
    floorColor: '#c9a46c',
    // otočená o 90° doprava: tabule na pravé zdi, žáci se dívají doprava;
    // v každé řadě po stranách lavice pro dva, uprostřed dvojitá pro čtyři
    doors: [
      { side: 'right', at: 62 / 460, to: 'cecko2' },   // vchod na pravé zdi nahoře (nad tabulí)
    ],
    obstacles: [
      ...classroomDesksSide('right', [0.16, 0.31, 0.46, 0.61], [[0.2, 56], [0.5, 112], [0.8, 56]]),
      { kind: 'desk', at: { x: 0.85, y: 0.78 }, w: 30, h: 70, chairs: false },   // katedra vpravo dole u tabule
    ],
  },
  c101: {
    name: 'C101',
    where: 'v C101',
    w: 520, h: 400,
    floorColor: '#c9a46c',
    doors: [
      { side: 'right', at: 0.2, to: 'cecko' },   // z chodby v 1. patře Céčka, vpravo nahoře
    ],
    obstacles: [
      ...classroomDesks(),
      // přední řada lavic, ať jsou všechny řady stejné
      ...[0.25, 0.5, 0.75].map((x) => ({ kind: 'desk', at: { x, y: 0.31 }, w: 60, h: 26 })),
      { kind: 'desk', at: { x: 0.16, y: 0.13 }, w: 70, h: 30, chairs: false },   // katedra vlevo nahoře (jen stůl)
    ],
  },
  kabinet6: {
    name: 'Kabinet 6',
    where: 'v kabinetu 6',
    w: 320, h: 260,
    floorColor: '#8a5c4c',
    doors: [
      { side: 'bottom', at: 0.5, to: 'chodba' },   // nad halou s pingpongem
    ],
    obstacles: [
      { kind: 'shelf', at: { x: 0.5, y: 0.1 },  w: 150, h: 20 },
      { kind: 'desk',  at: { x: 0.7, y: 0.55 }, w: 80,  h: 40 },
    ],
  },
  c109: {
    name: 'C109',
    where: 'v C109',
    w: 520, h: 400,
    floorColor: '#c9a46c',
    // otočená o 90° doleva: tabule na levé zdi, žáci se dívají doleva, katedra vlevo dole
    doors: [
      { side: 'top', at: 0.15, to: 'cecko' },   // chodba je nad učebnou – vchod vlevo nahoře
    ],
    obstacles: [
      ...classroomDesksSide('left', [0.36, 0.52, 0.68, 0.84], [0.3, 0.52, 0.74]),
      { kind: 'desk', at: { x: 0.13, y: 0.76 }, w: 30, h: 70, chairs: false },   // katedra vlevo dole
    ],
  },
  wcKluci: {
    name: 'WC kluci',
    where: 'na WC kluci',
    w: 360, h: 300,
    floorColor: '#dfe3e6',
    doors: [
      { side: 'bottom', at: 0.5, to: 'cecko' },
    ],
    obstacles: [
      ...[0.2, 0.4, 0.6].map((x) => ({ kind: 'stall', at: { x, y: 55 / 300 }, w: 62, h: 70, door: '#4a7fc0' })),
      { kind: 'sink', at: { x: 0.09, y: 0.5 },  w: 24, h: 30 },
      { kind: 'sink', at: { x: 0.09, y: 0.68 }, w: 24, h: 30 },
    ],
  },
  wcKluci0: {
    name: 'WC kluci',
    where: 'na WC kluci v přízemí',
    w: 360, h: 300,
    floorColor: '#dfe3e6',
    doors: [
      { side: 'left', at: 0.83, to: 'chodba' },   // ze západní chodby, dole na levé zdi (záchody u mály .jpg)
    ],
    // podle „záchody u mály .jpg“: kabinky u levé zdi (dvířka doprava), pod nimi zeď, za ní dveře;
    // umyvadla u spodní zdi vpravo
    obstacles: [
      ...[50, 112, 174].map((y) => ({ kind: 'stall', at: { x: 55 / 360, y: y / 300 }, w: 70, h: 62, door: '#4a7fc0', facing: 'right' })),
      { kind: 'wcwall', at: { x: 62 / 360, y: 211 / 300 }, w: 84, h: 12 },   // zeď mezi kabinkami a dveřmi
      ...[60, 110, 160].map((y) => ({ kind: 'urinal', at: { x: 328 / 360, y: y / 300 }, w: 20, h: 26 })),   // mušle na pravé zdi
      { kind: 'sink', at: { x: 255 / 360, y: 268 / 300 }, w: 30, h: 24, wall: 'bottom' },
      { kind: 'sink', at: { x: 305 / 360, y: 268 / 300 }, w: 30, h: 24, wall: 'bottom' },
    ],
  },
  wcHolky: {
    name: 'WC holky',
    where: 'na WC holky',
    w: 360, h: 300,
    floorColor: '#e6e0e3',
    doors: [
      { side: 'bottom', at: 0.5, to: 'cecko' },
    ],
    obstacles: [
      ...[0.2, 0.4, 0.6, 0.8].map((x) => ({ kind: 'stall', at: { x, y: 55 / 300 }, w: 62, h: 70, door: '#c25b86' })),
      { kind: 'sink', at: { x: 0.09, y: 0.5 },  w: 24, h: 30 },
      { kind: 'sink', at: { x: 0.09, y: 0.68 }, w: 24, h: 30 },
    ],
  },
  kabinet5: {
    name: 'Kabinet 5',
    where: 'v kabinetu 5',
    w: 320, h: 260,
    floorColor: '#8a5c4c',
    doors: [
      { side: 'left', at: 0.5, to: 'cecko' },   // na konci chodby v 1. patře Céčka
    ],
    obstacles: [
      { kind: 'shelf', at: { x: 0.92, y: 0.5 },  w: 20, h: 140 },
      { kind: 'desk',  at: { x: 0.5,  y: 0.35 }, w: 80, h: 40 },
    ],
  },
  // Parkoviště za Céčkem – zatím vymyšlené: asfalt, bílé čáry, auta, stromy
  // Parkoviště u Céčka (podle fotek parkoviště.jpg a parkoviště 2, přepočteno shora).
  // Vpravo dole stojí budova: bílá s červenou taškou (nahoře) a nižší žlutá přístavba
  // s plochou střechou (dole). Z Céčka se vyjde nahoru na úzkou cestu mezi budovou
  // a plotem do ulice a jde se doleva podél budovy; za rohem budovy se plocha otevře
  // dolů – tam je parkoviště: řada aut čelem k budově, mezi nimi a budovou pruh trávy.
  // Vlevo nahoře budka (garáž) s vraty doprava, na horní zdi vlevo výjezd do ulice,
  // dole a vlevo kamenná zídka s drátěným plotem, za ní ulice z kostek.
  // Celé je zvětšené PARKOVISTE_SCALE× (i auta) – rozměry níže jsou v původním měřítku 640 × 480,
  // kresba (ROOM_ART.parkoviste) se zvětšuje stejně.
  parkoviste: {
    name: 'Parkoviště',
    where: 'na parkovišti',
    w: Math.round(640 * PARKOVISTE_SCALE), h: Math.round(480 * PARKOVISTE_SCALE),
    start: { x: 560 * PARKOVISTE_SCALE, y: 70 * PARKOVISTE_SCALE },   // bez dveří (načtená hra) se začne na cestě před dveřmi
    floorColor: '#8a8781',
    doors: [
      // dveře do Céčka v horní stěně budovy, na úzké cestě
      { side: 'bottom', local: { x: Math.round(560 * PARKOVISTE_SCALE) - 28, y: Math.round(110 * PARKOVISTE_SCALE), w: 56, h: 20 }, to: 'cecko', style: 'glass' },
    ],
    obstacles: [
      // budova (bílá + žlutá přístavba) – pevný blok vpravo dole
      { kind: 'void', at: { x: 470 / 640, y: 295 / 480 }, w: 340, h: 370, edges: [], solid: true,
        wall: { top: '#ede6d4', edge: '#cfc6b2', base: '#8d8a84' } },
      // řada aut čelem k budově (doprava), jedno stání dole volné; gumy u nich propichuje minihra s Davidem
      ...[['#a83a2e', 180], ['#b9bec2', 230], ['#2f5f9e', 280], ['#2b2f36', 330], ['#8e3a30', 380]].map(([color, y]) =>
        ({ kind: 'car', at: { x: 225 / 640, y: y / 480 }, w: 70, h: 38, color })),
      // budka (garáž) vlevo nahoře, vrata doprava
      { kind: 'garage', at: { x: 65 / 640, y: 85 / 480 }, w: 90, h: 130, face: 'right' },
      // nízké keře u zídky
      { kind: 'bush', at: { x: 36 / 640,  y: 260 / 480 }, w: 22, h: 30 },
      { kind: 'bush', at: { x: 36 / 640,  y: 380 / 480 }, w: 22, h: 28 },
      { kind: 'bush', at: { x: 100 / 640, y: 444 / 480 }, w: 32, h: 22 },
    ].map((o) => ({ ...o, w: Math.round(o.w * PARKOVISTE_SCALE), h: Math.round(o.h * PARKOVISTE_SCALE) })),
  },
  kabinet4: {
    name: 'Kabinet 4',
    where: 'v kabinetu 4',
    w: 320, h: 260,
    floorColor: '#8a5c4c',
    doors: [
      { side: 'right', at: 0.5, to: 'cecko' },  // z chodby v 1. patře Céčka (vlevo nahoře)
    ],
    obstacles: [
      { kind: 'shelf', at: { x: 0.5, y: 0.1 },  w: 150, h: 20 },
      { kind: 'desk',  at: { x: 0.4, y: 0.6 },  w: 80,  h: 40 },
    ],
  },
};

// ---------------------------------------------------------------- Céčko – 3. patro
// Stejné jako chodba v 1. patře (bez východu na parkoviště): rameno ze 2. patra
// x 120–240, y 140–400 (dole průchod zpátky), C301 místo C101, C308 místo C109,
// WC kluci a WC holky, Kabinet 7 (vlevo) a Kabinet 8 (vpravo na konci).
Object.assign(ROOMS, {
  cecko3: {
    name: 'Céčko – 3. patro',
    where: 've 3. patře Céčka',
    w: 780, h: 500,
    floorColor: '#e2b8a2',
    doors: [
      { side: 'bottom', local: { x: 120, y: 400, w: 120, h: 20 }, to: 'cecko2', hidden: true, spawnLocal: { x: 180, y: 262 } }, // dolů po schodech
      { side: 'left', local: { x: 100, y: 82, w: 20, h: 56 }, to: 'c301' },
      { side: 'left', at: 50 / 500, to: 'kabinet7' },
      { side: 'top', at: 520 / 780, to: 'wcKluci3' },
      { side: 'top', at: 620 / 780, to: 'wcHolky3' },
      { side: 'bottom', local: { x: 492, y: 140, w: 56, h: 20 }, to: 'c308' },
      { side: 'right', at: 80 / 500, to: 'kabinet8' },
    ],
    obstacles: [
      { kind: 'void', at: { x: 60 / 780,  y: 290 / 500 }, w: 120, h: 420, edges: ['top', 'right'], wall: CECKO_WALL },  // vlevo od schodů, nahoře zeď s C301
      { kind: 'void', at: { x: 510 / 780, y: 320 / 500 }, w: 540, h: 360, edges: ['top', 'left'], wall: CECKO_WALL },  // vpravo od schodů a pod chodbou
      { kind: 'void', at: { x: 180 / 780, y: 450 / 500 }, w: 160, h: 100, edges: ['top'], wall: CECKO_WALL },          // pod koncem ramene (přetře i boční zdi pod ním)
    ],
  },
  c301: {
    ...ROOMS.c101, name: 'C301', where: 'v C301',
    doors: [{ side: 'right', at: 0.2, to: 'cecko3' }],
  },
  c308: {
    ...ROOMS.c109, name: 'C308', where: 'v C308',
    doors: [{ side: 'top', at: 0.15, to: 'cecko3' }],
  },
  wcKluci3: {
    ...ROOMS.wcKluci, where: 'na WC kluci ve 3. patře',
    doors: [{ side: 'bottom', at: 0.5, to: 'cecko3' }],
  },
  wcHolky3: {
    ...ROOMS.wcHolky, where: 'na WC holky ve 3. patře',
    doors: [{ side: 'bottom', at: 0.5, to: 'cecko3' }],
  },
  kabinet7: {
    ...ROOMS.kabinet4, name: 'Kabinet 7', where: 'v kabinetu 7',
    doors: [{ side: 'right', at: 0.5, to: 'cecko3' }],
  },
  kabinet8: {
    ...ROOMS.kabinet5, name: 'Kabinet 8', where: 'v kabinetu 8',
    doors: [{ side: 'left', at: 0.5, to: 'cecko3' }],
  },
});

// ---------------------------------------------------------------- budova A: schodiště do 1. patra
// Podle fotky „schody do patra“: světlé kamenné schody kolem zrcadla, bílé
// schodnice, černé kované zábradlí s dřevěným madlem, podesty z teraca.
// Díl 320 × 340 v pravém horním rohu hlavní chodby, vedle chodby před schody
// (mezi nimi jen zeď). Tři rovná ramena za sebou – nahoru, doleva a dolů:
//   1. rameno    x 200–300, y 120–320 (nahoru, začíná u hlavní chodby na úrovni
//                horní zdi východní chodby) → podesta x 200–300, y 20–120
//   2. rameno    x 120–200, y 20–120 (doleva) → podesta x 20–120, y 20–120
//   3. rameno    x 20–120,  y 120–320 (dolů) → končí dole na úrovni chodby v 1. patře
//   zrcadlo      x 120–200, y 120–320 (zábradlí po obou stranách)
// V přízemí se jde 1. ramenem nahoru, 2. doleva a 3. dolů (pořád do schodů) – do
// 1. patra se přejde až na konci 3. ramene. Zespodu (z hlavní chodby) na 3. rameno
// nejde, kolem je zábradlí; do zrcadla mezi rameny se dá vejít zdola.
// V 1. patře se ze středu chodby vchází na 3. rameno a jde se po něm nahoru (= dolů
// ze schodů); do přízemí se přejde až na jeho konci u horní podesty.
const SCHODY_A = {
  name: 'Schodiště do patra',
  where: 'na schodišti do patra',
  w: 320, h: 340,
  floorColor: '#5b5e60',
  doors: [
    // konec 3. ramene → 1. patro (chodba hned pod koncem schodů)
    { side: 'bottom', local: { x: 26, y: 304, w: 91, h: 8 }, to: 'patroA', hidden: true, spawnLocal: { x: 1390, y: 1740 } },
  ],
  obstacles: [
    // zábradlí na hraně podest a kolem ramen; do zrcadla mezi rameny se dá vejít zdola
    { kind: 'ironrail', at: { x: 161 / 320, y: 120 / 340 }, w: 84, h: 6 },    // nad zrcadlem (3. rameno je volné)
    { kind: 'ironrail', at: { x: 200 / 320, y: 220 / 340 }, w: 6,  h: 200 },   // podél 1. ramene
    { kind: 'ironrail', at: { x: 120 / 320, y: 220 / 340 }, w: 6,  h: 200 },   // podél 3. ramene (k zrcadlu)
    { kind: 'ironrail', at: { x: 23 / 320,  y: 220 / 340 }, w: 6,  h: 200 },   // podél 3. ramene (zleva)
    { kind: 'ironrail', at: { x: 70 / 320,  y: 317 / 340 }, w: 100, h: 6 },   // pod koncem 3. ramene
  ],
};
// V 1. patře: 3. rameno (vlevo) vede dolů do přízemí, 1. a 2. rameno (vpravo a nahoře)
// vedou nahoru do 2. patra – na horní podestě vlevo se přejde do 2. patra.
const SCHODY_A1 = {
  name: 'Schodiště',
  where: 'na schodišti v 1. patře',
  w: 320, h: 340,
  floorColor: '#5b5e60',
  doors: [
    // konec 3. ramene (u horní podesty) → přízemí, na horní podestu (dál se jde 2. a 1. ramenem dolů)
    { side: 'top', local: { x: 20, y: 123, w: 97, h: 8 }, to: 'chodba', hidden: true, spawnLocal: { x: 1390, y: 1420 } },
    // nahoru: 1. rameno, 2. rameno doleva, horní podesta → 2. patro (pod konec jeho 3. ramene)
    { side: 'left', local: { x: 20, y: 22, w: 8, h: 94 }, to: 'patroA2', hidden: true, spawnLocal: { x: 1390, y: 1740 } },
  ],
  obstacles: [
    { kind: 'void', at: { x: 160 / 320, y: 217 / 340 }, w: 80, h: 194, edges: [] },   // zrcadlo – pohled dolů
    { kind: 'ironrail', at: { x: 160 / 320, y: 317 / 340 }, w: 86, h: 6 },   // pod zrcadlem (u chodby)
    { kind: 'ironrail', at: { x: 120 / 320, y: 220 / 340 }, w: 6,  h: 200 },
    { kind: 'ironrail', at: { x: 200 / 320, y: 220 / 340 }, w: 6,  h: 200 },
    { kind: 'ironrail', at: { x: 160 / 320, y: 120 / 340 }, w: 86, h: 6 },
    { kind: 'ironrail', at: { x: 70 / 320,  y: 120 / 340 }, w: 100, h: 6 },   // horní podesta ↔ 3. rameno dolů
  ],
};
// Ve 2. patře: jen 3. rameno dolů do 1. patra (1. a 2. rameno jsou pod úrovní patra)
const SCHODY_A2 = {
  name: 'Schodiště',
  where: 'na schodišti ve 2. patře',
  w: 320, h: 340,
  floorColor: '#5b5e60',
  doors: [
    // konec 3. ramene → 1. patro, na horní podestu (dál se jde 2. a 1. ramenem dolů)
    { side: 'top', local: { x: 20, y: 123, w: 97, h: 8 }, to: 'patroA', hidden: true, spawnLocal: { x: 1390, y: 1430 } },
  ],
  obstacles: [
    { kind: 'void', at: { x: 210 / 320, y: 167 / 340 }, w: 180, h: 294, edges: [] },
    { kind: 'void', at: { x: 70 / 320,  y: 70 / 340 },  w: 100, h: 100, edges: [] },
    { kind: 'ironrail', at: { x: 210 / 320, y: 317 / 340 }, w: 186, h: 6 },
    { kind: 'ironrail', at: { x: 120 / 320, y: 220 / 340 }, w: 6,   h: 200 },
    { kind: 'ironrail', at: { x: 70 / 320,  y: 120 / 340 }, w: 100, h: 6 },
  ],
};

// ---------------------------------------------------------------- kanceláře a kabinety v 1. patře A
// Předsíň: vchod nahoře vpravo (z chodby), hned vedle na pravé zdi tiskárna, na levé
// zdi uprostřed kabinet A214, na dolní zdi uprostřed kabinet A215.
// Kancelář školy (dveře z chodby nahoře) je vlevo napojená na ředitelnu.
// Kabinet A216 je na konci chodby vpravo, sborovna nad východním křídlem.
// Čísla kabinetů jsou zatím odhad – uživatel je může přejmenovat.
ROOMS.predsinKabinetu = {
  name: 'Předsíň kabinetů',
  where: 'v předsíni kabinetů',
  w: 300, h: 240,
  floorColor: '#8a5c4c',
  doors: [
    { side: 'top',    at: 0.8, to: 'patroA' },
    { side: 'left',   at: 0.5, to: 'kabinetA214' },
    { side: 'bottom', at: 0.5, to: 'kabinetA215' },
  ],
  obstacles: [
    { kind: 'printer', at: { x: 266 / 300, y: 110 / 240 }, w: 28, h: 46 },   // tiskárna (k ní se pak něco vymyslí)
    { kind: 'plant',   at: { x: 44 / 300,  y: 46 / 240 },  w: 28, h: 28 },
  ],
};
const kabinetNabytek = (deskX) => [
  { kind: 'shelf', at: { x: 0.45, y: 30 / 260 }, w: 150, h: 20 },
  { kind: 'desk',  at: { x: deskX, y: 0.58 },    w: 80,  h: 40 },
];
ROOMS.kabinetA214 = {
  name: 'Kabinet A214', where: 'v kabinetu A214',
  w: 300, h: 260, floorColor: '#8a5c4c',
  doors: [{ side: 'right', at: 0.5, to: 'predsinKabinetu' }],
  obstacles: [...kabinetNabytek(0.4), { kind: 'shelf', at: { x: 30 / 300, y: 0.55 }, w: 20, h: 120 }],
};
ROOMS.kabinetA215 = {
  name: 'Kabinet A215', where: 'v kabinetu A215',
  w: 300, h: 260, floorColor: '#8a5c4c',
  doors: [{ side: 'top', at: 0.5, to: 'predsinKabinetu' }],
  obstacles: [
    { kind: 'shelf', at: { x: 0.5, y: 230 / 260 }, w: 150, h: 20 },
    { kind: 'pcdesk', at: { x: 0.25, y: 0.5 },     w: 84,  h: 44, wall: 'top', chair: '#455a64' },   // Soumarův počítač s recepty (21_pivo.js)
    { kind: 'shelf', at: { x: 270 / 300, y: 0.5 }, w: 20,  h: 120 },
  ],
};
ROOMS.kabinetA216 = {
  name: 'Kabinet A216', where: 'v kabinetu A216',
  w: 300, h: 260, floorColor: '#8a5c4c',
  doors: [{ side: 'left', at: 0.5, to: 'patroA' }],
  obstacles: [...kabinetNabytek(0.65), { kind: 'shelf', at: { x: 270 / 300, y: 0.55 }, w: 20, h: 120 }],
};
ROOMS.kancelar = {
  name: 'Kancelář školy', where: 'v kanceláři',
  w: 360, h: 280, floorColor: '#8a5c4c',
  doors: [
    { side: 'top',  at: 0.5, to: 'patroA' },
    { side: 'left', at: 0.5, to: 'reditelna' },
  ],
  obstacles: [
    { kind: 'desk',    at: { x: 0.35, y: 0.62 }, w: 80, h: 40 },
    { kind: 'desk',    at: { x: 0.72, y: 0.62 }, w: 80, h: 40 },
    { kind: 'shelf',   at: { x: 0.8,  y: 30 / 280 }, w: 120, h: 20 },
    { kind: 'printer', at: { x: 326 / 360, y: 0.5 }, w: 28, h: 46 },
  ],
};
ROOMS.reditelna = {
  name: 'Ředitelna', where: 'v ředitelně',
  w: 340, h: 280, floorColor: '#7a3e3a',
  doors: [{ side: 'right', at: 0.5, to: 'kancelar' }],
  obstacles: [
    { kind: 'desk',  at: { x: 0.42, y: 0.45 }, w: 110, h: 50 },
    { kind: 'shelf', at: { x: 30 / 340, y: 0.5 }, w: 20, h: 150 },
    { kind: 'plant', at: { x: 300 / 340, y: 44 / 280 }, w: 30, h: 30 },
    { kind: 'lowtable', at: { x: 0.45, y: 230 / 280 }, w: 90, h: 30 },
  ],
};
// Sborovna (podle fotky SBOROVNA 2): šedý kobercový čtverec, tři okna na protější (pravé)
// zdi, stoly do U otevřeného ke dveřím s modrými židlemi, v rohu tiskárna, u dveří
// dva kulaté stolky, dřevěná skříň nahoře vlevo; vchod dole vlevo, druhé (zavřené) dveře na levé zdi
const SBOROVNA_STUL = { top: '#dca66a', edge: '#9a6a3a', chair: '#6aa6dc', chairBack: '#3f78ad', chairEdge: '#24486a' };
ROOMS.sborovna = {
  name: 'Sborovna', where: 've sborovně',
  w: 520, h: 360, floorColor: '#b8bec4',
  doors: [{ side: 'bottom', at: 0.15, to: 'patroA' }],   // dole vlevo
  obstacles: [
    // velký stůl otočený o 90° doleva (tvar ∩, otevřený dolů)
    { kind: 'labbench', at: { x: 334 / 520, y: 94 / 360 },  w: 212, h: 68, chairs: ['top', 'bottom'], look: SBOROVNA_STUL },
    { kind: 'labbench', at: { x: 244 / 520, y: 214 / 360 }, w: 60, h: 172, chairs: ['left', 'right'], look: SBOROVNA_STUL },
    { kind: 'labbench', at: { x: 424 / 520, y: 214 / 360 }, w: 60, h: 172, chairs: ['left', 'right'], look: SBOROVNA_STUL },
    { kind: 'printer',  at: { x: 482 / 520, y: 50 / 360 },  w: 26, h: 30 },   // v pravém horním rohu
    { kind: 'roundtable', at: { x: 120 / 520, y: 84 / 360 },  w: 56, h: 56 },
    { kind: 'roundtable', at: { x: 150 / 520, y: 318 / 360 }, w: 56, h: 56 },
    { kind: 'wardrobe', at: { x: 38 / 520, y: 92 / 360 }, w: 30, h: 70 },   // nahoře u levé zdi
  ],
};

// ---------------------------------------------------------------- budova A: 2. patro
// Stejné jako 1. patro. Naproti schodům aula se dvěma vchody (druhý tam, kde je
// v 1. patře předsíň kabinetů). Třídy: A309 (místo A210), A310 (A211), A311 (A212),
// kabinet A312 (místo A213, číslo je odhad), A305 vpravo dole v rohu, A302 vpravo
// nahoře u východního křídla a mezi nimi kabinet A302 (na konci chodby vpravo).
ROOMS.patroA2 = {
  name: 'Chodba ve 2. patře',
  where: 'na chodbě ve 2. patře',
  w: 2200, h: 1920,
  floorColor: '#5b5e60',
  parts: [
    {
      id: 'zapadP2', art: 'zapadP', offset: { x: 280, y: 1160 },
      name: 'Západní chodba ve 2. patře', w: 200, h: 540, floorColor: '#5b5e60',
      doors: [
        { side: 'left', at: 0.5,      to: 'a310' },
        { side: 'left', at: 80 / 540, to: 'a311' },
        { side: 'top',  at: 0.5,      to: 'kabinetA312' },
      ],
      obstacles: [],
    },
    {
      id: 'vychodP2', art: 'vychodP', offset: { x: 1880, y: 1340 },
      name: 'Východní chodba ve 2. patře', w: 200, h: 360, floorColor: '#5b5e60',
      doors: [{ side: 'right', at: 0.3, to: 'a302' }],
      obstacles: [],
    },
    {
      id: 'hlavniP2', art: 'hlavniP', offset: { x: 280, y: 1680 },
      name: 'Chodba ve 2. patře', w: 1800, h: 200, floorColor: '#5b5e60',
      doors: [
        { side: 'bottom', at: 1110 / 1800, to: 'aula' },   // naproti schodům
        // druhý vchod do auly (jako předsíň kabinetů o patro níž) – místa příchodu ručně, ať nevedou k prvnímu vchodu
        { side: 'bottom', at: 1410 / 1800, to: 'aula', spawnLocal: { x: 660, y: 48 } },
        { side: 'bottom', at: 70 / 1800,   to: 'a309' },   // dole vlevo v rohu chodby
        { side: 'bottom', at: 1664 / 1800, to: 'a305' },
        { side: 'right',  at: 0.5,         to: 'kabinetA302' },
      ],
      obstacles: [
        ...[260, 440, 620, 800, 980, 1420, 1560].map((x) => ({ kind: 'pillar', at: { x: x / 1800, y: 35 / 200 }, w: 30, h: 30 })),
        ...[350, 530, 710, 890, 1490].map((x) => ({ kind: 'plant', at: { x: x / 1800, y: 33 / 200 }, w: 24, h: 24 })),
      ],
    },
    { id: 'schodyPatro2', art: 'schodyPatro2', offset: { x: 1320, y: 1360 }, ...SCHODY_A2 },
  ],
  openings: [
    { x: 300,  y: 1680, w: 160, h: 20, fill: ['old', 'old'] },
    { x: 1900, y: 1680, w: 160, h: 20, fill: ['old', 'old'] },
    { x: 1340, y: 1680, w: 280, h: 20, fill: ['old', 'old'] },
  ],
};
// Aula (podle fotky): parkety do stromečku, vlevo jeviště s červenou oponou, řady fialových
// židlí čelem k jevišti, okna na dolní zdi, dva vchody nahoře
ROOMS.aula = {
  name: 'Aula', where: 'v aule',
  w: 900, h: 440, floorColor: '#b07a44',
  doors: [
    { side: 'top', at: 360 / 900, to: 'patroA2' },
    { side: 'top', at: 660 / 900, to: 'patroA2', spawnLocal: { x: 1690, y: 1832 } },   // ke druhému vchodu
  ],
  obstacles: [
    { kind: 'stage', at: { x: 80 / 900, y: 220 / 440 }, w: 120, h: 320 },
    { kind: 'piano', at: { x: 182 / 900, y: 92 / 440 }, w: 44, h: 54 },
    { kind: 'aulachairs', at: { x: 520 / 900, y: 145 / 440 }, w: 560, h: 110 },
    { kind: 'aulachairs', at: { x: 520 / 900, y: 295 / 440 }, w: 560, h: 110 },
  ],
};
ROOMS.kabinetA312 = {
  name: 'Kabinet A312', where: 'v kabinetu A312',
  w: 360, h: 300, floorColor: '#8a5c4c',
  doors: [{ side: 'bottom', at: 0.5, to: 'patroA2' }],
  obstacles: [
    { kind: 'shelf', at: { x: 0.3,   y: 0.1 },  w: 150, h: 20 },
    { kind: 'shelf', at: { x: 0.917, y: 0.45 }, w: 20,  h: 120 },
    { kind: 'desk',  at: { x: 0.72,  y: 0.55 }, w: 80,  h: 40 },
  ],
};
ROOMS.kabinetA302 = {
  name: 'Kabinet A302', where: 'v kabinetu A302',
  w: 300, h: 260, floorColor: '#8a5c4c',
  doors: [{ side: 'left', at: 0.5, to: 'patroA2' }],
  obstacles: [
    { kind: 'shelf', at: { x: 0.45, y: 30 / 260 }, w: 150, h: 20 },
    { kind: 'desk',  at: { x: 0.65, y: 0.58 },     w: 80,  h: 40 },
    { kind: 'shelf', at: { x: 270 / 300, y: 0.55 }, w: 20, h: 120 },
  ],
};

// A113 je stejná laboratoř jako A114
ROOMS.a113.obstacles = ROOMS.a114.obstacles.map((o) => ({ ...o }));

// ---------------------------------------------------------------- třídy v 1. patře budovy A
// A209 naproti schodům a A210 vlevo na konci (dveře na horní zdi do chodby),
// A211 a A212 vlevo od západního ramene (dveře na pravé zdi), kabinet A213 nad ním
// A209 a A210 – počítačové učebny (podle fotky A209): dveře nahoře vpravo, tabule
// na levé zdi, okna nahoře; počítače na stolech do spojeného U (vpravo spojka),
// odsunutých od zdí, aby se za nimi dalo projít; U je otevřené k tabuli. Uprostřed
// lavice čelem k tabuli – u oken (nahoře) po dvou, dole po jedné
// (oranžové židle jsou z vnější strany U, monitory míří dovnitř)
for (const [id, door] of [
  ['a209', { side: 'top',   at: 0.85, to: 'patroA' }],
  ['a210', { side: 'top',   at: 0.08, to: 'patroA' }],   // vlevo nahoře (z rohu chodby dole vlevo)
]) {
  const name = id.toUpperCase();
  ROOMS[id] = {
    name, where: 'v ' + name,
    w: 600, h: 460,
    floorColor: '#c9a46c',
    doors: [door],
    obstacles: [
      { kind: 'pcdesk', at: { x: 308 / 600, y: 101 / 460 }, w: 316, h: 54,  wall: 'bottom', chair: '#e0892a' },
      { kind: 'pcdesk', at: { x: 493 / 600, y: 230 / 460 }, w: 54,  h: 312, wall: 'left',   chair: '#e0892a' },
      { kind: 'pcdesk', at: { x: 308 / 600, y: 359 / 460 }, w: 316, h: 54,  wall: 'top',    chair: '#e0892a' },
      ...classroomDesksSide('left', [220 / 600, 310 / 600, 400 / 600], [[175 / 460, 60], [285 / 460, 30]]),
      { kind: 'desk', at: { x: 75 / 600, y: 230 / 460 }, w: 40, h: 80, chairs: false },   // katedra u tabule
    ],
  };
}
for (const [id, door] of [
  ['a211', { side: 'right', at: 0.5, to: 'patroA' }],
  ['a212', { side: 'right', at: 0.5, to: 'patroA' }],
  // 2. patro
  ['a309', { side: 'top',   at: 0.85, to: 'patroA2' }],   // místo A210, dveře nahoře vpravo
  ['a310', { side: 'right', at: 0.2,  to: 'patroA2' }],   // místo A211, vpředu vpravo (vedle katedry)
  ['a311', { side: 'bottom', at: 0.4, to: 'patroA2' }],   // místo A212; dveře dole vlevo od tabule (oprava A311.jpg)
  ['a305', { side: 'left',  at: 0.85, to: 'patroA2' }],   // vpravo dole v rohu (místo kanceláře), vchod vlevo dole
  ['a302', { side: 'right', at: 0.15, to: 'patroA2' }],   // vpravo nahoře u východního křídla (místo sborovny), vchod vpravo nahoře
]) {
  const name = id.toUpperCase();
  ROOMS[id] = {
    name, where: 'v ' + name,
    w: 520, h: 400,
    floorColor: '#c9a46c',
    doors: [door],
    obstacles: [...classroomDesks(), { kind: 'desk', at: { x: door.at > 0.5 ? 0.25 : 0.75, y: 0.22 }, w: 70, h: 30 }],
  };
}
// --- třídy 2. patra podle fotek (fotky/A309 … A311, A302, A305)
const DREVO_ORANZ = { top: '#c8955a', edge: '#8a5a2e', chair: '#e0a63a', chairBack: '#b98128', chairEdge: '#1f1f1f' };
const LAB_BILA = { top: '#efefea', edge: '#b9b9b0', chair: '#c8955a', chairBack: '#9a6a3a', chairEdge: '#5a3a22' };
// A309: stoly do U – spojka vpravo (židle z vnější strany), ramena vodorovně, otevřené
// doleva k zelené tabuli; vlevo zelená tabule a umyvadlo, okna vpravo, bez katedry
ROOMS.a309.obstacles = [
  { kind: 'labbench', at: { x: 230 / 520, y: 115 / 400 }, w: 260, h: 50,  chairs: ['top'],    look: DREVO_ORANZ },
  { kind: 'labbench', at: { x: 230 / 520, y: 305 / 400 }, w: 260, h: 50,  chairs: ['bottom'], look: DREVO_ORANZ },
  { kind: 'labbench', at: { x: 340 / 520, y: 210 / 400 }, w: 40,  h: 140, chairs: ['right'],  look: DREVO_ORANZ },
  { kind: 'sink', at: { x: 42 / 520, y: 355 / 400 }, w: 36, h: 30 },
];
// A310: stupňovitá učebna – od levé i pravé zdi 4 řady po 4 lavicích, uprostřed široká
// ulička; každá řada o schod výš (stupně kreslí ROOM_ART.a310). Před tabulí velká katedra
// na šířku tabule, dá se obejít kolem dokola; vlevo vpředu skříň
const A310_ROWS = [150, 210, 270, 330];
ROOMS.a310.obstacles = [
  ...A310_ROWS.flatMap((y) => [40, 80, 120, 160, 360, 400, 440, 480].map((x) => (
    { kind: 'desk', at: { x: x / 520, y: y / 400 }, w: 40, h: 40 }))),
  { kind: 'desk', at: { x: 260 / 520, y: 76 / 400 }, w: 180, h: 34, chairs: false },   // katedra
  { kind: 'wardrobe', at: { x: 36 / 520, y: 60 / 400 }, w: 30, h: 60 },
];
// A311: laboratoř – dva bílé stoly s umyvadlem od levé zdi (pravá půlka je volná), u pravé zdi
// dřevěné skříňky, tabule dole vpravo, dveře dole vlevo od ní, bez katedry (oprava A311.jpg)
ROOMS.a311.obstacles = [
  { kind: 'labbench', at: { x: 142 / 520, y: 130 / 400 }, w: 245, h: 40, chairs: ['bottom'], sinks: [0.55], look: LAB_BILA },
  { kind: 'labbench', at: { x: 142 / 520, y: 250 / 400 }, w: 245, h: 40, chairs: ['bottom'], sinks: [0.55], look: LAB_BILA },
  { kind: 'shelf', at: { x: 480 / 520, y: 95 / 400 },  w: 20, h: 110 },
  { kind: 'shelf', at: { x: 480 / 520, y: 305 / 400 }, w: 20, h: 110 },
];
// A302: počítače v řadách čelem k tabuli (nahoře), tyrkysové židle; každá řada jde od zdi ke zdi,
// uprostřed ulička – vlevo po třech, vpravo po dvou; vpředu vlevo učitelský počítač
ROOMS.a302.obstacles = [
  ...[120, 210, 300].flatMap((y) => [
    { kind: 'pcdesk', at: { x: 110 / 520, y: y / 400 }, w: 180, h: 54, wall: 'top', chair: '#3fb7b0' },   // vlevo 3
    { kind: 'pcdesk', at: { x: 440 / 520, y: y / 400 }, w: 120, h: 54, wall: 'top', chair: '#3fb7b0' },   // vpravo 2
  ]),
  { kind: 'pcdesk', at: { x: 60 / 520, y: 55 / 400 }, w: 80, h: 54, wall: 'top', chair: '#3fb7b0' },     // učitel
];
// A305: moderní třída – tyrkysová zeď vpředu (dole), velká obrazovka vlevo, okna vpravo,
// světlé lavice s tyrkysovými židlemi čelem k tyrkysové zdi, katedra s počítačem vpravo vpředu
ROOMS.a305.obstacles = [
  ...classroomDesksFlipped().map((d) => ({ ...d, chair: '#29b6c8' })),
  { kind: 'desk', at: { x: 430 / 520, y: 335 / 400 }, w: 70, h: 30, chairs: false },
];

ROOMS.kabinetA213 = {
  name: 'Kabinet A213',
  where: 'v kabinetu A213',
  w: 360, h: 300,
  floorColor: '#8a5c4c',
  doors: [{ side: 'bottom', at: 0.5, to: 'patroA' }],
  obstacles: [
    { kind: 'shelf', at: { x: 0.3,   y: 0.1 },  w: 150, h: 20 },
    { kind: 'shelf', at: { x: 0.917, y: 0.45 }, w: 20,  h: 120 },
    { kind: 'desk',  at: { x: 0.72,  y: 0.55 }, w: 80,  h: 40 },
  ],
};

// ---------------------------------------------------------------- dolní šatny
// Kresba jako šatny o patro výš. Vchod dole vlevo (z prostoru za schody v chodbě
// před schody), skříňky podél zdí (rohy volné), uprostřed blok skříněk zády k sobě
// a nad ním hnědá lavička; vpravo nahoře dveře do Šaten 3 (chodbička se schody).
ROOMS.satnyDole = {
  ...ROOMS.satny,
  name: 'Dolní šatny',
  where: 'v dolních šatnách',
  doors: [
    { side: 'bottom', at: 0.15, to: 'chodba' },     // prostor za schody (chodba před schody)
    { side: 'top',    at: 0.85, to: 'satny3' },     // Šatny 3
  ],
  obstacles: [
    { kind: 'lockers', at: { x: 31 / 560,  y: 210 / 420 }, w: 22, h: 300, color: '#e8c21c', face: 'right' },   // vlevo (bez rohů)
    { kind: 'lockers', at: { x: 319 / 560, y: 389 / 420 }, w: 398, h: 22, color: '#2f6fb0', face: 'up' },     // dole, vpravo od vchodu
    { kind: 'lockers', at: { x: 210 / 560, y: 31 / 420 },  w: 300, h: 22, color: '#2f7a46', face: 'down' },   // nahoře, kus před dveřmi končí
    { kind: 'lockers', at: { x: 529 / 560, y: 210 / 420 }, w: 22, h: 336, color: '#2f6fb0', face: 'left' },   // vpravo
    // uprostřed blok skříněk zády k sobě, nad ním hnědá lavička
    { kind: 'lockers', at: { x: 280 / 560, y: 210 / 420 }, w: 276, h: 44, color: '#e8c21c', face: 'both' },
    { kind: 'bench',   at: { x: 264 / 560, y: 118 / 420 }, w: 160, h: 22, frame: '#5a3a22' },
  ],
};

// ---------------------------------------------------------------- Šatny 3 (podle fotky „šatny 3“)
// Chodbička u šaten: vlevo dole dřevěné dveře do Dolních šaten, před nimi šedá
// rohož, na levé zdi modré a žluté skříňky. Červené schody: zdola vpravo nahoru,
// nahoře zatočí doleva (podesta v pravém horním rohu) a pokračují doleva podél
// horní zdi – vedou k druhým schodům k šatnám. Od chodbičky je dělí zábradlí.
ROOMS.satny3 = {
  name: 'Šatny 3',
  where: 'v Šatnách 3',
  w: 420, h: 400,
  floorColor: '#e6e6e2',
  doors: [
    { side: 'left', at: 0.84, to: 'satnyDole' },
    // levý konec horního ramene → druhé schody k šatnám (přijde se nahoře vedle schodů)
    { side: 'left', local: { x: 156, y: 22, w: 8, h: 76 }, to: 'satny2', hidden: true, spawnLocal: { x: 275, y: 385 } },   // přijde se nahoře na podlahu
  ],
  obstacles: [
    // skříňky na levé zdi (pod koncem horního ramene)
    { kind: 'lockers', at: { x: 31 / 420, y: 160 / 400 }, w: 22, h: 100, color: '#2f9bd6', face: 'right' },
    { kind: 'lockers', at: { x: 31 / 420, y: 245 / 400 }, w: 22, h: 70,  color: '#f0cf1c', face: 'right' },
    // zábradlí: pod horním ramenem, na jeho konci a podél spodního ramene (dole se na schody vchází)
    { kind: 'railing', at: { x: 217 / 420, y: 103 / 400 }, w: 122, h: 6 },
    { kind: 'railing', at: { x: 153 / 420, y: 61 / 400 },  w: 6, h: 84 },
    { kind: 'railing', at: { x: 274 / 420, y: 213 / 400 }, w: 6, h: 214 },
  ],
};

// ---------------------------------------------------------------- spojené chodby v přízemí
// Hlavní, Západní a Východní chodba, Chodba před schody, Prosklená chodba a hala
// s pingpongem jsou jedna velká místnost (2200 × 2020) bez dveří mezi sebou –
// obraz za hráčem jezdí (kamera). Každý díl má vlastní tvar, dveře, nábytek
// i kresbu; openings = otevřené průchody ve společných zdech.
// Díly se kreslí v pořadí – hlavní chodba poslední, ať její zdi nepřekryjí sousedé.
{
  const zapad = ROOMS.zapad, vychod = ROOMS.vychod, hlavni = ROOMS.chodba, predSchody = ROOMS.predSchody;
  const hala = ROOMS.hala, prosklena = ROOMS.prosklena;
  for (const id of ['zapad', 'vychod', 'predSchody', 'hala', 'prosklena']) delete ROOMS[id];
  // nahoře hala (x 1160–1520), pod ní prosklená chodba, do které zdola ústí schody
  // z chodby před schody; pod ní hlavní chodba se západní a východní
  ROOMS.chodba = {
    name: hlavni.name,
    where: hlavni.where,
    w: 2200, h: 2380,
    floorColor: hlavni.floorColor,
    parts: [
      { id: 'prosklena',  art: 'prosklena',  offset: { x: 1220, y: 400 },  ...prosklena },
      { id: 'hala',       art: 'hala',       offset: { x: 1160, y: 0 },    ...hala },
      { id: 'zapad',      art: 'zapad',      offset: { x: 0,    y: 780 },  ...zapad },
      { id: 'vychod',     art: 'vychod',     offset: { x: 1500, y: 1440 }, ...vychod },
      { id: 'predSchody', art: 'predSchody', offset: { x: 380,  y: 900 },  ...predSchody },
      // horní kus hlavní chodby až ke schodišti: chodba před schody začíná teprve nad ním (y 1460)
      { id: 'hlavniTop',  art: 'hlavniTop',  offset: { x: 940,  y: 1460 }, name: hlavni.name, w: 380, h: 140, floorColor: hlavni.floorColor, doors: [], obstacles: [] },
      { id: 'hlavni',     art: 'chodba',     offset: { x: 760,  y: 1580 }, ...hlavni },
      { id: 'schodyA',    art: 'schodyA',    offset: { x: 1320, y: 1360 }, ...SCHODY_A },   // přes pravý horní roh hlavní chodby
      // vstupní chodba od hlavního vchodu: dole dveře ven, nahoře schody do Hlavní chodby
      {
        id: 'vstup', art: 'vstup', offset: { x: 1070, y: 2000 },
        name: 'Vstupní chodba', w: 140, h: 380, floorColor: hlavni.floorColor,
        doors: [{ side: 'bottom', at: 0.5, to: 'venku' }],
        obstacles: [],
      },
    ],
    // díly se překrývají – tam se zdi spodního dílu nepočítají:
    // chodba před schody přes pravou část západní chodby, hlavní chodba přes pravý dolní roh chodby před schody
    wallCuts: [
      { x: 400, y: 1160, w: 360, h: 420 },   // zdi západní chodby pod chodbou před schody
      { x: 760, y: 1160, w: 20,  h: 300 },   // … i její pravá zeď, ale jen nad hlavní chodbou (od y 1460 je to její levá zeď)
      { x: 760, y: 1460, w: 20,  h: 120 },   // levá zeď hlavní chodby nad koutem – kout patří chodbě před schody
      { x: 780, y: 1600, w: 540, h: 100 },
      { x: 1440, y: 1380, w: 20, h: 300 },   // pravá zeď chodby před schody uvnitř schodiště
      { x: 1340, y: 1580, w: 160, h: 20 },   // horní zeď hlavní chodby uvnitř schodiště
      { x: 1500, y: 1440, w: 20, h: 240 },   // pravá zeď hlavní / levá východní chodby uvnitř schodiště
      { x: 1520, y: 1440, w: 100, h: 20 },   // horní zeď východní chodby uvnitř schodiště
    ],
    // otevřené průchody ve společných zdech; fill = podlaha v průchodu (nahoře/vlevo, dole/vpravo)
    openings: [
      { x: 1240, y: 400,  w: 200, h: 20,  fill: ['new', 'new'] },  // prosklená chodba ústí do haly v celé šířce
      { x: 1340, y: 900,  w: 100, h: 20,  fill: ['new', 'new'] },   // schody nahoru → prosklená chodba
      { x: 760,  y: 1700, w: 20,  h: 200, fill: ['old', 'old'] },   // hlavní ↔ západní (vodorovné rameno)
      { x: 1500, y: 1700, w: 20,  h: 160, fill: ['old', 'old'] },   // hlavní ↔ východní
      { x: 1520, y: 1680, w: 100, h: 20,  fill: ['old', 'old'] },   // východní chodba → 1. rameno schodiště do patra
      { x: 1340, y: 1680, w: 180, h: 20,  fill: ['old', 'old'] },   // hlavní chodba → pod schody a do zrcadla
      { x: 1300, y: 1480, w: 40,  h: 220, fill: ['old', 'old'] },   // horní kus hlavní chodby → pod schody
      { x: 960,  y: 1580, w: 340, h: 20,  fill: ['old', 'old'] },   // horní kus ↔ hlavní chodba
      { x: 1080, y: 1460, w: 120, h: 20,  fill: ['new', 'old'] },   // hlavní chodba ↔ chodba před schody (pravý kraj)
      { x: 1090, y: 2000, w: 100, h: 20,  fill: ['old', 'old'] },   // hlavní chodba ↔ vstupní chodba
      { x: 760,  y: 1580, w: 180, h: 94,  fill: ['new', 'new'] },   // kout chodby před schody (přes roh hlavní chodby)
    ],
  };
}

// ---------------------------------------------------------------- budova A: chodba v 1. patře
// Podle fotky „chodba v patře“: stejná podlaha jako v přízemí, klenby s lampami,
// arkády se sloupy, květinami a kovaným zábradlím, dřevěné dveře do tříd (zatím
// zavřené). Tvarem připomíná přízemí, jen je užší (uvnitř 160 px) a kratší:
//   chodba     x 280–2080, y 1680–1880 (nad ní schodiště x 1320–1640)
//   vlevo      rameno nahoru x 280–480, y 1160–1700
//   vpravo     rameno nahoru x 1880–2080, y 1340–1700 (vpravo nahoře sborovna)
// Souřadnice jsou stejné jako ve spojené chodbě v přízemí – schodiště leží přesně nad tím dole.
ROOMS.patroA = {
  name: 'Chodba v patře',
  where: 'na chodbě v 1. patře',
  w: 2200, h: 1920,
  floorColor: '#5b5e60',
  parts: [
    {
      id: 'zapadP', art: 'zapadP', offset: { x: 280, y: 1160 },
      name: 'Západní chodba v patře', w: 200, h: 540, floorColor: '#5b5e60',
      doors: [
        { side: 'left', at: 0.5,       to: 'a211' },     // v půlce vlevo
        { side: 'left', at: 80 / 540,  to: 'a212' },     // na konci vlevo
        { side: 'top',  at: 0.5,       to: 'kabinetA213' },   // vedle A212 na horní zdi
      ],
      obstacles: [],
    },
    {
      id: 'vychodP', art: 'vychodP', offset: { x: 1880, y: 1340 },
      name: 'Východní chodba v patře', w: 200, h: 360, floorColor: '#5b5e60',
      doors: [{ side: 'right', at: 0.3, to: 'sborovna' }],   // vpravo nahoře sborovna
      obstacles: [],
    },
    {
      id: 'hlavniP', art: 'hlavniP', offset: { x: 280, y: 1680 },
      name: 'Chodba v patře', w: 1800, h: 200, floorColor: '#5b5e60',
      doors: [
        { side: 'bottom', at: 1110 / 1800, to: 'a209' },   // naproti konci schodů z přízemí
        { side: 'bottom', at: 1410 / 1800, to: 'predsinKabinetu' },   // předsíň dvou kabinetů s tiskárnou
        { side: 'bottom', at: 1664 / 1800, to: 'kancelar' },          // kancelář školy (vedle ředitelna)
        { side: 'right',  at: 0.5,         to: 'kabinetA216' },       // na konci chodby vpravo
        { side: 'bottom', at: 70 / 1800,   to: 'a210' },   // dole vlevo v rohu chodby
      ],
      obstacles: [
        // sloupy arkád u horní zdi (ne před průchody do ramen a ke schodišti), mezi nimi květiny
        ...[260, 440, 620, 800, 980, 1420, 1560].map((x) => ({ kind: 'pillar', at: { x: x / 1800, y: 35 / 200 }, w: 30, h: 30 })),
        ...[350, 530, 710, 890, 1490].map((x) => ({ kind: 'plant', at: { x: x / 1800, y: 33 / 200 }, w: 24, h: 24 })),
      ],
    },
    { id: 'schodyPatro', art: 'schodyPatro', offset: { x: 1320, y: 1360 }, ...SCHODY_A1 },
  ],
  openings: [
    { x: 300,  y: 1680, w: 160, h: 20, fill: ['old', 'old'] },   // levé rameno ↔ chodba
    { x: 1900, y: 1680, w: 160, h: 20, fill: ['old', 'old'] },   // pravé rameno ↔ chodba
    { x: 1340, y: 1680, w: 280, h: 20, fill: ['old', 'old'] },   // schodiště ↔ chodba
  ],
};

// Obdélník dveří ve zdi podle strany a polohy
function doorRect(room, door) {
  if (door.local) {
    const l = door.local;
    return { x: room.x + l.x, y: room.y + l.y, w: l.w, h: l.h };
  }
  const t = CONFIG.WALL_THICKNESS;
  const s = CONFIG.DOOR_WIDTH;
  const alongX = Math.round(room.x + room.w * door.at - s / 2);
  const alongY = Math.round(room.y + room.h * door.at - s / 2);
  switch (door.side) {
    case 'top':    return { x: alongX, y: room.y,              w: s, h: t };
    case 'bottom': return { x: alongX, y: room.y + room.h - t, w: s, h: t };
    case 'left':   return { x: room.x,              y: alongY, w: t, h: s };
    case 'right':  return { x: room.x + room.w - t, y: alongY, w: t, h: s };
  }
  throw new Error('Neznámá strana dveří: ' + door.side);
}

// Pozice hráče kousek před dveřmi (směrem do místnosti)
function spawnInFront(door) {
  const ps = CONFIG.PLAYER_SIZE;
  const gap = CONFIG.DOOR_SPAWN_GAP;
  const cx = door.x + door.w / 2 - ps / 2;
  const cy = door.y + door.h / 2 - ps / 2;
  switch (door.side) {
    case 'top':    return { x: cx, y: door.y + door.h + gap };
    case 'bottom': return { x: cx, y: door.y - ps - gap };
    case 'left':   return { x: door.x + door.w + gap, y: cy };
    case 'right':  return { x: door.x - ps - gap, y: cy };
  }
}

// Jednou při startu dopočítá z dat polohy místností, obdélníky dveří
// a místa příchodu. Chyby v datech jen vypíše do konzole.
function prepareRooms() {
  const areaH = CONFIG.HEIGHT - CONFIG.ROOM_AREA_TOP;
  for (const [id, room] of Object.entries(ROOMS)) {
    room.id = id;
    // malá místnost se vycentruje; větší než obrazovka začíná vlevo nahoře a jezdí za ní kamera
    room.x = room.w > CONFIG.WIDTH ? 0 : Math.round((CONFIG.WIDTH - room.w) / 2);
    room.y = room.h > areaH ? CONFIG.ROOM_AREA_TOP : Math.round(CONFIG.ROOM_AREA_TOP + (areaH - room.h) / 2);
    room.floorColor = room.floorColor || CONFIG.FLOOR_COLOR;
    room.wallColor = room.wallColor || CONFIG.WALL_COLOR;
    if (room.parts) {   // místnost složená z dílů: dveře a nábytek dílů se přepočítají do ní
      room.doors = [];
      room.obstacles = [];
      for (const part of room.parts) {
        part.frame = { x: room.x + part.offset.x, y: room.y + part.offset.y, w: part.w, h: part.h };
        for (const door of part.doors || []) {
          if (!ROOMS[door.to]) { console.warn(`Dveře v "${id}/${part.id}" vedou do neexistující místnosti "${door.to}".`); continue; }
          door.part = part.id;
          Object.assign(door, doorRect(part.frame, door));
          room.doors.push(door);
        }
        for (const o of part.obstacles || []) room.obstacles.push({ ...o, part: part.id, rect: rectInRoom(part.frame, o.at, o.w, o.h) });
      }
      room.openings = (room.openings || []).map((o) => ({ ...o, x: room.x + o.x, y: room.y + o.y }));
      room.wallCuts = (room.wallCuts || []).map((o) => ({ ...o, x: room.x + o.x, y: room.y + o.y }));
      continue;
    }
    room.doors = (room.doors || []).filter((door) => {
      if (ROOMS[door.to]) return true;
      console.warn(`Dveře v "${id}" vedou do neexistující místnosti "${door.to}" – vynechány.`);
      return false;
    });
    for (const door of room.doors) Object.assign(door, doorRect(room, door));
    room.obstacles = (room.obstacles || []).map((o) => ({ ...o, rect: rectInRoom(room, o.at, o.w, o.h) }));
  }
  for (const room of Object.values(ROOMS)) {
    for (const door of room.doors) {
      if (door.spawnLocal) {   // ruční místo příchodu (střed hráče, px od rohu cílové místnosti)
        const t = ROOMS[door.to], ps = CONFIG.PLAYER_SIZE;
        door.spawn = { x: t.x + door.spawnLocal.x - ps / 2, y: t.y + door.spawnLocal.y - ps / 2 };
        continue;
      }
      if (door.spawn) continue;
      const back = ROOMS[door.to].doors.find((d) => d.to === room.id);
      if (back) {
        door.spawn = spawnInFront(back);
        const ps = CONFIG.PLAYER_SIZE;
        const spawnRect = { x: door.spawn.x, y: door.spawn.y, w: ps, h: ps };
        if (ROOMS[door.to].obstacles.some((o) => rectsOverlap(spawnRect, o.rect))) {
          console.warn(`Před dveřmi z "${room.id}" do "${door.to}" stojí překážka – hráč by se zasekl.`);
        }
      } else {
        console.warn(`Místnost "${door.to}" nemá dveře zpět do "${room.id}" – hráč se objeví uprostřed.`);
      }
    }
  }
}
