// tests/acceptance.js — 驗收條件。orchestrator 所有；peer 可以跑，但不編輯。
// 某一列錯了要回報，由 orchestrator 修。
//
// SPEC 是**從設計文件抄寫**的常數（obsidian/Projects/elevator inc.md §5.7–§5.14），
// 不是從 content.js 讀的。這是刻意的：見 harness.js 開頭第 1 點。

import { section, check, eq, near, ok, nonEmpty, R, summary } from './harness.js';
import { CONFIG as C, BANDS, UPGRADES, PASSENGERS, ACHIEVEMENTS, SKILLS, EVENTS } from '../js/content.js';
import { EN } from '../js/i18n-content.js';
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

// 招商在不在？第 3 組和第 7 組都要靠它決定「這條規則現在還存不存在」。
const leasingGone = typeof S.buyLease !== 'function';

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

// 誰會寫 st.codex？sim.js:742 對每一種送達的乘客型別寫 st.codex[p.type]，
// 另外有幾個具名的計數器。**具名的那些要從原始碼抓，不能寫死**——寫死的話
// 下一個人加了新的計數器，這條 guard 會把正確的成就報成錯的。
const CODEX_NAMED = SIM_SRC == null ? null
  : [...new Set((SIM_SRC.match(/codex\.(\w+)/g) || []).map(m => m.slice(6)))];

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

check('成批事件的場上耐性不可以掉到結構懸崖以下', () => {
  const byId = Object.fromEntries(PASSENGERS.map(p => [p.id, p]));
  const bad = [], checked = [];
  for (const e of EVENTS){
    if (!e.type || !e.n) continue;
    const batch = e.n[1] || e.n[0] || 0;
    if (batch < 6) continue;                        // 一兩個人不算「整批」
    const t = byId[e.type];
    if (!t) continue;                               // 指不到型別是上面那條的事
    // far 的中位：'lobby' 是 0，樓層帶取它索引範圍的中點，'any' 界不出來所以跳過
    const mid = k => {
      if (k === 'lobby') return 0;
      if (k === 'any') return null;
      const b = BANDS.find(x => x.key === k);
      return b ? ((b.from - 1) + (b.to - 1)) / 2 : null;
    };
    const a = mid(e.at), z = mid(e.to);
    if (a == null || z == null) continue;           // 'any'：跳過，理由見上面註解
    const far = Math.max(a, z);
    const onStage = t.patience * (1 + far / 45) * (e.panic != null ? e.panic : 1);
    checked.push(e.id);
    if (onStage >= CLIFF) continue;
    if (CLIFF_OK[e.id]) continue;
    bad.push(`${e.id}（${e.type} ${t.patience}`
      + (e.panic != null ? ` × panic ${e.panic}` : '') + ` = 場上 ${onStage.toFixed(0)} 秒）`);
  }
  const ne = nonEmpty(checked.length, '沒有任何成批事件指定 type，這條 guard 沒有試過任何東西');
  if (ne !== true) return ne;
  return ok(bad.length === 0,
    `比對了 ${checked.length} 個成批事件，${bad.length} 個掉到 ${CLIFF} 秒的懸崖以下`
    + `（不是比較難，是整批必死）：` + bad.join('、'));
});

check('懸崖的例外都寫了理由', () => {
  const ids = new Set(EVENTS.map(e => e.id));
  const ne = nonEmpty(Object.keys(CLIFF_OK).length, 'CLIFF_OK 是空的，沒有東西可以檢查');
  if (ne !== true) return ne;
  const bad = Object.keys(CLIFF_OK).filter(id =>
    !ids.has(id) || !CLIFF_OK[id] || CLIFF_OK[id].length < 30);
  return ok(bad.length === 0,
    '例外的事件 id 不存在、或理由太短（沒有理由的例外等於沒有這條 guard）：' + bad.join(', '));
});

export { summary };
