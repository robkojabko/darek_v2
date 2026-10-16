// Další lidé ve škole: Terka s Rauscherem (pomlouvají Holuba), Kabinet tělocvikářů (Láďa),
// Kabinet Chválová (tráva a kouř), ředitelka, Vozábalová, Švecová
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// KABINETY
//   kabinet6     – vedle tělocvičny, přejmenovaný na Kabinet tělocvikářů: Láďa
//   kabinetA216  – na konci chodby v 1. patře A, přejmenovaný na Kabinet Chválová:
//                  Chválová, tráva v květináčích a kouř
// =====================================================================
Object.assign(ROOMS.kabinet6, { name: 'Kabinet tělocvikářů', where: 'v kabinetu tělocvikářů' });
ROOMS.kabinet6.obstacles.push({ kind: 'ballcrate', at: { x: 0.2, y: 0.8 }, w: 60, h: 36 });   // koš s míči
// podle „kabinet ch..jpg“: stůl do L vpravo nahoře (podél horní zdi a kus dolů), dveře do sborovny
// na horní zdi vlevo (ve sborovně jsou vpravo dole); z jejích dveří jde kouř i do sborovny a na chodbu
Object.assign(ROOMS.kabinetA216, { name: 'Kabinet Chválová', where: 'v kabinetu Chválové' });
ROOMS.kabinetA216.doors.push({ side: 'top', at: 0.25, to: 'sborovna' });
ROOMS.sborovna.doors.push({ side: 'right', at: 0.85, to: 'kabinetA216' });
ROOMS.kabinetA216.obstacles = [
  { kind: 'desk', at: { x: 222 / 300, y: 38 / 260 }, w: 116, h: 36, chairs: false },   // stůl do L: podél horní zdi
  { kind: 'desk', at: { x: 183 / 300, y: 78 / 260 }, w: 36, h: 44, chairs: false },    // … a kus dolů
  { kind: 'shelf', at: { x: 270 / 300, y: 0.55 }, w: 20, h: 120 },
  { kind: 'grassplant', at: { x: 0.1, y: 0.32 }, w: 34, h: 34 },
  { kind: 'grassplant', at: { x: 0.15, y: 0.84 }, w: 34, h: 34 },
  { kind: 'grassplant', at: { x: 0.75, y: 0.88 }, w: 30, h: 30 },
];

// kouř, který se valí z kabinetu Chválové do sborovny a na chodbu (kreslí se přes podlahu)
function drawSmokeLeak() {
  for (const room of [ROOMS.sborovna, ROOMS.patroA]) {
    if (state.room !== room) continue;
    const door = (room.doors || []).find((d) => d.to === 'kabinetA216');
    if (!door) continue;
    const inward = { left: [1, 0], right: [-1, 0], top: [0, 1], bottom: [0, -1] }[door.side];
    const cx = door.x + door.w / 2, cy = door.y + door.h / 2;
    for (let i = 0; i < 5; i++) {
      const k = (state.time * 0.12 + i / 5) % 1;
      const side = Math.sin(state.time * 0.9 + i * 1.7) * 14;
      const x = cx + inward[0] * (6 + k * 70) + inward[1] * side, y = cy + inward[1] * (6 + k * 70) + inward[0] * side - k * 10;
      ctx.fillStyle = `rgba(215, 220, 210, ${0.42 * Math.sin(k * Math.PI)})`;
      ctx.beginPath(); ctx.arc(x, y, 10 + k * 18, 0, Math.PI * 2); ctx.fill();
    }
  }
}

Object.assign(OBSTACLE_ART, {
  // koš s míči (basket, volejbal, fotbal)
  ballcrate(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#5d4037');
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1.5;
    for (let x = r.x + 6; x < r.x + r.w; x += 8) { ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); }
    const balls = [['#e67e22', 12], ['#fafafa', 34], ['#f1c40f', 22], ['#e67e22', 46]];
    balls.forEach(([c, x], i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.x + x, r.y + 12 + (i % 2) * 12, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; ctx.lineWidth = 1; ctx.stroke();
    });
  },
  // „tráva“ v květináči – vějíře zubatých lístků
  grassplant(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    drawShadow(r, SHADOW_LOW);
    ctx.fillStyle = '#8d5a3b'; ctx.beginPath(); ctx.arc(cx, cy, r.w * 0.32, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.translate(cx + (k - 1) * 4, cy + (k % 2) * 3); ctx.rotate(k * 2.1);
      for (let i = -3; i <= 3; i++) {   // sedm lístků do vějíře
        ctx.save(); ctx.rotate(i * 0.38);
        ctx.fillStyle = i % 2 ? '#2e7d32' : '#43a047';
        ctx.beginPath(); ctx.ellipse(0, -r.h * 0.28, 2.6, r.h * (0.32 - Math.abs(i) * 0.04), 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  },
});
Object.assign(ROOM_ART, {
  kabinetA216: (() => {
    const base = ROOM_ART.kabinetA216;
    return {
      door: base.door,
      draw(room) { base.draw(room); },
      // kouř přes celou místnost (kreslí se až přes nábytek)
      drawOver(room) {
        for (let i = 0; i < 9; i++) {
          const k = (state.time * 0.08 + i / 9) % 1;
          const x = room.x + 40 + ((i * 97) % (room.w - 80)) + Math.sin(state.time * 0.7 + i) * 18;
          const y = room.y + room.h - 30 - k * (room.h - 40);
          ctx.fillStyle = `rgba(210, 215, 205, ${0.28 * Math.sin(k * Math.PI)})`;
          ctx.beginPath(); ctx.arc(x, y, 22 + k * 30, 0, Math.PI * 2); ctx.fill();
        }
      },
    };
  })(),
});

// =====================================================================
// TERKA A RAUSCHER – Terka chodí vedle Rauschera (companion) a spolu pomlouvají Holuba.
// Když je hráč blízko, nad nimi se střídají bubliny; když s jedním z nich promluví,
// zahrají mu celý rozhovor (pokaždé jiný).
// =====================================================================
const GOSSIP = [
  [['rauscher', 'Viděla jsi dneska Holuba? Zase ty jeho šusťáky z devadesátek.'], ['terka', 'Prý je nosí od olympiády v Atlantě. A prý ještě nebyly prané.']],
  [['terka', 'Holub zase zabavil Mišákovi šálu.'], ['rauscher', 'Slávistickou? To bude mít v kabinetě už celou sbírku.']],
  [['rauscher', 'Holub prý vypije čtyři kafe denně.'], ['terka', 'Proto pořád lítá po chodbách jak splašený.']],
  [['terka', 'Slyšel jste, že Holub hraje basket proti studentům a nikdy neprohraje?'], ['rauscher', 'Protože si fauly píská sám.']],
  [['rauscher', 'Holub dneska dal rozcvičku na dvacet minut.'], ['terka', 'Mně stačily tři a nevěděla jsem, kde mám plíce.']],
  [['terka', 'Prý má Holub píšťalku i na spaní.'], ['rauscher', 'To je pravda. Slyšel jsem ji přes zeď kabinetu.']],
  [['rauscher', 'Holub tvrdí, že v mládí skočil šest metrů do dálky.'], ['terka', 'Jo, ze schodů. Když utíkal před ředitelkou.']],
];
function gossipTalk() {
  const i = (state.gossipIndex = ((state.gossipIndex || 0) + 1) % GOSSIP.length);
  playScene(GOSSIP[i].map(([who, text]) => ({ who: TEACHERS[who], text })));
  return true;
}
TEACHERS.terka.talk = gossipTalk;
const rauscherTalkBefore = TEACHERS.rauscher.talk;
TEACHERS.rauscher.talk = () => (rauscherTalkBefore && rauscherTalkBefore()) || gossipTalk();

// Bublina nad tím, kdo zrovna mluví (jen když je hráč poblíž)
function drawGossipBubble() {
  const r = TEACHERS.rauscher, t = TEACHERS.terka;
  if (!r.rect || !t.rect || r.room !== state.room.id || t.room !== state.room.id || state.dialog) return;
  const p = state.player;
  if (Math.hypot(p.x - r.rect.x, p.y - r.rect.y) > 240) return;
  const slot = Math.floor(state.time / 3.5), pair = GOSSIP[Math.floor(slot / 2) % GOSSIP.length], [who, text] = pair[slot % 2];
  const speaker = TEACHERS[who].rect;
  ctx.font = 'bold 11px sans-serif';
  const lines = wrapText(text, 170), w = Math.min(190, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16), h = lines.length * 14 + 10;
  const x = speaker.x + speaker.w / 2 - w / 2, y = speaker.y - 46 - h;
  roundRectPath(x, y, w, h, 8); ctx.fillStyle = 'rgba(255, 255, 255, 0.93)'; ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, y + h); ctx.lineTo(x + w / 2 + 6, y + h); ctx.lineTo(x + w / 2, y + h + 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b1d14'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 5 + i * 14));
}
