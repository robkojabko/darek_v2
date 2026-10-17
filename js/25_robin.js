// Miniquest „HTML pro Robina“ (A302, Jelínek radí za peníze)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// HTML PRO ROBINA
// Robin potřebuje napsat jednoduchou stránku v HTML (nadpis, odstavec, br, ul, ol,
// tučné písmo, kurzíva). Kód se píše do editoru přes hru (vpravo živý náhled),
// vkládání (Ctrl+V) nejde – opsat se musí ručně. Jelínek radí za peníze:
//   200 Kč – napíše to celé,  150 Kč – řekne celý kód (musí se přepsat),
//   100 Kč – řekne část, kterou si hráč vybere,  50 Kč – řekne náhodnou nehotovou část.
// Hráč to může napsat i úplně sám. Kontrola: správné značky, texty a uzavřené značky.
// Postup je ve state.story.robin: { code, hints: [] }
// =====================================================================
const ROBIN = {
  SOLUTION: [
    '<h1>Můj oblíbený den</h1>',
    '<p>Dneska je <b>pátek</b> a mám <i>radost</i>.<br>Zítra se nejde do školy.</p>',
    '<ul>',
    '  <li>pizza</li>',
    '  <li>kino</li>',
    '</ul>',
    '<ol>',
    '  <li>vstát</li>',
    '  <li>jít ven</li>',
    '</ol>',
  ].join('\n'),
  PARTS: [
    { name: 'Nadpis (h1)', code: '<h1>Můj oblíbený den</h1>' },
    { name: 'Odstavec se zalomením (p, br)', code: '<p>Dneska je pátek a mám radost.<br>Zítra se nejde do školy.</p>' },
    { name: 'Tučné písmo a kurzíva (b, i)', code: 'Dneska je <b>pátek</b> a mám <i>radost</i>.' },
    { name: 'Seznam s odrážkami (ul)', code: '<ul>\n  <li>pizza</li>\n  <li>kino</li>\n</ul>' },
    { name: 'Číslovaný seznam (ol)', code: '<ol>\n  <li>vstát</li>\n  <li>jít ven</li>\n</ol>' },
  ],
  TASK: [
    'Napiš stránku, na které bude:',
    '1. nadpis (h1): Můj oblíbený den',
    '2. odstavec (p): Dneska je pátek a mám radost. – slovo „pátek“ tučně (b), slovo „radost“ kurzívou (i)',
    '3. v odstavci zalomení řádku (br) a za ním: Zítra se nejde do školy.',
    '4. seznam s odrážkami (ul): pizza, kino',
    '5. číslovaný seznam (ol): vstát, jít ven',
  ],
};
const RO = () => TEACHERS.robin, JE = () => TEACHERS.jelinek;
QUESTS.push({ id: 'robin', title: 'HTML pro Robina', teacher: 'robin', hint: robinHint });

function robin() {
  if (!state.story.robin) state.story.robin = { code: '', hints: [] };
  return state.story.robin;
}
const robinQuest = () => questById('robin');
function robinHint() {
  const st = questStage(robinQuest());
  if (st === 'none') return 'Zajdi za: Robin (v A302)';
  if (st === 'assigned') return 'Napiš Robinovi HTML stránku (u Robina v A302)';
  return '';
}

// --- rozhovory ---
function robinTalk() {
  if (vrahOn()) return false;
  const q = robinQuest(), st = questStage(q);
  if (st === 'none') {
    playScene([
      { who: RO(), text: 'Romane, pomůžeš mi? Musím do zítřka napsat stránku v HTML a vůbec nevím, jak na to.' },
      { who: RO(), text: 'Zadání mám tady. A Jelínek prý poradí – ale jen za peníze, znáš ho.' },
      { who: JE(), text: 'Rada je služba, Romane. A služby se platí.' },
    ], () => { setQuestStage(q, 'assigned'); openEditor(); });
    return true;
  }
  if (st === 'assigned') { playScene([{ who: RO(), text: 'Tak jdeme na to? Editor máš tady.' }], openEditor); return true; }
  if (st === 'done') { playScene([{ who: RO(), text: 'Jelínek mi to uznal! Dokonce řekl „no vida“. To je u něj jako jednička.' }]); return true; }
  return false;
}
function jelinekTalk() {
  if (vrahOn() || questStage(robinQuest()) !== 'assigned') return false;
  playScene([{ who: JE(), text: 'Chceš radu? Otevři si to u Robina a řekni si, kolik ti to stojí za to.' }]);
  return true;
}
RO().talk = robinTalk;
{
  const before = JE().talk;
  JE().talk = () => jelinekTalk() || (before ? before() : false);
}

// --- kontrola kódu ---
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
function checkHtml(code) {
  const problems = [];
  // každá párová značka musí být i zavřená
  const pairs = [['h1'], ['p'], ['ul'], ['ol'], ['li'], ['b', 'strong'], ['i', 'em']];
  for (const names of pairs) {
    const open = names.reduce((n, t) => n + (code.match(new RegExp(`<${t}(\\s[^>]*)?>`, 'gi')) || []).length, 0);
    const close = names.reduce((n, t) => n + (code.match(new RegExp(`</${t}\\s*>`, 'gi')) || []).length, 0);
    if (open !== close) problems.push(`Značka <${names[0]}> není všude zavřená (</${names[0]}>).`);
  }
  const doc = new DOMParser().parseFromString(code, 'text/html');
  const one = (sel) => doc.querySelector(sel);
  const h1 = one('h1');
  if (!h1) problems.push('Chybí nadpis <h1>.');
  else if (norm(h1.textContent) !== 'Můj oblíbený den') problems.push('Nadpis má mít text „Můj oblíbený den“.');
  const p = one('p');
  if (!p) problems.push('Chybí odstavec <p>.');
  else {
    const text = norm(p.textContent.replace(/\s+/g, ' '));
    if (!p.querySelector('br')) problems.push('V odstavci chybí zalomení řádku <br>.');
    const parts = norm(Array.from(p.childNodes).map((n) => (n.nodeName === 'BR' ? '|' : n.textContent)).join(''));
    const [first, second] = parts.split('|').map(norm);
    if (norm(first) !== 'Dneska je pátek a mám radost.') problems.push('První řádek odstavce má být „Dneska je pátek a mám radost.“');
    if (norm(second) !== 'Zítra se nejde do školy.') problems.push('Za <br> má být „Zítra se nejde do školy.“');
    if (!text) problems.push('Odstavec je prázdný.');
    const bold = p.querySelector('b, strong'), it = p.querySelector('i, em');
    if (!bold || norm(bold.textContent) !== 'pátek') problems.push('Slovo „pátek“ má být tučně (<b>).');
    if (!it || norm(it.textContent) !== 'radost') problems.push('Slovo „radost“ má být kurzívou (<i>).');
  }
  const items = (sel) => Array.from(doc.querySelectorAll(`${sel} > li`)).map((li) => norm(li.textContent));
  if (!one('ul')) problems.push('Chybí seznam s odrážkami <ul>.');
  else if (items('ul').join('|') !== 'pizza|kino') problems.push('Seznam <ul> má mít položky <li> pizza a kino.');
  if (!one('ol')) problems.push('Chybí číslovaný seznam <ol>.');
  else if (items('ol').join('|') !== 'vstát|jít ven') problems.push('Seznam <ol> má mít položky <li> vstát a jít ven.');
  return problems;
}

// --- editor přes hru ---
let editorEl = null;
function openEditor() {
  if (!editorEl) buildEditor();
  const r = robin();
  editorEl.querySelector('.ed-kod').value = r.code;
  renderHints();
  updatePreview();
  editorEl.querySelector('.ed-vysledek').textContent = '';
  editorEl.style.display = 'flex';
  state.board = true;   // hra stojí (17_pribehy.js)
  input.keys.clear();
}
function closeEditor() {
  if (!editorEl) return;
  robin().code = editorEl.querySelector('.ed-kod').value;
  editorEl.style.display = 'none';
  state.board = false;
  input.keys.clear();
  if (document.activeElement) document.activeElement.blur();
  saveProgress();
}
function buildEditor() {
  editorEl = document.createElement('div');
  editorEl.id = 'editor';
  editorEl.innerHTML = `
    <div class="ed-okno">
      <div class="ed-hlava"><b>💻 Robinův úkol z informatiky</b><button class="ed-zavrit" title="Zavřít">✕</button></div>
      <div class="ed-telo">
        <div class="ed-levy">
          <div class="ed-zadani">${ROBIN.TASK.map((t) => `<div>${t.replace(/</g, '&lt;')}</div>`).join('')}</div>
          <div class="ed-jelinek">
            <div class="ed-jtitul">🧑‍🏫 Jelínek poradí (máš <span class="ed-penize"></span> Kč)</div>
            <button data-rada="200">200 Kč – napíše to celé</button>
            <button data-rada="150">150 Kč – řekne celý kód</button>
            <button data-rada="100">100 Kč – řekne vybranou část</button>
            <button data-rada="50">50 Kč – řekne náhodnou nehotovou část</button>
            <div class="ed-casti"></div>
            <div class="ed-rady"></div>
          </div>
        </div>
        <div class="ed-pravy">
          <textarea class="ed-kod" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Sem piš HTML…"></textarea>
          <div class="ed-nahled-titul">Náhled</div>
          <iframe class="ed-nahled" sandbox=""></iframe>
          <div class="ed-dole"><span class="ed-vysledek"></span><button class="ed-zkontrolovat">✅ Odevzdat Robinovi</button></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(editorEl);
  const style = document.createElement('style');
  style.textContent = `
    #editor { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,.6); z-index: 50; }
    #editor .ed-okno { width: min(960px, 97vw); max-height: 96vh; overflow: auto; background: #f4ecd8; border: 4px solid #8a5a2e; border-radius: 12px; font: 14px sans-serif; color: #2b1d14; display: flex; flex-direction: column; }
    #editor .ed-hlava { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 17px; border-bottom: 1px solid rgba(0,0,0,.15); }
    #editor .ed-telo { display: flex; gap: 10px; padding: 10px; flex-wrap: wrap; }
    #editor .ed-levy { flex: 1 1 300px; min-width: 260px; }
    #editor .ed-pravy { flex: 1.4 1 380px; min-width: 280px; display: flex; flex-direction: column; }
    #editor .ed-zadani { background: #fffaf0; border-radius: 8px; padding: 8px 10px; line-height: 1.45; margin-bottom: 8px; }
    #editor .ed-zadani div:first-child { font-weight: bold; }
    #editor .ed-jelinek { background: #e8eef4; border-radius: 8px; padding: 8px 10px; }
    #editor .ed-jtitul { font-weight: bold; margin-bottom: 6px; }
    #editor .ed-jelinek button, #editor .ed-casti button { display: block; width: 100%; margin: 3px 0; text-align: left; }
    #editor button { font: bold 13px sans-serif; padding: 6px 10px; border-radius: 7px; border: 1px solid rgba(0,0,0,.2); background: #fff; color: #2b1d14; cursor: pointer; }
    #editor .ed-zavrit { background: transparent; border: none; font-size: 18px; }
    #editor .ed-rady pre { background: #263238; color: #c3e88d; padding: 6px 8px; border-radius: 6px; white-space: pre-wrap; font: 13px Consolas, monospace; user-select: none; -webkit-user-select: none; margin: 6px 0 0; }
    #editor .ed-rady .ed-rtitul { font-size: 12px; margin-top: 6px; color: #455a64; }
    #editor .ed-kod { min-height: 190px; flex: 1; font: 14px Consolas, monospace; padding: 8px; border-radius: 8px; border: 1px solid #b0a089; background: #1e1e1e; color: #e6e6e6; resize: vertical; tab-size: 2; }
    #editor .ed-nahled-titul { font-size: 12px; color: #6d5a48; margin: 6px 0 2px; }
    #editor .ed-nahled { height: 150px; border: 1px solid #b0a089; border-radius: 8px; background: #fff; }
    #editor .ed-dole { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; }
    #editor .ed-vysledek { font-size: 13px; color: #b71c1c; white-space: pre-line; }
    #editor .ed-zkontrolovat { background: #43a047; color: #fff; border: none; font-size: 15px; padding: 8px 14px; }`;
  document.head.appendChild(style);
  const code = editorEl.querySelector('.ed-kod');
  const stop = (e) => e.stopPropagation();   // psaní nesmí ovládat hru
  code.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Tab') {   // tabulátor = dvě mezery
      e.preventDefault();
      const s = code.selectionStart;
      code.value = code.value.slice(0, s) + '  ' + code.value.slice(code.selectionEnd);
      code.selectionStart = code.selectionEnd = s + 2;
      updatePreview();
    }
    if (e.key === 'Escape') closeEditor();
  });
  code.addEventListener('keyup', stop);
  code.addEventListener('input', updatePreview);
  code.addEventListener('paste', (e) => { e.preventDefault(); showResult('Vkládat nejde – Jelínek by to poznal. Musíš to napsat.'); });
  for (const t of ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'keyup']) editorEl.addEventListener(t, stop);
  editorEl.querySelector('.ed-zavrit').addEventListener('click', closeEditor);
  editorEl.querySelector('.ed-zkontrolovat').addEventListener('click', submitCode);
  editorEl.querySelectorAll('[data-rada]').forEach((b) => b.addEventListener('click', () => buyHint(Number(b.dataset.rada))));
}
function updatePreview() {
  const code = editorEl.querySelector('.ed-kod').value;
  editorEl.querySelector('.ed-nahled').srcdoc = `<meta charset="utf-8"><style>body{font-family:sans-serif;margin:8px}</style>${code}`;
  robin().code = code;
}
function showResult(text, ok = false) {
  const el = editorEl.querySelector('.ed-vysledek');
  el.textContent = text;
  el.style.color = ok ? '#2e7d32' : '#b71c1c';
}
function renderHints() {
  editorEl.querySelector('.ed-penize').textContent = state.money;
  editorEl.querySelector('.ed-rady').innerHTML = robin().hints.map((h) =>
    `<div class="ed-rtitul">${h.title}</div><pre>${h.code.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`).join('');
}
function pay(price) {
  if (state.money < price) { showResult('Jelínek: „Na tohle nemáš, Romane. Zkus to sám.“'); return false; }
  state.money -= price;
  playSound([[660, 0, 0.05], [880, 0.06, 0.08]]);
  return true;
}
function addHint(title, code) {
  robin().hints.push({ title, code });
  renderHints();
}
function buyHint(price) {
  const casti = editorEl.querySelector('.ed-casti');
  casti.innerHTML = '';
  if (price === 100) {   // nejdřív výběr části, platí se až po výběru
    casti.innerHTML = '<div class="ed-rtitul">Kterou část chceš?</div>' + ROBIN.PARTS.map((p, i) => `<button data-cast="${i}">${p.name}</button>`).join('');
    casti.querySelectorAll('[data-cast]').forEach((b) => b.addEventListener('click', () => {
      if (!pay(100)) return;
      const part = ROBIN.PARTS[Number(b.dataset.cast)];
      casti.innerHTML = '';
      addHint(`Jelínek (100 Kč): „${part.name} se píše takhle.“`, part.code);
      showResult('');
    }));
    return;
  }
  if (!pay(price)) return;
  if (price === 200) {
    editorEl.querySelector('.ed-kod').value = ROBIN.SOLUTION;
    updatePreview();
    addHint('Jelínek (200 Kč): „Tak ukaž… hotovo. Dvě stovky, děkuju.“', ROBIN.SOLUTION);
    showResult('Jelínek to napsal za tebe. Stačí odevzdat.', true);
  } else if (price === 150) {
    addHint('Jelínek (150 Kč): „Tady je celý kód. Opiš si ho – a žádné Ctrl+C!“', ROBIN.SOLUTION);
    showResult('');
  } else {
    const part = ROBIN.PARTS[Math.floor(Math.random() * ROBIN.PARTS.length)];
    addHint(`Jelínek (50 Kč): „Za padesát jen kousek. A ne celý.“ – ${part.name}`, holey(part.code));
    showResult('');
  }
}
// nehotová část: některé značky se nahradí ___
function holey(code) {
  const tags = code.match(/<[^>]+>/g) || [];
  const n = Math.max(1, Math.round(tags.length * 0.4));
  const pick = new Set();
  while (pick.size < Math.min(n, tags.length)) pick.add(Math.floor(Math.random() * tags.length));
  let k = -1;
  return code.replace(/<[^>]+>/g, (t) => (pick.has(++k) ? '<___>' : t));
}
function submitCode() {
  const code = editorEl.querySelector('.ed-kod').value;
  const problems = checkHtml(code);
  if (problems.length) {
    playSound([[220, 0, 0.15]], 'square');
    showResult('Robin: „Jelínek by to neuznal…“\n' + problems.slice(0, 3).join('\n'));
    return;
  }
  closeEditor();
  playSound([[523, 0, 0.08], [659, 0.09, 0.08], [784, 0.18, 0.14]]);
  playScene([
    { who: RO(), text: 'Funguje to! Nadpis, seznamy, tučně, kurzíva… Romane, ty jsi borec.' },
    { who: JE(), text: 'No vida. Ani jsem nemusel nic opravovat.' },
  ], () => { setQuestStage(robinQuest(), 'done'); state.toast = { text: '✅ Úkol splněn: HTML pro Robina', t: CONFIG.TOAST_TIME }; });
}
