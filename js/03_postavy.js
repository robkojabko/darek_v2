// Obrázky hlav a učitelé (TEACHERS)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// OBRÁZKY – hlavy postaviček jsou ve složce obrazky/ (PNG 48 × 48 px).
// Vyrábí je tools/oblicej_na_sprite.py (hráč: obrazky/hrac.png, učitel: obrazky/<jméno>.png).
// Nový učitel = přidat řádek do FACE_FILES a look.face u učitele.
// =====================================================================
const playerFaceImg = new Image();
playerFaceImg.src = 'obrazky/hrac.png';

// Hlavy učitelů z fotek (python tools/oblicej_na_sprite.py --cil MALA …)
const FACE_FILES = {
  ladova: 'obrazky/ladova.png',
  telingerova: 'obrazky/telingerova.png',
  kucerova: 'obrazky/kucerova.png',
  damien: 'obrazky/damien.png',
  robin: 'obrazky/robin.png',
  michaelle: 'obrazky/michaelle.png',
  mala: 'obrazky/mala.png',
  krivacek: 'obrazky/krivacek.png',
  rauscher: 'obrazky/rauscher.png',
  holub: 'obrazky/holub.png',
  vozabal: 'obrazky/vozabal.png',
  myky: 'obrazky/myky.png',
  david: 'obrazky/david.png',
  emma: 'obrazky/emma.png',
  lili: 'obrazky/lili.png',
  zita: 'obrazky/zita.png',
  smahel: 'obrazky/smahel.png',
  becvar: 'obrazky/becvar.png',
  chan: 'obrazky/chan.png',
  soumar: 'obrazky/soumar.png',
  lencova: 'obrazky/lencova.png',
  vesela: 'obrazky/vesela.png',
  mraz: 'obrazky/mraz.png',
  jelinek: 'obrazky/jelinek.png',
  binkova: 'obrazky/binkova.png',
  misak: 'obrazky/misak.png',
  klus: 'obrazky/klus.png',
  lukaskova: 'obrazky/lukaskova.png',
  kaja: 'obrazky/kaja.png',
  terka: 'obrazky/terka.png',
  lada: 'obrazky/lada.png',
  vozabalova: 'obrazky/vozabalova.png',
  chvalova: 'obrazky/chvalova.png',
  reditelka: 'obrazky/reditelka.png',
  svecova: 'obrazky/svecova.png',
  skolnik: 'obrazky/skolnik.png',   // školník v dolních šatnách (18_vrah.js)
};
const faceImgs = {};
for (const [id, file] of Object.entries(FACE_FILES)) {
  faceImgs[id] = new Image();
  faceImgs[id].src = file;
}

// =====================================================================
// UČITELÉ – data. Pozice `at` je střed postavy jako podíl rozměru
// místnosti (0..1), stejně jako u dveří.
//   name          – jméno (1. pád), pro – jméno ve 4. pádě („koupil jsi kávu pro Málu“)
//   texts.assign  – když zadává úkol
//   texts.waiting – když ho hráč osloví znovu a úkol ještě nesplnil
//   texts.thanks  – když mu hráč přinese hledanou věc
//   texts.idle    – volitelné; když zrovna nemá co zadat
//   minigame      – volitelné; učitel s ním kdykoli spustí minihru (texts.play) mimo úkoly
//   look          – volitelné; místo barevného obdélníku postavička s hlavou z fotky
//                   (face = klíč do FACE_FILES) a oblečením v těchto barvách
//   route         – volitelné; učitel chodí po trase [{ room, path: [[x, y], …] }, …]
//                   tam a zpátky rychlostí speed (místo room/at)
// =====================================================================
const TEACHERS = {
  // Holub u levého koše – zadává úkol Hod na koš; po splnění si s ním jde hodit kdykoli znovu
  holub: {
    name: 'Holub',
    pro: 'Holuba',
    room: 'telocvicna', at: { x: 0.11, y: 0.6 },
    color: '#c62828',
    look: { face: 'holub', body: '#1c1d22', collar: '#f2f1ec', tie: '#30343c', arms: '#1c1d22', pants: '#1c1d22', shoes: '#111111' },
    minigame: 'basket',
    texts: {
      assign: 'Ukaž, co umíš! Trefíš koš? Máš tři pokusy a stačí dva koše. Nejdřív zastav směr, pak podrž a pusť sílu.',
      waiting: 'Zkusíme to znovu? Stačí dva koše ze tří pokusů.',
      thanks: 'To byly krásné koše! Výborně, do týmu tě beru.',
      play: 'Chceš si hodit na koš? Máš tři pokusy, dva koše vyhrávají. Nejdřív zastav směr, pak podrž a pusť sílu.',
    },
  },
  // Mála v kabinetu nahoře v západní chodbě
  mala: {
    name: 'Mála',
    pro: 'Málu',
    room: 'kabinet', at: { x: 0.6, y: 0.35 },
    color: '#5b2a86',
    look: { face: 'mala', body: '#23252f', collar: '#f2f1ec', tie: '#5b2a86', arms: '#23252f', pants: '#1b1c22', shoes: '#111111' },
    texts: {
      idle: 'Ahoj! Tady v kabinetě mám konečně klid na opravování písemek.',   // struny a půjčování peněz: 22_struny.js
    },
  },
  // Křiváček v kabinetu 2 (výběžek západní chodby)
  krivacek: {
    name: 'Křiváček',
    pro: 'Křiváčka',
    room: 'kabinet2', at: { x: 348 / 460, y: 290 / 420 },
    color: '#3b2f4f',
    look: { face: 'krivacek', body: '#3b2f4f', collar: '#2a2a2e', arms: '#3b2f4f', pants: '#22222a', shoes: '#111111' },
    texts: {
      idle: 'Zdravím! Zrovna chystám pokusy na příští hodinu, tak na nic nesahej.',
    },
  },
  // Rauscher chodí pomalu tam a zpátky: od východu na parkoviště v Céčku
  // až do chodby za hlavním vchodem (přes schody, halu, prosklenou chodbu a chodbu před schody)
  rauscher: {
    name: 'Rauscher',
    pro: 'Rauschera',
    color: '#1f3d82',
    look: { face: 'rauscher', body: '#1f3d82', dots: 'rgba(255, 255, 255, 0.55)', collar: '#1f3d82', arms: '#1f3d82', pants: '#2f3a52', shoes: '#2a1d18' },
    speed: 45,        // px/s – hráč má 200, ať nechodí rychle
    pause: 2,         // na koncích trasy chvíli postojí (s)
    // trasa: v každé místnosti body (střed učitele, px od rohu místnosti)
    route: [
      { room: 'cecko',      path: [[210, 50], [180, 110], [180, 455]] },
      // hala → prosklená chodba → po schodech dolů → chodba před schody → hlavní chodba (jedna místnost)
      { room: 'chodba',     path: [[1475, 320], [1410, 320], [1410, 370], [1340, 380], [1340, 445], [1350, 650], [1340, 860],
                                   [1390, 880], [1390, 1090], [1145, 1090], [1145, 1625], [1140, 1900]] },
    ],
    texts: {
      idle: 'Ahoj! Nemůžu se moc zdržet, jdu zrovna přes celou školu.',
    },
  },
  // Karel Chán (učitel) – stojí u kávovaru v chodbě před schody (pod ním, u levé zdi),
  // ke kávovaru se dá dojít zprava; hlášky dodá autor
  chan: {
    name: 'Karel Chán', pro: 'Karla Chána', color: '#e8762c',
    room: 'chodba', at: { x: 458 / 2200, y: 1420 / 2380 },
    look: { face: 'chan', body: '#e8762c', collar: '#cf6420', arms: '#e8762c', pants: '#3a3f4a', shoes: '#2a1d18' },
    texts: { idle: 'Dobrý den! Dáte si taky kafe?' },
  },
  // Láďa Mráz – učitel na dozoru, chodí po parkovišti. Při minihře
  // s gumami vidí před sebe (kužel); když uvidí hráče, jde se do ředitelny (16_gumy.js).
  dozor: {
    name: 'Mráz', pro: 'Mráze', color: '#5d4037',
    look: { face: 'mraz', body: '#1f2a36', collar: '#2a3644', arms: '#1f2a36', pants: '#2b2b33', shoes: '#1b1b1b' },
    speed: 55, pause: 1.5,
    route: [
      // od dveří doleva, dolů uličkou vlevo od aut, pod auty doprava a nahoru trávou za auty
      { room: 'parkoviste', path: [[700, 95], [200, 100], [200, 610], [396, 615], [396, 215]] },
    ],
    texts: { idle: 'Můj poslední dozor a pak tu nebudu dva měsíce, tak se snad nic nestane.' },
  },
  // Šmahel v A310 vpravo vedle katedry, Bečvář v kabinetu A312 před stolem; hlášky dodá autor
  smahel: {
    name: 'Šmahel', pro: 'Šmahela', color: '#2a2a30',
    room: 'a310', at: { x: 390 / 520, y: 76 / 400 },
    look: { face: 'smahel', body: '#2a2a30', collar: '#1b1b20', arms: '#2a2a30', pants: '#1f1f26', shoes: '#111111' },
    texts: { idle: 'Dobrý den! Zrovna tady v A310 chystám hodinu.' },
  },
  becvar: {
    name: 'Bečvář', pro: 'Bečváře', color: '#5a5a62',
    room: 'kabinetA312', at: { x: 0.5, y: 0.55 },
    look: { face: 'becvar', body: '#5a5a62', collar: '#7a2a30', arms: '#5a5a62', pants: '#2b2b33', shoes: '#2a2a2a' },
    texts: { idle: 'Čau! Zrovna si chystám věci na další hodinu.' },
  },
  // Soumar a Lencová v A211 (vedle katedry vpravo nahoře), Veselá v C301 (vedle katedry vlevo nahoře); hlášky dodá autor
  lencova: {
    name: 'Lencová', pro: 'Lencovou', color: '#c2307a',
    room: 'a211', at: { x: 315 / 520, y: 85 / 400 },
    look: { face: 'lencova', body: '#c2307a', collar: '#e0662a', arms: '#c2307a', pants: '#2b2b33', shoes: '#2a1d18' },
    texts: { idle: 'Dobrý den! Za chvíli začíná hodina, tak si běž sednout.' },
  },
  soumar: {
    name: 'Soumar', pro: 'Soumara', color: '#7a2e35',
    room: 'predsinKabinetu', at: { x: 150 / 300, y: 120 / 240 },   // v předsíni kabinetů
    look: { face: 'soumar', body: '#7a2e35', check: 'rgba(40, 50, 70, 0.75)', collar: '#3a4a66', arms: '#7a2e35', pants: '#2f3a52', shoes: '#2a1d18' },
    texts: { idle: 'Nikdo jiný neumí takové pivo jako já.' },   // jeho hláška pořád (i po questu s pivem)
  },
  vesela: {
    name: 'Veselá', pro: 'Veselou', color: '#1f2f4a',
    room: 'c301', at: { x: 160 / 520, y: 55 / 400 },
    look: { face: 'vesela', body: '#1f2f4a', collar: '#2c3e5c', arms: '#1f2f4a', pants: '#2b2b33', shoes: '#2a1d18' },
    texts: { idle: 'Dobrý den! Hodina začne za chvíli, tak ať nepřijdeš pozdě.' },
  },
  // Jelínek v A302 vedle učitelského počítače (vlevo nahoře); šedý oblek, modrá kravata jako na fotce
  jelinek: {
    name: 'Jelínek', pro: 'Jelínka', color: '#3a3d44',
    room: 'a302', at: { x: 150 / 520, y: 55 / 400 },
    look: { face: 'jelinek', body: '#3a3d44', collar: '#a9c4e8', tie: '#1f3a7a', arms: '#3a3d44', pants: '#2b2d33', shoes: '#1b1b1b' },
    texts: { idle: 'Dobrý den! Počítače zapínat jen se mnou, jasné?' },
  },
  // Binková v C109 u tabule (levá zeď), Mišák (student) mezi lavicemi; hlášky dodá autor
  binkova: {
    name: 'Binková', pro: 'Binkovou', color: '#1b1b20',
    room: 'c109', at: { x: 60 / 520, y: 200 / 400 },
    look: { face: 'binkova', body: '#1b1b20', collar: '#2a2a30', arms: '#1b1b20', pants: '#2b2b33', shoes: '#1b1b1b' },
    texts: { idle: 'Dobrý den! Posaď se, za chvíli začínáme.' },
  },
  // Ivana (Ivča) Lukášková (chemie) – v laboratoři chemie dole pod schody (19_laborky.js přepíše místo); hlášky dodá autor
  lukaskova: {
    name: 'Lukášková', pro: 'Lukáškovou', color: '#2b2b30',
    room: 'a114', at: { x: 420 / 520, y: 76 / 400 },
    look: { face: 'lukaskova', body: '#26262b', collar: '#e8e4da', arms: '#26262b', pants: '#2b2b33', shoes: '#1b1b1b' },
    texts: { idle: 'Dobrý den. V laboratoři se nic neolizuje a nic se neodnáší.' },
  },
  // Láďa – tělocvikář v Kabinetu tělocvikářů (kabinet 6 vedle tělocvičny, 20_skola.js)
  lada: {
    name: 'Láďa', pro: 'Láďu', color: '#1565c0',
    room: 'kabinet6', at: { x: 0.45, y: 0.32 },
    look: { face: 'lada', body: '#1565c0', collar: '#0d47a1', arms: '#1565c0', pants: '#263238', shoes: '#fafafa' },
    texts: { idle: 'Čau Romane, tak dneska jdu do hospody, bude tam taťka? Rád bych si s ním prohodil pár slov, znáš to. Ale neboj, za pár hodin bych ho nechal jít domů.' },
  },
  // Vozábalová v kanceláři školy za stolem
  vozabalova: {
    name: 'Vozábalová', pro: 'Vozábalovou', color: '#6d4c41',
    room: 'kancelar', at: { x: 126 / 360, y: 118 / 280 },
    look: { face: 'vozabalova', body: '#8d6e63', collar: '#f5f0e6', arms: '#8d6e63', pants: '#3e2723', shoes: '#1b1b1b' },
    texts: { idle: 'Dobrý den. Potvrzení o studiu? Formulář vám dám, jen ho pak podepsat, prosím.' },
  },
  // Chválová v Kabinetu Chválová (A216) – tráva v květináčích a kouř (20_skola.js)
  chvalova: {
    name: 'Chválová', pro: 'Chválovou', color: '#558b2f',
    room: 'kabinetA216', at: { x: 240 / 300, y: 82 / 260 },   // v rohu stolu do L
    look: { face: 'chvalova', body: '#fafafa', collar: '#e0e0e0', arms: '#fafafa', pants: '#37474f', shoes: '#5d4037' },
    texts: { idle: 'Ahooj… ty jsi Roman? Nebo jste dva? Hihi… Pojď dál, tady je všechno takový… zelený a měkký.' },   // nabízí trávu (17_pribehy.js)
  },
  // Ládová, Telingerová a Kučerová ve svých kabinetech (hlavy z malých fotek ze školního webu); hlášky od uživatele
  ladova: {
    name: 'Ládová', pro: 'Ládovou', color: '#2e5e4e',
    room: 'kabinetA214', at: { x: 0.68, y: 0.38 },
    look: { face: 'ladova', body: '#24453a', collar: '#1b3329', arms: '#24453a', pants: '#2b2b33', shoes: '#1b1b1b' },
    texts: { idle: 'Romane, v pondělí píšeme sloh, tak doufám, že někam neodjedeš?' },
  },
  telingerova: {
    name: 'Telingerová', pro: 'Telingerovou', color: '#7b3b4a',
    room: 'kabinetA213', at: { x: 0.45, y: 0.45 },
    look: { face: 'telingerova', body: '#3b3340', collar: '#e8e0e4', arms: '#3b3340', pants: '#2b2b33', shoes: '#1b1b1b' },
    texts: { idle: 'Romane, poslední dobou máš docela dobré výsledky z té matiky. Už doháníš i Metoděje. Nedoučoval tě on náhodou?' },
  },
  kucerova: {
    name: 'Kučerová', pro: 'Kučerovou', color: '#a0522d',
    room: 'kabinet5', at: { x: 0.72, y: 0.72 },   // kabinet má s Binkovou
    look: { face: 'kucerova', body: '#f1ece4', collar: '#d8cfc2', arms: '#f0c8a8', pants: '#3e3a46', shoes: '#1b1b1b' },
    texts: { idle: 'Romane, tak jsem řešila toho tvýho Racka k maturitní četbě a bohužel ti ho tam nedám. Nechápu, jak to můžeš číst.' },
  },
  // Ředitelka v ředitelně za stolem (hláška i po chycení u gum – 16_gumy.js)
  reditelka: {
    name: 'Ředitelka', pro: 'ředitelku', color: '#c62828',
    room: 'reditelna', at: { x: 0.42, y: 70 / 280 },
    look: { face: 'reditelka', body: '#d32f2f', collar: '#fafafa', arms: '#d32f2f', pants: '#212121', shoes: '#1b1b1b' },
    texts: { idle: 'Dobrý den, Romane. Doufám, že tu nejste kvůli dalšímu průšvihu.' },
  },
  // Švecová v C308 (3. patro Céčka) u tabule
  svecova: {
    name: 'Švecová', pro: 'Švecovou', color: '#5c7fa3',
    room: 'c308', at: { x: 60 / 520, y: 200 / 400 },
    look: { face: 'svecova', body: '#bbd2ec', collar: '#e8f0fa', arms: '#bbd2ec', pants: '#37474f', shoes: '#5d4037' },
    texts: { idle: 'Dobrý den! Tady v C308 mám aspoň klid na opravování. Teda než přijde Holub s kafem.' },
  },
  // Terka – chodí s Rauscherem (companion) a pomlouvají spolu Holuba (20_skola.js)
  terka: {
    name: 'Terka', pro: 'Terku', student: true, color: '#7b8fa6',
    companion: 'rauscher', room: 'chodba', at: { x: 0.5, y: 0.5 },
    look: { face: 'terka', body: '#cfe0ec', collar: '#a9c1d4', arms: '#f0c8a8', pants: '#1f2a44', shoes: '#fafafa' },
    texts: { idle: 'Psst, slyšel jsi tu o Holubovi?' },
  },
  // Kája – studentka v laboratoři chemie (v příběhu nedůležitá)
  kaja: {
    name: 'Kája', pro: 'Káju', student: true, color: '#3f6fb5',
    room: 'laborky', at: { x: 320 / 640, y: 255 / 440 },
    look: { face: 'kaja', body: '#5c7fc0', collar: '#e8eef8', arms: '#f0c8a8', pants: '#3f6fb5', shoes: '#fafafa' },
    texts: { idle: 'Ahoj! Nesahej mi na tu zkumavku, právě mi tam něco krásně bublá.' },
  },
  // Tomáš Klus v C202 u kytar – hraje tam Treplev; Lili mu chce utéct (17_pribehy.js)
  klus: {
    name: 'Tomáš Klus', pro: 'Tomáše Kluse', color: '#26262b',
    room: 'c202', at: { x: 300 / 600, y: 344 / 400 },
    look: { face: 'klus', body: '#1d1d21', collar: '#2c2c31', arms: '#1d1d21', pants: '#2f3a52', shoes: '#1b1b1b' },
    texts: { idle: 'Ahoj, já jsem Tomáš. Chceš slyšet Trepleva? No jasně, že chceš.' },
  },
  // ---------------------------------------------------------------- STUDENTI
  // Studenti jsou zapsaní stejně jako učitelé (mluví se s nimi mezerníkem).
  misak: {
    name: 'Mišák', pro: 'Mišáka', student: true, color: '#1f1f22',
    room: 'c109', at: { x: 106 / 520, y: 200 / 400 },   // vedle Binkové, povídají si (20_skola.js)
    look: { face: 'misak', body: '#1f1f22', collar: '#2c2c30', arms: '#1f1f22', pants: '#34495e', shoes: '#e8e8e8' },
    texts: { idle: 'Čau! Co tady děláš?' },
  },
  // Kuba Vozábal chodí po chodbách celé školy (jen chodby, do tříd nechodí):
  // 2. patro budovy A → schody → 1. patro → schody → přízemí (východní, hlavní, vstupní, západní,
  // chodba před schody, prosklená, hala) → Céčko → 2. a 3. patro Céčka a zpátky.
  // Trasa je spočítaná hledáním cesty mezi zdmi a nábytkem (README: Testy).
  vozabal: {
    name: 'Kuba Vozábal',
    pro: 'Kubu Vozábala',
    student: true,
    color: '#3a7d44',
    // hlava z fotky (tools/ucitele.sh), černá košile jako na fotce
    look: { face: 'vozabal', hair: '#2a1d18', body: '#1f1f22', collar: '#2c2c30', arms: '#1f1f22', pants: '#34495e', shoes: '#e8e8e8' },
    speed: 70,        // student chodí rychleji než učitelé
    pause: 2,
    route: [
      { room: 'patroA2', path: [[380, 1230], [380, 1780], [1980, 1780], [1980, 1400], [1980, 1780], [1390, 1760], [1390, 1510]] },
      { room: 'patroA', path: [[1390, 1430], [1570, 1430], [1570, 1760], [380, 1780], [380, 1230], [380, 1780], [1980, 1780],
                               [1980, 1400], [1980, 1780], [1390, 1760], [1390, 1510]] },
      { room: 'chodba', path: [[1390, 1420], [1550, 1450], [1600, 1730], [2000, 1730], [2080, 1500], [2000, 1730], [1700, 1790],
                               [1160, 1780], [1140, 1800], [1140, 2330], [1140, 1800], [1080, 1780], [900, 1780], [900, 1800],
                               [280, 1800], [280, 830], [280, 1800], [980, 1730], [1100, 1510], [1100, 1430], [790, 1400],
                               [1100, 1360], [1130, 1170], [1180, 1110], [1370, 1070], [1390, 880], [1340, 600], [1390, 330],
                               [1390, 170], [1470, 320]] },
      { room: 'cecko',  path: [[180, 450], [180, 70], [730, 70], [310, 70], [310, 150], [310, 370]] },
      { room: 'cecko2', path: [[310, 260], [310, 420], [100, 420], [180, 420], [180, 260], [180, 50]] },
      { room: 'cecko3', path: [[180, 260], [180, 70], [730, 70]] },
    ],
    texts: {
      idle: 'Kámo, bacha, Netanjahu je všude.',
    },
  },
  // noví studenti – zatím stojí v hlavní chodbě (pak se „rozházejí“), hlášky dodá autor
  myky: {
    name: 'Myky', pro: 'Mykyho', student: true, color: '#e8e8e4',
    room: 'satny2', at: { x: 310 / 380, y: 85 / 440 },    // u skříněk vpravo, na úrovni jejich začátku
    look: { face: 'myky', body: '#f2f1ec', collar: '#e2e0d8', arms: '#f2f1ec', pants: '#3b4a63', shoes: '#2a1d18' },
    texts: {
      idle: 'Ahoj Romku, tady máš sluchátka! Můžeš si pustit písničky, které jsem pro tebe připravil, během toho, co budeš dělat další quest nebo zkoumat místní prostředí!',
    },
    // po rozhovoru si hráč vybere písničku; hraje místo hudby na pozadí, po dohrání se vrátí hudba
    songs: [
      { name: 'FACE – Юморист', file: 'zvuky/Mykyta/FACE – ЮМОРИСТ.MP3' },
      { name: 'Red Hot Chili Peppers – Eddie', file: 'zvuky/Mykyta/Red Hot Chili Peppers - Eddie (Official Audio).mp3' },
      { name: 'Градусы – Голая', file: 'zvuky/Mykyta/Градусы — Голая (Официальный клип!).mp3' },
    ],
  },
  david: {
    name: 'David', pro: 'Davida', student: true, color: '#7d8a6a',
    room: 'parkoviste', at: { x: 80 / 640, y: 180 / 480 },    // na parkovišti pod budkou, mimo trasu dozoru; zadává gumy (04_ukoly.js)
    look: { face: 'david', body: '#8a9478', dots: 'rgba(255, 255, 255, 0.35)', collar: '#6c765e', arms: '#8a9478', pants: '#2f3a52', shoes: '#e8e8e8' },
    texts: {
      assign: 'Čau! Hele, tady máš nůž. Pojď propíchat učitelům gumy! Ale bacha na učitele na dozoru – když tě uvidí, máš to spočítaný.',
      waiting: 'Ještě nejsou všechny! Tady máš nůž, dělej – a schovávej se za auta, ať tě dozor nevidí.',
      idle: 'To byla akce! Ještě teď se mi klepou ruce.',
    },
  },
  emma: {
    name: 'Emma', pro: 'Emmu', student: true, color: '#7a7f86',
    room: 'chodba', at: { x: 985 / 2200, y: 1895 / 2380 },    // před bufetem se Zitou
    look: { face: 'emma', body: '#6f747b', collar: '#e8e6e0', arms: '#f2f0ea', pants: '#2f3a52', shoes: '#3a2a1c' },
    texts: { idle: 'Ahoj!' },
  },
  lili: {
    name: 'Lili', pro: 'Lili', student: true, color: '#3a3550',
    room: 'c202', at: { x: 100 / 600, y: 300 / 400 },   // v C202 s Klusem; po útěku u Bečváře (17_pribehy.js)
    look: { face: 'lili', body: '#3a3550', collar: '#2a2a2e', arms: '#3a3550', pants: '#2b2b33', shoes: '#1b1b1b' },
    texts: {
      idle: 'Čau!',
      assign: 'Romane, pomoz mi! Tomáš Klus mě tu drží už třetí hodinu a pořád dokola hraje Trepleva. Dej se s ním do řeči, ať můžu potichu zmizet!',
      waiting: 'Prosím tě, zabav ho! Stačí s ním začít mluvit.',
      thanks: 'Všude dobře, u Bečváře nejlíp!',
    },
  },
  zita: {
    name: 'Zita', pro: 'Zitu', student: true, color: '#2a2a2e',
    room: 'chodba', at: { x: 1035 / 2200, y: 1905 / 2380 },   // před bufetem s Emmou
    look: { face: 'zita', body: '#222226', collar: '#151518', arms: '#222226', pants: '#2b2b33', shoes: '#1b1b1b' },
    texts: { idle: 'Ahoj!' },
  },
};
