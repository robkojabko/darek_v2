// Jméno hráče, online režim (multiplayer) a nabídka „Hlavní menu“ ve hře
// Část hry Dárek – načítá se v index.html po 28_speedrun.js a před 15_hlavni.js.
'use strict';

// =====================================================================
// JMÉNO HRÁČE – ptá se jednou při prvním spuštění hry, pamatuje se mezi sezeními.
// Stejné jméno vidí ostatní online hráči i žebříček. Změna: tlačítko s jménem v úvodním menu.
// (NAME_KEY, NAME_MAX a cleanPlayerName jsou v 28_speedrun.js)
// =====================================================================
const playerName = () => cleanPlayerName(storageGet(SPEEDRUN.NAME_KEY));

function askPlayerName(current) {
  const raw = window.prompt(`Jak se jmenuješ? (max ${SPEEDRUN.NAME_MAX} znaků – uvidí to ostatní hráči i žebříček)`, current || '');
  const name = cleanPlayerName(raw);
  if (name) storageSet(SPEEDRUN.NAME_KEY, name);
  return name;
}
// Při startu hry: jméno už je uložené, nebo se zeptá. Prázdné jméno / Zrušit = hra se nespustí.
function ensurePlayerName() {
  return playerName() || askPlayerName('');
}

// =====================================================================
// ONLINE – Firebase Realtime Database přes REST + Server-Sent Events (bez knihoven).
// Každý online hráč zapisuje svou pozici do mp/players/<id> a odebírá změny ostatních.
// Ostatní hráči se kreslí ve stejné místnosti i se jménem. Postup v úkolech je pořád
// každého vlastní. Dokud není vyplněná adresa databáze, tlačítko Online se nezobrazí.
// =====================================================================
const ONLINE = {
  DATABASE_URL: 'https://darek-30b0c-default-rtdb.europe-west1.firebasedatabase.app',   // např. https://darek-30b0c-default-rtdb.europe-west1.firebasedatabase.app
  KEY: 'hra_darek_online_v1',
  SEND_EVERY: 0.25,     // s – nejčastější odesílání pozice
  HEARTBEAT: 4,         // s – i když stojím, dám vědět, že jsem tady
  STALE_HIDE: 15,       // s – hráč bez zpráv zmizí ze hry
  STALE_DELETE: 30,     // s – a jeho záznam se smaže z databáze
  MENU_BUTTON: { x: 596, y: 6, w: 34, h: 30 },             // ve hře vedle inventáře: hlavní menu
  ONLINE_BUTTON_TITLE: { x: 8, y: 36, w: 170, h: 26 },      // úvod vlevo nahoře pod hudbou
  NAME_BUTTON_TITLE: { x: 8, y: 66, w: 170, h: 26 },
  LOOKS: ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#f39c12', '#7f8c8d'],   // barvy vest ostatních hráčů
};
const onlineReady = () => !/VLOŽ_/.test(ONLINE.DATABASE_URL);
const dbUrl = () => ONLINE.DATABASE_URL.replace(/\/+$/, '');
state.online = storageGet(ONLINE.KEY) === '1';   // hráč chce být online
state.pauseMenu = null;                           // nabídka Pozastaveno / Hlavní menu { sel }
const net = { id: null, es: null, tree: {}, remote: {}, status: 'off', sendT: 0, beatT: 0, last: null, fails: 0 };

const makeId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const colorOf = (id) => [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % ONLINE.LOOKS.length;
const myUrl = () => `${dbUrl()}/mp/players/${net.id}.json`;

function setOnline(on) {
  state.online = on;
  storageSet(ONLINE.KEY, on ? '1' : '0');
}

// Strom dat z databáze: put = nahradit, patch = sloučit (null = smazat)
function setPath(path, data, merge) {
  const parts = path.split('/').filter(Boolean);
  const assign = (t, d) => { for (const k of Object.keys(d)) { if (d[k] === null) delete t[k]; else t[k] = d[k]; } };
  if (!parts.length) {
    if (merge) { if (data && typeof data === 'object') assign(net.tree, data); } else net.tree = data && typeof data === 'object' ? data : {};
    return;
  }
  let node = net.tree;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
    node = node[parts[i]];
  }
  const key = parts[parts.length - 1];
  if (merge && data && typeof data === 'object') {
    if (!node[key] || typeof node[key] !== 'object') node[key] = {};
    assign(node[key], data);
  } else if (data === null) delete node[key];
  else node[key] = data;
}

// Ze stromu se poskládají ostatní hráči (bez mě); záznamy bez změny „t“ stárnou
function syncRemote() {
  const now = Date.now();
  const seen = new Set();
  for (const [id, v] of Object.entries(net.tree)) {
    if (id === net.id || !v || typeof v.n !== 'string' || typeof v.r !== 'string' || !Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
    seen.add(id);
    let r = net.remote[id];
    if (!r) r = net.remote[id] = { x: v.x, y: v.y, w: CONFIG.PLAYER_SIZE, h: CONFIG.PLAYER_SIZE, walkPhase: 0, walkBlend: 0, lastSeen: now, lastT: v.t };
    if (r.room !== v.r) { r.x = v.x; r.y = v.y; }   // jiná místnost: bez plynulého přejíždění
    r.n = v.n; r.room = v.r; r.tx = v.x; r.ty = v.y; r.c = Number.isFinite(v.c) ? v.c : colorOf(id);
    if (v.t !== r.lastT) { r.lastT = v.t; r.lastSeen = now; }
  }
  for (const id of Object.keys(net.remote)) if (!seen.has(id)) delete net.remote[id];
}

function onlineConnect() {
  if (!net.id) net.id = makeId();
  net.status = 'connecting'; net.tree = {}; net.remote = {}; net.last = null; net.fails = 0; net.sendT = net.beatT = 0;
  const es = net.es = new EventSource(`${dbUrl()}/mp/players.json`);
  es.addEventListener('open', () => { if (net.es === es) net.status = 'online'; });
  es.addEventListener('error', () => { if (net.es === es && es.readyState !== 1) net.status = 'connecting'; });   // prohlížeč se připojí sám znovu
  for (const type of ['put', 'patch']) {
    es.addEventListener(type, (e) => {
      if (net.es !== es) return;
      try { const m = JSON.parse(e.data); setPath(m.path || '/', m.data, type === 'patch'); syncRemote(); net.status = 'online'; } catch (err) { /* poškozená zpráva se přeskočí */ }
    });
  }
}
function onlineDisconnect() {
  if (net.es) net.es.close();
  net.es = null; net.status = 'off'; net.remote = {}; net.tree = {};
  if (net.id) fetch(myUrl(), { method: 'DELETE', keepalive: true }).catch(() => {});   // zmizím z cizích her
}
window.addEventListener('pagehide', () => { if (net.es) onlineDisconnect(); });

function sendMe(room, x, y) {
  const body = JSON.stringify({ n: playerName() || 'Hráč', r: room, x, y, c: colorOf(net.id), t: Date.now() });
  fetch(myUrl(), { method: 'PUT', body })
    .then((r) => { if (!r.ok) throw new Error(r.status); net.fails = 0; if (net.status === 'error') net.status = 'online'; })
    .catch(() => { if (++net.fails >= 5) net.status = 'error'; });
}

// Volá se z update(dt): spojení běží jen ve hře a jen když je Online zapnuté
function onlineTick(dt) {
  const inGame = ['playing', 'basket', 'chess', 'foosball'].includes(state.screen);
  const want = state.online && onlineReady() && inGame;
  if (want && !net.es) onlineConnect();
  else if (!want && net.es) onlineDisconnect();
  if (!net.es) return;

  net.sendT += dt; net.beatT += dt;
  const p = state.player, room = state.room && state.room.id;
  if (room && net.sendT >= ONLINE.SEND_EVERY) {
    const x = Math.round(p.x), y = Math.round(p.y);
    const changed = !net.last || net.last.x !== x || net.last.y !== y || net.last.r !== room;
    if (changed || net.beatT >= ONLINE.HEARTBEAT) { net.sendT = 0; net.beatT = 0; net.last = { x, y, r: room }; sendMe(room, x, y); }
  }
  const now = Date.now();
  for (const [id, r] of Object.entries(net.remote)) {
    if (r.room !== room) { r.x = r.tx; r.y = r.ty; continue; }
    const ox = r.x, oy = r.y, k = Math.min(1, dt * 10);
    r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k;
    updateWalkAnimation(r, Math.hypot(r.x - ox, r.y - oy) > 0.05, dt);
    if (now - r.lastSeen > ONLINE.STALE_DELETE * 1000 && !r.deleted) {   // opuštěný záznam (zavřená karta) uklidí kdokoli
      r.deleted = true;
      fetch(`${dbUrl()}/mp/players/${id}.json`, { method: 'DELETE' }).catch(() => {});
    }
  }
}

// Ostatní hráči ve světě (volá se z renderGame před kreslením hráče)
function remoteLook(c) {
  const body = ONLINE.LOOKS[c % ONLINE.LOOKS.length];
  return { face: null, fallback: CONFIG.PLAYER_SKIN, hair: '#4a3728', body, collar: CONFIG.PLAYER_SHIRT, arms: CONFIG.PLAYER_SHIRT, pants: CONFIG.PLAYER_PANTS, shoes: CONFIG.PLAYER_SHOES };
}
function visibleRemotes() {
  if (!net.es || !state.room) return [];
  const now = Date.now();
  return Object.values(net.remote).filter((r) => r.room === state.room.id && now - r.lastSeen < ONLINE.STALE_HIDE * 1000);
}
function drawRemotePlayers() {
  for (const r of visibleRemotes().sort((a, b) => a.y - b.y)) {
    if (!inView(r, 80)) continue;   // mimo záběr (30_kvalita.js)
    const pr = { x: Math.round(r.x), y: Math.round(r.y), w: r.w, h: r.h };
    drawCharacterShadow(pr);
    drawFigure(pr.x + pr.w / 2, pr.y + pr.h, r.walkPhase, r.walkBlend, remoteLook(r.c));
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeText(r.n, pr.x + pr.w / 2, pr.y + pr.h - 62);
    ctx.fillStyle = '#ffffff'; ctx.fillText(r.n, pr.x + pr.w / 2, pr.y + pr.h - 62);
  }
}
// Stav online v rohu hry (pod časovačem, pokud běží speedrun)
function drawOnlineHud() {
  if (!net.es || state.screen !== 'playing') return;
  const y = state.speedrun ? 112 : 86;
  const text = net.status === 'error' ? '🌐 Chyba připojení'
    : net.status === 'connecting' ? '🌐 Připojuji…'
    : `🌐 Online · ${visibleRemotes().length + 1} ${visibleRemotes().length === 0 ? 'hráč' : 'hráči'}`;
  roundRectPath(600, y, 190, 20, 6);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.fill();
  ctx.font = '12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = net.status === 'error' ? '#ff8a80' : '#ffffff';
  ctx.fillText(text, 782, y + 11);
}

// =====================================================================
// ÚVODNÍ MENU: tlačítko Online a jméno (vlevo nahoře)
// =====================================================================
function titleControlsActive() {
  return state.screen === 'title' && !state.modePick && !state.lb && !state.musicMenu;
}
function takeTitleControlTaps() {
  if (!titleControlsActive()) return;
  input.events = input.events.filter((ev) => {
    if (ev.type !== 'tap' || ev.x === null) return true;
    if (pointInRect(ev.x, ev.y, ONLINE.ONLINE_BUTTON_TITLE, 4)) { if (onlineReady()) setOnline(!state.online); return false; }
    if (pointInRect(ev.x, ev.y, ONLINE.NAME_BUTTON_TITLE, 4)) { askPlayerName(playerName()); return false; }
    return true;
  });
}
function drawTitleControls() {
  if (!titleControlsActive()) return;
  const pill = (b, text, on) => {
    roundRectPath(b.x, b.y, b.w, b.h, 6);
    ctx.fillStyle = on ? 'rgba(46, 160, 67, 0.85)' : 'rgba(0, 0, 0, 0.45)'; ctx.fill();
    ctx.font = '13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
    ctx.fillText(text, b.x + 8, b.y + b.h / 2 + 1, b.w - 14);
  };
  pill(ONLINE.ONLINE_BUTTON_TITLE, onlineReady() ? `🌐 Online: ${state.online ? 'ZAP' : 'VYP'}` : '🌐 Online: nenastaveno', onlineReady() && state.online);
  const name = playerName();
  pill(ONLINE.NAME_BUTTON_TITLE, name ? `👤 ${name}` : '👤 Nastavit jméno', false);
}

// =====================================================================
// HLAVNÍ MENU VE HŘE – tlačítko vedle inventáře nebo Esc. Hra stojí, postup se uloží.
// =====================================================================
// Položky nabídky: Online se vypíná a zapíná i tady (a nabídka zůstane otevřená)
const pauseItems = () => [
  { id: 'resume', label: '▶ Pokračovat' },
  ...(onlineReady() ? [{ id: 'online', label: `🌐 Online: ${state.online ? 'ZAP' : 'VYP'}` }] : []),
  ...(onlineReady() && state.online ? [{ id: 'players', label: '👥 Hráči online' }] : []),   // 31_online_hry.js
  { id: 'quality', label: qualityLabel() },
  { id: 'menu', label: '🏠 Hlavní menu' },
];
const pausePanel = () => { const h = 100 + pauseItems().length * 62; return { x: 250, y: Math.round(CONFIG.HEIGHT / 2 - h / 2), w: 300, h }; };
const pauseRows = () => { const P = pausePanel(); return pauseItems().map((it, i) => ({ x: P.x + 20, y: P.y + 70 + i * 62, w: P.w - 40, h: 52 })); };

function canOpenPause() {
  return state.screen === 'playing' && !state.transition && !state.pauseMenu && !!state.room && !state.room.shop
    && !(state.musicMenu || state.songMenu || state.map || state.catalog || state.inventory || state.wires || state.sticker || state.labTask || state.board || state.plist || state.opick || state.dialog);
}
function takeMenuButtonTaps() {
  if (state.screen !== 'playing' || state.transition || state.pauseMenu) return;
  input.events = input.events.filter((ev) => {
    const hit = ev.type === 'tap' && ev.x !== null && pointInRect(ev.x, ev.y, ONLINE.MENU_BUTTON, 4);
    if (hit) state.pauseMenu = { sel: 0 };
    return !hit;
  });
}
function drawMenuButton() {
  if (state.screen !== 'playing') return;
  const b = ONLINE.MENU_BUTTON;
  roundRectPath(b.x, b.y, b.w, b.h, 6);
  ctx.fillStyle = state.pauseMenu ? 'rgba(255, 213, 74, 0.9)' : 'rgba(0, 0, 0, 0.45)'; ctx.fill();
  ctx.fillStyle = state.pauseMenu ? '#2b1d14' : '#ffffff';
  for (let k = 0; k < 3; k++) ctx.fillRect(b.x + 9, b.y + 8 + k * 6, 16, 3);   // ikonka ☰
}
function pauseMenuEvents(events) {
  const m = state.pauseMenu;
  for (const ev of events) {
    let i = null;
    if (ev.type === 'action') i = m.sel;
    else if (ev.x != null) {
      const hit = pauseRows().findIndex((r) => pointInRect(ev.x, ev.y, r, 0));
      if (hit >= 0) i = hit;
      else if (!pointInRect(ev.x, ev.y, pausePanel(), 0)) { state.pauseMenu = null; return; }   // ťuknutí mimo = zpět do hry
    }
    if (i === null) continue;
    const item = pauseItems()[i];
    if (item.id === 'online') { setOnline(!state.online); m.sel = i; continue; }   // zapnout / vypnout online, nabídka zůstane
    if (item.id === 'quality') { toggleQuality(); m.sel = i; continue; }          // výchozí / nízká kvalita (30_kvalita.js)
    state.pauseMenu = null;
    if (item.id === 'players') { mpOpenPlist(); return; }
    if (item.id === 'menu') { saveProgress(); goToTitle(); }   // postup (i čas speedrunu) se uloží, v menu je „Pokračovat“
    return;
  }
}
// Esc otevře / zavře nabídku (zachytí se dřív než ostatní okna, aby je Esc nezavřel a hned otevřel menu)
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || e.repeat) return;
  if (state.pauseMenu) state.pauseMenu = null;
  else if (canOpenPause()) state.pauseMenu = { sel: 0 };
}, true);
window.addEventListener('keydown', (e) => {
  if (!state.pauseMenu) return;
  if (KEYMAP.up.includes(e.code)) state.pauseMenu.sel = Math.max(0, state.pauseMenu.sel - 1);
  else if (KEYMAP.down.includes(e.code)) state.pauseMenu.sel = Math.min(pauseItems().length - 1, state.pauseMenu.sel + 1);
});
function drawPauseMenu() {
  const m = state.pauseMenu;
  if (!m) return;
  const P = pausePanel();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(-VIEW.offX, 0, CONFIG.WIDTH + 2 * VIEW.offX, CONFIG.HEIGHT);
  roundRectPath(P.x, P.y, P.w, P.h, 14);
  ctx.fillStyle = '#f4ecd8'; ctx.fill();
  ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 4; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 21px sans-serif'; ctx.fillStyle = '#3b2a1c';
  ctx.fillText('Pozastaveno', P.x + P.w / 2, P.y + 36);
  pauseRows().forEach((r, i) => {
    roundRectPath(r.x, r.y, r.w, r.h, 10);
    const it = pauseItems()[i];
    ctx.fillStyle = i === m.sel && !isTouchHint() ? '#ffe9a8' : it.id === 'online' && state.online ? '#d9f2d9' : '#fffaf0'; ctx.fill();
    ctx.strokeStyle = 'rgba(59, 42, 28, 0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = '#2b1d14'; ctx.textAlign = 'center';
    ctx.fillText(it.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  });
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#6d5a48';
  ctx.fillText(isTouchHint() ? 'Postup se uloží' : 'Šipky + mezerník, Esc = zpět do hry', P.x + P.w / 2, P.y + P.h - 16);
}
