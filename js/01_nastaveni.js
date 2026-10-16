// Nastavení – všechny laditelné konstanty (CONFIG)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// CONFIG – všechny laditelné konstanty na jednom místě
// =====================================================================
const CONFIG = {
  // Interní rozlišení hry (všechny souřadnice ve hře jsou v těchto pixelech)
  WIDTH: 800,
  HEIGHT: 600,

  // Pevný časový krok logiky (60 aktualizací za sekundu)
  FIXED_DT: 1 / 60,
  // Max. doba snímku – po přepnutí záložky se hra „nedohání“ desítky kroků
  MAX_FRAME_TIME: 0.25,

  // Hráč
  PLAYER_SIZE: 32,
  PLAYER_SPEED: 200,          // px za sekundu
  PLAYER_COLOR: '#3a7bff',      // náhradní barva, kdyby se obrázek hlavy nenačetl

  // Postavička hráče: hlava z fotky, tělo s rameny, rukama a nohama (hlava : tělo ≈ 1 : 1,6).
  // Kolize se dál počítají se čtvercem PLAYER_SIZE u nohou, hlava jen přečnívá nahoru.
  PLAYER_HEAD_SIZE: 40,         // obrázek hlavy 48 × 48 px se kreslí zmenšený (tools/oblicej_na_sprite.py)
  PLAYER_SKIN: '#f0c6a2',       // ruce a krk
  PLAYER_SHIRT: '#f2f1ec',      // bílá košile (podle fotky)
  PLAYER_VEST: '#2c3c66',       // tmavomodrá vesta
  PLAYER_VEST_CHECK: 'rgba(200, 210, 235, 0.35)', // světlé kostky na vestě
  PLAYER_PANTS: '#1d2338',      // tmavé kalhoty
  PLAYER_SHOES: '#2a1d18',
  PLAYER_SWAY: 0.14,            // jak moc se tělo při chůzi kolébá (radiány)
  PLAYER_STEP_SPEED: 13,        // rychlost kroků (rad/s)
  PLAYER_LEG_LIFT: 3,           // o kolik px se zvedá noha při kroku

  // Místnost
  WALL_THICKNESS: 20,
  WALL_COLOR: '#5a4632',
  FLOOR_COLOR: '#c8b48a',
  BACKGROUND_COLOR: '#1b1b1b', // prostor mimo místnost
  ROOM_AREA_TOP: 72,          // horní pruh plátna vyhrazený pro název místnosti a úkol
  START_ROOM: 'ulice',        // hra začíná před školou (pohled zepředu)

  // Grafika
  PATTERN_RES: 2,             // rozlišení dlaždic vzoru podlahy (2 = ostré i na mobilu)
  CHARACTER_OUTLINE: 'rgba(0, 0, 0, 0.55)', // obrys hráče
  CHARACTER_SHADOW: 'rgba(0, 0, 0, 0.3)',   // stín pod postavami

  // Dveře
  DOOR_WIDTH: 56,            // šířka otvoru podél zdi (hráč má 32)
  DOOR_COLOR: '#a8322d',
  DOOR_LABEL_FONT: '11px sans-serif',
  DOOR_LABEL_COLOR: '#ffffff',
  DOOR_LABEL_OUTLINE: '#000000', // obrys písma, aby bylo čitelné na světlé i tmavé ploše
  DOOR_TRIGGER_MARGIN: 2,     // na kolik px se musí hráč ke dveřím přiblížit, aby prošel
  DOOR_SPAWN_GAP: 12,         // jak daleko před dveřmi se hráč objeví (musí být > DOOR_TRIGGER_MARGIN)

  // Přechod mezi místnostmi (ztmavnutí + rozsvícení)
  TRANSITION_TIME: 0.2,       // celková doba v sekundách
  TRANSITION_COLOR: '#000000',

  // Název místnosti nahoře
  TITLE_FONT_SIZE: 22,
  TITLE_FONT_FAMILY: 'sans-serif',
  TITLE_COLOR: '#e8e8e8',
  TITLE_HIGHLIGHT_COLOR: '#ffd54a',
  TITLE_HIGHLIGHT_TIME: 1.5,  // jak dlouho po vstupu je název zvýrazněný (s)
  TITLE_HIGHLIGHT_SCALE: 1.3, // zvětšení názvu na začátku zvýraznění
  TITLE_Y: 20,                // svislá poloha názvu místnosti

  // Horní lišta: aktuální úkol a počítadlo
  TASK_Y: 50,
  TASK_FONT: '15px sans-serif',
  TASK_COLOR: '#cfe3ff',
  COUNTER_FONT: 'bold 14px sans-serif',
  COUNTER_COLOR: '#e8e8e8',

  // Učitelé
  TEACHER_W: 34,
  TEACHER_H: 44,
  TEACHER_OUTLINE: '#222222',
  TEACHER_INITIAL_FONT: 'bold 20px sans-serif',
  TEACHER_NAME_FONT: '11px sans-serif',
  TEACHER_TALK_RANGE: 28,     // jak blízko (px od okraje učitele) musí hráč být, aby mohl mluvit
  TEACHER_IDLE_TEXT: 'Teď nic nepotřebuji. Zkus se zeptat někoho jiného.',

  // Nápověda nad učitelem
  HINT_KEYBOARD: 'Mezerník',
  HINT_TOUCH: 'Ťukni',
  HINT_FONT: 'bold 12px sans-serif',
  HINT_BG: 'rgba(0, 0, 0, 0.75)',
  HINT_COLOR: '#ffffff',

  // Akce
  ACTION_KEYS: ['Space', 'Enter'],
  TAP_TOLERANCE: 16,          // o kolik px vedle se dá ťuknout na učitele/předmět a ještě to platí

  // Předměty
  ITEM_SIZE: 20,
  ITEM_OUTLINE: '#ffffff',
  ITEM_BOB_HEIGHT: 4,         // výška poskakování (px)
  ITEM_BOB_SPEED: 4,          // rychlost poskakování (rad/s)
  ITEM_GLOW_COLOR: '#fff6b0',
  ITEM_GLOW_RADIUS: 22,
  PICKUP_EFFECT_TIME: 0.5,    // délka efektu sebrání (s)
  PICKUP_EFFECT_RADIUS: 40,

  // Hláška „Sebral jsi: …“
  TOAST_TIME: 2,
  TOAST_Y: 550,
  TOAST_FONT: 'bold 16px sans-serif',
  TOAST_BG: 'rgba(0, 0, 0, 0.8)',
  TOAST_COLOR: '#ffd54a',

  // Dialogové okno
  DIALOG_HEIGHT: 150,
  DIALOG_MARGIN: 20,
  DIALOG_PADDING: 16,
  DIALOG_BG: 'rgba(20, 22, 34, 0.94)',
  DIALOG_BORDER: '#ffffff',
  DIALOG_NAME_FONT: 'bold 18px sans-serif',
  DIALOG_TEXT_FONT: '17px sans-serif',
  DIALOG_TEXT_COLOR: '#ffffff',
  DIALOG_LINE_HEIGHT: 24,
  DIALOG_CONTINUE_FONT: '12px sans-serif',
  DIALOG_CONTINUE_COLOR: '#aaaaaa',
  DIALOG_CONTINUE_KEYBOARD: 'Mezerník ▶',
  DIALOG_CONTINUE_TOUCH: 'Ťukni ▶',

  // Úvodní a závěrečná obrazovka (texty jsou zatím zástupné)
  GAME_TITLE: 'Gymnázium Prachatice',
  GAME_SUBTITLE: 'Pro Romana Gajdoše',
  PLAYER_NAME: 'hráči',       // jméno do gratulace, v 5. pádě (oslovení)
  END_TITLE: 'Gratulujeme, {name}!',
  END_TEXT: 'Splnil jsi všechny úkoly. Škola ti děkuje!',
  CONTROLS_KEYBOARD: 'Pohyb: šipky / WASD   ·   Mluvit: mezerník   ·   Úkoly: Q   ·   Věci: E   ·   Mapa: K   ·   Zvuk: M   ·   Písničky: P · Album: Z · další N',
  CONTROLS_TOUCH: 'Na mobilu: joystick v levé půlce obrazovky, ťuknutí vpravo = mluvit',
  MENU_BG: '#1f2a44',
  MENU_TITLE_COLOR: '#ffd54a',
  MENU_TEXT_COLOR: '#e8e8e8',
  MENU_SMALL_COLOR: '#9aa7c0',
  MENU_TITLE_FONT: 'bold 46px sans-serif',
  MENU_SUBTITLE_FONT: '20px sans-serif',
  MENU_SMALL_FONT: '13px sans-serif',
  END_OVERLAY: 'rgba(10, 14, 30, 0.75)',
  END_INPUT_DELAY: 0.8,       // po kolika s jde na závěrečné obrazovce zmáčknout tlačítko (ať se neodklikne omylem)

  // Tlačítka v menu
  BUTTON_W: 240,
  BUTTON_H: 54,
  BUTTON_FONT: 'bold 22px sans-serif',
  BUTTON_COLOR: '#3a7bff',
  BUTTON_SECONDARY_COLOR: '#46506a',
  BUTTON_TEXT_COLOR: '#ffffff',

  // Konfety
  CONFETTI_COUNT: 150,
  CONFETTI_COLORS: ['#ffd54a', '#ff5252', '#40c4ff', '#69f0ae', '#e040fb', '#ffffff'],

  // Ukládání (localStorage)
  SAVE_KEY: 'hra_darek_postup_v1',
  SAVE_KEY_VRAH: 'hra_darek_vrah_v1',   // režim Vrah z učebny C109 (18_vrah.js) má vlastní uložení
  MUTE_KEY: 'hra_darek_zvuk_vypnuty',

  // Minihra hod na koš (pohled zepředu, souřadnice plátna 800 × 600)
  BASKET_ATTEMPTS: 3,
  BASKET_NEEDED: 2,
  BASKET_POWER_SPEED: 0.95,    // kolikrát za sekundu síla vyjede nahoru a zpět
  BASKET_DIR_SPEED: 0.6,       // jak rychle běhá ukazatel směru (cyklů za sekundu)
  BASKET_IDEAL_POWER: 0.68,    // nejlepší síla (0–1)
  BASKET_DIR_RANGE: 150,       // o kolik px vedle obroučky letí míč při krajním směru
  BASKET_DEPTH_RANGE: 230,     // o kolik „přestřelí / nedohodí“ při síle 0 nebo 1
  BASKET_HIT_RADIUS: 27,       // jak blízko středu obroučky musí míč proletět
  BASKET_FLIGHT_TIME: 0.9,     // let míče (s)
  BASKET_RIM: { x: 400, y: 232, rx: 34, ry: 8 },
  BASKET_BALL_START: { x: 400, y: 520 },
  SOUND_SWISH: [[660, 0, 0.08], [880, 0.08, 0.08], [1175, 0.16, 0.22]],
  SOUND_MISS: [[220, 0, 0.14], [165, 0.14, 0.26]],
  SOUND_BOUNCE: [[120, 0, 0.08]],

  // Zvuk – tóny jako [frekvence Hz, začátek s, délka s]
  SOUND_VOLUME: 0.12,
  // hudba na pozadí: alba (Z = výběr alba, P = písničky alba, N = další); album hraje popořadě
  // a dokola, začíná Mix od Tří křížů. Do Mixu se po sluchátkách od Mykyho přidají jeho
  // tři písničky (09_ukladani_a_zvuk.js → musicPlaylist), do Red Hot Chili Peppers ne.
  MUSIC_ALBUMS: {
    mix: { name: 'Mix', songs: [
      { name: 'Tři kříže – Hákový', file: 'zvuky/pozadí/mix/Tři kříže (Hákový).mp3' },
      { name: 'Fatboy Slim – Praise You', file: 'zvuky/pozadí/mix/Fatboy Slim - Praise You [Official Video].mp3' },
      { name: 'Horkýže Slíže – Vlak', file: 'zvuky/pozadí/mix/Horkýže Slíže - Vlak [oficiálny videoklip].mp3' },
      { name: 'Nirvana – Smells Like Teen Spirit', file: 'zvuky/pozadí/mix/Nirvana - Smells Like Teen Spirit (Official Music Video).mp3' },
      { name: 'Propadleek – Ty mi za to stojíš', file: 'zvuky/pozadí/mix/Propadleek - Ty mi za to stojíš (official video).mp3' },
      { name: 'Tomáš Klus – Chybíš mi', file: 'zvuky/pozadí/mix/Tomas Klus - Chybis mi.mp3' },
      { name: 'Tomáš Klus – Marie', file: 'zvuky/pozadí/mix/Tomáš Klus - Marie.mp3' },
    ] },
    rhcp: { name: 'Red Hot Chili Peppers', songs: [
      { name: 'Scar Tissue', file: 'zvuky/pozadí/red hot chily peppers/Red Hot Chili Peppers - Scar Tissue [Official Music Video].mp3' },
      { name: 'Otherside', file: 'zvuky/pozadí/red hot chily peppers/Red Hot Chili Peppers - Otherside [Official Music Video].mp3' },
      { name: 'Californication', file: 'zvuky/pozadí/red hot chily peppers/Red Hot Chili Peppers - Californication (Official Music Video) [HD UPGRADE].mp3' },
      { name: 'Easily', file: 'zvuky/pozadí/red hot chily peppers/Easily.mp3' },
      { name: 'Porcelain', file: 'zvuky/pozadí/red hot chily peppers/Porcelain.mp3' },
      { name: 'Emit Remmus', file: 'zvuky/pozadí/red hot chily peppers/Emit Remmus.mp3' },
      { name: 'I Like Dirt', file: 'zvuky/pozadí/red hot chily peppers/I Like Dirt.mp3' },
      { name: 'This Velvet Glove', file: 'zvuky/pozadí/red hot chily peppers/This Velvet Glove.mp3' },
      { name: 'Savior', file: 'zvuky/pozadí/red hot chily peppers/Savior.mp3' },
      { name: 'Purple Stain', file: 'zvuky/pozadí/red hot chily peppers/Purple Stain.mp3' },
      { name: 'By The Way', file: 'zvuky/pozadí/red hot chily peppers/Red Hot Chili Peppers - By The Way [Official Music Video].mp3' },
      { name: 'Dani California', file: 'zvuky/pozadí/red hot chily peppers/Red Hot Chili Peppers - Dani California [Official Music Video].mp3' },
    ] },
  },
  FOOS_MUSIC_FILE: 'zvuky/fotbálek.mp3',       // hudba u fotbálku (místo hudby na pozadí)
  MUSIC_VOLUME: 0.35,                          // hlasitost hudby 0..1 (na iPhonu se nedá změnit)
  SOUND_WAVE: 'square',
  SOUND_PICKUP: [[880, 0, 0.08], [1320, 0.08, 0.14]],
  SOUND_COMPLETE: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]],
  MUTE_BUTTON: { x: 756, y: 6, w: 34, h: 30 }, // vpravo nahoře (herní souřadnice)
  CATALOG_BUTTON: { x: 716, y: 6, w: 34, h: 30 }, // vedle zvuku: seznam úkolů
  CATALOG_KEYS: ['KeyQ', 'Tab'],
  MAP_BUTTON: { x: 676, y: 6, w: 34, h: 30 },    // vedle úkolů: mapa školy (kde je Kuba)
  MAP_KEYS: ['KeyK'],
  MUTE_KEYS: ['KeyM'],
  // tlačítko s právě hranou skladbou (ťuknutí = seznam písniček): ve hře pod tlačítky vpravo, na úvodu vlevo nahoře
  MUSIC_BUTTON: { x: 600, y: 40, w: 190, h: 22 },
  MUSIC_BUTTON_TITLE: { x: 8, y: 6, w: 170, h: 26 },
  MUSIC_NEXT_KEYS: ['KeyN'],
  MUSIC_MENU_KEYS: ['KeyP'],   // seznam písniček vybraného alba (jako katalog úkolů)
  MUSIC_ALBUM_KEYS: ['KeyZ'],  // výběr alba: Mix / Red Hot Chili Peppers
  INVENTORY_BUTTON: { x: 636, y: 6, w: 34, h: 30 }, // vedle mapy: inventář (batoh)
  INVENTORY_KEYS: ['KeyE'],
  KLUS_MUSIC_FILE: 'zvuky/Treplev.mp3',        // hraje v C202 u Tomáše Kluse (17_pribehy.js)
  KLUS_MUSIC_NAME: 'Tomáš Klus – Treplev',
  PANENKY_MUSIC_FILE: 'zvuky/Záviš - Dvě panenky.mp3',   // rytmická hra u Křiváčka (18_vrah.js)
  PANENKY_MUSIC_NAME: 'Záviš – Dvě panenky',   // seznam písniček na pozadí (jako katalog úkolů)

  // Virtuální joystick (rozměry v CSS pixelech obrazovky)
  MOBILE_ZOOM: 1.45,          // na mobilu (dotyk / malá obrazovka) je svět přiblížený, kamera jde za hráčem
  JOY_RADIUS: 60,             // poloměr základny = max. vychýlení
  JOY_KNOB_RADIUS: 26,
  JOY_DEADZONE: 0.15,         // 0..1, menší výchylka se ignoruje
  JOY_ZONE_WIDTH: 0.5,        // joystick reaguje na dotyk v levé části obrazovky (podíl šířky)
};
