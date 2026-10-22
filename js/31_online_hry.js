// Online: přehled hráčů a jejich úkolů, výzva na šachy / fotbálek pro dva hráče
// Část hry Dárek – načítá se v index.html po 30_kvalita.js a před 15_hlavni.js.
'use strict';

// =====================================================================
// CO TENHLE SOUBOR DĚLÁ
//  1) Každý hráč dál hraje svůj vlastní postup, ale do svého záznamu v databázi (mp/players/<id>)
//     přidává stav úkolů (q, qm, qd, qt). Ostatní ho vidí v přehledu „👥 Hráči online“
//     (klávesa O, tlačítko vlevo od ☰, nebo Hlavní menu) i jako ✔ x/y nad hlavou hráče.
//  2) Šachy a fotbálek mají v menu řádek „Online – vyzvat hráče“. Vybereš hráče, který je
//     s tebou ve stejné místnosti; ten dostane výzvu (1 = přijmout, 2 = odmítnout, nebo tlačítka).
//  3) Zprávy mezi hráči nesou pole `m` v záznamu hráče (žádná nová cesta v databázi):
//       { to: id soupeře, g: 'chess'|'foos', id: id zápasu, st: 'ch' výzva | 'ac' přijato |
//         'de' odmítnuto | 'pl' hraje se | 'bye' odešel, … data hry }
//     Šachy: oba posílají seznam všech tahů (mv); kdo je na tahu, připisuje. Hostitel je bílý.
//     Fotbálek: hostitel (červení) počítá fyziku a posílá stav (s); host (modří) posílá
//               svou tyč (pb), kopy (kk) a ovládání prstem (au).
// =====================================================================
const MP = {
  PICK_TIMEOUT: 25,                                   // s, jak dlouho čeká výzva na odpověď
  PLIST_BUTTON: { x: 556, y: 6, w: 34, h: 30 },       // vedle tlačítka ☰
  PLIST_PANEL: { x: 60, y: 64, w: 680, h: 500 },
  PICK_PANEL: { x: 200, y: 120, w: 400, h: 360 },
  INVITE: { x: 150, y: 90, w: 500, h: 76 },
  SEND_FOOS: 0.05,                                    // s mezi zprávami u fotbálku
  RESEND: 1,                                          // s: při šachách se stav posílá aspoň takhle často
  GONE: 8,                                            // s bez živé zprávy od soupeře = odpojil se
  GAMES: { chess: 'šachy', foos: 'fotbálek' },
};
const MP_STAGE = { none: 'n', assigned: 'a', carrying: 'c', done: 'd' };
state.plist = null;    // otevřený přehled hráčů { sel }
state.opick = null;    // výběr soupeře { g, sel, phase: 'list' | 'wait' | 'msg', … }
state.invite = null;   // příchozí výzva { id, name, g, mid }
Object.assign(net, { out: null, outClear: 0, match: null, declined: {}, pos: null });

// Do menu šachů a fotbálku přibude řádek Online
CHESS.LEVELS.push({ id: 'online', name: 'Online – vyzvat hráče', reward: 0 });
FOOS.LEVELS.push({ id: 'online', name: 'Online – vyzvat hráče', reward: 0 });

// =====================================================================
// ZÁPIS DO DATABÁZE – jeden PUT po druhém (nepřeházejí se), vždy celý záznam
// =====================================================================
const mpq = { busy: false, again: false };
function mpProgress() {
  const map = {};
  for (const q of activeQuests()) { const st = questStage(q); if (st !== 'none') map[q.id] = MP_STAGE[st]; }
  return map;
}
function mpBody() {
  const p = state.player;
  const pos = net.pos || { r: state.room && state.room.id, x: Math.round(p.x), y: Math.round(p.y) };
  const b = {
    n: playerName() || 'Hráč', r: pos.r, x: pos.x, y: pos.y, c: colorOf(net.id), t: Date.now(),
    q: mpProgress(), qm: state.mode === 'vrah' ? 'vrah' : 'hra', qd: questsDone(), qt: activeQuests().length,
  };
  if (net.out) b.m = net.out;
  return JSON.stringify(b);
}
function putMe() {
  if (!net.es || !net.id) return;
  if (mpq.busy) { mpq.again = true; return; }
  mpq.busy = true;
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), 4000) : 0;
  fetch(myUrl(), { method: 'PUT', body: mpBody(), signal: ctl ? ctl.signal : undefined })
    .then((r) => { if (!r.ok) throw new Error(r.status); net.fails = 0; if (net.status === 'error') net.status = 'online'; })
    .catch(() => { if (++net.fails >= 5) net.status = 'error'; })
    .finally(() => { clearTimeout(timer); mpq.busy = false; if (mpq.again) { mpq.again = false; putMe(); } });
}
// původní odesílání pozice (29_online.js) jde přes putMe, aby neztrácelo zprávy zápasu
sendMe = function (room, x, y) { net.pos = { r: room, x, y }; putMe(); };
function mpSetOut(o, clearMs = 0) {
  net.out = o;
  net.outClear = clearMs ? Date.now() + clearMs : 0;
  putMe();
}

// Ostatní hráči: z databáze přibyl stav úkolů a „hraje“
{
  const _syncRemote = syncRemote;
  syncRemote = function () {
    _syncRemote();
    for (const [id, r] of Object.entries(net.remote)) {
      const v = net.tree[id] || {};
      r.q = v.q || {}; r.qm = v.qm || 'hra'; r.qd = v.qd; r.qt = v.qt;
      r.busy = !!(v.m && v.m.st === 'pl');
    }
  };
}

// =====================================================================
// PŘEHLED HRÁČŮ A ÚKOLŮ (O)
// =====================================================================
const mpFresh = (r) => Date.now() - r.lastSeen < ONLINE.STALE_HIDE * 1000;
function mpPlayers() {
  const me = { id: net.id, name: playerName() || 'Hráč', me: true, room: state.room && state.room.id, q: mpProgress(),
    qm: state.mode === 'vrah' ? 'vrah' : 'hra', qd: questsDone(), qt: activeQuests().length };
  const others = Object.entries(net.remote).filter(([, r]) => mpFresh(r)).map(([id, r]) => ({
    id, name: r.n, room: r.room, q: r.q || {}, qm: r.qm || 'hra', qd: r.qd, qt: r.qt, busy: r.busy }));
  const list = [me, ...others];
  for (const e of list) {
    const qs = mpQuestsOf(e);
    if (e.qt == null) e.qt = qs.length;
    if (e.qd == null) e.qd = qs.filter((q) => e.q[q.id] === 'd').length;
  }
  return list;
}
// úkoly v režimu daného hráče (zamčené, např. motorka, jen když už je odemčená)
const mpQuestsOf = (e) => QUESTS.filter((q) => (q.mode || null) === (e.qm === 'vrah' ? 'vrah' : null) && (!q.locked || e.q[q.id]));
const mpPlistRow = (i) => ({ x: MP.PLIST_PANEL.x + 16, y: MP.PLIST_PANEL.y + 70 + i * 46, w: 250, h: 40 });

function mpOpenPlist() {
  if (!net.es) { state.toast = { text: 'Zapni Online v hlavním menu', t: CONFIG.TOAST_TIME }; return; }
  if (!canOpenPause()) return;
  state.plist = { sel: 0 };
  playSound([[523, 0, 0.04], [784, 0.05, 0.05]]);
}
function mpClosePlist() { state.plist = null; }
function plistEvents(events) {
  const list = mpPlayers().slice(0, 9);
  for (const ev of events) {
    if (ev.type === 'action') { mpClosePlist(); return; }
    if (ev.x == null) continue;
    if (!pointInRect(ev.x, ev.y, MP.PLIST_PANEL, 0)) { mpClosePlist(); return; }
    const i = list.findIndex((_, k) => pointInRect(ev.x, ev.y, mpPlistRow(k), 0));
    if (i >= 0) state.plist.sel = i;
  }
}
function mpDrawPlist() {
  const L = state.plist;
  if (!L) return;
  const P = MP.PLIST_PANEL, list = mpPlayers().slice(0, 9);
  L.sel = Math.max(0, Math.min(L.sel, list.length - 1));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(-VIEW.offX, 0, CONFIG.WIDTH + 2 * VIEW.offX, CONFIG.HEIGHT);
  roundRectPath(P.x, P.y, P.w, P.h, 14);
  ctx.fillStyle = '#f4ecd8'; ctx.fill(); ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 4; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#3b2a1c';
  ctx.fillText('👥 Hráči online', P.x + 24, P.y + 32);
  ctx.font = '13px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#6b5a48';
  ctx.fillText('každý hraje svůj postup – tady vidíš cizí', P.x + P.w - 24, P.y + 32);
  ctx.fillStyle = 'rgba(59, 42, 28, 0.25)'; ctx.fillRect(P.x + 20, P.y + 56, P.w - 40, 2);
  list.forEach((e, i) => {
    const r = mpPlistRow(i);
    roundRectPath(r.x, r.y, r.w, r.h, 8);
    ctx.fillStyle = i === L.sel ? '#ffe9a8' : '#fffaf0'; ctx.fill();
    ctx.strokeStyle = 'rgba(59, 42, 28, 0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#2b1d14';
    ctx.fillText((e.me ? '⭐ ' : '') + e.name + (e.me ? ' (ty)' : ''), r.x + 10, r.y + 14, r.w - 80);
    ctx.textAlign = 'right'; ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#2e7d32';
    ctx.fillText(`✔ ${e.qd}/${e.qt}`, r.x + r.w - 10, r.y + 14);
    roundRectPath(r.x + 10, r.y + 28, r.w - 20, 5, 2); ctx.fillStyle = '#d9cfb8'; ctx.fill();
    if (e.qt) { roundRectPath(r.x + 10, r.y + 28, Math.max(4, (r.w - 20) * e.qd / e.qt), 5, 2); ctx.fillStyle = '#43a047'; ctx.fill(); }
  });
  const e = list[L.sel];
  if (!e) return;
  const X = P.x + 290;
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#3b2a1c';
  ctx.fillText(e.name + (e.qm === 'vrah' ? ' · Vrah z C109' : ''), X, P.y + 80, 380);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#6b5a48';
  ctx.fillText(`📍 ${ROOMS[e.room] ? ROOMS[e.room].name : '?'}${e.busy ? ' · právě hraje' : ''}`, X, P.y + 104, 380);
  const look = { n: ['#9e9e9e', '•', 'Nový'], a: ['#f0a020', '▶', 'Rozdělaný'], c: ['#f0a020', '▶', 'Odnáší'], d: ['#43a047', '✔', 'Hotovo'] };
  mpQuestsOf(e).slice(0, 12).forEach((q, k) => {
    const y = P.y + 136 + k * 29, L2 = look[e.q[q.id] || 'n'];
    ctx.fillStyle = L2[0]; ctx.beginPath(); ctx.arc(X + 10, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(L2[1], X + 10, y + 1);
    ctx.textAlign = 'left'; ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = e.q[q.id] === 'd' ? '#5b7a4a' : '#2b1d14';
    ctx.fillText(q.title, X + 30, y + 1, 270);
    ctx.textAlign = 'right'; ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = L2[0];
    ctx.fillText(L2[2].toUpperCase(), P.x + P.w - 28, y + 1);
  });
  ctx.textAlign = 'center'; ctx.font = '13px sans-serif'; ctx.fillStyle = '#6b5a48';
  ctx.fillText(isTouchHint() ? 'Ťukni na hráče · mimo = zavřít' : '↑ ↓ vyber hráče · O / Esc / mezerník = zavřít', P.x + P.w / 2, P.y + P.h - 14);
}
function mpDrawPlistButton() {
  if (state.screen !== 'playing' || !net.es) return;
  const b = MP.PLIST_BUTTON, c = state.plist ? '#2b1d14' : '#ffffff';
  roundRectPath(b.x, b.y, b.w, b.h, 6);
  ctx.fillStyle = state.plist ? 'rgba(255, 213, 74, 0.9)' : 'rgba(0, 0, 0, 0.45)'; ctx.fill();
  ctx.fillStyle = c;   // dvě postavy
  for (const [dx, s] of [[-6, 1], [6, 0.85]]) {
    ctx.beginPath(); ctx.arc(b.x + 17 + dx, b.y + 11, 4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x + 17 + dx, b.y + 23, 7 * s, Math.PI, 0); ctx.fill();
  }
}

// ✔ x/y nad hlavou ostatních hráčů
{
  const _drawRemote = drawRemotePlayers;
  drawRemotePlayers = function () {
    _drawRemote();
    for (const r of visibleRemotes()) {
      if (!inView(r, 80) || !r.qt) continue;
      const x = Math.round(r.x) + r.w / 2, y = Math.round(r.y) + r.h - 76, t = `✔ ${r.qd || 0}/${r.qt}`;
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeText(t, x, y); ctx.fillStyle = '#ffd54a'; ctx.fillText(t, x, y);
    }
  };
}

// =====================================================================
// VÝZVA: výběr soupeře (v menu šachů / fotbálku), příchozí výzva
// =====================================================================
const mpPickerPlayers = () => Object.entries(net.remote)
  .filter(([, r]) => r.room === (state.room && state.room.id) && mpFresh(r))
  .map(([id, r]) => ({ id, name: r.n, busy: !!r.busy, qd: r.qd || 0, qt: r.qt || 0 }));
const mpPickerRows = (n) => Array.from({ length: n }, (_, i) => ({ x: MP.PICK_PANEL.x + 20, y: MP.PICK_PANEL.y + 70 + i * 48, w: MP.PICK_PANEL.w - 40, h: 40 }));

function mpOpenPicker(g) {
  state.opick = { g, sel: 0, phase: 'list', msg: '', t: 0 };
  if (!(onlineReady() && state.online && net.es)) { state.opick.phase = 'msg'; state.opick.msg = 'Nejdřív zapni Online (Hlavní menu ve hře).'; }
}
function mpChallenge(p) {
  const O = state.opick;
  Object.assign(O, { phase: 'wait', target: p.id, tname: p.name, mid: net.id + '-' + Date.now().toString(36), t: MP.PICK_TIMEOUT });
  mpSetOut({ to: p.id, g: O.g, id: O.mid, st: 'ch' });
}
// klávesy a ťuknutí, když je otevřený výběr soupeře (volá se místo logiky šachů / fotbálku)
function mpPickerStep(keys, events) {
  const O = state.opick;
  if (!O) return;
  const players = O.phase === 'list' ? mpPickerPlayers().slice(0, 5) : [];
  const n = players.length + 1;
  O.sel = Math.min(O.sel, n - 1);
  const close = () => { if (O.phase === 'wait') mpSetOut(null); state.opick = null; };
  for (const k of keys) {
    if (k === 'Escape') { close(); return; }
    if (O.phase === 'list') {
      if (KEYMAP.up.includes(k)) O.sel = (O.sel + n - 1) % n;
      if (KEYMAP.down.includes(k)) O.sel = (O.sel + 1) % n;
    }
  }
  for (const ev of events) {
    if (O.phase === 'list') {
      const rows = mpPickerRows(n);
      const i = ev.type === 'action' ? O.sel : (ev.x == null ? -1 : rows.findIndex((r) => pointInRect(ev.x, ev.y, r, 0)));
      if (i < 0) { if (ev.x != null && !pointInRect(ev.x, ev.y, MP.PICK_PANEL, 0)) { close(); return; } continue; }
      if (i >= players.length) { close(); return; }
      if (players[i].busy) { O.flash = 'Ten hráč právě hraje.'; continue; }
      mpChallenge(players[i]);
      return;
    }
    if (ev.type === 'action' || ev.x != null) { close(); return; }   // čekání = zrušit výzvu, zpráva = zavřít
  }
}
function mpDrawPicker() {
  const O = state.opick;
  if (!O) return;
  const P = MP.PICK_PANEL;
  drawChessBox(P.x, P.y, P.w, P.h);
  drawOutlinedText(`${O.g === 'chess' ? '♟ Šachy' : '⚽ Fotbálek'} – vyzvat hráče`, 400, P.y + 34, 'bold 22px sans-serif', '#ffd54a', 'middle');
  if (O.phase === 'list') {
    const players = mpPickerPlayers().slice(0, 5), rows = mpPickerRows(players.length + 1);
    players.forEach((p, i) => drawChessButton(rows[i], `${p.name}  ·  ✔ ${p.qd}/${p.qt}${p.busy ? '  (hraje)' : ''}`,
      i === O.sel && !isTouchHint(), p.busy ? '#5a4636' : '#3d5f3a'));
    drawChessButton(rows[players.length], 'Zpět', players.length === O.sel && !isTouchHint(), '#5a4636');
    if (!players.length) drawOutlinedText('V téhle místnosti nikdo další není.', 400, P.y + 100, 'bold 15px sans-serif', '#ffffff', 'middle');
    drawOutlinedText(O.flash || 'Vyzvat jde jen hráče, který stojí v téže místnosti.', 400, P.y + P.h - 22, '12px sans-serif', '#e8d3a8', 'middle');
  } else if (O.phase === 'wait') {
    drawOutlinedText(`Čekám, až ${O.tname} přijme výzvu…`, 400, P.y + 150, 'bold 18px sans-serif', '#ffffff', 'middle');
    drawOutlinedText(String(Math.max(0, Math.ceil(O.t))), 400, P.y + 205, 'bold 44px sans-serif', '#ffd54a', 'middle');
    drawOutlinedText(isTouchHint() ? 'Ťukni = zrušit' : 'Esc / mezerník = zrušit', 400, P.y + 270, 'bold 14px sans-serif', '#e8d3a8', 'middle');
  } else {
    drawOutlinedText(O.msg, 400, P.y + 170, 'bold 17px sans-serif', '#ffffff', 'middle');
    drawOutlinedText(isTouchHint() ? 'Ťukni = zavřít' : 'Mezerník / Esc = zavřít', 400, P.y + 270, 'bold 14px sans-serif', '#e8d3a8', 'middle');
  }
}

// příchozí výzva: bublina nahoře, ve hře se dál chodí
const mpInviteShown = () => !!state.invite && state.screen === 'playing' && canOpenPause()
  && !state.choice && !state.quiz && !state.rhythm && !state.scene && !state.mop && !state.gameOver && !state.plist;
const mpInviteButtons = () => [
  { x: MP.INVITE.x + 20, y: MP.INVITE.y + 38, w: 210, h: 30 },
  { x: MP.INVITE.x + 270, y: MP.INVITE.y + 38, w: 210, h: 30 },
];
function mpDrawInvite() {
  if (!mpInviteShown()) return;
  const I = MP.INVITE, inv = state.invite;
  roundRectPath(I.x, I.y, I.w, I.h, 12);
  ctx.fillStyle = 'rgba(20, 22, 34, 0.94)'; ctx.fill(); ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(`⚔ ${inv.name} tě vyzývá na ${MP.GAMES[inv.g]}!`, I.x + I.w / 2, I.y + 20, I.w - 20);
  const [a, d] = mpInviteButtons();
  drawChessButton(a, isTouchHint() ? 'Přijmout' : '1 – Přijmout', false, '#2e7d32');
  drawChessButton(d, isTouchHint() ? 'Odmítnout' : '2 – Odmítnout', false, '#7a2a20');
}
function mpAcceptInvite() {
  const inv = state.invite;
  if (!inv) return;
  state.invite = null;
  mpSetOut({ to: inv.id, g: inv.g, id: inv.mid, st: 'ac' });
  mpStartMatch(inv.g, inv.id, inv.name, 'guest', inv.mid);
}
function mpDeclineInvite() {
  const inv = state.invite;
  if (!inv) return;
  state.invite = null;
  net.declined[inv.mid] = true;
  mpSetOut({ to: inv.id, g: inv.g, id: inv.mid, st: 'de' }, 3000);
}

// ťuknutí na tlačítka výzvy a přehledu (ještě před ostatními tlačítky)
function mpTaps() {
  if (!input.events.length) return;
  input.events = input.events.filter((ev) => {
    if (ev.type !== 'tap' || ev.x === null) return true;
    if (mpInviteShown()) {
      const [a, d] = mpInviteButtons();
      if (pointInRect(ev.x, ev.y, a, 4)) { mpAcceptInvite(); return false; }
      if (pointInRect(ev.x, ev.y, d, 4)) { mpDeclineInvite(); return false; }
    }
    if (state.screen === 'playing' && net.es && !state.pauseMenu && pointInRect(ev.x, ev.y, MP.PLIST_BUTTON, 4)) {
      if (state.plist) mpClosePlist(); else mpOpenPlist();
      return false;
    }
    return true;
  });
}
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (mpInviteShown()) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') { mpAcceptInvite(); return; }
    if (e.code === 'Digit2' || e.code === 'Numpad2') { mpDeclineInvite(); return; }
  }
  if (state.screen !== 'playing') return;
  if (e.code === 'KeyO') { if (state.plist) mpClosePlist(); else mpOpenPlist(); return; }
  if (!state.plist) return;
  if (e.code === 'Escape') mpClosePlist();
  else if (KEYMAP.up.includes(e.code)) state.plist.sel = Math.max(0, state.plist.sel - 1);
  else if (KEYMAP.down.includes(e.code)) state.plist.sel = Math.min(mpPlayers().length - 1, state.plist.sel + 1);
});

// =====================================================================
// ZÁPAS – společná část
// =====================================================================
const mpOppMsg = () => {
  const M = net.match;
  if (!M) return null;
  const v = net.tree[M.opp], m = v && v.m;
  return m && m.to === net.id && m.id === M.id ? m : null;
};
function mpStartMatch(g, oppId, oppName, role, mid) {
  net.match = { g, id: mid, opp: oppId, name: oppName, role, missT: 0 };
  state.opick = null; state.invite = null;
  if (g === 'chess') {
    if (state.screen !== 'chess') openChess();
    const c = state.chess;
    _chessNewGame({ id: 'online', name: `Online: ${oppName}`, reward: 0 });
    const color = role === 'host' ? 'w' : 'b';
    c.online = { color, moves: [], dirty: false, applyingRemote: false, rs: null, tickT: 0 };
    c.flip = color === 'b';                    // černý hraje „zdola“ – deska se mu otočí
    if (c.flip) c.cursor = 12;
    if (role === 'host') mpPublishChess();     // host ještě nesmí přepsat „přijato“ dřív, než ho soupeř uvidí
  } else {
    if (state.screen !== 'foosball') openFoosball();
    const f = state.foos, team = role === 'host' ? 'red' : 'blue';
    _foosNewGame({ id: 'online', name: `Online: ${oppName} · ty: ${team === 'red' ? 'červení' : 'modří'}`, reward: 0 });
    f.online = { team, host: role === 'host', kicks: 0, lastKicks: 0, sendT: 1, lastN: -1, n: 0, recv: null, tgtPr: null };
  }
  playSound([[523, 0, 0.08], [659, 0.09, 0.08], [784, 0.18, 0.14]]);
}
// zápas skončil u mě (odchod, zpět do menu)
function mpEndMatch() {
  const M = net.match;
  if (!M) return;
  if (state.chess) state.chess.online = null;
  if (state.foos) state.foos.online = null;
  mpSetOut({ to: M.opp, g: M.g, id: M.id, st: 'bye' }, 3000);
  net.match = null;
}
// soupeř odešel / spadlo spojení: rozehraná partie se ukončí s hláškou
function mpAbort(text) {
  const M = net.match;
  if (!M) return;
  if (M.g === 'chess' && state.chess) {
    const c = state.chess;
    if (c.phase === 'play') Object.assign(c, { phase: 'over', overSel: 0, promo: null, confirmQuit: false, result: { how: 'left', winner: null }, msg: text });
    c.online = null;
  }
  if (M.g === 'foos' && state.foos) {
    const f = state.foos;
    if (f.phase !== 'over') Object.assign(f, { phase: 'over', overSel: 0, confirmQuit: false, msg: text });
    f.online = null;
  }
  mpSetOut({ to: M.opp, g: M.g, id: M.id, st: 'bye' }, 3000);
  net.match = null;
}

function mpTick(dt) {
  const now = Date.now();
  if (net.outClear && now > net.outClear) { net.outClear = 0; if (!net.match) mpSetOut(null); }
  if (!net.es) {
    if (net.match) mpAbort('Spojení bylo ukončeno.');
    state.invite = null; state.plist = null;
    if (state.opick && state.opick.phase === 'wait') state.opick = null;
    return;
  }
  if (!net.match) {   // příchozí výzva
    let found = null;
    for (const [id, v] of Object.entries(net.tree)) {
      const m = id !== net.id && v && v.m, r = net.remote[id];
      if (m && r && mpFresh(r) && m.to === net.id && m.st === 'ch' && MP.GAMES[m.g] && !net.declined[m.id]) { found = { id, name: v.n || 'Hráč', g: m.g, mid: m.id }; break; }
    }
    if (found && (!state.invite || state.invite.mid !== found.mid)) { state.invite = found; playSound([[880, 0, 0.08], [1175, 0.1, 0.1]]); }
    if (!found) state.invite = null;
  } else state.invite = null;

  const O = state.opick;   // odpověď na moji výzvu
  if (O && O.phase === 'wait') {
    O.t -= dt;
    const v = net.tree[O.target], m = v && v.m, mine = m && m.to === net.id && m.id === O.mid;
    if (mine && (m.st === 'ac' || m.st === 'pl')) mpStartMatch(O.g, O.target, O.tname, 'host', O.mid);
    else if (mine && m.st === 'de') { O.phase = 'msg'; O.msg = `${O.tname} výzvu odmítl.`; mpSetOut(null); }
    else if (O.t <= 0) { O.phase = 'msg'; O.msg = `${O.tname} neodpověděl.`; mpSetOut(null); }
  }
  if (net.match) mpTickMatch(dt);
}
function mpTickMatch(dt) {
  const M = net.match, m = mpOppMsg(), r = net.remote[M.opp];
  if (m && m.st === 'bye') { mpAbort(`${M.name} odešel ze hry.`); return; }
  M.missT = m ? 0 : M.missT + dt;
  if (M.missT > 5 || !r || Date.now() - r.lastSeen > MP.GONE * 1000) { mpAbort(`${M.name} se odpojil.`); return; }
  if (M.g === 'chess') mpTickChess(dt, m);
  else if (state.foos && state.foos.phase === 'menu') mpEndMatch();
}

// zapojení do herní smyčky (update() v 15_hlavni.js volá onlineTick)
let mpLastSig = '';
{
  const _onlineTick = onlineTick;
  onlineTick = function (dt) {
    mpTaps();
    _onlineTick(dt);
    if (net.es) {   // změnil se postup v úkolech → pošlu to hned (ne až při dalším tlukotu)
      const sig = (state.mode || '') + QUESTS.map((q) => questStage(q)[0]).join('');
      if (sig !== mpLastSig) { mpLastSig = sig; net.beatT = ONLINE.HEARTBEAT; }
    }
    mpTick(dt);
  };
}
{
  const _drawLeaderboard = drawLeaderboard;
  drawLeaderboard = function () {   // poslední věc, co render() kreslí – okna online jsou nad vším
    _drawLeaderboard();
    mpDrawPlistButton();
    mpDrawPlist();
    mpDrawInvite();
    mpDrawPicker();
  };
}

// =====================================================================
// ŠACHY ONLINE – hostitel je bílý, host černý (jemu se deska otočí). Posílá se seznam tahů.
// =====================================================================
const mpMoveEnc = (m) => m.from + ',' + m.to + (m.promo || '');
const mpMoveDec = (s) => { const x = /^(\d+),(\d+)([QRBN]?)$/.exec(s); return x ? { from: +x[1], to: +x[2], promo: x[3] || '' } : null; };

const _chessNewGame = chessNewGame;
chessNewGame = function (level) {
  if (level.id === 'online') { mpOpenPicker('chess'); return; }
  if (state.chess) state.chess.flip = false;
  _chessNewGame(level);
};
const _chessApply = chessApply;
chessApply = function (c, m) {
  if (c.online) { c.online.moves.push(mpMoveEnc(m)); if (!c.online.applyingRemote) c.online.dirty = true; }
  _chessApply(c, m);
};
const _chessFinish = chessFinish;
chessFinish = function (c, how, who) {
  if (!c.online) return _chessFinish(c, how);
  const mine = c.online.color;
  Object.assign(c, { phase: 'over', overSel: 0, confirmQuit: false, promo: null });
  let winner = null;
  if (how === 'mate') winner = c.pos.turn === 'w' ? 'b' : 'w';
  else if (how === 'resign') {
    winner = (who || mine) === 'w' ? 'b' : 'w';
    if (!who) { c.online.rs = mine; c.online.dirty = true; }   // vzdal jsem se já – řeknu to soupeři
  }
  c.result = { how, winner };
  const draws = { stalemate: 'Pat – remíza', fifty: 'Remíza – 50 tahů bez braní', repetition: 'Remíza – 3× stejná pozice', material: 'Remíza – nedá se dát mat' };
  if (!winner) { c.msg = draws[how] || 'Remíza'; playSound([[440, 0, 0.1], [440, 0.15, 0.1]]); return; }
  const won = winner === mine;
  c.msg = how === 'resign' ? (won ? 'Soupeř se vzdal – vyhrál jsi!' : 'Vzdal ses – vyhrál soupeř') : (won ? 'Mat! Vyhrál jsi!' : 'Mat! Vyhrál soupeř');
  playSound(won ? CONFIG.SOUND_COMPLETE : CONFIG.SOUND_MISS);
};
const _chessAiMove = chessAiMove;
chessAiMove = function (pos, level) { return level && level.id === 'online' ? null : _chessAiMove(pos, level); };   // online táhne člověk
const _chessHumanTurn = chessHumanTurn;
chessHumanTurn = function (c) { return c.online ? c.pos.turn === c.online.color : _chessHumanTurn(c); };
const _chessLeave = chessLeave;
chessLeave = function () { if (state.chess && state.chess.online) mpEndMatch(); _chessLeave(); };
const _chessSquareAt = chessSquareAt;
chessSquareAt = function (x, y) {   // otočená deska: ťuknutí se zrcadlí kolem středu
  const c = state.chess;
  if (c && c.flip) { const B = CHESS.BOARD; x = 2 * (B.x + 4 * B.sq) - x; y = 2 * (B.y + 4 * B.sq) - y; }
  return _chessSquareAt(x, y);
};
const _updateChess = updateChess;
updateChess = function (dt) {
  const c = state.chess;
  if (c && state.opick && state.opick.g === 'chess') { mpPickerStep(c.keys.splice(0), input.events.splice(0)); return; }
  if (c && c.online && c.flip && c.phase === 'play' && !c.promo) {   // otočená deska: šipky jdou naopak
    const sw = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', KeyA: 'KeyD', KeyD: 'KeyA', KeyW: 'KeyS', KeyS: 'KeyW' };
    c.keys = c.keys.map((k) => sw[k] || k);
  }
  return _updateChess(dt);
};
// černý vidí šachovnici otočenou o 180° (figurky a popisky se otočí zpátky, aby nebyly vzhůru nohama)
const _drawChessBoard = drawChessBoard;
drawChessBoard = function (c, pos) {
  if (!c.flip) return _drawChessBoard(c, pos);
  const B = CHESS.BOARD, cx = B.x + 4 * B.sq, cy = B.y + 4 * B.sq;
  const _piece = drawChessPiece, _ft = CanvasRenderingContext2D.prototype.fillText;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(Math.PI); ctx.translate(-cx, -cy);
  drawChessPiece = (t, col, x, y, sq) => { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI); _piece(t, col, 0, 0, sq); ctx.restore(); };
  ctx.fillText = function (t, x, y, mw) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI); _ft.call(ctx, t, 0, 0, mw); ctx.restore(); };
  try { _drawChessBoard(c, pos); } finally { drawChessPiece = _piece; delete ctx.fillText; ctx.restore(); }
};
const _drawChessPanel = drawChessPanel;
drawChessPanel = function (c) {
  if (!c.online) return _drawChessPanel(c);
  const lv = c.level;
  c.level = { ...lv, id: 'two' };   // panel ukáže „Na tahu: bílý / černý“
  try { _drawChessPanel(c); } finally { c.level = lv; }
  drawOutlinedText(`Ty: ${c.online.color === 'w' ? 'bílý' : 'černý'}`, CHESS.PANEL_X + 98, 112, 'bold 13px sans-serif', '#e8d3a8', 'middle');
};
function mpPublishChess() {
  const M = net.match, o = state.chess && state.chess.online;
  if (!M || !o) return;
  const out = { to: M.opp, g: 'chess', id: M.id, st: 'pl', mv: o.moves.join(';') };
  if (o.rs) out.rs = o.rs;
  mpSetOut(out);
}
function mpTickChess(dt, m) {
  const c = state.chess, M = net.match;
  if (!c || !c.online) return;
  const o = c.online;
  if (c.phase === 'menu') { mpEndMatch(); return; }
  if (m && typeof m.mv === 'string') {   // soupeř má víc tahů než já → odehraju je
    const arr = m.mv ? m.mv.split(';') : [];
    while (c.phase === 'play' && o.moves.length < arr.length) {
      const mv = mpMoveDec(arr[o.moves.length]);
      const cand = mv && c.legal.find((l) => l.from === mv.from && l.to === mv.to && (l.promo || '') === mv.promo);
      if (!cand) { mpAbort('Partie se rozešla (neplatný tah).'); return; }
      o.applyingRemote = true; chessApply(c, cand); o.applyingRemote = false;
    }
  }
  if (m && m.rs && c.phase === 'play') chessFinish(c, 'resign', m.rs);
  o.tickT += dt;
  if (o.dirty || o.tickT >= MP.RESEND) { o.dirty = false; o.tickT = 0; mpPublishChess(); }
}

// =====================================================================
// FOTBÁLEK ONLINE – hostitel (červení) počítá fyziku, host (modří) posílá svou tyč a kopy
// =====================================================================
const _foosNewGame = foosNewGame;
foosNewGame = function (level) {
  if (level.id === 'online') { mpOpenPicker('foos'); return; }
  _foosNewGame(level);
};
const _foosFinish = foosFinish;
foosFinish = function (f, winner) {
  if (!f.online) return _foosFinish(f, winner);
  const mine = f.online.team === winner;
  f.phase = 'over'; f.overSel = 0;
  f.msg = `${mine ? 'Vyhrál jsi' : 'Prohrál jsi'} ${f.score.red}:${f.score.blue}`;
  playSound(mine ? CONFIG.SOUND_COMPLETE : CONFIG.SOUND_MISS);
};
const _foosLeave = foosLeave;
foosLeave = function () { if (state.foos && state.foos.online) mpEndMatch(); _foosLeave(); };
const _updateFoosball = updateFoosball;
updateFoosball = function (dt) {
  const f = state.foos;
  if (f && state.opick && state.opick.g === 'foos') { mpPickerStep(f.keys.splice(0), input.events.splice(0)); return; }
  if (f && f.online) return mpUpdateFoos(dt);
  return _updateFoosball(dt);
};
function mpPublishFoos() {
  const M = net.match, f = state.foos, o = f && f.online;
  if (!M || !o) return;
  if (o.host) {
    const b = f.ball || { x: 0, y: 0, vx: 0, vy: 0 };
    mpSetOut({ to: M.opp, g: 'foos', id: M.id, st: 'pl', s: {
      n: ++o.n, ph: f.phase, r: f.score.red, b: f.score.blue, pr: +f.p.red.toFixed(3),
      bx: Math.round(b.x), by: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy),
      kr: +f.kickT.red.toFixed(2), sv: +Math.max(0, f.serveT || 0).toFixed(2), gt: f.goalTeam || 'red' } });
  } else {
    mpSetOut({ to: M.opp, g: 'foos', id: M.id, st: 'pl', pb: +f.p.blue.toFixed(3), kk: o.kicks, au: f.auto.blue ? 1 : 0 });
  }
}
// síťová část: host přijme stav od hostitele, oba pak odešlou svoje
function mpFoosNet(dt, f, o) {
  if (!o.host) {
    const m = mpOppMsg();
    if (m && m.s && m.s.n !== o.lastN) {
      const s = m.s, sum = f.score.red + f.score.blue;
      o.lastN = s.n;
      f.score = { red: s.r, blue: s.b };
      if (s.r + s.b > sum) playSound([[523, 0, 0.08], [659, 0.09, 0.08], [784, 0.18, 0.16]]);
      if (s.ph !== f.phase && (s.ph === 'play' || s.ph === 'goal' || s.ph === 'over')) {
        if (s.ph === 'over') {
          const mine = (s.r >= FOOS.WIN ? 'red' : 'blue') === o.team;
          f.msg = `${mine ? 'Vyhrál jsi' : 'Prohrál jsi'} ${s.r}:${s.b}`; f.overSel = 0;
          playSound(mine ? CONFIG.SOUND_COMPLETE : CONFIG.SOUND_MISS);
        }
        f.phase = s.ph;
      }
      f.serveT = s.sv; f.goalTeam = s.gt;
      o.tgtPr = s.pr;
      f.kickT.red = Math.max(f.kickT.red, s.kr);
      if (!o.recv) { f.ball.x = s.bx; f.ball.y = s.by; }
      o.recv = { x: s.bx, y: s.by, vx: s.vx, vy: s.vy, at: performance.now() };
    }
    // plynulé dohánění hostitelovy tyče a míčku (mezi zprávami se míček dopočítá z rychlosti)
    if (o.tgtPr !== null) f.p.red += (o.tgtPr - f.p.red) * Math.min(1, dt * 20);
    if (o.recv) {
      const age = Math.min(0.25, (performance.now() - o.recv.at) / 1000), b = f.ball, k = Math.min(1, dt * 20);
      b.x += (o.recv.x + o.recv.vx * age - b.x) * k;
      b.y += (o.recv.y + o.recv.vy * age - b.y) * k;
      b.vx = o.recv.vx; b.vy = o.recv.vy;
    }
  }
  o.sendT += dt;
  if (o.sendT >= MP.SEND_FOOS) { o.sendT = 0; mpPublishFoos(); }
}
function mpUpdateFoos(dt) {
  const f = state.foos, o = f.online, me = o.team, F = FOOS.FIELD;
  const events = input.events.splice(0), keys = f.keys.splice(0);
  const has = (l, k) => KEYMAP[l].includes(k);
  const toMenu = () => { mpEndMatch(); f.confirmQuit = false; f.phase = 'menu'; f.menuSel = FOOS.LEVELS.length - 1; };

  if (f.phase === 'over') {
    for (const k of keys) {
      if (has('up', k) || has('down', k)) f.overSel = 1 - f.overSel;
      if (k === 'Escape') { foosLeave(); return; }
    }
    for (const ev of events) {
      const i = ev.type === 'action' ? f.overSel : chessHit(chessOverButtons(), ev);
      if (i === 0) { toMenu(); return; }
      if (i === 1) { foosLeave(); return; }
    }
    mpFoosNet(dt, f, o);   // dál se synchronizuje, ať soupeř uvidí konečný stav
    return;
  }
  // „Ukončit zápas?“ – online hra se nezastavuje (soupeř by čekal)
  if (f.confirmQuit) {
    for (const k of keys) if (k === 'Escape') f.confirmQuit = false;
    for (const ev of events) {
      const i = ev.type === 'action' ? 0 : chessHit(chessConfirmButtons(), ev);
      if (i === 0) { toMenu(); return; }
      if (i === 1) f.confirmQuit = false;
    }
  } else {
    if (keys.includes('Escape')) f.confirmQuit = true;
    if (events.some((ev) => ev.x != null && pointInRect(ev.x, ev.y, FOOS_QUIT_BTN, 6))) { f.confirmQuit = true; f.fingers = {}; }
  }

  // moje ovládání (hostitel červení, host modří): šipky / W S, mezerník = kop, prst
  const before = { red: f.p.red, blue: f.p.blue };
  if (!f.confirmQuit) {
    for (const k of keys) {
      if (CONFIG.ACTION_KEYS.includes(k) && f.kickCd[me] <= 0) { f.kickT[me] = FOOS.KICK_TIME; f.kickCd[me] = FOOS.KICK_COOLDOWN; o.kicks++; }
    }
    const up = ['ArrowUp', 'KeyW'].some((c) => input.keys.has(c)), dn = ['ArrowDown', 'KeyS'].some((c) => input.keys.has(c));
    const d = (dn ? 1 : 0) - (up ? 1 : 0);
    if (d) { f.p[me] += d * FOOS.ROD_SPEED * dt; f.auto[me] = false; }
    for (const fg of Object.values(f.fingers)) {
      const target = (fg.y - F.y - F.h / 2) / (F.h / 2 - 22), step = 6 * dt;
      f.p[me] += Math.max(-step, Math.min(step, target - f.p[me]));
      f.auto[me] = true;
    }
  }
  f.p[me] = Math.max(-1, Math.min(1, f.p[me]));

  if (o.host) {
    const m = mpOppMsg();
    if (m) {   // modří: jejich tyč, kopy a ovládání prstem
      if (Number.isFinite(m.pb)) {
        const b4 = f.p.blue;
        f.p.blue += (Math.max(-1, Math.min(1, m.pb)) - f.p.blue) * Math.min(1, dt * 25);
        f.vel.blue = (f.p.blue - b4) / dt * 60;
      }
      f.auto.blue = !!m.au;
      if (Number.isFinite(m.kk) && m.kk > o.lastKicks) {
        o.lastKicks = m.kk;
        if (f.kickCd.blue <= 0) { f.kickT.blue = FOOS.KICK_TIME; f.kickCd.blue = FOOS.KICK_COOLDOWN; }
      }
    }
    f.vel.red = (f.p.red - before.red) / dt * 60;
    if (f.phase === 'goal') {
      f.goalT -= dt;
      if (f.goalT <= 0) { f.phase = 'play'; foosServe(f, f.goalTeam === 'red' ? 'blue' : 'red'); }
    } else if (f.phase === 'play') {
      if (f.serveT > 0) {
        f.serveT -= dt;
        if (f.serveT <= 0) { f.ball.vx = f.serveDir * (140 + Math.random() * 60); f.ball.vy = (Math.random() - 0.5) * 200; }
      } else foosPhysics(f, dt);
    }
  }
  for (const t of ['red', 'blue']) {
    f.kickT[t] = Math.max(0, f.kickT[t] - dt);
    f.kickCd[t] = Math.max(0, f.kickCd[t] - dt);
  }
  mpFoosNet(dt, f, o);
}
