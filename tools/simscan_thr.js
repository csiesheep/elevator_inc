// tools/simscan_thr.js — #151 第三步的量測儀器：第 21 組七列在新人流設定下的實測值。
//
// **這支不是驗收，是量測。** 它不改磁碟上的任何檔案，兩個被掃描的參數
// （`CONFIG.RATE_EXP`、`BANDS[i].pop`）都是在 runtime 改 module 物件，
// 跟 `tools/simscan_grid.js` 同一套（sim.js 每次都重讀那兩個物件，見該檔開頭）。
//
// ## 為什麼要另外寫一支，而不是直接跑 harness
//
// 直接跑 harness 也可以（`simscan_apply.py` 把數字寫進 `js/content.js`，換一個 port 再載入），
// 而且我**兩種都跑了**。但 harness 的第 21 組寫死 **3 顆種子**，
// 而 #151 要問的是「新門檻該訂在哪」——**用 3 顆種子去建議一條門檻，
// 就是在把雜訊寫成規格**。這支可以餵任意顆種子，所以建議值是 12 顆種子算出來的。
//
// ## 這支必須先證明自己是第 21 組
//
// `runThr()` 的每一個欄位都是從 `tests/acceptance.js` 的第 21 組**逐字抄過來的**
// （升級等級 3/3/5、自動化 autodoor+fifo+look、`st.cash=1e9`、15 遊戲日、
// 送達率 = `served / (served + abandoned)`）。抄本會漂——所以 `baselineCheck()`
// 用第 21 組自己的 3 顆種子跑一次，**必須逐位重現 harness 印出來的七個數字**。
// 對不上就是這支抄錯了，不是產品變了。
//
// 用法（瀏覽器，同源）：
//   const T = await import('/tools/simscan_thr.js');
//   T.baselineCheck()                    // 3 顆種子，要對上 harness
//   await T.runAll([[0.65,1.5],[0.70,1.5]], T.SEEDS12)

import { CONFIG as C, BANDS } from '../js/content.js';
import * as S from '../js/state.js';
import * as M from '../js/sim.js';

export const BASE_EXP = C.RATE_EXP;
export const BASE_POP = BANDS.map(b => b.pop);
export const popFor = (i, k) => BASE_POP[i] * (1 + k * i / 6);
export function setCell(exp, k){
  C.RATE_EXP = exp;
  for (let i = 0; i < BANDS.length; i++) BANDS[i].pop = popFor(i, k);
}
export function restore(){
  C.RATE_EXP = BASE_EXP;
  for (let i = 0; i < BANDS.length; i++) BANDS[i].pop = BASE_POP[i];
}

// ---- 以下三個常數逐字抄自 tests/acceptance.js 第 21 組（THR_CONFIGS / THR_SEEDS / THR_DAYS）
export const THR_CONFIGS = [
  ['tight 2井cap6 45層',          45, 1,  1, [],                65],
  ['healthy 3井cap8 45層',        45, 2,  2, [],                80],
  ['100層 欠配 3井cap8',         100, 2,  2, [],                40],
  ['100層 中配 4井cap14 +group', 100, 3,  6, ['group'],         75],
  ['100層 高配 滿級 +dest+group',100, 5, 15, ['dest','group'],  90],
  ['look+group 3井cap6 45層',     45, 2,  1, ['group'],         75],
  ['dest+group 3井cap6 45層',     45, 2,  1, ['dest','group'],  70],
];
export const THR_SEEDS = [1, 7, 13];          // 第 21 組寫死的三顆
export const THR_DAYS = 15;
// 12 顆種子：前三顆就是第 21 組的那三顆，所以 3 顆的結果是 12 顆的子集合，可以直接對照。
export const SEEDS12 = [1, 7, 13, 19, 23, 29, 31, 37, 41, 43, 47, 53];

// 跟 tests/harness 的 withSeed 同一支 xorshift32
export function withSeed(seed, fn){
  const orig = Math.random;
  let x = seed >>> 0;
  Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  try { return fn(); } finally { Math.random = orig; }
}

// 逐字抄自第 21 組的 runOne
export function runThr(floors, shaft, capUp, autos, seed){
  return withSeed(seed, () => {
    const st = S.newGame();
    st.floors = floors;
    st.cash = 1e9;
    st.auto.autodoor = st.auto.fifo = st.auto.look = true;
    for (const a of autos) st.auto[a] = true;
    st.up.shaft = shaft; st.up.cap = capUp;
    st.up.speed = 3; st.up.accel = 3; st.up.door = 5;
    const sim = M.createSim(st);
    M.syncShafts(st, sim);
    const n = Math.round(THR_DAYS * C.DAY_SECONDS / C.STEP);
    for (let i = 0; i < n; i++) M.step(st, sim, C.STEP);
    return { served: st.stats.served, abandoned: st.stats.abandoned };
  });
}

const yieldNow = () => new Promise(r => {
  const mc = new MessageChannel(); mc.port1.onmessage = () => r(); mc.port2.postMessage(0);
});

export async function measure(seeds, onRow){
  const rows = [];
  for (const [name, floors, shaft, capUp, autos, floor] of THR_CONFIGS){
    let served = 0, abandoned = 0; const per = [];
    for (const seed of seeds){
      const r = runThr(floors, shaft, capUp, autos, seed);
      served += r.served; abandoned += r.abandoned;
      per.push(+(100 * r.served / Math.max(1, r.served + r.abandoned)).toFixed(2));
      await yieldNow();
    }
    // **母體非空**：一個人都沒送到的時候 0/0 會被 `|| 1` 變成 0%，那是假數字不是崩塌。
    if (!(served > 0)) throw new Error(`母體是空的：${name} 送達 0 人`);
    const mean = per.reduce((a, b) => a + b, 0) / per.length;
    const sd = Math.sqrt(per.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (per.length - 1));
    const row = { name, floor, served, abandoned,
                  rate: +(100 * served / (served + abandoned)).toFixed(2),
                  seedMin: Math.min(...per), seedMax: Math.max(...per),
                  seedMean: +mean.toFixed(2), seedSD: +sd.toFixed(2),
                  seedSE: +(sd / Math.sqrt(per.length)).toFixed(2), per };
    rows.push(row);
    if (onRow) onRow(row);
  }
  return rows;
}

// 這支是不是真的第 21 組？用它自己的三顆種子跑，要對上 harness 印出來的數字。
export async function baselineCheck(){
  const rows = await measure(THR_SEEDS);
  return rows.map(r => `${r.name} ${r.rate.toFixed(1)}%（下限 ${r.floor}）`);
}

export async function runAll(cells, seeds){
  const out = { seeds, baseline: null, cells: {} };
  try {
    out.baseline = await measure(seeds);
    for (const [exp, k] of cells){
      setCell(exp, k);
      if (Math.abs(C.RATE_EXP - exp) > 1e-12) throw new Error('回讀失敗 RATE_EXP');
      const roof = BANDS.find(b => b.key === 'roof');
      if (Math.abs(roof.pop - popFor(6, k)) > 1e-12) throw new Error('回讀失敗 roof.pop');
      out.cells[exp.toFixed(2) + '/' + k.toFixed(1)] = await measure(seeds);
    }
  } finally { restore(); }
  return out;
}
