// Minihra hod na koš
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// MINIHRA: HOD NA KOŠ – pohled zepředu, ukazatel síly (drž mezerník / prst)
// a ukazatel směru, který běhá sám. Žádná fyzika: míč letí po oblouku
// a trefa se počítá podle toho, jak blízko středu obroučky proletěl.
// =====================================================================
// p = { name, quest } – quest: true = hraje se za úkol, false = volná hra
function startMinigame(p) {
  state.pendingMinigame = null;
  if (p.name === 'gumy') { startPrank(p); return; }   // gumy s Davidem: hraje se přímo na parkovišti
  if (p.name !== 'basket') return;
  state.basket = {
    forQuest: p.quest,
    attempts: 0, hits: 0,
    phase: 'dir',          // 'dir' (zastav směr) | 'power' (podrž a pusť sílu) | 'flight' | 'after' | 'msg' | 'done'
    t: 0,
    armed: false,          // mezerník/prst se musí nejdřív pustit (ať nic neproběhne hned po zavření dialogu)
    charging: false, chargeT: 0, power: 0,
    dirT: Math.random(), dir: 0,
    ball: null, shot: null,
    msg: '', success: false,
  };
  input.events.length = 0;
  setScreen('basket');
}

function basketHeld() {
  return input.keys.has('Space') || input.keys.has('Enter') || input.pointerHeld;
}

// trojúhelníková vlna 0 → 1 → 0 (síla), resp. −1 → 1 → −1 (směr)
function tri01(t) { const f = t - Math.floor(t); return f < 0.5 ? f * 2 : 2 - f * 2; }

function updateBasket(dt) {
  const b = state.basket;
  input.events.length = 0;    // klávesy a ťuknutí řeší držení, ne fronta
  b.t += dt;
  const held = basketHeld();
  if (!held) b.armed = true;

  if (b.phase === 'dir') {
    // 1. krok: ukazatel směru běhá, zmáčknutí / ťuknutí ho zastaví
    b.dirT += dt * CONFIG.BASKET_DIR_SPEED;
    b.dir = tri01(b.dirT) * 2 - 1;
    if (b.armed && held) {
      b.phase = 'power';
      b.armed = false;      // na sílu se musí zmáčknout znovu
      b.power = 0;
      b.t = 0;
    }
  } else if (b.phase === 'power') {
    // 2. krok: podržet – síla roste a klesá; puštění = hod
    if (b.armed && held && !b.charging) { b.charging = true; b.chargeT = 0; }
    if (b.charging) {
      b.chargeT += dt;
      b.power = tri01(b.chargeT * CONFIG.BASKET_POWER_SPEED);
      if (!held) throwBall(b);
    }
  } else if (b.phase === 'flight') {
    const u = Math.min(1, b.t / CONFIG.BASKET_FLIGHT_TIME);
    const s = b.shot;
    const iu = 1 - u;
    b.ball = {
      x: iu * iu * s.from.x + 2 * iu * u * s.ctrl.x + u * u * s.to.x,
      y: iu * iu * s.from.y + 2 * iu * u * s.ctrl.y + u * u * s.to.y,
      r: 22 - 10 * u,
      behindRim: false,
    };
    if (u >= 1) {
      b.phase = 'after';
      b.t = 0;
      if (s.hit) {
        playSound(CONFIG.SOUND_SWISH);
        b.ball.vx = 0; b.ball.vy = 140;
      } else {
        playSound(CONFIG.SOUND_BOUNCE, 'triangle');
        // odraz od obroučky / desky nebo dopad před koš
        b.ball.vx = (s.dx >= 0 ? 1 : -1) * (80 + Math.random() * 60);
        b.ball.vy = s.dz > 0 ? -60 : -150;
      }
    }
  } else if (b.phase === 'after') {
    const ball = b.ball;
    if (b.shot.hit) {
      ball.y += ball.vy * dt;     // propadne obroučkou a síťkou
      ball.behindRim = ball.y < CONFIG.BASKET_RIM.y + 30;
    } else {
      ball.vy += 900 * dt;        // padá dolů
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y > 560) { ball.y = 560; ball.vy *= -0.4; ball.vx *= 0.7; }
    }
    if (b.t > 0.8) {
      b.attempts++;
      if (b.shot.hit) b.hits++;
      b.msg = b.shot.hit ? 'Koš!' : 'Vedle!';
      if (!b.shot.hit) playSound(CONFIG.SOUND_MISS, 'sawtooth');
      b.phase = 'msg';
      b.t = 0;
    }
  } else if (b.phase === 'msg') {
    if (b.t > 0.9) {
      if (b.attempts >= CONFIG.BASKET_ATTEMPTS) {   // vždy se hrají všechny tři pokusy
        b.success = b.hits >= CONFIG.BASKET_NEEDED;
        b.msg = b.success ? (b.forQuest ? 'Úkol splněn!' : 'Vyhrál jsi!') : 'Tentokrát to nevyšlo – zkus to znovu';
        if (b.success) playSound(CONFIG.SOUND_COMPLETE);
        b.phase = 'done';
      } else {
        b.phase = 'dir';
        b.ball = null;
        b.armed = false;
        b.charging = false;
        b.power = 0;
      }
      b.t = 0;
    }
  } else if (b.phase === 'done') {
    if (b.t > 1.8) finishBasket(b.success, b.forQuest, b.hits);
  }
}

function throwBall(b) {
  const dx = b.dir * CONFIG.BASKET_DIR_RANGE;
  const dz = (b.power - CONFIG.BASKET_IDEAL_POWER) * CONFIG.BASKET_DEPTH_RANGE;
  const hit = Math.hypot(dx, dz) < CONFIG.BASKET_HIT_RADIUS;
  const rim = CONFIG.BASKET_RIM;
  const from = { ...CONFIG.BASKET_BALL_START };
  // silný hod skončí výš (deska), slabý níž (před košem)
  const to = { x: rim.x + dx, y: hit ? rim.y - 4 : rim.y - dz * 0.6 };
  const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 200 - b.power * 80 };
  b.shot = { from, to, ctrl, hit, dx, dz };
  b.charging = false;
  b.phase = 'flight';
  b.t = 0;
}

function finishBasket(success, forQuest, hits) {
  state.basket = null;
  setScreen('playing');
  input.events.length = 0;
  const q = QUESTS.find((qq) => qq.minigame === 'basket' && questStage(qq) === 'assigned');
  if (!forQuest) {   // volná hra u Holuba
    state.toast = { text: success ? `Paráda, ${hits} koše ze ${CONFIG.BASKET_ATTEMPTS}!` : 'Nevadí, zkus to u Holuba znovu', t: CONFIG.TOAST_TIME + 1 };
  } else if (success && q) {
    setQuestStage(q, 'carrying');   // splněno – učitel hned poděkuje
    talkTo(TEACHERS[q.teacher]);
  } else {
    state.toast = { text: 'Promluv si s Holubem a zkus to znovu', t: CONFIG.TOAST_TIME + 1 };
  }
}

// --- kreslení minihry ---
function drawBall(x, y, r) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 4, r, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8701a';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a1d08';
  ctx.lineWidth = Math.max(1, r / 10);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x - r * 0.55, y, r * 0.45, r * 0.9, 0, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + r * 0.55, y, r * 0.45, r * 0.9, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
}

function drawRim(front) {
  const rim = CONFIG.BASKET_RIM;
  ctx.strokeStyle = '#e8590c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (front) ctx.ellipse(rim.x, rim.y, rim.rx, rim.ry, 0, 0, Math.PI);
  else ctx.ellipse(rim.x, rim.y, rim.rx, rim.ry, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function renderBasket() {
  const b = state.basket;
  const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
  // zeď tělocvičny: bílá nahoře, dřevěný obklad dole, okna
  drawRect({ x: 0, y: 0, w: W, h: 380 }, '#f1efe9');
  for (let i = 0; i < 6; i++) {
    const wx = 40 + i * 130;
    if (wx > 260 && wx < 500) continue;   // za košem okno není
    drawRect({ x: wx, y: 30, w: 90, h: 70 }, '#aab3b9');
    drawRect({ x: wx + 4, y: 34, w: 82, h: 62 }, '#d6ebf5');
    ctx.fillStyle = '#aab3b9';
    ctx.fillRect(wx + 44, 34, 2, 62);
  }
  drawRect({ x: 0, y: 300, w: W, h: 80 }, '#c9965a');
  ctx.fillStyle = 'rgba(90, 55, 20, 0.35)';
  for (let x = 0; x < W; x += 24) ctx.fillRect(x, 300, 1, 80);
  // podlaha (parkety) s čárami
  ctx.fillStyle = getPattern('telocvicna-parkety', 64, (g, size) => drawParquetTile(g, size, {
    seed: 3, plankW: 32, plankH: 8, gap: 'rgba(90, 55, 20, 0.35)',
    colors: ['#c99a5e', '#d1a466', '#c29257', '#cda061', '#bf8f55'],
  }));
  ctx.fillRect(0, 380, W, H - 380);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(0, 430, W, 3);
  ctx.fillStyle = '#2f5fb3';
  ctx.fillRect(0, 520, W, 3);
  // deska a koš
  drawRect({ x: 392, y: 230, w: 16, h: 70 }, '#9aa3aa');        // držák
  drawShadow({ x: 320, y: 120, w: 160, h: 110 }, SHADOW_LOW);
  drawRect({ x: 320, y: 120, w: 160, h: 110 }, '#ffffff');
  drawOutline({ x: 320, y: 120, w: 160, h: 110 }, '#333333');
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.strokeRect(372, 168, 56, 46);
  drawRim(false);                                                // zadní půlka obroučky
  if (b.ball && b.ball.behindRim) drawBall(b.ball.x, b.ball.y, b.ball.r);
  // síťka
  const rim = CONFIG.BASKET_RIM;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 6; i++) {
    const tx = rim.x - rim.rx + i * (rim.rx * 2 / 6);
    const bx = rim.x - rim.rx * 0.55 + i * (rim.rx * 1.1 / 6);
    ctx.beginPath(); ctx.moveTo(tx, rim.y); ctx.lineTo(bx, rim.y + 46); ctx.stroke();
  }
  for (let k = 1; k <= 3; k++) {
    const yy = rim.y + k * 14, w = rim.rx * (1 - k * 0.14);
    ctx.beginPath(); ctx.moveTo(rim.x - w, yy); ctx.lineTo(rim.x + w, yy); ctx.stroke();
  }
  drawRim(true);                                                 // přední půlka obroučky
  // míč (v ruce na začátku, jinak v letu)
  const ball = b.ball || { ...CONFIG.BASKET_BALL_START, r: 22 };
  if (!(b.ball && b.ball.behindRim)) drawBall(ball.x, ball.y, ball.r);

  // ukazatel síly vlevo dole (svislý)
  const pulse = 0.55 + 0.45 * Math.sin(state.time * 8);   // blikající rámeček u ukazatele, který je na řadě
  const pw = { x: 30, y: 360, w: 28, h: 200 };
  drawRect(pw, 'rgba(0, 0, 0, 0.55)');
  // zelená zóna dobré síly (při přesném směru)
  const powTol = CONFIG.BASKET_HIT_RADIUS / CONFIG.BASKET_DEPTH_RANGE;
  const zoneTop = pw.y + pw.h - 3 - (pw.h - 6) * Math.min(1, CONFIG.BASKET_IDEAL_POWER + powTol);
  const zoneBot = pw.y + pw.h - 3 - (pw.h - 6) * Math.max(0, CONFIG.BASKET_IDEAL_POWER - powTol);
  ctx.fillStyle = 'rgba(102, 187, 106, 0.45)';
  ctx.fillRect(pw.x + 3, zoneTop, pw.w - 6, zoneBot - zoneTop);
  const fillH = Math.round((pw.h - 6) * b.power);
  const grad = ctx.createLinearGradient(0, pw.y + pw.h, 0, pw.y);
  grad.addColorStop(0, '#43a047'); grad.addColorStop(0.6, '#fdd835'); grad.addColorStop(1, '#e53935');
  ctx.fillStyle = grad;
  ctx.fillRect(pw.x + 3, pw.y + pw.h - 3 - fillH, pw.w - 6, fillH);
  const idealY = pw.y + pw.h - 3 - (pw.h - 6) * CONFIG.BASKET_IDEAL_POWER;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(pw.x - 4, idealY - 1, pw.w + 8, 2);
  drawOutline(pw, '#ffffff');
  if (b.phase === 'power') {
    ctx.strokeStyle = `rgba(255, 213, 74, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(pw.x - 4, pw.y - 4, pw.w + 8, pw.h + 8);
  }
  drawOutlinedText('2. SÍLA', pw.x + pw.w / 2 + 6, pw.y - 12, 'bold 12px sans-serif', '#ffffff', 'middle');

  // ukazatel směru dole uprostřed (vodorovný, běhá sám)
  const dr = { x: 250, y: 566, w: 300, h: 16 };
  drawRect(dr, 'rgba(0, 0, 0, 0.55)');
  // zelená zóna dobrého směru (při přesné síle)
  const dirTol = CONFIG.BASKET_HIT_RADIUS / CONFIG.BASKET_DIR_RANGE * (dr.w / 2 - 6);
  ctx.fillStyle = 'rgba(102, 187, 106, 0.45)';
  ctx.fillRect(dr.x + dr.w / 2 - dirTol, dr.y + 2, dirTol * 2, dr.h - 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(dr.x + dr.w / 2 - 1, dr.y, 2, dr.h);
  const mx = dr.x + dr.w / 2 + b.dir * (dr.w / 2 - 6);
  drawRect({ x: mx - 5, y: dr.y - 4, w: 10, h: dr.h + 8 }, '#ffd54a');
  drawOutline({ x: mx - 5, y: dr.y - 4, w: 10, h: dr.h + 8 }, '#3a2a00');
  drawOutline(dr, '#ffffff');
  if (b.phase === 'dir') {
    ctx.strokeStyle = `rgba(255, 213, 74, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(dr.x - 4, dr.y - 4, dr.w + 8, dr.h + 8);
  }
  drawOutlinedText('1. SMĚR', dr.x + dr.w / 2, dr.y - 12, 'bold 12px sans-serif', '#ffffff', 'middle');

  // počítadlo nahoře
  drawRect({ x: 0, y: 0, w: W, h: 56 }, 'rgba(20, 22, 34, 0.75)');
  drawCenteredText('Hod na koš', 18, 'bold 20px sans-serif', CONFIG.TITLE_COLOR);
  const shown = Math.min(b.attempts + (['dir', 'power', 'flight', 'after'].includes(b.phase) ? 1 : 0), CONFIG.BASKET_ATTEMPTS);
  drawCenteredText(`Pokus ${shown}/${CONFIG.BASKET_ATTEMPTS}   ·   Koše: ${b.hits}/${CONFIG.BASKET_NEEDED}`,
    42, 'bold 15px sans-serif', CONFIG.TASK_COLOR);
  if (b.phase === 'dir' || b.phase === 'power') {
    const touch = isTouchHint();
    const hint = b.phase === 'dir'
      ? (touch ? '1. Ťukni a zastav směr v zelené' : '1. Zmáčkni mezerník a zastav směr v zelené')
      : (touch ? '2. Podrž prst a pusť, když je síla v zelené' : '2. Podrž mezerník a pusť, když je síla v zelené');
    drawOutlinedText(hint, W / 2, 470, 'bold 16px sans-serif', '#ffffff', 'middle');
  }
  if (b.phase === 'msg' || b.phase === 'done') {
    const big = b.phase === 'done';
    drawOutlinedText(b.msg, W / 2, 330, big ? 'bold 34px sans-serif' : 'bold 40px sans-serif',
      b.msg === 'Koš!' || (big && b.success) ? '#ffd54a' : '#ffffff', 'middle');
  }
}
