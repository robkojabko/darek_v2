// Multiplayer: hráči z různých zařízení se vidí ve stejné místnosti
// Část hry Dárek – načítá se v index.html před 15_hlavni.js.
'use strict';

// =====================================================================
// MULTIPLAYER – 1. krok: kdo má na úvodu zapnuté „Online“, vidí ostatní online
// hráče, když jsou ve stejné místnosti (postavička se jménem nad hlavou).
// Každý dál hraje svou hru – úkoly, peníze a věci zůstávají jeho, sdílí se jen,
// kde kdo stojí a co dělá (šachy, fotbálek, koš, rozhovor).
// Firebase Realtime Database přes REST, bez knihoven: vlastní poloha se posílá
// PUTem do hraci/<id>, změny ostatních chodí proudem (EventSource).
// Dokud není vyplněné DB_URL, tlačítko Online se ve hře neukáže.
// Na zkoušení jde adresa přepsat v adrese stránky: index.html?mpdb=http://localhost:8001
// =====================================================================
const MP = {
  DB_URL: 'VLOŽ_ADRESU_DATABÁZE',   // Firebase konzole → Realtime Database → adresa nahoře (https://…firebasedatabase.app)
  PATH: 'hraci',
  ON_KEY: 'hra_darek_online_v1',
  SEND_EVERY: 0.15,   // s – nejčastěji takhle se posílá vlastní poloha
  HEARTBEAT: 3,       // s – i když hráč stojí, ať ho ostatní nepovažují za odpojeného
  STALE: 12000,       // ms – kdo se tak dlouho neozval, není vidět (zavřený mobil, spadlé spojení)
  PURGE: 120000,      // ms – takhle staré záznamy se z databáze smažou
  LERP: 12,           // jak rychle cizí postavička dojede na poslední známou polohu
  COLORS: ['#8e2424', '#1f6b3a', '#6a2c8c', '#a65e12', '#0f6c7a', '#7a6a12', '#8c2c63', '#3b4a8c'],   // vesty ostatních
  ACTIVITY: { sachy: '♟', fotbalek: '⚽', kos: '🏀', mluvi: '💬', obchod: '🛒' },
  BUTTON: { x: 8, y: 38, w: 170, h: 26 },   // na úvodu pod hudbou
  BADGE: { x: 600, y: 86, w: 190, h: 18 },  // ve hře pod energií (pod časovačem speedrunu)
};
{
  const db = new URLSearchParams(location.search).get('mpdb');
  if (db) MP.DB_URL = db;
}
const mpReady = () => /^https?:\/\//.test(MP.DB_URL);
const mpUrl = (sub) => `${MP.DB_URL.replace(/\/+$/, '')}/${MP.PATH}${sub ? '/' + sub : ''}.json`;

const mp = {
  on: false,
  id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),   // jedno otevření hry = jeden hráč
  name: '',
  es: null,          // EventSource (proud změn z databáze)
  raw: {},           // kopie větve hraci/ z databáze
  others: {},        // id → { n, r, x, y, a, t, dx, dy (kreslená poloha), phase, blend, color }
  offset: null,      // čas serveru − místní čas (z vlastního záznamu, který se vrátí proudem)
  status: '',        // '' | 'connecting' | 'ok' | 'error'
  sendT: 0, beatT: 0, purgeT: 5, last: '', sending: false,
};
mp.name = cleanPlayerName(storageGet(SPEEDRUN.NAME_KEY) || '');   // stejné jméno jako do žebříčku
mp.on = mpReady() && !!mp.name && storageGet(MP.ON_KEY) === '1';

// --- Zapnutí a vypnutí (tlačítko na úvodu) ---
function setOnline(on) {
  if (on && !mp.name) {   // jméno se ptá jednou, pamatuje se (i pro žebříček)
    const name = cleanPlayerName(window.prompt(`Tvoje jméno pro ostatní hráče (max ${SPEEDRUN.NAME_MAX} znaků):`, ''));
    if (!name) return;
    mp.name = name;
    storageSet(SPEEDRUN.NAME_KEY, name);
  }
  mp.on = on;
  storageSet(MP.ON_KEY, on ? '1' : '0');
  if (on) mpConnect();
  else mpDisconnect();
}

function mpConnect() {
  if (mp.es || !mpReady() || typeof EventSource === 'undefined') return;
  mp.status = 'connecting';
  mp.raw = {};
  const es = mp.es = new EventSource(mpUrl());
  const handle = (patch) => (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    if (!msg || typeof msg.path !== 'string') return;
    mp.status = 'ok';
    const parts = msg.path.split('/').filter(Boolean);
    if (patch) for (const [k, v] of Object.entries(msg.data || {})) mpSetAt(parts.concat(k), v);
    else mpSetAt(parts, msg.data);
    mpSync();
  };
  es.addEventListener('put', handle(false));
  es.addEventListener('patch', handle(true));
  es.addEventListener('cancel', () => { mp.status = 'error'; });   // pravidla databáze čtení nedovolí
  es.onerror = () => { mp.status = 'error'; };                      // EventSource se sám znovu připojí
  mp.last = '';   // hned poslat vlastní polohu
}

function mpDisconnect() {
  if (mp.es) mp.es.close();
  mp.es = null;
  mp.raw = {};
  mp.others = {};
  mp.status = '';
  mpRemoveMe();
}

// Změna v kopii databáze podle cesty z proudu ('/', '/<id>', '/<id>/x' …)
function mpSetAt(parts, value) {
  if (!parts.length) { mp.raw = value && typeof value === 'object' ? value : {}; return; }
  let o = mp.raw;
  for (const k of parts.slice(0, -1)) {
    if (!o[k] || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  }
  const last = parts[parts.length - 1];
  if (value === null) delete o[last];
  else o[last] = value;
}

// Z kopie databáze udělá seznam ostatních hráčů (kreslená poloha zůstane, ať neskáčou)
function mpSync() {
  const mine = mp.raw[mp.id];
  if (mine && Number.isFinite(mine.t) && mp.offset === null) mp.offset = mine.t - Date.now();
  const next = {};
  for (const [id, v] of Object.entries(mp.raw)) {
    if (id === mp.id || !v || typeof v !== 'object') continue;
    if (typeof v.r !== 'string' || !Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.t)) continue;
    const o = mp.others[id] || { dx: v.x, dy: v.y, phase: 0, blend: 0, color: mpColor(id) };
    if (o.r !== v.r) { o.dx = v.x; o.dy = v.y; }   // přešel do jiné místnosti: neklouzat přes celou mapu
    Object.assign(o, { n: cleanPlayerName(v.n) || '?', r: v.r, x: v.x, y: v.y, a: typeof v.a === 'string' ? v.a : '', t: v.t });
    next[id] = o;
  }
  mp.others = next;
}

function mpColor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MP.COLORS[h % MP.COLORS.length];
}

const mpServerNow = () => Date.now() + (mp.offset || 0);
const mpAlive = (o) => mp.offset !== null && mpServerNow() - o.t < MP.STALE;
const mpOnlineCount = () => Object.values(mp.others).filter(mpAlive).length;
function mpHere() {   // ostatní ve stejné místnosti jako hráč
  if (!state.room) return [];
  return Object.values(mp.others).filter((o) => o.r === state.room.id && mpAlive(o));
}

// --- Odesílání vlastní polohy ---
function mpActivity() {
  if (state.screen === 'chess') return 'sachy';
  if (state.screen === 'foosball') return 'fotbalek';
  if (state.screen === 'basket') return 'kos';
  if (state.room && state.room.shop) return 'obchod';
  if (state.dialog || state.scene) return 'mluvi';
  return '';
}
function mpMyRecord() {
  const room = state.room, p = state.player;
  const rec = { n: mp.name, r: room.id, x: Math.round(p.x - room.x), y: Math.round(p.y - room.y) };
  const a = mpActivity();
  if (a) rec.a = a;
  return rec;
}
function mpSend(rec) {
  mp.sending = true;
  fetch(mpUrl(mp.id), { method: 'PUT', body: JSON.stringify({ ...rec, t: { '.sv': 'timestamp' } }) })
    .then((r) => { if (!r.ok) throw new Error(r.status); })
    .catch(() => { mp.status = 'error'; mp.last = ''; })
    .finally(() => { mp.sending = false; });
}
function mpRemoveMe() {
  if (!mpReady() || !mp.last) return;
  mp.last = '';
  try { fetch(mpUrl(mp.id), { method: 'DELETE', keepalive: true }).catch(() => {}); } catch (e) { /* nevadí */ }
}
// zavřená stránka: hned zmizet (jinak zmizí až po MP.STALE)
window.addEventListener('pagehide', () => { if (mp.on) mpRemoveMe(); });

// Volá se v každém kroku hry (15_hlavni.js)
function updateMultiplayer(dt) {
  if (!mp.on || !mpReady()) return;
  if (!mp.es) mpConnect();
  const inGame = state.room && ['playing', 'chess', 'foosball', 'basket'].includes(state.screen);
  mp.sendT -= dt;
  mp.beatT -= dt;
  if (inGame) {
    const rec = mpMyRecord(), key = JSON.stringify(rec);
    if (!mp.sending && mp.sendT <= 0 && (key !== mp.last || mp.beatT <= 0)) {
      mp.sendT = MP.SEND_EVERY;
      mp.beatT = MP.HEARTBEAT;
      mp.last = key;
      mpSend(rec);
    }
  } else if (mp.last && !mp.sending) mpRemoveMe();   // úvod nebo závěr: ve škole nikdo není

  // ostatní plynule dojedou na poslední polohu a u toho jdou (nohy, ruce)
  const k = 1 - Math.exp(-MP.LERP * dt);
  for (const o of Object.values(mp.others)) {
    const ddx = o.x - o.dx, ddy = o.y - o.dy, dist = Math.hypot(ddx, ddy);
    if (dist > 300) { o.dx = o.x; o.dy = o.y; }
    else { o.dx += ddx * k; o.dy += ddy * k; }
    const moving = dist > 1.5;
    o.blend += ((moving ? 1 : 0) - o.blend) * Math.min(1, dt * 10);
    if (moving) o.phase += dt * CONFIG.PLAYER_STEP_SPEED;
    else if (o.blend < 0.02) o.phase = 0;
  }

  // staré záznamy (spadlý prohlížeč bez pagehide) uklidí kdokoli, kdo je online
  mp.purgeT -= dt;
  if (mp.purgeT <= 0 && mp.offset !== null) {
    mp.purgeT = 30;
    for (const [id, v] of Object.entries(mp.raw)) {
      if (id !== mp.id && v && (!Number.isFinite(v.t) || mpServerNow() - v.t > MP.PURGE)) {
        fetch(mpUrl(id), { method: 'DELETE' }).catch(() => {});
      }
    }
  }
}

// --- Kreslení ---
// Ostatní hráči ve stejné místnosti (renderGame, před vlastním hráčem)
function drawRemotePlayers() {
  if (!mp.on || state.room.front) return;
  const room = state.room, s = CONFIG.PLAYER_SIZE;
  for (const o of mpHere().sort((a, b) => a.dy - b.dy)) {
    const x = Math.round(room.x + o.dx), y = Math.round(room.y + o.dy);
    drawCharacterShadow({ x, y, w: s, h: s });
    drawFigure(x + s / 2, y + s, o.phase, o.blend, {
      face: playerFaceImg, fallback: CONFIG.PLAYER_COLOR,
      body: o.color, check: 'rgba(255, 255, 255, 0.12)',
      collar: CONFIG.PLAYER_SHIRT, arms: CONFIG.PLAYER_SHIRT,
      pants: CONFIG.PLAYER_PANTS, shoes: CONFIG.PLAYER_SHOES,
    });
    // jméno (a co zrovna dělá) nad hlavou
    const label = (MP.ACTIVITY[o.a] ? MP.ACTIVITY[o.a] + ' ' : '') + o.n;
    ctx.font = 'bold 12px sans-serif';
    const w = Math.min(150, ctx.measureText(label).width + 12), lx = x + s / 2, ly = y + s - 80;
    roundRectPath(lx - w / 2, ly - 9, w, 18, 9);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx, ly + 1, w - 8);
  }
}

// Ve hře: kolik hráčů je online (pod energií, se speedrunem pod časovačem)
function drawOnlineBadge() {
  if (!mp.on || state.screen !== 'playing') return;
  const b = MP.BADGE, y = b.y + (state.speedrun ? 26 : 0);
  roundRectPath(b.x, y, b.w, b.h, 6);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fill();
  ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = mp.status === 'error' ? '#ff8a80' : '#ffffff';
  const n = mpOnlineCount(), here = mpHere().length;
  const text = mp.status === 'error' ? '👥 Online: bez spojení'
    : mp.status !== 'ok' ? '👥 Online: připojuji…'
    : n ? `👥 Online: ${n + 1} ${n + 1 < 5 ? 'hráči' : 'hráčů'}${here ? ` (${here} tady)` : ''}` : '👥 Online: jsi tu sám';
  ctx.fillText(text, b.x + 6, y + b.h / 2 + 1, b.w - 10);
}

// --- Tlačítko Online na úvodu ---
const onlineButtonShown = () => mpReady() && state.screen === 'title' && !state.modePick && !state.lb && !state.musicMenu;
function takeOnlineTaps() {
  if (!onlineButtonShown()) return;
  input.events = input.events.filter((ev) => {
    const hit = ev.type === 'tap' && ev.x !== null && pointInRect(ev.x, ev.y, MP.BUTTON, 4);
    if (hit) { setOnline(!mp.on); playSound([[660, 0, 0.05]]); }
    return !hit;
  });
}
function drawOnlineButton() {
  if (!onlineButtonShown()) return;
  const b = MP.BUTTON;
  roundRectPath(b.x, b.y, b.w, b.h, 6);
  ctx.fillStyle = mp.on ? 'rgba(46, 125, 50, 0.85)' : 'rgba(0, 0, 0, 0.45)';
  ctx.fill();
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  const n = mpOnlineCount();
  const text = !mp.on ? '👥 Online: VYP' : `👥 Online: ZAP${n ? ` (${n} ve hře)` : ''}`;
  ctx.fillText(text, b.x + 8, b.y + b.h / 2 + 1, b.w - 14);
}

if (mp.on) mpConnect();
