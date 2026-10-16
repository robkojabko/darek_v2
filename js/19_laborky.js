// Laborky – schody dolů vedle Málova kabinetu, chodba laboratoří a laboratoř chemie
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// MÍSTNOSTI (podle fotek fotky/laborky*.jpg a laborky schody*.jpg)
//   schody     – kus západní chodby (díl 'schodyLab' spojené chodby, jako schody v budově A):
//                rovně nahoru od Křiváčkových dveří (kabinet 2) vede první rameno,
//                nahoře podesta, z ní krátce doleva a druhé rameno dolů – hned na jeho
//                začátku neviditelný přechod do chodby laboratoří (ostatní schody se „dojdou“).
//                Napravo od schodů jsou Málovy dveře (jako na fotce laborky schody.jpg).
//   labChodba  – úzká chodba: dveře do skladu chemikálií (zamčené), dřevěná
//                skříň, hasičák, lékárnička; nahoře vchod do laboratoře
//   laborky    – laboratoř chemie: bílé stoly s modrou hranou a stojany s lahvemi
//                ve dvou sloupcích s uličkou, pultíky s umyvadly podél zdí,
//                zelená tabule, digestoř, kostra, polička s lahvičkami
// =====================================================================
const LAB_BENCH = { top: '#f7f8fa', edge: '#1e3a8a', chair: '#c8955a', chairBack: '#9a6a3a', chairEdge: '#5a3a22' };
Object.assign(ROOMS, {
  labChodba: {
    name: 'Chodba laboratoří', where: 'v chodbě laboratoří',
    w: 200, h: 460, floorColor: '#dfe3e6',
    // otočená o 180°: dole zbytek schodů (sejdou se směrem nahoru), nahoře vchod do laboratoře –
    // do laborky se tak vejde dál stejným směrem (její dveře jsou dole), bez kroku zpátky
    doors: [
      // dole konec schodů: kdo po nich jde dolů (zpátky nahoru do školy), objeví se na podestě v západní chodbě
      { side: 'bottom', at: 0.5, to: 'chodba', hidden: true, spawnLocal: { x: 51, y: 600 } },
      { side: 'top', at: 0.5, to: 'laborky' },
    ],
    obstacles: [
      // zbytek schodů (x 69–131, y 330–440) – po stranách zeď
      { kind: 'plainwall', at: { x: 44.5 / 200, y: 385 / 460 }, w: 49, h: 110 },
      { kind: 'plainwall', at: { x: 155.5 / 200, y: 385 / 460 }, w: 49, h: 110 },
      { kind: 'wardrobe', at: { x: 42 / 200, y: 225 / 460 }, w: 40, h: 56 },        // dřevěná skříň (fotka laborky 2)
    ],
  },
  laborky: {
    name: 'Laboratoř chemie', where: 'v laboratoři chemie',
    w: 640, h: 440, floorColor: '#dde3e6',
    doors: [{ side: 'bottom', at: 0.5, to: 'labChodba' }],
    obstacles: [
      // pultíky s umyvadly podél levé a pravé zdi
      { kind: 'labbench', at: { x: 38 / 640, y: 245 / 440 }, w: 36, h: 290, sinks: [0.2, 0.8], look: LAB_BENCH },
      { kind: 'labbench', at: { x: 602 / 640, y: 245 / 440 }, w: 36, h: 290, sinks: [0.2, 0.8], look: LAB_BENCH },
      // stoly se stojany a lahvemi – od pultíku u zdi až k uličce uprostřed (chodí se jen středem)
      ...[130, 230, 330].flatMap((y) => [166, 474].map((x) => ({ kind: 'chembench', at: { x: x / 640, y: y / 440 }, w: 220, h: 50 }))),
      { kind: 'wardrobe', at: { x: 92 / 640, y: 42 / 440 }, w: 50, h: 34 },          // skříň (s kódem ve Vrahovi)
    ],
  },
});

// Schody do laborek jako díl spojené chodby nad Křiváčkovým výběžkem západní chodby
// (výběžek je ve světě x 20–160, y 800–980; díl x 0–200, y 560–800, jeho spodní zeď = horní zeď výběžku)
//   1. rameno (od chodby nahoru = dolů na sever) x 86–148, y 82–220
//   2. rameno (doleva, taky dolů)               x 82–148, y 20–82   (nad 1. ramenem)
//   podesta vlevo nahoře                        x 20–82,  y 20–82
//   3. rameno (dolů na jih)                     x 20–82,  y 82–220  – kousek pod začátkem přechod
//   do chodby laboratoří, kde se zbytek schodů opravdu sejde (labChodba nahoře)
const LAB_STAIRS = { w: 62, f1: { x: 86, y: 82, w: 62, h: 138 }, f2: { x: 82, y: 20, w: 66, h: 62 },
  landing: { x: 20, y: 20, w: 62, h: 62 }, f3: { x: 20, y: 82, w: 62, h: 138 } };
ROOMS.chodba.parts.push({
  id: 'schodyLab', art: 'schodyLab', offset: { x: 0, y: 560 },
  name: 'Schody do laboratoří', w: 200, h: 240, floorColor: '#e7e0d3',
  doors: [
    // na 3. rameni dolů → nahoru na zbytek schodů v chodbě laboratoří (sejdou se tam)
    { side: 'bottom', local: { x: 20, y: 112, w: 62, h: 8 }, to: 'labChodba', hidden: true, spawnLocal: { x: 100, y: 416 } },
  ],
  obstacles: [
    { kind: 'ironrail', at: { x: 84 / 200, y: 151 / 240 }, w: 4, h: 138 },        // zábradlí mezi 1. a 3. ramenem
    { kind: 'plainwall', at: { x: 164 / 200, y: 120 / 240 }, w: 32, h: 200 },     // vpravo od schodů zeď
  ],
});
ROOMS.chodba.openings.push({ x: 86, y: 780, w: 62, h: 20, fill: ['old', 'old'] });   // z výběžku na 1. rameno

// Lukášková (Ivča) učí chemii v laborce, Kája je tam taky (v příběhu nedůležitá)
Object.assign(TEACHERS.kaja, { room: 'laborky', at: { x: 150 / 640, y: 180 / 440 } });   // mezi 1. a 2. řadou stolů vlevo
Object.assign(TEACHERS.lukaskova, { room: 'laborky', at: { x: 320 / 640, y: 46 / 440 } });   // vzadu u tabule, ať se dá projít
Object.assign(CAST_HOME.lukaskova, { room: 'laborky', at: { x: 320 / 640, y: 46 / 440 } });   // domov pro režim Vrah (18_vrah.js)

// =====================================================================
// KRESBA NÁBYTKU
// =====================================================================
Object.assign(OBSTACLE_ART, {
  // dřevěný stůl jazykové učebny (A107) – na každém místě sluchátka
  langbench(r, o) {
    OBSTACLE_ART.labbench(r, { ...o, look: { top: '#c98f4f', edge: '#8a5a2e', chair: '#e0b25a', chairBack: '#b98a35', chairEdge: '#5a3a22' } });
    const long = r.w >= r.h, n = Math.max(1, Math.floor((long ? r.w : r.h) / 26));
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.5;
    for (let k = 0; k < n; k++) {
      const a = ((long ? r.w : r.h) / n) * (k + 0.5);
      const ch = o.chairs || [];
      const cx = long ? r.x + a : r.x + r.w / 2 + (ch.includes('left') ? 6 : ch.includes('right') ? -6 : 0);
      const cy = long ? r.y + r.h / 2 + (ch.includes('top') ? 4 : ch.includes('bottom') ? -4 : 0) : r.y + a;
      ctx.beginPath(); ctx.arc(cx, cy, 4, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#263238';
      ctx.fillRect(cx - 5, cy - 1, 3, 4); ctx.fillRect(cx + 2, cy - 1, 3, 4);
    }
  },
  // koš na tříděný odpad (šedý s bílým víkem)
  trashbin(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#e0e0e0');
    drawRect({ x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h / 2 - 2 }, '#9e9e9e');
    drawOutline(r, '#757575');
  },
  // bílý laboratorní stůl s modrou hranou, uprostřed stojan s lahvemi a zkumavkami
  chembench(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#f7f8fa');
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 3; ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
    const sx = r.x + 10, sy = r.y + r.h / 2 - 5, sw = r.w - 20;
    drawRect({ x: sx, y: sy, w: sw, h: 10 }, '#e3e7ea');                     // police nad stolem
    drawOutline({ x: sx, y: sy, w: sw, h: 10 }, '#1e3a8a');
    const colors = ['#8d4f12', '#c0392b', '#2e86c1', '#f1c40f', '#7f8c8d', '#27ae60'];
    for (let i = 0; i < 9; i++) {                                              // lahve na polici
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.arc(sx + 8 + i * (sw - 16) / 8, sy + 5, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    for (const fx of [0.18, 0.82]) {                                           // stojany s kruhy
      const cx = r.x + r.w * fx;
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, r.y + 10, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, r.y + r.h - 10, 5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#a0522d';                                                 // stojan se zkumavkami
    ctx.fillRect(r.x + r.w / 2 - 14, r.y + r.h - 12, 28, 6);
  },
  // zídka mezi rameny schodů: bílá, nahoře černé kované zábradlí s dřevěným madlem, bílý sloupek
  stairwall(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#f4f2ee');
    drawOutline(r, '#b9b3a8');
    ctx.fillStyle = '#c69a5b'; ctx.fillRect(r.x, r.y + r.h / 2 - 2, r.w, 4);   // madlo
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.5;
    for (let x = r.x + 6; x < r.x + r.w - 20; x += 9) { ctx.beginPath(); ctx.moveTo(x, r.y + 6); ctx.lineTo(x, r.y + r.h - 6); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 10, 0, Math.PI * 2); ctx.stroke();   // kroužek jako na fotce
    drawRect({ x: r.x + r.w - 22, y: r.y - 2, w: 22, h: r.h + 4 }, '#ffffff');                 // sloupek
    drawOutline({ x: r.x + r.w - 22, y: r.y - 2, w: 22, h: r.h + 4 }, '#b9b3a8');
  },
  // obyčejná bílá zeď uvnitř místnosti
  plainwall(r) {
    drawRect(r, '#f4f2ee');
    drawOutline(r, '#b9b3a8');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; ctx.fillRect(r.x, r.y + r.h - 4, r.w, 4);
  },
  // dřevěná skříňka s kameny navrchu (fotka laborky schody)
  rockcabinet(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#8d5a2b');
    drawRect({ x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, '#a46a34');
    const rocks = ['#6d6d6d', '#9e9e9e', '#bcaaa4', '#5d4037', '#cfd8dc', '#8d8d8d'];
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = rocks[i % rocks.length];
      ctx.beginPath(); ctx.ellipse(r.x + r.w / 2 + (i % 2 ? 4 : -4), r.y + 8 + i * 10, 7, 5, i, 0, Math.PI * 2); ctx.fill();
    }
  },
});

// =====================================================================
// KRESBA MÍSTNOSTÍ
// =====================================================================
const LAB_WALL = { top: '#f5f6f4', edge: '#cfd4d6', base: '#7d8a91', outline: '#9aa3a8' };
const labFloor = () => getPattern('laborky-teraco', 80, (g, size) => drawTerrazzoTile(g, size, {
  seed: 23, tile: 80, base: '#dde3e6', grout: '#dde3e6', tileVariation: 0, density: 0.3,
  speckles: ['#9fb2bd', '#c3ced4', '#8496a1', '#b0bec5'],
}));
// zavřené dveře nakreslené do zdi (side = strana, at = poloha 0..1)
function drawFakeDoor(room, side, at, leaf, label) {
  const t = CONFIG.WALL_THICKNESS, L = 50;
  const r = side === 'left' || side === 'right'
    ? { x: side === 'left' ? room.x : room.x + room.w - t, y: room.y + room.h * at - L / 2, w: t, h: L }
    : { x: room.x + room.w * at - L / 2, y: side === 'top' ? room.y : room.y + room.h - t, w: L, h: t };
  drawRect(r, '#5a4a3a');
  drawRect({ x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 }, leaf);
  if (label) drawOutlinedText(label, r.x + r.w / 2 + (side === 'left' ? 40 : side === 'right' ? -40 : 0), r.y + r.h / 2, 'bold 10px sans-serif', '#ffffff', 'middle');
}
// výstražné kosočtverce (značky nebezpečí) na červených dveřích
function drawHazardSigns(x, y, n) {
  for (let i = 0; i < n; i++) {
    const cx = x + (i % 2) * 9, cy = y + Math.floor(i / 2) * 9;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -3, 6, 6);
    ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 1; ctx.strokeRect(-3, -3, 6, 6);
    ctx.restore();
  }
}
// světlá dlažba podest (fotka laborky schody)
function lightLanding(r) {
  drawRect(r, '#e9e6df');
  ctx.strokeStyle = 'rgba(150, 140, 125, 0.35)'; ctx.lineWidth = 1;
  for (let x = r.x + 30; x < r.x + r.w; x += 30) { ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); }
  for (let y = r.y + 30; y < r.y + r.h; y += 30) { ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); }
}
Object.assign(ROOM_ART, {
  // díl spojené chodby: od Křiváčka schody nahoru, nahoře schody doleva, vlevo dolů
  schodyLab: {
    draw(part) {
      const X = (x) => part.x + x, Y = (y) => part.y + y, L = LAB_STAIRS;
      const at = (r) => ({ x: X(r.x), y: Y(r.y), w: r.w, h: r.h });
      drawRect(part, '#f4f2ee');
      lightLanding(at(L.landing));
      drawStoneFlight(at(L.f1), 'down');    // od chodby nahoru = dolů (stoupá k jihu)
      drawStoneFlight(at(L.f2), 'right');   // doleva dolů (stoupá doprava)
      drawStoneFlight(at(L.f3), 'up');      // zpátky dolů na jih (stoupá k severu)
      ctx.fillStyle = 'rgba(30, 25, 20, 0.3)'; ctx.fillRect(X(20), Y(150), 62, 70);   // 3. rameno mizí v hloubce
      ctx.fillStyle = '#f2c81b';                                                   // žluté hrany schodů
      ctx.fillRect(X(86), Y(217), 62, 3); ctx.fillRect(X(20), Y(82), 62, 3);
      drawWallBand(part, { top: '#f5f4f0', edge: '#d8d2c6', base: '#8a8478', outline: '#9a948a' });
      // periodická tabulka na horní zdi (jako na fotce)
      drawRect({ x: X(70), y: Y(2), w: 70, h: 16 }, '#f3e2b3');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) drawRect({ x: X(73 + c * 7.4), y: Y(4 + r * 6.5), w: 6, h: 5 }, ['#7fb3d5', '#82e0aa', '#f9e79f', '#f5b7b1'][(r + c) % 4]);
      drawOutlinedText('↓ laborky', X(51), Y(130), 'bold 10px sans-serif', '#ffffff', 'middle');
    },
  },
  labChodba: {
    door: GLASS_DOOR,
    draw(room) {
      ctx.fillStyle = labFloor(); ctx.fillRect(room.x, room.y, room.w, room.h);
      const X = (x) => room.x + x, Y = (y) => room.y + y;
      drawStoneFlight({ x: X(69), y: Y(328), w: 62, h: 112 }, 'down');   // zbytek schodů – sejdou se nahoru do chodby
      ctx.fillStyle = '#f2c81b'; ctx.fillRect(X(69), Y(328), 62, 3);
      drawWallBand(room, LAB_WALL);
      drawFakeDoor(room, 'left', 0.3, '#efe6d2', 'Sklad chemikálií');
      drawFakeDoor(room, 'right', 0.45, '#efe6d2');
      // červené dveře se značkami nebezpečí vedle schodů (zamčené), hasičák a lékárnička, obrazy
      drawRect({ x: X(180), y: Y(262), w: 20, h: 54 }, '#5a1f1f'); drawRect({ x: X(183), y: Y(265), w: 14, h: 48 }, '#7b2323');
      drawHazardSigns(X(186), Y(272), 6);
      drawRect({ x: X(184), y: Y(110), w: 10, h: 22 }, '#d32f2f'); drawRect({ x: X(186), y: Y(106), w: 6, h: 5 }, '#1b1b1b');
      drawRect({ x: X(182), y: Y(40), w: 14, h: 34 }, '#fafafa'); drawRect({ x: X(186), y: Y(53), w: 6, h: 8 }, '#2e9e6e');
      drawRect({ x: X(2), y: Y(240), w: 16, h: 60 }, '#8d6e63'); drawRect({ x: X(4), y: Y(243), w: 12, h: 54 }, '#d7ccc8');
    },
  },
  laborky: {
    door: GLASS_DOOR,
    draw(room) {
      ctx.fillStyle = labFloor(); ctx.fillRect(room.x, room.y, room.w, room.h);
      drawWallBand(room, LAB_WALL);
      const X = (x) => room.x + x, Y = (y) => room.y + y;
      // bílý obklad nad pultíky
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(X(20), Y(20), 4, 400); ctx.fillRect(X(616), Y(20), 4, 400);
      // zelená tabule nahoře uprostřed
      drawRect({ x: X(250), y: Y(2), w: 140, h: 20 }, '#8a5a2e');
      drawRect({ x: X(253), y: Y(5), w: 134, h: 14 }, '#2e6b4f');
      // klenby (oblouky na stropě – jen náznak světlými pruhy přes místnost)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      for (const y of [180, 280]) ctx.fillRect(X(60), Y(y), 520, 4);
      // okna nahoře
      drawWallWindow(room, 'top', 0.12, 70, OLD_WINDOW);
      drawWallWindow(room, 'top', 0.88, 70, OLD_WINDOW);
    },
  },
});
