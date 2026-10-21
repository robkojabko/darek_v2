// Speedrun režim: časovač, výběr režimu při nové hře, nejlepší čas
// Část hry Dárek – načítá se v index.html před 15_hlavni.js.
'use strict';

// =====================================================================
// SPEEDRUN – časovač běží jen v režimu Speedrun (vybírá se při založení nové hry).
// state.speedrun = null (normální hra) | { t: sekundy, done?, record?, best? }
// Čas se sčítá z kroků hry (dt), takže se zastaví sám, když je záložka schovaná
// nebo zamčený mobil. Ukládá se spolu s postupem (saveProgress → speedrun).
// =====================================================================
const SPEEDRUN = {
  // Časovač stojí v inventáři, katalogu úkolů, mapě a seznamech hudby (vždy).
  // true = stojí i v dialozích, scénách, volbách a výběru peněz pro Chána.
  // Minihry u tabule (Damien, Robin – state.board) se počítají vždy.
  PAUSE_IN_DIALOG: false,
  BEST_KEY: 'hra_darek_speedrun_best_v1',   // + '_' + režim (hra / vrah)
  AUTOSAVE: 5,   // v minihrách (šachy, fotbálek, koš) se ukládá po těchto sekundách
  HUD: { x: 600, y: 86, w: 190, h: 22 },    // pod ukazatelem energie
};
state.speedrun = null;
state.modePick = null;   // otevřený výběr režimu { sel, next }

function formatRunTime(sec) {
  const cs = Math.floor(Math.max(0, sec) * 100);
  const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, s = Math.floor(cs / 100) % 60, c = cs % 100;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}.${p(c)}` : `${m}:${p(s)}.${p(c)}`;
}

// Stojí časovač kvůli otevřenému menu?
function speedrunPaused() {
  if (state.inventory || state.catalog || state.map || state.musicMenu || state.songMenu) return true;
  if (SPEEDRUN.PAUSE_IN_DIALOG && (state.dialog || state.scene || state.choice || state.giveMenu)) return true;
  return false;
}
function speedrunRunning() {
  const s = state.speedrun;
  if (!s || s.done || document.hidden) return false;
  if (state.screen === 'basket' || state.screen === 'chess' || state.screen === 'foosball') return true;   // minihry se počítají
  return state.screen === 'playing' && !speedrunPaused();
}
let speedrunSavedAt = 0;
function tickSpeedrun(dt) {
  if (!speedrunRunning()) return;
  const s = state.speedrun;
  s.t += dt;
  // v minihrách neběží watchProgress, tak ukládáme tady (jinak by zavření stránky ztratilo čas)
  if (state.screen !== 'playing' && s.t - speedrunSavedAt >= SPEEDRUN.AUTOSAVE) { speedrunSavedAt = s.t; saveProgress(); }
  else if (state.screen === 'playing') speedrunSavedAt = s.t;
}

// Konec hry: čas se zastaví a porovná s nejlepším (každý režim má svůj rekord)
function finishSpeedrun() {
  const s = state.speedrun;
  if (!s || s.done) return;
  s.done = true;
  const key = `${SPEEDRUN.BEST_KEY}_${state.mode === 'vrah' ? 'vrah' : 'hra'}`;
  const prev = parseFloat(storageGet(key));
  s.record = !(prev > 0) || s.t < prev;
  s.best = s.record ? s.t : prev;
  if (s.record) storageSet(key, String(s.t));
}

// --- Časovač v rohu hry ---
function drawSpeedrunTimer() {
  const s = state.speedrun;
  if (!s || state.screen !== 'playing') return;
  const b = SPEEDRUN.HUD, paused = speedrunPaused();
  roundRectPath(b.x, b.y, b.w, b.h, 6);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.fill();
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = paused ? '#ffd54a' : '#ffffff';
  ctx.fillText(formatRunTime(s.t), b.x + b.w - 8, b.y + b.h / 2 + 1);
  ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(paused ? '⏸' : '⏱', b.x + 7, b.y + b.h / 2 + 1);
}

// --- Výběr režimu při nové hře (úvod i závěr) ---
const MODE_PANEL = { x: 180, y: 170, w: 440, h: 250 };
const modeRows = () => [0, 1].map((i) => ({ x: MODE_PANEL.x + 20, y: MODE_PANEL.y + 70 + i * 62, w: MODE_PANEL.w - 40, h: 52 }));
const MODE_OPTIONS = [
  { label: 'Normální hra', note: '' },
  { label: '⏱ Speedrun', note: 'časovač' },
];
function pickMode(next) { state.modePick = { sel: 0, next }; }

function modePickEvents(events) {
  const m = state.modePick;
  for (const ev of events) {
    let i = null;
    if (ev.type === 'action') i = m.sel;
    else if (ev.x != null) {
      const hit = modeRows().findIndex((r) => pointInRect(ev.x, ev.y, r, 0));
      if (hit >= 0) i = hit;
      else if (!pointInRect(ev.x, ev.y, MODE_PANEL, 0)) { state.modePick = null; return; }   // ťuknutí mimo = zpět
    }
    if (i === null) continue;
    state.modePick = null;
    playSound([[660, 0, 0.05]]);
    m.next(i === 1);
    return;
  }
}
window.addEventListener('keydown', (e) => {
  if (!state.modePick) return;
  if (e.code === 'Escape') state.modePick = null;
  else if (KEYMAP.up.includes(e.code) || KEYMAP.left.includes(e.code)) state.modePick.sel = 0;
  else if (KEYMAP.down.includes(e.code) || KEYMAP.right.includes(e.code)) state.modePick.sel = 1;
});

function drawModePick() {
  const m = state.modePick;
  if (!m) return;
  const P = MODE_PANEL;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(-VIEW.offX, 0, CONFIG.WIDTH + 2 * VIEW.offX, CONFIG.HEIGHT);
  roundRectPath(P.x, P.y, P.w, P.h, 14);
  ctx.fillStyle = '#f4ecd8'; ctx.fill();
  ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 4; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 21px sans-serif'; ctx.fillStyle = '#3b2a1c';
  ctx.fillText('Nová hra – vyber režim', P.x + P.w / 2, P.y + 36, P.w - 30);
  modeRows().forEach((r, i) => {
    const o = MODE_OPTIONS[i];
    roundRectPath(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = i === m.sel && !isTouchHint() ? '#ffe9a8' : '#fffaf0'; ctx.fill();
    ctx.strokeStyle = 'rgba(59, 42, 28, 0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = '#2b1d14'; ctx.textAlign = 'left';
    ctx.fillText(o.label, r.x + 16, r.y + r.h / 2 + 1);
    if (o.note) { ctx.textAlign = 'right'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#9e9e9e'; ctx.fillText(o.note.toUpperCase(), r.x + r.w - 14, r.y + r.h / 2 + 1); }
  });
  ctx.textAlign = 'center'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#6d5a48';
  ctx.fillText(isTouchHint() ? 'Ťuknutí mimo = zpět' : 'Šipky + mezerník, Esc = zpět', P.x + P.w / 2, P.y + P.h - 16);
}

// =====================================================================
// ŽEBŘÍČEK – Firebase Firestore přes REST (bez knihoven a bez přihlášení).
// Hráč po dohrání zadá jméno a čas se odešle rovnou z hry. Každý režim má vlastní
// kolekci (scores_hra, scores_vrah). Pravidla (firestore.rules) dovolí číst a přidávat
// platné záznamy, ale nic upravit ani smazat. apiKey webové aplikace Firebase není tajný –
// chrání to právě pravidla. Dokud nejsou vyplněné údaje níž, žebříček se ve hře nezobrazí.
// =====================================================================
Object.assign(SPEEDRUN, {
  FIREBASE: { projectId: 'darek-30b0c', apiKey: 'AIzaSyACbnxZ7k6KKPNNbJAVsIgglxPY9qF6GBw' },   // Firebase konzole → ⚙ Nastavení projektu → Vaše aplikace
  NAME_KEY: 'hra_darek_jmeno_v1',
  NAME_MAX: 16,
  LB_PANEL: { x: 130, y: 60, w: 540, h: 440 },
  LB_ROWS: 10,
});
const leaderboardReady = () => !/VLOŽ_/.test(SPEEDRUN.FIREBASE.projectId + SPEEDRUN.FIREBASE.apiKey);
const fsBase = () => `https://firestore.googleapis.com/v1/projects/${SPEEDRUN.FIREBASE.projectId}/databases/(default)/documents`;
const fsKey = () => `key=${encodeURIComponent(SPEEDRUN.FIREBASE.apiKey)}`;
const scoreCollection = (mode) => (mode === 'vrah' ? 'scores_vrah' : 'scores_hra');
state.lb = null;   // otevřený žebříček { mode: 'hra' | 'vrah', data: { hra, vrah }, loading, error }

function cleanPlayerName(raw) {
  return String(raw || '').replace(/[\u0000-\u001f\u007f<>`@\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, SPEEDRUN.NAME_MAX);
}

// --- Firestore: odeslání a načtení ---
async function postScore(mode, name, time) {
  const body = { fields: {
    name: { stringValue: name },
    time: { doubleValue: Math.round(time * 100) / 100 },
    date: { stringValue: new Date().toISOString().slice(0, 10) },
  } };
  const r = await fetch(`${fsBase()}/${scoreCollection(mode)}?${fsKey()}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.status);
}
async function fetchTopScores(mode) {
  const query = { structuredQuery: {
    from: [{ collectionId: scoreCollection(mode) }],
    orderBy: [{ field: { fieldPath: 'time' }, direction: 'ASCENDING' }],
    limit: SPEEDRUN.LB_ROWS,
  } };
  const r = await fetch(`${fsBase()}:runQuery?${fsKey()}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query),
  });
  if (!r.ok) throw new Error(r.status);
  return (await r.json()).filter((x) => x.document).map((x) => {
    const f = x.document.fields || {};
    return { name: f.name ? f.name.stringValue : '?', time: Number(f.time && (f.time.doubleValue ?? f.time.integerValue)) || 0 };
  });
}

// --- Odeslání času po dohrání: jméno (prompt) → rovnou do Firestore ---
function scoreButtonLabel() {
  const s = state.speedrun;
  if (s && s.submitted) return '🏆 Žebříček';
  if (s && s.sending) return '… Odesílám';
  return s && s.failed ? '⚠ Zkusit znovu' : '🏆 Odeslat čas';
}
function scoreButtonPress() {
  const s = state.speedrun;
  if (!s || !s.done || s.sending) return;
  const mode = state.mode === 'vrah' ? 'vrah' : 'hra';
  if (s.submitted) { openLeaderboard(mode); return; }
  if (!s.name) {   // jméno se ptá jednou, pamatuje se pro příště
    const name = cleanPlayerName(window.prompt(`Jméno do žebříčku (max ${SPEEDRUN.NAME_MAX} znaků):`, storageGet(SPEEDRUN.NAME_KEY) || ''));
    if (!name) return;
    s.name = name;
    storageSet(SPEEDRUN.NAME_KEY, name);
  }
  s.sending = true; s.failed = false;
  postScore(mode, s.name, s.t)
    .then(() => { s.sending = false; s.submitted = true; openLeaderboard(mode); })
    .catch(() => { s.sending = false; s.failed = true; });
}

// --- Žebříček: načtení a okno ---
function openLeaderboard(mode) {
  const lb = state.lb = { mode, data: null, loading: true, error: false };
  Promise.all([fetchTopScores('hra'), fetchTopScores('vrah')])
    .then(([hra, vrah]) => { lb.data = { hra, vrah }; lb.loading = false; })
    .catch(() => { lb.error = true; lb.loading = false; });
}
const lbTabs = () => [
  { mode: 'hra', label: 'Hlavní hra', rect: { x: SPEEDRUN.LB_PANEL.x + 24, y: SPEEDRUN.LB_PANEL.y + 56, w: 230, h: 34 } },
  { mode: 'vrah', label: 'Vrah z C109', rect: { x: SPEEDRUN.LB_PANEL.x + 266, y: SPEEDRUN.LB_PANEL.y + 56, w: 230, h: 34 } },
];
function leaderboardEvents(events) {
  for (const ev of events) {
    if (ev.type === 'action') { state.lb = null; return; }
    if (ev.x == null) continue;
    const tab = lbTabs().find((t) => pointInRect(ev.x, ev.y, t.rect, 0));
    if (tab) { state.lb.mode = tab.mode; continue; }
    if (!pointInRect(ev.x, ev.y, SPEEDRUN.LB_PANEL, 0)) { state.lb = null; return; }
  }
}
window.addEventListener('keydown', (e) => {
  if (!state.lb) return;
  if (e.code === 'Escape') state.lb = null;
  else if (KEYMAP.left.includes(e.code)) state.lb.mode = 'hra';
  else if (KEYMAP.right.includes(e.code)) state.lb.mode = 'vrah';
});
function drawLeaderboard() {
  const lb = state.lb;
  if (!lb) return;
  const P = SPEEDRUN.LB_PANEL;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(-VIEW.offX, 0, CONFIG.WIDTH + 2 * VIEW.offX, CONFIG.HEIGHT);
  roundRectPath(P.x, P.y, P.w, P.h, 14);
  ctx.fillStyle = '#f4ecd8'; ctx.fill();
  ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 4; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 21px sans-serif'; ctx.fillStyle = '#3b2a1c';
  ctx.fillText('🏆 Žebříček – speedrun', P.x + P.w / 2, P.y + 28, P.w - 30);
  for (const t of lbTabs()) {
    const on = t.mode === lb.mode, r = t.rect;
    roundRectPath(r.x, r.y, r.w, r.h, 8);
    ctx.fillStyle = on ? '#ffe9a8' : '#fffaf0'; ctx.fill();
    ctx.strokeStyle = on ? '#8a5a2e' : 'rgba(59, 42, 28, 0.25)'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke();
    ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#2b1d14'; ctx.textAlign = 'center';
    ctx.fillText(t.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  }
  const list = lb.data && Array.isArray(lb.data[lb.mode]) ? lb.data[lb.mode].slice(0, SPEEDRUN.LB_ROWS) : [];
  const y0 = P.y + 112, rowH = 29;
  if (lb.loading || lb.error || !list.length) {
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#6d5a48'; ctx.textAlign = 'center';
    ctx.fillText(lb.loading ? 'Načítám…' : lb.error ? 'Žebříček se nepodařilo načíst.' : 'Zatím tu nikdo není – buď první!', P.x + P.w / 2, y0 + 60);
  }
  list.forEach((e, i) => {
    const y = y0 + i * rowH;
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(138, 90, 46, 0.1)'; ctx.fillRect(P.x + 20, y - rowH / 2, P.w - 40, rowH); }
    ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = i < 3 ? '#b8860b' : '#2b1d14'; ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.`, P.x + 32, y);
    ctx.fillStyle = '#2b1d14';
    ctx.fillText(String(e.name || '?').slice(0, SPEEDRUN.NAME_MAX), P.x + 74, y, 260);
    ctx.textAlign = 'right'; ctx.font = 'bold 16px monospace';
    ctx.fillText(formatRunTime(Number(e.time) || 0), P.x + P.w - 32, y);
  });
  ctx.textAlign = 'center'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#6d5a48';
  ctx.fillText(isTouchHint() ? 'Ťuknutí mimo = zavřít' : 'Šipky = přepnout, Esc = zavřít', P.x + P.w / 2, P.y + P.h - 16);
}
