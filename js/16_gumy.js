// Minihra Gumy s Davidem (parkoviště)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// GUMY – David na parkovišti dá hráči nůž (úkol 'gumy' v 04_ukoly.js).
// Hráč obchází auta a u každého mezerníkem / ťuknutím propíchne gumy.
// Po parkovišti chodí učitel na dozoru (TEACHERS.dozor) a vidí před sebe
// (kužel PRANK.VIEW_*); auta a budova mu zakrývají výhled. Když hráče
// uvidí, hráč skončí sám v ředitelně (David zůstane na parkovišti) a gumy
// se opraví – znovu se začne u Davida. Když jsou propíchnutá všechna auta,
// úkol je splněný.
// =====================================================================
const PRANK = {
  ROOM: 'parkoviste',
  WATCHER: 'dozor',
  VIEW_RANGE: 230,        // jak daleko dozor vidí (px)
  VIEW_HALF_ANGLE: 0.75,  // polovina úhlu kužele (rad, ≈ 43°)
  CAUGHT_ROOM: 'reditelna',
};

const prankCars = () => ROOMS[PRANK.ROOM].obstacles.filter((o) => o.kind === 'car');

function startPrank() {
  if (state.prank) return;   // už běží (hráč se Davida jen zeptal znovu)
  state.prank = { cut: 0 };
  for (const car of prankCars()) car.flat = false;
  state.toast = { text: '🔪 Máš nůž – propíchej gumy u všech aut!', t: CONFIG.TOAST_TIME };
}

function endPrank() {
  state.prank = null;
  for (const car of prankCars()) car.flat = false;   // gumy se zase nafouknou
}

// Auto, u kterého hráč stojí (jen během minihry, ještě nepropíchnuté)
function prankCarRect() {
  if (!state.prank || state.room.id !== PRANK.ROOM) return null;
  const p = state.player, r = CONFIG.TEACHER_TALK_RANGE;
  const near = { x: p.x - r, y: p.y - r, w: p.w + 2 * r, h: p.h + 2 * r };
  const car = prankCars().find((c) => !c.flat && rectsOverlap(near, c.rect));
  return car ? car.rect : null;
}

function puncture() {
  const box = prankCarRect();
  const car = box && prankCars().find((c) => c.rect === box);
  if (!car) return;
  car.flat = true;
  state.prank.cut++;
  playSound([[180, 0, 0.08], [140, 0.08, 0.25], [110, 0.3, 0.3]]);   // pssst
  state.effects.push({ x: box.x + box.w / 2, y: box.y + box.h / 2, t: 0, color: '#dfe6ea' });
  const total = prankCars().length;
  if (state.prank.cut < total) {
    state.toast = { text: `Psssst! Propíchnuto ${state.prank.cut} z ${total}`, t: CONFIG.TOAST_TIME };
    return;
  }
  state.prank = null;   // auta zůstanou na placatých gumách
  setQuestStage(QUESTS.find((q) => q.id === 'gumy'), 'done');
  state.dialog = { name: TEACHERS.david.name, color: TEACHERS.david.color,
    text: 'Hotovo, všechny gumy jsou na nule! Rychle pryč, než si toho někdo všimne.' };
}
SPOTS.push({ rect: prankCarRect, act: () => puncture(), hintDx: 0 });

// Směr pohledu dozoru = kam naposledy šel
function updateWatcherFacing(t) {
  if (t._last) {
    const dx = t.pos.x - t._last.x, dy = t.pos.y - t._last.y, d = Math.hypot(dx, dy);
    if (d > 0.01) t.face = { x: dx / d, y: dy / d };
  }
  t._last = { x: t.pos.x, y: t.pos.y };
  if (!t.face) t.face = { x: -1, y: 0 };
}

// Vidí dozor bod (x, y)? Kužel před ním a nic pevného (auto, budka, budova) mezi nimi.
function watcherSees(t, x, y) {
  const r = t.rect, ex = r.x + r.w / 2, ey = r.y + r.h / 2;
  const dx = x - ex, dy = y - ey, d = Math.hypot(dx, dy);
  if (d > PRANK.VIEW_RANGE) return false;
  if (d > 1 && (dx * t.face.x + dy * t.face.y) / d < Math.cos(PRANK.VIEW_HALF_ANGLE)) return false;
  const blockers = state.room.obstacles.filter((o) => o.kind === 'car' || o.kind === 'garage' || o.kind === 'void').map((o) => o.rect);
  for (let s = 8; s < d; s += 8) {
    const px = ex + dx * s / d, py = ey + dy * s / d;
    if (blockers.some((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h)) return false;
  }
  return true;
}

// Každý snímek hry (06_logika.js): odchod z parkoviště minihru zruší, dozor hlídá
function updatePrank() {
  const t = TEACHERS[PRANK.WATCHER];
  if (t && t.route) updateWatcherFacing(t);
  if (!state.prank) return;
  if (state.room.id !== PRANK.ROOM) {
    endPrank();
    state.toast = { text: 'Odešel jsi z parkoviště – nůž jsi vrátil Davidovi', t: CONFIG.TOAST_TIME };
    return;
  }
  if (!t || t.room !== PRANK.ROOM) return;
  const p = state.player;
  const seen = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]
    .some(([fx, fy]) => watcherSees(t, p.x + p.w * fx, p.y + p.h * fy));
  if (seen) prankCaught();
}

function prankCaught() {
  endPrank();
  const into = Object.values(ROOMS).flatMap((r) => r.doors).find((d) => d.to === PRANK.CAUGHT_ROOM);
  enterRoom(PRANK.CAUGHT_ROOM, into && into.spawn);
  playSound([[660, 0, 0.12], [440, 0.14, 0.3]]);
  playScene([
    { who: { name: '🏫 Ředitelna', color: '#9c2f2f' }, text: 'Mráz na dozoru tě přistihl s nožem u auta a odvedl tě rovnou do ředitelny! Nůž ti sebrali. David? Ten zůstal na parkovišti, jako by nic.' },
    { who: TEACHERS.reditelka, text: 'Romane, propichovat učitelům gumy? Pan Mráz mi všechno řekl. Tohle si zapíšu… a příště to bude dvojka z chování. Teď zmizte.' },
    { who: { name: '🏫 Ředitelna', color: '#9c2f2f' }, text: 'Když chceš, zkus to s Davidem znovu.' },
  ]);
}

// Ve světě: kužel výhledu dozoru (jen během minihry)
function drawPrankWorld() {
  if (!state.prank || state.room.id !== PRANK.ROOM) return;
  const t = TEACHERS[PRANK.WATCHER];
  if (!t || t.room !== PRANK.ROOM || !t.face) return;
  const r = t.rect, ex = r.x + r.w / 2, ey = r.y + r.h / 2;
  const a = Math.atan2(t.face.y, t.face.x);
  const g = ctx.createRadialGradient(ex, ey, 10, ex, ey, PRANK.VIEW_RANGE);
  g.addColorStop(0, 'rgba(255, 220, 90, 0.38)');
  g.addColorStop(1, 'rgba(255, 220, 90, 0.04)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.arc(ex, ey, PRANK.VIEW_RANGE, a - PRANK.VIEW_HALF_ANGLE, a + PRANK.VIEW_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
}

// V liště: kolik gum už je propíchnutých
function drawPrankHud() {
  if (!state.prank || state.screen !== 'playing') return;
  drawOutlinedText(`🔪 Gumy: ${state.prank.cut}/${prankCars().length}`, 400, CONFIG.TASK_Y + 22, 'bold 14px sans-serif', '#ffd54a', 'middle');
}
