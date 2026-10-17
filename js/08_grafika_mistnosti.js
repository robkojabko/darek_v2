// Grafika nábytku a místností (OBSTACLE_ART, ROOM_ART)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// =====================================================================
// GRAFIKA MÍSTNOSTÍ – vše kreslené kódem. Místnost bez záznamu
// v ROOM_ART se kreslí jednobarevně jako dřív.
// =====================================================================

// Generátor náhodných čísel se semínkem – vzor vyjde pokaždé stejně
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Opakovatelná dlaždice: nakreslí se JEDNOU do malého plátna (ve vyšším
// rozlišení kvůli ostrosti) a pak ji canvas jen opakuje jako výplň.
const patternCache = {};
function getPattern(name, size, drawTile) {
  if (patternCache[name]) return patternCache[name];
  const res = CONFIG.PATTERN_RES;
  const c = document.createElement('canvas');
  c.width = c.height = size * res;
  const g = c.getContext('2d');
  g.scale(res, res);
  drawTile(g, size);
  const pattern = ctx.createPattern(c, 'repeat');
  if (pattern.setTransform) pattern.setTransform(new DOMMatrix().scale(1 / res));
  patternCache[name] = pattern;
  return pattern;
}

// Teraco: čtvercové dlaždice s jemně odlišným odstínem, posypané kamínky
function drawTerrazzoTile(g, size, o) {
  const rnd = seededRandom(o.seed);
  const n = Math.round(size / o.tile);
  for (let ty = 0; ty < n; ty++) {
    for (let tx = 0; tx < n; tx++) {
      g.fillStyle = o.base;
      g.fillRect(tx * o.tile, ty * o.tile, o.tile, o.tile);
      const shade = (rnd() - 0.5) * o.tileVariation;
      g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
      g.fillRect(tx * o.tile, ty * o.tile, o.tile, o.tile);
    }
  }
  const count = Math.round(size * size * o.density);
  for (let i = 0; i < count; i++) {
    g.fillStyle = o.speckles[Math.floor(rnd() * o.speckles.length)];
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 0.35 + rnd() * 0.9, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = o.grout; // spáry
  for (let i = 0; i < n; i++) {
    g.fillRect(i * o.tile, 0, 1, size);
    g.fillRect(0, i * o.tile, size, 1);
  }
}

// Zdi jako pás po obvodu: horní plocha zdi, barevný sokl u vnitřní hrany, lišta
function drawWallBand(room, s) {
  const t = CONFIG.WALL_THICKNESS;
  for (const wall of buildRoomWalls(room)) drawRect(wall, s.top);
  const ix = room.x + t, iy = room.y + t, iw = room.w - 2 * t, ih = room.h - 2 * t;
  ctx.strokeStyle = s.edge;
  ctx.lineWidth = 6;
  ctx.strokeRect(ix - 3, iy - 3, iw + 6, ih + 6);
  ctx.strokeStyle = s.base;
  ctx.lineWidth = 2;
  ctx.strokeRect(ix - 1, iy - 1, iw + 2, ih + 2);
  ctx.strokeStyle = s.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(room.x + 0.5, room.y + 0.5, room.w - 1, room.h - 1);
}

// Okno ve zdi (pohled shora): dřevěný rám, sklo, příčky
function drawWallWindow(room, side, at, length, s) {
  const t = CONFIG.WALL_THICKNESS;
  const horizontal = side === 'top' || side === 'bottom';
  const r = horizontal
    ? { x: room.x + room.w * at - length / 2, y: side === 'top' ? room.y : room.y + room.h - t, w: length, h: t }
    : { x: side === 'left' ? room.x : room.x + room.w - t, y: room.y + room.h * at - length / 2, w: t, h: length };
  drawWindowInRect(r, horizontal, s);
}

// Okno do daného obdélníku zdi (r = celá tloušťka zdi × délka okna)
function drawWindowInRect(r, horizontal, s) {
  drawRect(r, s.frame);
  const glass = horizontal
    ? { x: r.x + 3, y: r.y + 6, w: r.w - 6, h: r.h - 12 }
    : { x: r.x + 6, y: r.y + 3, w: r.w - 12, h: r.h - 6 };
  drawRect(glass, s.glass);
  ctx.fillStyle = s.frame;
  for (let i = 1; i < 3; i++) {
    if (horizontal) ctx.fillRect(glass.x + glass.w * i / 3 - 1, glass.y, 2, glass.h);
    else ctx.fillRect(glass.x, glass.y + glass.h * i / 3 - 1, glass.w, 2);
  }
}

// Měkký kruh světla na podlaze (od závěsných lamp)
function drawLightPool(x, y, radius, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255,250,235,${alpha})`);
  g.addColorStop(1, 'rgba(255,250,235,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// Dveře ve zdi: rám, dvě křídla s proskleným pruhem, rohožka před nimi
function drawStyledDoor(door, s) {
  drawRect(door, s.frame);
  const horizontal = door.side === 'top' || door.side === 'bottom';
  const leaf = horizontal
    ? { x: door.x + 3, y: door.y + 4, w: door.w - 6, h: door.h - 8 }
    : { x: door.x + 4, y: door.y + 3, w: door.w - 8, h: door.h - 6 };
  drawRect(leaf, s.leaf);
  ctx.fillStyle = s.glass;
  if (horizontal) {
    ctx.fillRect(leaf.x + 4, leaf.y + leaf.h / 2 - 2, leaf.w / 2 - 7, 4);
    ctx.fillRect(leaf.x + leaf.w / 2 + 3, leaf.y + leaf.h / 2 - 2, leaf.w / 2 - 7, 4);
  } else {
    ctx.fillRect(leaf.x + leaf.w / 2 - 2, leaf.y + 4, 4, leaf.h / 2 - 7);
    ctx.fillRect(leaf.x + leaf.w / 2 - 2, leaf.y + leaf.h / 2 + 3, 4, leaf.h / 2 - 7);
  }
  ctx.fillStyle = s.frame; // spára mezi křídly
  if (horizontal) ctx.fillRect(leaf.x + leaf.w / 2 - 1, leaf.y, 2, leaf.h);
  else ctx.fillRect(leaf.x, leaf.y + leaf.h / 2 - 1, leaf.w, 2);

  if (!s.mat) return;
  const m = 10;
  const mat = {
    top:    { x: door.x + 4, y: door.y + door.h + 2, w: door.w - 8, h: m },
    bottom: { x: door.x + 4, y: door.y - m - 2,      w: door.w - 8, h: m },
    left:   { x: door.x + door.w + 2, y: door.y + 4, w: m, h: door.h - 8 },
    right:  { x: door.x - m - 2,      y: door.y + 4, w: m, h: door.h - 8 },
  }[door.side];
  drawRect(mat, s.mat);
  ctx.fillStyle = s.matRib;
  if (horizontal) for (let x = mat.x + 3; x < mat.x + mat.w - 1; x += 4) ctx.fillRect(x, mat.y + 2, 1, mat.h - 4);
  else for (let y = mat.y + 3; y < mat.y + mat.h - 1; y += 4) ctx.fillRect(mat.x + 2, y, mat.w - 4, 1);
}

// Postavička hráče: nožičky, kolébající se tělíčko, rovná velká hlava.
// cx/feetY = střed a spodek kolizního čtverce (tam stojí nohy).
function drawPlayer(p) {
  const pr = { x: Math.round(p.x), y: Math.round(p.y), w: p.w, h: p.h };
  drawCharacterShadow(pr);
  drawPlayerFigure(pr.x + pr.w / 2, pr.y + pr.h, p.walkPhase, p.walkBlend);
}

function drawPlayerFigure(cx, feetY, phase, blend) {
  drawFigure(cx, feetY, phase, blend, {
    face: playerFaceImg, fallback: CONFIG.PLAYER_COLOR,
    body: CONFIG.PLAYER_VEST, check: CONFIG.PLAYER_VEST_CHECK,
    collar: CONFIG.PLAYER_SHIRT, arms: CONFIG.PLAYER_SHIRT,
    pants: CONFIG.PLAYER_PANTS, shoes: CONFIG.PLAYER_SHOES,
  });
}

// Postavička: hlava z fotky, trup s rameny, ruce s dlaněmi, nohy v kalhotách.
// Míry (px nad chodidly): nohy 0–14, trup 14–38, hlava nahoře kousek překrývá krk.
// look = { face (Image), fallback, body, check?, dots?, collar, tie?, arms, pants, shoes, skin? }
function drawFigure(cx, feetY, phase, blend, look) {
  const step = Math.sin(phase) * blend;
  const sway = step * CONFIG.PLAYER_SWAY;
  const lift = CONFIG.PLAYER_LEG_LIFT;
  const skin = look.skin || CONFIG.PLAYER_SKIN;
  const outline = CONFIG.CHARACTER_OUTLINE;
  cx = Math.round(cx);

  // nohy: střídavě se zvedají, boty se špičkou dopředu
  const LEG = 14;
  const legL = Math.round(Math.max(0, step) * lift);
  const legR = Math.round(Math.max(0, -step) * lift);
  for (const [lx, up] of [[cx - 7, legL], [cx + 1, legR]]) {
    drawRect({ x: lx, y: feetY - LEG - 1 - up, w: 6, h: LEG - 2 }, look.pants);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';   // světlejší přední hrana nohavice
    ctx.fillRect(lx + 1, feetY - LEG - 1 - up, 2, LEG - 2);
    roundRectPath(lx - 1, feetY - 5 - up, 8, 5, 2);
    ctx.fillStyle = look.shoes;
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';   // odlesk na botě
    ctx.fillRect(lx + 1, feetY - 4 - up, 3, 1);
  }

  // trup: kolébá se kolem boků (hlava ne)
  const hipY = feetY - LEG + 1;
  const T = 24;                       // výška trupu
  ctx.save();
  ctx.translate(cx, hipY);
  ctx.rotate(sway);
  const torso = () => {               // ramena 24 px, v pase 18 px
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-11, -T + 6);
    ctx.quadraticCurveTo(-12, -T, -6, -T);
    ctx.lineTo(6, -T);
    ctx.quadraticCurveTo(12, -T, 11, -T + 6);
    ctx.lineTo(9, 0);
    ctx.closePath();
  };
  // ruce: houpou se z ramen proti nohám, rukáv a dlaň
  const swing = step * 0.35;
  for (const [sx, dir] of [[-10, 1], [10, -1]]) {
    ctx.save();
    ctx.translate(sx, -T + 4);
    ctx.rotate(swing * dir + (sx < 0 ? 0.05 : -0.05));
    roundRectPath(-2.5, -2, 5, 16, 2.5);
    ctx.fillStyle = look.arms;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, 16, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // opasek / pas kalhot
  drawRect({ x: -9, y: -3, w: 18, h: 3 }, look.pants);
  // trup (vesta / sako / košile), případně kostky nebo puntíky
  torso();
  ctx.fillStyle = look.body;
  ctx.fill();
  ctx.save();
  torso();
  ctx.clip();
  if (look.check) {
    ctx.fillStyle = look.check;
    for (let y = -T + 6; y < 0; y += 6) ctx.fillRect(-12, y, 24, 1);
    for (let x = -8; x <= 8; x += 6) ctx.fillRect(x, -T, 1, T);
  }
  if (look.dots) {
    ctx.fillStyle = look.dots;
    for (let dy = -T + 3; dy < 0; dy += 4) for (let dx = -10 + ((dy / 4) & 1) * 2; dx < 11; dx += 4) ctx.fillRect(dx, dy, 1, 1);
  }
  // stín pod rameny a ve středu – trup nevypadá jako placka
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(-12, -6, 24, 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(-12, -T, 24, 3);
  ctx.restore();
  // límec do V (košile), kravata, knoflíčky
  ctx.fillStyle = look.collar;
  ctx.beginPath();
  ctx.moveTo(-6, -T); ctx.lineTo(6, -T); ctx.lineTo(0, -T + 10);
  ctx.closePath();
  ctx.fill();
  if (look.tie) {
    ctx.fillStyle = look.tie;
    ctx.beginPath();
    ctx.moveTo(-1.5, -T + 1); ctx.lineTo(1.5, -T + 1); ctx.lineTo(2.5, -T + 13);
    ctx.lineTo(0, -T + 16); ctx.lineTo(-2.5, -T + 13);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (const y of [-T + 13, -T + 18]) ctx.fillRect(-0.5, y, 1.5, 1.5);
  }
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  torso();
  ctx.stroke();
  // krk
  drawRect({ x: -3, y: -T - 3, w: 6, h: 4 }, skin);
  ctx.restore();

  // hlava: jde s tělem do strany a lehce poskakuje, ale nenaklání se
  const size = CONFIG.PLAYER_HEAD_SIZE;
  const neckX = cx + Math.round(Math.sin(sway) * (T + 2));
  const bob = Math.round(Math.abs(step) * 1.5);
  const hx = neckX - size / 2;
  const hy = hipY - T - size + 5 - bob;    // brada překrývá krk
  if (look.face && look.face.complete && look.face.naturalWidth) {
    ctx.drawImage(look.face, hx, hy, size, size);
  } else {
    // bez fotky: kreslený obličej – kůže, vlasy, oči, úsměv (barva vlasů look.hair)
    const cx = neckX, cy = hy + size / 2 + 2, rad = size / 2 - 6;
    ctx.fillStyle = look.skin || CONFIG.PLAYER_SKIN;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = CONFIG.CHARACTER_OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = look.hair || look.fallback;
    ctx.beginPath(); ctx.arc(cx, cy - 2, rad + 1, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillRect(cx - rad * 0.9, cy - rad * 0.55, rad * 0.5, rad * 0.25);
    ctx.fillStyle = '#2b1d14';
    ctx.beginPath(); ctx.arc(cx - rad * 0.35, cy + 1, 2, 0, Math.PI * 2); ctx.arc(cx + rad * 0.35, cy + 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy + rad * 0.3, rad * 0.35, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  // hrnek s kafem v pravé ruce (Holub v režimu Vrah)
  if (look.mug) {
    const mx = cx + 12, my = hipY - 9;
    roundRectPath(mx - 4, my - 6, 8, 9, 2); ctx.fillStyle = '#fafafa'; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#5d4037'; ctx.fillRect(mx - 3, my - 5, 6, 2);
    ctx.beginPath(); ctx.arc(mx + 5, my - 2, 2.5, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  }
  // zelená karma (finále režimu Vrah): hlava zezelená a vyraší z ní lístek
  if (look.green) {
    const g = Math.min(1, look.green);
    ctx.globalAlpha = 0.5 * g;
    ctx.fillStyle = '#43a047';
    ctx.beginPath(); ctx.ellipse(neckX, hy + size / 2 + 2, size / 2 - 3, size / 2 - 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(neckX, hy + 6); ctx.lineTo(neckX + 2, hy + 6 - 10 * g); ctx.stroke();
    ctx.fillStyle = '#66bb6a';
    ctx.save(); ctx.translate(neckX + 2, hy + 6 - 10 * g); ctx.rotate(0.6);
    ctx.beginPath(); ctx.ellipse(5 * g, 0, 7 * g, 3.5 * g, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Stín pod postavou – oddělí ji od podlahy
function drawCharacterShadow(r) {
  ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
  ctx.beginPath();
  ctx.ellipse(r.x + r.w / 2 + 3, r.y + r.h, r.w / 2 + 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// --- Společná pravidla pro nábytek, ať všechny místnosti vypadají jako jedna hra:
// stín vždy dolů doprava (vysoké věci 6 px, nízké 3 px), tenký tmavý obrys.
const SHADOW_TALL = 6;
const SHADOW_LOW = 3;
function drawShadow(r, offset) {
  ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
  ctx.fillRect(r.x + offset, r.y + offset, r.w, r.h);
}
function drawOutline(r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

// Klávesy shora (r = vodorovný obdélník): černé tělo, bílé klávesy s černými, kontrolka
function drawKeyboardBody(r) {
  drawRect(r, '#1e1e1e');
  const keys = { x: r.x + 3, y: r.y + 8, w: r.w - 6, h: r.h - 11 };
  drawRect(keys, '#f4f4f0');
  ctx.fillStyle = '#9a9a9a';
  for (let x = keys.x + 5; x < keys.x + keys.w; x += 5) ctx.fillRect(x, keys.y, 1, keys.h);
  ctx.fillStyle = '#111111';
  for (let i = 0, x = keys.x + 3.5; x < keys.x + keys.w - 3; i++, x += 5) {
    if (i % 7 === 2 || i % 7 === 6) continue;   // mezery mezi skupinami černých kláves
    ctx.fillRect(x, keys.y, 3, keys.h * 0.6);
  }
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(r.x + 6, r.y + 3, 3, 3);   // kontrolka
  drawOutline(r, 'rgba(0, 0, 0, 0.6)');
}

// Vzhled překážek podle kind. Volá se (r = obdélník, o = data překážky, room).
const OBSTACLE_ART = {
  // mohutný bílý sloup: stín, sokl, světlejší horní plocha
  pillar(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#d3d9dd');
    drawRect({ x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 8 }, '#f5f7f8');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, 2);
    drawOutline(r, '#8f999f');
  },
  // radiátor s žebry (barva volitelně v datech)
  radiator(r, o) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, o.color || '#e6d48f');
    ctx.fillStyle = o.rib || '#bfa95e';
    if (r.w >= r.h) for (let x = r.x + 2; x < r.x + r.w - 1; x += 4) ctx.fillRect(x, r.y + 1, 1.5, r.h - 2);
    else for (let y = r.y + 2; y < r.y + r.h - 1; y += 4) ctx.fillRect(r.x + 1, y, r.w - 2, 1.5);
    drawOutline(r, o.outline || '#9c8744');
  },
  // modrá židle, opěradlo u zdi (dole)
  chair(r) {
    drawShadow(r, SHADOW_LOW);
    roundRectPath(r.x, r.y, r.w, r.h, 4);
    ctx.fillStyle = '#2f62c4';
    ctx.fill();
    drawRect({ x: r.x + 1, y: r.y + r.h - 6, w: r.w - 2, h: 5 }, '#1d3f86');
  },
  // řada plechových skříněk: dvířka po 14 px, světlejší hrana na straně dvířek
  lockers(r, o) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, o.color);
    const horizontal = r.w >= r.h;
    if (o.colors) {   // každá dvířka jinou barvou dokola
      const len = horizontal ? r.w : r.h;
      for (let a = 0, i = 0; a < len; a += 14, i++) {
        const l = Math.min(14, len - a);
        drawRect(horizontal ? { x: r.x + a, y: r.y, w: l, h: r.h } : { x: r.x, y: r.y + a, w: r.w, h: l }, o.colors[i % o.colors.length]);
      }
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'; // spáry mezi skříňkami
    if (horizontal) for (let x = r.x + 14; x < r.x + r.w - 2; x += 14) ctx.fillRect(x, r.y, 1, r.h);
    else for (let y = r.y + 14; y < r.y + r.h - 2; y += 14) ctx.fillRect(r.x, y, r.w, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; // hrana s dvířky
    const f = 3;
    if (o.face === 'down' || o.face === 'both') ctx.fillRect(r.x, r.y + r.h - f, r.w, f);
    if (o.face === 'up' || o.face === 'both') ctx.fillRect(r.x, r.y, r.w, f);
    if (o.face === 'right') ctx.fillRect(r.x + r.w - f, r.y, f, r.h);
    if (o.face === 'left') ctx.fillRect(r.x, r.y, f, r.h);
    if (o.face === 'both') { // šedá záda uprostřed
      ctx.fillStyle = '#9ea3a6';
      if (horizontal) ctx.fillRect(r.x, r.y + r.h / 2 - 1, r.w, 2);
      else ctx.fillRect(r.x + r.w / 2 - 1, r.y, 2, r.h);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.5)');
  },
  // lavička: zelený kovový rám, dřevěné latě
  bench(r, o) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, o.frame || '#2e5e3a');
    const slats = 3;
    const gap = 2;
    const horizontal = r.w >= r.h;
    const across = horizontal ? r.h : r.w;
    const sh = (across - 4 - gap * (slats - 1)) / slats;
    for (let i = 0; i < slats; i++) {
      const color = i % 2 ? '#c8924f' : '#d6a25e';
      if (horizontal) drawRect({ x: r.x + 3, y: r.y + 2 + i * (sh + gap), w: r.w - 6, h: sh }, color);
      else drawRect({ x: r.x + 2 + i * (sh + gap), y: r.y + 3, w: sh, h: r.h - 6 }, color);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.5)');
  },
  // zábradlí: kovová tyč s dřevěným madlem
  railing(r, o) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, o.color || '#b9bfc3');
    const handrail = o.handrail || '#c48a4f';
    if (r.w >= r.h) drawRect({ x: r.x, y: r.y + r.h / 2 - 1.5, w: r.w, h: 3 }, handrail);
    else drawRect({ x: r.x + r.w / 2 - 1.5, y: r.y, w: 3, h: r.h }, handrail);
    drawOutline(r, 'rgba(0, 0, 0, 0.35)');
  },
  // pingpongový stůl se sítí
  pingpong(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#1f4e79');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    const horizontal = r.w >= r.h;
    if (horizontal) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(r.x + 2, r.y + r.h / 2 - 0.5, r.w - 4, 1);
      drawRect({ x: r.x + r.w / 2 - 1.5, y: r.y - 3, w: 3, h: r.h + 6 }, '#d0d4d8');
    } else {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(r.x + r.w / 2 - 0.5, r.y + 2, 1, r.h - 4);
      drawRect({ x: r.x - 3, y: r.y + r.h / 2 - 1.5, w: r.w + 6, h: 3 }, '#d0d4d8');
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.5)');
  },
  // dřevěné žebřiny u zdi: dvě podélné tyče a příčky
  wallbars(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#7a5530'); // mezery mezi příčkami
    ctx.fillStyle = '#c9965a';
    for (let x = r.x + 2; x < r.x + r.w - 1; x += 6) ctx.fillRect(x, r.y, 2, r.h);
    drawRect({ x: r.x, y: r.y, w: r.w, h: 2 }, '#a8763f');
    drawRect({ x: r.x, y: r.y + r.h - 2, w: r.w, h: 2 }, '#a8763f');
    for (let x = r.x; x <= r.x + r.w - 3; x += 30) drawRect({ x, y: r.y, w: 3, h: r.h }, '#a8763f');
  },
  // modrá tyč (na síť) – pohled shora je kroužek
  pole(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = r.w / 2;
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.arc(cx + SHADOW_LOW, cy + SHADOW_LOW, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a4fa8';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6f8fd8';
    ctx.beginPath(); ctx.arc(cx - 1.5, cy - 1.5, rad / 2.5, 0, Math.PI * 2); ctx.fill();
  },
  // školní lavice: dřevěná deska a pod ní židle
  desk(r, o) {
    drawShadow(r, SHADOW_LOW);
    const chairs = o.chairs !== false;   // chairs: false = jen stůl (katedra)
    if (chairs && (o.face === 'left' || o.face === 'right')) {   // lavice nastojato, židle vedle
      const deskW = Math.round(r.w * 0.62);
      const top = { x: o.face === 'right' ? r.x + r.w - deskW : r.x, y: r.y, w: deskW, h: r.h };
      drawRect(top, '#d8b47c');
      drawOutline(top, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = o.chair || '#3b6fb6';
      const seatW = r.w - deskW - 2;
      const seatX = o.face === 'right' ? r.x : top.x + top.w + 2;
      const n = Math.max(1, Math.round(r.h / 28));
      for (let i = 0; i < n; i++) ctx.fillRect(seatX, r.y + (i + 0.5) * r.h / n - 6, seatW, 12);
      return;
    }
    const deskH = chairs ? Math.round(r.h * 0.62) : r.h;
    // flip: lavice otočená – židle nad deskou
    const top = { x: r.x, y: o.flip ? r.y + r.h - deskH : r.y, w: r.w, h: deskH };
    drawRect(top, '#d8b47c');
    drawOutline(top, 'rgba(0, 0, 0, 0.5)');
    if (!chairs) return;
    ctx.fillStyle = o.chair || '#3b6fb6';
    const seatH = r.h - top.h - 2;
    const seatY = o.flip ? r.y : top.y + top.h + 2;
    const n = Math.max(1, Math.round(r.w / 30));
    for (let i = 0; i < n; i++) ctx.fillRect(r.x + (i + 0.5) * r.w / n - 6, seatY, 12, seatH);
  },
  // stůl s počítači podél zdi (wall = u které zdi stojí): u zdi monitory, před nimi
  // klávesnice a myš, sluchátka; na vnitřní straně žluté židle
  pcdesk(r, o) {
    const horiz = o.wall === 'top' || o.wall === 'bottom';
    const C = 14;                                    // pruh se židlemi
    const desk = {
      top:    { x: r.x, y: r.y, w: r.w, h: r.h - C },
      bottom: { x: r.x, y: r.y + C, w: r.w, h: r.h - C },
      left:   { x: r.x, y: r.y, w: r.w - C, h: r.h },
      right:  { x: r.x + C, y: r.y, w: r.w - C, h: r.h },
    }[o.wall];
    drawShadow(desk, SHADOW_LOW);
    drawRect(desk, '#e6d3ae');
    drawOutline(desk, '#b89a66');
    const len = horiz ? r.w : r.h;
    const n = Math.max(1, Math.floor(len / 52));
    for (let k = 0; k < n; k++) {
      const a = (len / n) * (k + 0.5);
      // místo jednoho počítače: m = podél stolu, d = od zdi dovnitř (0 = u zdi)
      const P = (m, d, w, h, c) => {
        const along = (horiz ? r.x : r.y) + a + m;
        let rect;
        if (o.wall === 'top') rect = { x: along - w / 2, y: desk.y + d, w, h };
        else if (o.wall === 'bottom') rect = { x: along - w / 2, y: desk.y + desk.h - d - h, w, h };
        else if (o.wall === 'right') rect = { x: desk.x + desk.w - d - h, y: along - w / 2, w: h, h: w };
        else rect = { x: desk.x + d, y: along - w / 2, w: h, h: w };
        drawRect(rect, c);
        return rect;
      };
      P(0, 3, 30, 6, '#151517');                    // monitor
      P(0, 4, 26, 2, '#2c3e5a');                    // obrazovka
      P(0, 9, 6, 4, '#2a2a2a');                     // noha monitoru
      P(-2, 17, 24, 7, '#2b2b2b');                  // klávesnice
      P(-2, 18, 22, 1, '#5a5a5a');
      P(15, 18, 5, 7, '#3a3a3a');                   // myš
      P(-17, 6, 6, 8, '#1b1b1b');                   // sluchátka
      P(0, (horiz ? r.h : r.w) - C + 2, 16, C - 3, o.chair || '#e3b23c');   // židle (pruh u vnitřní strany)
    }
  },
  // klávesy: černé tělo, bílé klávesy s černými
  keyboard(r) {
    drawShadow(r, SHADOW_LOW);
    if (r.h > r.w) {   // nastojato: stejné klávesy otočené o 90° doprava
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(Math.PI / 2);
      drawKeyboardBody({ x: -r.h / 2, y: -r.w / 2, w: r.h, h: r.w });
      ctx.restore();
      return;
    }
    drawKeyboardBody(r);
  },
  // bicí souprava shora: velký buben, tomy, malý buben, činely
  drums(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const drum = (x, y, rad, rim) => {
      ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
      ctx.beginPath(); ctx.arc(x + 2, y + 2, rad, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2efe6';
      ctx.beginPath(); ctx.arc(x, y, rad - 2.5, 0, Math.PI * 2); ctx.fill();
    };
    const cymbal = (x, y, rad) => {
      ctx.fillStyle = '#d4a52a';
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a77d14'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, rad * 0.5, 0, Math.PI * 2); ctx.stroke();
    };
    drum(cx, cy + 6, 14, '#b03030');            // velký buben
    drum(cx - 13, cy - 10, 8, '#b03030');       // tomy
    drum(cx + 13, cy - 10, 8, '#b03030');
    drum(cx - 19, cy + 13, 7, '#9a9a9a');       // malý buben
    cymbal(cx - 24, cy - 20, 7);
    cymbal(cx + 24, cy - 18, 8);
    // stolička bubeníka
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath(); ctx.arc(cx + 4, cy + 26, 5, 0, Math.PI * 2); ctx.fill();
  },
  // kytara opřená o zeď: tělo do osmičky, krk s hlavou nahoru
  guitar(r, o) {
    const cx = r.x + r.w / 2;
    const body = o.color || '#c0392b';
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.ellipse(cx + 2, r.y + r.h - 9, r.w / 2, 9, 0, 0, Math.PI * 2); ctx.fill();
    drawRect({ x: cx - 2, y: r.y + 4, w: 4, h: r.h - 18 }, '#5a3a1e');   // krk
    drawRect({ x: cx - 3, y: r.y, w: 6, h: 6 }, '#2b2b2b');              // hlava
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(cx, r.y + r.h - 10, r.w / 2, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, r.y + r.h - 22, r.w / 2 - 3, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath(); ctx.arc(cx, r.y + r.h - 15, 3, 0, Math.PI * 2); ctx.fill();   // ozvučný otvor
    if (!guitarCut(o)) {   // struny (ustřižené kvůli Málovi – 22_struny.js)
      ctx.strokeStyle = 'rgba(240, 240, 240, 0.85)'; ctx.lineWidth = 0.6;
      for (const dx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + dx, r.y + 3); ctx.lineTo(cx + dx, r.y + r.h - 8); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, r.y + r.h - 10, r.w / 2, 10, 0, 0, Math.PI * 2); ctx.stroke();
  },
  // regál s knihami
  shelf(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#6e4a2a');
    const rnd = seededRandom(Math.round(r.x * 7 + r.y));
    const colors = ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#ecf0f1'];
    const horizontal = r.w >= r.h;
    const len = horizontal ? r.w : r.h;
    for (let p = 3; p < len - 4; p += 5 + Math.floor(rnd() * 3)) {
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      if (horizontal) ctx.fillRect(r.x + p, r.y + 3, 3, r.h - 6);
      else ctx.fillRect(r.x + 3, r.y + p, r.w - 6, 3);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.6)');
  },
  // plná zeď mimo chodbu (nepravoúhlé místnosti) – kreslí ji grafika místnosti
  void() {},
  // výstražná páska přes průchod (červenobílá)
  barrier(r) {
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    drawRect(r, '#ffffff');
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 4;
    for (let k = -r.h; k < r.w + r.h; k += 12) { ctx.beginPath(); ctx.moveTo(r.x + k, r.y + r.h); ctx.lineTo(r.x + k + r.h, r.y); ctx.stroke(); }
    ctx.restore();
    drawOutline(r, 'rgba(0, 0, 0, 0.4)');
  },
  // prosklený výdejní pult: bílá zídka, dřevěný parapet, sklo, květiny na parapetu
  counter(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#f2f1ed');
    const vertical = r.h > r.w;
    const sill = vertical ? { x: r.x + r.w - 12, y: r.y, w: 12, h: r.h } : { x: r.x, y: r.y + r.h - 12, w: r.w, h: 12 };
    drawRect(sill, '#c8955a');
    const glass = vertical ? { x: r.x + 6, y: r.y + 6, w: 8, h: r.h - 12 } : { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: 8 };
    drawRect(glass, '#bcdcea');
    drawOutline(glass, '#8a6a45');
    const len = vertical ? r.h : r.w;
    for (let p = 16; p < len - 10; p += 34) {
      const cx = vertical ? sill.x + sill.w / 2 : r.x + p;
      const cy = vertical ? r.y + p : sill.y + sill.h / 2;
      drawPottedPlant(cx, cy, 7);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.45)');
  },
  // nízká bílá zídka s dřevěným parapetem a květinami
  lowwall(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#f2f1ed');
    const vertical = r.h > r.w;
    drawRect(vertical ? { x: r.x + 3, y: r.y, w: r.w - 6, h: r.h } : { x: r.x, y: r.y + 3, w: r.w, h: r.h - 6 }, '#c8955a');
    const len = vertical ? r.h : r.w;
    for (let p = 18; p < len - 10; p += 36) {
      drawPottedPlant(vertical ? r.x + r.w / 2 : r.x + p, vertical ? r.y + p : r.y + r.h / 2, 7);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.45)');
  },
  // řada modrých sedaček na černé liště; face = kam se sedí (opěradla na druhé straně)
  chairrow(r, o) {
    drawShadow(r, SHADOW_LOW);
    const vertical = r.h > r.w;
    const len = vertical ? r.h : r.w;
    const n = Math.max(1, Math.round(len / 22));
    const seat = len / n;
    drawRect(vertical ? { x: r.x + r.w / 2 - 2, y: r.y + 2, w: 4, h: r.h - 4 } : { x: r.x + 2, y: r.y + r.h / 2 - 2, w: r.w - 4, h: 4 }, '#1b1b1d');
    for (let i = 0; i < n; i++) {
      const a = i * seat + 1.5;
      const cell = vertical
        ? { x: r.x, y: r.y + a, w: r.w, h: seat - 3 }
        : { x: r.x + a, y: r.y, w: seat - 3, h: r.h };
      roundRectPath(cell.x, cell.y, cell.w, cell.h, 4);
      ctx.fillStyle = '#2459c2';
      ctx.fill();
      // opěradlo (tmavší) u zdi
      const back = o.face === 'right' ? { x: cell.x, y: cell.y, w: 7, h: cell.h }
        : o.face === 'up' ? { x: cell.x, y: cell.y + cell.h - 7, w: cell.w, h: 7 }
        : o.face === 'left' ? { x: cell.x + cell.w - 7, y: cell.y, w: 7, h: cell.h }
        : { x: cell.x, y: cell.y, w: cell.w, h: 7 };
      drawRect(back, '#173c8c');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';   // odlesk na sedáku
      if (vertical) ctx.fillRect(cell.x + 10, cell.y + 3, cell.w - 13, 2);
      else ctx.fillRect(cell.x + 3, cell.y + 10, cell.w - 6, 2);
    }
  },
  // kávovar café+co shora (u levé zdi, předek vpravo): černá skříň, barevná reklama,
  // tlačítka, výdejní okénko; velký, ať je na první pohled vidět
  coffeemachine(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#121214');
    drawRect({ x: r.x, y: r.y, w: r.w - 12, h: r.h }, '#1d1d20');
    const f = { x: r.x + r.w - 14, y: r.y + 2, w: 12, h: r.h - 4 };   // předek
    drawRect({ x: f.x, y: f.y, w: f.w, h: 18 }, '#e98a3a');           // reklama nahoře
    drawRect({ x: f.x + 2, y: f.y + 3, w: 7, h: 7 }, '#5a3420');
    drawRect({ x: f.x, y: f.y + 20, w: f.w, h: 22 }, '#f4f4f4');      // tlačítka
    ctx.fillStyle = '#9aa0a6';
    for (let k = 0; k < 5; k++) ctx.fillRect(f.x + 2, f.y + 22 + k * 4, 8, 1.5);
    drawRect({ x: f.x + 1, y: f.y + 45, w: f.w - 2, h: 10 }, '#3a3a3e');   // výdejní okénko
    drawRect({ x: f.x, y: f.y + 58, w: f.w, h: f.h - 58 }, '#4fb07a');    // reklama dole
    drawRect({ x: r.x + 4, y: r.y + 4, w: r.w - 22, h: 6 }, '#5a3420');   // horní deska s logem
    ctx.fillStyle = '#f2e3c6';
    ctx.fillRect(r.x + 7, r.y + 6, 12, 2);
    drawOutline(r, 'rgba(0, 0, 0, 0.9)');
  },
  // béžové čalouněné křeslo
  armchair(r) {
    drawShadow(r, SHADOW_LOW);
    roundRectPath(r.x, r.y, r.w, r.h, 5);
    ctx.fillStyle = '#c9b48e';
    ctx.fill();
    drawRect({ x: r.x + 2, y: r.y + 1, w: r.w - 4, h: 7 }, '#b39c74');   // opěradlo u zdi
    drawRect({ x: r.x + 1, y: r.y + 6, w: 5, h: r.h - 8 }, '#b39c74');
    drawRect({ x: r.x + r.w - 6, y: r.y + 6, w: 5, h: r.h - 8 }, '#b39c74');
    drawRect({ x: r.x + 7, y: r.y + 10, w: r.w - 14, h: r.h - 13 }, '#d8c49e');
  },
  // betonový sloup (pod schodištěm)
  concrete(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#a8a49c');
    const rnd = seededRandom(r.x * 7 + r.y);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(r.x + rnd() * (r.w - 2), r.y + rnd() * (r.h - 2), 2, 2);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.45)');
  },
  // laboratorní stůl: světlá deska se žlutou hranou, nerezová umyvadla (sinks = poloha
  // podél delší strany), žluté židle se zeleným rámem na stranách chairs
  labbench(r, o) {
    const look = o.look || {};   // volitelné barvy: top, edge, chair, chairBack, chairEdge
    const C = 12;   // hloubka pásu se židlemi
    const ch = o.chairs || [];
    const top = {
      x: r.x + (ch.includes('left') ? C : 0), y: r.y + (ch.includes('top') ? C : 0),
      w: r.w - (ch.includes('left') ? C : 0) - (ch.includes('right') ? C : 0),
      h: r.h - (ch.includes('top') ? C : 0) - (ch.includes('bottom') ? C : 0),
    };
    for (const side of ch) {   // židle
      const along = side === 'top' || side === 'bottom';
      const len = along ? top.w : top.h;
      const n = Math.max(1, Math.floor(len / 26));
      for (let k = 0; k < n; k++) {
        const a = (len / n) * (k + 0.5);
        const seat = along
          ? { x: top.x + a - 8, y: side === 'top' ? r.y + 1 : top.y + top.h + 1, w: 16, h: C - 2 }
          : { x: side === 'left' ? r.x + 1 : top.x + top.w + 1, y: top.y + a - 8, w: C - 2, h: 16 };
        drawShadow(seat, 2);
        drawRect(seat, look.chair || '#e3b23c');
        const back = { top: { x: seat.x, y: seat.y, w: seat.w, h: 3 }, bottom: { x: seat.x, y: seat.y + seat.h - 3, w: seat.w, h: 3 },
          left: { x: seat.x, y: seat.y, w: 3, h: seat.h }, right: { x: seat.x + seat.w - 3, y: seat.y, w: 3, h: seat.h } }[side];
        drawRect(back, look.chairBack || '#c8962a');
        drawOutline(seat, look.chairEdge || '#2e7d4a');
      }
    }
    drawShadow(top, SHADOW_LOW);
    drawRect(top, look.top || '#e6d3ae');
    drawRect({ x: top.x + 2, y: top.y + 2, w: top.w - 4, h: top.h - 4 }, look.top || '#efdfbe');
    drawOutline(top, look.edge || '#d4a62a');
    const long = top.w >= top.h;
    for (const at of o.sinks || []) {   // umyvadlo s kohoutkem
      const cx = long ? top.x + top.w * at : top.x + top.w / 2;
      const cy = long ? top.y + top.h / 2 : top.y + top.h * at;
      const sink = { x: cx - 8, y: cy - 6, w: 16, h: 12 };
      drawRect(sink, '#aeb6bc');
      drawRect({ x: sink.x + 2, y: sink.y + 2, w: 12, h: 8 }, '#d6dde1');
      drawRect({ x: cx - 1, y: sink.y - 3, w: 2, h: 5 }, '#7d868c');
      drawOutline(sink, '#6f777c');
    }
  },
  // kancelářská tiskárna shora: šedá, nahoře víko skeneru, dole zásobník a vyjetý papír
  printer(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#c8cbce');
    drawRect({ x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h * 0.45 }, '#8f9499');     // víko skeneru
    drawRect({ x: r.x + 5, y: r.y + 5, w: r.w - 10, h: 3 }, '#b9c9d6');
    drawRect({ x: r.x + 4, y: r.y + r.h * 0.6, w: r.w - 8, h: 5 }, '#2b2b2b');       // výstup papíru
    drawRect({ x: r.x + 6, y: r.y + r.h * 0.6 + 4, w: r.w - 12, h: 8 }, '#ffffff');   // papír
    drawRect({ x: r.x + r.w - 9, y: r.y + r.h - 9, w: 5, h: 5 }, '#3fbf6a');         // kontrolka
    drawOutline(r, 'rgba(0, 0, 0, 0.55)');
  },
  // kulatý stolek na černé noze s modrou židlí
  roundtable(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = Math.min(r.w, r.h) / 2 - 6;
    ctx.fillStyle = '#6aa6dc';   // židle (vykukuje vpravo dole)
    roundRectPath(cx + rad - 8, cy + 4, 16, 16, 4); ctx.fill();
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.arc(cx + 3, cy + 3, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dca66a';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath(); ctx.arc(cx - rad * 0.3, cy - rad * 0.3, rad * 0.35, 0, Math.PI * 2); ctx.fill();
  },
  // jeviště v aule: dřevěné pódium, světlejší přední hrana
  stage(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#7a4a26');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let x = r.x + 12; x < r.x + r.w; x += 12) ctx.fillRect(x, r.y, 1, r.h);
    drawRect({ x: r.x + r.w - 6, y: r.y, w: 6, h: r.h }, '#a8703f');
    drawOutline(r, 'rgba(0, 0, 0, 0.6)');
  },
  // černé křídlo (klavír)
  piano(r) {
    drawShadow(r, SHADOW_TALL);
    ctx.fillStyle = '#111113';
    ctx.beginPath();
    ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y); ctx.lineTo(r.x + r.w, r.y + r.h * 0.45);
    ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w * 0.45, r.y + r.h); ctx.lineTo(r.x, r.y + r.h);
    ctx.closePath(); ctx.fill();
    drawRect({ x: r.x, y: r.y, w: r.w, h: 6 }, '#f4f4f0');   // klávesy
    ctx.fillStyle = '#111113';
    for (let x = r.x + 3; x < r.x + r.w - 2; x += 5) ctx.fillRect(x, r.y, 2, 4);
  },
  // řady židlí v aule (čelem k jevišti vlevo): fialový sedák, dřevěné opěradlo vpravo
  aulachairs(r) {
    for (let x = r.x + 4; x + 20 <= r.x + r.w; x += 34) {
      for (let y = r.y + 3; y + 20 <= r.y + r.h; y += 24) {
        drawShadow({ x, y, w: 20, h: 20 }, 2);
        drawRect({ x, y, w: 20, h: 20 }, '#6b2a5e');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(x + 3, y + 3, 12, 2);
        drawRect({ x: x + 16, y: y - 1, w: 6, h: 22 }, '#b9905e');   // opěradlo
      }
    }
  },
  // vysoká dřevěná skříň
  wardrobe(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#b07a44');
    drawRect({ x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, '#c48c52');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(r.x + 2, r.y + r.h / 2, r.w - 4, 1);
    drawOutline(r, 'rgba(60, 35, 15, 0.7)');
  },
  // nízký dřevěný konferenční stolek
  lowtable(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#b98652');
    drawRect({ x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, '#d3a46c');
    ctx.fillStyle = 'rgba(120, 72, 30, 0.25)';   // léta dřeva
    if (r.w >= r.h) for (let y = r.y + 6; y < r.y + r.h - 3; y += 6) ctx.fillRect(r.x + 4, y, r.w - 8, 1);
    else for (let x = r.x + 6; x < r.x + r.w - 3; x += 6) ctx.fillRect(x, r.y + 4, 1, r.h - 8);
    drawOutline(r, 'rgba(70, 40, 15, 0.6)');
  },
  // černý stolek s šachovnicí
  chesstable(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#1c1c1e');
    const b = { x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 };
    const c = b.w / 8;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#2a2a2a' : '#ececec';
      ctx.fillRect(b.x + i * c, b.y + j * (b.h / 8), c, b.h / 8);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.7)');
  },
  // tmavomodrý sedací vak
  beanbag(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 3, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22386e';
    ctx.beginPath(); ctx.ellipse(cx, cy, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f4c90';
    ctx.beginPath(); ctx.ellipse(cx - 2, cy - 2, r.w / 3, r.h / 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';   // šev uprostřed (důlek od sezení)
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, r.w / 5, r.h / 6, 0, 0, Math.PI * 2); ctx.stroke();
  },
  // stolní fotbal: černá skříň, zelené hřiště, tyče s hráčky, rukojeti nahoře a dole
  foosball(r) {
    drawShadow(r, SHADOW_TALL);
    const body = { x: r.x, y: r.y + 7, w: r.w, h: r.h - 14 };
    // tyče s rukojetmi
    const rods = 8;
    const gap = (body.w - 16) / rods;
    for (let i = 0; i < rods; i++) {
      const x = body.x + 8 + gap * (i + 0.5);
      drawRect({ x: x - 1, y: r.y + 1, w: 2, h: r.h - 2 }, '#c9ccd0');
      drawRect({ x: x - 2, y: i % 2 ? r.y : r.y + r.h - 6, w: 4, h: 6 }, '#111111');   // rukojeť
    }
    drawRect(body, '#1a1a1c');
    const field = { x: body.x + 6, y: body.y + 5, w: body.w - 12, h: body.h - 10 };
    drawRect(field, '#2f8a3e');
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(field.x + 1.5, field.y + 1.5, field.w - 3, field.h - 3);
    ctx.beginPath();
    ctx.moveTo(field.x + field.w / 2, field.y + 1); ctx.lineTo(field.x + field.w / 2, field.y + field.h - 1);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(field.x + field.w / 2, field.y + field.h / 2, 5, 0, Math.PI * 2); ctx.stroke();
    // branky
    drawRect({ x: body.x + 2, y: body.y + body.h / 2 - 6, w: 4, h: 12 }, '#d9d9d9');
    drawRect({ x: body.x + body.w - 6, y: body.y + body.h / 2 - 6, w: 4, h: 12 }, '#d9d9d9');
    // tyče přes hřiště a hráčci (střídavě červení a modří)
    const players = [1, 2, 3, 5, 5, 3, 2, 1];
    for (let i = 0; i < rods; i++) {
      const x = body.x + 8 + gap * (i + 0.5);
      drawRect({ x: x - 0.5, y: body.y, w: 1.5, h: body.h }, '#d7dade');
      const n = players[i];
      for (let k = 0; k < n; k++) {
        const y = field.y + field.h * (k + 0.5) / n;
        ctx.fillStyle = [0, 1, 3, 5].includes(i) ? '#d23b2f' : '#2e63c9';
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    ctx.fillStyle = '#e8e8e8';   // míček
    ctx.beginPath(); ctx.arc(field.x + field.w * 0.42, field.y + field.h * 0.6, 1.8, 0, Math.PI * 2); ctx.fill();
    drawOutline(body, 'rgba(0, 0, 0, 0.8)');
  },
  // automat na kávu: černý, nahoře hnědý pruh, tlačítka, barevný bok (předek dole)
  vending(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#141416');
    drawRect({ x: r.x, y: r.y, w: r.w, h: 8 }, '#5a3420');
    drawRect({ x: r.x + 4, y: r.y + 2, w: 14, h: 4 }, '#f2e3c6');
    drawRect({ x: r.x + r.w - 14, y: r.y + 8, w: 14, h: r.h - 8 }, '#e98a3a');   // reklama na boku
    drawRect({ x: r.x + r.w - 12, y: r.y + 12, w: 10, h: 10 }, '#f3d3b0');
    ctx.fillStyle = '#f4f4f4';   // tlačítka
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ctx.fillRect(r.x + 5 + i * 7, r.y + 12 + j * 5, 5, 3);
    drawRect({ x: r.x + 8, y: r.y + r.h - 9, w: 14, h: 7 }, '#3a3a3e');   // výdej kelímku
    drawRect({ x: r.x + 26, y: r.y + r.h - 10, w: 6, h: 4 }, '#7fd0f0');   // displej
    drawOutline(r, 'rgba(0, 0, 0, 0.8)');
  },
  // informační kiosek: bílý stolek a na něm modrá obrazovka
  kiosk(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#e9e7e2');
    drawOutline(r, 'rgba(0, 0, 0, 0.4)');
    const sc = { x: r.x + r.w / 2 - 11, y: r.y + 3, w: 22, h: 15 };
    drawShadow(sc, 2);
    drawRect(sc, '#1f4fb0');
    drawRect({ x: sc.x + 2, y: sc.y + 2, w: sc.w - 4, h: sc.h - 6 }, '#5a8fe0');
    drawRect({ x: r.x + r.w / 2 - 6, y: r.y + r.h - 9, w: 12, h: 4 }, '#2b2b2b');   // klávesnice
  },
  // dřevěná vitrína na kolečkách, za sklem 3D tiskárna (oranžový rám, modrý výtisk)
  showcase(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#d9b77e');
    drawRect({ x: r.x, y: r.y, w: r.w, h: 4 }, '#e8cc98');
    const g = { x: r.x + 4, y: r.y + 6, w: r.w - 8, h: r.h - 12 };
    drawRect(g, '#bcd6df');
    drawRect({ x: g.x + 4, y: g.y + 4, w: g.w - 8, h: 3 }, '#e8742c');
    drawRect({ x: g.x + 4, y: g.y + 4, w: 3, h: g.h - 8 }, '#e8742c');
    drawRect({ x: g.x + g.w - 7, y: g.y + 4, w: 3, h: g.h - 8 }, '#e8742c');
    drawRect({ x: g.x + g.w / 2 - 5, y: g.y + g.h / 2 - 2, w: 10, h: 8 }, '#2d7fd6');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';   // odlesk skla
    ctx.fillRect(g.x + 2, g.y + 2, 2, g.h - 4);
    drawOutline(g, '#8a6a45');
    drawOutline(r, 'rgba(70, 40, 15, 0.7)');
  },
  // koše na tříděný odpad: žlutý (plast) a modrý (papír)
  bins(r) {
    drawShadow(r, SHADOW_LOW);
    const half = r.w / 2;
    for (const [i, c, d] of [[0, '#f0c419', '#c79d0c'], [1, '#2e63c9', '#1d468f']]) {
      const b = { x: r.x + i * half, y: r.y, w: half - 1, h: r.h };
      drawRect(b, c);
      drawRect({ x: b.x + 2, y: b.y + 2, w: b.w - 4, h: 3 }, d);   // otvor ve víku
      drawOutline(b, 'rgba(0, 0, 0, 0.55)');
    }
  },
  // prosklená vitrína s poháry (u zdi)
  trophies(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#c7cdd2');
    const g = { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 };
    drawRect(g, '#dfeaf0');
    const vertical = r.h > r.w;
    for (let a = 5, i = 0; a < (vertical ? g.h : g.w) - 3; a += 8, i++) {
      const b = i % 2 ? 6 : 11;
      const x = vertical ? g.x + b : g.x + a, y = vertical ? g.y + a : g.y + b;
      ctx.fillStyle = i % 3 === 2 ? '#c0c4c8' : '#e2b52c';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a1c';
      ctx.fillRect(x - 1, y + 3, 2, 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(g.x + 1, g.y + 1, g.w - 2, 1);
    drawOutline(r, 'rgba(0, 0, 0, 0.5)');
  },
  // hasicí přístroj
  extinguisher(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.arc(cx + 2, cy + 2, r.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d7261e';
    ctx.beginPath(); ctx.arc(cx, cy, r.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + 6, cy, cx + 5, cy + 6); ctx.stroke();
  },
  // kované zábradlí (budova A): dvě tyče, mezi nimi zatočené pruty (esíčka),
  // nahoře dřevěné madlo s odleskem
  ironrail(r) {
    const vertical = r.h > r.w;
    const len = vertical ? r.h : r.w;
    const c = vertical ? r.x + r.w / 2 : r.y + r.h / 2;
    const P = (along, across) => (vertical ? [c + across, r.y + along] : [r.x + along, c + across]);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';   // stín zábradlí
    if (vertical) ctx.fillRect(r.x + 3, r.y + 3, r.w, r.h); else ctx.fillRect(r.x + 3, r.y + 3, r.w, r.h);
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const side of [-3, 3]) { ctx.moveTo(...P(0, side)); ctx.lineTo(...P(len, side)); }
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let a = 4, i = 0; a < len - 6; a += 12, i++) {   // esíčka střídavě na obě strany
      const k = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(...P(a, -3));
      ctx.bezierCurveTo(...P(a + 6 * k + 6, -3), ...P(a - 6 * k + 6, 3), ...P(a + 12, 3));
      ctx.stroke();
      ctx.beginPath(); ctx.arc(...P(a + 3, -1.2 * k), 1.3, 0, Math.PI * 2); ctx.stroke();
    }
    drawRect(vertical ? { x: c - 2, y: r.y, w: 4, h: r.h } : { x: r.x, y: c - 2, w: r.w, h: 4 }, '#a8703f');
    drawRect(vertical ? { x: c - 2, y: r.y, w: 1, h: r.h } : { x: r.x, y: c - 2, w: r.w, h: 1 }, '#d19a63');
  },
  // velká květina v květináči
  plant(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.arc(cx + SHADOW_LOW, cy + SHADOW_LOW, r.w / 2, 0, Math.PI * 2); ctx.fill();
    drawPottedPlant(cx, cy, r.w / 2);
  },
  // tabule na stojanu (venku)
  board(r, o) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, o.frame || '#8a5a2e');
    drawRect({ x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, o.face || '#24513a');
    drawOutline(r, 'rgba(0, 0, 0, 0.6)');
  },
  // kabinka na WC: přepážky, záchod, barevné dveře dole
  stall(r, o) {
    if (o.facing === 'right') { drawTurned(r, -Math.PI / 2, (rr) => OBSTACLE_ART.stall(rr, { ...o, facing: null })); return; }   // dvířka vpravo, mísa u levé zdi
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#c9cfd4');
    drawRect({ x: r.x + 3, y: r.y, w: r.w - 6, h: r.h - 6 }, '#eef1f3');
    roundRectPath(r.x + r.w / 2 - 9, r.y + 4, 18, 24, 7);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#9aa3aa'; ctx.lineWidth = 1; ctx.stroke();
    drawRect({ x: r.x + 3, y: r.y + r.h - 6, w: r.w - 6, h: 6 }, o.door || '#4a7fc0');
    drawOutline(r, 'rgba(0, 0, 0, 0.45)');
  },
  // počítač na stole shora: podstavec, monitor obrazovkou doprava, klávesnice
  monitor(r) {
    drawRect({ x: r.x + 1, y: r.y + r.h / 2 - 4, w: 5, h: 8 }, '#37474f');            // podstavec
    drawRect({ x: r.x + 5, y: r.y, w: 5, h: r.h }, '#212121');                        // monitor
    drawRect({ x: r.x + 9, y: r.y + 2, w: 2, h: r.h - 4 }, '#64b5f6');                // svítící obrazovka
    drawRect({ x: r.x + 13, y: r.y + 5, w: 3, h: r.h - 10 }, '#cfd8dc');              // klávesnice
  },
  // pisoár (mušle) na pravé zdi: bílá mísa, splachovací trubka u zdi
  urinal(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect({ x: r.x + r.w - 4, y: r.y + 2, w: 4, h: r.h - 4 }, '#b0bec5');   // trubka a úchyt u zdi
    roundRectPath(r.x, r.y, r.w - 3, r.h, 9);
    ctx.fillStyle = '#fbfcfc'; ctx.fill();
    ctx.strokeStyle = '#9aa3aa'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#dfe7ec';
    ctx.beginPath(); ctx.ellipse(r.x + (r.w - 3) / 2, r.y + r.h / 2, (r.w - 3) / 2 - 4, r.h / 2 - 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a949b'; ctx.beginPath(); ctx.arc(r.x + (r.w - 3) / 2, r.y + r.h / 2 + 3, 1.6, 0, Math.PI * 2); ctx.fill();   // odtok
  },
  // zídka na WC (stejné barvy jako zdi WC kluci)
  wcwall(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#f4f6f7');
    drawRect({ x: r.x, y: r.y + r.h - 3, w: r.w, h: 3 }, '#4a7fc0');
    drawOutline(r, '#9aa3aa');
  },
  // umyvadlo u zdi
  sink(r, o = {}) {
    if (o.wall === 'bottom') { drawTurned(r, -Math.PI / 2, (rr) => OBSTACLE_ART.sink(rr)); return; }   // kohoutek u spodní zdi
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#f7f8f9');
    ctx.fillStyle = '#b9c3ca';
    ctx.beginPath(); ctx.ellipse(r.x + r.w / 2 + 2, r.y + r.h / 2, r.w / 2 - 6, r.h / 2 - 6, 0, 0, Math.PI * 2); ctx.fill();
    drawRect({ x: r.x, y: r.y + r.h / 2 - 2, w: 5, h: 4 }, '#8a949b');   // kohoutek
    drawOutline(r, 'rgba(0, 0, 0, 0.4)');
  },
  // auto shora: karoserie, přední a zadní sklo, kola
  car(r, o) {
    if (o.dir === 'down' && !o._turned) {   // čelem dolů: nakreslí se čelem nahoru a otočí o 180°
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(Math.PI);
      OBSTACLE_ART.car({ x: -r.w / 2, y: -r.h / 2, w: r.w, h: r.h }, { ...o, _turned: true });
      ctx.restore();
      return;
    }
    if (r.w > r.h) {   // naležato: nakreslí se jako nastojato a otočí, předek je vpravo
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(Math.PI / 2);
      OBSTACLE_ART.car({ x: -r.h / 2, y: -r.w / 2, w: r.h, h: r.w }, o);
      ctx.restore();
      return;
    }
    drawShadow(r, SHADOW_LOW);
    ctx.fillStyle = '#1b1b1b';
    for (const [wx, wy] of [[r.x - 2, r.y + 10], [r.x + r.w - 3, r.y + 10], [r.x - 2, r.y + r.h - 20], [r.x + r.w - 3, r.y + r.h - 20]]) {
      if (o.flat) ctx.fillRect(wx - 2, wy - 1, 8, 14);   // propíchnutá guma: placatá a širší
      else ctx.fillRect(wx, wy, 5, 12);
    }
    roundRectPath(r.x, r.y, r.w, r.h, 8);
    ctx.fillStyle = o.color || '#c0392b'; ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'; ctx.lineWidth = 1; ctx.stroke();
    drawRect({ x: r.x + 5, y: r.y + 12, w: r.w - 10, h: 12 }, '#2c3e50');           // přední sklo
    drawRect({ x: r.x + 6, y: r.y + r.h - 18, w: r.w - 12, h: 9 }, '#2c3e50');      // zadní sklo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(r.x + 6, r.y + 26, r.w - 12, r.h - 46);                           // střecha
    // světla vpředu a vzadu, zrcátka po stranách u předního skla
    ctx.fillStyle = '#f3e7b0';
    ctx.fillRect(r.x + 4, r.y + 1, 7, 3); ctx.fillRect(r.x + r.w - 11, r.y + 1, 7, 3);
    ctx.fillStyle = '#c0281c';
    ctx.fillRect(r.x + 4, r.y + r.h - 4, 7, 3); ctx.fillRect(r.x + r.w - 11, r.y + r.h - 4, 7, 3);
    ctx.fillStyle = o.color || '#c0392b';
    ctx.fillRect(r.x - 4, r.y + 18, 4, 5); ctx.fillRect(r.x + r.w, r.y + 18, 4, 5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(r.x - 4, r.y + 22, 4, 1); ctx.fillRect(r.x + r.w, r.y + 22, 4, 1);
    if (o.flat) {   // auto na propíchnutých gumách si sedne – ztmavne
      roundRectPath(r.x, r.y, r.w, r.h, 8);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'; ctx.fill();
    }
  },
  // nižší přístavba shora: plochá střecha (štěrk), žluté zdi, velká okna na boku
  annex(r) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#e0cf78');
    drawRect({ x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 8 }, '#a9a497');
    const rnd = seededRandom(r.x + r.h);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(r.x + 5 + rnd() * (r.w - 10), r.y + 5 + rnd() * (r.h - 10), 1.5, 1.5);
    }
    for (let y = r.y + 10; y < r.y + r.h - 24; y += 34) {   // velká okna na levém boku
      drawRect({ x: r.x, y, w: 4, h: 26 }, '#7f5532');
      drawRect({ x: r.x + 1, y: y + 2, w: 2, h: 22 }, '#bcd6e2');
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.5)');
  },
  // nízký keř
  bush(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 3, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b7a4e';
    ctx.beginPath(); ctx.ellipse(cx, cy, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7f8e5c';
    for (const [dx, dy] of [[-0.25, -0.2], [0.2, -0.15], [0, 0.15]]) {
      ctx.beginPath(); ctx.ellipse(cx + dx * r.w, cy + dy * r.h, r.w / 4, r.h / 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  // kovový plot: tenká tyč se sloupky
  fence(r) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(r.x + 2, r.y + 3, r.w, r.h);
    const vertical = r.h > r.w;
    drawRect(vertical ? { x: r.x + r.w / 2 - 1, y: r.y, w: 2, h: r.h } : { x: r.x, y: r.y + r.h / 2 - 1, w: r.w, h: 2 }, '#3a3a3a');
    ctx.fillStyle = '#7a5a3a';
    const len = vertical ? r.h : r.w;
    for (let a = 0; a <= len - 4; a += 40) ctx.fillRect(vertical ? r.x : r.x + a, vertical ? r.y + a : r.y, 5, 5);
  },
  // kamenná zídka s kovovým plotem nahoře
  stonewall(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#9b958a');
    const rnd = seededRandom(r.x + r.y * 3);
    for (let y = r.y + 2; y < r.y + r.h - 4; y += 9) {
      ctx.fillStyle = rnd() < 0.5 ? '#aaa49a' : '#8b857a';
      ctx.fillRect(r.x + 2, y, r.w - 4, 7);
    }
    ctx.fillStyle = '#3a3a3a';   // plot
    ctx.fillRect(r.x + r.w / 2 - 1, r.y, 2, r.h);
    for (let y = r.y + 6; y < r.y + r.h; y += 24) ctx.fillRect(r.x + r.w / 2 - 2, y, 4, 4);
    drawOutline(r, 'rgba(0, 0, 0, 0.45)');
  },
  // garáž: šedá střecha, vlevo hnědá dvoukřídlá vrata
  garage(r, o) {
    drawShadow(r, SHADOW_TALL);
    drawRect(r, '#b9b3a6');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = r.x + 8; x < r.x + r.w; x += 10) ctx.fillRect(x, r.y, 1, r.h);   // plech na střeše
    const face = (o && o.face) || 'left';   // na které straně jsou vrata
    const horiz = face === 'down';
    const gate = {
      down:  { x: r.x + 24, y: r.y + r.h - 8, w: r.w - 48, h: 8 },
      right: { x: r.x + r.w - 8, y: r.y + 24, w: 8, h: r.h - 48 },
      left:  { x: r.x, y: r.y + 30, w: 8, h: r.h - 60 },
    }[face];
    drawRect(gate, '#6b3b2a');
    if (horiz) drawRect({ x: gate.x + gate.w / 2 - 1, y: gate.y, w: 2, h: gate.h }, '#3a2018');
    else drawRect({ x: gate.x, y: gate.y + gate.h / 2 - 1, w: gate.w, h: 2 }, '#3a2018');
    drawOutline(r, 'rgba(0, 0, 0, 0.55)');
  },
  // venkovní stůl: dřevěná deska z prken, černé nohy v rozích
  outtable(r) {
    drawShadow(r, SHADOW_LOW);
    drawRect(r, '#c99a5e');
    ctx.fillStyle = 'rgba(90, 55, 20, 0.35)';
    for (let y = r.y + 6; y < r.y + r.h - 2; y += 6) ctx.fillRect(r.x, y, r.w, 1);
    ctx.fillStyle = '#1e1e1e';
    for (const [lx, ly] of [[r.x + 3, r.y + 2], [r.x + r.w - 6, r.y + 2], [r.x + 3, r.y + r.h - 5], [r.x + r.w - 6, r.y + r.h - 5]]) {
      ctx.fillRect(lx, ly, 3, 3);
    }
    drawOutline(r, 'rgba(0, 0, 0, 0.55)');
  },
  // strom: pevný je jen kmen (r), koruna přesahuje
  tree(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = r.w * 0.85;
    ctx.fillStyle = CONFIG.CHARACTER_SHADOW;
    ctx.beginPath(); ctx.arc(cx + SHADOW_TALL, cy + SHADOW_TALL, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f6b2a';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f8a36';
    ctx.beginPath(); ctx.arc(cx - rad * 0.25, cy - rad * 0.25, rad * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
  },
};

// Béžové dlaždice, náhodně některé vínové; jemné škrábance
function drawAccentTile(g, size, o) {
  const rnd = seededRandom(o.seed);
  const n = Math.round(size / o.tile);
  for (let ty = 0; ty < n; ty++) {
    for (let tx = 0; tx < n; tx++) {
      const x = tx * o.tile, y = ty * o.tile;
      g.fillStyle = rnd() < o.accentChance ? o.accent : o.base;
      g.fillRect(x, y, o.tile, o.tile);
      const shade = (rnd() - 0.5) * o.tileVariation;
      g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
      g.fillRect(x, y, o.tile, o.tile);
      g.strokeStyle = 'rgba(80, 40, 30, 0.25)';
      g.lineWidth = 0.6;
      for (let i = 0; i < 2; i++) {
        const sx = x + rnd() * o.tile, sy = y + rnd() * o.tile;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 2 + rnd() * 3, sy + (rnd() - 0.5) * 2); g.stroke();
      }
    }
  }
  g.fillStyle = o.grout;
  for (let i = 0; i < n; i++) {
    g.fillRect(i * o.tile, 0, 1, size);
    g.fillRect(0, i * o.tile, size, 1);
  }
}

// Parkety: řady prken posunuté o půl prkna, každé prkno trochu jiný odstín
function drawParquetTile(g, size, o) {
  const rnd = seededRandom(o.seed);
  const rows = Math.round(size / o.plankH);
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * o.plankW / 2;
    for (let x = -o.plankW; x < size + o.plankW; x += o.plankW) {
      g.fillStyle = o.colors[Math.floor(rnd() * o.colors.length)];
      g.fillRect(x + offset, row * o.plankH, o.plankW, o.plankH);
      g.fillStyle = o.gap;
      g.fillRect(x + offset, row * o.plankH, 0.6, o.plankH);
    }
    g.fillStyle = o.gap;
    g.fillRect(0, row * o.plankH, size, 0.6);
  }
}

// Parkety do stromečku: prkénka 2 : 1 střídavě naležato a nastojato (dlaždice 4 × 4 jednotky)
function drawHerringboneTile(g, size, colors = ['#b49a7c', '#a88f72', '#bba486', '#9f8769', '#ae9576']) {
  const u = size / 4;
  const plank = (x, y, w, h, c) => {
    g.fillStyle = c; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(70, 50, 30, 0.35)';
    g.fillRect(x, y, w, 0.6); g.fillRect(x, y, 0.6, h);
  };
  for (let k = -3; k <= 3; k++) for (let m = -4; m <= 4; m++) {
    const hx = (2 * k + m) * u, hy = (2 * k - m) * u;
    // barva podle polohy v dlaždici, ať na sebe kraje dlaždic navazují
    const a = (((2 * k + m) % 4) + 4) % 4, b = (((2 * k - m) % 4) + 4) % 4;
    const c = colors[(a * 7 + b * 3) % 5];
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      plank(hx + ox, hy + oy, 2 * u, u, c);                         // naležato
      plank(hx + u + ox, hy + u + oy, u, 2 * u, colors[(a * 3 + b * 7 + 2) % 5]);   // nastojato
    }
  }
}

// Obrázky dětí na zdi (barevné obdélníčky v pásu zdi)
function drawWallPosters(room, side, from, to, seed) {
  const rnd = seededRandom(seed);
  const t = CONFIG.WALL_THICKNESS;
  const colors = ['#d9534f', '#f0ad4e', '#5bc0de', '#5cb85c', '#9b59b6', '#f7f1e3', '#34495e'];
  const horizontal = side === 'top' || side === 'bottom';
  const across = { top: room.y, bottom: room.y + room.h - t, left: room.x, right: room.x + room.w - t }[side] + 4;
  const start = horizontal ? room.x + room.w * from : room.y + room.h * from;
  const end = horizontal ? room.x + room.w * to : room.y + room.h * to;
  for (let p = start; p < end; p += 22 + rnd() * 10) {
    const len = 12 + rnd() * 6;
    const r = horizontal ? { x: p, y: across, w: len, h: t - 8 } : { x: across, y: p, w: t - 8, h: len };
    drawRect(r, colors[Math.floor(rnd() * colors.length)]);
    drawOutline(r, 'rgba(0, 0, 0, 0.4)');
  }
}

// Basketbalový koš u zdi: deska, obroučka, síťka. dir = směr do místnosti (+1 / -1 po ose X)
function drawHoop(x, y, dir) {
  drawShadow({ x: x - 3, y: y - 22, w: 6, h: 44 }, SHADOW_LOW);
  drawRect({ x: x - 3, y: y - 22, w: 6, h: 44 }, '#ffffff');
  drawOutline({ x: x - 3, y: y - 22, w: 6, h: 44 }, '#555555');
  const cx = x + dir * 14;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, y, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#e8590c';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, y, 9, 0, Math.PI * 2); ctx.stroke();
}

// Květina shora: terakotový květináč a listy do kruhu
function drawPottedPlant(cx, cy, rad) {
  ctx.fillStyle = '#c0643a';
  ctx.beginPath(); ctx.arc(cx, cy, rad * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2f7a35';
  ctx.lineWidth = Math.max(1.5, rad * 0.22);
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7 + 0.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * rad * 1.1, cy + Math.sin(a) * rad * 1.1);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#4a9a46';
  ctx.beginPath(); ctx.arc(cx, cy, rad * 0.3, 0, Math.PI * 2); ctx.fill();
}

// Žlutočerný výstražný pruh na hraně schodu
function drawHazardStripe(x, y, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#f2c81b';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  for (let k = -h - w; k < w + h; k += 9) {
    ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h + Math.min(w, h), y - Math.min(w, h)); ctx.stroke();
  }
  ctx.restore();
}

// Kamenné schody (budova A, podle fotky): světlé stupně – nášlap světlejší
// vzadu, u hrany světlá linka a stín podstupnice; po stranách bílé schodnice.
// dir = kam schody stoupají ('up' / 'down' / 'left' / 'right')
function drawStoneFlight(f, dir, step = 16) {
  const vertical = dir === 'up' || dir === 'down';
  const len = vertical ? f.h : f.w;
  ctx.save();
  ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.clip();
  drawRect(f, '#e7e0d3');
  // stupně odshora (od nejvyššího) – „zadní“ část nášlapu je na straně stoupání
  for (let p = 0; p < len; p += step) {
    const b = vertical ? { x: f.x, y: f.y + p, w: f.w, h: step } : { x: f.x + p, y: f.y, w: step, h: f.h };
    const back = { up: [b.x, b.y, b.x, b.y + b.h], down: [b.x, b.y + b.h, b.x, b.y],
                   left: [b.x, b.y, b.x + b.w, b.y], right: [b.x + b.w, b.y, b.x, b.y] }[dir];
    const g = ctx.createLinearGradient(...back);
    g.addColorStop(0, '#f5f1e8');
    g.addColorStop(1, '#dcd3c3');
    ctx.fillStyle = g;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // hrana schodu na straně dolů: světlá linka nášlapu a pod ní stín podstupnice
    const edge = {
      up:    [[b.x, b.y + b.h - 3, b.w, 1, '#fffdf8'], [b.x, b.y + b.h - 2, b.w, 2, '#a99d88']],
      down:  [[b.x, b.y + 2, b.w, 1, '#fffdf8'], [b.x, b.y, b.w, 2, '#a99d88']],
      left:  [[b.x + b.w - 3, b.y, 1, b.h, '#fffdf8'], [b.x + b.w - 2, b.y, 2, b.h, '#a99d88']],
      right: [[b.x + 2, b.y, 1, b.h, '#fffdf8'], [b.x, b.y, 2, b.h, '#a99d88']],
    }[dir];
    for (const [x, y, w, h, c] of edge) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  }
  // celé rameno lehce tmavne směrem dolů (hloubka)
  const low = { up: [f.x, f.y, f.x, f.y + f.h], down: [f.x, f.y + f.h, f.x, f.y],
                left: [f.x, f.y, f.x + f.w, f.y], right: [f.x + f.w, f.y, f.x, f.y] }[dir];
  const shade = ctx.createLinearGradient(...low);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(60, 45, 25, 0.14)');
  ctx.fillStyle = shade;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  // bílé schodnice po stranách
  ctx.fillStyle = '#fbfaf7';
  if (vertical) { ctx.fillRect(f.x, f.y, 5, f.h); ctx.fillRect(f.x + f.w - 5, f.y, 5, f.h); }
  else { ctx.fillRect(f.x, f.y, f.w, 5); ctx.fillRect(f.x, f.y + f.h - 5, f.w, 5); }
  ctx.fillStyle = '#bdb5a6';
  if (vertical) { ctx.fillRect(f.x + 5, f.y, 1, f.h); ctx.fillRect(f.x + f.w - 6, f.y, 1, f.h); }
  else { ctx.fillRect(f.x, f.y + 5, f.w, 1); ctx.fillRect(f.x, f.y + f.h - 6, f.w, 1); }
  // nenápadná šipka směru stoupání
  ctx.fillStyle = 'rgba(120, 95, 60, 0.28)';
  ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
  ctx.rotate({ up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[dir]);
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -11); ctx.lineTo(-2, 0); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Podesta z teraca s tmavým lemem (jako na fotce)
function drawStairLanding(r) {
  fillOldBuildingFloor(r);
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(r.x + 4.5, r.y + 4.5, r.w - 9, r.h - 9);
}

// Chodba v 1. patře budovy A: teraco jako v přízemí, světlo lamp pod klenbami,
// okna, zavřené dřevěné dveře nakreslené do zdi (zatím nikam nevedou) a arkády
// v horní zdi (světlé otvory s kovaným zábradlím).
//   windows = [[strana, poloha 0..1, délka]]
//   doors   = [['h' | 'v', x, y]] – 'h' ve vodorovné zdi (střed x, horní hrana zdi y),
//             'v' ve svislé zdi (levá hrana zdi x, střed y); px od rohu dílu
//   arcade  = [[x1, x2]] – úseky horní zdi s arkádami
function makePatroArt({ windows = [], doors = [], arcade = [] }) {
  return {
    door: WOOD_DOOR,
    draw(room) {
      const t = CONFIG.WALL_THICKNESS;
      fillOldBuildingFloor(room);
      const horizontal = room.w > room.h;
      const len = horizontal ? room.w : room.h;
      for (let a = 90; a < len; a += 180) {
        drawLightPool(horizontal ? room.x + a : room.x + room.w / 2, horizontal ? room.y + room.h / 2 : room.y + a, 90, 0.2);
      }
      drawWallBand(room, OLD_WALL);
      for (const [x1, x2] of arcade) {
        drawRect({ x: room.x + x1, y: room.y + 3, w: x2 - x1, h: 14 }, '#dfe9ef');
        drawRect({ x: room.x + x1, y: room.y + 14, w: x2 - x1, h: 3 }, '#a8703f');
        ctx.strokeStyle = '#161616'; ctx.lineWidth = 1.1;
        for (let x = x1 + 5; x < x2 - 2; x += 9) { ctx.beginPath(); ctx.arc(room.x + x, room.y + 9, 2.4, 0, Math.PI * 2); ctx.stroke(); }
      }
      for (const [side, at, l] of windows) drawWallWindow(room, side, at, l, OLD_WINDOW);
      for (const [dir, x, y] of doors) {
        const r = dir === 'h' ? { x: room.x + x - 28, y: room.y + y, w: 56, h: t } : { x: room.x + x, y: room.y + y - 28, w: t, h: 56 };
        drawRect(r, '#5a4a3a');
        drawRect({ x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 }, '#c99a62');
        if (dir === 'h') drawRect({ x: r.x + r.w / 2 - 1, y: r.y + 3, w: 2, h: r.h - 6 }, '#5a4a3a');
        else drawRect({ x: r.x + 3, y: r.y + r.h / 2 - 1, w: r.w - 6, h: 2 }, '#5a4a3a');
      }
    },
  };
}

// Schodiště budovy A (stejný půdorys v přízemí i v patře); below = pohled z patra dolů
function drawStairsA(room, below) {
  const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
  fillOldBuildingFloor(room);
  drawStairLanding(L(200, 20, 100, 100));   // podesta mezi 1. a 2. ramenem
  drawStairLanding(L(20, 20, 100, 100));    // podesta mezi 2. a 3. ramenem
  drawStoneFlight(L(200, 120, 100, 200), 'up');     // 1. rameno – rovně nahoru
  drawStoneFlight(L(120, 20, 80, 100), 'left');     // 2. rameno – doleva
  drawStoneFlight(L(20, 120, 100, 200), 'down');    // 3. rameno – dolů
  const eye = L(120, 120, 80, 200);
  if (below) {
    // z patra: zrcadlo schodiště – pohled dolů, ke dnu tmavne
    const g = ctx.createLinearGradient(eye.x, 0, eye.x + eye.w, 0);
    g.addColorStop(0, '#16171a');
    g.addColorStop(0.5, '#202226');
    g.addColorStop(1, '#16171a');
    ctx.fillStyle = g;
    ctx.fillRect(eye.x, eye.y, eye.w, eye.h);
  } else {
    // v přízemí: podlaha mezi rameny, nahoře ve stínu ramen
    const g = ctx.createLinearGradient(0, eye.y, 0, eye.y + eye.h);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(eye.x, eye.y, eye.w, eye.h);
    // 3. rameno je nad hlavou – lehký stín, kolem něj kované zábradlí
  }
  // světlo z oken na pravé zdi (jen uvnitř schodiště)
  ctx.save();
  ctx.beginPath(); ctx.rect(room.x, room.y, room.w, room.h); ctx.clip();
  drawLightPool(room.x + 260, room.y + 90, 110, 0.22);
  drawLightPool(room.x + 260, room.y + 250, 110, 0.18);
  ctx.restore();
  drawWallBand(room, OLD_WALL);
  const win = { frame: '#e8e8e4', glass: '#d6ebf5' };   // bílé rámy jako na fotce
  if (!below) {   // v patře jsou okna jen nahoře
    drawWallWindow(room, 'right', 0.25, 80, win);
    drawWallWindow(room, 'right', 0.68, 80, win);
  }
  if (below) {
    drawWallWindow(room, 'top', 0.5, 80, win);   // v patře je nad schodištěm venku
    // z patra: 1. a 2. rameno a podesty jsou hluboko pod námi – tmavší
    for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) {
      const r = o.rect;
      const gr = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      gr.addColorStop(0, 'rgba(15, 15, 20, 0.35)');
      gr.addColorStop(1, 'rgba(15, 15, 20, 0.55)');
      ctx.fillStyle = gr;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }
}

// Podlahy pro otevřené průchody mezi díly složené místnosti
const FLOOR_FILLS = {
  old: (r) => fillOldBuildingFloor(r),
  new: (r) => fillNewBuildingFloor(r),
};

// Béžové a vínové dlaždice nové budovy (prosklená chodba, chodba před schody, schodiště)
function fillNewBuildingFloor(rect) {
  ctx.fillStyle = getPattern('prosklena-dlazba', 280, (g, size) => drawAccentTile(g, size, {
    seed: 5, tile: 40, base: '#e2b8a2', accent: '#8f3e3e', accentChance: 0.14,
    grout: '#c79a85', tileVariation: 0.05,
  }));
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// Rameno schodů: dlaždice, stín pod každým schodem, hliníková hrana.
// dir = kterým směrem schody stoupají ('up' | 'left')
function drawStairFlight(f, dir, step) {
  fillNewBuildingFloor(f);
  ctx.save();
  ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.clip();
  // každý schod: plynulé ztmavení směrem k hraně (vypadá jako stupeň), tenká hliníková hrana
  const up = dir === 'up';
  const len = up ? f.h : f.w;
  for (let p = len - step; p > -step; p -= step) {
    const band = up ? { x: f.x, y: f.y + p, w: f.w, h: step } : { x: f.x + p, y: f.y, w: step, h: f.h };
    const g = up
      ? ctx.createLinearGradient(0, band.y, 0, band.y + step)
      : ctx.createLinearGradient(band.x, 0, band.x + step, 0);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    ctx.fillStyle = 'rgba(205, 208, 210, 0.85)';
    if (up) ctx.fillRect(band.x, band.y, band.w, 1.5);
    else ctx.fillRect(band.x, band.y, 1.5, band.h);
  }
  // nenápadné šipky směru stoupání
  ctx.fillStyle = 'rgba(90, 40, 30, 0.22)';
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
  for (const off of [-1, 1]) {
    ctx.beginPath();
    if (up) {
      const y = cy + off * f.h / 4;
      ctx.moveTo(cx, y - 8); ctx.lineTo(cx + 10, y + 6); ctx.lineTo(cx - 10, y + 6);
    } else {
      const x = cx + off * f.w / 4, k = dir === 'right' ? -1 : 1;   // 'left' = stoupá doleva, 'right' doprava
      ctx.moveTo(x - 8 * k, cy); ctx.lineTo(x + 6 * k, cy - 10); ctx.lineTo(x + 6 * k, cy + 10);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Žulové schody (podle fotky schodů do Céčka): šedé stupně s kamínky,
// tmavší podstupnice; f = obdélník ramene, stoupá nahoru
// dir: 'up' = stoupá nahoru (k severu), 'down' = stoupá dolů (k jihu)
function drawGraniteFlight(f, dir = 'up') {
  ctx.fillStyle = getPattern('cecko-zula', 80, (g, size) => drawTerrazzoTile(g, size, {
    seed: 41, tile: 80, base: '#8c8f92', grout: '#8c8f92', tileVariation: 0, density: 0.3,
    speckles: ['#6a6d70', '#a9acaf', '#5b5e61', '#b8b4ac', '#7a7d80'],
  }));
  ctx.fillRect(f.x, f.y, f.w, f.h);
  ctx.save();
  ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.clip();
  const step = 16;
  for (let y = f.y + f.h - step; y > f.y - step; y -= step) {
    const g = ctx.createLinearGradient(0, y, 0, y + step);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(f.x, y, f.w, step);
    ctx.fillStyle = 'rgba(60, 30, 35, 0.45)';   // podstupnice
    ctx.fillRect(f.x, y, f.w, 2);
  }
  ctx.fillStyle = 'rgba(30, 30, 30, 0.3)';     // šipka směrem, kam schody stoupají
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2, k = dir === 'down' ? -1 : 1;
  ctx.beginPath(); ctx.moveTo(cx, cy - 9 * k); ctx.lineTo(cx + 10, cy + 5 * k); ctx.lineTo(cx - 10, cy + 5 * k); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Kostičkovaná dlažba (malý prostor vedle schodů)
function drawCheckerFloor(r, size, a, b) {
  for (let y = r.y, j = 0; y < r.y + r.h; y += size, j++) {
    for (let x = r.x, i = 0; x < r.x + r.w; x += size, i++) {
      ctx.fillStyle = (i + j) % 2 ? a : b;
      ctx.fillRect(x, y, Math.min(size, r.x + r.w - x), Math.min(size, r.y + r.h - y));
    }
  }
}

function drawPlainObstacle(r, o, room) {
  drawRect(r, room.wallColor);
}

// Teraco a zdi staré budovy – stejné pro všechny chodby v přízemí
function fillOldBuildingFloor(room) {
  ctx.fillStyle = getPattern('chodba-teraco', 80, (g, size) => drawTerrazzoTile(g, size, {
    seed: 7, tile: 40, base: '#5a5d5f', grout: '#46494b', tileVariation: 0.06, density: 0.1,
    speckles: ['#3f4244', '#4a4d4f', '#6c7073', '#7d8184', '#8f8a80'],
  }));
  ctx.fillRect(room.x, room.y, room.w, room.h);
}
const OLD_WALL = { top: '#eef1f3', edge: '#b4c4d1', base: '#1d1f21', outline: '#8d979e' };
const OLD_WINDOW = { frame: '#9a6a3a', glass: '#cfe4ef' };
const OLD_DOOR = { frame: '#4f5a63', leaf: '#e4e9ec', glass: '#9cc2d8', mat: '#2a2c2e', matRib: '#3d4043' };
const GLASS_DOOR = { frame: '#8e979e', leaf: '#cfe7f3', glass: '#f2fbff', mat: '#2a2c2e', matRib: '#3d4043' };
// vzhledy, které si můžou vybrat jednotlivé dveře (door.style)
const DOOR_STYLES = { glass: GLASS_DOOR };
const WOOD_DOOR = { frame: '#5a4a3a', leaf: '#c99a62', glass: '#dbe9f0', mat: '#2a2c2e', matRib: '#3d4043' };

// Jednoduchá chodba staré budovy: teraco, světla [x, y], okna [strana, poloha, délka]
function makeCorridorArt(windows, lights) {
  return {
    door: OLD_DOOR,
    draw(room) {
      fillOldBuildingFloor(room);
      for (const [lx, ly] of lights) drawLightPool(room.x + room.w * lx, room.y + room.h * ly, 85, 0.16);
      drawWallBand(room, OLD_WALL);
      for (const [side, at, len] of windows) drawWallWindow(room, side, at, len, OLD_WINDOW);
    },
  };
}

// Chodba ve tvaru L (nebo jiná nepravoúhlá): kreslí se jako obdélníková chodba,
// kusy označené překážkou 'void' se přetřou pozadím a podél chodby (o.edges)
// dostanou zeď se soklem a lištou
// Okna: [strana, poloha, délka]; strana 'void-left' / 'void-bottom' / … = okno
// ve vnitřní zdi kolem 'void' (poloha je podíl rozměru celé místnosti).
function makeLCorridorArt(windows, lights) {
  const outer = windows.filter(([side]) => !side.startsWith('void-'));
  const inner = windows.filter(([side]) => side.startsWith('void-'));
  const base = makeCorridorArt(outer, lights);
  return {
    door: base.door,
    draw(room) {
      base.draw(room);
      const t = CONFIG.WALL_THICKNESS;
      for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) {
        drawVoidWalls(room, o);
        const r = o.rect;
        for (const [side, at, len] of inner) {
          const edge = side.slice(5);
          if (!(o.edges || []).includes(edge)) continue;
          const vertical = edge === 'left' || edge === 'right';
          const w = vertical
            ? { x: edge === 'left' ? r.x : r.x + r.w - t, y: room.y + room.h * at - len / 2, w: t, h: len }
            : { x: room.x + room.w * at - len / 2, y: edge === 'top' ? r.y : r.y + r.h - t, w: len, h: t };
          drawWindowInRect(w, !vertical, OLD_WINDOW);
        }
      }
    },
  };
}

function drawVoidWalls(room, o) {
  const t = CONFIG.WALL_THICKNESS;
  const r = o.rect;
  const inner = { x: room.x + t, y: room.y + t, w: room.w - 2 * t, h: room.h - 2 * t };
  // průnik s vnitřkem místnosti – sokl a lišta nesmí zasahovat do obvodové zdi
  const clip = (a) => {
    const x1 = Math.max(a.x, inner.x), y1 = Math.max(a.y, inner.y);
    const x2 = Math.min(a.x + a.w, inner.x + inner.w), y2 = Math.min(a.y + a.h, inner.y + inner.h);
    return x2 > x1 && y2 > y1 ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : null;
  };
  // pruh u strany zdi; side = strana, z = šířka pruhu od hrany směrem do zdi
  const band = (side, z) => ({
    left:   { x: r.x,             y: r.y,             w: z,   h: r.h },
    right:  { x: r.x + r.w - z,   y: r.y,             w: z,   h: r.h },
    top:    { x: r.x,             y: r.y,             w: r.w, h: z },
    bottom: { x: r.x,             y: r.y + r.h - z,   w: r.w, h: z },
  }[side]);
  const edges = o.edges || [];
  // pozadí o pixel přes vnější strany, ať po obrysu místnosti nezůstane vyhlazená linka
  const g = (side) => (edges.includes(side) ? 0 : 1);
  const wall = o.wall || OLD_WALL;
  // solid = tlustá zeď (celá v barvě zdi), jinak prostor mimo budovu (tmavé pozadí)
  drawRect({ x: r.x - g('left'), y: r.y - g('top'), w: r.w + g('left') + g('right'), h: r.h + g('top') + g('bottom') },
    o.solid ? wall.top : CONFIG.BACKGROUND_COLOR);
  for (const e of edges) drawRect(band(e, t), wall.top);
  for (const e of edges) { const c = clip(band(e, 6)); if (c) drawRect(c, wall.edge); }
  for (const e of edges) { const c = clip(band(e, 2)); if (c) drawRect(c, wall.base); }
}

// Jednoduchá učebna: parkety, světlé zdi, zelená tabule na horní zdi, okna dole
// windows = okna [strana, poloha, délka]; bez nich dvě okna dole. boardSide = zeď s tabulí
// opts.floor = 'terrazzo' (světlé teraco místo parket), opts.extra(room) = doplňky navíc
function makeClassroomArt(wallTop, windows = [['bottom', 0.3, 80], ['bottom', 0.7, 80]], boardSide = 'top', boardColor = '#24513a', opts = {}) {
  return {
    door: WOOD_DOOR,
    draw(room) {
      ctx.fillStyle = opts.floor === 'terrazzo'
        ? getPattern('ucebna-teraco', 80, (g, size) => drawTerrazzoTile(g, size, {
          seed: 17, tile: 80, base: '#e4e4e0', grout: '#e4e4e0', tileVariation: 0, density: 0.25,
          speckles: ['#9aa0a6', '#c2c5c8', '#7d8186', '#b8a99a'],
        }))
        : getPattern('ucebna-parkety', 64, (g, size) => drawParquetTile(g, size, {
          seed: 9, plankW: 32, plankH: 8, gap: 'rgba(90, 55, 20, 0.3)',
          colors: ['#c9a46c', '#d0ac74', '#c39d64', '#ccab72'],
        }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      drawWallBand(room, { top: wallTop, edge: '#c9b98f', base: '#3b2e22', outline: '#9a948a' });
      const t = CONFIG.WALL_THICKNESS;
      const board = boardSide === 'left' || boardSide === 'right'
        ? { x: boardSide === 'left' ? room.x + 2 : room.x + room.w - t - 2, y: room.y + room.h / 2 - 90, w: t, h: 180 }
        : { x: room.x + room.w * (opts.boardAt || 0.5) - 90, y: boardSide === 'bottom' ? room.y + room.h - t - 2 : room.y + 2, w: 180, h: t };   // boardAt = střed tabule (podíl šířky)
      drawRect(board, '#8a5a2e');
      drawRect({ x: board.x + 3, y: board.y + 3, w: board.w - 6, h: board.h - 6 }, boardColor);
      for (const [side, at, len] of windows) drawWallWindow(room, side, at, len, OLD_WINDOW);
      if (opts.extra) opts.extra(room);
    },
  };
}

// Kabinet: koberec, světlé zdi, okno na zvolené zdi
function makeKabinetArt(windowSide) {
  return {
    door: WOOD_DOOR,
    draw(room) {
      ctx.fillStyle = getPattern('kabinet-koberec', 80, (g, size) => drawTerrazzoTile(g, size, {
        seed: 31, tile: 80, base: '#8a5c4c', grout: '#8a5c4c', tileVariation: 0, density: 0.08,
        speckles: ['#7d5244', '#966a59', '#80574a'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      drawWallBand(room, { top: '#f1ead6', edge: '#c9b98f', base: '#3b2e22', outline: '#9a948a' });
      drawWallWindow(room, windowSide, 0.5, 80, OLD_WINDOW);
    },
  };
}

// WC: drobné světlé dlaždice, obklad se zeleným/modrým/růžovým pruhem
function makeWcArt(accent, windowSide = 'right') {
  return {
    door: WOOD_DOOR,
    draw(room) {
      drawCheckerFloor(room, 16, '#e6e9eb', '#d4d9dc');
      drawWallBand(room, { top: '#f4f6f7', edge: accent, base: '#5b6670', outline: '#9aa3aa' });
      drawWallWindow(room, windowSide, 0.5, 60, { frame: '#e8e8e4', glass: '#d6ebf5' });
    },
  };
}

// Kreslí nábytek otočený o úhel (o ±90° se prohodí šířka a výška): fn dostane obdélník kolem 0,0
function drawTurned(r, angle, fn) {
  const quarter = Math.abs(Math.round(angle / (Math.PI / 2))) % 2 === 1;
  const w = quarter ? r.h : r.w, h = quarter ? r.w : r.h;
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.rotate(angle);
  fn({ x: -w / 2, y: -h / 2, w, h });
  ctx.restore();
}

// Jednoduchá šatna: stejné dlaždice jako Šatny, barevné zdi
function makeLockerRoomArt(wallTop) {
  return {
    door: WOOD_DOOR,
    draw(room) {
      ctx.fillStyle = getPattern('satny-dlazba', 80, (g, size) => drawTerrazzoTile(g, size, {
        seed: 21, tile: 40, base: '#dadad6', grout: '#b0b1ad', tileVariation: 0.04, density: 0.025,
        speckles: ['#9a9c9d', '#b3b5b6', '#7d7f80', '#c4bdae'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      drawWallBand(room, { top: wallTop, edge: '#a9b4bd', base: '#3b2e22', outline: '#8a8f94' });
    },
  };
}

// Tráva: zelený podklad s krátkými stébly
function drawGrassTile(g, size) {
  const rnd = seededRandom(13);
  g.fillStyle = '#6fa35a';
  g.fillRect(0, 0, size, size);
  const greens = ['#5e9150', '#7fb267', '#689c55', '#86ba6c', '#578a49'];
  g.lineWidth = 0.8;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size, y = rnd() * size;
    g.strokeStyle = greens[Math.floor(rnd() * greens.length)];
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 2, y - 2 - rnd() * 2); g.stroke();
  }
}

const ROOM_ART = {
  // Chodba za hlavním vchodem: tmavé teraco, bílé zdi s modrošedým soklem,
  // řada bílých sloupů, kulatá světla, okna v dřevěných rámech
  chodba: {
    door: OLD_DOOR,
    draw(room) {
      fillOldBuildingFloor(room);
      // světlo kulatých lamp nad oběma „loděmi“ chodby
      for (const ly of [0.27, 0.73]) {
        for (let i = 0; i < 6; i++) drawLightPool(room.x + room.w * (0.09 + i * 0.164), room.y + room.h * ly, 85, 0.16);
      }
      drawWallBand(room, OLD_WALL);
      for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) drawVoidWalls(room, o);   // plný kout vlevo nahoře
      const win = OLD_WINDOW;
      drawWallWindow(room, 'bottom', 0.72, 84, win); // uprostřed je hlavní vchod
    },
  },

  // Šatny: světlé dlaždice s kamínky, oranžové zdi, nízká okna v dřevě,
  // zelené a žluté skříňky, lavička
  satny: {
    door: { frame: '#5a4a3a', leaf: '#c99a62', glass: '#dbe9f0', mat: '#2a2c2e', matRib: '#3d4043' },
    draw(room) {
      ctx.fillStyle = getPattern('satny-dlazba', 80, (g, size) => drawTerrazzoTile(g, size, {
        seed: 21, tile: 40, base: '#dadad6', grout: '#b0b1ad', tileVariation: 0.04, density: 0.025,
        speckles: ['#9a9c9d', '#b3b5b6', '#7d7f80', '#c4bdae'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      for (const [lx, ly] of [[0.3, 0.35], [0.7, 0.35], [0.5, 0.75]]) {
        drawLightPool(room.x + room.w * lx, room.y + room.h * ly, 90, 0.18);
      }
      drawWallBand(room, { top: '#e9c49a', edge: '#d9964f', base: '#3b2e22', outline: '#9c7a55' });
      const win = { frame: '#9a6a3a', glass: '#cfe4ef' };
      drawWallWindow(room, 'top', 0.73, 70, win);
    },
  },

  // Prosklená chodba: béžové dlaždice s vínovými, okna mezi betonovými
  // sloupy, zábradlí a radiátory, obrázky dětí na bílé zdi
  prosklena: {
    door: { frame: '#4f5a63', leaf: '#e4e9ec', glass: '#9cc2d8', mat: '#2a2c2e', matRib: '#3d4043' },
    draw(room) {
      ctx.fillStyle = getPattern('prosklena-dlazba', 280, (g, size) => drawAccentTile(g, size, {
        seed: 5, tile: 40, base: '#e2b8a2', accent: '#8f3e3e', accentChance: 0.14,
        grout: '#c79a85', tileVariation: 0.05,
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      // sluneční světlo z oken na podlaze
      for (let i = 0; i < 6; i++) drawLightPool(room.x + room.w * 0.3, room.y + room.h * (0.25 + i * 0.13), 70, 0.2);
      drawWallBand(room, { top: '#f3f1ec', edge: '#c98a4e', base: '#8a5a2e', outline: '#9a948a' });
      // levá zeď: celá prosklená, mezi okny betonové sloupy
      const t = CONFIG.WALL_THICKNESS;
      const win = { frame: '#a87b4a', glass: '#cfe7f3' };
      const y0 = room.y + t;
      const segments = 6;
      const segH = (room.y + room.h - t - y0) / segments;
      for (let i = 0; i < segments; i++) {
        drawWallWindow(room, 'left', (y0 + segH * (i + 0.5) - room.y) / room.h, segH - 18, win);
        if (i > 0) {
          const py = y0 + segH * i - 9;
          drawRect({ x: room.x, y: py, w: t + 4, h: 18 }, '#9c9d98');
          drawOutline({ x: room.x, y: py, w: t + 4, h: 18 }, '#6f706c');
        }
      }
      drawWallPosters(room, 'right', 0.05, 0.75, 11);
    },
  },

  // Tělocvična: dubové parkety s čarami hřiště, dřevěný obklad zdí,
  // velká okna, koše, žebřiny
  telocvicna: {
    door: { frame: '#6b4f33', leaf: '#d9b27a', glass: '#e6c896', mat: '#3a3f44', matRib: '#4d535a' },
    draw(room) {
      ctx.fillStyle = getPattern('telocvicna-parkety', 64, (g, size) => drawParquetTile(g, size, {
        seed: 3, plankW: 32, plankH: 8, gap: 'rgba(90, 55, 20, 0.35)',
        colors: ['#c99a5e', '#d1a466', '#c29257', '#cda061', '#bf8f55'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      // čáry hřiště
      const t = CONFIG.WALL_THICKNESS;
      const ix = room.x + t, iy = room.y + t, iw = room.w - 2 * t, ih = room.h - 2 * t;
      const cx = ix + iw / 2, cy = iy + ih / 2;
      ctx.strokeStyle = '#2f5fb3';
      ctx.lineWidth = 3;
      ctx.strokeRect(ix + 28, iy + 28, iw - 56, ih - 56);
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, iy + 28); ctx.lineTo(cx, iy + ih - 28);
      ctx.moveTo(cx + 55, cy); ctx.arc(cx, cy, 55, 0, Math.PI * 2);
      ctx.moveTo(ix + 28, cy - 80); ctx.arc(ix + 28, cy, 80, -Math.PI / 2, Math.PI / 2);
      ctx.moveTo(ix + iw - 28, cy + 80); ctx.arc(ix + iw - 28, cy, 80, Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      drawWallBand(room, { top: '#f1efe9', edge: '#b98552', base: '#6e4a2a', outline: '#9a948a' });
      const win = { frame: '#aab3b9', glass: '#d6ebf5' };
      for (let i = 0; i < 8; i++) drawWallWindow(room, 'top', 0.07 + i * 0.123, 74, win); // okna po celé horní zdi
      drawHoop(ix + 3, cy, 1);
      drawHoop(ix + iw - 3, cy, -1);
    },
  },

  // --- Nové místnosti (zatím jednoduchá grafika) ---

  // Venkovní učebna: tráva, dlážděná cesta k hlavnímu vchodu, živý plot,
  // nahoře fasáda budovy
  // Venkovní učebna (podle fotky): betonový chodník, dřevěná paluba,
  // záhony s mulčem, rostlinkami a lampičkami, kamenný záhon, plot,
  // nahoře fasáda školy s hlavním vchodem
  venku: {
    door: OLD_DOOR,
    draw(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      // chodník z betonových desek
      ctx.fillStyle = getPattern('venku-beton', 80, (g, size) => drawTerrazzoTile(g, size, {
        seed: 51, tile: 40, base: '#cac8c3', grout: '#b2b0ab', tileVariation: 0.03, density: 0.02,
        speckles: ['#a9a7a2', '#bdbbb6'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      // záhony s mulčem: pod učebnou, podél učebny vpravo a dva vpravo u plotu
      const mulch = getPattern('venku-mulc', 64, (g, size) => drawTerrazzoTile(g, size, {
        seed: 52, tile: 64, base: '#8a6644', grout: '#8a6644', tileVariation: 0, density: 0.5,
        speckles: ['#6e4f33', '#a37d55', '#5c412a', '#b8936a', '#7d5c3d'],
      }));
      // záhon do L těsně kolem paluby (vpravo a dole, v rohu spojený) + dva u pravého plotu
      const lBed = [L(360, 170, 30, 300), L(20, 470, 370, 30)];
      const beds = [...lBed, L(560, 40, 60, 190), L(560, 360, 60, 120)];
      ctx.fillStyle = mulch;
      for (const b of beds) ctx.fillRect(b.x, b.y, b.w, b.h);
      for (const b of beds.slice(2)) drawOutline(b, 'rgba(60, 40, 20, 0.35)');
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.35)';   // obrys L jako jednoho záhonu
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(room.x + 360.5, room.y + 170.5); ctx.lineTo(room.x + 389.5, room.y + 170.5);
      ctx.lineTo(room.x + 389.5, room.y + 499.5);
      ctx.stroke();
      // kamenný záhon vpravo mezi nimi
      const rocks = L(560, 245, 60, 100);
      drawRect(rocks, '#a49a8c');
      const rnd = seededRandom(77);
      for (let i = 0; i < 22; i++) {
        const rx = rocks.x + 6 + rnd() * (rocks.w - 12), ry = rocks.y + 6 + rnd() * (rocks.h - 12), rr = 3 + rnd() * 6;
        ctx.fillStyle = ['#d8d4cc', '#bfb9ae', '#e6e2da', '#9c958a'][i % 4];
        ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
      }
      drawOutline(rocks, 'rgba(0, 0, 0, 0.2)');
      // dřevěná paluba
      const deck = L(20, 170, 340, 300);
      ctx.fillStyle = getPattern('venku-paluba', 64, (g, size) => drawParquetTile(g, size, {
        seed: 53, plankW: 64, plankH: 8, gap: 'rgba(70, 55, 40, 0.45)',  // 64 / 8 = celé řady
        colors: ['#b8a58c', '#ae9a80', '#c2af96', '#a99479'],
      }));
      ctx.fillRect(deck.x, deck.y, deck.w, deck.h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(deck.x + 2, deck.y + deck.h, deck.w, 3);
      ctx.fillRect(deck.x + deck.w, deck.y + 2, 3, deck.h);
      drawOutline(deck, 'rgba(60, 45, 30, 0.6)');
      // rostlinky v záhonech
      const rp = seededRandom(78);
      for (const b of beds) {
        const n = Math.round(b.w * b.h / 900);
        for (let i = 0; i < n; i++) {
          const px = b.x + 6 + rp() * (b.w - 12), py = b.y + 6 + rp() * (b.h - 12);
          ctx.fillStyle = i % 3 ? '#4f8a3c' : '#6aa64f';
          ctx.beginPath(); ctx.arc(px, py, 3 + rp() * Math.min(6, b.w / 5), 0, Math.PI * 2); ctx.fill();
        }
      }
      // zahradní lampičky
      for (const [lx, ly] of [[80, 485], [200, 486], [320, 484], [375, 240], [375, 380], [575, 60], [605, 200], [575, 460], [605, 380]]) {
        drawLightPool(room.x + lx, room.y + ly, 14, 0.5);
        drawRect(L(lx - 2, ly - 2, 4, 4), '#2a2a2a');
      }
      drawOutlinedText('Před školu ↓', room.x + 455, room.y + 392, CONFIG.DOOR_LABEL_FONT, '#ffffff', 'bottom');
      // schody nahoru z ulice dole uprostřed (10 schodů, kreslí se i přes plot)
      const stairs = L(405, 400, 100, 120);
      drawRect(stairs, '#b7b4ae');
      for (let k = 0; k < 10; k++) {
        const y = stairs.y + 10 + k * 11;
        const g = ctx.createLinearGradient(0, y, 0, y + 11);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
        ctx.fillStyle = g;
        ctx.fillRect(stairs.x, y, stairs.w, 11);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(stairs.x, y, stairs.w, 1);
      }
      drawOutline(stairs, 'rgba(0, 0, 0, 0.3)');
      const t = CONFIG.WALL_THICKNESS;
      // plot dokola, nahoře fasáda školy
      drawWallBand(room, { top: '#3d4245', edge: '#5c6367', base: '#2a2e30', outline: '#1f2224' });
      ctx.fillStyle = '#6b7276';                     // sloupky plotu
      for (let y = room.y + t + 10; y < room.y + room.h - t; y += 24) {
        ctx.fillRect(room.x + 7, y, 6, 3);
        ctx.fillRect(room.x + room.w - 13, y, 6, 3);
      }
      for (let x = room.x + t + 10; x < room.x + room.w - t; x += 24) {
        if (x > room.x + 397 && x < room.x + 513) continue; // mezera na schody
        ctx.fillRect(x, room.y + room.h - 13, 3, 6);
      }
      // spodní plot je u schodů přerušený – schody pokračují až ke kraji
      ctx.fillStyle = '#b7b4ae';
      ctx.fillRect(room.x + 405, room.y + room.h - t, 100, t);
      for (let y = room.y + room.h - t + 2; y < room.y + room.h; y += 11) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(room.x + 405, y, 100, 1);
      }
      drawRect({ x: room.x, y: room.y, w: room.w, h: t }, '#e8dcc2');
      ctx.fillStyle = '#b9a98a';
      ctx.fillRect(room.x, room.y + t - 2, room.w, 2);
      drawWallWindow(room, 'top', 0.12, 60, OLD_WINDOW);
      drawWallWindow(room, 'top', 0.3, 60, OLD_WINDOW);
      drawWallWindow(room, 'top', 0.5, 60, OLD_WINDOW);
      drawWallWindow(room, 'top', 0.9, 60, OLD_WINDOW);
    },
  },

  zapad: makeLCorridorArt(
    // okno na levé zdi výběžku (vpravo sousedí chodba před schody)
    [['left', 106 / 1140, 80]],
    [[0.33, 1020 / 1140], [0.55, 1020 / 1140], [0.75, 1020 / 1140], [0.92, 1020 / 1140],
     [0.359, 860 / 1140], [0.359, 680 / 1140], [0.359, 500 / 1140], [0.359, 320 / 1140], [0.359, 130 / 1140], [0.12, 110 / 1140]]
  ),
  // okna jako o patro výš: nahoře a vlevo (horní zeď vodorovného ramene, levá zeď svislého)
  vychod: makeLCorridorArt(
    [['top', 0.843, 80], ['void-bottom', 0.3, 80], ['void-bottom', 0.55, 80], ['void-right', 140 / 440, 80]],
    [[0.12, 0.77], [0.35, 0.77], [0.58, 0.77], [0.84, 0.77], [0.84, 0.45], [0.84, 0.15]]
  ),
  // Chodba před schody (podle fotky): béžové a vínové dlaždice, vlevo
  // prosklený výdejní pult s květinami, vpravo zeď ke schodišti do patra,
  // za rámem na pravém kraji schodiště doprava a nahoru do prosklené chodby
  predSchody: {
    door: { frame: '#4f5a63', leaf: '#e4e9ec', glass: '#9cc2d8', mat: '#2a2c2e', matRib: '#3d4043' },
    draw(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      fillNewBuildingFloor(room);
      for (const [lx, ly] of [[150, 380], [150, 640], [480, 420], [750, 560], [750, 130], [200, 740]]) {
        drawLightPool(room.x + lx, room.y + ly, 90, 0.18);
      }
      // světlíky ve stropě: na podlaze modrobílé obdélníky světla
      for (const [lx, ly] of [[200, 400], [330, 360], [470, 560], [560, 400]]) {
        const g = ctx.createRadialGradient(room.x + lx, room.y + ly, 4, room.x + lx, room.y + ly, 60);
        g.addColorStop(0, 'rgba(225, 242, 255, 0.30)');
        g.addColorStop(1, 'rgba(225, 242, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(room.x + lx - 60, room.y + ly - 60, 120, 120);
      }
      // schodiště za rámem: 1. rameno doprava, podesta, 2. rameno nahoru
      const step = 16;
      drawStairFlight(L(820, 140, 140, 100), 'right', step);
      fillNewBuildingFloor(L(960, 140, 100, 100));
      drawStairFlight(L(960, 20, 100, 120), 'up', step);
      drawHazardStripe(room.x + 820, room.y + 140, 5, 100);   // první schod
      drawHazardStripe(room.x + 955, room.y + 140, 5, 100);   // podesta
      drawHazardStripe(room.x + 960, room.y + 135, 100, 5);   // 2. rameno
      drawHazardStripe(room.x + 960, room.y + 20, 100, 4);    // nahoře u prosklené chodby
      drawWallBand(room, { top: '#f3f1ec', edge: '#c98a4e', base: '#8a5a2e', outline: '#9a948a' });
      for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) drawVoidWalls(room, o);
      // rám průchodu v zadní zdi (bílý, s tmavším ostěním)
      drawRect(L(658, 236, 14, 28), '#f7f6f2');
      drawRect(L(818, 236, 14, 28), '#f7f6f2');
      drawRect(L(680, 240, 140, 4), 'rgba(0, 0, 0, 0.18)');
      // na zadní zdi: obrazy, korková nástěnka s plakátem, hodiny, hydrant
      for (const x of [170, 300]) {
        drawRect(L(x, 244, 34, 14), '#e9e3d4');
        drawRect(L(x + 3, 246, 28, 10), '#3b3b3b');
        ctx.fillStyle = '#f2f2f2';
        for (let k = 0; k < 6; k++) ctx.fillRect(room.x + x + 5 + k * 4, room.y + 248 + (k % 2) * 3, 2, 3);
      }
      drawRect(L(380, 243, 46, 15), '#8a5a2e');
      drawRect(L(382, 245, 42, 11), '#c79a5e');
      drawRect(L(388, 246, 10, 9), '#3a2a20');
      drawRect(L(406, 247, 12, 6), '#f2efe6');
      ctx.fillStyle = '#ffffff';   // hodiny
      ctx.beginPath(); ctx.arc(room.x + 640, room.y + 250, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(room.x + 640, room.y + 250); ctx.lineTo(room.x + 640, room.y + 245);
      ctx.moveTo(room.x + 640, room.y + 250); ctx.lineTo(room.x + 644, room.y + 251);
      ctx.stroke();
      // prostor za schody: nad hlavou schodiště – betonový strop dělá stín, hydrant na zdi
      drawRect(L(820, 20, 137, 117), 'rgba(60, 50, 40, 0.14)');
      // kávovar je důležitý: svítí před ním podlaha a je u něj nápis
      const pulse = 0.38 + 0.16 * Math.sin(state.time * 3);
      const glow = ctx.createRadialGradient(room.x + 92, room.y + 450, 6, room.x + 92, room.y + 450, 85);
      glow.addColorStop(0, `rgba(255, 196, 70, ${pulse})`);
      glow.addColorStop(1, 'rgba(255, 196, 70, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(room.x + 20, room.y + 365, 160, 170);
      drawRect(L(82, 418, 32, 64), '#5a3420');   // hnědá rohožka před kávovarem
      drawRect(L(85, 421, 26, 58), '#6e4128');
      // mozaika na zdi předsíně
      drawRect(L(722, 2, 56, 16), '#5b4a3a');
      for (let k = 0; k < 6; k++) drawRect(L(726 + k * 9, 5, 7, 10), ['#c0392b', '#e0b84f', '#3c7a4a', '#2f6fb0', '#d07a3a', '#7a4a8a'][k]);
      drawOutlinedText('Prosklená chodba ↑', room.x + 1010, room.y + 60, CONFIG.DOOR_LABEL_FONT, '#ffffff', 'middle');
    },
    // nápis nad kávovarem až po nábytku, ať ho nic nepřekryje
    drawOver(room) {
      drawOutlinedText('☕ KÁVOVAR', room.x + 104, room.y + 388, 'bold 16px sans-serif', '#ffd54a', 'middle');
      drawOutlinedText('ŠACHY', room.x + 210, room.y + 712, 'bold 11px sans-serif', '#ffffff', 'middle');
      drawOutlinedText('FOTBÁLEK', room.x + 330, room.y + 432, 'bold 11px sans-serif', '#ffffff', 'middle');
    },
  },
  // Vstupní chodba (podle fotky „chodba za venkovní učebnou“): okrové zdi s cihlově
  // červeným soklem a šedomodrým pruhem, nahoře 8 kamenných schodů se žlutými značkami
  // do prosklených dveří Hlavní chodby, dole modrý koberec u dveří ven; vlevo na zdi
  // zvonek (dá se zazvonit), mosazná lampička, vpravo pamětní deska a nástěnka
  vstup: {
    door: OLD_DOOR,
    draw(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      fillOldBuildingFloor(room);
      drawLightPool(room.x + 70, room.y + 250, 80, 0.16);
      drawLightPool(room.x + 34, room.y + 118, 46, 0.3);    // od lampičky
      drawStoneFlight(L(20, 20, 100, 144), 'up', 18);
      for (const [x, y] of [[20, 158], [98, 158], [20, 22], [98, 22]]) drawRect(L(x, y, 22, 5), '#f2c618');   // žluté značky
      // modrý koberec u dveří ven
      drawRect(L(24, 282, 92, 78), '#2f5568');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      for (let y = 286; y < 358; y += 4) ctx.fillRect(room.x + 26, room.y + y, 88, 1);
      drawWallBand(room, { top: '#e3b25a', edge: '#c4573f', base: '#9fb3b8', outline: '#8a7a5a' });
      // nahoře prosklené dveře do Hlavní chodby: bílé ostění
      drawRect(L(12, 0, 10, 24), '#f4f2ec');
      drawRect(L(118, 0, 10, 24), '#f4f2ec');
      // vnitřní okna vysoko ve zdech
      drawWindowInRect(L(0, 150, 20, 60), false, { frame: '#f4f2ec', glass: '#d7e6ee' });
      drawWindowInRect(L(120, 150, 20, 60), false, { frame: '#f4f2ec', glass: '#d7e6ee' });
      drawRect(L(12, 112, 10, 12), '#d4a73a');              // mosazná lampička
      drawRect(L(14, 110, 6, 4), '#fff3c4');
      drawRect(L(122, 228, 8, 40), '#8a5a2a');              // pamětní deska
      drawRect(L(123, 230, 6, 36), '#a8743c');
      drawRect(L(118, 34, 10, 40), '#c79a5e');              // nástěnka u dveří
      drawRect(L(120, 38, 6, 8), '#f4f2ec');
      // zvonek: bílá krabička s tlačítkem; po zazvonění se od něj šíří vlny
      const b = BELL.local;
      drawRect(L(b.x, b.y, b.w, b.h), '#f6f6f2');
      drawRect(L(b.x + 3, b.y + 6, 4, 6), '#c0392b');
      drawOutline(L(b.x, b.y, b.w, b.h), 'rgba(0, 0, 0, 0.45)');
      const t = state.bellTime != null ? state.time - state.bellTime : 99;
      if (t < 1.4) {
        ctx.strokeStyle = `rgba(255, 213, 74, ${1 - t / 1.4})`;
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          const rad = 8 + ((t * 40 + k * 12) % 36);
          ctx.beginPath();
          ctx.arc(room.x + b.x + b.w, room.y + b.y + b.h / 2, rad, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
        }
      }
    },
  },
  // Horní kus hlavní chodby (mezi chodbou před schody a schodištěm do patra)
  hlavniTop: {
    door: OLD_DOOR,
    draw(room) {
      fillOldBuildingFloor(room);
      for (const lx of [0.2, 0.5, 0.8]) drawLightPool(room.x + room.w * lx, room.y + 70, 80, 0.16);
      drawWallBand(room, OLD_WALL);
    },
  },
  // Schodiště do patra v přízemí a v 1. patře
  schodyA: {
    door: OLD_DOOR,
    draw(room) {
      drawStairsA(room, false);
      drawOutlinedText('1. patro ↓', room.x + 70, room.y + 70, 'bold 11px sans-serif', '#ffffff', 'middle');
    },
  },
  schodyPatro: {
    door: OLD_DOOR,
    draw(room) {
      drawStairsA(room, true);
      drawOutlinedText('Přízemí ↑', room.x + 70, room.y + 270, 'bold 11px sans-serif', '#ffffff', 'middle');
      drawOutlinedText('2. patro ↑', room.x + 250, room.y + 270, 'bold 11px sans-serif', '#ffffff', 'middle');
    },
  },
  schodyPatro2: {
    door: OLD_DOOR,
    draw(room) {
      drawStairsA(room, true);
      drawOutlinedText('1. patro ↑', room.x + 70, room.y + 270, 'bold 11px sans-serif', '#ffffff', 'middle');
    },
  },
  // Chodba v 1. patře budovy A (díly viz ROOMS.patroA)
  zapadP: makePatroArt({
    windows: [['right', 100 / 540, 70], ['right', 300 / 540, 70]],
    doors: [['v', 180, 200], ['v', 180, 400]],
  }),
  vychodP: makePatroArt({
    windows: [['left', 0.3, 80], ['left', 0.65, 80]],
    doors: [],
  }),
  hlavniP: makePatroArt({
    // okna jen na horní zdi (do dvora)
    windows: [['top', 350 / 1800, 80], ['top', 530 / 1800, 80], ['top', 710 / 1800, 80], ['top', 890 / 1800, 80], ['top', 1490 / 1800, 80]],
    doors: [['h', 420, 180], ['h', 1580, 180], ['v', 0, 100]],
    arcade: [[200, 243], [277, 423], [457, 603], [637, 783], [817, 963], [997, 1050], [1350, 1403], [1437, 1543], [1577, 1610]],
  }),
  // Druhé schody k šatnám: světlá dlažba jako v šatnách, schody dolů s vínovými
  // dlaždicemi a žlutočernými hranami, velké okno vzadu, šedý betonový strop
  satny2: {
    door: { frame: '#5a4a3a', leaf: '#c99a62', glass: '#dbe9f0', mat: '#2a2c2e', matRib: '#3d4043' },
    draw(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      ctx.fillStyle = getPattern('satny-dlazba', 80, (g, size) => drawTerrazzoTile(g, size, {
        seed: 21, tile: 40, base: '#dadad6', grout: '#b0b1ad', tileVariation: 0.04, density: 0.025,
        speckles: ['#9a9c9d', '#b3b5b6', '#7d7f80', '#c4bdae'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      drawLightPool(room.x + 260, room.y + 200, 110, 0.2);
      drawWallBand(room, { top: '#f1efea', edge: '#9b3b4a', base: '#3b2e22', outline: '#9c9a95' });
      drawWallWindow(room, 'top', 262 / 380, 150, { frame: '#9a6a3a', glass: '#cfe4ef' });
      // schody dolů: první schody z podlahy doleva, podesta, pak dlouhé rameno dolů
      // (nahoru na obrázku); stupně tmavnou směrem dolů
      const entry = L(170, 340, 70, 80), land = L(20, 340, 150, 80), f = L(20, 123, 150, 217);
      const step = 18;
      const stepRect = (r, k, vertical) => {
        drawRect(r, k % 2 ? '#9c4b43' : '#ad5b50');
        drawRect(r, `rgba(0, 0, 0, ${Math.min(0.55, k * 0.035)})`);
        if (vertical) drawRect({ x: r.x, y: r.y + r.h - 2, w: r.w, h: 2 }, 'rgba(210, 212, 214, 0.8)');
        else drawRect({ x: r.x + r.w - 2, y: r.y, w: 2, h: r.h }, 'rgba(210, 212, 214, 0.8)');
      };
      let k = 0;
      for (let x = entry.x + entry.w - step; x > entry.x - step; x -= step) {
        const x0 = Math.max(x, entry.x);
        stepRect({ x: x0, y: entry.y, w: x + step - x0, h: entry.h }, k++, false);
      }
      drawRect(land, '#a5534a');                                       // podesta
      drawRect(land, `rgba(0, 0, 0, ${Math.min(0.55, k++ * 0.035)})`);
      for (let y = f.y + f.h - step; y > f.y - step; y -= step) {
        const y0 = Math.max(y, f.y);
        stepRect({ x: f.x, y: y0, w: f.w, h: y + step - y0 }, k++, true);
      }
      drawHazardStripe(entry.x + entry.w - 5, entry.y, 5, entry.h);   // první schod z podlahy
      drawHazardStripe(f.x, f.y + f.h - 5, f.w, 5);                    // začátek dlouhého ramene
      drawOutlinedText('Šatny 3 ↓', f.x + f.w / 2, f.y + 40, 'bold 11px sans-serif', '#ffffff', 'middle');
    },
  },
  // Hala s pingpongem na konci prosklené chodby: dlaždice jako v prosklené chodbě,
  // bílé zdi s dřevěnou lištou, dva pingpongové stoly
  hala: {
    door: { frame: '#6b4f33', leaf: '#d39a52', glass: '#e6c896', mat: '#2a2c2e', matRib: '#3d4043' },
    draw(room) {
      fillNewBuildingFloor(room);
      drawLightPool(room.x + room.w * 0.5, room.y + room.h * 0.3, 100, 0.18);
      drawLightPool(room.x + room.w * 0.5, room.y + room.h * 0.66, 100, 0.18);
      drawWallBand(room, { top: '#f3f1ec', edge: '#c98a4e', base: '#8a5a2e', outline: '#9a948a' });
      drawWallWindow(room, 'right', 0.35, 90, { frame: '#a87b4a', glass: '#cfe7f3' }); // nad vchodem do Céčka
      drawWallPosters(room, 'top', 0.08, 0.36, 23);
      drawWallPosters(room, 'top', 0.62, 0.9, 29);
    },
  },
  // Vchod do Céčka: béžové a vínové dlaždice, žulové schody nahoru,
  // nahoře chodba 1. patra s okny, vínový sokl na zdech
  cecko: {
    door: { frame: '#6b4f33', leaf: '#d39a52', glass: '#e6c896', mat: '#2a2c2e', matRib: '#3d4043' },
    draw(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      fillNewBuildingFloor(room);
      drawGraniteFlight(L(246, 140, 120, 260), 'down');   // rameno do 2. patra (stoupá dolů)
      for (const lx of [210, 420, 620]) drawLightPool(room.x + lx, room.y + 80, 140, 0.22);   // světlá chodba nahoře
      drawLightPool(room.x + 243, room.y + 440, 100, 0.15);
      // schody: dolní rameno, podesta, horní rameno
      drawGraniteFlight(L(120, 290, 120, 110));
      ctx.fillStyle = getPattern('cecko-zula', 80, () => {});
      ctx.fillRect(room.x + 120, room.y + 260, 120, 30);   // podesta
      drawGraniteFlight(L(120, 140, 120, 120));            // horní rameno
      drawHazardStripe(room.x + 120, room.y + 395, 120, 5);  // první schod
      drawHazardStripe(room.x + 120, room.y + 290, 120, 5);  // podesta (dolní hrana)
      drawHazardStripe(room.x + 120, room.y + 255, 120, 5);  // horní rameno
      drawHazardStripe(room.x + 120, room.y + 140, 120, 4);  // nahoře u chodby
      drawHazardStripe(room.x + 246, room.y + 140, 120, 5);  // první schod do 2. patra
      drawOutlinedText('2. patro', room.x + 306, room.y + 380, 'bold 12px sans-serif', '#ffffff', 'middle');
      drawWallBand(room, CECKO_WALL);
      for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) drawVoidWalls(room, o);
      // obrázky v rámečcích na zdi vedle schodů (jako na fotce)
      for (const y of [175, 215, 330]) {
        const fr = L(100, y, 14, 18);
        drawRect(fr, '#2b2b2b');
        drawRect({ x: fr.x + 2, y: fr.y + 2, w: fr.w - 4, h: fr.h - 4 }, '#d9d6cf');
      }
    },
  },
  // Šatny u tělocvičny – zatím jednoduše: světlé dlaždice a lavičky
  satnaKluci: makeLockerRoomArt('#cfe0ee'),
  satnaHolky: makeLockerRoomArt('#f3d9e2'),
  c202: makeClassroomArt('#efe7d6', [['right', 0.3, 80], ['right', 0.7, 80]], 'bottom'),   // otočená: okna vpravo, tabule dole
  c203: makeClassroomArt('#e3eef0', [0.12, 0.28, 0.44, 0.6].map((at) => ['top', at, 64]), 'right'),   // okna na horní zdi
  // Céčko – 2. patro: stejné schodiště jako v 1. patře, podesta, 4 schody dolů, hala
  cecko2: {
    door: { frame: '#6b4f33', leaf: '#d39a52', glass: '#e6c896', mat: '#2a2c2e', matRib: '#3d4043' },
    draw(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      fillNewBuildingFloor(room);
      drawLightPool(room.x + 210, room.y + 414, 170, 0.2);
      drawGraniteFlight(L(120, 20, 120, 220), 'up');     // do 3. patra
      drawGraniteFlight(L(246, 20, 120, 220), 'down');   // z 1. patra (dolů = k severu)
      drawHazardStripe(room.x + 120, room.y + 235, 120, 5);
      drawHazardStripe(room.x + 246, room.y + 235, 120, 5);
      // podesta a 4 schody dolů do haly – stejná béžová dlažba jako podlaha patra,
      // schody jen se stínem a hranou
      for (let k = 0; k < 4; k++) {
        const y = room.y + 280 + k * 10;
        const g = ctx.createLinearGradient(0, y, 0, y + 10);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        ctx.fillStyle = g;
        ctx.fillRect(room.x + 120, y, 246, 10);
        ctx.fillStyle = 'rgba(120, 70, 50, 0.45)';
        ctx.fillRect(room.x + 120, y, 246, 1.5);
      }
      drawHazardStripe(room.x + 120, room.y + 280, 246, 4);   // hrana prvního schodu dolů
      drawWallBand(room, CECKO_WALL);
      drawWallWindow(room, 'bottom', 330 / 420, 80, { frame: '#e8e8e4', glass: '#d6ebf5' });
      drawWallWindow(room, 'bottom', 80 / 420, 70, { frame: '#e8e8e4', glass: '#d6ebf5' });
      drawWallWindow(room, 'right', 360 / 528, 50, { frame: '#e8e8e4', glass: '#d6ebf5' });
      drawWallWindow(room, 'right', 460 / 528, 50, { frame: '#e8e8e4', glass: '#d6ebf5' });
      for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) drawVoidWalls(room, o);
      drawOutlinedText('1. patro', room.x + 306, room.y + 40, 'bold 12px sans-serif', '#ffffff', 'middle');
      drawOutlinedText('3. patro', room.x + 180, room.y + 40, 'bold 12px sans-serif', '#ffffff', 'middle');
    },
  },
  c101: makeClassroomArt('#f3e3e6', [0.14, 0.32, 0.5, 0.68, 0.86].map((at) => ['left', at, 64])), // okna po celé levé zdi
  c109: makeClassroomArt('#e6eef3', [0.3, 0.45, 0.6, 0.75, 0.9].map((at) => ['bottom', at, 64]), 'left'),   // okna po celé spodní zdi
  a113: null,   // kreslí se stejně jako A114 (doplní se pod ROOM_ART)
  // A114 – laboratoř: parkety do stromečku, bílé tabule, okna vlevo, plakáty vpravo
  a114: {
    door: WOOD_DOOR,
    draw(room) {
      ctx.fillStyle = getPattern('a114-stromecek', 24, drawHerringboneTile);
      ctx.fillRect(room.x, room.y, room.w, room.h);
      drawWallBand(room, { top: '#f1ead6', edge: '#e5c98f', base: '#3b2e22', outline: '#9a948a' });
      const t = CONFIG.WALL_THICKNESS;
      for (const [x, w] of [[150, 70], [224, 70], [300, 54]]) {   // bílé interaktivní tabule
        drawRect({ x: room.x + x, y: room.y + 2, w, h: t - 4 }, '#c9ccd0');
        drawRect({ x: room.x + x + 2, y: room.y + 4, w: w - 4, h: t - 8 }, '#ffffff');
      }
      drawRect({ x: room.x + 370, y: room.y + 4, w: 30, h: t - 8 }, '#e8e8e4');   // umyvadlo s obkladem
      for (const at of [0.3, 0.68]) drawWallWindow(room, 'left', at, 90, OLD_WINDOW);
      drawWallPosters(room, 'bottom', 0.15, 0.85, 114);
      drawWallPosters(room, 'right', 0.06, 0.38, 115);
    },
  },
  // A107 (fotka A107.jpg): žlutooranžové linoleum, zelený sokl, dvě okna vlevo, bílá tabule nahoře,
  // u dveří zásobník na ručníky, plakáty na spodní zdi
  a107: {
    door: WOOD_DOOR,
    draw(room) {
      ctx.fillStyle = getPattern('a107-lino', 80, (g, size) => drawTerrazzoTile(g, size, {
        seed: 41, tile: 80, base: '#e2aa45', grout: '#e2aa45', tileVariation: 0, density: 0.45,
        speckles: ['#d39a36', '#efc06a', '#c98d2c', '#f3cd80'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      drawWallBand(room, { top: '#f4f6ee', edge: '#a9c94b', base: '#6f8f22', outline: '#9a948a' });
      for (const at of [0.3, 0.72]) drawWallWindow(room, 'left', at, 90, OLD_WINDOW);
      const t = CONFIG.WALL_THICKNESS;
      drawRect({ x: room.x + 120, y: room.y + 2, w: 170, h: t - 4 }, '#9e9e9e');      // bílá tabule
      drawRect({ x: room.x + 123, y: room.y + 4, w: 164, h: t - 8 }, '#f7f9fa');
      drawRect({ x: room.x + 360, y: room.y + 2, w: 26, h: 12 }, '#f5f5f5');          // zásobník na ručníky
      drawRect({ x: room.x + 360, y: room.y + 12, w: 26, h: 3 }, '#f2d04a');
      drawWallPosters(room, 'bottom', 0.1, 0.85, 7);
    },
  },
  kabinet: makeKabinetArt('top'),   // Málův kabinet: okno na horní zdi
  kabinet2: (() => {   // Křiváčkův kabinet: kout vpravo nahoře je zeď (void)
    const base = makeKabinetArt('left');
    return { door: base.door, draw(room) { base.draw(room); for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) drawVoidWalls(room, o); } };
  })(),
  kabinet3: makeKabinetArt('bottom'),
  kabinet4: makeKabinetArt('left'),
  kabinet5: makeKabinetArt('bottom'),
  kabinet6: makeKabinetArt('left'),
  wcKluci: makeWcArt('#4a7fc0'),
  wcKluci0: makeWcArt('#4a7fc0', 'bottom'),
  wcHolky: makeWcArt('#c25b86'),
  parkoviste: {
    door: OLD_DOOR,
    draw(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      const t = CONFIG.WALL_THICKNESS;
      // za plotem ulice z kostek (nahoře, vlevo a dole, mimo místnost), svažuje se doleva dolů
      ctx.fillStyle = getPattern('kostky', 24, (g, size) => drawTerrazzoTile(g, size, {
        seed: 71, tile: 8, base: '#77736c', grout: '#5e5a54', tileVariation: 0.12, density: 0.02,
        speckles: ['#6b675f'],
      }));
      const out = [[-90, -40, room.w + 90, 40], [-90, 0, 90, room.h + 40], [0, room.h, 300, 40]];
      for (const [x, y, w, h] of out) ctx.fillRect(room.x + x, room.y + y, w, h);
      const slope = ctx.createLinearGradient(room.x + room.w, room.y - 40, room.x - 90, room.y + room.h + 40);
      slope.addColorStop(0, 'rgba(0, 0, 0, 0)');
      slope.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = slope;
      for (const [x, y, w, h] of out) ctx.fillRect(room.x + x, room.y + y, w, h);
      // šedá dlažba s jemnou texturou
      ctx.fillStyle = getPattern('parkoviste-dlazba2', 40, (g, size) => drawTerrazzoTile(g, size, {
        seed: 64, tile: 20, base: '#8a8781', grout: '#76736d', tileVariation: 0.05, density: 0.12,
        speckles: ['#7c7973', '#97948d', '#83807a', '#6f6c66'],
      }));
      ctx.fillRect(room.x, room.y, room.w, room.h);
      // suchá tráva u zídky (vlevo a dole)
      drawRect(L(20, 150, 26, 310), '#9a9a72');
      drawRect(L(46, 434, 254, 26), '#9a9a72');
      ctx.fillStyle = 'rgba(120, 104, 70, 0.45)';
      for (let i = 0; i < 120; i++) {
        const k = (i * 97) % 564;
        const [x, y] = k < 310 ? [22 + ((i * 7) % 22), 150 + k] : [46 + (k - 310), 436 + ((i * 13) % 22)];
        ctx.fillRect(room.x + x, room.y + y, 1, 4);
      }
      // pruh trávy mezi auty a budovou (za rohem dolů)
      drawRect(L(266, 130, 34, 330), '#7d8d62');
      ctx.fillStyle = 'rgba(60, 80, 45, 0.3)';
      for (let i = 0; i < 60; i++) ctx.fillRect(room.x + 268 + ((i * 11) % 30), room.y + 132 + ((i * 41) % 326), 2, 3);
      // bílé vodorovné značení stání
      ctx.fillStyle = 'rgba(236, 236, 230, 0.8)';
      for (let y = 155; y <= 455; y += 50) ctx.fillRect(room.x + 178, room.y + y, 86, 2);
      ctx.fillRect(room.x + 178, room.y + 155, 2, 300);
      // zdi: nahoře, vlevo a dole kamenná zídka s drátěným plotem
      drawWallBand(room, { top: '#8f8a82', edge: '#77736c', base: '#5a5751', outline: '#4a4844' });
      const stones = (r, seed) => {
        const rnd = seededRandom(seed);
        drawRect(r, '#7b776f');
        for (let y = r.y; y < r.y + r.h; y += 7) {
          for (let x = r.x - rnd() * 8; x < r.x + r.w; ) {
            const w = 6 + rnd() * 10;
            ctx.fillStyle = ['#9a958c', '#8c877e', '#a7a299', '#85807a'][Math.floor(rnd() * 4)];
            const x0 = Math.max(x, r.x), x1 = Math.min(x + w - 1, r.x + r.w);
            if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, Math.min(6, r.y + r.h - y));
            x += w;
          }
        }
      };
      stones(L(0, 0, room.w, t), 81);
      stones(L(0, room.h - t, 300, t), 83);
      ctx.save(); ctx.translate(room.x, room.y + room.h); ctx.rotate(-Math.PI / 2);
      stones({ x: 0, y: 0, w: room.h, h: t }, 82);   // levá zídka (otočená)
      ctx.restore();
      ctx.strokeStyle = 'rgba(30, 32, 34, 0.85)';     // drátěný plot na zídce
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(room.x + room.w, room.y + 3); ctx.lineTo(room.x + 3, room.y + 3);
      ctx.lineTo(room.x + 3, room.y + room.h - 3); ctx.lineTo(room.x + 300, room.y + room.h - 3);
      ctx.stroke();
      ctx.fillStyle = '#2b2d2f';
      for (let x = 3; x < room.w; x += 40) ctx.fillRect(room.x + x - 1, room.y + 1, 3, 4);
      for (let y = 3; y < room.h; y += 40) ctx.fillRect(room.x + 1, room.y + y - 1, 4, 3);
      for (let x = 43; x < 300; x += 40) ctx.fillRect(room.x + x - 1, room.y + room.h - 5, 3, 4);
      // výjezd do ulice na horní zdi vlevo
      drawRect(L(130, 0, 140, t), '#55585b');
      ctx.fillStyle = 'rgba(240, 240, 235, 0.7)';
      ctx.fillRect(room.x + 130, room.y + 9, 140, 2);
      drawRect(L(126, 0, 6, t + 4), '#8a5a2e');
      drawRect(L(268, 0, 6, t + 4), '#8a5a2e');
      drawOutlinedText('ulice ↑', room.x + 200, room.y + 34, 'bold 11px sans-serif', '#ffffff', 'middle');
    },
    // budova přes zdi: střechy shora a fasády do parkoviště
    drawOver(room) {
      const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
      // bílá budova: červená taška se hřebenem, nahoře a vlevo krémová fasáda
      const roof = L(306, 130, 334, 170);
      drawRect(roof, '#9c4a36');
      ctx.fillStyle = 'rgba(60, 20, 10, 0.3)';
      for (let y = roof.y + 6; y < roof.y + roof.h; y += 6) ctx.fillRect(roof.x, y, roof.w, 1);
      for (let x = roof.x; x < roof.x + roof.w; x += 8) ctx.fillRect(x, roof.y, 1, roof.h);
      drawRect({ x: roof.x, y: roof.y + roof.h / 2 - 2, w: roof.w, h: 4 }, '#7e3828');   // hřeben
      const facade = (r, horizontal) => {
        drawRect(r, '#ede6d4');
        const len = horizontal ? r.w : r.h;
        for (let a = 10; a < len - 30; a += 44) {
          const R = (o, l, c) => drawRect(horizontal ? { x: r.x + a + o, y: r.y + 3, w: l, h: r.h - 6 } : { x: r.x + 3, y: r.y + a + o, w: r.w - 6, h: l }, c);
          R(0, 4, '#8d8a84'); R(6, 7, '#a9bfcb'); R(15, 7, '#a9bfcb'); R(24, 7, '#a9bfcb'); R(33, 4, '#8d8a84');
        }
      };
      facade(L(300, 110, 340, 20), true);    // horní stěna u úzké cesty (s dveřmi)
      facade(L(300, 130, 20, 170), false);   // za rohem dolů
      // žlutá nižší přístavba s plochou střechou a velkými okny
      const flat = L(320, 300, 320, 180);
      drawRect(flat, '#a9a497');
      const rnd = seededRandom(91);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(flat.x + rnd() * flat.w, flat.y + rnd() * flat.h, 1.5, 1.5);
      }
      drawRect(L(300, 300, 20, 180), '#e0cf78');
      for (let y = 312; y < 460; y += 40) {
        drawRect(L(302, y, 16, 30), '#7f5532');
        drawRect(L(305, y + 2, 10, 26), '#bcd6e2');
      }
      drawRect(L(300, 296, 340, 4), '#8a8579');   // stín mezi střechami
    },
  },
};
// Parkoviště se kreslí v původním měřítku 640 × 480 a zvětší se (zdi zůstanou stejně silné)
function scaleRoomArt(art, S) {
  const scaled = (fn) => (room) => {
    const t = CONFIG.WALL_THICKNESS;
    ctx.save();
    ctx.translate(room.x, room.y);
    ctx.scale(S, S);
    CONFIG.WALL_THICKNESS = t / S;
    try { fn({ ...room, x: 0, y: 0, w: room.w / S, h: room.h / S }); }
    finally { CONFIG.WALL_THICKNESS = t; ctx.restore(); }
  };
  return { ...art, draw: scaled(art.draw), drawOver: art.drawOver && scaled(art.drawOver) };
}
ROOM_ART.parkoviste = scaleRoomArt(ROOM_ART.parkoviste, PARKOVISTE_SCALE);
ROOM_ART.satnyDole = ROOM_ART.satny;   // dolní šatny vypadají stejně jako šatny o patro výš
ROOM_ART.a113 = ROOM_ART.a114;         // A113 je laboratoř jako A114
// počítačové učebny: bílá tabule vlevo, okna nahoře
ROOM_ART.a209 = makeClassroomArt('#f1ead6', [['top', 0.25, 90], ['top', 0.52, 90]], 'left', '#f4f4f2');
ROOM_ART.a210 = makeClassroomArt('#e8eef4', [['top', 0.25, 90], ['top', 0.52, 90]], 'left', '#f4f4f2');
ROOM_ART.a211 = makeClassroomArt('#e6efe1', [['left', 0.3, 80], ['left', 0.7, 80]]);
ROOM_ART.a212 = makeClassroomArt('#f1ead6', [['left', 0.3, 80], ['left', 0.7, 80]]);
ROOM_ART.kabinetA213 = makeKabinetArt('top');
ROOM_ART.predsinKabinetu = makeKabinetArt('top');
ROOM_ART.kabinetA214 = makeKabinetArt('top');
ROOM_ART.kabinetA215 = makeKabinetArt('left');
ROOM_ART.kabinetA216 = makeKabinetArt('bottom');
ROOM_ART.kancelar = makeKabinetArt('bottom');
ROOM_ART.reditelna = makeKabinetArt('left');
ROOM_ART.kabinetA312 = makeKabinetArt('top');
ROOM_ART.kabinetA302 = makeKabinetArt('bottom');
// třídy 2. patra podle fotek
const WIN_LEFT = [['left', 0.3, 80], ['left', 0.7, 80]];
ROOM_ART.a309 = makeClassroomArt('#e8eef4', [['right', 0.3, 80], ['right', 0.7, 80]], 'bottom', '#f4f4f2', {
  extra(room) {   // zelená tabule na levé zdi
    const t = CONFIG.WALL_THICKNESS;
    drawRect({ x: room.x + 2, y: room.y + 140, w: t, h: 120 }, '#8a5a2e');
    drawRect({ x: room.x + 5, y: room.y + 143, w: t - 6, h: 114 }, '#24513a');
  },
});
ROOM_ART.a310 = makeClassroomArt('#f1ead6', WIN_LEFT, 'top', '#f4f4f2', {
  extra(room) {   // stupně: každá řada lavic o schod výš (i v uličce), hrana schodu světlá
    const t = CONFIG.WALL_THICKNESS;
    A310_ROWS.forEach((y, i) => {
      const step = { x: room.x + t, y: room.y + y - 30, w: room.w - 2 * t, h: room.y + room.h - t - (room.y + y - 30) };
      ctx.fillStyle = 'rgba(70, 40, 10, 0.07)';
      ctx.fillRect(step.x, step.y, step.w, step.h);
      ctx.fillStyle = 'rgba(255, 245, 225, 0.55)';
      ctx.fillRect(step.x, step.y, step.w, 3);
      ctx.fillStyle = 'rgba(60, 35, 10, 0.35)';
      ctx.fillRect(step.x, step.y + 3, step.w, 2);
    });
  },
});
ROOM_ART.a311 = makeClassroomArt('#f4f2ec', [['top', 0.3, 80], ['top', 0.7, 80]], 'bottom', '#f4f4f2', { floor: 'terrazzo', boardAt: 0.72 });   // tabule dole vpravo
ROOM_ART.a302 = makeClassroomArt('#f4f2ec', WIN_LEFT, 'top', '#f4f4f2', { floor: 'terrazzo' });
ROOM_ART.a305 = makeClassroomArt('#f4f2ec', [['right', 0.3, 80], ['right', 0.7, 80]], 'bottom', '#1b1b1d', {
  floor: 'terrazzo',
  extra(room) {   // tyrkysová zeď vpředu (dole) a velká dotyková obrazovka vlevo
    const t = CONFIG.WALL_THICKNESS;
    drawRect({ x: room.x + t, y: room.y + room.h - t, w: room.w - 2 * t, h: t }, '#2bb3b8');
    drawRect({ x: room.x + room.w / 2 - 60, y: room.y + room.h - t + 3, w: 120, h: t - 6 }, '#ffffff');   // tabule na tyrkysové zdi
    drawRect({ x: room.x + 2, y: room.y + 150, w: t - 2, h: 100 }, '#1b1b1d');
    drawRect({ x: room.x + 5, y: room.y + 154, w: t - 8, h: 92 }, '#2c3e5a');
  },
});
// Sborovna: šedé kobercové čtverce, krémové zdi, tři okna vpravo, obrázky, druhé dveře vlevo nahoře
ROOM_ART.sborovna = {
  door: WOOD_DOOR,
  draw(room) {
    ctx.fillStyle = getPattern('sborovna-koberec', 80, (g, size) => drawTerrazzoTile(g, size, {
      seed: 41, tile: 40, base: '#b8bec4', grout: '#aab0b6', tileVariation: 0.07, density: 0.35,
      speckles: ['#a3a9af', '#c6ccd1', '#9aa0a6'],
    }));
    ctx.fillRect(room.x, room.y, room.w, room.h);
    drawLightPool(room.x + 300, room.y + 180, 160, 0.16);
    drawWallBand(room, { top: '#f1e6c8', edge: '#d9c79c', base: '#6b5a48', outline: '#9a948a' });
    for (const at of [0.22, 0.5, 0.78]) drawWallWindow(room, 'right', at, 60, { frame: '#f4f2ec', glass: '#cfe4ef' });
    drawWallPosters(room, 'top', 0.25, 0.75, 51);
    drawWallPosters(room, 'bottom', 0.32, 0.7, 52);
    // druhé dveře (bílé, zavřené) na levé zdi pod skříní
    const t = CONFIG.WALL_THICKNESS;
    drawRect({ x: room.x, y: room.y + 200, w: t, h: 60 }, '#d9d6cf');
    drawRect({ x: room.x + 3, y: room.y + 203, w: t - 6, h: 54 }, '#f6f4ee');
    drawRect({ x: room.x + 3, y: room.y + 229, w: t - 6, h: 2 }, '#c9c4b6');
  },
};
// Aula: parkety do stromečku, krémové zdi s růžovým soklem a tyrkysovou linkou, okna dole,
// nástěnná světla nahoře, za jevištěm červená opona
ROOM_ART.aula = {
  door: { frame: '#c9b08a', leaf: '#e4d2b0', glass: '#efe3c9', mat: '#5a3a2a', matRib: '#6b4a3a' },
  draw(room) {
    ctx.fillStyle = getPattern('aula-stromecek', 32, (g, size) => drawHerringboneTile(g, size,
      ['#c48a4e', '#b87d43', '#cf9758', '#b27740', '#c99050']));
    ctx.fillRect(room.x, room.y, room.w, room.h);
    for (const x of [300, 520, 740]) drawLightPool(room.x + x, room.y + 220, 150, 0.14);
    drawWallBand(room, { top: '#efe4cf', edge: '#d39a9a', base: '#3f7f7a', outline: '#9a948a' });
    for (const at of [0.32, 0.5, 0.68, 0.86]) drawWallWindow(room, 'bottom', at, 70, OLD_WINDOW);
    ctx.fillStyle = '#f3d27a';   // nástěnná světla
    for (const x of [200, 480, 560, 780]) { ctx.beginPath(); ctx.arc(room.x + x, room.y + 14, 4, 0, Math.PI * 2); ctx.fill(); }
    drawRect({ x: room.x + 4, y: room.y + 60, w: 14, h: 320 }, '#8e1f2b');   // opona za jevištěm
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let y = room.y + 64; y < room.y + 376; y += 10) ctx.fillRect(room.x + 4, y, 14, 3);
  },
};
ROOM_ART.satny3 = {
  door: { frame: '#b9874f', leaf: '#d8ad72', glass: '#dbe9f0', mat: '#5b6066', matRib: '#6d7278' },
  draw(room) {
    const L = (x, y, w, h) => ({ x: room.x + x, y: room.y + y, w, h });
    ctx.fillStyle = getPattern('satny-dlazba', 80, (g, size) => drawTerrazzoTile(g, size, {
      seed: 21, tile: 40, base: '#dadad6', grout: '#b0b1ad', tileVariation: 0.04, density: 0.025,
      speckles: ['#9a9c9d', '#b3b5b6', '#7d7f80', '#c4bdae'],
    }));
    ctx.fillRect(room.x, room.y, room.w, room.h);
    drawLightPool(room.x + 160, room.y + 220, 110, 0.18);
    // šedá žebrovaná rohož před dveřmi do šaten (vlevo dole)
    drawRect(L(20, 270, 200, 110), '#5b6066');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = 274; y < 378; y += 5) ctx.fillRect(room.x + 22, room.y + y, 196, 2);
    // červené schody: spodní rameno nahoru (vpravo), podesta v rohu, horní rameno doleva
    const low = L(280, 100, 120, 225), land = L(280, 20, 120, 80), up = L(156, 20, 124, 80);
    const step = 20;
    const tile = (r, k, vertical) => {
      drawRect(r, k % 2 ? '#b65a48' : '#c46a55');
      drawRect(r, `rgba(255, 255, 255, ${Math.min(0.3, k * 0.018)})`);   // výš = světlejší
      if (vertical) drawRect({ x: r.x, y: r.y + r.h - 2, w: r.w, h: 2 }, 'rgba(120, 50, 40, 0.6)');
      else drawRect({ x: r.x + r.w - 2, y: r.y, w: 2, h: r.h }, 'rgba(120, 50, 40, 0.6)');
    };
    let k = 0;
    for (let y = low.y + low.h - step; y >= low.y - 1; y -= step) tile({ x: low.x, y, w: low.w, h: step }, k++, true);
    drawRect(land, '#c46a55');
    drawRect(land, `rgba(255, 255, 255, ${Math.min(0.3, k++ * 0.018)})`);
    ctx.fillStyle = 'rgba(120, 50, 40, 0.25)';
    for (let x = land.x + 30; x < land.x + land.w; x += 30) ctx.fillRect(x, land.y, 1, land.h);
    for (let y = land.y + 40; y < land.y + land.h; y += 40) ctx.fillRect(land.x, y, land.w, 1);
    for (let x = up.x + up.w - step; x >= up.x - 1; x -= step) tile({ x, y: up.y, w: step, h: up.h }, k++, false);
    drawHazardStripe(low.x, low.y + low.h - 6, 30, 6);   // první schod dole
    drawHazardStripe(up.x, up.y, 4, 24);                 // poslední schod nahoře
    drawOutlinedText('↑ Druhé schody', room.x + 222, room.y + 60, 'bold 11px sans-serif', '#ffffff', 'middle');
    // pod horním ramenem je nízko (betonový podhled) – stín
    drawRect(L(156, 106, 118, 120), 'rgba(80, 80, 80, 0.08)');
    drawWallBand(room, { top: '#f1efea', edge: '#9a7a55', base: '#3b2e22', outline: '#9c9a95' });
    drawRect(L(2, 230, 16, 10), '#f4f4f0');   // vypínač u dveří
    for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) drawVoidWalls(room, o);
  },
};

// 3. patro Céčka: místnosti jsou kopie z 1. patra, chodba má vlastní kresbu
Object.assign(ROOM_ART, {
  c301: ROOM_ART.c101,
  c308: ROOM_ART.c109,
  wcKluci3: ROOM_ART.wcKluci,
  wcHolky3: ROOM_ART.wcHolky,
  kabinet7: ROOM_ART.kabinet4,
  kabinet8: ROOM_ART.kabinet5,
  cecko3: {
    door: ROOM_ART.cecko.door,
    draw(room) {
      fillNewBuildingFloor(room);
      for (const lx of [210, 420, 620]) drawLightPool(room.x + lx, room.y + 80, 140, 0.22);
      drawGraniteFlight({ x: room.x + 120, y: room.y + 140, w: 120, h: 260 }, 'up');   // ze 2. patra
      drawHazardStripe(room.x + 120, room.y + 140, 120, 4);
      drawWallBand(room, CECKO_WALL);
      // místo východu na parkoviště okna
      const win = { frame: '#e8e8e4', glass: '#d6ebf5' };
      drawWallWindow(room, 'top', 210 / 780, 90, win);
      drawWallWindow(room, 'top', 320 / 780, 90, win);
      for (const o of room.obstacles.filter((ob) => ob.kind === 'void')) drawVoidWalls(room, o);
      drawOutlinedText('2. patro', room.x + 180, room.y + 380, 'bold 12px sans-serif', '#ffffff', 'middle');
    },
  },
});

// --- Pomocné kreslicí funkce ---
function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Text s tmavým obrysem – čitelný na jakékoli podlaze
function drawOutlinedText(text, x, y, font, color, baseline) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = baseline;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Rozdělí text na řádky, které se vejdou do maxWidth (podle aktuálního ctx.font)
function wrapText(text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function isTouchHint() {
  return input.lastDevice === 'touch';
}

// --- Učitelé a předměty ---
function teacherLook(t) {
  return { ...t.look, face: faceImgs[t.look.face], fallback: t.color };
}

function drawTeachers() {
  for (const t of state.teachers) {
    const r = t.rect;
    drawCharacterShadow(r);
    if (t.look) {
      drawFigure(r.x + r.w / 2, r.y + r.h, t.walkPhase || 0, t.walkBlend || 0, teacherLook(t));
      drawOutlinedText(t.name, r.x + r.w / 2, r.y + r.h + 3, CONFIG.TEACHER_NAME_FONT, '#ffffff', 'top');
      continue;
    }
    drawRect(r, t.color);
    ctx.strokeStyle = CONFIG.TEACHER_OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.font = CONFIG.TEACHER_INITIAL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t.initial, r.x + r.w / 2, r.y + r.h / 2 + 1);
    drawOutlinedText(t.name, r.x + r.w / 2, r.y + r.h + 3, CONFIG.TEACHER_NAME_FONT, '#ffffff', 'top');
  }
}

// Bublina „Mezerník“ / „Ťukni“ nad učitelem, ke kterému je hráč blízko
function drawTalkHint() {
  if (state.dialog || state.transition || state.screen !== 'playing') return;
  const t = nearbyTeacher();
  const spot = t ? null : nearSpot();
  const target = t ? t.rect : (spot ? spot.box : null);
  if (!target) return;
  const text = isTouchHint() ? CONFIG.HINT_TOUCH : CONFIG.HINT_KEYBOARD;
  ctx.font = CONFIG.HINT_FONT;
  const w = Math.ceil(ctx.measureText(text).width) + 14;
  const h = 20;
  const x = target.x + target.w / 2 - w / 2 + (spot ? spot.hintDx : 0);   // u zvonku bublina kousek od zdi
  const y = target.y - h - 6 + Math.sin(state.time * 5) * 1.5;
  roundRectPath(x, y, w, h, 6);
  ctx.fillStyle = CONFIG.HINT_BG;
  ctx.fill();
  ctx.fillStyle = CONFIG.HINT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
}

// Předmět poskakuje a pulzuje kolem něj záře
function drawItem(item) {
  const r = item.rect;
  const wave = Math.sin(state.time * CONFIG.ITEM_BOB_SPEED);
  const bob = wave * CONFIG.ITEM_BOB_HEIGHT;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 + bob;

  // stín na podlaze
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(cx, r.y + r.h + 5, r.w / 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // pulzující záře
  ctx.globalAlpha = 0.3 + 0.15 * wave;
  ctx.fillStyle = CONFIG.ITEM_GLOW_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cy, CONFIG.ITEM_GLOW_RADIUS * (0.95 + 0.1 * wave), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (item.icon) { drawIcon(item.icon, cx, cy, r.w + 10); return; }   // nakreslená věc (17_pribehy.js)
  roundRectPath(cx - r.w / 2, cy - r.h / 2, r.w, r.h, 4);
  ctx.fillStyle = item.color;
  ctx.fill();
  ctx.strokeStyle = CONFIG.ITEM_OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Efekt sebrání: rozpínající se kruh a jiskry do stran
function drawEffects() {
  for (const fx of state.effects) {
    const k = fx.t / CONFIG.PICKUP_EFFECT_TIME; // 0 → 1
    const radius = CONFIG.PICKUP_EFFECT_RADIUS * k;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = fx.color;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const d = radius * 1.2;
      ctx.fillRect(fx.x + Math.cos(a) * d - 3, fx.y + Math.sin(a) * d - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
  }
}

// --- Rozhraní ---
// Co teď u úkolu udělat (podle jeho stavu) – pro lištu i katalog
function questHint(q) {
  const teacher = TEACHERS[q.teacher];
  const where = ROOMS[teacher.room] ? ROOMS[teacher.room].where || ROOMS[teacher.room].name : '';
  const stage = questStage(q);
  if (q.hint && stage !== 'done') return q.hint();   // vlastní text podle postupu (18_vrah.js)
  if (stage === 'done') return 'Hotovo';
  if (stage === 'none') return `Zajdi za: ${teacher.name} (${where})`;
  if (stage === 'assigned') return q.task || 'Najdi ' + q.item.name;
  if (q.carryTask) return q.carryTask;
  const what = q.buy ? q.itemName : q.item ? q.item.name : null;
  return what ? `Přines ${what} – ${teacher.name} (${where})` : `${q.task} – ${teacher.name} (${where})`;
}

// Text pro horní lištu: úkol, na kterém hráč naposledy pracoval, jinak odkaz na katalog
function taskText() {
  if (questsDone() >= activeQuests().length) return 'Všechny úkoly splněny!';
  const q = QUESTS.find((qq) => qq.id === state.tracked);
  if (q && questStage(q) !== 'done' && questStage(q) !== 'none') return `${q.title}: ${questHint(q)}`;
  return isTouchHint() ? 'Seznam úkolů: tlačítko vpravo nahoře' : 'Seznam úkolů: klávesa Q';
}

function drawHud() {
  ctx.textBaseline = 'middle';
  ctx.font = CONFIG.TASK_FONT;
  ctx.fillStyle = CONFIG.TASK_COLOR;
  // vpravo je tlačítko s hudbou – dlouhý úkol začne vlevo a nepřeleze k němu (případně se zúží)
  const task = taskText(), maxW = CONFIG.MUSIC_BUTTON.x - 24;
  const fits = ctx.measureText(task).width <= maxW - 2 * (CONFIG.WIDTH / 2 - maxW / 2 - 12);
  ctx.textAlign = fits ? 'center' : 'left';
  ctx.fillText(task, fits ? CONFIG.WIDTH / 2 : 12, CONFIG.TASK_Y, maxW);

  ctx.font = CONFIG.COUNTER_FONT;
  ctx.textAlign = 'left';
  ctx.fillStyle = CONFIG.COUNTER_COLOR;
  const wallet = walletCash() ? ` (+${walletCash()} 👛)` : '';   // Chánova peněženka – dá se z ní platit (17_pribehy.js)
  ctx.fillText(`Splněno: ${questsDone()}/${activeQuests().length}   ·   ${state.money} Kč${wallet}`, 12, CONFIG.TITLE_Y);
}

function drawToast() {
  const toast = state.toast;
  if (!toast) return;
  ctx.globalAlpha = Math.min(1, toast.t / 0.3); // na konci rychle zmizí
  ctx.font = CONFIG.TOAST_FONT;
  const w = Math.ceil(ctx.measureText(toast.text).width) + 28;
  const h = 34;
  const x = CONFIG.WIDTH / 2 - w / 2;
  const y = CONFIG.TOAST_Y - h / 2;
  roundRectPath(x, y, w, h, 8);
  ctx.fillStyle = CONFIG.TOAST_BG;
  ctx.fill();
  ctx.fillStyle = CONFIG.TOAST_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(toast.text, CONFIG.WIDTH / 2, CONFIG.TOAST_Y + 1);
  ctx.globalAlpha = 1;
}

// Je barva světlá? (pro čitelné písmo na štítku se jménem)
function isLightColor(c) {
  const m = /^#([0-9a-f]{6})$/i.exec(c || '');
  if (!m) return false;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}
function drawDialog() {
  const d = state.dialog;
  if (!d) return;
  const m = CONFIG.DIALOG_MARGIN;
  const pad = CONFIG.DIALOG_PADDING;
  const w = CONFIG.WIDTH - 2 * m;
  const h = CONFIG.DIALOG_HEIGHT;
  const x = m;
  const y = CONFIG.HEIGHT - m - h;

  roundRectPath(x, y, w, h, 10);
  ctx.fillStyle = CONFIG.DIALOG_BG;
  ctx.fill();
  ctx.strokeStyle = CONFIG.DIALOG_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  // jméno na štítku v barvě postavy (tmavá barva = bílé písmo, světlá = tmavé), ať je vždy vidět
  ctx.font = CONFIG.DIALOG_NAME_FONT;
  const nameW = ctx.measureText(d.name).width + 18;
  roundRectPath(x + pad - 6, y + pad - 5, nameW, 26, 8);
  ctx.fillStyle = d.color; ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = isLightColor(d.color) ? '#1b1b1b' : '#ffffff';
  ctx.fillText(d.name, x + pad + 3, y + pad);

  ctx.font = CONFIG.DIALOG_TEXT_FONT;
  ctx.fillStyle = CONFIG.DIALOG_TEXT_COLOR;
  const lines = wrapText(d.text, w - 2 * pad);
  lines.forEach((line, i) => {
    ctx.fillText(line, x + pad, y + pad + 30 + i * CONFIG.DIALOG_LINE_HEIGHT);
  });

  ctx.font = CONFIG.DIALOG_CONTINUE_FONT;
  ctx.fillStyle = CONFIG.DIALOG_CONTINUE_COLOR;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const cont = isTouchHint() ? CONFIG.DIALOG_CONTINUE_TOUCH : CONFIG.DIALOG_CONTINUE_KEYBOARD;
  ctx.fillText(cont, x + w - pad, y + h - 10);
}

// Dveře + nápis nad nimi, kam vedou
// style = vzhled dveří z ROOM_ART (bez něj jednobarevný obdélník)
function drawDoors(room, style) {
  for (const door of room.doors) {
    if (door.hidden) continue;   // neviditelný průchod (konec schodů)
    const partArt = door.part && room.parts ? ROOM_ART[room.parts.find((p) => p.id === door.part).art] : null;
    if (door.style) drawStyledDoor(door, DOOR_STYLES[door.style]);
    else if (partArt) drawStyledDoor(door, partArt.door);
    else if (style) drawStyledDoor(door, style);
    else drawRect(door, CONFIG.DOOR_COLOR);
  }
  ctx.font = CONFIG.DOOR_LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = CONFIG.DOOR_LABEL_OUTLINE;
  for (const door of room.doors) {
    if (door.hidden) continue;
    const target = ROOMS[door.to];
    let label = target.name;
    if (target.parts) {   // do složené místnosti: název části, kam dveře vedou
      const back = target.doors.find((d) => d.to === room.id);
      const part = back && target.parts.find((p) => p.id === back.part);
      if (part) label = part.name;
    }
    // dlouhý nápis u kraje plátna posuneme dovnitř, ať není useknutý
    const half = ctx.measureText(label).width / 2 + 4;
    const camX = state.cam ? state.cam.x : 0, camY = state.cam ? state.cam.y : 0;
    const vw = state.cam && state.cam.vw || CONFIG.WIDTH, vh = state.cam && state.cam.vh || CONFIG.HEIGHT;   // výhled (mobil: přiblížený)
    const top = CONFIG.ROOM_AREA_TOP / (state.cam && state.cam.zoom || 1);
    // dveře mimo obraz (posouvaná místnost) – nápis nekreslit
    if (door.x + door.w < camX || door.x > camX + vw ||
        door.y + door.h < camY + top || door.y > camY + vh) continue;
    const x = Math.max(camX + half, Math.min(camX + vw - half, door.x + door.w / 2));
    const y = door.y - 3;
    ctx.fillStyle = CONFIG.DOOR_LABEL_COLOR;
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
  }
}

// Název místnosti nahoře uprostřed; po vstupu je chvíli větší a barevný
function drawRoomTitle(room) {
  const name = currentAreaName(room);
  const k = state.titleTimer / CONFIG.TITLE_HIGHLIGHT_TIME; // 1 → 0
  const ease = k * k;
  const size = Math.round(CONFIG.TITLE_FONT_SIZE * (1 + (CONFIG.TITLE_HIGHLIGHT_SCALE - 1) * ease));
  const x = CONFIG.WIDTH / 2;
  const y = CONFIG.TITLE_Y;
  ctx.font = `bold ${size}px ${CONFIG.TITLE_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.TITLE_COLOR;
  ctx.fillText(name, x, y);
  if (ease > 0) {
    ctx.globalAlpha = ease;
    ctx.fillStyle = CONFIG.TITLE_HIGHLIGHT_COLOR;
    ctx.fillText(name, x, y);
    ctx.globalAlpha = 1;
  }
}

// Ztmavnutí přes celé plátno během přechodu
function drawTransition() {
  const tr = state.transition;
  if (!tr) return;
  const half = CONFIG.TRANSITION_TIME / 2;
  const alpha = tr.t < half ? tr.t / half : 1 - (tr.t - half) / half;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = CONFIG.TRANSITION_COLOR;
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.globalAlpha = 1;
}
