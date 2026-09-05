// tests/acceptance.js — 驗收條件。orchestrator 所有；peer 可以跑，但不編輯。
// 某一列錯了要回報，由 orchestrator 修。
//
// SPEC 是**從設計文件抄寫**的常數（obsidian/Projects/elevator inc.md §5.7–§5.14），
// 不是從 content.js 讀的。這是刻意的：見 harness.js 開頭第 1 點。

import { section, check, eq, near, ok, nonEmpty, R, summary } from './harness.js';
import { CONFIG as C, BANDS, UPGRADES, PASSENGERS } from '../js/content.js';
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
check('CHURN_RATING',   () => eq(C.CHURN_RATING, SPEC.churnRating, 'CHURN_RATING'));
check('LEASE_BLOCK',    () => eq(C.LEASE_BLOCK, SPEC.leaseBlock, 'LEASE_BLOCK'));
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
  let spawned = 0;
  for (let i = 0; i < 4000; i++) M.step(st, sim, 1 / 20);
  spawned = sim.waiting.length + st.stats.served + st.stats.abandoned;
  return ok(spawned > 0, '跑了 200 秒都沒有任何乘客出現');
});
// 大廳（樓層 0）依設計「永遠算有租戶」——isLeased() 第一行就是這樣寫的，
// 所以這條只看大廳「以上」的樓層。第一版把大廳也算進去，於是對著一段正確的
// 程式碼紅了；那是儀器的錯，不是產品的錯。
check('沒有租戶的樓層不該產生乘客（大廳除外）', () => {
  const st = freshTower(30, false);
  const built = BANDS.reduce((a, b) => a + S.builtInBand(st, b), 0);
  const ne = nonEmpty(built, '這棟樓一層都沒蓋，這條 guard 沒有試到任何東西');
  if (ne !== true) return ne;
  // 「大廳以上」那條路徑只佔生成量的 ~20%（LOBBY_SHARE 0.4 × 起訖對調 0.5），
  // 而權重歸零時到達率也趨近 0，所以單一次短跑抽不到，會間歇性地放行缺陷。
  // 跨多棟樓累積樣本；**樣本不足時回報「尚未實作」而不是綠**——把「沒測到」
  // 當成「測過了」，正是這份 harness 要擋的東西。
  const NEED = 40;
  const seen = [];
  for (let t = 0; t < 24 && seen.length < NEED; t++){
    const s2 = freshTower(30, false);
    const sim = M.createSim(s2); M.syncShafts(s2, sim);
    for (let i = 0; i < 12000; i++) M.step(s2, sim, 1 / 20);
    for (const p of sim.waiting) seen.push(p.origin);
  }
  if (seen.length < NEED) return 'TODO';   // 沒抽到足夠樣本，這一輪不算數
  const above = seen.filter(o => o > 0);
  return ok(above.length === 0,
    `${seen.length} 個樣本中，有 ${above.length} 個出現在沒有租戶的樓層。出發樓層：`
    + [...new Set(above.map(o => o + 1))].sort((a, b) => a - b).join(',')
    + '｜成因：pickFloor() 防了「範圍是空的」（n<=0）卻沒防「範圍非空但權重全為 0」，'
    + '此時 r=0，第一圈 r-=0 就 <=0，直接回傳範圍最低的那一層');
});
check('加權抽樣的空分布防護（同形狀共三處）', () => {
  // pickType 與事件抽樣同樣只防 pool 為空、不防總權重為 0。今天打不到，
  // 因為它們的權重都是正的常數；floorWeight 是唯一會合法回傳 0 的權重。
  // 這一列是把「已知還沒掃到的那兩處」留在檯面上，不是斷言它們壞了。
  return 'TODO';
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

export { summary };
