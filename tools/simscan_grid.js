// tools/simscan_grid.js — #146 的量測儀器：RATE_EXP × 樓層帶 pop 傾斜 的 5×5 網格。
//
// **這支是量測工具，不是產品，也不是驗收。** 它不改磁碟上的任何檔案：
// 兩個被掃描的參數都是**在 runtime 直接改 module 物件**
//   · `CONFIG.RATE_EXP`  —— sim.js:413 每次 `arrivalRate()` 都重讀（每 0.5 秒一次）
//   · `BANDS[i].pop`     —— sim.js:124 `floorWeight()` 每次抽樓層都重讀
// 所以「改檔案 → import() 拿到舊的」那個坑（#146 要求 b）在這裡結構上不存在：
// sim.js 讀的就是我手上這一個物件。要求 b 仍然照做（每一格開跑前 re-import 讀回來斷言），
// 而且再加一條**功能性**的回讀（`selfTestLive()`）：直接證明 sim 算出來的到達率
// 會跟著這兩個旋鈕動——「我寫進去了」跟「它真的被用到了」是兩件事。
//
// 收工時 `restore()` 把兩者放回原值。
//
// 用法（瀏覽器，同源）：
//   const G = await import('/tools/simscan_grid.js');
//   await G.selfTest();          // 儀器自檢（要求 b / e 的一半）
//   await G.runGrid();           // 25 格
//
// 或直接開 /tools/simscan_grid.html。

import { CONFIG as C, BANDS, UPGRADES, AUTOMATION } from '../js/content.js';
import * as S from '../js/state.js';
import * as M from '../js/sim.js';

// ---------------------------------------------------------------- 基準值（載入當下的產品值）
export const BASE_EXP = C.RATE_EXP;
export const BASE_POP = BANDS.map(b => b.pop);
export const BAND_KEYS = BANDS.map(b => b.key);   // retail, office, hotel, resid, obs, exp, roof

// ---------------------------------------------------------------- 網格
export const EXPS = [0.50, 0.55, 0.60, 0.65, 0.70];
export const KS   = [0, 0.5, 1.0, 1.5, 2.0];

// pop'[i] = pop[i] × (1 + k × i / 6)，i 是 BANDS 的索引（#146 指定的順序就是 BANDS 的順序）
export const popFor = (i, k) => BASE_POP[i] * (1 + k * i / 6);

export function setCell(exp, k){
  C.RATE_EXP = exp;
  for (let i = 0; i < BANDS.length; i++) BANDS[i].pop = popFor(i, k);
}
export function restore(){
  C.RATE_EXP = BASE_EXP;
  for (let i = 0; i < BANDS.length; i++) BANDS[i].pop = BASE_POP[i];
}

// ---------------------------------------------------------------- 六個組態
// **要求 d：N 井與 N−1 井那兩輪只差井數。** 所以同一棟樓的兩列除了 shaft/oshaft
// 以外每一個欄位都相同，而 `derived().shafts = 1 + up.shaft + skills.o_shaft`。
// 100 樓那兩列只差 `o_shaft`（1 vs 2），因為 up.shaft 的上限是 5（#146 的天花板那一節）。
export const CONFIGS = [
  { id:'12F/1',  floors:12,  shaft:0, oshaft:0, shafts:1 },
  { id:'12F/2',  floors:12,  shaft:1, oshaft:0, shafts:2 },
  { id:'40F/3',  floors:40,  shaft:2, oshaft:0, shafts:3 },
  { id:'40F/4',  floors:40,  shaft:3, oshaft:0, shafts:4 },
  { id:'100F/7', floors:100, shaft:5, oshaft:1, shafts:7 },
  { id:'100F/8', floors:100, shaft:5, oshaft:2, shafts:8 },
];
export const SEEDS = [1, 7, 13];
export const DAYS  = 12;

// #146 的判準：目標井數 ≥ 99.5%，少一井 ≤ 97%
export const PASS_HI = 99.5, PASS_LO = 97.0;

// ---------------------------------------------------------------- 種子
// 跟 tests/acceptance.js 的 withSeed 同一支 xorshift32，數字才可比。
export function withSeed(seed, fn){
  const orig = Math.random;
  let x = seed >>> 0;
  Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  try { return fn(); } finally { Math.random = orig; }
}

// ---------------------------------------------------------------- 一輪
// 劇本（#146：「12 遊戲日 × 3 顆種子、滿級現金升級、9 個自動化全開、評價 5」）：
//   · 現金升級全部點到 max（speed/accel/cap/door/cooling 各自的 max），
//     **shaft 除外**——它是這一格的自變數。`floor` 不點（樓層直接指定，見下）。
//   · AUTOMATION 九項全開。
//   · rating = RATING_MAX = 5（womMult 因此是 WOM_MAX = 1.5）。
//   · 藍圖只點 o_shaft，其它 0：m_speed/m_cap… 會動衍生值，會讓「滿級現金升級」不再是同一台電梯。
//
// 等待秒數怎麼量：`st.stats` 沒有記等待，所以這裡每 SAMPLE_EVERY tick 掃一次車上的人，
// 第一次看到某個人在車上就把 `st.t − p.born` 記下來——那是他的**廳等時間**（不含車上時間）。
// 解析度 = SAMPLE_EVERY × STEP 秒。掃的是 riders（幾十人），不是每 tick 全掃，
// 額外成本相對 step() 本身可以忽略。
const SAMPLE_EVERY = 10;   // tick → 1/6 秒解析度

export function runOne(cfg, seed){
  return withSeed(seed, () => {
    const st = S.newGame({ skills: cfg.oshaft ? { o_shaft: cfg.oshaft } : {} });
    st.floors = cfg.floors;
    st.cash = 1e9;
    st.rating = C.RATING_MAX;
    for (const u of UPGRADES) st.up[u.id] = u.max;
    st.up.floor = 0;                 // 樓層直接指定；up.floor 不進 derived()，留著只是雜訊
    st.up.shaft = cfg.shaft;         // ← 這一列唯一的自變數
    for (const a of AUTOMATION) st.auto[a.id] = true;

    const d = S.derived(st);
    if (d.shafts !== cfg.shafts)
      throw new Error(`${cfg.id}: derived().shafts = ${d.shafts}，應該是 ${cfg.shafts}`);

    const sim = M.createSim(st);
    M.syncShafts(st, sim);
    if (sim.shafts.length !== cfg.shafts)
      throw new Error(`${cfg.id}: sim.shafts.length = ${sim.shafts.length}，應該是 ${cfg.shafts}`);

    const n = Math.round(DAYS * C.DAY_SECONDS / C.STEP);
    let waitSum = 0, waitN = 0, maxQ = 0, capTicks = 0;
    let rateSum = 0, rateN = 0;
    for (let i = 0; i < n; i++){
      M.step(st, sim, C.STEP);
      if (i % SAMPLE_EVERY === 0){
        for (const s of sim.shafts) for (const p of s.riders){
          if (p.__hw === undefined){ p.__hw = st.t - p.born; waitSum += p.__hw; waitN++; }
        }
        if (sim.waiting.length > maxQ) maxQ = sim.waiting.length;
        if (sim.waiting.length >= 160) capTicks++;      // WAIT_CAP = 160（sim.js:13）
        if (sim.rateVal != null){ rateSum += sim.rateVal; rateN++; }
      }
    }
    let inCar = 0;
    for (const s of sim.shafts) inCar += s.riders.length;
    return {
      served: st.stats.served, abandoned: st.stats.abandoned,
      waiting: sim.waiting.length, inCar,
      waitSum, waitN, maxQ, capSamples: capTicks, samples: Math.ceil(n / SAMPLE_EVERY),
      rateAvg: rateN ? rateSum / rateN : 0,
      rating: st.rating, revenue: st.runRevenue,
    };
  });
}

export function runConfig(cfg){
  const agg = { id: cfg.id, shafts: cfg.shafts, served:0, abandoned:0, waiting:0, inCar:0,
                waitSum:0, waitN:0, maxQ:0, capSamples:0, samples:0, rateAvg:0, revenue:0, seeds:[] };
  for (const seed of SEEDS){
    const r = runOne(cfg, seed);
    for (const k of ['served','abandoned','waiting','inCar','waitSum','waitN','capSamples','samples','revenue'])
      agg[k] += r[k];
    agg.maxQ = Math.max(agg.maxQ, r.maxQ);
    agg.rateAvg += r.rateAvg / SEEDS.length;
    agg.seeds.push({ seed, served:r.served, abandoned:r.abandoned, waiting:r.waiting,
                     rate: pct(r.served, r.abandoned) });
  }
  // 送達率的定義跟 tests/acceptance.js 第 21 組**完全一樣**：served / (served + abandoned)。
  // 另外報 rateAll = served / (served + abandoned + 收盤時還在等的 + 還在車上的)，
  // 因為 #146 的「已知天花板」說天花板是「當日結束時還在等的人」——那些人不進上面那個分母。
  agg.rate    = pct(agg.served, agg.abandoned);
  agg.rateAll = 100 * agg.served / Math.max(1, agg.served + agg.abandoned + agg.waiting + agg.inCar);
  agg.total   = agg.served + agg.abandoned + agg.waiting + agg.inCar;   // 總人次（生出來的人）
  agg.avgWait = agg.waitN ? agg.waitSum / agg.waitN : 0;
  return agg;
}
const pct = (s, a) => 100 * s / Math.max(1, s + a);

// ---------------------------------------------------------------- 一格
export async function runCell(exp, k){
  setCell(exp, k);
  // === 要求 b：常數真的進到 sim 了 ===
  // b-1 靜態回讀：從 module 再 import 一次讀回來（同一個 module instance，
  //     這一條證明的是「我改的就是 sim.js import 的那一份」）。
  const cm = await import('../js/content.js');
  const roof = cm.BANDS.find(b => b.key === 'roof');
  const wantRoof = popFor(BAND_KEYS.indexOf('roof'), k);
  if (Math.abs(cm.CONFIG.RATE_EXP - exp) > 1e-12)
    throw new Error(`回讀失敗 RATE_EXP=${cm.CONFIG.RATE_EXP} 期望 ${exp}`);
  if (!roof || Math.abs(roof.pop - wantRoof) > 1e-12)
    throw new Error(`回讀失敗 roof.pop=${roof && roof.pop} 期望 ${wantRoof}`);
  // b-2 功能性回讀：sim 自己算的到達率會不會跟著動（見 liveRate()）。
  const live = liveRate();

  const rows = CONFIGS.map(runConfig);
  const by = {}; for (const r of rows) by[r.id] = r;
  // === 要求 c：母體非空 ===
  for (const r of rows) if (!(r.served > 0))
    throw new Error(`母體是空的：${r.id} 送達 0 人——這一格什麼都不證明`);

  const crit = [
    ['12F/2',  '>=', PASS_HI], ['12F/1',  '<=', PASS_LO],
    ['40F/4',  '>=', PASS_HI], ['40F/3',  '<=', PASS_LO],
    ['100F/8', '>=', PASS_HI], ['100F/7', '<=', PASS_LO],
  ].map(([id, op, v]) => ({ id, op, v, actual: by[id].rate,
                            ok: op === '>=' ? by[id].rate >= v : by[id].rate <= v }));
  return { exp, k, rows, by, crit, pass: crit.every(c => c.ok),
           readback: { RATE_EXP: cm.CONFIG.RATE_EXP, roofPop: roof.pop,
                       pops: cm.BANDS.map(b => [b.key, +b.pop.toFixed(6)]) },
           live,
           total100_8: by['100F/8'].total, revenue100_8: by['100F/8'].revenue };
}

// ---------------------------------------------------------------- 「磁碟上寫的是什麼」那一格
// **這一支是給 `orch falsify` 用的（#146 要求 e）。**
// runCell() 會在每一格開跑前覆寫 CONFIG.RATE_EXP，所以把缺陷注進 content.js 之後
// **網格不會變**——那不是儀器死了，是儀器刻意不讀磁碟。要證明「檔案 → sim → 數字」
// 這條線是活的，就要有一格**不覆寫**、直接用檔案裡的值跑：那就是這一支。
// 它同時也是「現行 main」的定義，所以正常情況下 runBaseline() 應該等於 runCell(0.50, 0)。
export function runBaseline(){
  const rows = CONFIGS.map(runConfig);
  const by = {}; for (const r of rows) by[r.id] = r;
  return { fromFile: { RATE_EXP: C.RATE_EXP, pops: BANDS.map(b => [b.key, b.pop]) },
           rows, by, live: liveRate(),
           total100_8: by['100F/8'].total, served100_8: by['100F/8'].served };
}

// ---------------------------------------------------------------- 功能性回讀
// 拿一個固定的狀態，讓 sim 自己算 arrivalRate，再用它反解人口權重 W：
//     rateVal = RATE_PER_WEIGHT × W^RATE_EXP × womMult
// 然後**只換指數**、強迫重算，檢查新的 rateVal 等於 RATE_PER_WEIGHT × W^e2 × womMult。
// 這條不重寫任何 floorWeight 的邏輯，卻能證明「sim 讀的是當下的 CONFIG.RATE_EXP」。
export function liveRate(){
  return withSeed(999, () => {
    const st = S.newGame(); st.floors = 100; st.rating = C.RATING_MAX;
    for (const a of AUTOMATION) st.auto[a.id] = true;
    const sim = M.createSim(st); M.syncShafts(st, sim);
    M.step(st, sim, C.STEP);
    const wom = S.derived(st).womMult;
    // **兩次讀數要在同一個 st.t**：hourOf() 會動，時間差 1/60 秒就足以讓 W 差 5e-5，
    // 而那個差會被誤讀成「常數沒進去」。`step(st, sim, 0)` 不推進時間，
    // 只是讓 arrivalRate() 在 rateAt 被清掉之後重算一次。
    const probe = () => { sim.rateAt = null; M.step(st, sim, 0); return sim.rateVal; };
    const e1 = C.RATE_EXP;
    const r1 = probe();
    const W = Math.pow(r1 / (C.RATE_PER_WEIGHT * wom), 1 / e1);
    const e2 = e1 + 0.13;
    C.RATE_EXP = e2;
    const r2 = probe();
    C.RATE_EXP = e1; sim.rateAt = null;
    const want = C.RATE_PER_WEIGHT * Math.pow(W, e2) * wom;
    const err = Math.abs(r2 - want) / want;
    if (!(err < 1e-9)) throw new Error(
      `功能性回讀失敗：把 RATE_EXP 從 ${e1} 換成 ${e2} 之後 sim 算出 ${r2}，`
      + `依同一個 W=${W} 應該是 ${want}（相對誤差 ${err}）——sim 沒有讀當下的 CONFIG.RATE_EXP`);
    return { W: +W.toFixed(6), rate: +r1.toFixed(8), exp: e1, t: st.t };
  });
}

// ---------------------------------------------------------------- 儀器自檢
// 要求 b 的另一半：**每一帶的 pop 都要真的被 sim 讀到**。
// 逐一把某一帶的 pop 加一成，反解出來的 W 必須嚴格變大；放回去必須回到原值。
// 不重寫 floorWeight，所以這條抓得到「我改的是一份 sim 沒在讀的複本」。
export async function selfTest(){
  const out = [];
  const before = { exp: C.RATE_EXP, pops: BANDS.map(b => b.pop) };
  const Wof = () => liveRate().W;
  const W0 = Wof();
  out.push({ t:'RATE_EXP 是活的（liveRate 內建斷言）', ok:true, detail:`W=${W0}` });
  for (let i = 0; i < BANDS.length; i++){
    const old = BANDS[i].pop;
    BANDS[i].pop = old * 1.1;
    const W1 = Wof();
    BANDS[i].pop = old;
    const W2 = Wof();
    const ok = W1 > W0 * 1.0000001 && Math.abs(W2 - W0) < 1e-9;
    out.push({ t:`BANDS[${i}] ${BANDS[i].key}.pop 是活的`, ok,
               detail:`W ${W0} → ${W1}（+10% pop）→ ${W2}（還原）` });
    if (!ok) throw new Error(`自檢失敗：${BANDS[i].key} 的 pop 沒有進到 sim`);
  }
  // 井數對照組只差一個變數（要求 d）：同一格、同一顆種子，兩列的狀態只有 shafts 不同。
  for (const [a, b] of [['12F/1','12F/2'], ['40F/3','40F/4'], ['100F/7','100F/8']]){
    const ca = CONFIGS.find(c => c.id === a), cb = CONFIGS.find(c => c.id === b);
    const diff = Object.keys(ca).filter(kk => ca[kk] !== cb[kk]);
    const ok = diff.every(kk => ['id','shaft','oshaft','shafts'].includes(kk)) && ca.floors === cb.floors;
    out.push({ t:`${a} vs ${b} 只差井數`, ok, detail:`不同的欄位：${diff.join(',')}` });
    if (!ok) throw new Error(`自檢失敗：${a} 與 ${b} 差了井數以外的東西`);
  }
  if (Math.abs(C.RATE_EXP - before.exp) > 1e-12) throw new Error('自檢自己留下了殘留：RATE_EXP');
  for (let i = 0; i < BANDS.length; i++)
    if (Math.abs(BANDS[i].pop - before.pops[i]) > 1e-12) throw new Error('自檢自己留下了殘留：pop');
  return out;
}

// ---------------------------------------------------------------- 整張網格
export async function runGrid(onCell){
  const cells = [];
  try {
    for (const exp of EXPS) for (const k of KS){
      const c = await runCell(exp, k);
      cells.push(c);
      if (onCell) onCell(c);
    }
  } finally { restore(); }
  return cells;
}

// ---------------------------------------------------------------- 純文字報表
export function fmtCell(c){
  const r = id => c.by[id].rate.toFixed(2);
  const f = c.crit.map(x => x.ok ? '✓' : '✗').join('');
  return `exp=${c.exp.toFixed(2)} k=${c.k.toFixed(1)}  `
    + `12F ${r('12F/1')}/${r('12F/2')}  40F ${r('40F/3')}/${r('40F/4')}  `
    + `100F ${r('100F/7')}/${r('100F/8')}  [${f}] ${c.pass ? 'PASS' : 'fail'}  `
    + `100F8 人次 ${c.total100_8}`;
}
