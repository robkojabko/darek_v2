// Úkoly (QUESTS)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// ÚKOLY – dají se plnit v libovolném pořadí; seznam všech je v katalogu (Q / tlačítko).
//   id – krátký název úkolu (ukládá se do postupu, neměnit u hotových úkolů)
//   title – název v katalogu
//   teacher – id učitele z TEACHERS, který úkol zadává a kterému se věc nese
//   item.name – název předmětu ve 4. pádě („Najdi …“, „Sebral jsi: …“)
//   item.room / item.at – kde předmět leží (at jako u učitelů)
//   task – volitelný vlastní text úkolu místo „Najdi …“
//   minigame – místo předmětu minihra (zatím 'basket' = hod na koš); spustí se
//              po rozhovoru s učitelem a po úspěchu učitel hned poděkuje
// =====================================================================
const QUESTS = [
  { id: 'kos',    title: 'Hod na koš',      teacher: 'holub',     minigame: 'basket', task: 'Trefit koš – 2 koše ze 3 pokusů' },
  // David na parkovišti: propíchat gumy u všech aut, ať nás učitel na dozoru nevidí (16_gumy.js)
  // Chán u kávovaru: peněženka ve sborovně, v ní náhodně 50–300 Kč; u Chána hráč vybere, kolik mu dá (17_pribehy.js)
  { id: 'penezenka', title: 'Peněženka pro Chána', teacher: 'chan',
    item: { name: 'Chánovu peněženku', room: 'sborovna', at: { x: 300 / 520, y: 180 / 360 }, color: '#6d4c2f', icon: 'wallet' },
    texts: {
      assign: 'Romane, ty jsi můj člověk! Nechal jsem peněženku ve sborovně a bez ní si kafe nekoupím. Doběhneš mi pro ni?',
      waiting: 'Peněženka pořád nikde? Je ve sborovně, někde mezi stoly.',
    } },
  // Chánova motorka – objeví se na parkovišti, až hráč utratí peníze, které si z peněženky nechal
  { id: 'motorka', title: 'Chánova motorka', teacher: 'chan', locked: (story) => !story.motorka,
    item: { name: 'kanystr s benzínem', room: 'kabinet4', at: { x: 0.8, y: 0.75 }, color: '#d32f2f', icon: 'kanystr' },
    task: 'Najdi kanystr s benzínem (Kabinet 4)',
    carryTask: 'Oprav motorku na parkovišti – pospojuj dráty a dolij benzín',
    texts: {
      assign: 'Tak co, Romane – peníze z mý peněženky jsi utratil, co? Tak si to odpracuješ. Na parkovišti mi stojí motorka a nejede. Sežeň benzín – kanystr je v Kabinetu 4 – a pak ji oprav.',
      waiting: 'Kanystr je v Kabinetu 4. Pak hurá k motorce na parkoviště.',
    } },
  // Lili v C202 chce utéct Tomáši Klusovi; doběhne k Bečvářovi (17_pribehy.js)
  { id: 'klus', title: 'Útěk od Kluse', teacher: 'lili',
    task: 'Zabav Tomáše Kluse (C202), ať může Lili utéct', carryTask: 'Najdi Lili – kam asi utekla?' },
  // Samostatný režim Vrah z učebny C109 (mode: 'vrah', 18_vrah.js) – v hlavní hře se neukazuje
  { id: 'vrah', mode: 'vrah', title: 'Vrah z učebny C109', teacher: 'binkova' },
  { id: 'gumy',   title: 'Gumy s Davidem',  teacher: 'david', minigame: 'gumy', task: 'Propíchej gumy u všech aut – ať tě dozor nevidí' },
];

// Pohyblivý učitel: místnost a obdélník podle aktuálního místa na trase
function placeMovingTeacher(t) {
  t.room = t.route[t.seg].room;
  const room = ROOMS[t.room];
  t.rect = {
    x: Math.round(room.x + t.pos.x - CONFIG.TEACHER_W / 2),
    y: Math.round(room.y + t.pos.y - CONFIG.TEACHER_H / 2),
    w: CONFIG.TEACHER_W, h: CONFIG.TEACHER_H,
  };
}

// Posun po trase: k dalšímu bodu; na konci cesty v místnosti přejde do další
// místnosti trasy; na konci celé trasy chvíli postojí a jde zpátky.
function updateMovingTeachers(dt) {
  for (const t of Object.values(TEACHERS)) {
    if (!t.route || t.arrived) continue;
    let moved = false;
    if (t.wait > 0) {
      t.wait -= dt;
    } else {
      let left = t.speed * dt;
      while (left > 0) {
        const path = t.route[t.seg].path;
        const [tx, ty] = path[t.pt];
        const dx = tx - t.pos.x, dy = ty - t.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > left) {
          t.pos.x += dx / dist * left;
          t.pos.y += dy / dist * left;
          moved = true;
          break;
        }
        t.pos.x = tx; t.pos.y = ty;
        left -= dist;
        moved = moved || dist > 0;
        const next = t.pt + t.dirStep;
        if (next >= 0 && next < path.length) { t.pt = next; continue; }
        // konec cesty v této místnosti → další místnost trasy, nebo otočka
        const seg = t.seg + t.dirStep;
        if (seg >= 0 && seg < t.route.length) {
          t.seg = seg;
          const p2 = t.route[seg].path;
          const first = t.dirStep > 0 ? 0 : p2.length - 1;
          t.pos = { x: p2[first][0], y: p2[first][1] };
          t.pt = first + t.dirStep;
        } else if (t.once) {   // jednosměrná trasa (Lili k Bečvářovi): v cíli zůstane stát
          t.arrived = true;
          if (t.onArrive) t.onArrive(t);
          break;
        } else {
          t.dirStep = -t.dirStep;
          t.pt += t.dirStep;
          t.wait = t.pause;
          break;
        }
      }
    }
    t.walkBlend += ((moved ? 1 : 0) - t.walkBlend) * Math.min(1, dt * 8);
    if (moved) t.walkPhase += dt * CONFIG.PLAYER_STEP_SPEED * 0.6;
    if (!t.route) continue;   // v cíli zmizela (onArrive ji schoval – třeba odešla z laborky)
    placeMovingTeacher(t);
  }
  // společníci (Terka u Rauschera) jdou kousek za ním šikmo vedle
  for (const t of Object.values(TEACHERS)) if (t.companion) placeCompanion(t, TEACHERS[t.companion], dt);
  // kdo je zrovna v místnosti s hráčem (pohyblivý učitel není pevný – hráče neblokuje)
  state.teachers = Object.values(TEACHERS).filter((t) => t.room === state.room.id && t.rect);
}

// Společník: stejná místnost jako vedoucí, vedle něj (34 px bokem, 8 px za ním – podle směru chůze).
// Směr se otáčí pozvolna a společník k místu vedle vedoucího plynule dojde (bez skákání
// z boku na bok, když vedoucí zatočí nebo se na konci trasy otočí).
function placeCompanion(t, lead, dt = 1 / 60) {
  if (!lead || !lead.rect) { t.rect = null; return; }
  const c = { x: lead.rect.x + lead.rect.w / 2, y: lead.rect.y + lead.rect.h / 2 };
  if (lead._cl && lead.room === lead._clRoom) {
    const dx = c.x - lead._cl.x, dy = c.y - lead._cl.y, d = Math.hypot(dx, dy);
    if (d > 0.01 && d < 50) {
      const f = lead._cf || { x: dx / d, y: dy / d }, k = Math.min(1, dt * 3);
      const nx = f.x + (dx / d - f.x) * k, ny = f.y + (dy / d - f.y) * k, n = Math.hypot(nx, ny) || 1;
      lead._cf = { x: nx / n, y: ny / n };
    }
  }
  lead._cl = c; lead._clRoom = lead.room;
  const f = lead._cf || { x: 1, y: 0 };
  const target = { x: c.x - f.x * 8 - f.y * 34, y: c.y - f.y * 8 + f.x * 34 };
  const jump = t.room !== lead.room || !t.rect || !t._pos;
  if (jump) t._pos = { ...target };
  else {
    const dx = target.x - t._pos.x, dy = target.y - t._pos.y, d = Math.hypot(dx, dy);
    if (d > 140) t._pos = { ...target };                        // daleko (přechod mezi díly) – rovnou vedle
    else if (d > 0.5) { const step = Math.min(d, (60 + d * 3) * dt); t._pos.x += dx / d * step; t._pos.y += dy / d * step; }
  }
  t.room = lead.room;
  t.walkPhase = (lead.walkPhase || 0) + 1.6;
  t.walkBlend = lead.walkBlend || 0;
  t.rect = { x: Math.round(t._pos.x - CONFIG.TEACHER_W / 2), y: Math.round(t._pos.y - CONFIG.TEACHER_H / 2), w: CONFIG.TEACHER_W, h: CONFIG.TEACHER_H };
}

// Obdélník se středem v bodě `at` místnosti
function rectInRoom(room, at, w, h) {
  return {
    x: Math.round(room.x + room.w * at.x - w / 2),
    y: Math.round(room.y + room.h * at.y - h / 2),
    w, h,
  };
}

// Jednou při startu (po prepareRooms) dopočítá obdélníky učitelů a předmětů
function prepareCharacters() {
  for (const [id, t] of Object.entries(TEACHERS)) {
    t.id = id;
    if (t.route) {   // pohyblivý učitel začíná na začátku trasy
      t.seg = 0; t.pt = 1; t.dirStep = 1; t.wait = 0;
      t.pos = { x: t.route[0].path[0][0], y: t.route[0].path[0][1] };
      t.walkPhase = 0; t.walkBlend = 0;
      placeMovingTeacher(t);
      t.initial = t.name[0];
      continue;
    }
    if (!ROOMS[t.room]) { console.warn(`Učitel "${id}" je v neexistující místnosti "${t.room}".`); continue; }
    t.rect = rectInRoom(ROOMS[t.room], t.at, CONFIG.TEACHER_W, CONFIG.TEACHER_H);
    t.initial = t.initial || t.name.split(' ').pop()[0];
  }
  for (const q of QUESTS) {
    if (!TEACHERS[q.teacher]) console.warn(`Úkol odkazuje na neexistujícího učitele "${q.teacher}".`);
    if (!q.item) continue;   // úkol s minihrou nemá předmět
    if (!ROOMS[q.item.room]) { console.warn(`Předmět "${q.item.name}" je v neexistující místnosti "${q.item.room}".`); continue; }
    q.item.rect = rectInRoom(ROOMS[q.item.room], q.item.at, CONFIG.ITEM_SIZE, CONFIG.ITEM_SIZE);
  }
}

// Z obdélníku místnosti vyrobí 4 zdi jako seznam pevných obdélníků.
// Kolize pracují s obecným seznamem obdélníků, takže půjde snadno
// přidat i vnitřní zdi, nábytek nebo mezery pro dveře.
// Zdi místnosti pro kolize; u složené místnosti zdi dílů s vyříznutými průchody
function roomWalls(room) {
  if (!room.parts) return buildRoomWalls(room);
  let walls = room.parts.flatMap((part) => buildRoomWalls(part.frame));
  for (const hole of room.openings.concat(room.wallCuts || [])) walls = walls.flatMap((w) => subtractRect(w, hole));
  return walls;
}

// Obdélník a bez obdélníku b (0–4 kusy)
function subtractRect(a, b) {
  if (!rectsOverlap(a, b)) return [a];
  const out = [];
  const top = b.y - a.y, bottom = a.y + a.h - (b.y + b.h);
  if (top > 0) out.push({ x: a.x, y: a.y, w: a.w, h: top });
  if (bottom > 0) out.push({ x: a.x, y: b.y + b.h, w: a.w, h: bottom });
  const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
  const left = b.x - a.x, right = a.x + a.w - (b.x + b.w);
  if (left > 0) out.push({ x: a.x, y: y0, w: left, h: y1 - y0 });
  if (right > 0) out.push({ x: b.x + b.w, y: y0, w: right, h: y1 - y0 });
  return out;
}

function buildRoomWalls(room) {
  const t = CONFIG.WALL_THICKNESS;
  return [
    { x: room.x,              y: room.y,              w: room.w, h: t },      // horní
    { x: room.x,              y: room.y + room.h - t, w: room.w, h: t },      // dolní
    { x: room.x,              y: room.y,              w: t,      h: room.h }, // levá
    { x: room.x + room.w - t, y: room.y,              w: t,      h: room.h }, // pravá
  ];
}
