// Kvalita grafiky (výchozí / nízká) a vynechávání všeho, co je mimo obrazovku
// Část hry Dárek – načítá se v index.html po 29_multiplayer.js a před 15_hlavni.js (od kamaráda).
'use strict';

// =====================================================================
// VYNECHÁVÁNÍ MIMO OBRAZOVKU (culling)
// Svět se kreslí jen tam, kam kamera vidí: díly složených místností, nábytek, dveře,
// předměty, učitelé a ostatní hráči mimo záběr se přeskočí. Platí jen pro svět ve hře
// (renderGame nastaví výhled po výpočtu kamery a po kreslení světa ho zase zruší).
// =====================================================================
const CULL = { on: true, view: null, margin: 64, skipped: 0 };
function cullBegin(cam) { CULL.view = { x: cam.x, y: cam.y, w: cam.vw, h: cam.vh }; CULL.skipped = 0; }
function cullReset() { CULL.view = null; }
// Je obdélník (se světovými souřadnicemi) aspoň zčásti vidět? Mimo svět ve hře vždy true.
function inView(r, m = CULL.margin) {
  const v = CULL.view;
  if (!v || !CULL.on) return true;
  const ok = r.x + r.w + m > v.x && r.x - m < v.x + v.w && r.y + r.h + m > v.y && r.y - m < v.y + v.h;
  if (!ok) CULL.skipped++;
  return ok;
}

// =====================================================================
// KVALITA: výchozí / nízká. Nízká = vykreslování v poloviční velikosti (bez devicePixelRatio,
// ostré pixely), bez stínů a rozmazání a nejvýš 30 snímků za sekundu. Logika hry běží stejně.
// =====================================================================
const QUALITY = { KEY: 'hra_darek_kvalita_v1', LOW_SCALE: 0.5, low: storageGet('hra_darek_kvalita_v1') === 'low' };
// Rozlišení plátna vůči velikosti na obrazovce (používá resize() v 07_kresleni.js)
const renderScale = () => (QUALITY.low ? QUALITY.LOW_SCALE : (window.devicePixelRatio || 1));

function applyQualityEffects() {
  // v nízké kvalitě se stíny canvasu (shadowBlur / shadowColor) zahazují všude najednou
  if (QUALITY.low) {
    Object.defineProperty(ctx, 'shadowBlur', { configurable: true, get() { return 0; }, set() {} });
    Object.defineProperty(ctx, 'shadowColor', { configurable: true, get() { return 'rgba(0, 0, 0, 0)'; }, set() {} });
  } else {
    delete ctx.shadowBlur;
    delete ctx.shadowColor;
  }
  canvas.style.imageRendering = QUALITY.low ? 'pixelated' : '';
}
function toggleQuality() {
  QUALITY.low = !QUALITY.low;
  storageSet(QUALITY.KEY, QUALITY.low ? 'low' : 'default');
  applyQualityEffects();
  resize();   // nové rozlišení plátna
}
applyQualityEffects();   // uložená volba platí hned od startu (resize() se volá až na konci 15_hlavni.js)

// Nízká kvalita kreslí jen každý druhý snímek (logika běží dál po 60 krocích za sekundu)
let qualityFrame = 0;
const shouldRender = () => !QUALITY.low || (qualityFrame++ & 1) === 0;

// --- Úvodní menu: tlačítko Kvalita vlevo nahoře pod jménem ---
const QUALITY_BUTTON_TITLE = { x: 8, y: 96, w: 170, h: 26 };
const qualityLabel = () => `🖥 Kvalita: ${QUALITY.low ? 'nízká' : 'výchozí'}`;
function takeQualityTaps() {
  if (!titleControlsActive()) return;
  input.events = input.events.filter((ev) => {
    const hit = ev.type === 'tap' && ev.x !== null && pointInRect(ev.x, ev.y, QUALITY_BUTTON_TITLE, 4);
    if (hit) toggleQuality();
    return !hit;
  });
}
function drawQualityButton() {
  if (!titleControlsActive()) return;
  const b = QUALITY_BUTTON_TITLE;
  roundRectPath(b.x, b.y, b.w, b.h, 6);
  ctx.fillStyle = QUALITY.low ? 'rgba(200, 120, 20, 0.85)' : 'rgba(0, 0, 0, 0.45)'; ctx.fill();
  ctx.font = '13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
  ctx.fillText(qualityLabel(), b.x + 8, b.y + b.h / 2 + 1, b.w - 14);
}
