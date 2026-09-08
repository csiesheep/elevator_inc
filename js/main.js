// main.js — 迴圈與接線。固定時間步，render 解耦。
import { CONFIG as C, ACHIEVEMENTS } from './content.js';
import { newGame, load, save, wipe, derived, doPrestige, checkAchievements,
         buyUpgrade, buyAutomation, upgradeCost, prestigeGain } from './state.js';
import { createSim, syncShafts, step, requestFloor, evacuate, fmtShort, hourOf } from './sim.js';
import { layout, draw, floorAt, view, rejectIfBlocked } from './render.js';
import { buildUI, refreshUI, toast, overlay } from './ui.js';
import { t, L, getLang, toggleLang } from './i18n.js';
import { applyChrome } from './theme.js';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const app = {
  st: load() || newGame(),
  sim: null,
  onBuy(id){
    syncShafts(app.st, app.sim);
    if (id === 'shaft') toast(t('newShaft'));
    if (id === 'fifo')  toast(t('itRuns'));
    save(app.st);
  },
  onPrestige(){
    const { st, gain } = doPrestige(app.st);
    app.st = st; app.sim = createSim(st);
    save(st);
    overlay(t('presTitle'), t('presBody', gain), t('presBtn'));
    refreshUI();
  },
  onOrbit(){
    app.st.cash -= C.ORBIT_CASH; app.st.bp -= C.ORBIT_BP; app.st.ending = true;
    save(app.st);
    overlay(t('endTitle'),
      t('endBody', app.st.floors, fmtShort(app.st.stats.served), fmtShort(app.st.lifetimeRevenue)),
      t('endBtn'));
  },
  onWipe(){
    if (!confirm(t('wipeConfirm'))) return;
    wipe(); app.st = newGame(); app.sim = createSim(app.st); refreshUI();
    toast(t('wiped'));
  },
};
app.sim = createSim(app.st);

// 開場**只有讀檔**。#155 之前這裡還會呼叫 `applyOffline()`，拿上次存檔到現在的時間差
// 乘上平均速率換成現金（半速、上限四小時），再跳一個 overlay。整段拿掉了：
// 大樓只在分頁開著的時候才會跑。驗收在 `tests/acceptance.js` 第 27 組。

// ---- 語言：靜態文字 + 切換鍵
function applyStaticText(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.getElementById('lang').textContent = getLang() === 'zh' ? 'EN' : '中';
  document.getElementById('boost').title = t('boostTitle');
  document.title = 'Elevator Inc.';
}
document.getElementById('lang').addEventListener('click', () => {
  toggleLang(); applyStaticText(); refreshUI(); refreshEvac();
});
applyStaticText();

buildUI(app);

// ---- 輸入
function pick(ev){
  const r = cv.getBoundingClientRect();
  const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
  const f = floorAt(y);
  if (f < 0 || f >= app.st.floors) return;
  // 封鎖中的樓層：requestFloor 會靜靜地丟掉這一次點擊（sim.js），玩家看不出
  // 為什麼沒反應。先讓畫面給出拒絕回饋（#33）。
  if (rejectIfBlocked(app.st, app.sim, f)) return;
  requestFloor(app.st, app.sim, f);
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); pick(e); beep(520, .05, .05); });

// 長按 / 空白鍵 = 超速（會累積熱量）
const setBoost = b => { app.sim.boost = b; document.body.classList.toggle('boost', b); };
document.getElementById('boost').addEventListener('pointerdown', e => { e.preventDefault(); setBoost(true); });
addEventListener('pointerup', () => setBoost(false));
addEventListener('pointercancel', () => setBoost(false));
addEventListener('keydown', e => {
  if (e.code === 'Space'){ e.preventDefault(); setBoost(true); }
  const kf = (e.key >= '1' && e.key <= '9') ? +e.key - 1 : e.key === '0' ? 9 : -1;
  if (kf >= 0 && kf < app.st.floors && !rejectIfBlocked(app.st, app.sim, kf))
    requestFloor(app.st, app.sim, kf);
});
addEventListener('keyup', e => { if (e.code === 'Space') setBoost(false); });

// ---- 音效
let actx = null, sound = true;
function beep(f, dur, g){
  if (!sound) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), gn = actx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    gn.gain.setValueAtTime(0, actx.currentTime);
    gn.gain.linearRampToValueAtTime(g, actx.currentTime + .01);
    gn.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
    o.connect(gn).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur + .02);
  }catch(e){}
}
const evacBtn = document.getElementById('evac');
evacBtn.addEventListener('click', () => { if (evacuate(app.st, app.sim)) beep(880, .18, .12); });
function refreshEvac(){
  const d = derived(app.st);
  if (!d.evacLevel || !app.sim.surgeFloor || app.sim.surgeFloor.until < app.st.t){
    evacBtn.classList.add('off'); return;
  }
  evacBtn.classList.remove('off');
  const cd = Math.ceil(app.sim.evacReady - app.st.t);
  evacBtn.classList.toggle('cool', cd > 0);
  evacBtn.textContent = cd > 0 ? t('evacCool', cd) : t('evacGo', app.sim.surgeFloor.f + 1);
}

document.getElementById('sound').addEventListener('click', e => {
  sound = !sound; e.currentTarget.textContent = sound ? '🔈' : '🔇';
});
let lastTrips = 0;
function dingIfArrived(){
  if (app.st.stats.trips > lastTrips){
    lastTrips = app.st.stats.trips;
    beep(1180, .22, .12); setTimeout(() => beep(880, .28, .09), 85);
  }
}

// ---- 迴圈
let last = performance.now(), acc = 0, saveT = 0, uiT = 0;
function frame(now){
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  let guard = 0;
  while (acc >= C.STEP && guard++ < 240){ step(app.st, app.sim, C.STEP); acc -= C.STEP; }

  applyChrome(hourOf(app.st));   // 介面顏色跟著遊戲時間走；沒變化時它自己會 early return
  if (layout(cv, ctx, app.st, app.sim)) draw(ctx, app.st, app.sim);
  dingIfArrived();

  uiT += dt;
  if (uiT > 0.2){ uiT = 0; refreshUI(); drawToasts(); refreshEvac(); }
  saveT += dt;
  if (saveT > C.SAVE_EVERY){ saveT = 0; save(app.st); }

  checkAchievements(app.st, a => toast('🏆 ' + L(a, 'name', 'achievements')));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

let shownToasts = new Set();
function drawToasts(){
  for (const t of app.sim.toasts){
    if (!shownToasts.has(t)){ shownToasts.add(t); toast(t.txt); }
  }
  if (shownToasts.size > 40) shownToasts = new Set(app.sim.toasts);
}

addEventListener('visibilitychange', () => { if (document.hidden) save(app.st); });
addEventListener('beforeunload', () => save(app.st));

// ---- 給驗證用的除錯鉤子（正式玩不會碰到）
window.__dbg = {
  app,
  cash: n => { app.st.cash += n; },
  bp: n => { app.st.bp += n; },
  floors: n => { app.st.floors = n; },
  fast: (secs, dtStep = 1/20) => { for (let i = 0; i < secs / dtStep; i++) step(app.st, app.sim, dtStep); },
  state: () => app.st,
  sim: () => app.sim,
  derived: () => derived(app.st),
  buyUp: id => { const ok = buyUpgrade(app.st, id); if (ok) syncShafts(app.st, app.sim); return ok; },
  buyAuto: id => { const ok = buyAutomation(app.st, id); if (ok) syncShafts(app.st, app.sim); return ok; },
  cost: id => upgradeCost(app.st, id),
  tap: f => requestFloor(app.st, app.sim, f),
  gain: () => prestigeGain(app.st),
  reset: () => { wipe(); app.st = newGame(); app.sim = createSim(app.st); },
};
