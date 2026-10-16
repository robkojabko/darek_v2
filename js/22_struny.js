// Quest „Struny pro Málu“ (kleště od školníka, struny z kytar v C202)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// STRUNY PRO MÁLU
// Mála potřebuje nové struny na kytaru – ve škole jsou jen na kytarách v C202.
//   1. kleště půjčí školník (ve skříňkách dole), ale musí je dostat zpátky do STRUNY.LIMIT s,
//      jinak si je vezme a začíná se znovu,
//   2. jakmile hráč kleště vezme, Binková (hráči se to neříká) vyjde ze svého kabinetu
//      a hlídkuje od kabinetu až do haly před C202 – když hráče uvidí, kleště i struny sebere,
//   3. v C202 (hraje Treplev, jde tam i úkol s Klusem – čas pořád běží) ustřihnout struny,
//   4. vrátit kleště školníkovi včas a struny donést Málovi.
// Postup je ve state.story.struny.step: skolnik → klestě → mala
// =====================================================================
const STRUNY = {
  LIMIT: 90,             // s na cestu tam a zpátky (bez obcházení Binkové je to asi 30 s)
  ROOM: 'c202',
  BINK_FROM: { room: 'kabinet5', at: { x: 0.5, y: 0.4 } },          // vyjde ze svého kabinetu
  BINK_POST: { room: 'cecko2', at: { x: 80 / 420, y: 430 / 528 } },   // konec hlídky v hale u C203 (ne přímo u dveří C202, ať se dá proklouznout)
  BINK_FAST: 140,        // k C202 jde rychle, ať tam je dřív než hráč
  BINK_SLOW: 75,         // pak hlídkuje pomalu
  CATCH: 1.6,            // jak rychle roste podezření, když hráče vidí (1 = chycen, asi 0,6 s)
  VIEW: 170,             // jak daleko vidí (px) – míň než dozor na parkovišti
  HALF: 0.6,             // polovina úhlu pohledu (rad, ≈ 34°)
  GRACE: 2,              // po vstupu do místnosti chvíli nevidí (ať hráč stihne uhnout nebo se vrátit dveřmi)
  STILL: 0.35,           // hráč, který stojí na místě, je nápadný míň (podezření roste 0,35× pomaleji)
};
const BI = () => TEACHERS.binkova, MA = () => TEACHERS.mala, SK = () => TEACHERS.skolnik;

QUESTS.push({ id: 'struny', title: 'Struny pro Málu', teacher: 'mala', hint: strunyHint });

function struny() {
  if (!state.story.struny) state.story.struny = { step: null, t: 0, cut: false, sus: 0 };
  return state.story.struny;
}
const strunyQuest = () => questById('struny');
const hasPliers = () => !vrahOn() && struny().step === 'klestě';
// kytary v C202 jsou bez strun, když je hráč ustřihl (nebo už je má Mála); Málova má struny až po úkolu
function guitarCut(o) {
  if (!state.story || vrahOn()) return false;
  const done = questStage(strunyQuest()) === 'done';
  return o.mala ? !done : struny().cut || done;
}
const fmtTime = (t) => { const sec = Math.max(0, Math.ceil(t)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };

function strunyHint() {
  const s = struny(), st = questStage(strunyQuest());
  if (st === 'none') return 'Zajdi za: Mála (v kabinetě)';
  if (s.step === 'skolnik') return 'Půjč si kleště od školníka (ve skříňkách dole)';
  if (s.step === 'klestě') return s.cut ? `Rychle vrať kleště školníkovi (${fmtTime(s.t)})` : `Ustřihni struny z kytary v C202 (${fmtTime(s.t)})`;
  if (s.step === 'mala') return 'Dones struny Málovi';
  return '';
}
function strunyInventory() {
  const s = struny(), list = [];
  if (hasPliers()) list.push({ icon: 'pliers', name: 'Kleště od školníka', note: `Vrátit do ${fmtTime(s.t)}` });
  if (!vrahOn() && (s.cut && s.step === 'klestě' || s.step === 'mala')) list.push({ icon: 'strings', name: 'Struny z C202', note: 'Pro Málu' });
  return list;
}
// po načtení hry: rozdělané kleště jsou zpátky u školníka (Binkovou vrátí domů applyVrah)
function applyStruny() {
  const s = struny();
  if (s.step === 'klestě') Object.assign(s, { step: 'skolnik', cut: false, t: 0 });
  s.sus = 0;
}

// --- rozhovory ---
function strunyMala() {
  if (vrahOn()) return false;
  const q = strunyQuest(), st = questStage(q), s = struny();
  if (st === 'none') {
    playScene([
      { who: MA(), text: 'Romane, potřebuju nové struny na kytaru. Ty staré už jsou na nic.' },
      { who: MA(), text: 'Ve škole se dají sehnat jen v C202 – na tamních kytarách. Ale bez kleští je neustřihneš. Ty má školník.' },
      { text: 'Dobře, zkusím to.' },
    ], () => { setQuestStage(q, 'assigned'); s.step = 'skolnik'; });
    return true;
  }
  if (st === 'assigned' && s.step === 'mala') {
    playScene([
      { who: MA(), text: 'Nový struny! Romane, ty jsi poklad.' },
      { who: MA(), text: 'Já jí ty struny z C202 kradu už rok a pořád mě nechytla. Hehe.' },
    ], () => { setQuestStage(q, 'done'); s.step = null; state.toast = { text: '🎸 Úkol splněn: Struny pro Málu', t: CONFIG.TOAST_TIME }; });
    return true;
  }
  // jinak se ho dá zeptat na peníze (nebo jen pozdravit)
  openChoice('Co chceš po Málovi?', [{ label: '💰 Nepůjčil byste mi nějaký peníze?' }, { label: st === 'assigned' ? '🎸 Jen jdu kvůli strunám' : 'Nic, jen jsem se zastavil' }], (i) => {
    if (i === 0) { malaLends(); return; }
    const text = st !== 'assigned' ? MA().texts.idle : s.step === 'klestě' ? 'Máš je? Jestli ještě ne, tak hoď sebou!' : 'Kleště má školník. Bez nich ty struny neustřihneš.';
    playScene([{ who: MA(), text }]);
  });
  return true;
}

// --- MÁLA PŮJČUJE PENÍZE: čím víckrát se hráč zeptá, tím míň dá a tím je (vtipně) naštvanější ---
const MALA_LOANS = [
  [100, 'Peníze? No… dobře. Tady máš stovku. Ale ať to neutratíš za blbosti.'],
  [60, 'Zase? Vždyť jsem ti zrovna dával. No tak tady máš šedesát.'],
  [40, 'Romane, já nejsem bankomat. Čtyřicet a dost.'],
  [25, 'Víš, že si to píšu? Do sešitu. Mám tam už celou stránku nadepsanou „Roman“. Pětadvacet.'],
  [15, 'Já mám učitelskej plat, ne ropnej vrt. Patnáct.'],
  [10, 'Až umřu, napíšou mi na hrob: „Půjčoval Romanovi.“ Deset korun.'],
  [5, 'Tady máš pětikorunu. A já si jdu prodat kytaru… teda až na ni budu mít struny.'],
  [2, 'Dvě koruny. Víc nemám. Fakt. Klidně mi prohledej kapsy.'],
  [1, 'Poslední koruna. Zbyl mi už jen knoflík a ten si nechám.'],
];
const MALA_BROKE = [
  'Ne. Ani korunu. Jdi za Chánem, ten aspoň nosí peněženku.',
  'Romane, jestli se ještě jednou zeptáš, dám ti za úkol opsat celou učebnici. Ručně. Dvakrát.',
  'Vidíš ten zámek na šuplíku? Ten je tam kvůli tobě.',
  'Nemám. Už jsem si kvůli tobě začal nosit svačinu z domu.',
  'Kdybych měl korunu pokaždé, když se mě zeptáš na peníze… tak bych ti je zase půjčil. Takže ne.',
];
function malaLends() {
  const s = state.story, n = s.malaAsk || 0;
  s.malaAsk = n + 1;
  if (n < MALA_LOANS.length) {
    const [amount, text] = MALA_LOANS[n];
    state.money += amount;
    playScene([{ text: 'Nepůjčil byste mi nějaký peníze?' }, { who: MA(), text }],
      () => { state.toast = { text: `💰 Mála ti půjčil ${amount} Kč`, t: CONFIG.TOAST_TIME }; });
  } else {
    playScene([{ text: 'Nepůjčil byste mi nějaký peníze?' }, { who: MA(), text: MALA_BROKE[(n - MALA_LOANS.length) % MALA_BROKE.length] }]);
  }
}
function strunySkolnik() {
  if (vrahOn() || questStage(strunyQuest()) !== 'assigned') return false;
  const s = struny();
  if (s.step === 'skolnik') {
    const n = s.borrows || 0, lim = fmtTime(STRUNY.LIMIT);
    const steps = [{ text: SKOLNIK_ASK[Math.min(n, SKOLNIK_ASK.length - 1)] }];
    if (s.lost === 'binkova') steps.push({ who: SK(), text: SKOLNIK_AFTER_BINKOVA[n % SKOLNIK_AFTER_BINKOVA.length] });
    if (s.lost === 'cas') steps.push({ who: SK(), text: SKOLNIK_AFTER_TIME[n % SKOLNIK_AFTER_TIME.length] });
    const give = n < SKOLNIK_GIVE.length ? SKOLNIK_GIVE[n] : SKOLNIK_GIVE_MORE[(n - SKOLNIK_GIVE.length) % SKOLNIK_GIVE_MORE.length];
    steps.push({ who: SK(), text: give.replace('{cas}', lim) });
    playScene(steps, () => { s.borrows = n + 1; s.lost = null; takePliers(); });
    return true;
  }
  if (s.step === 'klestě' && s.cut) {
    playScene([{ who: SK(), text: 'Akorát včas. Díky, mladej.' }], () => {
      s.step = 'mala'; s.t = 0;
      binkovaHome();
      state.toast = { text: '🔧 Kleště vrácené – teď struny Málovi', t: CONFIG.TOAST_TIME + 1 };
    });
    return true;
  }
  if (s.step === 'klestě') {
    playScene([{ who: SK(), text: `Už je vracíš? Vždyť jsi s nima nic neudělal. Hoď sebou, máš ještě ${fmtTime(s.t)}.` }]);
    return true;
  }
  return false;
}
// Školník: čím víckrát si hráč kleště půjčuje, tím jiné (a otrávenější) hlášky
const SKOLNIK_ASK = [
  'Dobrý den, nepůjčil byste mi kleště?',
  'Dobrý den… zase já. Ty kleště, prosím.',
  'Pane školník, ještě jednou ty kleště? Naposledy, slibuju.',
  'Kleště?',
];
const SKOLNIK_AFTER_BINKOVA = [
  'Paní Binková mi je přinesla. Prej s nima chodíš po škole jak lupič.',
  'Zase mi je nesla Binková. Ta se už na mě dívá, jako bych tě na to najal.',
  'Binková tvrdí, že jsem tvůj komplic. Děkuju pěkně.',
];
const SKOLNIK_AFTER_TIME = [
  'Musel jsem si pro ně dojít sám. Přes celou školu. S mým kolenem.',
  'Zase jsem tě musel honit. Já jsem školník, ne sprinter.',
  'Víš, kolik schodů má tahle škola? Já to vím. Kvůli tobě.',
];
const SKOLNIK_GIVE = [
  'Kleště? Jasně, tady máš. Ale do {cas} mi je vrátíš, jo? Potřebuju je na kotel.',
  'No jo, tak na. Ale tentokrát do {cas}. Kotel nepočká.',
  'Ty je snad sbíráš. Na. {cas}, ani o vteřinu víc.',
  'Já už ti na ně napíšu jméno. Do {cas} zpátky, nebo si koupíš vlastní.',
];
const SKOLNIK_GIVE_MORE = [
  'Kleště, kleště, pořád kleště. Já kvůli tobě nemám čím opravit kotel. Na, {cas}!',
  'Víš co? Já si stopky pustím taky. {cas}. Teď!',
  'Kdybych za každý půjčení dostal korunu, mám na nový kleště. Na, mazej – {cas}.',
  'Tady. A až budu jednou v důchodu, budu vyprávět vnoučatům o klukovi s kleštěma. {cas}.',
];
function takePliers() {
  const s = struny();
  Object.assign(s, { step: 'klestě', t: STRUNY.LIMIT, cut: false, sus: 0 });
  state.toast = { text: `🔧 Máš kleště – vrať je školníkovi do ${fmtTime(STRUNY.LIMIT)}`, t: CONFIG.TOAST_TIME + 1 };
  binkovaPatrol();
}
{
  const before = MA().talk;
  MA().talk = () => strunyMala() || (before ? before() : false);
}
{
  const before = SK().talk;
  SK().talk = () => strunySkolnik() || (before ? before() : false);
}

// --- Binková: vyjde z kabinetu a hlídkuje až k C202 (tam a zpátky) ---
function binkovaPatrol() {
  const b = BI();
  placeStatic(b, STRUNY.BINK_FROM.room, STRUNY.BINK_FROM.at);
  const route = buildRoute(b.room, roomCenter(b), STRUNY.BINK_POST.room, roomPoint(STRUNY.BINK_POST));
  for (const seg of route) if (seg.path.length < 2) seg.path.push([...seg.path[0]]);
  Object.assign(b, { route, once: false, onArrive: null, arrived: false, speed: STRUNY.BINK_FAST, pause: 1.5,
    seg: 0, pt: 1, dirStep: 1, wait: 0, walkPhase: 0, walkBlend: 0, face: null, _last: null,
    pos: { x: route[0].path[0][0], y: route[0].path[0][1] } });
  placeMovingTeacher(b);
  refreshCast();
}
function binkovaHome() {
  const b = BI(), home = CAST_HOME.binkova;
  if (!b.route) return;
  const goHome = (t) => { placeStatic(t, home.room, home.at); refreshCast(); };
  if (b.room === state.room.id) walkTo(b, { room: home.room, at: home.at }, 90, goHome);   // hráč ji vidí – odejde
  else goHome(b);
}

// --- každý snímek: čas běží pořád (i v dialogu, v C202 s Klusem…), Binková se dívá ---
function updateStruny(dt) {
  if (vrahOn()) return;
  const s = struny();
  if (s.step !== 'klestě') return;
  s.t -= dt;
  if (s.t <= 0) {
    Object.assign(s, { step: 'skolnik', cut: false, t: 0, sus: 0, lost: 'cas' });
    binkovaHome();
    playSound([[300, 0, 0.12], [220, 0.14, 0.3]]);
    state.toast = { text: '⏱ Čas vypršel! Školník si pro kleště došel sám a struny sebral. Začni znovu u školníka.', t: CONFIG.TOAST_TIME + 3 };
    return;
  }
  const b = BI();
  if (b.route && b.seg === b.route.length - 1 && b.speed > STRUNY.BINK_SLOW) b.speed = STRUNY.BINK_SLOW;   // došla k C202
  if (!b.route || b.room !== state.room.id || !b.rect || state.dialog || state.scene || state.choice) return;
  updateWatcherFacing(b);
  if (s.room !== state.room.id) { s.room = state.room.id; s.grace = STRUNY.GRACE; }
  s.grace = Math.max(0, (s.grace || 0) - dt);
  if (s.grace > 0) return;
  const p = state.player;
  const seen = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.8]].some(([fx, fy]) => binkovaSees(b, p.x + p.w * fx, p.y + p.h * fy));
  const moving = s._px !== undefined && Math.hypot(p.x - s._px, p.y - s._py) > 0.3;
  s._px = p.x; s._py = p.y;
  s.sus = seen ? Math.min(1, s.sus + STRUNY.CATCH * (moving ? 1 : STRUNY.STILL) * dt) : Math.max(0, s.sus - dt);
  if (s.sus < 1) return;
  // chycen: Binková sebere kleště (a struny) – začíná se znovu u školníka
  const had = s.cut;
  Object.assign(s, { step: 'skolnik', cut: false, t: 0, sus: 0, lost: 'binkova' });
  playSound([[300, 0, 0.1], [200, 0.12, 0.3]]);
  playScene([
    { who: b, text: had ? 'Romane! Co to neseš? Kleště a… struny z C202?! Tak to si beru. Kleště vrátím školníkovi sama.' : 'Romane! Kam jdeš s těma kleštěma? Dej sem. Vrátím je školníkovi sama.' },
    { text: 'Sakra. Musím zase za školníkem – a dávat si na ni pozor.' },
  ], () => binkovaHome());
}

// Vidí Binková bod (x, y)? Kratší a užší kužel než dozor, zakrývá ho nábytek.
function binkovaSees(b, x, y) {
  const r = b.rect, ex = r.x + r.w / 2, ey = r.y + r.h / 2;
  const dx = x - ex, dy = y - ey, d = Math.hypot(dx, dy);
  if (d > STRUNY.VIEW) return false;
  if (d > 1 && (dx * b.face.x + dy * b.face.y) / d < Math.cos(STRUNY.HALF)) return false;
  const blockers = state.room.obstacles.map((o) => o.rect);
  for (let k = 8; k < d; k += 8) {
    const px = ex + dx * k / d, py = ey + dy * k / d;
    if (blockers.some((o) => px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h)) return false;
  }
  return true;
}

// --- C202: ustřihnout struny z kytary ---
function guitarSpot() {
  if (!hasPliers() || struny().cut || state.room.id !== STRUNY.ROOM) return null;
  const p = state.player, rr = CONFIG.TEACHER_TALK_RANGE;
  const near = { x: p.x - rr, y: p.y - rr, w: p.w + 2 * rr, h: p.h + 2 * rr };
  const g = state.room.obstacles.find((o) => o.kind === 'guitar' && rectsOverlap(near, o.rect));
  return g ? g.rect : null;
}
function cutStrings() {
  struny().cut = true;
  playSound([[1400, 0, 0.03], [900, 0.05, 0.03], [1500, 0.1, 0.03]]);
  state.toast = { text: '✂️ Cvak! Struny ustřižené – rychle vrať kleště školníkovi', t: CONFIG.TOAST_TIME + 1 };
}
SPOTS.push({ rect: guitarSpot, act: cutStrings, hintDx: 0 });

// --- kreslení ---
// zorné pole hlídkující Binkové (jako u dozoru na parkovišti)
function drawStrunyWorld() {
  const b = BI();
  if (!hasPliers() || !b.route || b.room !== state.room.id || !b.face || !b.rect) return;
  const r = b.rect, ex = r.x + r.w / 2, ey = r.y + r.h / 2, a = Math.atan2(b.face.y, b.face.x);
  const g = ctx.createRadialGradient(ex, ey, 10, ex, ey, STRUNY.VIEW);
  g.addColorStop(0, `rgba(255, ${Math.round(220 - 160 * struny().sus)}, 90, 0.38)`);
  g.addColorStop(1, 'rgba(255, 220, 90, 0.04)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(ex, ey);
  ctx.arc(ex, ey, STRUNY.VIEW, a - STRUNY.HALF, a + STRUNY.HALF);
  ctx.closePath(); ctx.fill();
}
// odpočet pod úkolem v liště
function drawStrunyHud() {
  const s = struny();
  if (!hasPliers() || state.screen !== 'playing') return;
  const urgent = s.t < 20 && Math.sin(state.time * 8) > 0;
  drawOutlinedText(`⏱ Kleště vrátit školníkovi: ${fmtTime(s.t)}`, 400, CONFIG.TASK_Y + 22, 'bold 15px sans-serif', urgent ? '#ff5252' : '#ffd54a', 'middle');
}
// ikony: kleště a stočené struny
ICONS.pliers = (cx, cy, s) => {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.6);
  ctx.fillStyle = '#d32f2f';
  roundRectPath(-s * 0.1, s * 0.02, s * 0.09, s * 0.38, 3); ctx.fill();
  roundRectPath(s * 0.02, s * 0.02, s * 0.09, s * 0.38, 3); ctx.fill();
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath(); ctx.moveTo(-s * 0.08, s * 0.04); ctx.lineTo(-s * 0.02, -s * 0.4); ctx.lineTo(s * 0.02, -s * 0.4); ctx.lineTo(s * 0.09, s * 0.04); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#455a64'; ctx.beginPath(); ctx.arc(0, -s * 0.02, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
ICONS.strings = (cx, cy, s) => {
  ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, s * (0.16 + i * 0.08), 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0.3, Math.PI * 1.7); ctx.stroke();
};
