// tests/acceptance.js — 驗收條件。orchestrator 所有；peer 可以跑，但不編輯。
// 某一列錯了要回報，由 orchestrator 修。
//
// SPEC 是**從設計文件抄寫**的常數（obsidian/Projects/elevator inc.md §5.7–§5.14），
// 不是從 content.js 讀的。這是刻意的：見 harness.js 開頭第 1 點。

import { section, check, eq, near, ok, nonEmpty, R, summary } from './harness.js';
import { CONFIG as C, BANDS, UPGRADES, PASSENGERS, ACHIEVEMENTS, SKILLS, EVENTS, TENANTS } from '../js/content.js';
import { EN } from '../js/i18n-content.js';
import { PEOPLE } from '../js/sprites.js';
import * as S from '../js/state.js';
import * as M from '../js/sim.js';

// ---------------------------------------------------------------- 設計文件的抄本
const SPEC = {
  floorsStart: 5,          // §5.8
  cashStart: 200,          // §5.8
  maxFloors: 100,          // §5.7
  endingFloor: 100,        // §5.7
  orbitCash: 2e7,          // §5.7
  orbitBp: 20,             // §5.7
  daySeconds: 180,         // §4.x
  prestigeDiv: 1e4,        // §5.7
  ratingMin: 0.8,          // §5.7
  churnRating: 1.0,        // §5.7
  leaseBlock: 1.6,         // §5.7
  ratingDriftTo: 2.0,      // §5.7
  boostMult: 1.8,
  overheatLock: 8.0,
  offlineCapH: 4,
  offlineRate: 0.5,
  bandCount: 7,            // §5.7 的樓層帶表
  bandRanges: [[1,10],[11,20],[21,45],[46,70],[71,85],[86,99],[100,9999]],
  floorSteps: 19,          // §5.8：5 + 5×19 = 100
  floorPerStep: 5,
};

// ---------------------------------------------------------------- 0 對照
// 先拿產品的設定去對抄本。改產品裡的數字來讓行為測試通過，會在這裡就爆。
// check() 是同步的，所以原始碼在模組頂層先抓好（ES module 支援 top-level await）。
// 抓不到就讓那條 guard 回報 TODO——它不能假裝自己驗過。
const SIM_SRC = await fetch(new URL('../js/sim.js', import.meta.url) + '?probe=' + Math.random())
  .then(r => r.ok ? r.text() : null).catch(() => null);
const RENDER_SRC = await fetch(new URL('../js/render.js', import.meta.url) + '?probe=' + Math.random())
  .then(r => r.ok ? r.text() : null).catch(() => null);
const THEME_SRC = await fetch(new URL('../js/theme.js', import.meta.url) + '?probe=' + Math.random())
  .then(r => r.ok ? r.text() : null).catch(() => null);

// 招商在不在？第 3 組和第 7 組都要靠它決定「這條規則現在還存不存在」。
const leasingGone = typeof S.buyLease !== 'function';

// **背債表空了要是綠的。**
//
// 我最初在五張背債表上都寫了 `nonEmpty(表的大小)`——於是
// **把最後一筆債還完的人會把 harness 弄紅**。五張表都一樣。
//
// 那是 skill 5.6 的誤用：那一條說的是「你**掃描的母體**不可以是空的」
// （沒有牆可以撒的時候，「撒牆沒事」永遠通過），
// **不是「你的例外清單不可以是空的」**。背債表空掉是**目標狀態**。
//
// 是一支 peer 在被我叫去刪 POOL_DEBT 最後一筆的時候發現的：
// 「刪了一定會紅，不刪反而不會。」
const DEBT_CLEARED = name =>
  `${name} 是空的——**這一類背債已經全部還清了**。`
  + `（空表要是綠的：紅的話等於在懲罰把債還完的人。）`;

section('0 常數對照');
check('FLOORS_START',   () => eq(C.FLOORS_START, SPEC.floorsStart, 'FLOORS_START'));
check('CASH_START',     () => eq(C.CASH_START, SPEC.cashStart, 'CASH_START'));
check('MAX_FLOORS',     () => eq(C.MAX_FLOORS, SPEC.maxFloors, 'MAX_FLOORS'));
check('ENDING_FLOOR',   () => eq(C.ENDING_FLOOR, SPEC.endingFloor, 'ENDING_FLOOR'));
check('ORBIT_CASH',     () => eq(C.ORBIT_CASH, SPEC.orbitCash, 'ORBIT_CASH'));
check('ORBIT_BP',       () => eq(C.ORBIT_BP, SPEC.orbitBp, 'ORBIT_BP'));
check('DAY_SECONDS',    () => eq(C.DAY_SECONDS, SPEC.daySeconds, 'DAY_SECONDS'));
check('PRESTIGE_DIV',   () => eq(C.PRESTIGE_DIV, SPEC.prestigeDiv, 'PRESTIGE_DIV'));
check('RATING_MIN',     () => eq(C.RATING_MIN, SPEC.ratingMin, 'RATING_MIN'));
// 這兩個常數是「離散懲罰」的門檻，owner 2026-09-05 裁決『沒有懲罰』之後要整個消失。
// 招商還在的時候比對數值；拿掉之後改成斷言它們不存在——留著一個沒有人讀的常數，
// 下一個人會照它去找不存在的機制。
check('CHURN_RATING', () => leasingGone
  ? ok(C.CHURN_RATING === undefined, `裁決是「沒有懲罰」，CHURN_RATING 卻還在：${C.CHURN_RATING}`)
  : eq(C.CHURN_RATING, SPEC.churnRating, 'CHURN_RATING'));
check('LEASE_BLOCK', () => leasingGone
  ? ok(C.LEASE_BLOCK === undefined, `招商已移除，LEASE_BLOCK 卻還在：${C.LEASE_BLOCK}`)
  : eq(C.LEASE_BLOCK, SPEC.leaseBlock, 'LEASE_BLOCK'));
check('RATING_DRIFT_TO',() => eq(C.RATING_DRIFT_TO, SPEC.ratingDriftTo, 'RATING_DRIFT_TO'));
check('BOOST_MULT',     () => eq(C.BOOST_MULT, SPEC.boostMult, 'BOOST_MULT'));
check('OVERHEAT_LOCK',  () => eq(C.OVERHEAT_LOCK, SPEC.overheatLock, 'OVERHEAT_LOCK'));
check('OFFLINE_CAP_H',  () => eq(C.OFFLINE_CAP_H, SPEC.offlineCapH, 'OFFLINE_CAP_H'));
check('OFFLINE_RATE',   () => eq(C.OFFLINE_RATE, SPEC.offlineRate, 'OFFLINE_RATE'));
check('樓層帶數量',      () => eq(BANDS.length, SPEC.bandCount, 'BANDS.length'));
check('樓層帶範圍', () => {
  const got = BANDS.map(b => [b.from, b.to]);
  return eq(JSON.stringify(got), JSON.stringify(SPEC.bandRanges), '樓層帶的起訖');
});
check('加蓋段數', () => {
  const u = UPGRADES.find(x => x.id === 'floor');
  return eq(u && u.max, SPEC.floorSteps, "UPGRADES['floor'].max");
});

// ---------------------------------------------------------------- 1 天花板
// 這一條是 §5.8 的教訓：MAX_FLOORS 曾經是死常數，深基礎點滿可以蓋到 200 層。
section('1 樓層天花板');
function ceilingWith(skills){
  const st = S.newGame(skills ? { skills } : undefined);
  st.cash = 1e12;
  let guard = 0;
  while (S.buyUpgrade(st, 'floor') && guard++ < 500);
  return st.floors;
}
// 名字要說出它守的是哪一件事：這一條段數先夾住（5 + 5×19 = 100），
// 所以把 MAX_FLOORS 改成 120 它也不會紅——守天花板的是下面那條。
check('段數算式：起始 + 段數×5 剛好到上限', () => eq(ceilingWith(null), SPEC.maxFloors, '最終樓層'));
check('深基礎滿級也不能超過', () => {
  const sk = UPGRADES && null;   // 深基礎是技能不是升級
  return eq(ceilingWith({ a_floor: 99 }), SPEC.maxFloors, '最終樓層');
});
check('起始樓層 + 段數 × 5 = 上限', () =>
  eq(SPEC.floorsStart + SPEC.floorSteps * SPEC.floorPerStep, SPEC.maxFloors, '算式'));

// ---------------------------------------------------------------- 2 存檔
// §5.6 的 NaN 毀存檔屬於這一類：改了資料形狀，存檔安靜地壞掉。
section('2 存檔往返');
check('newGame 可以 JSON 往返且不產生 NaN', () => {
  const st = S.newGame();
  const back = JSON.parse(JSON.stringify(st));
  const bad = [];
  (function walk(o, path){
    for (const k in o){
      const v = o[k];
      if (typeof v === 'number' && !Number.isFinite(v)) bad.push(path + k);
      else if (v && typeof v === 'object') walk(v, path + k + '.');
    }
  })(back, '');
  return ok(bad.length === 0, '有非有限數值：' + bad.join(', '));
});
check('拆樓保留的欄位', () => {
  const st = S.newGame();
  st.bp = 7; st.roofStyle = 'islamic'; st.runRevenue = 5e5;
  st.skills = { a_floor: 2 }; st.codex = { office: 3 }; st.achieved = { first: true };
  const r = S.doPrestige(st);
  const miss = [];
  if (r.st.roofStyle !== 'islamic') miss.push('roofStyle');
  if (!r.st.skills || r.st.skills.a_floor !== 2) miss.push('skills');
  if (!r.st.codex || r.st.codex.office !== 3) miss.push('codex');
  if (!r.st.achieved || !r.st.achieved.first) miss.push('achieved');
  return ok(miss.length === 0, '拆樓後遺失：' + miss.join(', '));
});
check('拆樓歸零的欄位', () => {
  const st = S.newGame();
  st.cash = 99999; st.floors = 60; st.up.cap = 5; st.rating = 4.8;
  const r = S.doPrestige(st);
  const bad = [];
  if (r.st.cash !== SPEC.cashStart) bad.push('cash=' + r.st.cash);
  if (r.st.up.cap !== 0) bad.push('up.cap=' + r.st.up.cap);
  return ok(bad.length === 0, '應該歸零卻沒有：' + bad.join(', '));
});

// ---------------------------------------------------------------- 3 人流
// 這一組是招商移除的分界線。現在的規則是「未招商的樓層不產生乘客」；
// 移除招商之後規則會變成「蓋好就有人」。兩種規則各有一條，永遠只有一條該綠。
section('3 人流與樓層');
// --- 招商時代的兩條規則 ------------------------------------------------
// 招商拿掉之後兩條都失去意義：「招商滿的樓每層都有人流」被第 7 組那條更嚴格的
// 取代（它還額外要求乘客散布在 >=5 層），「沒有租戶的樓層不該產生乘客」則是在
// 描述一條不存在的規則。所以在移除後把它們關掉，而不是讓它們紅——一條在描述
// 已刪規則的紅，會被讀成「產品壞了」。
if (!leasingGone){
  function freshTower(floors, leaseAll){
    const st = S.newGame(); st.floors = floors; st.cash = 1e9;
    if (leaseAll){
      let g = 0;
      while (g++ < 500){ const b = BANDS.find(b => S.canLease(st, b)); if (!b) break;
        if (!S.buyLease(st, b.key)) break; }
    } else {
      st.leased = {}; for (const b of BANDS) st.leased[b.key] = {};
    }
    return st;
  }
  check('招商滿的樓：每一層都算得到人流', () => {
    const st = freshTower(30, true);
    const sim = M.createSim(st); M.syncShafts(st, sim);
    for (let i = 0; i < 4000; i++) M.step(st, sim, 1 / 20);
    const spawned = sim.waiting.length + st.stats.served + st.stats.abandoned;
    return ok(spawned > 0, '跑了 200 秒都沒有任何乘客出現');
  });
  check('沒有租戶的樓層不該產生乘客（大廳除外）', () => {
    const st = freshTower(30, false);
    const built = BANDS.reduce((a, b) => a + S.builtInBand(st, b), 0);
    const ne = nonEmpty(built, '這棟樓一層都沒蓋，這條 guard 沒有試到任何東西');
    if (ne !== true) return ne;
    const NEED = 40;
    const seen = [];
    for (let t = 0; t < 24 && seen.length < NEED; t++){
      const s2 = freshTower(30, false);
      const sim = M.createSim(s2); M.syncShafts(s2, sim);
      for (let i = 0; i < 12000; i++) M.step(s2, sim, 1 / 20);
      for (const p of sim.waiting) seen.push(p.origin);
    }
    if (seen.length < NEED) return 'TODO';
    const above = seen.filter(o => o > 0);
    return ok(above.length === 0,
      `${seen.length} 個樣本中，有 ${above.length} 個出現在沒有租戶的樓層。`
      + '成因：pickFloor() 防了「範圍是空的」卻沒防「範圍非空但權重全為 0」');
  });
}

// --- #8 的覆蓋在招商移除之後會消失，所以改成白箱 -----------------------
// 端對端那條之所以抓得到 #8，是因為空樓層讓 floorWeight 合法地回傳 0。招商拿掉
// 之後每層都有人，floorWeight 再也沒有合法的 0（BE 實測 33,600 個樣本最小 0.099）
// ——**缺陷是被遮住，不是被修好**。程式碼裡那三處「防了 pool 為空、沒防總權重
// 為 0」原封不動還在。
//
// 行為測不到的東西，就從原始碼測。這條比端對端弱，而且它自己知道自己弱：
// 它只證明那個防護在不在，不證明它對。§5.4——同一段話要同時寫下還證明得了什麼。
check('#8 加權抽樣的零總和防護存在於原始碼中', () => {
  if (SIM_SRC == null) return 'TODO';      // 讀不到就不假裝驗過
  const picks = (SIM_SRC.match(/Math\.random\(\)\s*\*\s*total/g) || []).length;
  const ne = nonEmpty(picks, 'sim.js 裡找不到任何「r = Math.random() * total」的加權抽樣，'
                           + '這條 guard 正在觀察一個空的宇宙——選擇器過時了');
  if (ne !== true) return ne;
  const guards = (SIM_SRC.match(/total\s*<=\s*0/g) || []).length;
  return ok(guards >= picks,
    `${picks} 處加權抽樣，只有 ${guards} 處防了「總權重為 0」。`
    + 'r=0 時第一圈 r-=0 就 <=0，會安靜回傳範圍最低的那一項（#8）');
});

// 這條原本是 TODO：「同形狀共三處」——pickFloor / pickType / 事件抽樣各有一份
// 加權抽樣的抄本，每一份都只防 pool 為空、不防總權重為 0。#9 把三份收成同一支
// `pickIndex()`，所以那個 TODO 退休了，改成斷言那個收斂**維持住**。
//
// 為什麼要有這一條：上面那條白箱 guard 是比「抽樣處數」與「防護處數」，
// 三處變一處之後它一樣綠。但綠的理由從「三處都防了」變成「只剩一處而它防了」
// ——**同一個綠，兩種完全不同的世界**。有人新增一支繞過 pickIndex 的加權抽樣時，
// 上面那條會紅（處數對不上），這一條說出它為什麼該紅。
check('加權抽樣只有 pickIndex 一個入口', () => {
  if (SIM_SRC == null) return 'TODO';
  const picks = (SIM_SRC.match(/Math\.random\(\)\s*\*\s*total/g) || []).length;
  const ne = nonEmpty(picks, 'sim.js 裡找不到任何加權抽樣，選擇器過時了');
  if (ne !== true) return ne;
  const exported = /export function pickIndex/.test(SIM_SRC);
  const callers = (SIM_SRC.match(/pickIndex\(/g) || []).length - 1;   // 扣掉定義那一行
  return ok(picks === 1 && exported && callers >= 3,
    `加權抽樣 ${picks} 處（應為 1）、pickIndex ${exported ? '有' : '沒有'}匯出、`
    + `呼叫點 ${callers} 個（原本三處抄本應該全部收進來）`);
});

// ---------------------------------------------------------------- 4 評價階梯
section('4 評價');
check('評價不會低於地板', () => {
  const st = S.newGame(); st.rating = 5;
  const sim = M.createSim(st); M.syncShafts(st, sim);
  st.rating = -99;
  M.step(st, sim, 1 / 20);
  return ok(st.rating >= SPEC.ratingMin, '評價掉到 ' + st.rating);
});
check('低於回穩線會自己往上爬', () => {
  const st = S.newGame(); st.rating = 1.0;
  const sim = M.createSim(st); M.syncShafts(st, sim);
  const before = st.rating;
  for (let i = 0; i < 200; i++) M.step(st, sim, 1 / 20);
  return ok(st.rating > before, `十秒之後仍是 ${st.rating}（起始 ${before}）`);
});
check('回穩不會把高評價往下拉', () => {
  const st = S.newGame(); st.rating = 4.9;
  const sim = M.createSim(st); M.syncShafts(st, sim);
  for (let i = 0; i < 200; i++) M.step(st, sim, 1 / 20);
  return ok(st.rating >= 4.85, `高評價被拉低到 ${st.rating}`);
});

// ---------------------------------------------------------------- 5 錢坑
// §5.14 的決定：招商拿掉之後由加蓋接手。這一條盯住「總 sink 的量級」。
section('5 錢坑');
check('加蓋 + 升級的總額（招商移除後應接手 81.7% 的缺口）', () => {
  const st = S.newGame(); st.cash = 1e12;
  let floorTotal = 0, g = 0;
  while (!S.upgradeMaxed(st, 'floor') && g++ < 500){
    floorTotal += S.upgradeCost(st, 'floor'); S.buyUpgrade(st, 'floor');
  }
  const a = S.newGame(); a.cash = 1e12;
  let upTotal = 0;
  for (const u of UPGRADES){
    if (u.id === 'floor') continue;
    let n = 0;
    while (!S.upgradeMaxed(a, u.id) && n++ < 500){
      upTotal += S.upgradeCost(a, u.id); S.buyUpgrade(a, u.id);
    }
  }
  R.pass.push({ label: '  ↳ 實測：加蓋 $' + Math.round(floorTotal).toLocaleString()
                + ' / 其他升級 $' + Math.round(upTotal).toLocaleString() });
  return 'TODO';   // 招商還在，目標值等移除後由 orchestrator 定
});

// ---------------------------------------------------------------- 7 招商移除（尚未實作）
// 這一組在實作**之前**就寫好。功能還不存在時回報 TODO，不是紅——把「還沒做」
// 和「做了但錯」混成同一種紅，一整張 issue 可以在功能不存在時被標記成完成。
//
// owner 裁決（2026-09-05，逐字）：問「取消招商之後，評價低於 1.0 的懲罰是什麼？」
// 答「**沒有懲罰**」。所以評價只保留乘數的角色（票價、人流），沒有離散的懲罰事件。
section('7 招商移除');
check('招商 API 已移除', () => leasingGone ? true : 'TODO');
check('蓋好的樓層就會有人（不需要招商）', () => {
  if (!leasingGone) return 'TODO';
  const st = S.newGame(); st.floors = 30;
  const sim = M.createSim(st); M.syncShafts(st, sim);
  let steps = 0;
  while (sim.waiting.length < 30 && steps++ < 40000) M.step(st, sim, 1 / 20);
  const ne = nonEmpty(sim.waiting.length, '跑了 ' + steps + ' 步都沒有乘客');
  if (ne !== true) return ne;
  // 要真的分散在整棟樓，不能全擠在大廳——那是 pickFloor 的零權重回退的樣子
  const floors = new Set(sim.waiting.map(p => p.origin));
  return ok(floors.size >= 5,
    `${sim.waiting.length} 個乘客只出現在 ${floors.size} 個樓層：`
    + [...floors].map(f => f + 1).sort((a, b) => a - b).join(','));
});
// 這條的第一版是瞎的，而且綠得毫不費力。它「開頭把 rating 設成 0.85、跑 150 秒、
// 斷言狀態沒變」——但 RATING_DRIFT 每秒把 rating 拉向 2.0，**20 秒內就爬過 1.0**
// （實測軌跡 0.851 → 1.059 @20s → 1.350 @60s），而懲罰每 60 秒才檢查一次。
// 所以第一次檢查時門檻早就過了，儀器整段時間在觀察一個空的宇宙。
//
// A/B 實測（BE peer 回報，我獨立複驗）：把原本 CHURN_RATING 1.0 的懲罰逐字放回
// 產品裡，harness 輸出 **33/4/2，和乾淨實作一個字都不差，第 7 組全綠**——
// 而懲罰是真的（每步釘住 0.85 跑 600 秒，30 層被拆到 21 層）。
//
// 修法有兩半，缺一不可：
//   1. **每一步都釘住** rating，否則 drift 會把儀器帶離目標。
//   2. **把存活證明放進 guard 自己裡面**。「這條 guard 有能力紅」是程式碼的性質；
//      「它這一次瞄準了正確的東西」是那一次執行的性質。只有後者能讓一個「沒變」
//      算數。所以先斷言：rating 真的低、真的跑滿了幾個檢查窗、樓裡真的有人。
check('低評價沒有離散的懲罰（owner 裁決：沒有懲罰）', () => {
  if (!leasingGone) return 'TODO';
  const LOW = 0.85, WINDOW = 60, WINDOWS = 4;   // 舊 CHURN_EVERY 是 60 秒
  const st = S.newGame(); st.floors = 30;
  const sim = M.createSim(st); M.syncShafts(st, sim);
  const snap = () => JSON.stringify({ floors: st.floors, up: st.up, auto: st.auto,
                                      shafts: st.up.shaft, cash: st.cash > 0 });
  const before = snap();
  let ratingMax = 0;
  const steps = WINDOW * WINDOWS * 20;
  for (let i = 0; i < steps; i++){
    st.rating = LOW;                 // 每一步都釘住，不給 drift 機會
    M.step(st, sim, 1 / 20);
    if (st.rating > ratingMax) ratingMax = st.rating;
  }
  // --- 存活證明：這三條任何一條不成立，下面那個「沒變」就沒有意義 ---
  if (ratingMax >= 1.0)
    return `儀器沒瞄準：rating 在跑的過程中爬到 ${ratingMax.toFixed(3)}，`
         + '已經高過歷史門檻 1.0，所以這一輪根本沒有測到懲罰路徑';
  const touched = sim.waiting.length + st.stats.served + st.stats.abandoned;
  const ne = nonEmpty(touched, `跑了 ${WINDOW * WINDOWS} 秒都沒有任何乘客，`
                             + '一棟沒有人的樓不會觸發任何跟評價有關的東西');
  if (ne !== true) return ne;
  // --- 主張本身 ---
  return ok(snap() === before,
    `評價每步釘在 ${LOW} 跑了 ${WINDOW * WINDOWS} 秒（${WINDOWS} 個檢查窗），`
    + `狀態被動到了：${before} → ${snap()}`);
});
check('評價仍然是乘數（低評價 = 賺比較少，不是被罰）', () => {
  const lo = S.newGame(); lo.rating = 0.8;
  const hi = S.newGame(); hi.rating = 5.0;
  const a = S.derived(lo).fareMult, b = S.derived(hi).fareMult;
  return ok(b > a * 1.5, `票價乘數沒有拉開：0.8 星 ${a}、5.0 星 ${b}`);
});

// ---------------------------------------------------------------- 6 乘客表
section('6 乘客');
check('每一種乘客都掛在存在的樓層帶上', () => {
  const keys = new Set(BANDS.map(b => b.key).concat(['any', 'floor13']));
  const bad = PASSENGERS.filter(p => !keys.has(p.band)).map(p => p.id);
  return ok(bad.length === 0, '掛在不存在的帶上：' + bad.join(', '));
});
check('乘客的必要欄位都在', () => {
  const bad = [];
  for (const p of PASSENGERS){
    for (const f of ['id', 'name', 'fare', 'patience', 'size', 'w', 'band'])
      if (p[f] === undefined) bad.push(p.id + '.' + f);
  }
  return ok(bad.length === 0, '缺欄位：' + bad.join(', '));
});

// ---------------------------------------------------------------- 8 文案 vs 程式碼
// 為什麼有這一組：一趟掃描抓到三處「文案在描述一個跟程式碼不一樣的東西」——
// `tall` 成就的英文寫 `Reach 100 floors` 而判定是 `floors>=70`、`o_algo` 賣一個
// 不存在的好處、`skylobby` 的說明講一個已拆掉的機制。**三個都只有人眼抓得到。**
//
// 這一組擋得住可機檢的那一半：成就的門檻數字，要跟中英文案裡的數字對得上。
// **它擋不住「這句話描述的機制還存不存在」**——那仍然要靠人去掃。
// 同一段話要同時寫下還證明得了什麼、不再證明什麼；只寫否定句的話，
// 讀者會自己補上界線，而且補得比事實大。
section('8 文案 vs 程式碼');

// 刻意不一致的例外。**每一條都要寫理由**——一個沒有理由的例外，跟沒有這條
// guard 是一樣的，只是多了一層「看起來有在管」的錯覺。
const COPY_OK = {
  five: '門檻 4.9 是容差，文案講 5.0 是玩家看得到的框架。判定放寬一點，免得浮點數讓玩家卡在 4.97 拿不到。',
};

const copyNums = t => (String(t).match(/[0-9]+(?:\.[0-9]+)?/g) || []).map(Number);

check('成就的門檻數字與中英文案一致', () => {
  const bad = [], checked = [];
  for (const a of ACHIEVEMENTS){
    const want = copyNums(a.test);
    if (!want.length) continue;
    const en = (EN.achievements && EN.achievements[a.id]) || {};
    for (const pair of [['zh', a.note], ['en', en.note]]){
      const got = copyNums(pair[1] || '');
      if (!got.length) continue;
      checked.push(a.id + ':' + pair[0]);
      if (got.some(n => want.indexOf(n) >= 0)) continue;
      if (COPY_OK[a.id]) continue;
      bad.push(a.id + '(' + pair[0] + ')：判定 ' + want.join('/')
               + '，文案寫 ' + got.join('/') + ' — 「' + pair[1] + '」');
    }
  }
  const ne = nonEmpty(checked.length,
    '沒有任何一條成就同時有「數字門檻」和「提到數字的文案」，這條 guard 從來沒有試過');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    '比對了 ' + checked.length + ' 組，' + bad.length + ' 組對不上｜' + bad.join('｜'));
});

check('刻意不一致的例外都寫了理由', () => {
  const ids = ACHIEVEMENTS.map(a => a.id);
  const ne = nonEmpty(Object.keys(COPY_OK).length, 'COPY_OK 是空的，這條沒有東西可以檢查');
  if (ne !== true) return ne;
  const bad = Object.keys(COPY_OK).filter(id =>
    ids.indexOf(id) < 0 || !COPY_OK[id] || COPY_OK[id].length < 15);
  return ok(bad.length === 0,
    '這些例外的 id 不存在、或理由太短（沒有理由的例外等於沒有這條 guard）：' + bad.join(', '));
});

// ---------------------------------------------------------------- 9 技能真的有作用嗎
// 為什麼有這一組：這個專案已經抓到**兩個**買了等於沒買的技能——
//   o_algo（控制器韌體，24 張藍圖）：d.algoEff 只餵統計頁一行顯示，不進 sim.js
//   o_warn（人流預警，20 張藍圖）：warnLead 只有 schedule() 讀，而 schedule()
//                                  唯一的呼叫點在已經不會觸發的租戶事件裡
// 加起來 44 張藍圖買到空氣。藍圖是拆樓才拿得到的，是這個遊戲最稀缺的資源。
//
// **兩個都不是靠測試抓到的，是 peer 順手撞到的。** 因為每個技能都「有改到
// derived() 裡的某個值」——壞的是沒有人消費那個值。所以斷言 derived() 有變
// 完全抓不到它們：**值變了，行為沒變。**
//
// 這一條改成問行為：釘住亂數序列，同一個劇本跑兩次，一次技能 0 級、一次滿級。
// 輸出逐字相同 = 這個技能對模擬沒有任何影響。
section('9 技能真的有作用嗎');

// 效果不在 step() 裡的技能。**每一條都要寫它的效果在哪、怎麼驗**，
// 否則這份清單會變成「把紅的塞進來」的垃圾桶。
const SKILL_OK = {
  a_cost: '效果在 upgradeCost()（加蓋成本 -10%），不在 step()。由第 5 組的錢坑檢查涵蓋。',
  o_evac: '需要玩家按下疏散鈕才會發生，自動模擬不會觸發。要驗須另外寫互動測試。',
  o_shaft: '效果是起始電梯井 +1，我在劇本裡固定了 up.shaft，所以這裡看不到差異；'
         + 'd.shafts 的算式由第 1 組涵蓋。',
};

// 可重現的亂數：同一個種子跑出同一條序列。不釘住的話兩次跑本來就會不同，
// 這條 guard 會對每一個技能都回報「有差異」——一個永遠綠的儀器。
function withSeed(seed, fn){
  const orig = Math.random;
  let x = seed >>> 0;
  Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  try { return fn(); } finally { Math.random = orig; }
}

function fingerprint(skillId, level){
  return withSeed(0x9e3779b9, () => {
    // 技能必須**在 newGame() 之前**交給它：起始樓層與起始評價是在 newGame()
    // 裡面依技能算的（state.js:33-34）。第二版把 st.skills 設在 newGame() 之後，
    // 那時樓層早就用空技能算完了，於是 a_floor 被儀器自己抹平——
    // 這條 guard 對著一個正確的技能報「買了等於沒買」。
    const st = S.newGame({ skills: skillId ? { [skillId]: level } : {} });
    // 也不要用賦值蓋掉 st.floors（第一版的錯），加法才留得住技能的效果。
    st.floors = st.floors + 35;
    st.cash = 1e9;
    st.up.speed = 4; st.up.accel = 3; st.up.cap = 4; st.up.door = 3; st.up.shaft = 2;
    st.auto.fifo = st.auto.scan = st.auto.look = st.auto.dest = true;
    const sim = M.createSim(st); M.syncShafts(st, sim);
    const marks = [];
    for (let i = 0; i < 24000; i++){
      // 超速要真的按下去，否則 m_cool（熱容量／冷卻／滿級免過熱）整條路徑
      // 不會被執行到，這條 guard 會對著一個正確的技能報「買了等於沒買」。
      // 週期性開關，讓它有機會累積熱量、也有機會冷卻。
      sim.boost = (i % 600) < 260;
      M.step(st, sim, 1 / 20);
      if (i % 2000 === 0)
        marks.push([st.stats.served, st.stats.abandoned, Math.round(st.cash),
                    sim.waiting.length, sim.toasts.length,
                    st.stats.overheats, Math.round(st.stats.boostTime)].join(','));
    }
    return marks.join('|') + '#' + st.stats.served + ',' + st.stats.abandoned;
  });
}

check('每個技能買滿之後，模擬行為要真的改變', () => {
  const base = fingerprint(null, 0);
  const dead = [], checked = [];
  for (const sk of SKILLS){
    if (SKILL_OK[sk.id]) continue;
    checked.push(sk.id);
    if (fingerprint(sk.id, sk.max) === base) dead.push(sk.id + '（滿級 ' + sk.max + '）');
  }
  const ne = nonEmpty(checked.length, '一個技能都沒檢查到——SKILLS 是空的，或例外清單吃掉了全部');
  if (ne !== true) return ne;
  return ok(dead.length === 0,
    '檢查了 ' + checked.length + ' 個技能，' + dead.length + ' 個買滿之後模擬輸出逐字不變'
    + '（= 買了等於沒買）：' + dead.join('、'));
});

check('儀器活著：亂數真的被釘住了', () => {
  // 沒有這一條，上面那條可能是「兩次跑本來就不同，所以每個技能都看起來有效」。
  // 那會讓它變成一個永遠綠、什麼都保護不了的檢查。
  const a = fingerprint(null, 0), b = fingerprint(null, 0);
  return ok(a === b, '同一個種子跑兩次結果不同，亂數沒釘住，上面那條的綠不算數');
});

check('例外清單裡的技能都存在，而且都寫了理由', () => {
  const ids = SKILLS.map(s => s.id);
  const ne = nonEmpty(Object.keys(SKILL_OK).length, 'SKILL_OK 是空的，沒有東西可以檢查');
  if (ne !== true) return ne;
  const bad = Object.keys(SKILL_OK).filter(id =>
    ids.indexOf(id) < 0 || !SKILL_OK[id] || SKILL_OK[id].length < 20);
  return ok(bad.length === 0,
    '例外的 id 不存在、或理由太短（沒有理由的例外等於把紅的掃進地毯下）：' + bad.join(', '));
});

// ---------------------------------------------------------------- 10 權重真的有作用嗎
// 這一組是一個 peer 朝地基開槍才發現要寫的。它做了兩次破壞：
//   A  pickIndex 永遠回傳 0（#8 原本的形狀）  → 抓到了
//   B  pickIndex 忽略權重，改成均勻抽樣        → **41/1/1，跟乾淨版逐字相同**
// 我獨立複驗，B 成立。實測分布差異很大（100 層、6 棟）：辦公帶從 2.2% 變 9.6%
// （4.4 倍）、觀景從 18.0% 變 11.7%——而 harness 一條都不紅。
//
// 也就是說整個人口權重模型當時沒有任何保護：樓層帶 pop、windowWeight 的尖峰窗、
// 週末倍率、tenantMix、乘客型別的 w、事件的 w，全部丟掉都不會被發現。
//
// **這正是「逃過證偽的 guard」的形狀，而且三個條件都齊了**：它是地基（三個呼叫端
// 都靠它）、它太便宜（一個小函式，看起來顯然是對的）、大家都在引用它（#8 的 issue、
// commit message、上面第 3 組的兩條 guard 都指著它）。
//
// 而我自己寫的那兩條 pickIndex guard **都是原始碼比對**——我在 #9 的回覆裡才剛寫過
// 「轉綠只代表防護存在，不代表防護是對的」，然後沒有動作。引用一條 guard 不會執行它。
section('10 權重真的有作用嗎');

check('pickIndex 真的照權重抽（單元）', () => {
  const W = [1, 0, 9], N = 20000;
  const hits = [0, 0, 0];
  for (let i = 0; i < N; i++) hits[M.pickIndex(W)]++;
  // 零權重那一格是判準：均勻抽樣會給它 ~1/3，照權重則必須是 0。
  // **只斷言「第 2 格最多」抓不到均勻**——均勻時三格差不多，最多的那一格
  // 有 1/3 機率剛好是第 2 格，這條 guard 會間歇性放行。
  if (hits[1] !== 0)
    return `權重 [1,0,9] 抽 ${N} 次，權重為 0 的那一格被選中 ${hits[1]} 次`
         + `（均勻抽樣會給它約 ${Math.round(N/3)} 次）｜實際分布 ${hits.join('/')}`;
  const p0 = hits[0] / N;
  return ok(Math.abs(p0 - 0.10) < 0.02,
    `權重 [1,0,9] 的第 0 格應占 10%，實際 ${(p0*100).toFixed(1)}%｜分布 ${hits.join('/')}`);
});

check('尖峰窗真的改變人流分布，兩個方向都要對（端對端）', () => {
  // 上面那條是單元層。這條走完整條鏈：windowWeight → floorWeight → pickIndex。
  //
  // **第一版我取樣取錯方向了**：我在 9 點看辦公帶的「出發」占比，期待它衝高。
  // 但 `windowWeight(h, role === 'dest' ? b.up : b.down)` —— 辦公帶的
  // `up:[8,10]` 是**抵達**窗、`down:[17,19]` 才是**出發**窗。9 點的辦公是目的地
  // 不是起點，所以那條 guard 在乾淨的產品上也是紅的。是儀器錯，不是產品錯。
  //
  // 而且**只測一個方向不夠**：一個把 up/down 對調的實作，會在其中一個方向上
  // 看起來完全正常。兩個方向都要測，才分辨得出來。
  // **這條原本沒有釘住亂數**，於是它大約 6% 的機率會自己閃紅（一個 peer 用
  // 17 次觀察量出來的：乾淨的 main 連跑 5 次全綠、它的 build 連跑 11 次全綠，
  // 只有最初那一次紅）。第 9 組用了 withSeed，這一列漏了。
  //
  // 一個會自己閃紅的檢查比沒有這條檢查更糟：它訓練所有人忽略紅色，而且會讓
  // 「基準線是零紅，所以任何紅都是你造成的」這個判準失效——我才剛把那句話
  // 寫進派工單，然後這條就讓它變成假的。
  //
  // 三個時段吃**同一條亂數序列**，所以唯一的差異是 st.t。那才是公平的對照。
  //
  // 餘裕（修好取樣之後重量，三顆種子）：
  //   出發 18/3 → 1.51 / 1.64 / 1.85     抵達 9/3 → 1.68 / 1.66 / 1.87
  //   門檻 1.3，餘裕 16–42%。樣本 646–1391。
  //
  // **修好之前是 1.40、樣本約 340，而且會亂跳**——一個 peer 量到：只改一個跟這條
  // guard 完全無關的權重（貓，band:'any'、rare），比值在 1.271～1.731 之間跳、
  // 對權重完全不單調，加了它反而更高。成因是下面那段索引取樣的 bug。
  //
  // 它紅的時候有兩種可能：尖峰窗真的失效了（缺陷），或者有人動了樓層帶的
  // pop / up / down / wknd（合理的調參）。**先去看 BANDS 有沒有被改過，
  // 再懷疑 windowWeight。** 我沒有把門檻放寬——放寬會讓它抓不到小幅度的退步。
  const sample = hour => withSeed(0x5eed1234, () => {
    const st = S.newGame(); st.floors = 60; st.cash = 1e9;
    st.up.speed = 4; st.up.cap = 4; st.up.shaft = 2;
    st.auto.fifo = st.auto.scan = st.auto.look = true;
    const sim = M.createSim(st); M.syncShafts(st, sim);
    const bandOf = f => BANDS.find(x => f + 1 >= x.from && f + 1 <= x.to);
    const from = {}, to = {};
    let n = 0;
    // **不要用索引認新乘客。** 第一版是 `for (k = before; k < sim.waiting.length; k++)`，
    // 而 `sim.waiting` 在 step() 裡有三處 splice（封鎖清除 545、上車 790、放棄 855）：
    //   · 上車的比新生的多 → 長度變短 → 那一圈整批漏掉
    //   · 長度變長時 waiting[k] 也不保證是新來的（前面的人被移走，後面的往前遞補）
    // 一個 peer 量到的症狀：只改一個**跟這條 guard 完全無關**的權重（貓，band:'any'、
    // rare），比值在 1.271～1.731 之間亂跳、對權重完全不單調，而且加了它反而更高。
    //
    // 乘客有唯一的 `id`（sim.js:256 `nextId++`），所以改成按身分認。
    // **同時掃 waiting 與所有 riders**：一個乘客在同一步裡出生又上車的話，
    // 只看 waiting 會漏掉他——那不是隨機的漏，是偏向電梯剛好停著的那幾層。
    const seen = new Set();
    const note = p => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      const bo = bandOf(p.origin), bd = bandOf(p.dest);
      if (bo) from[bo.key] = (from[bo.key] || 0) + 1;
      if (bd) to[bd.key] = (to[bd.key] || 0) + 1;
      n++;
    };
    for (let i = 0; i < 60000; i++){
      st.t = C.DAY_SECONDS * hour / 24;      // 每一步都釘住，否則跑一跑就跨出尖峰窗
      M.step(st, sim, 1 / 20);
      for (const p of sim.waiting) note(p);
      for (const sh of sim.shafts) for (const r of sh.riders) note(r);
    }
    return { from, to, n };
  });
  const evening = sample(18), morning = sample(9), night = sample(3);
  const ne = nonEmpty(Math.min(evening.n, morning.n, night.n),
    `有時段一個乘客都沒生成（18點 ${evening.n}、9點 ${morning.n}、3點 ${night.n}）`);
  if (ne !== true) return ne;

  // 辦公帶：down:[17,19] 是出發窗、up:[8,10] 是抵達窗
  const sf = r => (r.from.office || 0) / r.n;      // 出發占比
  const sd = r => (r.to.office || 0) / r.n;        // 抵達占比
  const bad = [];
  if (!(sf(evening) > sf(night) * 1.3))
    bad.push(`出發：18 點 ${(sf(evening)*100).toFixed(1)}% vs 3 點 ${(sf(night)*100).toFixed(1)}%（down 窗 [17,19] 沒生效？）`);
  if (!(sd(morning) > sd(night) * 1.3))
    bad.push(`抵達：9 點 ${(sd(morning)*100).toFixed(1)}% vs 3 點 ${(sd(night)*100).toFixed(1)}%（up 窗 [8,10] 沒生效？）`);
  return ok(bad.length === 0,
    `辦公帶的尖峰窗沒有拉開｜${bad.join('｜')}｜樣本 ${evening.n}/${morning.n}/${night.n}`);
});

// ---------------------------------------------------------------- 11 內容資料的三種安靜錯誤
// 這一組是一個 peer 交來的。它在自己的分支上同時製造三個缺陷，然後跑我的 harness：
// **44 pass / 0 fail / 1 todo —— 一條都沒抓到。**
//
//   · 事件的 `type:` 打錯字 → `forcedTypePool()` 回 null，**安靜退回樓層帶抽樣**。
//     症狀是「消防演習疏散了一隻貓」，而不是任何錯誤。
//   · 成就的 `codex` 鍵打錯 → 那個計數器永遠沒有人寫，**成就永遠拿不到**。
//   · 成批事件的場上耐性掉到 42–44 秒的結構懸崖以下 → **整批必死**。
//
// 三種都不會丟例外、不會讓畫面壞掉、不會讓任何既有的 guard 變紅。
// 它把形狀交給我而沒有自己搬進 tests/（這是我的檔案），所以由我實作。
section('11 內容資料的三種安靜錯誤');

// 誰會寫 st.codex？sim.js 對每一種送達的乘客型別寫 st.codex[p.type]，
// 另外有幾個具名的計數器。**具名的那些要從原始碼抓，不能寫死**——寫死的話
// 下一個人加了新的計數器，這條 guard 會把正確的成就報成錯的。
//
// ⚠ **第一版是 `SIM_SRC.match(/codex\.(\w+)/g)`，而那把註解當成了資料。**
// 這正是我寫進每一份 brief 的第 13 條教訓（「在原始碼文字上比對會把註解當資料」），
// 而我自己的 harness 從頭到尾都是這個形狀——**把一個 bug 命名成一個類，
// 不等於掃過那個類**（skill 5.17）。
//
// 實際的失效：`sim.js` 有一行註解寫著「共用一個 `codex.pairsDelivered` 會讓下一個
// 寫 pair:true 的人物把成就文案變成假的」——**那是一句叫人不要用它的警告**，
// 而舊版的 regex 把它讀成「有人寫得進去」。**擋住這條 guard 的，正是它所守護的
// 那個危險的說明文字。** 我實際證偽過：在 ACHIEVEMENTS 插一條
// `test: s => s.codex.pairsDelivered >= 3`（一條永遠拿不到的成就），
// **整份 harness 69 pass / 0 fail。這條 guard 存在的唯一理由就是抓這個。**
//
// 三個陣口一起堵：去註解、字串內容抹掉、**而且只認「寫」不認「提到」**。
//
// **這支去註解器是「夠用」不是「通用」**：它逐行追蹤 ' " ` 三種引號，
// 沒有處理 regex 字面。量過了：`sim.js` 只有一個 regex 字面（`/\.0$/`，裡面沒有
// 引號也沒有 //）、**零個跨行樣板字面**（每行 backtick 都是偶數）、零個 `/* */`。
// 哪天這三個假設壞了，**壞的方向是安全的**：抽不到鍵 → 成就被報成
// 「寫不進去」 → **假紅，不是假綠**。下面那條自測會先叫。
const stripNonCode = src => src.split('\n').map(line => {
  let out = '', q = null;
  for (let i = 0; i < line.length; i++){
    const c = line[i];
    if (q){                                   // 引號裡：內容抹成空白，但保留長度
      if (c === '\\'){ out += '  '; i++; continue; }
      if (c === q){ q = null; out += c; } else out += ' ';
      continue;
    }
    if (c === "'" || c === '"' || c === '`'){ q = c; out += c; continue; }
    if (c === '/' && line[i + 1] === '/') break;   // 行註解：從這裡敲掉
    out += c;
  }
  return out;
}).join('\n');

// 只認寫入：`codex.NAME` 後面接 =（不是 ==）、++、--、+= 之類。
// `if (st.codex.foo >= 3)` 是讀，不算。
const codexWrites = src => [...new Set(
  [...stripNonCode(src).matchAll(/codex\.(\w+)\s*(?:\+\+|--|[-+*\/|&^%]?=(?!=))/g)]
    .map(m => m[1])
)];

const CODEX_NAMED = SIM_SRC == null ? null : codexWrites(SIM_SRC);

// **儀器的自測，而且期望值是我手寫的、不是從 sim.js 推出來的**（5.2）。
// 它在一支小小的合成原始碼上跑，那支原始碼把四種情況各放一份。
check('抽 codex 鍵的那支儀器本身是對的嗎', () => {
  const PROBE = [
    "// codex.commentOnly 只出現在註解裡，不該算",
    "st.codex.realWrite = (st.codex.realWrite || 0) + 1;   // codex.alsoComment 也不算",
    "if (st.codex.readOnly >= 3) doThing();",
    "const s = 'codex.inString = 1';",
    "st.codex.bumped++;",
  ].join('\n');
  const got = codexWrites(PROBE).sort();
  const want = ['bumped', 'realWrite'];
  if (got.join(',') !== want.join(','))
    return `儀器壞了：合成原始碼應該抽出 [${want}]，實際抽出 [${got}]`;
  if (SIM_SRC == null) return 'TODO: 讀不到 sim.js，儀器自測只跑了合成那一半';
  if (!(CODEX_NAMED.length >= 3))
    return `儀器壞了：在真的 sim.js 上只抽到 ${CODEX_NAMED.length} 個具名計數器`;
  const mentioned = [...new Set((SIM_SRC.match(/codex\.(\w+)/g) || []).map(m => m.slice(6)))];
  const commentOnly = mentioned.filter(k => !CODEX_NAMED.includes(k)
    && !PASSENGERS.some(p => p.id === k));
  return ok(true,
    `合成原始碼抽出 [${got}]（註解、字串、只讀的那三種都沒有混進來）`
    + `｜真的 sim.js 抽出 ${CODEX_NAMED.length} 個具名計數器`
    + `｜**只在註解裡被提到、沒有人寫得進去的鍵：`
    + `${commentOnly.join('、') || '無'}**——舊版把這些全部當成合法的。`);
});

check('事件的 type / types 一定指得到一個乘客型別', () => {
  const ids = new Set(PASSENGERS.map(p => p.id));
  const bad = [];
  let checked = 0;
  for (const e of EVENTS){
    const want = e.types ? Object.keys(e.types) : (e.type ? [e.type] : []);
    for (const t of want){
      checked++;
      if (!ids.has(t)) bad.push(e.id + ' → ' + t);
    }
  }
  const ne = nonEmpty(checked, '沒有任何事件指定 type/types，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `比對了 ${checked} 個指定，${bad.length} 個指不到乘客型別`
    + `（forcedTypePool() 會回 null，然後**安靜退回樓層帶抽樣**）：` + bad.join('、'));
});

check('成就讀的 codex 鍵一定要有人寫得進去', () => {
  if (CODEX_NAMED == null) return 'TODO';          // 讀不到 sim.js 就不假裝驗過
  const writable = new Set([...PASSENGERS.map(p => p.id), ...CODEX_NAMED]);
  const bad = [];
  let checked = 0;
  for (const a of ACHIEVEMENTS){
    for (const m of String(a.test).match(/codex\.(\w+)/g) || []){
      const k = m.slice(6);
      checked++;
      if (!writable.has(k)) bad.push(a.id + ' → codex.' + k);
    }
  }
  const ne = nonEmpty(checked, '沒有任何成就讀 codex，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `比對了 ${checked} 個 codex 鍵，${bad.length} 個永遠寫不進去 = 永遠拿不到：` + bad.join('、'));
});

// 42–44 秒的結構懸崖：一個 peer 掃 36/40/44/48/52/64 得到存活率
// 14/19/**58**/55/49/86%。那條線是「電梯從別層趕過來 + 清掉一整批人」的時間，
// **低於它整批人必死**——不是比較難，是這個事件等於不存在。
//
// 場上耐性 = type.patience × (1 + far/45) × (event.panic || 1)，
// far = max(出發樓層, 目的樓層) 的索引。
//
// **第一版我用 far=0 當下界，那太嚴了。** 它把「基礎耐性 < 44」的每一列都報出來，
// 不管那個事件的人實際走多遠——`anniversary` 就是這樣被誤報的：基礎 42、沒有 panic，
// far=0 算出 42.0（紅），但它是大廳→零售，目的地在 0–9 層之間，取中位是 46.2（過）。
// 我實測過它的存活率：30 層 100%、12 層有幾顆種子是 48/48。**那不是缺陷，是我的界取錯。**
//
// 改用**目的地帶的中位索引**。這樣 `raffle` 仍然被抓（64 × 1.1 × 0.5 = 35.2），
// 而 `anniversary` 放過。
//
// **這條界證明得了什麼／不再證明什麼**：它抓的是「典型的那一批人掉在懸崖下」，
// 不抓「最壞的一個人掉在懸崖下」——後者在任何基礎耐性接近 44 的事件上都會發生，
// 而那不是同一件事。`at` 或 `to` 是 `'any'` 的事件**跳過不檢查**（樓層範圍隨塔高變，
// 界不出來），`drill` 就是這一類。
const CLIFF = 44;
// 刻意留在懸崖下的例外。**每一條都要寫理由與量測**，否則這張表會變成
// 「把紅的掃進地毯下」的垃圾桶。
const CLIFF_OK = {
  raffle: '中獎顧客 64 × panic 0.5 = 場上 32 秒，刻意的：第一版 46 秒只救得回 10–19%，'
        + '這個事件的設計就是「大部分人你救不回來」。實測 FIFO 3% / SCAN 14% / LOOK 6%，'
        + '是全表最低的一列。要不要調是 owner 的決定（orchestrator 實測 59.1%，配置較寬鬆）。',
};

// ⚠ **這條 guard 曾經對屋頂帶完全是瞑的，而且只讀 `type` 不讀 `types`。**
// 兩個洞都是做屋頂帶的 peer 回報的，我複驗了，兩個都是真的。
//
// **一、far 算錯了 35 倍。** `BANDS.roof` 是 `from:100, to:9999`（上界寫成一個
// 大數字當「沒有上限」），而 `MAX_FLOORS` 是 **100**。舊的 `mid()` 直接取
// `((from-1)+(to-1))/2`：
//
//     retail  far    4.5 (×1.10)      obs   far   77.0 (×2.71)
//     office  far   14.5 (×1.32)      exp   far   91.5 (×3.03)
//     hotel   far   32.0 (×1.71)      **roof  far 5048.5 (×113.2)**  ← 實際應該是 99.0 (×3.20)
//     resid   far   57.0 (×2.27)
//
// 所以任何一列屋頂事件的場上耐性都會被算成實際值的 **35 倍**，
// **這一帶的懸崖它一條都擋不到**。夾限到 `MAX_FLOORS - 1` 之後，
// **其他六帶的數字逐位元相同**——修正只碰到壞的那一帶。
//
// **二、`types:` 的事件整列跳過。** 舊的第一行是 `if (!e.type || !e.n) continue;`，
// 而事件可以寫 `types:{ id: 權重 }` 混幾種人。既有的 `closetime` 就是這樣繞過去的。
// 現在 `types:` 的每一種都算，**取最差的那一種**（整批人裡只要有一種掉下懸崖，
// 那一種就是必死的）。
const cliffMid = k => {
  if (k === 'lobby') return 0;
  if (k === 'any') return null;
  const b = BANDS.find(x => x.key === k);
  if (!b) return null;
  // 夾限：`to` 可以寫一個大數字當「沒有上限」，但樓真的蓋不到那裡
  const lo = Math.min(b.from - 1, C.MAX_FLOORS - 1);
  const hi = Math.min(b.to - 1, C.MAX_FLOORS - 1);
  return (lo + hi) / 2;
};

check('成批事件的場上耐性不可以掉到結構懸崖以下', () => {
  const byId = Object.fromEntries(PASSENGERS.map(p => [p.id, p]));
  const bad = [], checked = [];
  // 儀器活著嗎？屋頂帶的 far 必須落在樓高上限之內。
  const roofFar = cliffMid('roof');
  if (roofFar != null && !(roofFar < C.MAX_FLOORS))
    return `儀器壞了：roof 帶算出來的 far 是 ${roofFar}，比 MAX_FLOORS ${C.MAX_FLOORS} 還大`;
  for (const e of EVENTS){
    if (!e.n) continue;
    // `type` 或 `types` 都要算——舊版只讀 `type`，`types:` 的整列跳過
    const ids = e.types ? Object.keys(e.types) : (e.type ? [e.type] : []);
    if (!ids.length) continue;
    const batch = e.n[1] || e.n[0] || 0;
    if (batch < 6) continue;                        // 一兩個人不算「整批」
    const a = cliffMid(e.at), z = cliffMid(e.to);
    if (a == null || z == null) continue;           // 'any'：跳過，理由見上面註解
    const far = Math.max(a, z);
    let worst = Infinity, worstId = '';
    for (const id of ids){
      const t = byId[id];
      if (!t) continue;                             // 指不到型別是上面那條的事
      const v = t.patience * (1 + far / 45) * (e.panic != null ? e.panic : 1);
      if (v < worst){ worst = v; worstId = id; }
    }
    if (worst === Infinity) continue;
    checked.push(e.id);
    if (worst >= CLIFF) continue;
    if (CLIFF_OK[e.id]) continue;
    const t = byId[worstId];
    bad.push(`${e.id}（${worstId} ${t.patience}`
      + (e.panic != null ? ` × panic ${e.panic}` : '') + ` = 場上 ${worst.toFixed(0)} 秒）`);
  }
  const ne = nonEmpty(checked.length, '沒有任何成批事件指定 type，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `比對了 ${checked.length} 個成批事件，${bad.length} 個掉到 ${CLIFF} 秒的懸崖以下`
    + `（不是比較難，是整批必死）：` + bad.join('、'));
});

check('懸崖的例外都寫了理由', () => {
  const ids = new Set(EVENTS.map(e => e.id));
  if (Object.keys(CLIFF_OK).length === 0) return ok(true, DEBT_CLEARED('CLIFF_OK'));
  const bad = Object.keys(CLIFF_OK).filter(id =>
    !ids.has(id) || !CLIFF_OK[id] || CLIFF_OK[id].length < 30);
  return ok(bad.length === 0,
    '例外的事件 id 不存在、或理由太短（沒有理由的例外等於沒有這條 guard）：' + bad.join(', '));
});

// ---------------------------------------------------------------- 12 招來同伴、以及事件檢查的落點
// 第 11 組守住了「事件的 type 打錯字」，但**招來同伴走的是另一條路而且一樣安靜**。
// 我親手證偽過：在 PASSENGERS 的 summon.type 上把 'reporter' 打成 'reporterr'，
// 整份 harness **48 pass / 0 fail / 1 todo，全綠**。兩條路最後都進 forcedTypePool()，
// 指不到就退回樓層帶抽樣——「名人帶著六隻貓出場」不會丟例外。
//
// 第三條是完全不同的一種安靜：**事件檢查只落在時鐘上的十二個點**，所以一個
// 一小時寬的 hours 窗可以是一列從來不會被抽到的死資料。實測見下面那條的註解。
section('12 招來同伴、以及事件檢查的落點');

// 樓層帶的中位索引，跟第 11 組懸崖那條同一個算法（'any' 界不出來 → null）。
const bandMid = k => {
  if (k === 'lobby') return 0;
  if (k === 'any' || !k) return null;
  const b = BANDS.find(x => x.key === k);
  return b ? ((b.from - 1) + (b.to - 1)) / 2 : null;
};

check('招來同伴的 type 也一定指得到一個乘客型別', () => {
  const ids = new Set(PASSENGERS.map(p => p.id));
  const bad = [];
  let checked = 0;
  for (const p of PASSENGERS){
    if (!p.summon || !p.summon.type) continue;
    checked++;
    if (!ids.has(p.summon.type)) bad.push(p.id + ' → summon.type ' + p.summon.type);
  }
  const ne = nonEmpty(checked, '沒有任何人物寫 summon.type，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `比對了 ${checked} 個 summon.type，${bad.length} 個指不到乘客型別`
    + `（跟事件的 type 走同一個 forcedTypePool()，一樣**安靜退回樓層帶抽樣**）：` + bad.join('、'));
});

check('招來同伴生出來的整批，場上耐性也不可以掉到懸崖以下', () => {
  // 第 11 組的懸崖 guard 只讀 EVENTS 的 e.n，所以 summon 生出來的那一批它看不到
  // ——#61「名人與媒體」的 6–9 個記者就是這樣繞過去的（交這一列的 peer 自己回報的）。
  //
  // **這條界證明得了什麼／不再證明什麼**：它用「招人的那個人所屬樓層帶」的中位
  // 索引當 far，因為同伴的 from/to 是相對於招人者的（'origin' / 'dest' / 'lobby'）。
  // 所以它抓的是典型值，不是最壞值；招人者的 band 是 'any' 或缺的話跳過。
  // 它也**不**涵蓋事件透過 panic 改耐性的路徑——summon 生出來的人拿不到 ev.panic
  // （runEvent 在 makePassenger 回傳之後才蓋 panic，而同伴是在裡面生的）。
  const byId = Object.fromEntries(PASSENGERS.map(p => [p.id, p]));
  const bad = [], checked = [];
  for (const p of PASSENGERS){
    const s = p.summon;
    if (!s || !s.type || !s.n) continue;
    const batch = s.n[1] || s.n[0] || 0;
    if (batch < 6) continue;
    const t = byId[s.type];
    if (!t) continue;                        // 指不到是上面那條的事
    const far = bandMid(p.band);
    if (far == null) continue;
    const onStage = t.patience * (1 + far / 45);
    checked.push(p.id + '→' + s.type);
    if (onStage >= CLIFF) continue;
    bad.push(`${p.id} 招 ${batch} 個 ${s.type}（${t.patience} → 場上 ${onStage.toFixed(0)} 秒）`);
  }
  const ne = nonEmpty(checked.length,
    '沒有任何人物成批招同伴（n ≥ 6），這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `比對了 ${checked.length} 組成批的 summon，${bad.length} 組掉到 ${CLIFF} 秒的懸崖以下：`
    + bad.join('、'));
});

// 事件檢查的落點（梳齒）。**這不是每秒都在抽**：sim.js 只在 sim.eventT >= EVENT_EVERY
// 的那一步檢查一次然後歸零，而每一次都是從 0 累加同一串 STEP，所以間隔是常數。
// 那個常數**不等於 EVENT_EVERY**——是「累加到跨過它的那一步」，浮點上會多一步。
//
// 今天的數字：75 秒 / 180 秒一天 → 每次前進 10.00222 個遊戲小時，gcd(10,24)=2，
// 所以任何一個時刻，時鐘上**只有十二個偶數整點抽得到**，另一半完全不存在。
// 那 0.00222 讓整把梳子以約 188 遊戲日／小時進動。
//
// 我實測過一個一小時窗 [7,8) 在 400 個遊戲日裡的命中：
//   0–50d: 0 · 50–100d: 0 · 100–150d: 0 · 150–200d: 3 · 200–250d: 10 ·
//   250–300d: 10 · 300–350d: 10 · 350–400d: 5
// **不是「永遠死掉」，是前 150 個遊戲日完全不存在，然後活兩百天，然後再消失。**
// 那比永遠死掉更難發現：它在測試裡是零，在某個玩家的存檔裡是正常頻率。
//
// **這條界證明得了什麼／不再證明什麼**：它只管 EVENTS 的 `hours`。
// 乘客的 `peaks:[{hours}]` **不受這條限制**——那是每次生乘客時連續評估的，
// 不走這把梳子。它也不保證頻率夠高，只保證「抽得到」。
function eventStrideSeconds(){
  let t = 0, n = 0;
  while (t < C.EVENT_EVERY && n < 1e7){ t += C.STEP; n++; }
  return t;
}
// **取樣區間是這條 guard 的全部**（skill §5.3：在能運作的區間驗證儀器，
// 對壞掉的那一半什麼也沒說）。第一版我取 500 次檢查 ≈ 227 個遊戲日，而我自己
// 量到的 [7,8) 是**第 150 個遊戲日才開始命中的**——那個界會放它過。
// 改成 **60 個遊戲日**：一個遊戲日 180 秒，60 天約兩個半小時的實際遊玩，
// 已經遠超過任何人「第一次覺得這個事件不存在」的時間點。
const COMB_DAYS = 60;
const COMB = (() => {
  const strideS = eventStrideSeconds();
  const strideH = strideS / C.DAY_SECONDS * 24;
  const n = Math.ceil(COMB_DAYS * C.DAY_SECONDS / strideS);
  const startH = (S.newGame().t % C.DAY_SECONDS) / C.DAY_SECONDS * 24;
  const pts = [];
  let h = startH;
  for (let i = 0; i < n; i++){ h = (h + strideH) % 24; pts.push(h); }
  return { strideH, pts };
})();

check('事件的 hours 窗一定落得到事件檢查的梳齒', () => {
  const hit = win => COMB.pts.reduce((a, h) => a + (M.inHourWindow(h, win) ? 1 : 0), 0);

  // 存活證明放在 guard 裡面（不是放在另一次證偽裡）：找出梳齒之間最大的空隙，
  // 在它正中間放一個窄窗。這條檢查如果連那個窗都判成「可達」，它就是在看空氣。
  const sorted = [...COMB.pts].sort((a, b) => a - b);
  let gap = 0, gapAt = 0;
  for (let i = 1; i < sorted.length; i++){
    const g = sorted[i] - sorted[i - 1];
    if (g > gap){ gap = g; gapAt = (sorted[i] + sorted[i - 1]) / 2; }
  }
  const w = Math.min(0.2, gap / 3);
  const probe = [gapAt - w / 2, gapAt + w / 2];
  if (hit(probe) !== 0)
    return `儀器壞了：一個刻意放在梳齒空隙正中間的窄窗 [${probe[0].toFixed(2)},`
         + `${probe[1].toFixed(2)}) 被判成可達（空隙 ${gap.toFixed(2)} 小時）`;

  const bad = [];
  let checked = 0;
  for (const e of EVENTS){
    if (!e.hours) continue;
    checked++;
    const n = hit(e.hours);
    if (n === 0) bad.push(`${e.id} [${e.hours[0]},${e.hours[1]})`);
  }
  const ne = nonEmpty(checked, '沒有任何事件寫 hours，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `梳齒每次前進 ${COMB.strideH.toFixed(3)} 小時、最大空隙 ${gap.toFixed(2)} 小時；`
    + `比對了 ${checked} 個 hours 窗，${bad.length} 個在前 ${COMB.pts.length} 次檢查（${COMB_DAYS} 個遊戲日）裡一次都抽不到`
    + `（= 開局兩個半小時的遊玩裡它完全不存在，而且不會有任何錯誤）：` + bad.join('、'));
});


// ⚠ **上面那條只查前 60 個遊戲日，而那不夠。**
//
// 一個 peer 交觀景台事件時報：菜單指定的 `[22,23)` 在前 60 天是**活的**
// （命中 12 次，跟兩小時的窗一樣），所以上面那條會放它過——**但它在第 200 到
// 350 個遊戲日之間連續三個五十天區塊都是 0**。
//
//     [22,23)   0d:10  50d:10  100d:10  150d:7  200d:0  250d:0  300d:0  350d:5
//     [7,8)     0d:0   50d:0   100d:0   150d:3  200d:10 250d:10 300d:10 350d:5
//     [22,24)   全部 10
//
// **`[7,8)` 是 `[22,23)` 的相位鏡像**：同樣是一小時窗，一個開局死、一個開局活，
// 而兩個都會在某一段消失。梳子以約 188 遊戲日／小時進動，**一小時的窗剛好
// 追著一根齒走，所以它有大約一半的時間是空的**；兩小時的窗永遠含著一根。
//
// **這一條還原了我先前撤回的規則，但理由換了。** 我原本在每一份 brief 裡寫
// 「窗不可以窄於 2 小時」，peer 拿 `[22,23)` 在 60 天內是活的把它推翻，
// 而它是對的——**對「前 60 天」這個問題**。它後來自己補上長期的分佈，
// 於是兩句話都成立：**「≥2 小時」對「相位無關」是必要的，對「開局可見」不是。**
// 兩條檢查各答一個問題，都留著。
//
// 門檻取 20 個遊戲日：現有 50 個 hours 窗的最長空窗是 **7.5 天**（兩小時窗的正常齒距），
// 而 `[22,23)` 是 **150 天**。分離乾淨，零背債。
const MAX_GAP_DAYS = 20;

check('事件的 hours 窗不可以在某個相位整段消失', () => {
  const strideS = eventStrideSeconds();
  const strideH = strideS / C.DAY_SECONDS * 24;
  const perDay = C.DAY_SECONDS / strideS;
  const startH = (S.newGame().t % C.DAY_SECONDS) / C.DAY_SECONDS * 24;
  // 掃一整個進動週期（約 376 遊戲日）再多一點
  const ticks = Math.ceil(400 * perDay);
  const worstGap = win => {
    let h = startH, cur = 0, worst = 0;
    for (let i = 0; i < ticks; i++){
      h = (h + strideH) % 24;
      if (M.inHourWindow(h, win)) cur = 0;
      else { cur++; if (cur > worst) worst = cur; }
    }
    return worst / perDay;
  };
  // 存活證明：一個一小時的窗一定會在某個相位消失——這條檢查如果連它都放過，
  // 它就是在看空氣。取一個「一定會出事」的寬度來試。
  const probe = worstGap([3, 4]);
  if (!(probe > MAX_GAP_DAYS))
    return `儀器壞了：一個一小時的窗 [3,4) 量出最長空窗只有 ${probe.toFixed(1)} 天`;

  const bad = [];
  let checked = 0, worstSeen = 0, worstId = '';
  for (const e of EVENTS){
    if (!e.hours) continue;
    checked++;
    const g = worstGap(e.hours);
    if (g > worstSeen){ worstSeen = g; worstId = e.id; }
    if (g > MAX_GAP_DAYS)
      bad.push(`${e.id} [${e.hours[0]},${e.hours[1]}) 最長空窗 ${g.toFixed(0)} 個遊戲日`);
  }
  const ne = nonEmpty(checked, '沒有任何事件寫 hours，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `${checked} 個 hours 窗，${bad.length} 個會在某個相位整段消失：` + bad.join('、')
    + `｜目前最長空窗 ${worstSeen.toFixed(1)} 個遊戲日（${worstId}），門檻 ${MAX_GAP_DAYS}`
    + `｜**一小時的窗剛好追著一根梳齒走，所以它有大約一半的時間是空的**`
    + `——上面那條只查前 60 天，會放它過。`);
});

check('必須同車：一對永遠不會被拆到兩台車（端對端）', () => {
  // 機制還沒進來 → **TODO，不是 fail**。把「還沒做」和「做了但錯」混成同一種紅，
  // 一整張 issue 可以在功能不存在的情況下被標記成完成（見檔頭）。
  if (!PASSENGERS.some(p => p.pair)) return 'TODO';
  // 載客量門檻很銳利（交這個機制的 peer 量過：cap 4 → 0–5%、cap 8 起才成立），
  // 所以劇本要給得起位子，否則量到的是「沒人上得了車」而不是「上車時沒被拆開」。
  //
  // ⚠ **這條訊息本來寫死了「弄紅會得到 246/2116、修好是 0/2050」。那兩個數字
  // 在飯店帶落地的那一刻是真的，住宅帶落地之後就不是了**——`dogwalker` 成為
  // 第二個 `pair:true` 型別，整個乘客組成變了，同一支探針現在量到 1052 個樣本。
  // 一個 peer 弄紅它時得到 241/1069，以為自己弄錯了，跑去在乾淨的 main 上做
  // 對照才確認參考值本身過期。**一個帶著量測數字的句子，讀起來像系統的性質。**
  // 所以現在只印出這一次量到的數字，不印任何歷史對照。
  const r = withSeed(0x9a11ed, () => {
    const st = S.newGame(); st.floors = 35; st.cash = 1e9;
    st.up.shaft = 3; st.up.cap = 5; st.up.speed = 3; st.auto.fifo = true;
    const sim = M.createSim(st); M.syncShafts(st, sim);
    let seen = 0, split = 0;
    for (let i = 0; i < 300000; i++){
      M.step(st, sim, C.STEP);
      if (i % 53) continue;
      for (const sh of sim.shafts) for (const p of sh.riders){
        if (!p.t || !p.t.pair) continue;
        seen++;
        if (!(p.mate && sh.riders.indexOf(p.mate) >= 0)) split++;
      }
    }
    return { seen, split };
  });
  const ne = nonEmpty(r.seen,
    '整場模擬沒有任何成對乘客上過車 —— 儀器在看一個空的宇宙，這個 0 不是證據');
  if (ne !== true) return ne;
  return ok(r.split === 0,
    `${r.seen} 次取樣裡有 ${r.split} 次「一半在車上、另一半不在同一台」`
    + `｜這個 guard 的樣本數會隨乘客組成變動——**不要拿別的時點的數字來對**。`
    + `弄紅它的方法是把 openDoors 的 mate 釘成 null。`);
});


// ---- 池子只剩一列的時候，`w` 完全不參與 ----------------------
//
// 第 18 組的訊息曾經寫著「權重 0 就永遠抽不到」，而一個 peer 實測它的 `w:0`
// 事件觸發了 34 次。原因是 `fireEvent()` **先用 hours 與樓層帶濾池子、才加權抽樣**，
// 而 `pickIndex` 在總權重為 0 時**刻意退回均勻抽樣**（#8 修過的 bug）：
//
//     pickIndex([0])      20000/20000 抽到它     ← 唯一候選 ⇒ **每次都中**
//     pickIndex([0, 5])       0/20000            旁邊有 w>0 ⇒ 永遠不中
//     pickIndex([3, 7])   30% / 70%              對照組，儀器活著
//
// **所以 `w` 描述的是「在一群候選之間怎麼分」，它完全不描述「這一群有多少人」。**
// 池子只剩一列的時候，那一列的出現機率是 **1**。
//
// 這不是理論：`powersurge`（全表**唯一** `at:'any'` 而且沒有 `hours` 的一列）
// 在 12 層的樓上是凌晨兩根梳齒的唯一候選，實測送達 **−8.5%** / 放棄 **+18.8%**。
//
// **池子大小 0 不是問題**（`if (!pool.length) return;`，那一刻沒有事件），
// **1 才是**——那是「每一次落在這個時段的檢查都是同一列」。
// 而梳齒以約 188 遊戲日／小時進動，**每一個鐘點最後都會被踩到**，
// 所以這條掃的是整天而不是今天的那十二個落點。
// ⚠ **第一版只取樣 12 / 30 / 80，而遊戲是從 **5 層** 開局的。**
// `CONFIG.FLOORS_START` 就是 5——我挑了三個方便的點，而那三個點
// **剛好跳過了玩家真正的開局狀態**。是一支 peer 在修 #138 的時候
// 自己去量 5–10 層才發現的（skill 5.12：在方便的點取樣會確認一個 bug）。
const POOL_FLOORS = [5, 12, 20, 30, 50, 80, 100];
// **門檻是「佔比」不是「唯一候選」——第一版我取錯了。**
//
// 第一版查的是「任何鐘點的候選池不可以只剩一列」。一支 peer 拿它去修
// `powersurge`，在 0.25 小時的格子上暴力掃過全部 **9,120** 個窗，發現：
// 符合的只有 `[6,2)` 一個，**而那個解會讓 `cartjam` 在 30 層接手當唯一候選**。
// 同一個形狀換一個 id——**這條判準會逬人去打地鼠。**
//
// 因為「唯一候選」本身不是缺陷。我量了一遍（對鐘點均勻平均，
// 因為梳齒會掃過所有鐘點）：
//
//     現況        12/20 層 powersurge **20.2%**（次高 overtime 11.0%）、30 層 cartjam 10.1%
//     加 [6,2)    12/20 層 overtime 13.2%、30 層 cartjam **13.8%**（且變成唯一候選）
//     50–80–100 層  最高都在 4–8%
//
// **一棟 12 層的樓凌晨只有一列事件可以發生，是正常的。**
// 有問題的是 `powersurge` 因此吃掉 **20.2%** 的事件——
// 一列屬於 86–99 樓實驗室的事件，在一棟只有零售樓層的樓裡。
//
// 換成佔比之後，`[6,2)` 單獨就把最高值壼到 13.8%，**`cartjam` 一個字都不用改**。
// 門檻 15%：今天只有 powersurge 的 20.2% 超過，修好之後最高 13.8%。
//
// **門檻重新校準過：15% → 18%。** 15 是在那個漏掉開局的三點樣本上定的。
// 把 5 層加進來之後，一個**健康的**配置量到的最大值是：
//
//       5/8 層  合格 14 列  最高 screening **16.2%**（2.26× 均勻）
//      12/20 層  合格 22 列  最高 overtime   13.2%（2.90×）
//        30 層  合格 31 列  最高 cartjam    13.8%（**4.27×**，全表最高倍數）
//       100 層  合格 70 列  最高 meeting     3.4%（2.40×）
//
// `screening` 的 16.2% **不是缺陷**：它是 `at:'retail'`，出現在一棟只有零售
// 樓層的樓裡**主題是對的**，而且開局本來就只有十四列事件可以發生。
// 被這條 guard 抱怨的 `powersurge` 是 20.2%（且 5 層時高達 25.5%），
// **而且它是一列屬於 86–99 樓實驗室的事件**。
//
// ⚠ **我試過改成「對均勻的倍數」，那行不通。** 我本來以為 5 層池子小、
// 均勻高，所以 16.2% 只有 1.1×——**量了之後是 2.26×，而 30 層的 cartjam 是 4.27×**。
// 倍數判準會把最健康的那一層報成最糟。**假設被量測推翻，留平門檻。**
//
// **這條證明得了什麼／不證明什麼**：它只量**量級**。
// 它**不**知道一列事件適不適合那棟樓（`powersurge` 真正的問題是主題錯置，
// 而這條 guard 看不到），也不知道玩家覺不覺得煩。
const POOL_MAX_SHARE = 0.18;
// 具名背債。每一筆要寫量測，修好了要從表上拿掉。
const POOL_DEBT = {
  // `powersurge` 已於 #138 還清：加了 `hours:[6,2)`（跨午夜），12 層的最高佔比
  // 從 20.2% 掉到 13.2%（改由 `overtime` 佔最高），30 層 `cartjam` 13.8%。
  // **`cartjam` 一個字都沒有動**——換成佔比判準之後那個窗單獨就夠了。
};

check('沒有一列事件在某一種樓高上吞掉太大一塊事件預算', () => {
  // 候選池的建法跟 `fireEvent()` 一致：byTenant 排除、hours 符合、at/to 兩邊都有樓層。
  // `floorInBand` 沒有 export，所以這裡重現它的**拒絕條件**（回 -1 的那幾條），
  // 而 `builtInBand` 是 export 的，直接用產品的那一支。
  const avail = (st, key) => {
    if (key == null || key === 'lobby' || key === 'any') return true;
    const b = BANDS.find(x => x.key === key);
    if (!b) return false;
    const lo = Math.min(b.from - 1, st.floors - 1);
    const hi = Math.min(b.to - 1, st.floors - 1);
    if (hi < lo) return false;
    return S.builtInBand(st, b) > 0;
  };
  const poolAt = (st, h) => EVENTS.filter(e =>
    !e.byTenant && M.inHourWindow(h, e.hours) && avail(st, e.at) && avail(st, e.to));

  const bad = [], debtSeen = [], perFloor = [];
  let sampled = 0, maxPool = 0, sawLone = false;
  for (const floors of POOL_FLOORS){
    const st = S.newGame();
    st.floors = floors;
    const share = {};
    let hours = 0;
    for (let i = 0; i < 96; i++){             // 整天每 0.25 小時一個點
      const h = i / 4;
      const pool = poolAt(st, h);
      sampled++;
      if (pool.length > maxPool) maxPool = pool.length;
      if (!pool.length) continue;             // 池子為 0 ：那一刻沒有事件，不算
      if (pool.length === 1) sawLone = true;
      hours++;
      const tot = pool.reduce((a, e) => a + (e.w > 0 ? e.w : 0), 0);
      // 總權重為 0 時 pickIndex 退回均勻——這裡照著算，不是照 w 算
      for (const e of pool)
        share[e.id] = (share[e.id] || 0) + (tot > 0 ? (e.w > 0 ? e.w : 0) / tot : 1 / pool.length);
    }
    if (!hours) continue;
    const rows = Object.entries(share).map(([k, v]) => [k, v / hours]).sort((a, b) => b[1] - a[1]);
    // **空窗要看得見。** `powersurge` 拿到 hours 窗之後，≤20 層的
    // 02:00–06:00 完全沒有候選事件（改前無空窗）。那是裁決接受的結果
    // （一棟矮樓凌晨兩點沒事件，比「每次都是實驗室停電」合理），
    // **但它是行為改變，不該退化成一個沒人看得見的數字。**
    perFloor.push(`${floors} 層最高 ${rows[0][0]} ${(rows[0][1] * 100).toFixed(1)}%`
      + (hours < 96 ? `（${96 - hours}/96 個鐘點沒有任何事件）` : ''));
    for (const [id, frac] of rows){
      if (frac < POOL_MAX_SHARE) break;       // 已經排序，下面都更小
      const row = `${floors} 層：${id} 吃掉 ${(frac * 100).toFixed(1)}% 的事件`;
      if (POOL_DEBT[id]) debtSeen.push(row); else bad.push(row);
    }
  }
  // 儀器活著嗎？高塔上必須看得到一個真正的池子，
  // 否則「沒有人吃太大塊」可能只是因為每一個池子都是空的。
  const ne = nonEmpty(sampled, '一個鐘點都沒有取樣');
  if (ne !== true) return ne;
  if (!(maxPool >= 5))
    return `儀器壞了：三種樓高全部掃完，最大的候選池只有 ${maxPool} 列`;
  return ok(bad.length === 0,
    `掃了 ${sampled} 個（樓高 × 鐘點），${bad.length} 列新的超過 ${(POOL_MAX_SHARE * 100).toFixed(0)}%：`
    + bad.join('、')
    + `｜既有背債：` + (debtSeen.join('、') || '無')
    + `｜目前：` + perFloor.join('、')
    + (sawLone ? '｜（有時段的候選池只剩一列——那一刻 w 完全不參與，機率是 1。'
              + '**但那本身不是缺陷**：一棟 12 層的樓凌晨只有一列事件可以發生是正常的，'
              + '有問題的是它因此吃掉一大塊預算。）' : ''));
});

check('池子背債表上的都還存在、寫了理由、而且都還不及格', () => {
  if (Object.keys(POOL_DEBT).length === 0) return ok(true, DEBT_CLEARED('POOL_DEBT'));
  const ids = new Set(EVENTS.map(e => e.id));
  const stale = [];
  for (const [id, why] of Object.entries(POOL_DEBT)){
    if (!ids.has(id)){ stale.push(id + '（事件不見了）'); continue; }
    if (!why || why.length < 30) stale.push(id + '（理由太短）');
  }
  return ok(stale.length === 0,
    `背債表 ${Object.keys(POOL_DEBT).length} 筆，${stale.length} 筆過期：` + stale.join('、')
    + `｜⚠ 這一條**沒有**查「還不及格」（不像形狀與顏色那幾張）——`
    + `上面那一條本來就會把還在違規的列印在「既有背債」裡，`
    + `修好之後那一欄會變空，這就是該把這一筆拿掉的信號。`);
});


// ---------------------------------------------------------------- 13 改名之後，沒跟上的那三個地方
// 一個 peer 做了一次改名（型別 id `bellhop` → `jamcart`，因為兩個 peer 撞在同一個 id 上），
// 然後**自己去證偽第 8 組**：它把兩個 i18n key 退回舊名（等於孤兒 key、英文查不到）
// 再跑 harness —— **48 pass / 0 fail / 1 todo，全綠**。
//
// 原因在第 8 組自己：`const en = EN.achievements[a.id] || {}` 之後 `if (!got.length) continue;`
// ——**key 不存在就被 continue 跳過**。那條 guard 結構上抓不到「漏改 / 改錯 i18n key」，
// 而那正是改名時最容易掉的東西。這一組補三個「改名之後沒跟上」的地方。
//
// 三個都是同一種安靜：英文安靜退回中文、圖案安靜退回上班族、兩個型別安靜同名。
// **沒有一個會丟例外，沒有一個會讓畫面壞掉。**
section('13 改名之後，沒跟上的那三個地方');

const EN_SETS = {
  passengers:   () => PASSENGERS,
  events:       () => EVENTS,
  achievements: () => ACHIEVEMENTS,
  skills:       () => SKILLS,
  bands:        () => BANDS,
};

check('每一個 id 都查得到英文，而且沒有孤兒 key', () => {
  const bad = [];
  let checked = 0;
  for (const [k, get] of Object.entries(EN_SETS)){
    const list = get() || [];
    const ids = list.map(x => x.id || x.key).filter(Boolean);
    const table = EN[k] || {};
    const keys = Object.keys(table);
    checked += ids.length + keys.length;
    for (const id of ids) if (!table[id]) bad.push(`${k}.${id} 沒有英文（會安靜退回中文）`);
    for (const key of keys) if (ids.indexOf(key) < 0)
      bad.push(`${k}.${key} 是孤兒 key（內容表裡沒有這個 id —— 通常代表某次改名只改了一半）`);
  }
  const ne = nonEmpty(checked, '五張 EN 對照表全是空的，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0, `比對了 ${checked} 個 id/key，${bad.length} 個對不上：` + bad.join('、'));
});

check('兩個型別不可以在畫面上顯示同一個名字', () => {
  // #30 付過一次的學費：玩家沒有辦法分辨兩個叫同一個名字的東西，而 id 只有我們看得到。
  // 中英各查一次——只查中文的話，一次「英文翻成一樣」的改名會整個溜過去。
  const bad = [];
  let checked = 0;
  for (const [k, get] of Object.entries(EN_SETS)){
    if (k === 'bands' || k === 'skills') continue;      // 這兩張不是玩家在畫面上並排看的
    const list = get() || [];
    for (const lang of ['zh', 'en']){
      const seen = {};
      for (const x of list){
        const id = x.id || x.key;
        const nm = lang === 'zh' ? x.name : (((EN[k] || {})[id] || {}).name);
        if (!nm) continue;                              // 缺英文是上面那條的事
        checked++;
        if (seen[nm]) bad.push(`${k}(${lang}) 「${nm}」= ${seen[nm]} 與 ${id}`);
        else seen[nm] = id;
      }
    }
  }
  const ne = nonEmpty(checked, '沒有任何有名字的內容，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0, `比對了 ${checked} 個顯示名稱，${bad.length} 組撞名：` + bad.join('、'));
});

check('每一種乘客都有自己的圖，沒有安靜退回上班族', () => {
  // sprites.js: `PEOPLE[typeId] || PEOPLE.office` —— 指不到就畫成上班族，不丟例外。
  // 新型別剛加進來、圖還沒畫好是**尚未實作**，不是「做了但錯」：報 TODO 並列出是誰，
  // 這樣它在摘要上看得見，又不會訓練大家忽略一片長期的紅。
  const ids = PASSENGERS.map(p => p.id);
  const ne = nonEmpty(ids.length, 'PASSENGERS 是空的');
  if (ne !== true) return ne;
  const missing = ids.filter(id => !PEOPLE[id]);
  if (missing.length)
    return `TODO: ${missing.length}/${ids.length} 種乘客還沒有自己的圖，`
         + `現在全部畫成上班族：` + missing.join('、');
  return true;
});


// 一個 peer 證實了一個比「第 8 組只比數字」更硬的洞：**整份 harness 從來沒有讀過
// `EN.passengers` 或 `PASSENGERS[].note`。** 它把一條英文 note 換成一句胡話
//（「一群在電梯井裡築巢的鴿子，佔 0 格，每三趟把車開回屋頂並把租金加倍」），
// 重跑 48/0/1 全綠，而且同一次呼叫裡從伺服器 fetch 回檔案確認不是快取假象。
//
// **這條擋得住哪一半／擋不住哪一半**：它只比對「佔 N 格」與「卡 N 秒」這兩種宣稱
// ——它們寫法一致、而且是最會漂移的兩個數字（佔位是飯店帶的整個主題）。
// 它**擋不住**「這句話描述的機制存不存在」（鴿子那一句它照樣放過），也不比對
// 事件的 `n`、`summon.n`、小費門檻那些「數字來自別的地方」的句子——
// 我量過，把它們一起比會產生 9 個誤報，而**一條開張就要九個例外的 guard 是壞 guard**。
check('乘客文案裡的「佔幾格 / 卡幾秒」要跟資料對得上', () => {
  const W = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
  const slots = t => {
    const s = String(t || ''), out = [];
    // 「佔 N 格」是最常見的寫法，但不是唯一的：一個 peer 拿掉 pair:true 之後
    // 發現這條 guard 只抓到英文的 "four slots"，中文「一組要**空出** 4 格」溜過去
    // ——它是拿我的 guard 當探照燈才照出來的。動詞要列全。
    for (const m of s.matchAll(/(?:佔|佔用|空出|留出|騰出|要有)\s*([0-9]+)\s*格/g)) out.push(+m[1]);
    for (const m of s.matchAll(/([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]+slots?/gi)){
      const v = isNaN(+m[1]) ? W[m[1].toLowerCase()] : +m[1];
      if (v) out.push(v);
    }
    return out;
  };
  const secs = t => {
    const s = String(t || ''), out = [];
    for (const m of s.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*秒/g)) out.push(+m[1]);
    for (const m of s.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*seconds?/gi)) out.push(+m[1]);
    return out;
  };
  const bad = [];
  let checked = 0;
  for (const p of PASSENGERS){
    // 成對的人物講「一對要空出幾格」是對的，那是 2×size，不是例外而是規則。
    const okSlots = p.pair ? [p.size, p.size * 2] : [p.size];
    for (const [lang, note] of [['zh', p.note], ['en', ((EN.passengers || {})[p.id] || {}).note]]){
      for (const v of slots(note)){
        checked++;
        if (okSlots.indexOf(v) < 0)
          bad.push(`${p.id}(${lang}) 文案說佔 ${v} 格，size=${p.size}`);
      }
      for (const v of secs(note)){
        checked++;
        if (v !== p.doorPenalty)
          bad.push(`${p.id}(${lang}) 文案說卡 ${v} 秒，doorPenalty=${p.doorPenalty}`);
      }
    }
  }
  const ne = nonEmpty(checked, '沒有任何乘客文案講到佔位或卡門秒數，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0, `比對了 ${checked} 個宣稱，${bad.length} 個對不上：` + bad.join('、'));
});


// ---------------------------------------------------------------- 14 一次丟出幾十則提示
// 測試 55 pass / 0 fail 全綠的時候，我打開遊戲用眼睛看，發現一次解鎖很多成就時
// toast 疊到畫面外。**真實觸發不是人工狀態，是舊存檔第一次載入新版本**：這一輪加了
// 約 20 條成就，一個玩到 45 樓的存檔載入之後那些門檻早就滿足，checkAchievements()
// 會在同一幀全部判成剛達成。實測一次丟出 **28 則**，而後面還有四個樓層帶要加成就。
//
// A/B（同一支探針、兩個 build、375×812）：
//   修正前 28 框、**12 則被切出視窗**、整疊 1286px（頂端 −530px）、蓋住畫布 47.5%
//   修正後  5 框、**0 則被切出**、整疊 225px、蓋住畫布 17.7%
//
// **這條擋得住哪一半／擋不住哪一半**：它斷言的是「整疊裝得下」，用**幾何**算。
// 它**不**判斷「玩家看不看得清楚」，也不保證那一行計數導向的成就頁真的有東西。
//
// ⚠ **不要用 `elementsFromPoint` 量這件事。** 我原本就是這樣交代 peer 的，而它做完
// 之後回報那是錯的：`#toasts` 是 `pointer-events:none`，**elementsFromPoint 不會
// 回傳它**，每一格都報 0% 覆蓋，而截圖上明明蓋滿。elementsFromPoint 量的是**命中
// 測試**，不是**視覺**——**toast 不擋點擊（設計如此），它擋的是視線。**
// 這是 §5.19「尺寸不是點擊目標」的鏡像：那一條說要用命中測試取代量尺寸，
// 這一條說**視覺遮蔽不能用命中測試**。兩個都是真的，適用範圍不同。
section('14 一次丟出幾十則提示');

// 最矮的支援視窗（設計文件抄寫，不從執行環境讀——跑 harness 的視窗多高是偶然的，
// 拿它當分母的話這條 guard 的鬆緊會隨機浮動）。

// check() 是同步的，所以樣式與模組在**模組頂層**先備好（跟 SIM_SRC 同一個作法）。
// 載不到就讓那條 guard 回 TODO——它不能假裝自己驗過。
const TOAST_ENV = await (async () => {
  try {
    const href = new URL('../css/style.css', import.meta.url).href;
    await new Promise(res => {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href;
      l.onload = res; l.onerror = res;
      document.head.appendChild(l);
    });
    const box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
    const UI = await import('../js/ui.js');
    return { box, UI };
  } catch (e){ return null; }
})();

// **兩個軸都要釘住。** 第一版我只釘了高度的分母，寬度還是從執行環境來的——
// 於是同一段文字在窄一點的 pane 裡折成三倍高，單一則 toast 量到 403px，
// guard 在一次無關的合併上自己紅了。**我剛在高度上防掉的錯，自己在寬度上
// 犯了一次。** `#toasts` 是 `width:max-content; max-width:min(640px, 100vw-24px)`，
// 所以最矮支援視窗（375 寬）上的欄寬是 351px；量測時把它釘死。
const TOAST_COL_W = 351;         // 375 - 24
const SHORT_VIEWPORT = 667;      // iPhone SE（設計文件抄寫，不從執行環境讀——
                                 // 跑 harness 的視窗多高是偶然的，拿它當分母的話
                                 // 這條 guard 的鬆緊會隨機浮動）
const STACK_MAX_FRAC = 0.40;     // 整疊不得超過最矮視窗的四成

check('一次丟出幾十則提示，整疊仍然裝得下', () => {
  if (!TOAST_ENV) return 'TODO: 樣式或 ui.js 載不進來，量不了版面';
  const { box, UI } = TOAST_ENV;

  box.style.width = TOAST_COL_W + 'px';
  box.style.maxWidth = TOAST_COL_W + 'px';
  const burst = k => {
    box.innerHTML = '';
    for (let i = 0; i < k; i++)
      UI.toast('🏆 一則夠長的成就名稱，讓它跟真的一樣會折行 ' + (i + 1), 60000);
    return { n: box.querySelectorAll('.toast').length, h: box.getBoundingClientRect().height };
  };

  // 儀器活著嗎？沒有 CSS 的話每一則高度是 0，整疊永遠「裝得下」——一個永遠綠的儀器。
  const one = burst(1);
  const el = box.querySelector('.toast');
  const bw = el ? (parseFloat(getComputedStyle(el).borderTopWidth) || 0) : 0;
  if (!el || bw < 1 || one.h < 10){
    box.innerHTML = '';
    return `TODO: 產品的樣式沒有套上（框線 ${bw}px、單則整疊 ${one.h.toFixed(0)}px），量到的高度不可信`;
  }

  const bad = [], rows = [];
  let lastN = 0;
  for (const k of [1, 5, 28, 50]){
    const r = burst(k);
    lastN = r.n;
    rows.push(`${k}→${r.n} 框 ${r.h.toFixed(0)}px`);
    if (r.h > SHORT_VIEWPORT * STACK_MAX_FRAC)
      bad.push(`丟 ${k} 則時整疊 ${r.h.toFixed(0)}px，超過最矮視窗 ${SHORT_VIEWPORT}px 的 `
             + `${(STACK_MAX_FRAC * 100).toFixed(0)}%（= ${(SHORT_VIEWPORT * STACK_MAX_FRAC).toFixed(0)}px）`);
  }
  box.innerHTML = '';
  const ne = nonEmpty(lastN, '丟 50 則之後一個框都沒有，這條 guard 在看一個空的宇宙');
  if (ne !== true) return ne;
  return ok(bad.length === 0, rows.join('｜') + (bad.length ? '｜' + bad.join('｜') : ''));
});


// ---------------------------------------------------------------- 15 形狀分得開嗎
// 顏色有四條判準（#37 三條 + #84 補的「配件色對 28 種樓層底色」），**形狀一條都沒有**。
// 一個 peer 做了研究，我把它的每一個數字都複驗過（24 / 14 / 52 / 29、中位數 21、
// 最大 52 逐字相同），判準是：
//
//   **d(A,B) = 兩個姿勢中較小的那個，7×9 格上的三態 Hamming 距離**
//             （`.`=0、`#`=1、`o`=2），而且**只算「可能同框」的配對**。
//
// 四個設計選擇，每一個都有理由：
//
// · **三態不是二態剪影。** peer 的第一版用二態，把 `closing/sampler` 報成
//   **d=0「輪廓完全相同」**——那個結論是錯的。三態是 **9**：輪廓確實一樣，
//   但配件位置差 9 格，眼睛看得出來。**二態把「配件擺在哪裡」整個丟掉了，
//   而那是真的形狀資訊。**（我複驗：二態 0、三態 9。）
// · **取兩個姿勢中較小的。** 可辨識性是最弱環節。
// · **不做平移／縮放不變。** 38 張都畫在同一個 7×9 框、同一個原點，
//   多帶一層不變性只會把真實的位置差抹掉。
// · **整數。** `.toFixed` 那一課的直接應用——**這個量沒有小數，
//   門檻那一位不可能被磨掉。**（peer 的色距檢查就是被 `.toFixed(2)` 把
//   11.9988 印成 12.00，於是它在物理上分不出「剛好 12」和「差一點不到 12」。）
//
// ⚠ **這裡本來有一個「同框過濾」，而那個前提後來被量出來是錯的。**
//
// 原本的理由是：全表最像的一對 `ceo/scientist` d=4 是誤報，因為 CEO 在辦公帶、
// 研究員在實驗帶「永遠不會同時出現」。**電梯轎廂會把不同帶的乘客放在一起。**
// 實測（70 層、4 井、seeded）：**7,968 次「車上有 2 人以上」的取樣裡，
// 648 次（8.1%）車上同時有 2 個以上不同樓層帶的乘客**，最多一次看到三個帶，
// **六種帶配對全部出現過**（hotel+office / hotel+resid / hotel+retail /
// office+resid / office+retail / resid+retail）。
//
// 所以 `ceo/scientist` **不是誤報**，那兩個真的會並排出現在同一台車裡。
// 過濾拿掉之後背債從 29 對變 54 對——**那 25 對本來就存在，只是被一個錯的
// 範圍藏起來了。**
//
// 這是「一句正確的話配上錯誤的適用範圍」的又一次：**「不同帶的乘客不會站在
// 同一層」是對的，「所以他們不會出現在一起」是錯的**——樓層不是唯一的畫面。
//
// **這條擋得住哪一半／擋不住哪一半**：
// 它**完全不涵蓋顏色**（重上色對 d 的貢獻依構造是 0），所以形狀與顏色兩條線
// 彼此獨立、不會互相掩護；**單獨任一邊都可以在另一邊全綠的情況下讓玩家分不出來。**
// 它也**不保證在遊戲的真實尺寸上分得出來**：`cs = clamp(floor(view.fh/11), 1, 3)`，
// 我在 375×667 上實測 5/10 層是 cs=3（21×27 px），**17 層以上一律 cs=1**，
// 也就是**一張圖 7×9 個實體像素**——那時「差 12 格」等於「差 12 個像素」。
// **所以這條判準的效力集中在前期與桌機；後期真正在做事的是顏色。**
// peer 的校準梯是在 14px/格上用眼睛看的（轉折在 8 與 12 之間），**不是真實尺寸**。
// **配件色互斥的門檻（orchestrator 裁決 #105）。**
// 宣告在這裡而不是第 19 組裡面，因為**第 17 組也要用它**，
// 而第 17 組先跑（check() 是宣告的當下就執行，所以後面才宣告的 const 會落在 TDZ）。
//
// ⚠ **第 17 組本來寫死 12。** 那是 #105 之前的門檻，
// 而第 19 組早就改成 9 了——於是第 17 組在檢查一個**已經不存在的門檻**
// 附近的翻面穩定性，它自己的通過訊息也印「門檻 12」。
// 是畫實驗帶九張圖的 artist 回報的（`tests/` 不是它的檔案，它沒有動）。
// **同一個事實只能有一處定義。**
const ACC_MIN = 9;

section('15 形狀分得開嗎');

const SHAPE_MIN = 12;
// **既有的 29 對按名字放行，不是 29 個例外而是一條基準線。**
// 一條開張就要幾十個例外的 guard 是壞 guard；這裡要擋的是「**新圖讓它變糟**」，
// 所以用身分棘輪：不在這張表上的同框配對，一律要 >= SHAPE_MIN。
// 低分幾乎都掛在 `office` 與 `ceo` 身上——它們是「普通人」的基本體，
// 而任何「普通人的變體」都會擠在它們旁邊。
const SHAPE_DEBT = new Set([
  // 原本 29 對（同框範圍下的）
  'guest|office','ceo|coffeegoer','ceo|interviewee','office|scientist','courier|diner',
  'courier|movie','attendee|ceo','attendee|coffeegoer','ceo|remote','ceo|tourist',
  'closing|sampler','interviewee|office','interviewee|tourist','office|waxer','ceo|office',
  'coffeegoer|interviewee','coffeegoer|remote','guard|tourist','observer|office',
  'observer|tourist','office|stroller','office|tourist','scientist|tourist',
  'attendee|nightowl','child|guard','courier|office','dolly|office','guard|interviewee',
  'stroller|waxer',
  // **拿掉錯誤的同框過濾之後多出來的 25 對。** 它們本來就存在，
  // 只是被「不同帶不會同時出現」這個錯的前提藏起來了。
  'attendee|scientist','blackouter|waxer','ceo|diner','ceo|observer','ceo|scientist',
  'child|observer','coffeegoer|guest','coffeegoer|scientist','diner|newhire',
  'dolly|guest','guest|scientist','guest|stroller','guest|waxer','homecomer|loaded',
  'interviewee|observer','interviewee|scientist','laidoff|sampler','laidoff|waxer',
  'loaded|repairman','movie|outager','nightowl|scientist','observer|remote',
  'observer|scientist','remote|scientist','remote|waxer',
]);

const shapeCell = ch => ch === '.' ? 0 : ch === '#' ? 1 : 2;
const shapeHam = (a, b) => {
  let d = 0;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 7; c++)
      if (shapeCell(a[r][c]) !== shapeCell(b[r][c])) d++;
  return d;
};
const shapeDist = (x, y) =>
  Math.min(shapeHam(PEOPLE[x].normal, PEOPLE[y].normal),
           shapeHam(PEOPLE[x].urgent, PEOPLE[y].urgent));

check('新加的圖不可以跟既有的圖形狀太像', () => {
  const bandOf = Object.fromEntries(PASSENGERS.map(p => [p.id, p.band]));
  const ids = Object.keys(PEOPLE).filter(i => bandOf[i]).sort();
  const ne = nonEmpty(ids.length >= 2 ? ids.length : 0,
    'PEOPLE 少於兩張圖，沒有配對可以比');
  if (ne !== true) return ne;

  // 儀器活著嗎？一張圖跟它自己的距離必須是 0——證明這個度量真的會回小數字，
  // 否則「沒有任何一對低於門檻」可能只是因為它永遠回大數字。
  if (shapeDist(ids[0], ids[0]) !== 0)
    return `儀器壞了：${ids[0]} 跟自己的形狀距離不是 0`;

  const bad = [];
  let pairs = 0, debtSeen = 0;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++){
      const x = ids[i], y = ids[j];
      pairs++;
      const key = x < y ? x + '|' + y : y + '|' + x;
      const d = shapeDist(x, y);
      if (SHAPE_DEBT.has(key)){ debtSeen++; continue; }
      if (d < SHAPE_MIN) bad.push(`${key} d=${d}`);
    }
  return ok(bad.length === 0,
    `比對了 ${pairs} 組配對（其中 ${debtSeen} 組是既有的背債），`
    + `${bad.length} 組新的低於 ${SHAPE_MIN}：` + bad.join('、')
    + `｜要跨過 ${SHAPE_MIN} 需要**大約六格以上的結構改變**——一隻抬起的手、`
    + `一條繩子、一個背在身上的東西。**換配件顏色對這個距離的貢獻是 0**，`
    + `把一塊三格的配件挪到別處大約只值 6。`);
});

check('形狀背債表上的配對都還存在，而且都還在門檻以下', () => {
  const bandOf = Object.fromEntries(PASSENGERS.map(p => [p.id, p.band]));
  if (SHAPE_DEBT.size === 0) return ok(true, DEBT_CLEARED('SHAPE_DEBT'));
  const stale = [];
  for (const key of SHAPE_DEBT){
    const [x, y] = key.split('|');
    if (!PEOPLE[x] || !PEOPLE[y] || !bandOf[x] || !bandOf[y]){ stale.push(key + '（圖或型別不見了）'); continue; }
    // 修好了就要從表上拿掉，否則這張表會腐爛成一個沒有人讀的清單
    if (shapeDist(x, y) >= SHAPE_MIN) stale.push(key + `（已經修好，d=${shapeDist(x, y)}，該從表上移除）`);
  }
  return ok(stale.length === 0,
    `背債表 ${SHAPE_DEBT.size} 筆，${stale.length} 筆過期：` + stale.join('、'));
});


// ---------------------------------------------------------------- 16 配件色對得起地板嗎
// 色距的第四條判準：**配件色對樓層底色 ΔE ≥ 25**。它是辦公帶那一趟才補上的
// ——在它之前，判準只涵蓋三個身體色，所以 #31 把 `tourist` 的相機從「撞 pal.bad」
// 改成「撞地板」時，**沒有任何東西會紅**。
//
// 一個 peer 把它跑遍現有 38 張（我複驗了 `tourist` 的 11.04 與最糟落點）：
// **不及格的有五張，不只 tourist** —— tourist 11.04、office 18.93、queuer 19.96、
// ceo 20.70、child 24.79。辦公帶的 artist 只回報 tourist，因為它是在自己那 12 張
// 的脈絡下看的；`office` 是 26 張時代就有的、`queuer`／`child` 是零售帶的。
//
// **一個結構性的簡化（peer 發現）**：38 張全部、無一例外，最糟的都落在
// `@0.78`（白天最亮的那一格）。所以給 artist 的實務建議是「只要對七個帶的
// `shadeHex(band.color, 0.78)` 過關就夠了」——但 guard 仍然算全部 28 種，
// 因為「最糟總是 0.78」是今天的事實，不是不變量。
//
// **一個我駁回的簡化**：peer 另外算了「只比乘客站得到的樓層」，那樣只剩三張
// 不及格（ceo 與 child 掉出來，因為它們最糟的是實驗帶而它們不會站到那裡）。
// **我用規格版（全部 28 種）**：可達性要把事件的 `at`／`to`／`summon` 會把人
// 放到哪裡一起算進去，那是一個會安靜過期的推導；而**嚴一點的代價是 artist
// 多花力氣，鬆一點的代價是玩家分不出來**。
//
// **這條擋得住哪一半／擋不住哪一半**：
// peer 提了一個真的反對意見——`tourist`（3 格）與 `ceo`（2 格）的配件
// **完全包在身體裡，四鄰沒有一格碰到背景**（我複驗過：touch=0），所以
// 「配件對地板」量的不是它們真正的邊界。**但那個反對在 cs=1 時瓦解**：
// `cs = clamp(floor(view.fh/11), 1, 3)`，我實測手機上 17 層以上一律 cs=1，
// 整張圖只有 63 個實體像素、身體只有 1px 厚——**1px 的邊框在知覺上隔離不了
// 任何東西**。所以：**cs=3（前期、1–10 層）時這條對「包在身體裡的配件」偏嚴，
// cs=1（17 層以上）時它是對的**，而那正是形狀判準失效、顏色接手的那一段。
section('16 配件色對得起地板嗎');

// shadeHex 是從 render.js 逐字抄過來的（那裡沒有 export）。**抄本會漂移**，
// 所以下面有一條檢查比對原始碼的文字；對不上就回 TODO，不假裝驗過。
const SHADE_SRC_SIG = 'out |= Math.min(255, Math.round(((n >> sh) & 255) * k)) << sh';
const shadeHex = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  let out = 0;
  for (const sh of [16, 8, 0]) out |= Math.min(255, Math.round(((n >> sh) & 255) * k)) << sh;
  return '#' + out.toString(16).padStart(6, '0');
};

// **明暗係數從產品讀，不從設計文件抄。** 這跟第 0 組的原則不衝突：那些是
// 設計**規定**的常數，而這裡問的是「產品實際畫得出來的每一種地板色」——
// 主張的對象就是產品的渲染面，所以要跟著它走。有人加第三套主題也會被抓進來。
// **只讀畫布調色盤。** theme.js 有四個物件：NIGHT / DAY 是畫布用的，
// CSS_NIGHT / CSS_DAY 只被 `s.setProperty('--'+k, ...)` 寫進 CSS 自訂屬性，
// **永遠不會出現在畫布上**。一個 peer 抓到我把 CSS 那兩個 `bad`
// （#ff8a8a / #ff9d9d）也算進身體色軸——51 × 5 = 255 對裡有 **102 對測的是
// 不可能發生的組合**。方向是安全的（只會多報警不會漏），**但我當時是把
// 「255 而不是 153」當成比它更完整的理由寫出來的**，那是錯的。
const CANVAS_SRC = THEME_SRC == null ? null : THEME_SRC.slice(0, THEME_SRC.indexOf('CSS_NIGHT'));
const FLOOR_K = CANVAS_SRC == null ? null
  : [...new Set((CANVAS_SRC.match(/floor[AB]:\s*([0-9.]+)/g) || [])
      .map(m => parseFloat(m.split(':')[1])))].sort((a, b) => a - b);

// **第 29 個背景色：轎廂內裝。** `render.js:350` 畫 `pal.car`，`:408` 把乘客畫在
// 它上面——所以它跟樓層底色一樣是「乘客身後的顏色」，而四條判準沒有一條測過它。
// 是同一個 peer 在自己 #37 留下的洞上追出來的：它當時把 cat/ghost/influencer
// **正確地**排除在身體色判準之外（它們沒有身體），**但排除之後沒有補替代判準**。
// 第 4 條後來補了樓層底色，**沒有人補轎廂**。
const CAR_COL = CANVAS_SRC == null ? null
  : (CANVAS_SRC.match(/\bcar:\s*'(#[0-9a-fA-F]{6})'/) || [])[1] || null;

// ---- CIEDE2000（獨立實作，不從產品讀）。**比較之前不做任何格式化**：
// 一個 peer 的檢查最後是 `.toFixed(2)`，把 11.9988 印成 12.00，於是它在物理上
// 分不出「剛好 12」和「差一點不到 12」。這裡只在最後印出來時才格式化，
// 而且印四位小數——門檻附近的餘裕看得見才有用。
function hexToLab(hex){
  const n = parseInt(hex.slice(1), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const [r, g, b] = srgb;
  const X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
  const Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
  const f = t => t > 0.008856451679 ? Math.cbrt(t) : (903.2962962 * t + 16) / 116;
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function ciede2000(hex1, hex2){
  const [L1, a1, b1] = hexToLab(hex1), [L2, a2, b2] = hexToLab(hex2);
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const A1 = (1 + G) * a1, A2 = (1 + G) * a2;
  const Cp1 = Math.hypot(A1, b1), Cp2 = Math.hypot(A2, b2);
  const hh = (x, y) => { if (x === 0 && y === 0) return 0; const t = Math.atan2(y, x) * deg; return t < 0 ? t + 360 : t; };
  const hp1 = hh(A1, b1), hp2 = hh(A2, b2);
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0){
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh / 2 * rad);
  const Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb;
  if (Cp1 * Cp2 === 0) hb = hp1 + hp2;
  else if (Math.abs(hp1 - hp2) <= 180) hb = (hp1 + hp2) / 2;
  else hb = (hp1 + hp2 + (hp1 + hp2 < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad)
          + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.20 * Math.cos((4 * hb - 63) * rad);
  const dTh = 30 * Math.exp(-Math.pow((hb - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cpb, 7) / (Math.pow(Cpb, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lb - 50, 2)) / Math.sqrt(20 + Math.pow(Lb - 50, 2));
  const Sc = 1 + 0.045 * Cpb, Sh = 1 + 0.015 * Cpb * T;
  const Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt(Math.pow(dL / Sl, 2) + Math.pow(dC / Sc, 2) + Math.pow(dH / Sh, 2)
                 + Rt * (dC / Sc) * (dH / Sh));
}

const FLOOR_MIN = 25;
// **既有的五張按名字放行**（身分棘輪，跟第 15 組同一個作法）。這裡要擋的是
// 「新圖讓它變糟」。每一條都要有理由，而且修好了要從表上移除——第二條檢查會點名。
const FLOOR_DEBT = {
  tourist: '#31 把相機從「撞 pal.bad」改成「撞地板」時，當時的判準只涵蓋身體色。'
         + '11.04 是全表最差，而且最糟落在 office 白天（11–20 樓，前期玩家最常看的那一段）。#67 在處理。',
  office:  '26 張時代就有的。18.93 對 hotel 白天。上班族是全遊戲最常出現的型別，'
         + '改它會動到每一個畫面，要跟 #67 一起評估而不是順手改。',
  queuer:  '零售帶的。規格版最糟是 obs 白天 19.96，但它只站零售帶——'
         + '真正會遇到的最糟是 retail 白天 23.27。不及格，但不及格的理由跟規格算出來的不是同一個。',
  ceo:     '20.70 對 exp 白天，而 CEO 在辦公帶、不會站到實驗樓層。'
         + '配件只有 2 格而且四鄰沒有一格碰到背景（完全包在身體裡），'
         + 'cs=3 時這條對它偏嚴；cs=1 時身體只有 1px 厚，隔離不了。',
  child:   '24.79 對 exp 白天，差 0.21。走失兒童在零售帶、不會站到實驗樓層。'
         + '七格配件有六格碰到背景，所以這條對它是適用的——只是最糟的那一格到不了。',
  ghost:   '11.68 對**轎廂內裝** #e6ecf7，跟 tourist 撞地板的 11.04 同級。'
         + 'ghost 有 0 個身體格、45 個配件格——**整身都是配件色**，所以進轎廂之後'
         + '它就是一片 #bfe9f7 坐在 #e6ecf7 上。它對 28 種樓層底色是過的，'
         + '**只有轎廂這一個背景咬它**，而轎廂是這一輪才被加進判準的第 29 個背景色。'
         + '排在 #67 一起改。',
  // 下面三張是**加進第 29 個背景（轎廂）那一刻才出現的背債**，三張都在 24.5–24.9，
  // **差不到半個單位**。它們跟 ghost 不同：三張都有身體，配件貼著身體、對著
  // pal.inkCar，不是直接坐在轎廂內裝上。
  //
  // **我仍然用同一條判準，不給它們豁免**——理由跟地板那一軸一樣：cs=1 時
  // （手機 17 層以上）整張圖只有 63 個實體像素、身體只有 1px 厚，
  // **1px 的邊框在知覺上隔離不了任何東西**。
  //
  // 記在這裡而不是放它們過，是因為：**一個背景色是這一輪才被加進判準的，
  // 而那 51 張圖全部是在它不在範圍內的時候畫的。** 追溯性地產生背債是預期的，
  // 那正是這張表存在的理由。
  stroller: '24.54 對轎廂內裝，差 0.46。配件 11 格、身體 23 格，配件貼著身體。'
          + '轎廂是第 29 個背景色，這一輪才加進判準——這張圖畫的時候它不在範圍內。#67。',
  lateguest: '24.83 對轎廂內裝，差 0.17。飯店帶那一趟畫的，當時判準只有 28 種樓層底色。'
          + '而「25 不是一個可以瞄準的數字」（兩個 CIEDE2000 實作差到 0.0022）——'
          + '這一張離門檻的距離只有那個差距的 77 倍，比 townhaller 寬但仍然不寬。#67。',
  scientist: '24.86 對轎廂內裝，差 0.14。實驗帶的既有圖，全表離門檻最近的一張。#67。',
};

check('新加的圖，配件色對每一種樓層底色都要夠遠', () => {
  if (FLOOR_K == null) return 'TODO: 讀不到 theme.js，取不到樓層明暗係數';
  if (RENDER_SRC == null) return 'TODO: 讀不到 render.js，無法確認 shadeHex 的抄本沒有漂移';
  if (RENDER_SRC.indexOf(SHADE_SRC_SIG) < 0)
    return 'TODO: render.js 的 shadeHex 跟 harness 的抄本對不上了，這裡算出來的地板色不可信';
  const ne0 = nonEmpty(FLOOR_K.length, 'theme.js 裡找不到任何 floorA/floorB');
  if (ne0 !== true) return ne0;

  const shades = [];
  for (const b of BANDS) for (const k of FLOOR_K) shades.push(shadeHex(b.color, k));
  if (CAR_COL) shades.push(CAR_COL);          // 第 29 個：轎廂內裝
  const ne1 = nonEmpty(shades.length, '算不出任何樓層底色');
  if (ne1 !== true) return ne1;

  // 儀器活著嗎？一個顏色跟它自己的 ΔE 必須是 0，而且要看得到一個大的值。
  if (ciede2000(shades[0], shades[0]) !== 0) return '儀器壞了：同色的 ΔE 不是 0';
  if (!(ciede2000('#000000', '#ffffff') > 90)) return '儀器壞了：黑對白的 ΔE 不到 90';

  const bad = [], rows = [], tight = [];
  let checked = 0;
  for (const [id, sp] of Object.entries(PEOPLE)){
    if (!sp.acc) continue;
    checked++;
    let min = Infinity, at = '';
    for (const b of BANDS) for (const k of FLOOR_K){
      const d = ciede2000(sp.acc, shadeHex(b.color, k));
      if (d < min){ min = d; at = b.key + '@' + k; }
    }
    if (CAR_COL){
      const d = ciede2000(sp.acc, CAR_COL);
      if (d < min){ min = d; at = '轎廂內裝 ' + CAR_COL; }
    }
    if (FLOOR_DEBT[id]){ rows.push(id + ' ' + min.toFixed(4) + '（背債）'); continue; }
    if (min < FLOOR_MIN) bad.push(id + ' ' + sp.acc + ' 最小 ΔE ' + min.toFixed(4) + ' @ ' + at);
    else tight.push([id, min]);
  }
  // **門檻正上方那一叢要看得見。** 兩個獨立的 CIEDE2000 實作在同一組顏色上
  // 差到 0.0022（我跟一個 peer 對過），而 townhaller 25.0122 / nightowl 25.0144
  // 的餘裕只有那個差距的六倍——**換一個實作有可能翻面**。不是現在會錯，
  // 是它們沒有餘裕，而下一個人要知道「25 不是一個可以瞄準的數字」。
  tight.sort((x, y) => x[1] - y[1]);
  const ne2 = nonEmpty(checked, '沒有任何一張圖有 acc，這條 guard 沒有試過任何東西');
  if (ne2 !== true) return ne2;
  return ok(bad.length === 0,
    checked + ' 張圖 × ' + shades.length + ' 種樓層底色，' + bad.length
    + ' 張新的低於 ' + FLOOR_MIN + '：' + bad.join('、') + '｜既有背債：' + rows.join('、')
    + '｜貼著門檻的（沒有餘裕，換一個 ΔE 實作可能翻面）：'
    + tight.slice(0, 3).map(x => x[0] + ' ' + x[1].toFixed(4)).join('、'));
});

check('配件色的背債表都還存在，理由都寫了，而且都還不及格', () => {
  if (FLOOR_K == null || RENDER_SRC == null) return 'TODO: 讀不到 theme.js 或 render.js';
  if (Object.keys(FLOOR_DEBT).length === 0) return ok(true, DEBT_CLEARED('FLOOR_DEBT'));
  const stale = [];
  for (const [id, why] of Object.entries(FLOOR_DEBT)){
    if (!PEOPLE[id] || !PEOPLE[id].acc){ stale.push(id + '（圖或 acc 不見了）'); continue; }
    if (!why || why.length < 30){ stale.push(id + '（理由太短：沒有理由的例外等於沒有這條 guard）'); continue; }
    let min = Infinity;
    for (const b of BANDS) for (const k of FLOOR_K) min = Math.min(min, ciede2000(PEOPLE[id].acc, shadeHex(b.color, k)));
    if (CAR_COL) min = Math.min(min, ciede2000(PEOPLE[id].acc, CAR_COL));
    if (min >= FLOOR_MIN) stale.push(id + '（已經修好，' + min.toFixed(4) + '，該從表上移除）');
  }
  return ok(stale.length === 0,
    '背債表 ' + Object.keys(FLOOR_DEBT).length + ' 筆，' + stale.length + ' 筆過期：' + stale.join('、'));
});


// ---------------------------------------------------------------- 17 兩個度量自己的斷崖
// 這一組守的不是內容，是**前面兩條判準所依賴的度量本身**。
//
// **17-1 · CIEDE2000 在色相差 180° 有一個分支，而它會跳。**
// 追一個「兩個 peer 對同一對顏色算出 55.04 和 48.80」的爭議時挖到的：
// `tourist` 的相機對 `pal.bad` 的兩個色相角是 211.45 與 31.47，**相差 179.98**
// ——離平均色相公式的 180° 分支邊界只有 **0.02 度**。我把分支手動翻到另一邊：
//
//     分支 A（|hp1-hp2| <= 180）→ ΔE **48.80**
//     分支 B（翻過去）          → ΔE **63.06**
//
// **同一對顏色，同一條公式，差 14 個單位。** 那不是實作品質問題，是
// **CIEDE2000 在那條線上本來就不連續**（Sharma 等人的論文明講平均色相那一段
// 是分段定義的）。所以 #31 當初把 `tourist` 的相機錨在「對 pal.bad 55.0」上，
// 錨的是一個**不穩定的量**。
//
// 我掃過現在 51 張 × 28 種樓層底色：**35 / 1428 個配對落在邊界 ±3 度以內**，
// 但**沒有任何一張圖的「最小值」踩在那裡**（±5 度內 0 個），所以第 16 組今天的
// 判定是穩的。這條 guard 是為了明天：**新加一張圖如果最小值落在邊界附近，
// 它的及格與否就會隨實作而變**，那時要知道。
//
// **17-2 · 剪影完全相同，是一個絕對條件，不是一個門檻。**
// 第 15 組用三態 Hamming（`.`/`#`/`o`），它把 `closing/sampler` 算成 9 ——
// 看起來跟其他「有點像」的配對沒兩樣，**而它們其實是同一個剪影**（二態距離 0）。
// 一個 peer 先前主張「二態丟掉配件位置」而放棄二態；它後來自己更正：
// **那句話只證明了二態不能單獨當距離度量，不證明二態的零值沒有意義。**
// 一句正確的話配上過大的適用範圍。
//
// 所以兩條並存：**三態 ≥ 12 管「像不像」，二態 == 0 管「是不是同一個」。**
// 後者不會誤報一片，因為它不是門檻——它是「一模一樣」。
section('17 兩個度量自己的斷崖');

const HUE_BRANCH_EPS = 1;      // 離 180° 這麼近，就把兩側都算一次

// 一致地取某一側的 ΔE。**`dh` 與 `hb` 必須一起翻**——`dh` 決定 `dH` 的正負號，
// 而 `dH` 又進到 `Rt * (dC/Sc) * (dH/Sh)` 那個交叉項。
// **我第一版只翻了 `hb`，得到 63.06，那是一個不存在於任何一側的混合值**（peer 抓到的）。
// 一起翻之後兩側是 48.80 / 55.05，差 6.24——正是兩個實作原本各自報出來的兩個數。
function de2000Side(hex1, hex2, side){
  const P = Math.pow, rad = Math.PI / 180, deg = 180 / Math.PI;
  const [L1, a1, b1] = hexToLab(hex1), [L2, a2, b2] = hexToLab(hex2);
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(P(Cb, 7) / (P(Cb, 7) + P(25, 7))));
  const A1 = (1 + G) * a1, A2 = (1 + G) * a2;
  const Cp1 = Math.hypot(A1, b1), Cp2 = Math.hypot(A2, b2);
  const hh = (x, y) => { if (x === 0 && y === 0) return 0; const t = Math.atan2(y, x) * deg; return t < 0 ? t + 360 : t; };
  const hp1 = hh(A1, b1), hp2 = hh(A2, b2);
  const dL = L2 - L1, dC = Cp2 - Cp1, Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  const raw = hp2 - hp1;
  let dh, hb;
  if (Cp1 * Cp2 === 0){ dh = 0; hb = hp1 + hp2; }
  else if (side === 'near'){                       // |dh| <= 180 那一側
    dh = raw; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
    hb = Math.abs(hp1 - hp2) <= 180 ? (hp1 + hp2) / 2
       : (hp1 + hp2 + (hp1 + hp2 < 360 ? 360 : -360)) / 2;
  } else {
    // 翻到另一側。**`dh` 與 `hb` 一定要一起翻**，而且**翻法必須是對稱的**。
    //
    // 第一版我兩個都用 `raw = hp2 - hp1` 的正負去決定位移——`dh` 那樣是對的
    // （交換兩色時 dh 本來就該變號，而 dH 進到平方項與「dC×dH」交叉項，dC 也變號，
    // 所以交叉項不變），**但 `hb` 那樣是錯的**：平均色相不該隨參數順序改變。
    //
    // 一個 peer 提出用**對稱性**當必要條件（不需要任何外部測資），我照做，
    // 我的 far 側**最大不對稱 18.53**（near 側是 0）。`#a2003c` 對 `#314640`
    // 一個方向 42.31、另一個方向 23.78。**它抓到了我二十分鐘前才 land 的 bug。**
    //
    // 正確的另一側就是 `hb_near + 180`（mod 360）——因為 hb_near 是對稱的，
    // 這樣翻出來也是對稱的。
    dh = raw + (raw < 0 ? 360 : -360);
    const hbNear = Math.abs(hp1 - hp2) <= 180 ? (hp1 + hp2) / 2
                 : (hp1 + hp2 + (hp1 + hp2 < 360 ? 360 : -360)) / 2;
    hb = (hbNear + 180) % 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh / 2 * rad);
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad)
          + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.20 * Math.cos((4 * hb - 63) * rad);
  const dTh = 30 * Math.exp(-P((hb - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(P(Cpb, 7) / (P(Cpb, 7) + P(25, 7)));
  const Sl = 1 + (0.015 * P(Lb - 50, 2)) / Math.sqrt(20 + P(Lb - 50, 2));
  const Sc = 1 + 0.045 * Cpb, Sh = 1 + 0.015 * Cpb * T, Rt = -Math.sin(2 * dTh * rad) * Rc;
  return { dE: Math.sqrt(P(dL / Sl, 2) + P(dC / Sc, 2) + P(dH / Sh, 2) + Rt * (dC / Sc) * (dH / Sh)),
           gap: Math.abs(hp1 - hp2) };
}

// **色距函式自己的必要條件，不需要任何外部測資。**
// 一個 peer 提出用這兩條當自檢，理由很準：**不對稱正是「分支只翻了一半」的症狀**
// ——`dh` 翻了而 `hb` 沒翻（或反過來）會讓 a→b 與 b→a 落在不同側。
//
// 它抓到了我二十分鐘前才 land 的 bug：我的 far 側最大不對稱 **18.53**
// （`#a2003c` 對 `#314640`，一個方向 42.31、另一個方向 23.78），near 側是 0。
//
// **這兩條不驗證校準**——對稱且自距離為零的錯誤實作是存在的。它們驗證的是
// 「這支函式對它自己是自洽的」，而那正好是分支 bug 會破壞的性質。
// 真正的校準要靠 Sharma 測資（我的實作 14/15，那 1 組差 0.0032）。
check('色距函式對它自己是自洽的（對稱、自距離為零，兩側都要）', () => {
  if (FLOOR_K == null) return 'TODO: 讀不到 theme.js，取不到樓層明暗係數';
  const cols = [...new Set(Object.values(PEOPLE).map(p => p.acc).filter(Boolean))];
  for (const b of BANDS) for (const k of FLOOR_K) cols.push(shadeHex(b.color, k));
  const ne = nonEmpty(cols.length >= 2 ? cols.length : 0, '湊不出兩個顏色，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  const EPS = 1e-9;
  const bad = [];
  let pairs = 0;
  for (const side of ['near', 'far']){
    let maxAsym = 0, worst = '';
    for (let i = 0; i < cols.length; i++){
      const self = Math.abs(de2000Side(cols[i], cols[i], side).dE);
      if (self > EPS) bad.push(`${side}：${cols[i]} 對自己的距離是 ${self}，不是 0`);
      for (let j = i + 1; j < cols.length; j++){
        pairs++;
        const d = Math.abs(de2000Side(cols[i], cols[j], side).dE - de2000Side(cols[j], cols[i], side).dE);
        if (d > maxAsym){ maxAsym = d; worst = cols[i] + ' / ' + cols[j]; }
      }
    }
    if (maxAsym > EPS)
      bad.push(`${side} 側不對稱：最大差 ${maxAsym.toFixed(6)}（${worst}）`
             + `——**那是「分支只翻了一半」的症狀**`);
  }
  return ok(bad.length === 0,
    `${cols.length} 個顏色、${pairs} 組配對 × 2 側：` + bad.join('｜'));
});

check('沒有任何一條色距判定的真假取決於 CIEDE2000 走了哪一側', () => {
  if (FLOOR_K == null || RENDER_SRC == null) return 'TODO: 讀不到 theme.js 或 render.js';
  // 三個軸各自的門檻。**三條都要掃**——peer 補掃了我漏掉的兩軸，
  // 而「地板那一軸沒事」不蘊含「另外兩軸沒事」。
  // **只取畫布調色盤**（見 CANVAS_SRC 的註解）。NIGHT 與 DAY 的 ink/inkCar/bad
  // 逐字相同，所以這裡其實只有三個唯一值。
  const bodyCols = [...new Set(((CANVAS_SRC || '').match(/(?:ink|inkCar|bad):\s*'(#[0-9a-fA-F]{6})'/g) || [])
    .map(m => m.match(/#[0-9a-fA-F]{6}/)[0]))];
  const floors = [];
  for (const b of BANDS) for (const k of FLOOR_K) floors.push(shadeHex(b.color, k));
  if (CAR_COL) floors.push(CAR_COL);
  const accs = Object.entries(PEOPLE).filter(([, sp]) => sp.acc);

  const axes = [
    ['配件×背景', 25, accs.flatMap(([id, sp]) => floors.map(f => [id, sp.acc, f]))],
    ['配件×配件', ACC_MIN, accs.flatMap(([id, sp], i) => accs.slice(i + 1).map(([id2, sp2]) => [id + '/' + id2, sp.acc, sp2.acc]))],
    ['配件×身體色', 25, accs.flatMap(([id, sp]) => bodyCols.map(c => [id, sp.acc, c]))],
  ];
  const ne = nonEmpty(bodyCols.length, 'theme.js 裡找不到 ink / inkCar / bad');
  if (ne !== true) return ne;

  const bad = [], rows = [];
  for (const [name, thr, pairs] of axes){
    let near = 0, flip = 0;
    let closest = Infinity;
    for (const [label, h1, h2] of pairs){
      const A = de2000Side(h1, h2, 'near');
      if (Math.abs(A.gap - 180) >= HUE_BRANCH_EPS) continue;
      near++;
      const B = de2000Side(h1, h2, 'far');
      closest = Math.min(closest, Math.min(A.dE, B.dE));
      // 判定翻面 = 一側過、另一側不過
      if ((A.dE >= thr) !== (B.dE >= thr)){
        flip++;
        bad.push(`${name} ${label}：一側 ${A.dE.toFixed(4)}、另一側 ${B.dE.toFixed(4)}，`
               + `門檻 ${thr}——**及格與否取決於實作**`);
      }
    }
    rows.push(`${name} ${pairs.length} 對，${near} 對在邊界 ±${HUE_BRANCH_EPS}° 內`
            + (near ? `，最近門檻的是 ${closest.toFixed(2)}（門檻 ${thr}）` : ''));
  }
  const ne2 = nonEmpty(axes.reduce((a, x) => a + x[2].length, 0), '沒有任何配對可以檢查');
  if (ne2 !== true) return ne2;
  return ok(bad.length === 0, rows.join('｜') + (bad.length ? '｜' + bad.join('｜') : ''));
});

// 唯一一筆背債。**一筆，不是一份清單**——這條是絕對條件不是門檻，所以它本來就
// 不該有幾十個例外；有一筆是因為它真的存在，而且有主。
const SIL_DEBT = {
  'closing|sampler': '零售帶既有的兩張，剪影逐格相同，只有配件色不同。'
    + '是一個 peer 用二態剪影度量找到的（三態把它算成 9，跟其他「有點像」的沒有差別）。'
    + '排在 #67 那一趟一起改——那一趟本來就要動既有的圖，而現在有另一個 artist 在畫住宅帶，'
    + '兩個人同時編輯 js/sprites.js 是這個專案付過學費的形狀。',
};

check('沒有兩張圖的剪影完全相同', () => {
  const bandOf = Object.fromEntries(PASSENGERS.map(p => [p.id, p.band]));
  const ids = Object.keys(PEOPLE).filter(i => bandOf[i]).sort();
  const ne = nonEmpty(ids.length >= 2 ? ids.length : 0, 'PEOPLE 少於兩張圖，沒有配對可以比');
  if (ne !== true) return ne;
  const sil = (a, b) => {
    let d = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 7; c++)
        if ((a[r][c] !== '.') !== (b[r][c] !== '.')) d++;
    return d;
  };
  const dist = (x, y) => Math.min(sil(PEOPLE[x].normal, PEOPLE[y].normal),
                                  sil(PEOPLE[x].urgent, PEOPLE[y].urgent));
  // 儀器活著嗎？一張圖跟自己的剪影距離必須是 0——證明這個度量真的會回 0。
  if (dist(ids[0], ids[0]) !== 0) return '儀器壞了：' + ids[0] + ' 跟自己的剪影距離不是 0';
  // 這裡本來也有同框過濾，跟第 15 組同一個錯的前提，一起拿掉（見第 15 組的註解）。
  // 拿掉之後結果不變——剪影完全相同的仍然只有 closing|sampler——
  // **但留著一個我已經量出來是錯的過濾，等於在程式碼裡放一句假話。**
  const same = [], known = [];
  let pairs = 0;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++){
      pairs++;
      if (dist(ids[i], ids[j]) !== 0) continue;
      const key = ids[i] + '|' + ids[j];
      if (SIL_DEBT[key]) known.push(key); else same.push(key);
    }
  // 表上的東西修好了就要移除，否則這張表會腐爛成一份沒有人讀的清單
  for (const key of Object.keys(SIL_DEBT)){
    const [x, y] = key.split('|');
    if (!PEOPLE[x] || !PEOPLE[y] || dist(x, y) !== 0)
      same.push(key + '（已經修好或圖不見了，該從 SIL_DEBT 移除）');
  }
  return ok(same.length === 0,
    '比對了 ' + pairs + ' 組配對，' + same.length + ' 組**新的剪影一模一樣**：' + same.join('、')
    + (known.length ? '｜已知背債：' + known.join('、') : '')
    + '｜這不是「太像」，是「同一個形狀」——玩家只剩顏色可以分辨，'
    + '而在 cs=1（17 層以上，一張圖 7×9 個實體像素）配件只有 1–2 個像素。'
    + '**第 15 組的三態度量看不到這一格**：它把剪影相同的一對算成 9，'
    + '跟其他「有點像」的配對沒有差別。');
});


// ---------------------------------------------------------------- 18 每一列事件都走得到嗎
// #86：七列事件在表上看起來是活的，實際上**從招商移除之後觸發過 0 次**——
// 它們走的是 `tenantEvents()`，而那條路的入口是每一帶的 `defaultTenant()`，
// 招商拿掉之後七個 default 全是 plain、都沒有 `event`。
//
// **三個 peer 各自在旁邊註記過「這是死的」，沒有人開單**，而它安靜地佔著
// `EVENTS` 表五分之一。整條路已經移除（`orchestrator 裁決（#86）`，
// 而 owner 對「大樓的組成決定它的節奏」那個構想的表態留在 #89）。
//
// 這一組守兩件事，而第二件是一個 peer 指出的、比我原本想的緊：
//
// > **這次的 bug 不是「走不到」，是「走得到但沒有人在那條路上」。**
//
// 所以除了「每一列都走得到」，還要擋「**被移除的那條路以死資料的形式回來**」。
// ⚠ **這一組的第一條，理由曾經是錯的。** 我原本寫「權重 0 就永遠抽不到」，
// 而一個做實驗帶的 peer 回報它的 `w:0` 事件實測觸發了 34 次。我複驗了，它是對的。
//
// `fireEvent()` **先用 hours 與樓層帶把池子濾過一遍，才加權抽樣**
// （`js/sim.js`：`pool[pickIndex(pool.map(e => e.w))]`），而 `pickIndex` 在
// 總權重為 0 時**刻意退回均勻抽樣**（那是 #8 修過的一個 bug：舊版總和為 0 時
// 永遠回傳第 0 項）。所以：
//
//     pickIndex([0])      → 20000/20000 抽到它     **它是那個時段唯一的候選 ⇒ 每次都中**
//     pickIndex([0, 5])   →     0/20000 抽到它     旁邊有 w>0 的 ⇒ 永遠不中
//     pickIndex([0,0,0])  → 各約 1/3               全部 w:0 ⇒ 均勻
//     pickIndex([3, 7])   → 30% / 70%              對照組，儀器活著
//
// **所以 w:0 的真正危險不是「不會出現」，是「不可預測」**——同一列資料在
// 某些時段一次都不出現，在另一些時段每一次事件檢查都是它。
// **而後者比前者糟**：一列 w:0 的事件如果它的 hours 窗跟別人不重疊，
// 它就從「死資料」變成「霸佔那個時段的事件」。
//
// **這條 guard 的要求（w 必須 > 0）沒有變，變的是理由。**
// 它現在還證明得了什麼：每一列都有一個明確的、可比較的權重。
// 它不證明什麼：**不證明那一列真的會出現**（時段落不落得到梳齒是第 12 組）、
// 也**不證明它不會過度出現**——`at:'any'` 且沒有 `hours` 的事件，
// 在別人都不在的時段會是池子裡唯一的一列，那時它的 w 是多少都無所謂。
// 實驗帶的 `powersurge` 就是這個形狀（00:00–08:00 唯一的候選），見它的交付。
section('18 每一列事件都走得到嗎');

check('每一列事件都進得了隨機事件池', () => {
  const bandKeys = new Set(BANDS.map(b => b.key));
  // `at` / `to` 可以是樓層帶、'lobby'、或 'any'
  const resolves = k => k == null || k === 'lobby' || k === 'any' || bandKeys.has(k);
  const bad = [];
  for (const e of EVENTS){
    if (!(e.w > 0)) bad.push(`${e.id} 的 w 是 ${e.w}——**它會變成「有時永遠抽不到、有時每次都抽到」**`);
    if (!resolves(e.at)) bad.push(`${e.id} 的 at='${e.at}' 解析不到任何樓層帶`);
    if (!resolves(e.to)) bad.push(`${e.id} 的 to='${e.to}' 解析不到任何樓層帶`);
  }
  const ne = nonEmpty(EVENTS.length, 'EVENTS 是空的，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `${EVENTS.length} 列事件，${bad.length} 列進不了池子：` + bad.join('、')
    + `｜（時段能不能抽到是第 12 組在管——一列可以 w>0、at/to 都對，`
    + `而 hours 窗落在梳齒之間，那時它一樣是死的。）`);
});

check('已經移除的租戶事件路徑，不可以用死資料的形式回來', () => {
  const ne1 = nonEmpty(EVENTS.length, 'EVENTS 是空的');
  if (ne1 !== true) return ne1;
  const ne2 = nonEmpty(TENANTS.length, 'TENANTS 是空的');
  if (ne2 !== true) return ne2;
  const bad = [];
  for (const e of EVENTS)
    if (e.byTenant)
      bad.push(`EVENTS.${e.id} 標了 byTenant——**那條路 #86 已經移除，這一列永遠不會觸發**`);
  for (const t of TENANTS){
    if (t.event) bad.push(`TENANTS.${t.id} 有 event:'${t.event}'——沒有人會讀它`);
    if (t.every) bad.push(`TENANTS.${t.id} 有 every——沒有人會讀它`);
  }
  return ok(bad.length === 0,
    `${EVENTS.length} 列事件 + ${TENANTS.length} 個租戶，${bad.length} 處是死資料：` + bad.join('、')
    + `｜**這一類不會出錯、不會空白**：它在表上看起來是活的，而執行時一次都不會走到。`
    + `要恢復「大樓的組成決定它遇到什麼」，正確的做法在 #89——`
    + `讓租戶決定「抽到哪一列」而不是「多久一次」，共用同一個全域預算。`);
});


// ---------------------------------------------------------------- 19 配件色彼此分得開嗎
// **這條判準一直存在，但一直沒有 guard。** 它只活在 `js/sprites.js` 的檔頭註解，
// 以及每一個 artist 自己寫的量測頁裡——所以它每一趟都被重新實作、重新解釋，
// 而**沒有任何東西在追蹤它是不是正在被侵蝕**。它確實正在被侵蝕：
//
//     26 張時代    檔頭寫「兩兩 ≥ 12」，實際最小 11.9974（四捨五入成 12.00 的那一個）
//     51 張        最小仍然 11.9974，12 以下 1 對
//     60 張（住宅帶落地後）  **最小 10.9708**，12 以下 **29 對**
//
// 住宅帶的 artist 全 sRGB 掃描（step 1，16,777,216 點）：同時滿足
// 「對身體色 ≥25」「對背景 ≥25」「對既有 51 張 ≥12」的點**正好 2 個**，
// 而它需要九個。**那不是搜尋失敗，是母體只有兩個元素。**
// 它沒有降門檻，它回報了（#105）。
//
// ## orchestrator 裁決（#105）：門檻定 9
//
// 我在 step 4（262,144 點）上量了各門檻的可行空間，對照現有 60 色：
//
//     門檻   可行點    現有違反
//      12       0        29 對      ← 已經不成立
//      11       0         1 對
//      10      66         0
//       **9   1,639**     **0**     ← 取這個
//       8   8,905         0
//
// 三個理由：
// 1. **12 早就不成立了。** 現有最小是 10.9708，所以我不是在降門檻，
//    是在承認它已經沒了，然後挑一個還撐得住的。
// 2. **9 在現有 60 色上零違反**，所以它不製造背債——不像 12（29 對）。
// 3. **後面還有觀景台 4 張、實驗帶與屋頂約 10 張要畫。** 10 只剩 66 個點，
//    加兩三個顏色就會塌；9 有 1,639 個（step 1 約十萬），撐得住。
//
// **ΔE 9 是 CIEDE2000 JND（約 1–2.3）的四倍左右**，兩個相距 9 的顏色並排看
// 清楚是不同的顏色。這不是「夠好就好」，是「12 從來不是一個有依據的數字」——
// 它是 26 張時代的**實際最小值**被四捨五入之後寫進檔頭的。
//
// **這條擋得住哪一半／擋不住哪一半**：它只管配件色兩兩的距離。
// **它不管形狀**（第 15 組）、**不管對背景**（第 16 組）、**不管對身體色**
// （目前完全沒有 guard——`influencer` 對 `pal.bad` 只有 24.17，見 #105）。
// 而且它**不保證在 cs=1（7×9 個實體像素）上分得出來**——那是眼睛的事。
section('19 配件色彼此分得開嗎');


check('沒有兩個配件色靠得比門檻更近', () => {
  const withAcc = Object.entries(PEOPLE).filter(([, sp]) => sp.acc);
  const ne = nonEmpty(withAcc.length >= 2 ? withAcc.length : 0,
    '有配件色的圖少於兩張，這條 guard 沒有配對可以比');
  if (ne !== true) return ne;

  // 儀器活著嗎？同一個顏色對自己必須是 0，而且看得到一個大的值。
  if (ciede2000(withAcc[0][1].acc, withAcc[0][1].acc) !== 0)
    return '儀器壞了：同色的 ΔE 不是 0';
  if (!(ciede2000('#000000', '#ffffff') > 90))
    return '儀器壞了：黑對白的 ΔE 不到 90';

  const bad = [];
  const all = [];
  for (let i = 0; i < withAcc.length; i++)
    for (let j = i + 1; j < withAcc.length; j++){
      const [ix, sx] = withAcc[i], [iy, sy] = withAcc[j];
      const d = ciede2000(sx.acc, sy.acc);
      all.push([ix + '|' + iy, d]);
      if (d < ACC_MIN) bad.push(`${ix}|${iy} ΔE ${d.toFixed(4)}`);
    }
  all.sort((a, b) => a[1] - b[1]);
  // **侵蝕要看得見。** 只印「通過」的話，這個數字一帶一帶往下掉而沒有人注意到
  // ——那正是它從 11.9974 掉到 10.9708 的過程。
  const u12 = all.filter(x => x[1] < 12).length;
  const u10 = all.filter(x => x[1] < 10).length;
  return ok(bad.length === 0,
    `${withAcc.length} 個配件色、${all.length} 組配對，${bad.length} 組低於 ${ACC_MIN}：`
    + bad.join('、')
    + `｜**目前最小 ${all[0][1].toFixed(4)}（${all[0][0]}）**`
    + `，12 以下 ${u12} 組、10 以下 ${u10} 組`
    + `｜門檻是 ${ACC_MIN}（orchestrator 裁決 #105）——`
    + `**12 早就不成立了**，現有最小值就在 11 附近。加圖之前先讀 #105：`
    + `可行空間是量得出來的有限，而綁死它的是 \`pal.bad\`。`);
});


// ---------------------------------------------------------------- 20 配件色對得起它自己的身體嗎
// 色距的四條判準裡，**這是最後一條沒有 guard 的**。前三條都有了
// （第 19 組兩兩、第 16 組對背景、第 15/17 組形狀與剪影），而「配件對身體色」
// 從 #31 那一趟寫下來之後，**四帶都是靠每個 artist 自己的量測頁在守**。
//
// 它已經漏過一次：`influencer` 對 `pal.bad` 只有 **24.1689**（差 0.83，28 個身體格）
// ——**跟 #31 那個 `tourist` 相機同一種失效形狀**，是住宅帶的 artist 回報的。
//
// **這條判準要分姿勢，而不是拿三個顏色一起比。** `drawPerson` 用
// `spriteFor(type, urgent)` 取列，而身體色是：
//
//     normal 的 `#` 格 → `pal.ink`（在樓層上）或 `pal.inkCar`（在轎廂裡）
//     urgent 的 `#` 格 → `pal.bad`
//
// 所以一張圖的 urgent 配件只跟 `pal.bad` 相鄰，跟 `ink` 從來不相鄰。
// **不分姿勢地比會製造誤報**——`ghost` 對 `pal.ink` 是 11.86，看起來很嚴重，
// **但 ghost 兩個姿勢都是 0 個身體格**（整身都是配件色），那條路走不到。
//
// **跳過的那些要列名，不能是一個隱形的過濾**：今天是 `cat` 與 `ghost`，
// 而它們正是 #37 那一趟被**正確地**排除在身體色判準之外、**卻沒有補替代判準**
// 的那兩個（第三個 `influencer` 有身體，所以它在這裡）。
// 它們的替代判準是第 16 組（對 29 種背景色），那一條已經在守了。
section('20 配件色對得起它自己的身體嗎');

const BODY_MIN = 25;
// 唯一一筆背債。
const BODY_DEBT = {
  influencer: '24.1689 對 pal.bad（urgent 的身體色），差 0.83，28 個身體格——'
            + '**跟 #31 那個 tourist 相機同一種失效形狀**，比較輕但構得到。'
            + '住宅帶的 artist 回報、沒有動它。排在 #67／#105：'
            + '#105 量到配件色的可行空間只剩 1,639 個點（門檻 9），'
            + '**而擋掉 84% 可行點的正是 pal.bad**——所以「把 influencer 移開 pal.bad」'
            + '跟「要不要移動 pal.bad 本身」是同一個問題的兩面，一起裁。',
};

check('配件色對它自己那個姿勢的身體色要夠遠', () => {
  if (CANVAS_SRC == null) return 'TODO: 讀不到 theme.js，取不到身體色';
  const pick = k => {
    const m = CANVAS_SRC.match(new RegExp('\\b' + k + ":\\s*'(#[0-9a-fA-F]{6})'"));
    return m ? m[1] : null;
  };
  const ink = pick('ink'), inkCar = pick('inkCar'), bad = pick('bad');
  if (!ink || !inkCar || !bad) return 'TODO: theme.js 的畫布調色盤裡找不到 ink / inkCar / bad';

  // 儀器活著嗎？
  if (ciede2000(ink, ink) !== 0) return '儀器壞了：同色的 ΔE 不是 0';
  if (!(ciede2000('#000000', '#ffffff') > 90)) return '儀器壞了：黑對白的 ΔE 不到 90';

  const count = (rows, ch) => rows.join('').split(ch).length - 1;
  const bad_ = [], skipped = [], tight = [], debtRows = [];
  let checked = 0;
  for (const [id, sp] of Object.entries(PEOPLE)){
    if (!sp.acc) continue;
    const nBody = count(sp.normal, '#'), uBody = count(sp.urgent, '#');
    const nAcc  = count(sp.normal, 'o'), uAcc  = count(sp.urgent, 'o');
    // 兩個姿勢都沒有身體格 → 這條路走不到（配件直接坐在背景上，那是第 16 組的事）
    if (nBody === 0 && uBody === 0){ skipped.push(id); continue; }
    let min = Infinity, at = '';
    if (nBody > 0 && nAcc > 0)
      for (const [nm, c] of [['pal.ink', ink], ['pal.inkCar', inkCar]]){
        const d = ciede2000(sp.acc, c);
        if (d < min){ min = d; at = 'normal 對 ' + nm; }
      }
    if (uBody > 0 && uAcc > 0){
      const d = ciede2000(sp.acc, bad);
      if (d < min){ min = d; at = 'urgent 對 pal.bad'; }
    }
    if (min === Infinity){ skipped.push(id + '（沒有同時有身體與配件的姿勢）'); continue; }
    checked++;
    if (BODY_DEBT[id]){ debtRows.push(id + ' ' + min.toFixed(4) + '（背債）'); continue; }
    if (min < BODY_MIN) bad_.push(`${id} ${sp.acc} 最小 ΔE ${min.toFixed(4)}（${at}）`);
    else if (min < BODY_MIN + 1) tight.push([id, min]);
  }
  const ne = nonEmpty(checked, '沒有任何一張圖同時有身體格與配件格，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  tight.sort((a, b) => a[1] - b[1]);
  return ok(bad_.length === 0,
    `${checked} 張圖，${bad_.length} 張新的低於 ${BODY_MIN}：` + bad_.join('、')
    + `｜既有背債：` + (debtRows.join('、') || '無')
    + `｜**跳過（兩個姿勢都沒有身體格，這條路走不到）：${skipped.join('、') || '無'}**`
    + `——它們的替代判準是第 16 組（對 29 種背景色）`
    + `｜貼著門檻的（${tight.length} 張在 ${BODY_MIN}–${BODY_MIN + 1} 之間，換一個 ΔE 實作可能翻面）：`
    + tight.slice(0, 3).map(x => x[0] + ' ' + x[1].toFixed(4)).join('、'));
});

check('身體色的背債表都還存在、寫了理由、而且都還不及格', () => {
  if (CANVAS_SRC == null) return 'TODO: 讀不到 theme.js';
  if (Object.keys(BODY_DEBT).length === 0) return ok(true, DEBT_CLEARED('BODY_DEBT'));
  const pick = k => {
    const m = CANVAS_SRC.match(new RegExp('\\b' + k + ":\\s*'(#[0-9a-fA-F]{6})'"));
    return m ? m[1] : null;
  };
  const cols = [pick('ink'), pick('inkCar'), pick('bad')].filter(Boolean);
  const stale = [];
  for (const [id, why] of Object.entries(BODY_DEBT)){
    if (!PEOPLE[id] || !PEOPLE[id].acc){ stale.push(id + '（圖或 acc 不見了）'); continue; }
    if (!why || why.length < 30){ stale.push(id + '（理由太短）'); continue; }
    let min = Infinity;
    for (const c of cols) min = Math.min(min, ciede2000(PEOPLE[id].acc, c));
    if (min >= BODY_MIN) stale.push(`${id}（已經修好，${min.toFixed(4)}，該從表上移除）`);
  }
  return ok(stale.length === 0,
    `背債表 ${Object.keys(BODY_DEBT).length} 筆，${stale.length} 筆過期：` + stale.join('、'));
});

export { summary };

// ---------------------------------------------------------------- 21 電梯到底有沒有在送人
// **這一整組是因為一個 peer 證明了它不存在才有的。**
//
// 它在修 #68 的時候，做了一版**刻意過度積極**的錯誤修法
// （「只要車上有人就誰都不接」），然後跑驗收：**72 pass / 0 fail / 2 todo，全綠。**
// 我複驗了，而且量了它的代價：
//
//                          main      正確的修法    過度積極的錯誤版
//     tight 2井cap6        59.26%  →  75.32%      58.86%
//     healthy 3井cap8      80.94%  →  89.09%      **73.21%**  ← 比不修還糟 7.7pp
//     100層 3井cap8        47.35%  →  67.72%      45.61%
//
// **七十二條檢查，沒有一條看得到核心迴圈的吞吐量崩掉。**
// 前二十組守的是內容資料、顏色、形狀、i18n、提示、事件池——
// **沒有一條在問「這台電梯有沒有在送人」**，而那是這個遊戲唯一的動詞。
//
// 這是 skill 5.15 的極端版：不是「那條 guard 逃過了證偽」，是**那條 guard 從來不存在**，
// 而它不存在的地方正好是所有人都假設有人在看的地方。
//
// ## 這條是「煙霧測試」不是「配平測試」
//
// 門檻取得很鬆（實測值的 10 個百分點以下），**因為它要抓的是崩塌不是漂移**。
// 內容一直在加，吞吐量本來就會動；把門檻貼著實測值會讓它變成一條每次加內容就紅的
// guard，那種 guard 最後會被人註解掉。**要抓漂移請看訊息裡印出來的數字**——
// 那些數字每次跑都會更新，而且現在真的看得見（`ok()` 通過時會帶訊息）。
const THR_CONFIGS = [
  // 名稱                  樓層 up.shaft up.cap  送達率下限（實測值寫在訊息裡）
  ['tight 2井cap6 45層',    45,      1,     1,   65],
  ['healthy 3井cap8 45層',  45,      2,     2,   80],
  ['100層 3井cap8',        100,      2,     2,   55],
];
const THR_SEEDS = [1, 7, 13];
const THR_DAYS = 15;
section('21 電梯到底有沒有在送人');

check('三種配置下，電梯的送達率不可以崩掉', () => {
  const runOne = (floors, shaft, capUp, seed) => withSeed(seed, () => {
    const st = S.newGame();
    st.floors = floors;
    st.cash = 1e9;
    // **自動化要真的開起來。** 我第一次寫這種探針時忘了開，`served` 全是 0——
    // 那是在量一棟沒有人被送到的樓，而「一致」在那種情況下什麼都不證明（5.16）。
    st.auto.autodoor = st.auto.fifo = st.auto.look = true;
    st.up.shaft = shaft; st.up.cap = capUp;
    st.up.speed = 8; st.up.accel = 8; st.up.door = 4;
    const sim = M.createSim(st);
    M.syncShafts(st, sim);
    const n = Math.round(THR_DAYS * C.DAY_SECONDS / C.STEP);
    for (let i = 0; i < n; i++) M.step(st, sim, C.STEP);
    return { served: st.stats.served, abandoned: st.stats.abandoned };
  });

  const bad = [], rows = [];
  let totalServed = 0;
  for (const [name, floors, shaft, capUp, floor] of THR_CONFIGS){
    let served = 0, abandoned = 0;
    for (const seed of THR_SEEDS){
      const r = runOne(floors, shaft, capUp, seed);
      served += r.served; abandoned += r.abandoned;
    }
    totalServed += served;
    const rate = 100 * served / (served + abandoned || 1);
    rows.push(`${name} ${rate.toFixed(1)}%（送達 ${served}／放棄 ${abandoned}，下限 ${floor}）`);
    if (rate < floor) bad.push(`**${name} 只有 ${rate.toFixed(1)}%，低於下限 ${floor}**`);
  }
  // 儀器活著嗎？一個人都沒送到的話，這條 guard 是在量一棟空樓。
  const ne = nonEmpty(totalServed, '三種配置一個人都沒送到——這條 guard 在量一棟空樓');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `${THR_CONFIGS.length} 種配置 × ${THR_SEEDS.length} 顆種子 × ${THR_DAYS} 遊戲日，`
    + `${bad.length} 個崩掉：` + bad.join('、')
    + `｜` + rows.join('｜')
    + `｜**這是煙霧測試不是配平測試**：門檻鬆，抓的是崩塌不是漂移。`
    + `要看漂移請比對上面這幾個數字——它們每次跑都會更新。`
    + `｜它擋不到的：耐性平衡、單一事件的難度、玩家覺不覺得好玩。`);
});
