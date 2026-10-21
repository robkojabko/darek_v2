// Rozcestník obrazovek, herní smyčka a start (načítá se poslední)
// Část hry Dárek – načítá se v index.html v pořadí podle čísla.
'use strict';

// --- Rozcestník: co se má v daném kroku/snímku dít podle obrazovky ---
function update(dt) {
  tickSpeedrun(dt);   // časovač režimu Speedrun (28_speedrun.js)
  takeMuteTaps();
  takeMusicTaps();
  if (state.screen === 'playing') {
    takeCatalogTaps();
    takeInventoryTaps();
    takeMapTaps();
    updatePlaying(dt);
    watchProgress();
    return;
  }
  if (state.screen === 'basket') {
    state.time += dt;
    updateBasket(dt);
    return;
  }
  if (state.screen === 'chess') {
    state.time += dt;
    updateChess(dt);
    return;
  }
  if (state.screen === 'foosball') {
    state.time += dt;
    updateFoosball(dt);
    return;
  }
  state.time += dt; // animace v menu
  if (state.screen === 'end') {
    state.endTime += dt;
    updateConfetti(dt);
  }
  updateMenu();
}

function render() {
  clearCanvas();   // i okraje širokého plátna na mobilu
  if (state.screen === 'title') renderTitle();
  else if (state.screen === 'end') renderEnd();
  else if (state.screen === 'basket') renderBasket();
  else if (state.screen === 'chess') renderChess();
  else if (state.screen === 'foosball') renderFoosball();
  else renderGame();
  if (state.screen === 'playing') { drawCatalog(); drawMap(); drawSongMenu(); drawPrankHud(); drawVrahOverlays(); drawStoryOverlays(); drawCatalogButton(); drawMapButton(); drawInventoryButton(); }
  drawMuteButton();
  drawMusicButton();   // co hraje (ve hře a na úvodu)
  if (state.screen === 'playing') drawEnergyBar();   // hlad (17_pribehy.js)
  drawSpeedrunTimer(); // časovač ve hře (jen speedrun)
  drawMusicMenu();     // seznam písniček (P)
  drawModePick();      // výběr režimu při nové hře (úvod i závěr)
}

// =====================================================================
// HERNÍ SMYČKA – pevný krok logiky, vykreslení jednou za snímek
// =====================================================================
let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  let frameTime = (now - lastTime) / 1000;
  lastTime = now;
  if (frameTime > CONFIG.MAX_FRAME_TIME) frameTime = CONFIG.MAX_FRAME_TIME;

  accumulator += frameTime;
  while (accumulator >= CONFIG.FIXED_DT) {
    update(CONFIG.FIXED_DT);
    accumulator -= CONFIG.FIXED_DT;
  }

  render();
  requestAnimationFrame(frame);
}

// =====================================================================
// START
// =====================================================================
resize();
prepareRooms();
prepareCharacters();
enterRoom(CONFIG.START_ROOM);
state.savedGame = loadProgress();
state.savedVrah = loadProgress(CONFIG.SAVE_KEY_VRAH);   // Vrah z učebny C109 (18_vrah.js)
setScreen('title'); // hra začne až po kliknutí na „Hrát“
requestAnimationFrame((t) => { lastTime = t; frame(t); });
