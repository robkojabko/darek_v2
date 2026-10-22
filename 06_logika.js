// Herní logika – pohyb, dveře, rozhovory, zvonek
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// UPDATE – herní logika (volá se s pevným krokem dt)
// =====================================================================
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// Pohyb s kolizemi – zvlášť po ose X a pak Y. Díky tomu hráč
// u zdi „klouže“ podél ní a nezasekne se. Za jeden krok se hráč
// posune o ~3 px, což je výrazně méně než tloušťka zdi, takže
// zdí nemůže „proletět“.
function moveWithCollisions(body, dx, dy, solids) {
  body.x += dx;
  for (const s of solids) {
    if (!rectsOverlap(body, s)) continue;
    if (dx > 0) body.x = s.x - body.w;
    else if (dx < 0) body.x = s.x + s.w;
  }
  body.y += dy;
  for (const s of solids) {
    if (!rectsOverlap(body, s)) continue;
    if (dy > 0) body.y = s.y - body.h;
    else if (dy < 0) body.y = s.y + s.h;
  }
}

// Dveře, kterých se hráč dotýká. Zdi zůstávají pevné, takže hráč
// do dveří „narazí“; navíc musí mít střed v rozsahu dveří, aby
// je nespustil jen otřením rohu.
function findTouchedDoor(p) {
  const m = CONFIG.DOOR_TRIGGER_MARGIN;
  const near = { x: p.x - m, y: p.y - m, w: p.w + 2 * m, h: p.h + 2 * m };
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  for (const door of state.room.doors) {
    if (!rectsOverlap(near, door)) continue;
    const horizontal = door.side === 'top' || door.side === 'bottom';
    const aligned = horizontal
      ? cx >= door.x && cx <= door.x + door.w
      : cy >= door.y && cy <= door.y + door.h;
    // jen ze strany, odkud se do dveří vchází (ne zezadu přes zeď)
    const fromInside = {
      top:    cy > door.y + door.h / 2,
      bottom: cy < door.y + door.h / 2,
      left:   cx > door.x + door.w / 2,
      right:  cx < door.x + door.w / 2,
    }[door.side];
    if (aligned && fromInside) return door;
  }
  return null;
}

// Přechod: první polovina ztmavuje, v polovině se vymění místnost,
// druhá polovina rozsvěcuje
function updateTransition(dt) {
  const tr = state.transition;
  tr.t += dt;
  if (!tr.switched && tr.t >= CONFIG.TRANSITION_TIME / 2) {
    enterRoom(tr.door.to, tr.door.spawn);
    tr.switched = true;
  }
  if (tr.t >= CONFIG.TRANSITION_TIME) state.transition = null;
}

// --- Úkoly a učitelé ---
const questStage = (q) => state.quests[q.id] || 'none';
function setQuestStage(q, stage) {
  state.quests[q.id] = stage;
  state.tracked = stage === 'done' ? null : q.id;
}
// Úkoly, které ve hře jsou (zamčený úkol – locked(story) – se ukáže až později, třeba motorka)
// a jen úkoly aktuálního režimu (hlavní hra / Vrah z učebny C109)
const activeQuests = (story = state.story) => QUESTS.filter((q) => (q.mode || null) === (state.mode || null) && (!q.locked || !q.locked(story)));
const questsDone = () => activeQuests().filter((q) => questStage(q) === 'done').length;
// Úkol, který učitel právě má (první nesplněný)
const teacherQuest = (teacherId) => activeQuests().find((q) => q.teacher === teacherId && questStage(q) !== 'done') || null;
// Rozdělaný úkol s nákupem této věci (káva z bufetu i z kávovaru)
const buyQuestFor = (item) => QUESTS.find((q) => q.buy && (q.buy === item.id || q.buy === item.group) && questStage(q) === 'assigned') || null;

// Předměty, které mají být vidět v aktuální místnosti (jen u zadaných úkolů)
function visibleItems() {
  return activeQuests().filter((q) => q.item && q.item.rect && q.item.room === state.room.id && questStage(q) === 'assigned').map((q) => q.item);
}

// Obdélník zvonku ve světě (jen když je hráč ve spojené chodbě), jinak null
function bellRect() {
  if (!state.room || state.room.id !== 'chodba') return null;
  const part = state.room.parts.find((pt) => pt.id === BELL.part);
  return { x: part.frame.x + BELL.local.x, y: part.frame.y + BELL.local.y, w: BELL.local.w, h: BELL.local.h };
}

// Šachový stolek v chodbě před schody (jen ve spojené chodbě), jinak null
function chessTableRect() {
  if (!state.room || state.room.id !== 'chodba') return null;
  const o = state.room.obstacles.find((ob) => ob.kind === 'chesstable');
  return o ? o.rect : null;
}

// Fotbálek v chodbě před schody
function foosTableRect() {
  if (!state.room || state.room.id !== 'chodba') return null;
  const o = state.room.obstacles.find((ob) => ob.kind === 'foosball');
  return o ? o.rect : null;
}

// Místa, se kterými jde něco udělat (mezerník / ťuknutí) – kromě učitelů.
// rect() = obdélník ve světě nebo null, act() = co se stane, hintDx = posun bubliny
const SPOTS = [
  { rect: bellRect,       act: () => ringBell(),  hintDx: 24 },
  { rect: chessTableRect, act: () => openChess(), hintDx: 0 },
  { rect: foosTableRect,  act: () => openFoosball(), hintDx: 0 },
];

// Místo, u kterého hráč stojí (stejně blízko jako u učitele), jinak null
function nearSpot() {
  const p = state.player, r = CONFIG.TEACHER_TALK_RANGE;
  const near = { x: p.x - r, y: p.y - r, w: p.w + 2 * r, h: p.h + 2 * r };
  for (const spot of SPOTS) {
    const box = spot.rect();
    if (box && rectsOverlap(near, box)) return { ...spot, box };
  }
  return null;
}

// Zazvonění: crrr, vlny od zvonku a náhodná hláška (pokaždé jiná než minule)
function ringBell() {
  const lines = BELL.lines;
  let i = Math.floor(Math.random() * lines.length);
  if (lines.length > 1 && i === state.bellLast) i = (i + 1) % lines.length;
  state.bellLast = i;
  state.bellTime = state.time;
  const ring = [];
  for (let k = 0; k < 10; k++) ring.push([k % 2 ? 1568 : 1760, k * 0.06, 0.05]);
  playSound(ring);
  state.dialog = { name: '🔔 Vozábalová (z kanceláře)', color: TEACHERS.vozabalova.color, text: lines[i] };   // zvonek do kanceláře
}

// Učitel, se kterým může hráč právě mluvit
function nearbyTeacher() {
  const p = state.player;
  const r = CONFIG.TEACHER_TALK_RANGE;
  const near = { x: p.x - r, y: p.y - r, w: p.w + 2 * r, h: p.h + 2 * r };
  return state.teachers.find((t) => rectsOverlap(near, t.rect)) || null;
}

function pointInRect(x, y, r, tolerance) {
  return x >= r.x - tolerance && x <= r.x + r.w + tolerance &&
         y >= r.y - tolerance && y <= r.y + r.h + tolerance;
}

// Rozhovor: podle stavu úkolu vybere text a posune úkol dál
function talkTo(teacher) {
  if (teacher.talk && teacher.talk()) return;   // vlastní rozhovor (17_pribehy.js)
  const q = teacherQuest(teacher.id);
  let text;
  if (q) {
    const stage = questStage(q);
    const texts = { ...teacher.texts, ...(q.texts || {}) };   // úkol může mít vlastní texty
    if (stage === 'none') {
      text = texts.assign;
      setQuestStage(q, 'assigned');
      if (q.minigame) state.pendingMinigame = { name: q.minigame, quest: true };   // spustí se po zavření dialogu
      if (q.money) { state.money += q.money; state.toast = { text: `Dostal jsi ${q.money} Kč`, t: CONFIG.TOAST_TIME }; }
    } else if (stage === 'assigned') {
      text = texts.waiting;
      state.tracked = q.id;
      if (q.minigame) state.pendingMinigame = { name: q.minigame, quest: true };
      const price = q.buy ? BUFET_MENU.find((m) => m.id === q.buy).price : 0;
      if (q.buy && state.money < price) {   // utratil peníze za něco jiného – dostane znovu
        state.money = price;
        text += ' Tady máš ještě jednou, ať ti to vyjde.';
      }
    } else { // 'carrying' – hráč nese věc, úkol je splněný
      text = texts.thanks;
      setQuestStage(q, 'done');
    }
  } else if (teacher.songs) {
    text = teacher.texts.idle;                       // Myky: pak výběr písničky
    state.pendingSongs = teacher.songs;
  } else if (teacher.minigame) {
    text = teacher.texts.play;                       // volná hra, s úkoly nesouvisí
    state.pendingMinigame = { name: teacher.minigame, quest: false };
  } else {
    text = teacher.texts.idle || CONFIG.TEACHER_IDLE_TEXT;
  }
  state.dialog = { name: teacher.name, color: teacher.color, text };
}

function pickUp(item) {
  setQuestStage(QUESTS.find((q) => q.item === item), 'carrying');
  state.effects.push({ x: item.rect.x + item.rect.w / 2, y: item.rect.y + item.rect.h / 2, t: 0, color: item.color });
  state.toast = { text: 'Sebral jsi: ' + item.name, t: CONFIG.TOAST_TIME };
  if (item.onPick) item.onPick();   // třeba peněženka: kolik je v ní peněz
}

function handleEvent(ev) {
  if (state.room.shop) { shopEvent(ev); return; }                  // bufet: koupit / odejít
  if (state.room.front) { state.frontWantEnter = true; return; }   // před školou: vejít do brány
  if (ev.type === 'action') {
    const t = nearbyTeacher();
    if (t) talkTo(t);
    else { const spot = nearSpot(); if (spot) spot.act(); }
    return;
  }
  // ťuknutí / kliknutí
  const hasPos = ev.x !== null;
  if (hasPos) {   // ťuknutí je v souřadnicích obrazovky – přepočítat přes přiblížení a kameru do světa
    const cam = getCamera(state.room);
    const wide = cam.zoom !== 1 ? VIEW.offX : 0;
    ev = { ...ev, x: (ev.x + wide) / cam.zoom + cam.x, y: ev.y / cam.zoom + cam.y };
  }
  const item = visibleItems().find((it) => hasPos && pointInRect(ev.x, ev.y, it.rect, CONFIG.TAP_TOLERANCE));
  if (item) {
    pickUp(item);
    return;
  }
  const t = nearbyTeacher();
  if (!t) {
    // u zvonku / šachů: ťuknout na ně, na mobilu kamkoli mimo joystick
    const spot = nearSpot();
    if (spot && ((hasPos && pointInRect(ev.x, ev.y, spot.box, CONFIG.TAP_TOLERANCE)) || (ev.touch && !ev.inJoyZone))) spot.act();
    return;
  }
  const onTeacher = hasPos && pointInRect(ev.x, ev.y, t.rect, CONFIG.TAP_TOLERANCE);
  // na učitele jde kliknout/ťuknout přímo; na mobilu stačí ťuknout kamkoli mimo joystick
  if (onTeacher || (ev.touch && !ev.inJoyZone)) talkTo(t);
}

// Animace chůze: když se hráč opravdu pohnul, běží fáze kroku a kolébání
// se plynule rozjede; když stojí, plynule se uklidní
function updateWalkAnimation(p, moving, dt) {
  const target = moving ? 1 : 0;
  p.walkBlend += (target - p.walkBlend) * Math.min(1, dt * 10);
  if (moving) p.walkPhase += dt * CONFIG.PLAYER_STEP_SPEED;
  else if (p.walkBlend < 0.02) p.walkPhase = 0;
}

function updateTimers(dt) {
  state.time += dt;
  if (state.titleTimer > 0) state.titleTimer = Math.max(0, state.titleTimer - dt);
  if (state.toast) {
    state.toast.t -= dt;
    if (state.toast.t <= 0) state.toast = null;
  }
  for (const fx of state.effects) fx.t += dt;
  state.effects = state.effects.filter((fx) => fx.t < CONFIG.PICKUP_EFFECT_TIME);
}

// Jeden krok samotné hry (obrazovka 'playing')
function updatePlaying(dt) {
  updateTimers(dt);

  // během přechodu se hráč nehýbe a vstupy se zahazují
  if (state.transition) {
    input.events.length = 0;
    updateTransition(dt);
    return;
  }

  const events = input.events.splice(0);

  // nabídka Pozastaveno / Hlavní menu: hra stojí (29_online.js)
  if (state.pauseMenu) { pauseMenuEvents(events); return; }

  // otevřený seznam hudby: hra stojí (13_katalog.js)
  if (state.musicMenu) { musicMenuEvents(events); return; }
  updateStory(dt);   // Lili, Treplev v C202, minihra s dráty (17_pribehy.js)
  // inventář, výběr peněz pro Chána, dráty u motorky: hra stojí
  if (storyOverlayEvents(events)) return;
  updateVrah(dt);   // režim Vrah z učebny C109: scény, lepení loga, Holubovo podezření (18_vrah.js)
  if (vrahOverlayEvents(events, dt)) return;

  // otevřený katalog úkolů: hra stojí, mezerník nebo ťuknutí mimo seznam ho zavře
  if (state.catalog) {
    for (const ev of events) {
      if (ev.type === 'action' || ev.x == null || !pointInRect(ev.x, ev.y, CATALOG_PANEL, 0)) { state.catalog = null; return; }
    }
    return;
  }

  // výběr písničky: šipky / mezerník, ťuknutí na řádek; Esc nebo „Teď ne“ zavře
  if (state.songMenu) {
    for (const ev of events) {
      const i = ev.type === 'action' ? state.songMenu.sel : songMenuHit(ev);
      if (i === null) continue;
      const song = state.songMenu.songs[i];
      state.songMenu = null;
      if (song) playSong(song);
      return;
    }
    return;
  }

  // otevřená mapa: hráč stojí, ostatní chodí dál (na mapě je vidět, kudy jde Kuba);
  // mezerník nebo ťuknutí kamkoli mapu zavře
  if (state.map) {
    if (events.length) { state.map = null; return; }
    updateMovingTeachers(dt);
    return;
  }

  // otevřený dialog: hráč stojí, jakákoli akce dialog zavře
  if (state.dialog) {
    if (events.length) {
      state.dialog = null;
      if (sceneNext()) return;   // další věta scény (18_vrah.js)
      if (state.pendingMinigame) startMinigame(state.pendingMinigame);
      if (state.pendingSongs) { state.songMenu = { sel: 0, songs: state.pendingSongs }; state.pendingSongs = null; }
    }
    return;
  }
  for (const ev of events) {
    handleEvent(ev);
    if (state.dialog) return;
  }

  updateHunger(dt);   // energie klesá jen při hraní, ne v dialogu ani v nabídkách
  updateMovingTeachers(dt);
  if (state.room.shop) return;                        // bufet: jen nabídka, hráč nechodí
  if (state.room.front) { updateFront(dt); return; }

  const p = state.player;
  const dir = highWobble(getMoveVector());   // po trávě od Chválové se Roman motá (17_pribehy.js)
  const oldX = p.x, oldY = p.y;
  const speed = p.speed * walkSpeedFactor();   // hlad zpomalí, káva zrychlí (17_pribehy.js)
  moveWithCollisions(p, dir.x * speed * dt, dir.y * speed * dt, state.solids);
  updateWalkAnimation(p, Math.hypot(p.x - oldX, p.y - oldY) > 0.05, dt);
  // přechod do jiné části spojené chodby – název nahoře se zvýrazní
  const area = currentAreaName(state.room);
  if (area !== state.areaName) { state.areaName = area; state.titleTimer = CONFIG.TITLE_HIGHLIGHT_TIME; }

  // sebrání předmětu příchodem k němu
  for (const item of visibleItems()) if (rectsOverlap(p, item.rect)) pickUp(item);

  updatePrank(dt);
  if (state.dialog) return;

  const door = findTouchedDoor(p);
  if (door && doorBlocked(door)) return;   // zamčená C109 (18_vrah.js)
  if (door) state.transition = { door, t: 0, switched: false };
}
