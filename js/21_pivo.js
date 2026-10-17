// Quest „Recept na pivo“ (Kája a Lukášková v laborkách)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// RECEPT NA PIVO
// Kája a Lukášková chtějí recept na nejlepší pivo. Recepty má Soumar v počítači
// u sebe v kabinetu (Kabinet A215, dolní dveře z Předsíně kabinetů) a hlídá je.
// Odlákat ho umí Kuba Vozábal (podezírá Netanjahua, že nás monitoruje):
//   1. rozbít 3 kamery na Áčku v 1. patře (patroA),
//   2. koupit mu párek v rohlíku (peníze půjčí Emma nebo Zita),
//   3. Kuba odvede Soumara ke kamerám → u počítače vybrat jedno pivo,
//   4. tiskárna chce kontrolní otázku (letopočet, A/B/C); špatně = jiná otázka,
//      3× špatně = alarm, Soumar hráče vyhodí a Kuba ho musí odlákat znovu,
//   5. recept z tiskárny v předsíni → Kája a Lukášková odpoví podle piva.
// Postup je ve state.story.pivo.step:
//   kuba → kamery → parek → pc → tisk → recept   (vyhozen = po alarmu)
// =====================================================================
const PIVO = {
  CAM_ROOM: 'patroA', PC_ROOM: 'kabinetA215', PRINTER_ROOM: 'predsinKabinetu',
  PRICE: () => BUFET_MENU.find((m) => m.id === 'parek').price,
  PAREK: () => BUFET_MENU.find((m) => m.id === 'parek').name,
  FAILS: 3,
  // kamery: střed v px od rohu Chodby v patře, side = na které zdi visí
  CAMS: [
    { id: 0, x: 1000, y: 1872, side: 'bottom' },    // hlavní chodba, spodní zeď
    { id: 1, x: 474, y: 1300, side: 'right' },     // západní rameno, pravá zeď
    { id: 2, x: 2074, y: 1600, side: 'right' },    // východní rameno, pravá zeď
  ],
  SOUMAR_GUARD: { room: 'predsinKabinetu', at: { x: 225 / 300, y: 190 / 240 } },   // u dveří do svého kabinetu
  SOUMAR_LURED: { room: 'patroA', at: { x: 1000 / 2200, y: 1812 / 1920 } },         // u rozbité kamery
  KUBA_LURED: { room: 'patroA', at: { x: 1072 / 2200, y: 1812 / 1920 } },
  BEERS: [
    { id: 'kozel', name: 'Kozel' },
    { id: 'svijany', name: 'Svijany' },
    { id: 'radegast', name: 'Radegast' },
    { id: 'plzen', name: 'Plzeň' },
    { id: 'budvar', name: 'Budvar' },
  ],
  // kontrolní otázky tiskárny: [otázka, správně, dvě špatné]
  DATES: [
    ['Kdy byla bitva na Bílé hoře?', 1620, [1618, 1648]],
    ['Kdy upálili Mistra Jana Husa?', 1415, [1419, 1434]],
    ['Kdy Kolumbus doplul do Ameriky?', 1492, [1498, 1453]],
    ['Kdy Karel IV. založil univerzitu?', 1348, [1356, 1378]],
    ['Kdy byla bitva u Slavkova?', 1805, [1812, 1815]],
    ['Kdy začala Velká francouzská revoluce?', 1789, [1776, 1799]],
    ['Kdy vzniklo Československo?', 1918, [1914, 1920]],
    ['Kdy začala 2. světová válka?', 1939, [1938, 1941]],
    ['Kdy začala okupace Československa?', 1968, [1948, 1969]],
    ['Kdy byla sametová revoluce?', 1989, [1991, 1993]],
  ],
};
const KUBA_ROUTE = TEACHERS.vozabal.route;   // Kuba normálně chodí po chodbách (03_postavy.js)
const KA = () => TEACHERS.kaja, LUK = () => TEACHERS.lukaskova, SO = () => TEACHERS.soumar, KU = () => TEACHERS.vozabal;

QUESTS.push({ id: 'pivo', title: 'Recept na pivo', teacher: 'kaja', hint: pivoHint });

function pivo() {
  if (!state.story.pivo) state.story.pivo = { step: null, cams: [], beer: null, fails: 0, asked: [] };
  return state.story.pivo;
}
const pivoBeer = () => PIVO.BEERS.find((b) => b.id === pivo().beer);
const soumarLured = () => !vrahOn() && ['pc', 'tisk'].includes(pivo().step);
const hasParek = () => state.bag.includes(PIVO.PAREK());

function pivoHint() {
  const p = pivo(), st = questStage(questById('pivo'));
  if (st === 'none') return 'Zajdi za: Kája (v laboratoři chemie)';
  return {
    kuba: 'Soumara musí někdo odlákat – promluv si s Kubou Vozábalem',
    kamery: `Rozbij kamery na Áčku v 1. patře (${p.cams.length}/3)`,
    parek: hasParek() ? 'Dones Kubovi párek v rohlíku' : 'Kup Kubovi párek v rohlíku (půjčí ti Emma nebo Zita)',
    lakani: 'Počkej venku před předsíní, až Kuba se Soumarem odejdou',
    pc: 'Soumar je pryč – najdi recept v jeho počítači (Kabinet Soumar)',
    poplach: 'Alarm! Soumar běží zpátky…',
    vyhozen: 'Soumar tě vyhodil – popros Kubu, ať ho odláká znovu',
    tisk: 'Vyzvedni recept z tiskárny (Předsíň kabinetů)',
    recept: `Dones recept (${pivoBeer() ? pivoBeer().name : 'pivo'}) Káje a Lukáškové`,
  }[p.step] || '';
}
function pivoInventory() {
  const p = pivo();
  return p.step === 'recept' ? [{ icon: 'recipe', name: `Recept: ${pivoBeer().name}`, note: 'Pro Káju a Lukáškovou' }] : [];
}

// Soumar u svého kabinetu, nebo (odlákaný) s Kubou u rozbité kamery; Kuba jinak chodí po chodbách.
// Po načtení hry uprostřed chůze: lákání začne znovu, po alarmu / s receptem je Soumar zpátky u kabinetu.
function applyPivo() {
  const so = SO(), ku = KU(), p = pivo();
  if (p.step === 'poplach') p.step = 'vyhozen';
  if (soumarLured()) {
    placeStatic(so, PIVO.SOUMAR_LURED.room, PIVO.SOUMAR_LURED.at);
    placeStatic(ku, PIVO.KUBA_LURED.room, PIVO.KUBA_LURED.at);
    return;
  }
  placeStatic(so, PIVO.SOUMAR_GUARD.room, PIVO.SOUMAR_GUARD.at);
  kubaWalksAgain();
  if (p.step === 'lakani' && !vrahOn()) startLure();
}
function kubaWalksAgain() {
  const ku = KU();
  if (ku.route === KUBA_ROUTE) return;
  const p0 = KUBA_ROUTE[0].path[0];
  Object.assign(ku, { route: KUBA_ROUTE, once: false, onArrive: null, arrived: false, speed: 70, pause: 2,
    seg: 0, pt: 1, dirStep: 1, wait: 0, walkPhase: 0, walkBlend: 0, pos: { x: p0[0], y: p0[1] } });
  placeMovingTeacher(ku);
}
// po přesunu postav obnovit, kdo je v aktuální místnosti (a kdo je pevný – stojící ano, jdoucí ne)
function refreshCast() {
  if (!state.room) return;
  const p = state.player, tt = state.titleTimer, area = state.areaName;
  enterRoom(state.room.id, { x: p.x, y: p.y });
  state.titleTimer = tt; state.areaName = area;
}
function pivoMoved() { applyPivo(); refreshCast(); }
function setPivoStep(step) {
  const lured = soumarLured();
  pivo().step = step;
  if (lured !== soumarLured()) pivoMoved();
}
const roomCenter = (t) => { const r = ROOMS[t.room]; return { x: t.rect.x + t.rect.w / 2 - r.x, y: t.rect.y + t.rect.h / 2 - r.y }; };
const roomPoint = (place) => { const r = ROOMS[place.room]; return { x: r.w * place.at.x, y: r.h * place.at.y }; };
// postava dojde přes dveře na místo (trasa hledáním cesty jako u Lili, 17_pribehy.js)
function walkTo(t, place, speed, onArrive, delay = 0) {
  const route = buildRoute(t.room, roomCenter(t), place.room, roomPoint(place));
  for (const seg of route) if (seg.path.length < 2) seg.path.push([...seg.path[0]]);
  Object.assign(t, { route, once: true, arrived: false, speed, pause: 0, seg: 0, pt: 1, dirStep: 1, wait: delay,
    walkPhase: 0, walkBlend: 0, pos: { x: route[0].path[0][0], y: route[0].path[0][1] } });
  t.onArrive = onArrive;
  placeMovingTeacher(t);
  refreshCast();
}

// --- LÁKÁNÍ: Kuba dojde za Soumarem do předsíně a oba odejdou ke kamerám.
// Roman musí počkat venku – když ho Soumar uvidí v předsíni, vyhodí ho a Kuba to musí zkusit znovu.
const KUBA_AT_SOUMAR = { room: 'predsinKabinetu', at: { x: 175 / 300, y: 175 / 240 } };
function startLure() {
  const p = pivo();
  p.step = 'lakani'; p.phase = 'kuba';
  walkTo(KU(), KUBA_AT_SOUMAR, 140, kubaAtSoumar);   // ať se na něj nečeká moc dlouho
}
function kubaAtSoumar() {
  const p = pivo();
  if (p.step !== 'lakani') return;
  p.phase = 'odchod';
  state.toast = { text: 'Kuba: „Pane Soumar, pojďte rychle! Někdo rozmlátil kamery na chodbě!“', t: CONFIG.TOAST_TIME + 2 };
  walkTo(SO(), PIVO.SOUMAR_LURED, 85, (t) => { placeStatic(t, PIVO.SOUMAR_LURED.room, PIVO.SOUMAR_LURED.at); refreshCast(); }, 1.2);
  walkTo(KU(), PIVO.KUBA_LURED, 85, (t) => { placeStatic(t, PIVO.KUBA_LURED.room, PIVO.KUBA_LURED.at); refreshCast(); }, 0.6);
}
function updatePivo() {
  if (vrahOn() || state.dialog || state.scene || state.choice) return;
  const p = pivo(), so = SO(), here = state.room.id;
  if (p.step === 'lakani' && p.phase === 'odchod' && so.room !== PIVO.PRINTER_ROOM && KU().room !== PIVO.PRINTER_ROOM) {
    p.step = 'pc';   // oba jsou venku (ke kameře dojdou sami)
    state.toast = { text: '🖥️ Soumar s Kubou odešli – rychle k jeho počítači!', t: CONFIG.TOAST_TIME + 2 };
  }
  // Soumar uvidí Romana v předsíni (nebo v kabinetu), dokud odtamtud neodejde
  if (p.step === 'lakani' && so.room === PIVO.PRINTER_ROOM && (here === PIVO.PRINTER_ROOM || here === PIVO.PC_ROOM)) {
    p.step = 'vyhozen'; p.phase = null;
    playScene([
      { who: SO(), text: 'Co tu okouníš, Romane? Tady nemáš co dělat. Ven!' },
      { act: () => { pivoMoved(); throwOut(); } },
      { text: 'Měl jsem počkat venku, až oba odejdou. Musím Kubu poprosit znovu.' },
    ]);
  }
}
// Roman skončí na chodbě před předsíní
function throwOut() {
  const door = ROOMS[PIVO.PRINTER_ROOM].doors.find((d) => d.to === PIVO.CAM_ROOM);
  enterRoom(door.to, door.spawn ? { x: door.spawn.x, y: door.spawn.y } : undefined);
}

// --- rozhovory ---
function pivoTalk(who) {
  if (vrahOn()) return false;
  const q = questById('pivo'), st = questStage(q), p = pivo();
  if (st === 'none') {
    playScene([
      { who: KA(), text: 'Romane! Ty jsi přesně ten, koho potřebujem. Sháníme recept na to nejlepší pivo.' },
      { who: LUK(), text: 'Čistě pro vědecké účely, samozřejmě. Kvašení je chemie.' },
      { who: KA(), text: 'Všechny recepty má Soumar u sebe v kabinetu v počítači. A hlídá si je jak oko v hlavě.' },
      { who: LUK(), text: 'Musíš ho nějak odlákat. Kuba Vozábal je dost… zvláštní. Ten by to možná zvládl.' },
      { text: 'Dobře, něco vymyslím.' },
    ], () => { setQuestStage(q, 'assigned'); p.step = 'kuba'; });
    return true;
  }
  if (st === 'carrying' && p.step === 'recept') { deliverRecipe(q); return true; }
  if (st === 'assigned') {
    playScene([{ who, text: who === KA() ? 'Tak co, máš ten recept? Soumar ho má u sebe v kabinetu v počítači.' : 'Bez receptu ten pokus nespustíme, Romane.' }]);
    return true;
  }
  if (st === 'done') {
    playScene([{ who, text: who === KA() ? `Díky za recept! ${p.beer === 'svijany' ? 'I když teda… Svijany.' : 'Už vaříme.'}` : 'Kvasí to krásně. Ale nikomu ani slovo.' }]);
    return true;
  }
  return false;
}
// odpověď podle přineseného piva: nejdřív mluví Kája s Lukáškovou, pak Roman
function deliverRecipe(q) {
  const lines = {
    kozel: [
      { who: KA(), text: 'Kozel! Romane, ty máš vkus. To je moje srdcovka.' },
      { who: LUK(), text: 'Kozel je nádherně vyvážený. Hořkost, říz… tohle uvaříme hned.' },
      { text: 'No… dá se.' },
    ],
    plzen: [
      { who: KA(), text: 'Plzeň! Originál, klasika, nejlepší!' },
      { who: LUK(), text: 'Plzeňský ležák. Tady není co řešit – to je zlatý standard.' },
      { text: 'Plzeň je prostě Plzeň. Na zdraví!' },
    ],
    svijany: [
      { who: KA(), text: 'Svijany?! Fuj. To jsi nemohl vybrat něco normálního?' },
      { who: LUK(), text: 'Tohle pít nebudu. Tos tam vybral schválně, že jo?' },
      { text: 'Co máte proti Svijanům? Nejlepší pivo v republice! Nerozumíte tomu.' },
    ],
    radegast: [
      { who: KA(), text: 'Radegast. No… je to pivo.' },
      { who: LUK(), text: 'Dá se pít. Nic extra, ale urazit neurazí.' },
      { text: 'Jo, normální pivo. Nic víc, nic míň.' },
    ],
    budvar: [
      { who: KA(), text: 'Budvar? Hm… ujde to.' },
      { who: LUK(), text: 'Na vaření dobrý. Nic proti němu nemám.' },
      { text: 'Nechápu, jak to můžete pít.' },
    ],
  }[pivo().beer];
  playScene(lines, () => { setQuestStage(q, 'done'); pivo().step = null; showQuestDoneToast(); });
}
function showQuestDoneToast() { state.toast = { text: '✅ Úkol splněn: Recept na pivo', t: CONFIG.TOAST_TIME }; }

function kubaTalk() {
  if (vrahOn() || questStage(questById('pivo')) !== 'assigned') return false;
  const p = pivo();
  if (p.step === 'kuba') {
    playScene([
      { who: KU(), text: 'Psst! Romane! Ty to necítíš? Někdo nás sleduje.' },
      { text: 'Kdo by nás sledoval?' },
      { who: KU(), text: 'Netanjahu. Na Áčku v prvním patře visí kamery. Tři. To není náhoda, brácho.' },
      { text: 'Potřebuju, abys odlákal Soumara od jeho kabinetu.' },
      { who: KU(), text: 'Platí. Ale nejdřív ty kamery rozbij. Dokud nás vidí, nikam nejdu.' },
    ], () => setPivoStep('kamery'));
  } else if (p.step === 'kamery' && p.cams.length < PIVO.CAMS.length) {
    playScene([{ who: KU(), text: `Ještě ${PIVO.CAMS.length - p.cams.length} ${PIVO.CAMS.length - p.cams.length === 1 ? 'kamera' : 'kamery'}! Na Áčku v prvním patře. Dokud nás vidí, mlčím.` }]);
  } else if (p.step === 'kamery') {
    playScene([
      { who: KU(), text: 'Všechny tři? Konečně se dá dýchat. Teď už nás nevidí…' },
      { who: KU(), text: 'Ale z toho stresu mám šílenej hlad. Kup mi párek v rohlíku a jdu na Soumara.' },
      { text: 'Já ale nemám peníze.' },
      { who: KU(), text: 'Tak si půjč od Emmy nebo od Zity. Ty mají vždycky.' },
    ], () => setPivoStep('parek'));
  } else if (p.step === 'parek' && hasParek()) {
    state.bag.splice(state.bag.indexOf(PIVO.PAREK()), 1);
    playScene([
      { who: KU(), text: 'Mňam! Párek v rohlíku, nejlepší jídlo na světě. Dobře, jdu na to.' },
      { who: KU(), text: 'Řeknu Soumarovi, že na chodbě visí rozbitý kamery a že se na to musí jít podívat. Ty mezitím pal k počítači.' },
      { who: KU(), text: 'Ty počkej venku na chodbě. Až ho odvedu, máš volno. Ale jestli tě uvidí v předsíni, je konec.' },
    ], () => { startLure(); state.toast = { text: '⏳ Kuba jde za Soumarem – počkej venku, až oba odejdou', t: CONFIG.TOAST_TIME + 2 }; });
  } else if (p.step === 'parek') {
    playScene([{ who: KU(), text: 'Párek v rohlíku, Romane. Bez párku ani krok. Peníze ti půjčí Emma nebo Zita.' }]);
  } else if (p.step === 'vyhozen') {
    playScene([
      { who: KU(), text: 'Zase tě chytil? No jo… Dobře, ještě jednou za ním jdu. Tentokrát počkej venku, až odejdeme!' },
    ], () => { startLure(); state.toast = { text: '⏳ Kuba jde za Soumarem – počkej venku, až oba odejdou', t: CONFIG.TOAST_TIME + 1 }; });
  } else if (p.step === 'lakani') {
    playScene([{ who: KU(), text: 'Jdu na to! Ty počkej venku, až Soumara odvedu.' }]);
  } else if (soumarLured()) {
    playScene([{ who: KU(), text: 'Psst, zdržuju ho! Pohni, dlouho mu tu Netanjahua vysvětlovat nevydržím.' }]);
  } else return false;
  return true;
}
function soumarTalk() {
  if (vrahOn()) return false;
  if (soumarLured()) {
    playScene([{ who: SO(), text: 'Kubo, to jsou čidla na kouř. Žádnej Netanjahu… Ale kdo je takhle rozmlátil?' }]);
    return true;
  }
  if (questStage(questById('pivo')) === 'assigned' && ['kuba', 'kamery', 'parek', 'vyhozen'].includes(pivo().step)) {
    playScene([{ who: SO(), text: 'Kam se hrneš? Do mýho kabinetu nikdo nesmí. Mám tam… písemky. Hodně důležitý písemky.' }]);
    return true;
  }
  return false;
}
// Emma a Zita půjčí na párek (jen když na něj hráč nemá)
function lendTalk(who) {
  if (vrahOn() || pivo().step !== 'parek' || hasParek() || state.money >= PIVO.PRICE()) return false;
  const price = PIVO.PRICE();
  state.money += price;
  playScene([
    { text: 'Hele, nepůjčíš mi na párek v rohlíku? Je pro Kubu.' },
    { who, text: `Pro Kubu? Ten zase něco vymýšlí… Tak jo, tady máš ${price} korun. Ale vrátíš!` },
  ], () => { state.toast = { text: `💰 ${who.name} ti půjčila ${price} Kč`, t: CONFIG.TOAST_TIME }; });
  return true;
}
TEACHERS.kaja.talk = () => pivoTalk(KA());
{
  const before = TEACHERS.lukaskova.talk;
  TEACHERS.lukaskova.talk = () => pivoTalk(LUK()) || (before ? before() : false);
}
TEACHERS.vozabal.talk = kubaTalk;
TEACHERS.soumar.talk = soumarTalk;
TEACHERS.emma.talk = () => lendTalk(TEACHERS.emma);
TEACHERS.zita.talk = () => lendTalk(TEACHERS.zita);

// Soumar nepustí nikoho do kabinetu (dokud ho Kuba neodláká)
{
  const before = doorBlocked;
  doorBlocked = (door) => {
    if (before(door)) return true;
    if (vrahOn() || door.to !== PIVO.PC_ROOM || soumarLured()) return false;
    if (!state.toast) state.toast = { text: 'Soumar: „Kam jdeš? Do mýho kabinetu nikdo nesmí!“', t: CONFIG.TOAST_TIME };
    const p = state.player, back = { top: [0, 6], bottom: [0, -6], left: [6, 0], right: [-6, 0] }[door.side];
    p.x += back[0]; p.y += back[1];
    return true;
  };
}

// --- kamery ---
function camRect(c) {
  const room = ROOMS[PIVO.CAM_ROOM];
  return { x: room.x + c.x - 14, y: room.y + c.y - 12, w: 28, h: 24 };
}
function camSpot() {
  if (vrahOn() || state.room.id !== PIVO.CAM_ROOM || pivo().step !== 'kamery') return null;
  const p = state.player, rr = CONFIG.TEACHER_TALK_RANGE;
  const near = { x: p.x - rr, y: p.y - rr, w: p.w + 2 * rr, h: p.h + 2 * rr };
  const c = PIVO.CAMS.find((cc) => !pivo().cams.includes(cc.id) && rectsOverlap(near, camRect(cc)));
  return c ? camRect(c) : null;
}
function smashCam() {
  const box = camSpot();
  const c = box && PIVO.CAMS.find((cc) => camRect(cc).x === box.x && camRect(cc).y === box.y);
  if (!c) return;
  pivo().cams.push(c.id);
  playSound([[220, 0, 0.06], [140, 0.05, 0.1], [90, 0.12, 0.12]], 'square');
  const n = pivo().cams.length;
  state.toast = { text: n < PIVO.CAMS.length ? `📷 Křach! Kamera rozbitá (${n}/3)` : '📷 Všechny kamery jsou rozbité – běž za Kubou', t: CONFIG.TOAST_TIME };
}
SPOTS.push({ rect: camSpot, act: smashCam, hintDx: 0 });

// --- Soumarův počítač a tiskárna ---
function obstacleOf(roomId, kind) {
  if (state.room.id !== roomId) return null;
  const o = state.room.obstacles.find((ob) => ob.kind === kind);
  return o ? o.rect : null;
}
const pcSpot = () => (vrahOn() ? null : obstacleOf(PIVO.PC_ROOM, 'pcdesk'));
const printerSpot = () => (vrahOn() || questStage(questById('pivo')) === 'none' ? null : obstacleOf(PIVO.PRINTER_ROOM, 'printer'));
const PC_WHO = { name: '🖥️ Soumarův počítač', color: '#37474f' };
function pcAct() {
  const p = pivo();
  if (p.step === 'tisk') { playScene([{ who: PC_WHO, text: 'Recept už se tiskne. Tiskárna je v předsíni.' }]); return; }
  if (p.step !== 'pc') { playScene([{ who: PC_WHO, text: 'Soumarův počítač. Na ploše složka „RECEPTY – NEOTVÍRAT“.' }]); return; }
  playScene([{ who: PC_WHO, text: 'Složka „RECEPTY – NEOTVÍRAT“. Uvnitř je pět receptů. Vybrat se dá jen jeden – víc by si Soumar všiml.' },
    { act: () => openChoice('🍺 Který recept vytiskneš?', PIVO.BEERS.map((b) => ({ label: `🍺 ${b.name}` })), (i) => {
      const b = PIVO.BEERS[i];
      p.beer = b.id; p.fails = 0; p.asked = [];
      const say = b.id === 'budvar' ? 'Jak tohle někomu může chutnat, nechutná močka!' : `Recept na ${b.name}. Pošlu ho do tiskárny.`;
      playScene([{ text: say }, { who: PC_WHO, text: 'Tiskárna je zabezpečená. Před tiskem odpověz na kontrolní otázku.' }, { act: askDate }]);
    }) }]);
}
// kontrolní otázka: náhodný letopočet (pokaždé jiný), odpovědi A/B/C v náhodném pořadí
function askDate() {
  const p = pivo();
  let free = PIVO.DATES.map((_, i) => i).filter((i) => !p.asked.includes(i));
  if (!free.length) { p.asked = []; free = PIVO.DATES.map((_, i) => i); }
  const k = free[Math.floor(Math.random() * free.length)];
  p.asked.push(k);
  const [question, right, wrong] = PIVO.DATES[k];
  const answers = [right, ...wrong].sort(() => Math.random() - 0.5);
  openChoice(`🖨️ ${question}`, answers.map((y, i) => ({ label: `${'ABC'[i]})  ${y}` })), (i) => {
    if (answers[i] === right) {
      setPivoStep('tisk');
      playSound([[523, 0, 0.08], [659, 0.09, 0.08], [784, 0.18, 0.14]]);
      playScene([{ who: PC_WHO, text: `Správně, ${right}! Tiskárna v předsíni se rozjela.` }]);
      return;
    }
    p.fails++;
    if (p.fails >= PIVO.FAILS) { printerAlarm(); return; }
    playSound([[180, 0, 0.15]], 'square');
    playScene([{ who: PC_WHO, text: `Špatně! Správně bylo ${right}. Pokus ${p.fails}/${PIVO.FAILS} – tiskárna chce jinou otázku.` }, { act: askDate }]);
  });
}
// 3× špatně: alarm – Soumar přiběhne od kamery (dveřmi) a vyhodí hráče; Kuba ho pak musí odlákat znovu
function printerAlarm() {
  const siren = [];
  for (let k = 0; k < 8; k++) siren.push([k % 2 ? 660 : 880, k * 0.18, 0.16]);
  playSound(siren, 'square');
  const p = pivo();
  p.step = 'poplach'; p.fails = 0; p.beer = null;
  playScene([{ who: { name: '🚨 Alarm', color: '#c62828' }, text: 'ÍÍÍ-ÚÚÚ! ÍÍÍ-ÚÚÚ! Neoprávněný pokus o tisk!' }]);
  const pcRoom = ROOMS[PIVO.PC_ROOM], pc = pcRoom.obstacles.find((o) => o.kind === 'pcdesk').rect;
  const atPc = { room: PIVO.PC_ROOM, at: { x: (pc.x + pc.w / 2 - pcRoom.x + 50) / pcRoom.w, y: (pc.y + pc.h + 40 - pcRoom.y) / pcRoom.h } };
  walkTo(SO(), atPc, 170, soumarCaught);
  kubaWalksAgain();
}
function soumarCaught(t) {
  const p = pivo(), here = state.room.id;
  p.step = 'vyhozen';
  if (here !== PIVO.PC_ROOM && here !== PIVO.PRINTER_ROOM) {   // Roman stihl utéct
    pivoMoved();
    state.toast = { text: '🚨 Soumar je zpátky u kabinetu. Popros Kubu, ať ho odláká znovu.', t: CONFIG.TOAST_TIME + 2 };
    return;
  }
  const r = ROOMS[t.room];
  placeStatic(t, t.room, { x: t.pos.x / r.w, y: t.pos.y / r.h });
  refreshCast();
  playScene([
    { who: SO(), text: 'Co tady děláš?! U mýho počítače?! Ven! A ať tě tu už nevidím!' },
    { act: () => { pivoMoved(); throwOut(); } },
    { text: 'Sakra. Bez Kuby se tam znovu nedostanu.' },
  ]);
}
function printerAct() {
  const p = pivo(), who = { name: '🖨️ Tiskárna', color: '#546e7a' };
  if (p.step !== 'tisk') { playScene([{ who, text: 'Tiskárna. Bliká na ní „Málo toneru“, ale tiskne pořád.' }]); return; }
  playSound([[392, 0, 0.05], [392, 0.08, 0.05], [523, 0.16, 0.1]]);
  pivo().step = 'recept';
  setQuestStage(questById('pivo'), 'carrying');
  walkTo(SO(), PIVO.SOUMAR_GUARD, 80, soumarBack);   // Soumar se vrací dveřmi do předsíně
  state.toast = { text: `📜 Máš recept na pivo ${pivoBeer().name} – dones ho Káje a Lukáškové`, t: CONFIG.TOAST_TIME + 2 };
}
// Soumar dojde zpátky do předsíně a řekne svou hlášku; Kuba se vrátí ke svému chození
function soumarBack(t) {
  placeStatic(t, PIVO.SOUMAR_GUARD.room, PIVO.SOUMAR_GUARD.at);
  kubaWalksAgain();
  refreshCast();
  if (state.room.id !== PIVO.PRINTER_ROOM) return;
  if (!state.dialog && !state.scene && !state.choice) playScene([{ who: t, text: t.texts.idle }]);
  else state.toast = { text: `Soumar: „${t.texts.idle}“`, t: CONFIG.TOAST_TIME + 2 };
}
SPOTS.push({ rect: pcSpot, act: pcAct, hintDx: 0 });
SPOTS.push({ rect: printerSpot, act: printerAct, hintDx: 0 });

// --- kreslení ---
function drawPivoWorld() {
  if (vrahOn()) return;
  if (state.room.id === PIVO.CAM_ROOM) {
    for (const c of PIVO.CAMS) drawCamera(c, pivo().cams.includes(c.id));
  }
  if (state.room.id === PIVO.PRINTER_ROOM && pivo().step === 'tisk') {   // z tiskárny leze recept
    const r = obstacleOf(PIVO.PRINTER_ROOM, 'printer');
    if (r) {
      const k = 6 + Math.sin(state.time * 6) * 2;
      drawRect({ x: r.x + 6, y: r.y + r.h * 0.6 + 4, w: r.w - 12, h: 8 + k }, '#fffdf3');
      ctx.fillStyle = '#c8a24a'; ctx.fillRect(r.x + 9, r.y + r.h * 0.6 + 8 + k, r.w - 18, 2);
    }
  }
}
// bezpečnostní kamera na zdi (rozbitá: nakřivo, prasklá čočka, jiskry)
function drawCamera(c, broken) {
  const room = ROOMS[PIVO.CAM_ROOM], x = room.x + c.x, y = room.y + c.y;
  const ang = { bottom: -Math.PI / 2, top: Math.PI / 2, left: 0, right: Math.PI }[c.side];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + (broken ? 0.7 : Math.sin(state.time * 0.8) * 0.35));
  ctx.fillStyle = '#9e9e9e'; ctx.fillRect(-10, -2, 8, 4);            // držák
  ctx.fillStyle = broken ? '#616161' : '#eceff1'; ctx.fillRect(-4, -6, 18, 12);
  ctx.strokeStyle = '#37474f'; ctx.lineWidth = 1; ctx.strokeRect(-4, -6, 18, 12);
  ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(14, 0, 4, 0, Math.PI * 2); ctx.fill();   // čočka
  if (broken) {
    ctx.strokeStyle = '#eeeeee'; ctx.beginPath(); ctx.moveTo(11, -3); ctx.lineTo(16, 3); ctx.moveTo(16, -3); ctx.lineTo(12, 2); ctx.stroke();
  } else if (Math.sin(state.time * 4) > 0) {
    ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.arc(0, -3, 1.6, 0, Math.PI * 2); ctx.fill();   // blikající kontrolka
  }
  ctx.restore();
  if (broken && Math.sin(state.time * 9 + c.id) > 0.85) {   // občas jiskra
    ctx.fillStyle = '#ffeb3b';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + Math.sin(state.time * 20 + i) * 8, y + Math.cos(state.time * 17 + i) * 6, 2, 2);
  }
}
// ikona receptu v inventáři: papír s řádky a půllitrem
ICONS.recipe = (cx, cy, s) => {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.08);
  ctx.fillStyle = '#fffdf3'; ctx.fillRect(-s * 0.3, -s * 0.4, s * 0.6, s * 0.8);
  ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 1.5; ctx.strokeRect(-s * 0.3, -s * 0.4, s * 0.6, s * 0.8);
  ctx.strokeStyle = '#b0a089'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.28 + i * s * 0.1); ctx.lineTo(s * 0.2, -s * 0.28 + i * s * 0.1); ctx.stroke(); }
  ctx.fillStyle = '#f9a825'; ctx.fillRect(-s * 0.12, s * 0.08, s * 0.2, s * 0.24);   // půllitr
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * 0.13, s * 0.04, s * 0.22, s * 0.07);  // pěna
  ctx.strokeStyle = '#f9a825'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s * 0.1, s * 0.2, s * 0.06, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.restore();
};
