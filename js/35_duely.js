// Online duely: šachy, fotbálek a ping pong proti jinému online hráči, se sázkou
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
//
// Výzva:   duely/<id příjemce>  (zprávy invite / accept / decline / cancel, po přečtení se smažou)
// Zápas:   hry/<id zápasu>/h (vyzývatel = hostitel) a /c (vyzvaný) – každý zapisuje jen svou část.
// Sázka: oba ji zaplatí na začátku, vítěz dostane obě, remíza = vrácení.
// Kdo odejde nebo se ~10 s neozve, prohrává. Peníze jsou jen v prohlížeči hráče (žádný server).
'use strict';

const DUEL = {
  INBOX: 'duely',
  GAMES_PATH: 'hry',
  BETS: [0, 10, 25, 50, 100],
  INVITE_TIME: 30000,   // ms – jak dlouho platí výzva
  TIMEOUT: 10000,       // ms – ticho soupeře = vzdal
  START_TIME: 20000,    // ms – soupeř se vůbec nepřipojil = sázka zpět
  SEND_EVERY: 66,       // ms – rychlé hry (fotbálek, ping pong)
  BEAT: 1000,           // ms – i když se nic nemění
  MSG_MAX_AGE: 60000,
  GAMES: {
    chess: { name: 'Šachy', icon: '♟' },
    foos: { name: 'Fotbálek', icon: '⚽' },
    pp: { name: 'Ping pong', icon: '🏓' },
  },
  ROW: { id: 'online', name: '👥 Online – vyzvat hráče', reward: 0 },
  PANEL: { x: 190, y: 120, w: 420, h: 360 },
};

const duel = {
  inbox: null,   // EventSource na duely/<mé id>
  pick: null,    // vyzývám: { game, sel, bet, status: 'pick' | 'wait' | 'no', d, opp, oppName, until, msg }
  invite: null,  // někdo mě vyzval: { f, n, g, b, d, until }
  cur: null,     // běžící zápas
};
const duelUrl = (sub) => `${MP.DB_URL.replace(/\/+$/, '')}/${sub}.json`;
const duelMenuOn = () => mp.on && !mp.legacy && mp.status !== 'error';
const duelOnline = () => !!duel.cur;

// --- Zprávy (výzvy) ---
function duelMsg(to, k, extra) {
  fetch(duelUrl(`${DUEL.INBOX}/${to}`), { method: 'POST', body: JSON.stringify({ f: mp.id, n: mp.name, k, ...extra, t: { '.sv': 'timestamp' } }) }).catch(() => {});
}
function duelInboxSync() {
  if (!mp.on || mp.legacy) {
    if (duel.inbox) { duel.inbox.close(); duel.inbox = null; }
    duel.invite = null;
    if (duel.pick && duel.pick.status === 'wait') duel.pick = null;
    return;
  }
  if (duel.inbox || typeof EventSource === 'undefined') return;
  const es = duel.inbox = new EventSource(duelUrl(`${DUEL.INBOX}/${mp.id}`));
  es.addEventListener('put', (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    if (!msg || typeof msg.path !== 'string' || !msg.data) return;
    const key = msg.path.split('/').filter(Boolean)[0];
    if (key) duelTakeMsg(key, msg.data);
    else for (const [k, v] of Object.entries(msg.data)) duelTakeMsg(k, v);
  });
}
function duelTakeMsg(key, m) {
  fetch(duelUrl(`${DUEL.INBOX}/${mp.id}/${key}`), { method: 'DELETE' }).catch(() => {});
  if (!m || typeof m.f !== 'string' || typeof m.d !== 'string' || typeof m.k !== 'string') return;
  if (Number.isFinite(m.t) && mpServerNow() - m.t > DUEL.MSG_MAX_AGE) return;
  const name = cleanPlayerName(m.n) || '?';
  if (m.k === 'invite') {
    const bet = DUEL.BETS.includes(m.b) ? m.b : 0;
    if (!DUEL.GAMES[m.g] || duel.cur || duel.invite || (duel.pick && duel.pick.status === 'wait')) { duelMsg(m.f, 'decline', { d: m.d, why: 'busy' }); return; }
    duel.invite = { f: m.f, n: name, g: m.g, b: bet, d: m.d, until: performance.now() + DUEL.INVITE_TIME };
    playSound([[660, 0, 0.08], [880, 0.1, 0.1], [990, 0.22, 0.12]]);
  } else if (m.k === 'accept') {
    const p = duel.pick;
    if (!p || p.status !== 'wait' || p.d !== m.d || duel.cur) { duelMsg(m.f, 'cancel', { d: m.d }); return; }
    duel.pick = null;
    duelStart({ game: p.game, host: true, opp: m.f, oppName: name, bet: p.betValue, id: m.d });
  } else if (m.k === 'decline') {
    const p = duel.pick;
    if (p && p.d === m.d) { p.status = 'no'; p.msg = m.why === 'busy' ? `${name} teď nemůže` : m.why === 'money' ? `${name} nemá dost peněz` : `${name} odmítl/a`; p.until = performance.now() + 2500; }
  } else if (m.k === 'cancel') {
    if (duel.invite && duel.invite.d === m.d) duel.invite = null;
    if (duel.cur && duel.cur.id === m.d && !duel.cur.seen) duelEnd('void');
  }
}

// --- Výběr soupeře a sázky (vyzývatel) ---
function duelCandidates() {
  if (!mp.on) return [];
  const room = state.room ? state.room.id : '';
  return Object.values(mp.others).filter(mpAlive)
    .sort((a, b) => (b.r === room) - (a.r === room) || a.n.localeCompare(b.n)).slice(0, 5);
}
function duelBets(opp) {
  const cap = Math.min(state.money, opp ? opp.m : 0);
  return DUEL.BETS.filter((b) => b <= cap);
}
function duelPickOpen(game) {
  if (!duelCandidates().length) { state.toast = { text: 'Nikdo jiný teď není online', t: CONFIG.TOAST_TIME }; return; }
  duel.pick = { game, sel: 0, bet: 0, status: 'pick' };
  input.events.length = 0;
}
function duelPickSend() {
  const p = duel.pick, list = duelCandidates(), opp = list[p.sel];
  if (!opp) return;
  const bets = duelBets(opp);
  p.betValue = bets[Math.min(p.bet, bets.length - 1)] || 0;
  p.d = mp.id + Date.now().toString(36);
  p.opp = opp.id; p.oppName = opp.n;
  p.status = 'wait';
  p.until = performance.now() + DUEL.INVITE_TIME;
  duelMsg(opp.id, 'invite', { g: p.game, b: p.betValue, d: p.d });
  playSound([[523, 0, 0.05], [659, 0.06, 0.06]]);
}
function duelPickClose() {
  const p = duel.pick;
  if (p && p.status === 'wait') duelMsg(p.opp, 'cancel', { d: p.d });
  duel.pick = null;
}
function duelInviteAnswer(yes) {
  const v = duel.invite;
  if (!v) return;
  duel.invite = null;
  if (!yes) { duelMsg(v.f, 'decline', { d: v.d }); return; }
  if (state.money < v.b) {
    duelMsg(v.f, 'decline', { d: v.d, why: 'money' });
    state.toast = { text: `Na sázku ${v.b} Kč nemáš dost peněz`, t: CONFIG.TOAST_TIME };
    return;
  }
  duelMsg(v.f, 'accept', { d: v.d });
  duelStart({ game: v.g, host: false, opp: v.f, oppName: v.n, bet: v.b, id: v.d });
}
// Výzvu jde přijmout ve hře nebo v menu minihry, ne uprostřed jiné partie
function duelInviteShown() {
  if (!duel.invite || duel.cur || duel.pick) return false;
  if (state.screen === 'playing') return !state.pauseMenu;
  const g = { chess: state.chess, foosball: state.foos, pingpong: state.pp }[state.screen];
  return !!g && g.phase === 'menu';
}

// --- Zápas ---
function duelStart(o) {
  state.money -= o.bet;
  saveProgress();
  const d = duel.cur = { ...o, mine: {}, seq: 0, peer: null, peerSeq: -1, peerAt: 0, seen: false, over: false,
    born: performance.now(), sentAt: 0, dirty: true, es: null, result: null };
  const side = o.host ? 'h' : 'c', other = o.host ? 'c' : 'h';
  d.side = side;
  if (typeof EventSource !== 'undefined') {
    d.es = new EventSource(duelUrl(`${DUEL.GAMES_PATH}/${o.id}`));
    const take = (v) => {
      if (!v || typeof v !== 'object' || duel.cur !== d) return;
      const s = Number.isFinite(v.s) ? v.s : 0;
      if (s <= d.peerSeq) return;
      d.peerSeq = s; d.peer = v; d.peerAt = performance.now(); d.seen = true;
    };
    d.es.addEventListener('put', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (!msg || typeof msg.path !== 'string') return;
      if (msg.path === '/') take(msg.data && msg.data[other]);
      else if (msg.path === '/' + other) take(msg.data);
    });
  }
  if (o.game === 'chess') chessOnlineStart(d);   // 12_sachy.js
  else if (o.game === 'foos') foosOnlineStart(d);   // 14_fotbalek.js
  else ppOnlineStart(d);   // 32_pingpong.js
  state.toast = { text: o.bet ? `Duel s ${o.oppName} – sázka ${o.bet} Kč` : `Duel s ${o.oppName}`, t: CONFIG.TOAST_TIME };
}
// Můj stav pro soupeře; now = poslat hned (tah v šachu)
function duelSend(obj, now) {
  const d = duel.cur;
  if (!d) return;
  d.mine = obj;
  d.dirty = true;
  if (now) duelFlush(d);
}
function duelFlush(d) {
  d.dirty = false;
  d.sentAt = performance.now();
  const body = { ...d.mine, s: ++d.seq, t: { '.sv': 'timestamp' } };
  fetch(duelUrl(`${DUEL.GAMES_PATH}/${d.id}/${d.side}`), { method: 'PUT', body: JSON.stringify(body), keepalive: !!d.mine.q }).catch(() => {});
}
const duelPeer = () => (duel.cur ? duel.cur.peer : null);
function duelPeerGone() {
  const d = duel.cur;
  if (!d || d.over) return false;
  const now = performance.now();
  if (d.peer && d.peer.q) return true;
  return d.seen ? now - d.peerAt > DUEL.TIMEOUT : now - d.born > DUEL.START_TIME;
}
// Konec zápasu: res = 'win' | 'lose' | 'draw' | 'gone' (soupeř odešel) | 'void' (vůbec nezačal)
// Vrátí { res, won (Kč navíc), text }
function duelEnd(res) {
  const d = duel.cur;
  if (!d) return { res, won: 0, text: '' };
  if (d.over) return d.result;
  if (res === 'gone' && !d.seen) res = 'void';
  if (res === 'gone') res = 'win';
  d.over = true;
  const back = res === 'win' ? d.bet * 2 : res === 'draw' || res === 'void' ? d.bet : 0;
  state.money += back;
  saveProgress();
  let text = '';
  if (d.bet) {
    if (res === 'win') text = `Vyhráváš sázku: +${d.bet * 2} Kč`;
    else if (res === 'lose') text = `Sázka ${d.bet} Kč propadla`;
    else text = `Sázka ${d.bet} Kč se vrací`;
  }
  d.result = { res, won: res === 'win' ? d.bet * 2 : 0, text };
  duelSend({ ...d.mine, end: res }, true);
  return d.result;
}
// Odchod z minihry (nebo nová hra): rozehraný zápas se tím vzdává
function duelLeave() {
  const d = duel.cur;
  if (!d) return;
  if (!d.over) { duelEnd('lose'); }
  duelSend({ ...d.mine, q: 1 }, true);
  if (d.es) d.es.close();
  duel.cur = null;
  setTimeout(() => fetch(duelUrl(`${DUEL.GAMES_PATH}/${d.id}`), { method: 'DELETE' }).catch(() => {}), 15000);
}

function updateDuel() {
  duelInboxSync();
  const now = performance.now();
  if (duel.invite && now > duel.invite.until) duel.invite = null;
  const p = duel.pick;
  if (p && p.status !== 'pick' && now > p.until) {
    if (p.status === 'wait') { duelMsg(p.opp, 'cancel', { d: p.d }); p.status = 'no'; p.msg = `${p.oppName} neodpovídá`; p.until = now + 2500; }
    else duel.pick = null;
  }
  if (p && !['chess', 'foosball', 'pingpong'].includes(state.screen)) duel.pick = null;
  const d = duel.cur;
  if (d) {
    const screen = { chess: 'chess', foos: 'foosball', pp: 'pingpong' }[d.game];
    if (state.screen !== screen) { duelLeave(); return; }   // minihra se zavřela jinak (např. menu)
    if (d.dirty ? now - d.sentAt >= DUEL.SEND_EVERY : now - d.sentAt >= DUEL.BEAT) duelFlush(d);
  }
}

// --- Ovládání oken (výběr soupeře, výzva) ---
function duelPickRows() {
  const P = DUEL.PANEL;
  return duelCandidates().map((_, i) => ({ x: P.x + 30, y: P.y + 64 + i * 42, w: P.w - 60, h: 36 }));
}
function duelPickButtons() {
  const P = DUEL.PANEL;
  return {
    less: { x: P.x + 60, y: P.y + 278 - 50, w: 50, h: 40 },
    more: { x: P.x + P.w - 110, y: P.y + 278 - 50, w: 50, h: 40 },
    go: { x: P.x + 30, y: P.y + 290, w: 170, h: 48 },
    back: { x: P.x + P.w - 200, y: P.y + 290, w: 170, h: 48 },
  };
}
function duelInviteButtons() { return [{ x: 222, y: 330, w: 170, h: 48 }, { x: 408, y: 330, w: 170, h: 48 }]; }

function duelPickKey(code) {
  const p = duel.pick;
  if (p.status !== 'pick') { if (code === 'Escape' || CONFIG.ACTION_KEYS.includes(code)) duelPickClose(); return; }
  const n = duelCandidates().length;
  if (KEYMAP.up.includes(code)) p.sel = (p.sel + n - 1) % Math.max(1, n);
  else if (KEYMAP.down.includes(code)) p.sel = (p.sel + 1) % Math.max(1, n);
  else if (KEYMAP.left.includes(code)) p.bet = Math.max(0, p.bet - 1);
  else if (KEYMAP.right.includes(code)) p.bet = Math.min(DUEL.BETS.length - 1, p.bet + 1);
  else if (CONFIG.ACTION_KEYS.includes(code)) duelPickSend();
  else if (code === 'Escape') duelPickClose();
}
function duelPickBet(p) {
  const opp = duelCandidates()[p.sel];
  const bets = duelBets(opp);
  p.bet = Math.min(p.bet, Math.max(0, bets.length - 1));
  return bets[p.bet] || 0;
}
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (duel.pick) { duelPickKey(e.code); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (duelInviteShown()) {
    if (e.code === 'KeyY' || e.code === 'Enter') duelInviteAnswer(true);
    else if (e.code === 'KeyN' || e.code === 'Escape') duelInviteAnswer(false);
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }
}, true);

function takeDuelTaps() {
  updateDuel();
  if (duel.pick) {
    const p = duel.pick, events = input.events.splice(0);
    for (const ev of events) {
      if (ev.type !== 'tap' || ev.x == null) continue;
      const B = duelPickButtons();
      if (p.status !== 'pick') { duelPickClose(); return; }
      const i = duelPickRows().findIndex((r) => pointInRect(ev.x, ev.y, r, 0));
      if (i >= 0) { p.sel = i; continue; }
      if (pointInRect(ev.x, ev.y, B.less, 4)) p.bet = Math.max(0, p.bet - 1);
      else if (pointInRect(ev.x, ev.y, B.more, 4)) p.bet = Math.min(DUEL.BETS.length - 1, p.bet + 1);
      else if (pointInRect(ev.x, ev.y, B.go, 0)) { duelPickSend(); return; }
      else if (pointInRect(ev.x, ev.y, B.back, 0)) { duelPickClose(); return; }
    }
    return;
  }
  if (duelInviteShown()) {
    const [yes, no] = duelInviteButtons();
    for (let k = 0; k < input.events.length; k++) {
      const ev = input.events[k];
      if (ev.type !== 'tap' || ev.x == null) continue;
      const hitYes = pointInRect(ev.x, ev.y, yes, 0), hitNo = pointInRect(ev.x, ev.y, no, 0);
      if (!hitYes && !hitNo) continue;
      input.events.splice(k, 1);
      duelInviteAnswer(hitYes);
      return;
    }
  }
}

// --- Kreslení ---
function duelBox(x, y, w, h) {
  roundRectPath(x, y, w, h, 14);
  ctx.fillStyle = 'rgba(28, 20, 14, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#ffd54a';
  ctx.lineWidth = 3;
  ctx.stroke();
}
function duelButton(r, label, active, color = '#3d5f3a') {
  roundRectPath(r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = active ? '#ffd54a' : color;
  ctx.fill();
  ctx.font = 'bold 17px sans-serif';
  ctx.fillStyle = active ? '#2b1d14' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1, r.w - 12);
}
function drawDuelUi() {
  if (duel.pick) drawDuelPick();
  else if (duelInviteShown()) drawDuelInvite();
}
function drawDuelPick() {
  const p = duel.pick, P = DUEL.PANEL, G = DUEL.GAMES[p.game];
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  duelBox(P.x, P.y, P.w, P.h);
  drawOutlinedText(`${G.name} online – koho vyzveš?`, P.x + P.w / 2, P.y + 32, 'bold 21px sans-serif', '#ffd54a', 'middle');
  if (p.status !== 'pick') {
    const text = p.status === 'wait' ? `Čekám, jestli ${p.oppName} přijme…` : p.msg;
    drawOutlinedText(text, P.x + P.w / 2, P.y + 150, 'bold 19px sans-serif', '#ffffff', 'middle');
    if (p.status === 'wait' && p.betValue) drawOutlinedText(`Sázka: ${p.betValue} Kč`, P.x + P.w / 2, P.y + 185, 'bold 16px sans-serif', '#ffd54a', 'middle');
    duelButton(duelPickButtons().back, p.status === 'wait' ? 'Zrušit' : 'OK', !isTouchHint(), '#5a4636');
    return;
  }
  const list = duelCandidates(), room = state.room ? state.room.id : '';
  duelPickRows().forEach((r, i) => {
    const o = list[i];
    const here = o.r === room ? '  · tady' : '';
    duelButton(r, `${o.n}${here}  ·  ${o.m} Kč`, i === p.sel, '#3a4a5f');
  });
  const bet = duelPickBet(p), B = duelPickButtons();
  duelButton(B.less, '◀', false, '#5a4636');
  duelButton(B.more, '▶', false, '#5a4636');
  drawOutlinedText(`Sázka: ${bet} Kč`, P.x + P.w / 2, B.less.y + 20, 'bold 20px sans-serif', '#ffd54a', 'middle');
  duelButton(B.go, 'Vyzvat', !isTouchHint());
  duelButton(B.back, 'Zpět', false, '#5a4636');
  const hint = isTouchHint() ? 'Vítěz bere obě sázky' : '↑ ↓ hráč · ← → sázka · Enter vyzvat · Esc zpět';
  drawOutlinedText(hint, P.x + P.w / 2, P.y + P.h - 10, 'bold 12px sans-serif', '#e8d3a8', 'middle');
}
function drawDuelInvite() {
  const v = duel.invite, G = DUEL.GAMES[v.g];
  duelBox(190, 190, 420, 210);
  drawOutlinedText(`${G.icon} ${v.n} tě vyzývá: ${G.name}`, 400, 228, 'bold 20px sans-serif', '#ffd54a', 'middle');
  drawOutlinedText(v.b ? `Sázka ${v.b} Kč – vítěz bere ${v.b * 2} Kč` : 'Bez sázky', 400, 262, 'bold 17px sans-serif', '#ffffff', 'middle');
  const left = Math.max(0, Math.ceil((v.until - performance.now()) / 1000));
  drawOutlinedText(isTouchHint() ? `${left} s` : `Y = přijmout · N = odmítnout · ${left} s`, 400, 298, 'bold 13px sans-serif', '#e8d3a8', 'middle');
  const [yes, no] = duelInviteButtons();
  duelButton(yes, 'Přijmout', false);
  duelButton(no, 'Odmítnout', false, '#7a2a20');
}
