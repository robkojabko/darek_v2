// Miniquest „Teplota pro Láďu“ + výběr u školníka (kleště / teploměr)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// TEPLOTA PRO LÁĎU
// Láďa chce vědět, kolik je venku stupňů. Teploměr má školník. S teploměrem se ve venkovní
// učebně nebo na parkovišti mezerníkem změří teplota (náhodná) a řekne se Láďovi.
// Ať je jakkoli: „Jo, tak to dneska půjdeme na těláku ven.“
// Postup je ve state.story.teplota: { step: null | 'skolnik' | 'merit' | 'zpet', temp }
//
// ŠKOLNÍK: když chce hráč zároveň kleště (struny pro Málu) i teploměr, vybere si;
// když jen jedno, dostane to rovnou.
// =====================================================================
const TEPLOTA = { ROOMS: ['venku', 'parkoviste'], MIN: -8, MAX: 28 };
const LA = () => TEACHERS.lada;
QUESTS.push({ id: 'teplota', title: 'Teplota pro Láďu', teacher: 'lada', hint: teplotaHint });

function teplota() {
  if (!state.story.teplota) state.story.teplota = { step: null, temp: null };
  return state.story.teplota;
}
const teplotaQuest = () => questById('teplota');
function teplotaHint() {
  const st = questStage(teplotaQuest()), t = teplota();
  if (st === 'none') return 'Zajdi za: Láďa (v kabinetu tělocvikářů)';
  if (t.step === 'skolnik') return 'Půjč si teploměr od školníka (ve skříňkách dole)';
  if (t.step === 'merit') return 'Změř teplotu venku – ve venkovní učebně nebo na parkovišti';
  if (t.step === 'zpet') return `Řekni Láďovi, kolik je venku (${t.temp} °C)`;
  return '';
}

// --- Láďa ---
function teplotaTalk() {
  if (vrahOn()) return false;
  const q = teplotaQuest(), st = questStage(q), t = teplota();
  if (st === 'none') {
    playScene([
      { who: LA(), text: 'Romane, skoč se mi podívat, kolik je venku stupňů. Ať vím, jestli půjdem ven.' },
      { who: LA(), text: 'Teploměr má školník, ten ti ho půjčí.' },
    ], () => { setQuestStage(q, 'assigned'); t.step = 'skolnik'; });
    return true;
  }
  if (t.step === 'zpet') {
    playScene([
      { text: `Venku je ${t.temp} °C.` },
      { who: LA(), text: 'Jo, tak to dneska půjdeme na těláku ven.' },
    ], () => { setQuestStage(q, 'done'); t.step = null; state.toast = { text: '✅ Úkol splněn: Teplota pro Láďu', t: CONFIG.TOAST_TIME }; });
    return true;
  }
  if (t.step === 'skolnik') { playScene([{ who: LA(), text: 'Teploměr má školník. Já tady nemám ani píšťalku, natož teploměr.' }]); return true; }
  if (t.step === 'merit') { playScene([{ who: LA(), text: 'Venku, Romane! Venkovní učebna nebo parkoviště. Tady v kabinetě je pořád dvacet.' }]); return true; }
  return false;   // po úkolu jeho obvyklá hláška
}
{
  const before = LA().talk;
  LA().talk = () => teplotaTalk() || (before ? before() : false);
}

// --- školník: teploměr, případně výběr mezi kleštěmi a teploměrem ---
function teplotaSkolnik() {
  playScene([
    { text: 'Dobrý den, nepůjčil byste mi teploměr? Láďa chce vědět, kolik je venku.' },
    { who: SK(), text: 'Teploměr? Na. Ale ať se nerozbije, je ještě z doby, kdy se tu topilo uhlím.' },
  ], () => { teplota().step = 'merit'; state.toast = { text: '🌡️ Máš teploměr – změř teplotu venku (venkovní učebna nebo parkoviště)', t: CONFIG.TOAST_TIME + 1 }; });
}
function strunyAtSkolnik() {   // má hráč u školníka něco kvůli strunám?
  if (questStage(strunyQuest()) !== 'assigned') return null;
  const s = struny();
  if (s.step === 'skolnik') return '🔧 Půjčit kleště (struny pro Málu)';
  if (s.step === 'klestě') return s.cut ? '🔧 Vrátit kleště' : '🔧 Kleště (ještě je potřebuju)';
  return null;
}
function skolnikMain() {
  if (vrahOn()) return false;
  const strunyLabel = strunyAtSkolnik();
  const wantsThermo = questStage(teplotaQuest()) === 'assigned' && teplota().step === 'skolnik';
  if (strunyLabel && wantsThermo) {
    openChoice('Co chceš po školníkovi?', [{ label: strunyLabel }, { label: '🌡️ Půjčit teploměr (pro Láďu)' }], (i) => {
      if (i === 0) strunySkolnik(); else teplotaSkolnik();
    });
    return true;
  }
  if (wantsThermo) { teplotaSkolnik(); return true; }
  return false;   // kleště nebo obvyklá hláška (22_struny.js, 18_vrah.js)
}
{
  const before = SK().talk;
  SK().talk = () => skolnikMain() || (before ? before() : false);
}

// --- měření venku: bublina „Mezerník“ přímo u hráče ---
function measureSpot() {
  if (vrahOn() || teplota().step !== 'merit' || !TEPLOTA.ROOMS.includes(state.room.id)) return null;
  const p = state.player;
  return { x: p.x, y: p.y, w: p.w, h: p.h };
}
function measure() {
  const t = teplota();
  t.temp = TEPLOTA.MIN + Math.floor(Math.random() * (TEPLOTA.MAX - TEPLOTA.MIN + 1));
  t.step = 'zpet';
  setQuestStage(teplotaQuest(), 'carrying');
  playSound([[880, 0, 0.05], [988, 0.07, 0.08]]);
  const comment = t.temp < 0 ? 'Brrr, mrzne.' : t.temp < 10 ? 'Je docela zima.' : t.temp < 20 ? 'Dá se to.' : 'To je teplo!';
  playScene([{ text: `*měří* … Teploměr ukazuje ${t.temp} °C. ${comment}` }],
    () => { state.toast = { text: `🌡️ Venku je ${t.temp} °C – řekni to Láďovi`, t: CONFIG.TOAST_TIME + 1 }; });
}
SPOTS.push({ rect: measureSpot, act: measure, hintDx: 0 });

function teplotaInventory() {
  if (vrahOn()) return [];
  const t = teplota();
  if (t.step === 'merit') return [{ icon: 'thermo', name: 'Teploměr od školníka', note: 'Změř teplotu venku' }];
  if (t.step === 'zpet') return [{ icon: 'thermo', name: 'Teploměr od školníka', note: `Ukazuje ${t.temp} °C` }];
  return [];
}
ICONS.thermo = (cx, cy, s) => {
  roundRectPath(cx - s * 0.08, cy - s * 0.4, s * 0.16, s * 0.6, s * 0.08);
  ctx.fillStyle = '#eceff1'; ctx.fill(); ctx.strokeStyle = '#78909c'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#e53935';
  ctx.fillRect(cx - s * 0.03, cy - s * 0.15, s * 0.06, s * 0.35);
  ctx.beginPath(); ctx.arc(cx, cy + s * 0.27, s * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { const y = cy - s * 0.3 + i * s * 0.12; ctx.beginPath(); ctx.moveTo(cx + s * 0.08, y); ctx.lineTo(cx + s * 0.16, y); ctx.stroke(); }
};
