// main.js — 迴圈與接線。固定時間步，render 解耦。
import { CONFIG as C, ACHIEVEMENTS, BANDS } from './content.js';
import { newGame, load, save, wipe, applyOffline, derived, doPrestige, checkAchievements,
         buyUpgrade, buyAutomation, upgradeCost, prestigeGain, buyLease, leaseCost,
         occOf, fillLease } from './state.js';
import { createSim, syncShafts, step, requestFloor, evacuate, fmtShort } from './sim.js';
import { layout, draw, floorAt, view } from './render.js';
import { buildUI, refreshUI, toast, overlay } from './ui.js';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const app = {
  st: load() || newGame(),
  sim: null,
  onBuy(id){
    syncShafts(app.st, app.sim);
    if (id === 'shaft') toast('新的電梯井上線了');
    if (id === 'fifo')  toast('它開始自己跑了');
    save(app.st);
  },
  onPrestige(){
    const { st, gain } = doPrestige(app.st);
    app.st = st; app.sim = createSim(st);
    save(st);
    overlay('拆掉重蓋', `這一輪換到 <b>📐 ${gain}</b> 張藍圖。<br>樓沒了，圖紙還在。`, '蓋新的');
    refreshUI();
  },
  onOrbit(){
    app.st.cash -= 5e8; app.st.bp -= 20; app.st.ending = true;
    save(app.st);
    overlay('離開大氣層',
      `電梯沒有在屋頂停下來。<br><br>` +
      `井道繼續往上，穿過雲層、穿過對流層頂，最後停在一個沒有樓層編號的地方。<br><br>` +
      `你蓋了 <b>${app.st.floors}</b> 層，送了 <b>${fmtShort(app.st.stats.served)}</b> 個人，` +
      `賺了 <b>$${fmtShort(app.st.lifetimeRevenue)}</b>。<br><br>` +
      `<span class="dim">遊戲結束了。你還是可以繼續蓋，但它已經沒有更高的地方可以去。</span>`,
      '好');
  },
  onWipe(){
    if (!confirm('確定要清空存檔？藍圖、圖鑑、成就都會不見。')) return;
    wipe(); app.st = newGame(); app.sim = createSim(app.st); refreshUI();
    toast('全部歸零');
  },
};
app.sim = createSim(app.st);

// ---- 離線收益
const off = applyOffline(app.st);
if (off){
  const m = Math.floor(off.secs / 60);
  overlay('你不在的時候', `大樓自己跑了 <b>${m >= 60 ? Math.floor(m/60) + ' 小時 ' + (m%60) + ' 分' : m + ' 分'}</b>。<br>` +
    `離線收益（50% 效率、上限 ${C.OFFLINE_CAP_H} 小時）：<b>$${fmtShort(off.earned)}</b>`, '收下');
}

buildUI(app);

// ---- 輸入
function pick(ev){
  const r = cv.getBoundingClientRect();
  const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
  const f = floorAt(y);
  if (f >= 0 && f < app.st.floors) requestFloor(app.st, app.sim, f);
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); pick(e); beep(520, .05, .05); });

// 長按 / 空白鍵 = 超速（會累積熱量）
const setBoost = b => { app.sim.boost = b; document.body.classList.toggle('boost', b); };
document.getElementById('boost').addEventListener('pointerdown', e => { e.preventDefault(); setBoost(true); });
addEventListener('pointerup', () => setBoost(false));
addEventListener('pointercancel', () => setBoost(false));
addEventListener('keydown', e => {
  if (e.code === 'Space'){ e.preventDefault(); setBoost(true); }
  if (e.key >= '1' && e.key <= '9') requestFloor(app.st, app.sim, +e.key - 1);
  if (e.key === '0') requestFloor(app.st, app.sim, 9);
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
  evacBtn.textContent = cd > 0 ? `🚨 冷卻 ${cd}s` : `🚨 疏散 ${app.sim.surgeFloor.f + 1} 樓`;
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

  if (layout(cv, ctx, app.st, app.sim)) draw(ctx, app.st, app.sim);
  dingIfArrived();

  uiT += dt;
  if (uiT > 0.2){ uiT = 0; refreshUI(); drawToasts(); refreshEvac(); }
  saveT += dt;
  if (saveT > C.SAVE_EVERY){ saveT = 0; save(app.st); }

  checkAchievements(app.st, a => toast('🏆 ' + a.name));
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
  lease: key => buyLease(app.st, key),
  leaseCost: key => leaseCost(app.st, BANDS.find(b => b.key === key)),
  fillLease: () => fillLease(app.st),
  gain: () => prestigeGain(app.st),
  reset: () => { wipe(); app.st = newGame(); app.sim = createSim(app.st); },
};
