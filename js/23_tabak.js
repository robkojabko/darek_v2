// Quest „Tabák pro Křiváčka“ (prohledat A113, dva sáčky = rychlejší chůze)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// TABÁK PRO KŘIVÁČKA
// Roman chce od Křiváčka žvýkací tabák. Křiváček ho nechal v A113 – je schovaný,
// místa k prohledání ukazuje jen bublina „Mezerník“, když u nich hráč stojí.
// Tabák je v umyvadle na katedře. Cestou se nedá použít (Roman si počká na Křiváčka).
// Křiváček pak dá dva sáčky; každý zrychlí chůzi o 45 % na 45 s (nesčítají se).
// Postup je ve state.story.tabak: { step: null | 'hledat', searched: [], bags }
// =====================================================================
const TABAK = {
  ROOM: 'a113', SPEED: 1.45, TIME: 45, BAGS: 2,
  // místa k prohledání (px od rohu A113), found = tabák
  SPOTS: [
    { id: 'umyvadlo', x: 336, y: 40, found: true },
    { id: 'katedra', x: 200, y: 40, text: 'Na katedře jsou jen křídy, třídnice a hrnek se zaschlým kafem.' },
    { id: 'skrin', x: 36, y: 53, text: 'Skříň plná zkumavek a baněk. Tabák nikde.' },
    { id: 'radiator1', x: 27, y: 120, text: 'Za radiátorem je jen prach a stará žvýkačka. Fuj.' },
    { id: 'radiator2', x: 27, y: 272, text: 'Za tímhle radiátorem taky nic. Jen pavouk.' },
    { id: 'umyvadlo1', x: 260, y: 123, text: 'V umyvadle nic. Jen kapající kohoutek.' },
    { id: 'umyvadlo2', x: 260, y: 196, text: 'Tady někdo nechal rukavici. Tabák to není.' },
    { id: 'umyvadlo3', x: 260, y: 269, text: 'Prázdné umyvadlo.' },
    { id: 'lavice1', x: 120, y: 118, text: 'Pod lavicí jsou jen papírky a ztracená tužka.' },
    { id: 'lavice2', x: 400, y: 274, text: 'Pod lavicí je nalepená žvýkačka. Tabák ne.' },
  ],
};
const KR = () => TEACHERS.krivacek;
QUESTS.push({ id: 'tabak', title: 'Tabák pro Křiváčka', teacher: 'krivacek', hint: tabakHint });

function tabak() {
  if (!state.story.tabak) state.story.tabak = { step: null, searched: [], bags: 0 };
  return state.story.tabak;
}
const tabakQuest = () => questById('tabak');
function tabakHint() {
  const st = questStage(tabakQuest());
  if (st === 'none') return 'Zajdi za: Křiváček (v kabinetu Křiváčka)';
  if (st === 'assigned') return 'Najdi Křiváčkův tabák v A113 – prohledej to tam';
  if (st === 'carrying') return 'Dones tabák Křiváčkovi';
  return '';
}

// --- Křiváček ---
function tabakTalk() {
  if (vrahOn()) return false;
  const q = tabakQuest(), st = questStage(q), t = tabak();
  if (st === 'none') {
    playScene([
      { text: 'Dobrý den, pane učiteli, já jsem dneska nějakej unavenej, tak se jdu zeptat, jestli byste mi prosím nenabil?' },
      { who: KR(), text: 'Nabil? Hm… Tabák jsem nechal ve třídě A113. Dojdi mi pro něj a pak se uvidí.' },
    ], () => { setQuestStage(q, 'assigned'); t.step = 'hledat'; });
    return true;
  }
  if (st === 'assigned') { playScene([{ who: KR(), text: 'Tabák je někde v A113. Já už si nepamatuju kde, tak to tam prohledej.' }]); return true; }
  if (st === 'carrying') {
    playScene([
      { text: 'Tady je váš tabák. Byl v umyvadle na katedře.' },
      { who: KR(), text: 'No vida, tam jsem ho schoval já? Dobře. Tady máš dva sáčky.' },
      { who: KR(), text: 'Ale víc ti nedám, na víc už nemám a nemůžu to jen tak rozdávat. Zase až po výplatě.' },
    ], () => {
      setQuestStage(q, 'done'); t.step = null; t.bags = TABAK.BAGS;
      state.toast = { text: '✅ Úkol splněn: Tabák pro Křiváčka – máš 2 sáčky (E)', t: CONFIG.TOAST_TIME + 1 };
    });
    return true;
  }
  if (st === 'done') { playScene([{ who: KR(), text: 'Další? Až po výplatě, Romane. Já nejsem trafika.' }]); return true; }
  return false;
}
{
  const before = KR().talk;
  KR().talk = () => tabakTalk() || (before ? before() : false);
}

// --- A113: prohledávání (bublina „Mezerník“ jen u míst, která ještě nebyla prohledaná) ---
function tabakSpotRect(sp) {
  const room = ROOMS[TABAK.ROOM];
  return { x: room.x + sp.x - 15, y: room.y + sp.y - 15, w: 30, h: 30 };
}
function tabakNear() {
  if (vrahOn() || state.room.id !== TABAK.ROOM || questStage(tabakQuest()) !== 'assigned') return null;
  const p = state.player, rr = CONFIG.TEACHER_TALK_RANGE;
  const near = { x: p.x - rr, y: p.y - rr, w: p.w + 2 * rr, h: p.h + 2 * rr };
  return TABAK.SPOTS.find((sp) => !tabak().searched.includes(sp.id) && rectsOverlap(near, tabakSpotRect(sp))) || null;
}
function tabakSearch() {
  const sp = tabakNear();
  if (!sp) return;
  tabak().searched.push(sp.id);
  if (sp.found) {
    setQuestStage(tabakQuest(), 'carrying');
    playSound([[523, 0, 0.06], [784, 0.08, 0.12]]);
    playScene([{ text: 'V umyvadle na katedře… je plechovka! Křiváčkův žvýkací tabák.' }],
      () => { state.toast = { text: '🟤 Máš Křiváčkův tabák – dones mu ho', t: CONFIG.TOAST_TIME + 1 }; });
  } else {
    playSound([[330, 0, 0.05]]);
    playScene([{ text: sp.text }]);
  }
}
SPOTS.push({ rect: () => { const sp = tabakNear(); return sp ? tabakSpotRect(sp) : null; }, act: tabakSearch, hintDx: 0 });

// --- inventář: tabák pro Křiváčka (nejde použít) a sáčky (zrychlí) ---
function tabakInventory() {
  if (vrahOn()) return [];
  const list = [], t = tabak();
  if (questStage(tabakQuest()) === 'carrying') {
    list.push({ icon: 'tobacco', name: 'Křiváčkův tabák', note: 'Dones ho Křiváčkovi',
      use: () => { state.inventory = null; playScene([{ text: 'Jako dal bych si, ale počkám s tím na Křiváčka.' }]); } });
  }
  if (t.bags > 0) {
    list.push({ icon: 'snus', name: 'Sáček tabáku', note: `${t.bags > 1 ? t.bags + '× · ' : ''}+45 % rychlost na 45 s`, use: useBag });
  }
  return list;
}
function useBag() {
  const t = tabak(), s = state.story;
  if (t.bags <= 0) return;
  t.bags--;
  const again = s.nabito > 0;
  s.nabito = TABAK.TIME;   // dva najednou se nesčítají – jen se obnoví čas
  playSound([[392, 0, 0.05], [587, 0.06, 0.05], [784, 0.12, 0.1]]);
  state.toast = { text: again ? '⚡ Další sáček… rychlejší už to nebude, ale vydrží to zase 45 s.' : '⚡ Nabito! Roman je o 45 % rychlejší na 45 s.', t: CONFIG.TOAST_TIME + 1 };
  if (state.inventory) state.inventory.sel = Math.min(state.inventory.sel, Math.max(0, inventoryItems().length - 1));
  saveProgress();
}
// odpočet zrychlení (volá updateHunger – jen při hraní)
function updateTabak(dt) {
  const s = state.story;
  if (!(s.nabito > 0)) return;
  s.nabito = Math.max(0, s.nabito - dt);
  if (!s.nabito) state.toast = { text: '⚡ Tabák vyprchal – Roman je zase normálně rychlý.', t: CONFIG.TOAST_TIME };
}
const tabakSpeed = () => (state.story.nabito > 0 ? TABAK.SPEED : 1);

// ikony: plechovka tabáku a sáček
ICONS.tobacco = (cx, cy, s) => {
  ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.36, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.04, s * 0.3, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd54a'; ctx.font = `bold ${Math.round(s * 0.18)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SNUS', cx, cy - s * 0.03);
};
ICONS.snus = (cx, cy, s) => {
  roundRectPath(cx - s * 0.22, cy - s * 0.14, s * 0.44, s * 0.28, 4);
  ctx.fillStyle = '#f5f0e6'; ctx.fill(); ctx.strokeStyle = '#a1887f'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#a1887f'; ctx.fillRect(cx - s * 0.14, cy - s * 0.02, s * 0.28, s * 0.04);
};
