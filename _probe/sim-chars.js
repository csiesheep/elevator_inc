// _probe/sim-chars.js — 第 3 階段：模擬。不是測試，是量測。
// 交付的是**分布與離群**，不是平均值。要回答的：
//   · 一場遊戲遇到幾次打烊清場／試吃推銷？
//   · 最糟的那一次長什麼樣？
//   · 跟尖峰撞在一起會怎樣？
//   · **新手（5 層、手動、沒有調度演算法）會不會崩掉？**
//   · 四個人物實際占玩家載到的人的幾 %？（對齊 #27 網紅那一列用的度量）
//   · 小費實際發得出來嗎、值多少錢？
//   · patience:999 的試吃推銷員會不會把 WAIT_CAP 填滿？
//
// **這一份的 import 全部沒有 query string。** sim.js 持有的是無 query 的模組實例；
// 用 import('...?p=' + Math.random()) 拿到的是另一份，改它 sim.js 看不到——
// 那會量出「三顆種子逐字相同」然後讓人寫成「這個機制沒有效果」。
import { CONFIG as C, PASSENGERS, EVENTS, BANDS, passengerById } from '../js/content.js';
import * as M from '../js/sim.js';
import * as S from '../js/state.js';
import { setLang } from '../js/i18n.js';

setLang('zh');

const DT = 1 / 20;
const MINE_PAX = ['stroller', 'loaded', 'janitor', 'sampler', 'closing'];
const MINE_EV  = ['closetime', 'sampling'];

// 六種調度全掃。**只測一種等於沒測**——這個專案已經因此紅過兩次。
// manual = 完全沒有演算法（新手的第一個小時），這一組是最重要的一列，
// 因為手動模式下自動送達是 0，很多「沒發生」的量測在那裡什麼都不證明。
const ALGOS = {
  manual: {},
  fifo:   { autodoor:true, fifo:true },
  scan:   { autodoor:true, fifo:true, scan:true },
  look:   { autodoor:true, fifo:true, scan:true, look:true },
  dest:   { autodoor:true, fifo:true, scan:true, look:true, dest:true },
  group:  { autodoor:true, fifo:true, scan:true, look:true, dest:true, group:true },
};

function seeded(seed){
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const sum  = a => a.reduce((x, y) => x + y, 0);
const mean = a => a.length ? sum(a) / a.length : 0;
const q = (arr, p) => { if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const r1 = n => Math.round(n * 10) / 10;
const r2 = n => Math.round(n * 100) / 100;
const pct = (a, b) => b ? (100 * a / b).toFixed(2) + '%' : '—';

// ---------------------------------------------------------------- 一次量測
// 釘住亂數、固定樓況（樓層數／演算法／升級都寫死），跑 days 個遊戲日。
// 固定樓況是刻意的：讓自動玩家去買東西的話，「蓋到 100 層」跟「卡在 5 層」的
// 分岔會把要量的效果整個吃掉（上一個 peer 量到 12 倍的假差異）。
function run(seed, cfg){
  const orig = Math.random;
  // A/B 用的欄位快照。**只在這支檔案裡動，跑完一定還原。**
  const snapPax = PASSENGERS.map(p => ({ ...p }));
  const snapEv  = EVENTS.map(e => ({ ...e }));
  try {
    if (cfg.tipOff)  { const p = passengerById('loaded');  if (p) delete p.tip; }
    if (cfg.relayOff){ const p = passengerById('sampler'); if (p) delete p.summon; }
    if (cfg.mineOff) {
      for (let i = EVENTS.length - 1; i >= 0; i--) if (MINE_EV.includes(EVENTS[i].id)) EVENTS.splice(i, 1);
      for (const id of ['stroller', 'loaded']) { const p = passengerById(id); if (p) p.w = 0; }
    }
    Math.random = seeded(seed);

    const st = S.newGame();
    st.floors = cfg.floors;
    Object.assign(st.auto, ALGOS[cfg.algo]);
    // 升級照樓層數給一組固定的值：5 層的新手什麼都沒買，高樓的玩家一定買過。
    if (cfg.floors >= 40){ st.up.speed = 6; st.up.accel = 5; st.up.cap = 5; st.up.door = 4; st.up.shaft = 3; }
    else if (cfg.floors >= 12){ st.up.speed = 2; st.up.accel = 2; st.up.cap = 1; st.up.door = 1; }
    st.cash = 0;
    const sim = M.createSim(st); M.syncShafts(st, sim);

    const steps = Math.round(cfg.days * C.DAY_SECONDS / DT);
    // 每個看過的乘客：型別、出生時間、以及最後怎麼了
    const seen = new Map();          // id -> {type, born, ev}
    const evLog = [];                // 每一次事件
    const episodes = new Map();      // evIndex -> {id, floor, n, t, ids:Set}
    let lastEvT = -1;
    const waitSamples = [], sizeSamples = [], samplerPop = [];
    let abandoned = 0, stairs = 0;
    let prevIds = new Set(), prevAband = 0, prevTrips = 0, prevServed = 0;
    const ridersPerTrip = [];

    for (let i = 0; i < steps; i++){
      const before = new Set(sim.waiting.map(p => p.id));
      M.step(st, sim, DT);

      // 這一步有沒有觸發事件？sim.lastEvent 只在 runEvent 成功時更新
      let curEv = null;
      if (sim.lastEvent && sim.lastEvent.t !== lastEvT){
        lastEvT = sim.lastEvent.t;
        curEv = { name: sim.lastEvent.name, floor: sim.lastEvent.floor, n: sim.lastEvent.n,
                  t: sim.lastEvent.t, day: Math.floor(sim.lastEvent.t / C.DAY_SECONDS),
                  hour: (sim.lastEvent.t % C.DAY_SECONDS) / C.DAY_SECONDS * 24 };
        evLog.push(curEv);
      }

      // 新出現的乘客
      const nowIds = new Set(sim.waiting.map(p => p.id));
      for (const p of sim.waiting){
        if (seen.has(p.id)) continue;
        seen.set(p.id, { type: p.type, born: p.born, ev: curEv ? evLog.length - 1 : null });
        sizeSamples.push(p.t.size);
        if (curEv){
          let ep = episodes.get(evLog.length - 1);
          if (!ep){ ep = { name: curEv.name, floor: curEv.floor, t: curEv.t, ids: new Set() };
                    episodes.set(evLog.length - 1, ep); }
          ep.ids.add(p.id);
        }
      }
      // 消失的乘客：在車上 = 上車了；不在車上 = 放棄（或走樓梯，只有打蠟會）
      const inCar = new Set();
      for (const s of sim.shafts) for (const r of s.riders) inCar.add(r.id);
      const dAband = st.stats.abandoned - prevAband;
      prevAband = st.stats.abandoned;
      abandoned += dAband;
      for (const id of before){
        if (nowIds.has(id) || inCar.has(id)) continue;
        const rec = seen.get(id);
        if (rec && !rec.gone) rec.gone = st.t;
      }
      prevIds = nowIds;

      if (st.stats.trips > prevTrips){ prevTrips = st.stats.trips; }
      if (i % 20 === 0){
        waitSamples.push(sim.waiting.length);
        samplerPop.push(sim.waiting.filter(p => p.type === 'sampler').length
                      + sum(sim.shafts.map(s => s.riders.filter(r => r.type === 'sampler').length)));
      }
      prevServed = st.stats.served;
    }

    // 事件的餘波：每一次事件之後 90 秒內放棄了幾個人、等待峰值
    const evStats = {};
    for (const e of evLog){ evStats[e.name] = (evStats[e.name] || 0) + 1; }

    const out = {
      seed, floors: cfg.floors, algo: cfg.algo, days: cfg.days,
      served: st.stats.served, abandoned: st.stats.abandoned, trips: st.stats.trips,
      tips: st.stats.tips || 0, revenue: st.runRevenue, rating: st.rating,
      codex: { ...st.codex },
      evStats, evLog, episodes,
      waitMean: mean(waitSamples), waitMax: Math.max(0, ...waitSamples),
      samplerMax: Math.max(0, ...samplerPop), samplerFinal: samplerPop[samplerPop.length - 1] || 0,
      eSize: mean(sizeSamples), spawned: sizeSamples.length,
      seen,
    };
    return out;
  } finally {
    Math.random = orig;
    // 還原被 A/B 動過的欄位
    PASSENGERS.length = 0; for (const p of snapPax) PASSENGERS.push(p);
    EVENTS.length = 0;     for (const e of snapEv)  EVENTS.push(e);
  }
}

// ---------------------------------------------------------------- 報告
export async function main(){
  const secs = [];
  const push = (title, body) => secs.push({ title, body });
  const yield_ = () => new Promise(r => setTimeout(r, 0));

  // ============================================================ 1 事件頻率
  // 「一場遊戲遇到幾次」。這裡把一場遊戲定義成 **20 個遊戲日**（= 60 分鐘實時），
  // 跟 #22 打蠟第二次配平用的長度一樣，數字才比得起來。
  const FREQ_SEEDS = [11, 22, 33, 44, 55, 66, 77, 88];
  const freqRows = [];
  for (const floors of [5, 12, 40, 100]){
    const perGame = {};
    for (const s of FREQ_SEEDS){
      const r = run(s, { floors, algo: 'look', days: 20 });
      for (const k in r.evStats) (perGame[k] = perGame[k] || []).push(r.evStats[k]);
      for (const k of ['打烊清場', '試吃推銷', '地板打蠟'])
        if (!(k in perGame)) perGame[k] = [];
      await yield_();
    }
    // 把沒出現的種子補 0
    for (const k in perGame) while (perGame[k].length < FREQ_SEEDS.length) perGame[k].push(0);
    freqRows.push({ floors, perGame });
  }
  {
    const body = ['一場遊戲 = 20 個遊戲日（跟 #22 打蠟配平用的長度一致）。8 顆種子，LOOK。',
      '格式：中位 / 最小–最大（8 顆種子）', ''];
    for (const row of freqRows){
      body.push(`— ${row.floors} 層 —`);
      const keys = Object.keys(row.perGame).sort((a, b) => mean(row.perGame[b]) - mean(row.perGame[a]));
      for (const k of keys){
        const v = row.perGame[k];
        const tag = (k === '打烊清場' || k === '試吃推銷') ? '  ◀ 這一趟的' : '';
        body.push(`  ${k.padEnd(6, '　')} 平均 ${r2(mean(v))}　中位 ${q(v, 0.5)}　範圍 ${Math.min(...v)}–${Math.max(...v)}${tag}`);
      }
      body.push('');
    }
    push('1 一場遊戲遇到幾次（分布，不是只有平均）', body);
  }

  // ============================================================ 2 hours vs w
  // 打烊清場只有 [21,23] 兩小時。把 w 從 26 拉到 100 會怎樣？
  const wTest = [];
  for (const w of [26, 100]){
    const ev = EVENTS.find(e => e.id === 'closetime');
    const old = ev.w; ev.w = w;
    const counts = [];
    for (const s of FREQ_SEEDS){ counts.push(run(s, { floors: 12, algo: 'look', days: 20 }).evStats['打烊清場'] || 0); await yield_(); }
    ev.w = old;
    wTest.push({ w, counts });
  }
  push('2 頻率的瓶頸是 hours 不是 w（證偽用）', [
    '把打烊清場的 w 從 26 拉到 100（3.8 倍）之後，一場遊戲的次數：',
    ...wTest.map(x => `  w=${String(x.w).padStart(3)}　平均 ${r2(mean(x.counts))}　範圍 ${Math.min(...x.counts)}–${Math.max(...x.counts)}`),
    '',
    '結構上的上限：EVENT_EVERY 75 秒 × EVENT_CHANCE 0.55 = 1.32 次事件/遊戲日；',
    `[21,23] 只占一天的 8.3%，所以 20 天裡這個窗總共只有 ${r2(20 * 1.32 * 2 / 24)} 次事件機會。`,
    'w 只決定「在窗裡贏誰」。這跟 #22 打蠟第二次配平得到的是同一條結論。',
  ]);

  // ============================================================ 3 型別占比
  const shareRows = [];
  for (const floors of [5, 12, 40, 100]){
    const acc = {}; let tot = 0;
    for (const s of FREQ_SEEDS){
      const r = run(s, { floors, algo: 'look', days: 20 });
      for (const k in r.codex){ acc[k] = (acc[k] || 0) + r.codex[k]; tot += r.codex[k]; }
      await yield_();
    }
    shareRows.push({ floors, acc, tot });
  }
  {
    const body = ['度量跟 #27 網紅那一列一樣：**玩家實際載到的人裡占幾 %**（codex，不是 w）。',
      '8 顆種子 × 20 日 × LOOK 的合計。', ''];
    for (const row of shareRows){
      body.push(`— ${row.floors} 層（總送達 ${row.tot}）—`);
      const keys = Object.keys(row.acc).sort((a, b) => row.acc[b] - row.acc[a]);
      for (const k of keys){
        const tag = MINE_PAX.includes(k) ? '  ◀' : (k === 'influencer' ? '  ← #27 的參照點' : '');
        body.push(`  ${k.padEnd(11)} ${String(row.acc[k]).padStart(6)}　${pct(row.acc[k], row.tot)}${tag}`);
      }
      body.push('');
    }
    push('3 四個人物實際占玩家載到的人的幾 %', body);
  }

  // ============================================================ 4 全掃調度
  const algoRows = [];
  for (const algo of Object.keys(ALGOS)){
    const rs = [];
    for (const s of [11, 22, 33, 44]){ rs.push(run(s, { floors: 12, algo, days: 20 })); await yield_(); }
    algoRows.push({ algo, rs });
  }
  {
    const body = ['12 層、4 顆種子、20 日。**六種調度全掃**——只測一種等於沒測。', ''];
    body.push('  演算法   送達   放棄   放棄率   小費   小費/購物客   等待峰值   評價');
    for (const row of algoRows){
      const served = sum(row.rs.map(r => r.served));
      const ab = sum(row.rs.map(r => r.abandoned));
      const tips = sum(row.rs.map(r => r.tips));
      const loaded = sum(row.rs.map(r => r.codex.loaded || 0));
      const wmax = Math.max(...row.rs.map(r => r.waitMax));
      const rating = mean(row.rs.map(r => r.rating));
      body.push(`  ${row.algo.padEnd(8)} ${String(served).padStart(5)} ${String(ab).padStart(6)}  ${pct(ab, served + ab).padStart(7)}  ${String(tips).padStart(5)}   ${pct(tips, loaded).padStart(8)}   ${String(wmax).padStart(8)}   ${r2(rating)}`);
    }
    push('4 全掃六種調度（小費真的發得出來嗎）', body);
  }

  // ============================================================ 5 小費值多少錢（配對 A/B）
  // 小費不消耗 Math.random，所以 tip 開/關在同一顆種子上是**逐字相同的軌跡**，
  // 收入差就是純小費。這是這一份唯一成立的配對比較。
  {
    const rows = [];
    for (const algo of ['fifo', 'look', 'group']){
      let on = 0, off = 0, tips = 0, loaded = 0, served = 0;
      for (const s of [11, 22, 33, 44]){
        const a = run(s, { floors: 12, algo, days: 20 });
        const b = run(s, { floors: 12, algo, days: 20, tipOff: true });
        on += a.revenue; off += b.revenue; tips += a.tips;
        loaded += a.codex.loaded || 0; served += a.served;
        if (a.served !== b.served)
          rows.push(`  ⚠ ${algo}/${s}：開關小費之後送達數不同（${a.served} vs ${b.served}）—— 配對比較不成立`);
      }
      rows.push(`  ${algo.padEnd(6)} 小費收入 $${Math.round(on - off)}　占總收入 ${pct(on - off, on)}　` +
                `${tips} 次 / ${loaded} 個購物客 = ${pct(tips, loaded)}`);
    }
    push('5 小費值多少錢（配對 A/B：小費不消耗亂數，同種子逐字同軌跡）', [
      '12 層、4 顆種子、20 日。', ...rows]);
  }

  // ============================================================ 6 新手會不會崩掉
  {
    const body = ['5 層、**手動（沒有任何調度演算法）**、沒有升級、30 個遊戲日、6 顆種子。',
      '手動模式下自動送達是 0，所以這一組量的是「**堆積**」不是「送達」——',
      '這正是 patience:999 的試吃推銷員唯一會出事的地方。', ''];
    const seeds = [11, 22, 33, 44, 55, 66];
    for (const algo of ['manual', 'fifo']){
      const rs = [];
      for (const s of seeds){ rs.push(run(s, { floors: 5, algo, days: 30 })); await yield_(); }
      body.push(`— ${algo} —`);
      body.push(`  送達 ${sum(rs.map(r => r.served))}　放棄 ${sum(rs.map(r => r.abandoned))}` +
                `　等待峰值 中位 ${q(rs.map(r => r.waitMax), 0.5)} / 最大 ${Math.max(...rs.map(r => r.waitMax))}（WAIT_CAP = 160）`);
      body.push(`  試吃推銷員同時在場：最大 ${Math.max(...rs.map(r => r.samplerMax))}　` +
                `30 日結束時 中位 ${q(rs.map(r => r.samplerFinal), 0.5)} / 最大 ${Math.max(...rs.map(r => r.samplerFinal))}`);
      body.push(`  打烊清場 ${sum(rs.map(r => r.evStats['打烊清場'] || 0))} 次／試吃推銷 ${sum(rs.map(r => r.evStats['試吃推銷'] || 0))} 次（6 顆種子 × 30 日合計）`);
      body.push(`  每個乘客的平均佔位 ${r2(mean(rs.map(r => r.eSize)))} 格（起始載客量 4）`);
      body.push('');
    }
    // 接力開/關：試吃推銷員的族群會不會單調成長
    const relayOn = [], relayOff = [];
    for (const s of seeds){
      relayOn.push(run(s, { floors: 5, algo: 'manual', days: 30 }).samplerFinal);
      relayOff.push(run(s, { floors: 5, algo: 'manual', days: 30, relayOff: true }).samplerFinal);
      await yield_();
    }
    body.push('接力（summon）開/關，手動 5 層 30 日結束時還在場的試吃推銷員：');
    body.push(`  開 ${relayOn.join(',')}　關 ${relayOff.join(',')}`);
    body.push('  手動模式送達是 0，所以接力永遠不會觸發 —— 兩邊應該一樣。');
    body.push('  **這一列本身證明不了接力有效**（母體是空的）；接力有沒有效看第 7 組。');
    push('6 新手（5 層、手動）會不會崩掉', body);
  }

  // ============================================================ 7 接力真的發生了嗎
  {
    const body = ['母體非空的證明：先確認有試吃推銷員被送達，再問「送達之後有沒有多出一個」。',
      '12 層、LOOK、6 顆種子、20 日。', ''];
    let onDeliv = 0, offDeliv = 0, onEv = 0, offEv = 0;
    for (const s of FREQ_SEEDS.slice(0, 6)){
      const a = run(s, { floors: 12, algo: 'look', days: 20 });
      const b = run(s, { floors: 12, algo: 'look', days: 20, relayOff: true });
      onDeliv  += a.codex.sampler || 0; onEv  += a.evStats['試吃推銷'] || 0;
      offDeliv += b.codex.sampler || 0; offEv += b.evStats['試吃推銷'] || 0;
      await yield_();
    }
    body.push(`  接力開：試吃推銷 ${onEv} 次事件 → 送達 ${onDeliv} 個推銷員（${r2(onDeliv / Math.max(1, onEv))} 個/次）`);
    body.push(`  接力關：試吃推銷 ${offEv} 次事件 → 送達 ${offDeliv} 個推銷員（${r2(offDeliv / Math.max(1, offEv))} 個/次）`);
    body.push('  ⚠ 關掉 summon 會改變 Math.random 的消耗順序，所以這**不是**配對比較，');
    body.push('    只能看每次事件的產出比。事件 n 是 2–4（期望 3），扣掉起點=終點被擋掉的，');
    body.push('    接力關 ≈ 一次事件送達的人數上限；接力開應該接近它的兩倍。');
    push('7 接力（summon）真的發生了嗎', body);
  }

  // ============================================================ 8 最糟的那一次
  {
    const body = ['每一次打烊清場之後 90 秒內的餘波。12 層、4 顆種子 × 20 日，六種調度全掃。',
      '「這一批」= 這次事件生出來的人；放棄率是他們自己的，不是全樓的。', ''];
    const worst = [];
    for (const algo of Object.keys(ALGOS)){
      const eps = [];
      for (const s of [11, 22, 33, 44]){
        const r = run(s, { floors: 12, algo, days: 20 });
        for (const [, ep] of r.episodes){
          if (ep.name !== '打烊清場') continue;
          let gone = 0, n = 0;
          for (const id of ep.ids){ n++; const rec = r.seen.get(id); if (rec && rec.gone) gone++; }
          eps.push({ n, gone, floor: ep.floor + 1, algo, seed: s });
        }
        await yield_();
      }
      if (!eps.length){ body.push(`  ${algo.padEnd(8)} 一次都沒發生（樣本為空，這一列什麼都沒證明）`); continue; }
      const rates = eps.map(e => e.gone / Math.max(1, e.n));
      const w = eps.reduce((a, b) => (a.gone / a.n >= b.gone / b.n ? a : b));
      worst.push(w);
      body.push(`  ${algo.padEnd(8)} ${String(eps.length).padStart(2)} 次　這一批的放棄率 中位 ${pct(q(rates, 0.5), 1)}　` +
                `p90 ${pct(q(rates, 0.9), 1)}　最糟 ${w.gone}/${w.n}（${pct(w.gone / w.n, 1)}，${w.floor} 樓，種子 ${w.seed}）`);
    }
    body.push('');
    body.push('對照：全樓的整體放棄率見第 4 組。這一批的放棄率比全樓高才對——');
    body.push('10–16 個人同時出現在同一層，本來就是這個事件的本體。');
    push('8 最糟的那一次長什麼樣（六種調度全掃）', body);
  }

  // ============================================================ 9 撞在一起
  {
    const body = ['打烊清場在 21–23 點。同一時間還有什麼？', ''];
    const hourHist = {};
    for (const s of FREQ_SEEDS){
      const r = run(s, { floors: 40, algo: 'look', days: 20 });
      for (const e of r.evLog){
        const h = Math.floor(e.hour);
        if (h >= 21 && h < 23){ hourHist[e.name] = (hourHist[e.name] || 0) + 1; }
      }
      await yield_();
    }
    const tot = sum(Object.values(hourHist));
    for (const k of Object.keys(hourHist).sort((a, b) => hourHist[b] - hourHist[a]))
      body.push(`  ${k.padEnd(6, '　')} ${String(hourHist[k]).padStart(3)} 次　${pct(hourHist[k], tot)}`);
    body.push('');
    body.push('rushMult：21–22 點是 1.0、22 點之後掉到 0.55（sim.js 的 rushMult，只作用在上班族）。');
    body.push('零售層的到達率由 windowWeight(h, retail.up/down) 決定：[11,21] 窗外，21 點之後開始衰減。');
    body.push('所以打烊清場**撞不到辦公尖峰**（8–10 / 17–19），它撞的是自己那一帶的離峰。');
    body.push('這是對的：關門的時候人潮本來就在退，事件要製造的是「最後一批」不是「再一波」。');
    push('9 跟尖峰撞在一起會怎樣', body);
  }

  // ============================================================ 10 加了這幾列之後整體變重多少
  {
    const body = ['把這一趟加的東西全部關掉（stroller/loaded 的 w 歸 0、兩列事件移除）當對照。',
      '⚠ 這**不是**配對比較（權重改了，亂數消耗就變了），所以看的是 8 顆種子的分布。', ''];
    for (const floors of [5, 12, 100]){
      const on = [], off = [];
      for (const s of FREQ_SEEDS){
        on.push(run(s, { floors, algo: 'look', days: 20 }));
        off.push(run(s, { floors, algo: 'look', days: 20, mineOff: true }));
        await yield_();
      }
      const f = (rs, k) => r2(mean(rs.map(k)));
      body.push(`— ${floors} 層 —`);
      body.push(`  平均佔位/人   加了 ${f(on, r => r.eSize)}　對照 ${f(off, r => r.eSize)}`);
      body.push(`  放棄率        加了 ${pct(sum(on.map(r => r.abandoned)), sum(on.map(r => r.served + r.abandoned)))}` +
                `　對照 ${pct(sum(off.map(r => r.abandoned)), sum(off.map(r => r.served + r.abandoned)))}`);
      body.push(`  送達/場        加了 ${f(on, r => r.served)}　對照 ${f(off, r => r.served)}`);
      body.push(`  收入/場        加了 $${Math.round(mean(on.map(r => r.revenue)))}　對照 $${Math.round(mean(off.map(r => r.revenue)))}`);
      body.push(`  等待峰值(最大) 加了 ${Math.max(...on.map(r => r.waitMax))}　對照 ${Math.max(...off.map(r => r.waitMax))}`);
      body.push('');
    }
    push('10 加了這幾列之後整體變重多少', body);
  }

  // ============================================================ 11 成就門檻
  {
    const body = ['門檻要對得上「一場遊戲拿得到幾個」。codex 跨拆樓保留，所以這是累計的。',
      '8 顆種子 × 20 日 × LOOK，每一場的中位數：', ''];
    for (const floors of [12, 100]){
      const per = { stroller: [], loaded: [], janitor: [], sampler: [], closing: [], tips: [] };
      for (const s of FREQ_SEEDS){
        const r = run(s, { floors, algo: 'look', days: 20 });
        for (const k of MINE_PAX) per[k].push(r.codex[k] || 0);
        per.tips.push(r.tips);
        await yield_();
      }
      body.push(`— ${floors} 層 —`);
      const want = { stroller: 30, loaded: null, janitor: 10, sampler: 12, closing: 20, tips: 25 };
      for (const k in per){
        const v = per[k];
        const w = want[k];
        const med = q(v, 0.5);
        const games = w ? (med > 0 ? r1(w / med) + ' 場' : '拿不到') : '—';
        body.push(`  ${k.padEnd(9)} 每場 中位 ${String(med).padStart(4)}　範圍 ${Math.min(...v)}–${Math.max(...v)}` +
                  (w ? `　門檻 ${w} → 約 ${games}` : ''));
      }
      body.push('');
    }
    push('11 成就門檻對得上嗎', body);
  }

  return secs;
}
