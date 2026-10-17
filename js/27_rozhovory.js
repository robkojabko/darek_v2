// Drobné rozhovory postav (jen po rozkliknutí, bez bublin)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla (před 15_hlavni.js).
'use strict';

// =====================================================================
// ZITA A EMMA před bufetem: Zita si stěžuje na práci v kavárně, Emma jí odpovídá.
// Když na jednu z nich Roman promluví, zahrají jeden rozhovor (pokaždé další).
// Půjčení na párek pro Kubu (21_pivo.js) má přednost.
// =====================================================================
const ZITA_EMMA = [
  [['zita', 'Já už fakt nemůžu. Včera jsem v kavárně stála osm hodin v kuse.'], ['emma', 'Osm hodin? To bych asi umřela.']],
  [['zita', 'Přišel chlap a chtěl ovesný flat white bez laktózy, ale s mlékem. Vysvětli mi to.'], ['emma', 'To nevysvětlí nikdo. Ani on sám.']],
  [['zita', 'Šéfová chce, abych na každý kafe malovala srdíčko. Mně to vychází jak brambora.'], ['emma', 'Tak řekni, že je to moderní umění.']],
  [['zita', 'V sobotu jsme měli frontu až ke dveřím a kávovar se rozbil. Myslela jsem, že mě sežerou.'], ['emma', 'A co jsi dělala?'], ['zita', 'Usmívala jsem se a nabízela čaj. Nikdo nechtěl čaj.']],
  [['zita', 'Dneska mi zbylo dýško dvacet korun. Za celej den.'], ['emma', 'No… aspoň na bagetu v bufetu.']],
  [['zita', 'Já už cítím kafe i ze svých vlasů. I po sprše.'], ['emma', 'Vždyť to voní hezky.'], ['zita', 'Prvních pět minut. Pak už ne.']],
];
function zitaEmmaTalk() {
  const z = TEACHERS.zita, e = TEACHERS.emma;
  if (!z.rect || !e.rect || z.room !== e.room) return false;
  state.zitaEmmaIndex = ((state.zitaEmmaIndex ?? -1) + 1) % ZITA_EMMA.length;
  playScene(ZITA_EMMA[state.zitaEmmaIndex].map(([who, text]) => ({ who: TEACHERS[who], text })));
  return true;
}
for (const id of ['zita', 'emma']) {
  const before = TEACHERS[id].talk;
  TEACHERS[id].talk = () => (before && before()) || zitaEmmaTalk();
}
