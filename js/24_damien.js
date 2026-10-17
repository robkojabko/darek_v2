// Noví studenti Damien, Robin a Michele; quest „Damien a Michele“
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// POSTAVY
//   Damien – na chodbě v hale před šatnou kluků (zadává quest)
//   Robin – v A302 s Jelínkem
//   Michele – v C308 vedle Švecové (už na školu nechodí, přišla se podívat;
//               povídají si spolu – bubliny nad nimi)
// QUEST: Damien chce mluvit s Michele, ví jen, že je na Céčku. Švecová ji pustí,
// jen když Roman uhodne hádanku a napíše odpověď na tabuli: „vířivka“ (pravopisně
// správně). Na dva pokusy – pak se quest začíná znovu (hlášky i hádanka jsou jiné).
// Michele pak dojde za Damienem a oba odejdou do holčičí šatny; tam už Roman nesmí.
// Po minutě v šatně (DAMIEN.SATNA_TIME) vyjdou a vrátí se tam, kde začínali.
// Postup je ve state.story.damien: { step: null | 'najit' | 'jde' | 'satna' | 'zpet' | 'hotovo', round, tries, t }
// =====================================================================
const HALA = ROOMS.chodba.parts.find((p) => p.id === 'hala');
const CH = ROOMS.chodba;
const DAMIEN = {
  HOME: { room: 'chodba', at: { x: (HALA.offset.x + 62) / CH.w, y: (HALA.offset.y + 300) / CH.h } },        // před šatnou kluků
  MEET: { room: 'chodba', at: { x: (HALA.offset.x + 62) / CH.w, y: (HALA.offset.y + 250) / CH.h } },        // Michele dojde k němu
  SATNA: 'satnaHolky',
  IN_SATNA: [{ room: 'satnaHolky', at: { x: 0.45, y: 0.4 } }, { room: 'satnaHolky', at: { x: 0.6, y: 0.4 } }],
  MI_HOME: { room: 'c308', at: { x: 108 / 520, y: 205 / 400 } },   // vedle Švecové
  SATNA_TIME: 60,        // s v šatně, pak vyjdou a jdou zpátky
  ANSWER: 'vířivka',
  TRIES: 2,
};
Object.assign(TEACHERS, {
  damien: {
    name: 'Damien', pro: 'Damiena', student: true, color: '#5c6bc0',
    room: DAMIEN.HOME.room, at: { ...DAMIEN.HOME.at },
    look: { face: 'damien', body: '#2b2f3a', collar: '#1f222b', arms: '#2b2f3a', pants: '#2f3a52', shoes: '#e8e8e8' },
    texts: { idle: 'Čau Romane.' },
  },
  robin: {
    name: 'Robin', pro: 'Robina', student: true, color: '#b23a48',
    room: 'a302', at: { x: 290 / 520, y: 165 / 400 },
    look: { face: 'robin', body: '#d8cdb8', collar: '#c9bda6', arms: '#d8cdb8', pants: '#2b2b33', shoes: '#1b1b1b' },   // béžová mikina jako na fotce
    texts: { idle: 'Čau! Jelínek mě nechal po hodině zapojovat kabely. Zase.' },
  },
  michaelle: {
    name: 'Michele', pro: 'Michele', student: true, color: '#8e6bb0',
    room: 'c308', at: { x: 108 / 520, y: 205 / 400 },   // = DAMIEN.MI_HOME
    look: { face: 'michaelle', body: '#9ea4ab', collar: '#8a9097', arms: '#f0c8a8', pants: '#2f3a52', shoes: '#fafafa' },
    texts: { idle: 'Ahoj! Já už sem nechodím, jen jsem se přišla podívat.' },
  },
});
const DA = () => TEACHERS.damien, MI = () => TEACHERS.michaelle, SV = () => TEACHERS.svecova;
QUESTS.push({ id: 'damien', title: 'Damien a Michele', teacher: 'damien', hint: damienHint });

function damien() {
  if (!state.story.damien) state.story.damien = { step: null, round: 0, tries: 0 };
  return state.story.damien;
}
const damienQuest = () => questById('damien');
function damienHint() {
  const st = questStage(damienQuest()), d = damien();
  if (st === 'none') return 'Zajdi za: Damien (v hale před šatnou kluků)';
  if (d.step === 'najit') return 'Najdi Michele – je někde na Céčku';
  if (d.step === 'jde') return 'Michele jde za Damienem';
  return '';
}

// --- hlášky (každé kolo jiné) ---
const DAMIEN_ASK = [
  'Čau Romane. Potřebuju si nutně promluvit s Michele, ale nevím, kde je. Vím jen, že je někde na Céčku. Najdeš ji a řekneš jí, ať za mnou přijde?',
  'Zase nic? Hm… Zkus to prosím ještě jednou. Pořád vím jen to, že je na Céčku. Řekni jí, ať za mnou přijde.',
  'Romane, fakt mi na tom záleží. Je na Céčku, jinde ne. Prosím, pošli ji za mnou.',
  'Já vím, já vím… Ale bez ní to nejde. Céčko, Romane. Ještě jednou, prosím.',
];
const MICHAELLE_TOLD = [
  [['michaelle', 'Damien? No jo… Tak jo. Ale paní Švecová mě jen tak nepustí.'],
    ['svecova', 'No dobře, ale jenom když uhádneš hádanku. A odpověď musíš napsat na tabuli.']],
  [['michaelle', 'Zase ty? Tak to Damien asi myslí vážně.'],
    ['svecova', 'Hádanka a tabule, jako minule. A pozor na pravopis, Romane!']],
  [['michaelle', 'Ty to fakt nevzdáš, co?'],
    ['svecova', 'Tak znovu. Ale dostaneš jinou, ať to nemáš zadarmo.']],
  [['michaelle', 'Damien je tvrdohlavej. Ty asi taky.'],
    ['svecova', 'Já mám hádanek dost. Tak poslouchej.']],
];
// hádanky – odpověď je vždycky vířivka
const DAMIEN_RIDDLES = [
  'Jsem ve wellness i na zahradě. Točím se, a přece nikam nejedu. Bublám, i když nevařím, a kdo do mě vleze, ten se uvolní. Co jsem?',
  'Mám vodu, ale nejsem rybník. Mám bubliny, ale nejsem limonáda. Hučím, ale nejsem vysavač. Sedí se ve mně, ale nejsem vana. Co jsem?',
  'Voda ve mně krouží a víří, a právě podle toho se jmenuji. Teplo, bublinky a kolem pára. Co jsem?',
  'Do bazénu se skáče, do mě se jen opatrně sedá. Chlad nesnáším, bubliny zbožňuji a víření je moje druhé jméno. Co jsem?',
];
const MICHAELLE_FAIL = [
  [['svecova', 'Bohužel. Michele zůstává tady, máme si ještě co povídat.'], ['michaelle', 'Promiň, Romane. Vyřiď Damienovi, ať to zkusí jinak.']],
  [['svecova', 'Zase vedle. To bude pětka z hádanek.'], ['michaelle', 'Řekni Damienovi, že se fakt snažíš.']],
  [['svecova', 'Ne a ne. Michele, sedni si.'], ['michaelle', 'Tak zase příště, Romane.']],
];
// povídání Michele se Švecovou (bubliny nad nimi a rozhovor, když na ně Roman promluví)
const MICHAELLE_CHAT = [
  [['svecova', 'Tak co, Michele, jak se máš? Dlouho jsi tu nebyla.'], ['michaelle', 'Mám se fajn! Pracuju teď v květinářství.']],
  [['svecova', 'V květinářství? To je krásná práce.'], ['michaelle', 'Je! Celý den kytky. Jen ty růže dost píchají.']],
  [['svecova', 'A chybí ti škola?'], ['michaelle', 'Trochu. Hlavně vy. Testy ne.']],
  [['michaelle', 'Včera jsme vázali kytice na svatbu, asi padesát.'], ['svecova', 'To je ale romantika! A kdo se bral?']],
  [['svecova', 'A co ostatní? Vídáš se s někým?'], ['michaelle', 'Občas. Ale před svátky je v květinářství blázinec.']],
  [['michaelle', 'Šéfová mi prý dá na starost výlohu.'], ['svecova', 'No vidíš! Já věděla, že máš vkus.']],
];
const chatScene = (pair) => pair.map(([who, text]) => ({ who: TEACHERS[who], text }));

// --- rozhovory ---
function damienTalk() {
  if (vrahOn()) return false;
  const q = damienQuest(), st = questStage(q), d = damien();
  if (st === 'none') {
    playScene([{ who: DA(), text: DAMIEN_ASK[Math.min(d.round, DAMIEN_ASK.length - 1)] }],
      () => { setQuestStage(q, 'assigned'); d.step = 'najit'; d.tries = 0; });
    return true;
  }
  if (d.step === 'najit') { playScene([{ who: DA(), text: 'Tak co, našel jsi ji? Je někde na Céčku.' }]); return true; }
  if (d.step === 'jde') { playScene([{ who: DA(), text: 'Ona už jde? Díky, Romane!' }]); return true; }
  if (d.step === 'hotovo' || d.step === 'zpet') { playScene([{ who: DA(), text: 'Díky, Romane. Všechno jsme si s Michele vyříkali.' }]); return true; }
  return false;
}
function michaelleTalk() {
  if (vrahOn()) return false;
  const d = damien();
  if (d.step !== 'najit') {   // jinak si jen povídají (Roman je slyší)
    if (MI().room !== 'c308') return false;
    state.chatIndex = ((state.chatIndex || 0) + 1) % MICHAELLE_CHAT.length;
    playScene(chatScene(MICHAELLE_CHAT[state.chatIndex]));
    return true;
  }
  const k = d.round % MICHAELLE_TOLD.length;
  playScene([
    { text: d.round ? 'Michele, zase já. Damien s tebou pořád chce mluvit.' : 'Ahoj Michele, Damien by s tebou chtěl mluvit. Ať prý za ním přijdeš.' },
    ...chatScene(MICHAELLE_TOLD[k]),
    { who: SV(), text: DAMIEN_RIDDLES[d.round % DAMIEN_RIDDLES.length] },
    { act: openBoard },
  ]);
  return true;
}
DA().talk = damienTalk;
MI().talk = michaelleTalk;
{
  const before = SV().talk;
  SV().talk = () => (!vrahOn() && MI().room === 'c308' && michaelleTalk()) || (before ? before() : false);
}

// --- tabule: odpověď se píše do opravdového pole (na mobilu vyskočí klávesnice) ---
let boardEl = null;
function openBoard() {
  if (!boardEl) {
    boardEl = document.createElement('div');
    boardEl.id = 'tabule';
    boardEl.innerHTML = `
      <div class="tabule-deska">
        <div class="tabule-nadpis">Napiš odpověď na tabuli</div>
        <div class="tabule-hadanka"></div>
        <input class="tabule-pole" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40">
        <div class="tabule-pokusy"></div>
        <div class="tabule-tlacitka"><button class="tabule-ok">Napsat ✍️</button></div>
      </div>`;
    document.body.appendChild(boardEl);
    const style = document.createElement('style');
    style.textContent = `
      #tabule { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.55); z-index: 50; }
      #tabule .tabule-deska { width: min(560px, 92vw); background: #2f5d3a; border: 10px solid #8a5a2e; border-radius: 10px; padding: 16px 18px; color: #f4f4ec; font-family: 'Comic Sans MS', 'Segoe Print', cursive; box-shadow: 0 8px 30px rgba(0,0,0,.5); }
      #tabule .tabule-nadpis { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
      #tabule .tabule-hadanka { font-size: 15px; line-height: 1.4; opacity: .9; margin-bottom: 12px; }
      #tabule .tabule-pole { width: 100%; box-sizing: border-box; font: 26px 'Comic Sans MS', 'Segoe Print', cursive; color: #ffffff; background: transparent; border: none; border-bottom: 2px dashed rgba(255,255,255,.6); outline: none; padding: 4px 2px; }
      #tabule .tabule-pokusy { font-size: 14px; margin-top: 8px; opacity: .8; }
      #tabule .tabule-tlacitka { text-align: right; margin-top: 10px; }
      #tabule button { font: bold 16px sans-serif; padding: 8px 16px; border-radius: 8px; border: none; background: #f4ecd8; color: #3b2a1c; cursor: pointer; }`;
    document.head.appendChild(style);
    const field = boardEl.querySelector('.tabule-pole');
    const stop = (e) => { e.stopPropagation(); };   // psaní nesmí ovládat hru (WASD, E, Q, P…)
    field.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') submitBoard(); });
    field.addEventListener('keyup', stop);
    boardEl.querySelector('.tabule-ok').addEventListener('click', submitBoard);
    for (const t of ['pointerdown', 'touchstart', 'mousedown']) boardEl.addEventListener(t, stop);
  }
  const d = damien();
  boardEl.querySelector('.tabule-hadanka').textContent = DAMIEN_RIDDLES[d.round % DAMIEN_RIDDLES.length];
  boardEl.querySelector('.tabule-pokusy').textContent = `Pokus ${d.tries + 1} ze ${DAMIEN.TRIES}`;
  const field = boardEl.querySelector('.tabule-pole');
  field.value = '';
  boardEl.style.display = 'flex';
  state.board = true;
  input.keys.clear();
  setTimeout(() => field.focus(), 50);
}
function closeBoard() {
  if (boardEl) boardEl.style.display = 'none';
  state.board = false;
  input.keys.clear();
  if (document.activeElement) document.activeElement.blur();
}
// pravopisně správně: „vířivka“ (velké V na začátku i tečka na konci nevadí)
function boardVerdict(text) {
  const t = text.normalize('NFC').trim().replace(/[.!]+$/, '').trim();
  if (t.toLocaleLowerCase('cs') === DAMIEN.ANSWER) return 'ok';
  const bare = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/y/g, 'i');
  return bare(t) === bare(DAMIEN.ANSWER) ? 'pravopis' : 'spatne';
}
function submitBoard() {
  const field = boardEl.querySelector('.tabule-pole');
  if (!field.value.trim()) { field.focus(); return; }
  const verdict = boardVerdict(field.value), d = damien(), written = field.value.trim();
  closeBoard();
  if (verdict === 'ok') {
    playSound([[523, 0, 0.08], [659, 0.09, 0.08], [784, 0.18, 0.14]]);
    playScene([
      { text: `*píše na tabuli* ${written}` },
      { who: SV(), text: 'Vířivka! Správně – a i pravopis sedí. Tak běž, Michele.' },
      { who: MI(), text: 'Díky, Romane! Jdu za Damienem.' },
    ], michaelleGoes);
    return;
  }
  d.tries++;
  playSound([[220, 0, 0.15]], 'square');
  if (d.tries < DAMIEN.TRIES) {
    playScene([
      { text: `*píše na tabuli* ${written}` },
      { who: SV(), text: verdict === 'pravopis' ? 'Skoro! Ale takhle se to nepíše. Pravopis, Romane! Máš ještě jeden pokus.' : 'Ne, ne. To není ono. Máš ještě jeden pokus.' },
      { act: openBoard },
    ]);
    return;
  }
  // dva pokusy pryč: quest se začíná znovu u Damiena (příště jiné hlášky i hádanka)
  const fail = MICHAELLE_FAIL[d.round % MICHAELLE_FAIL.length];
  playScene([{ text: `*píše na tabuli* ${written}` }, ...chatScene(fail)], () => {
    d.round++; d.step = null; d.tries = 0;
    setQuestStage(damienQuest(), 'none');
    state.toast = { text: '❌ Hádanka neuhodnutá – zajdi znovu za Damienem', t: CONFIG.TOAST_TIME + 2 };
  });
}

// --- Michele jde za Damienem a pak oba do holčičí šatny ---
function michaelleGoes() {
  const d = damien();
  d.step = 'jde';
  walkTo(MI(), DAMIEN.MEET, 120, () => {
    if (state.room.id === 'chodba') state.toast = { text: 'Michele: „Ahoj Damiene! Pojď, půjdeme si promluvit.“', t: CONFIG.TOAST_TIME + 1 };
    walkTo(MI(), DAMIEN.IN_SATNA[0], 80, (t) => { placeStatic(t, DAMIEN.IN_SATNA[0].room, DAMIEN.IN_SATNA[0].at); refreshCast(); }, 0.5);
    walkTo(DA(), DAMIEN.IN_SATNA[1], 80, (t) => { placeStatic(t, DAMIEN.IN_SATNA[1].room, DAMIEN.IN_SATNA[1].at); refreshCast(); pairInSatna(); }, 1);
  });
}
function pairInSatna() {
  const d = damien();
  if (d.step === 'satna') return;
  d.step = 'satna'; d.t = DAMIEN.SATNA_TIME;
  setQuestStage(damienQuest(), 'done');
  state.toast = { text: '✅ Úkol splněn: Damien a Michele si jdou promluvit', t: CONFIG.TOAST_TIME + 1 };
  if (state.room.id === DAMIEN.SATNA) kickFromSatna();   // Roman tam nesmí zůstat
}
function kickFromSatna() {
  const door = ROOMS[DAMIEN.SATNA].doors.find((x) => x.to === 'chodba');
  enterRoom(door.to, door.spawn);
  playScene([{ text: 'Asi bych tam neměl chodit, třeba probírají něco důležitého.' }]);
}
// do holčičí šatny (oba vchody) se nesmí, jakmile Michele vyrazí – ať tam Roman nedoběhne dřív
const satnaClosed = () => !vrahOn() && ['jde', 'satna'].includes(damien().step);
{
  const before = doorBlocked;
  doorBlocked = (door) => {
    if (before(door)) return true;
    if (!satnaClosed() || door.to !== DAMIEN.SATNA) return false;
    const p = state.player, back = { top: [0, 6], bottom: [0, -6], left: [6, 0], right: [-6, 0] }[door.side];
    p.x += back[0]; p.y += back[1];
    if (!state.dialog && !state.scene) playScene([{ text: 'Asi bych tam neměl chodit, třeba probírají něco důležitého.' }]);
    return true;
  };
}
// každý snímek: kdyby byl Roman v šatně, když je zavřená (načtená hra…), vystrčí ho
function updateDamien(dt) {
  if (vrahOn()) return;
  const d = damien();
  if (satnaClosed() && state.room.id === DAMIEN.SATNA && !state.dialog && !state.scene && !state.transition) kickFromSatna();
  if (d.step !== 'satna') return;
  d.t = (d.t ?? DAMIEN.SATNA_TIME) - dt;
  if (d.t > 0) return;
  // vyjdou ze šatny a každý jde tam, kde začínal
  d.step = 'zpet';
  let home = 0;
  const arrived = (t, place) => { placeStatic(t, place.room, place.at); refreshCast(); if (++home === 2) d.step = 'hotovo'; };
  walkTo(MI(), DAMIEN.MI_HOME, 110, (t) => arrived(t, DAMIEN.MI_HOME));
  walkTo(DA(), DAMIEN.HOME, 90, (t) => arrived(t, DAMIEN.HOME), 0.6);
  if (state.room.id === 'chodba') state.toast = { text: 'Damien a Michele vyšli ze šatny.', t: CONFIG.TOAST_TIME };
}
// po načtení hry: rozdělaná cesta = už jsou v šatně
function applyDamien() {
  const d = damien();
  if (vrahOn()) return;
  if (d.step === 'najit' && questStage(damienQuest()) !== 'assigned') d.step = null;
  if (d.step === 'jde') { d.step = 'satna'; d.t = DAMIEN.SATNA_TIME; setQuestStage(damienQuest(), 'done'); }
  if (d.step === 'zpet') d.step = 'hotovo';
  if (d.step === 'satna') {
    placeStatic(MI(), DAMIEN.IN_SATNA[0].room, DAMIEN.IN_SATNA[0].at);
    placeStatic(DA(), DAMIEN.IN_SATNA[1].room, DAMIEN.IN_SATNA[1].at);
  } else {
    placeStatic(MI(), DAMIEN.MI_HOME.room, DAMIEN.MI_HOME.at);
    placeStatic(DA(), DAMIEN.HOME.room, DAMIEN.HOME.at);
  }
}

// bubliny: Michele a Švecová si povídají (jen když je hráč poblíž a Michele je v C308)
function drawMicheleChat() {
  const m = MI(), s = SV();
  if (vrahOn() || !m.rect || !s.rect || m.room !== state.room.id || s.room !== state.room.id || state.dialog || m.route) return;
  const p = state.player;
  if (Math.hypot(p.x - m.rect.x, p.y - m.rect.y) > 260) return;
  const slot = Math.floor(state.time / 3.5), pair = MICHAELLE_CHAT[Math.floor(slot / 2) % MICHAELLE_CHAT.length], [who, text] = pair[slot % 2];
  const speaker = TEACHERS[who].rect;
  ctx.font = 'bold 11px sans-serif';
  const lines = wrapText(text, 170), w = Math.min(190, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16), h = lines.length * 14 + 10;
  const x = speaker.x + speaker.w / 2 - w / 2 + (who === 'svecova' ? -20 : 20), y = speaker.y - 46 - h;
  roundRectPath(x, y, w, h, 8); ctx.fillStyle = 'rgba(255, 255, 255, 0.93)'; ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 1; ctx.stroke();
  const tip = speaker.x + speaker.w / 2;
  ctx.beginPath(); ctx.moveTo(tip - 6, y + h); ctx.lineTo(tip + 6, y + h); ctx.lineTo(tip, y + h + 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b1d14'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 5 + i * 14));
}
