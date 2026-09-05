// _probe/sim-retail.js — 第 3 階段：模擬。不是測試，是量測。
// 要回答的是分布與離群，不是平均值：
//   · 一場遊戲會遇到幾次地板打蠟？
//   · 最糟的那一次長什麼樣？
//   · 封鎖跟尖峰撞在一起會怎樣？
//   · 招來同伴會不會在高人流時滾雪球？
//
// 儀器分成兩半，理由寫在下面：
//   A) **固定樓況**的受控量測（樓層數、調度演算法、時長都釘死），用來比 A/B。
//   B) 自動玩家跑完整一場，只用來估「一場遊戲有多長」。
// 一開始整份都用 (B)，結果 12 局裡 6 局蓋到 100 層、4 局卡在 5 層——A/B 的差異
// 完全被那個分岔吃掉（打蠟開/關的收入中位數差了 12 倍，而打蠟根本不可能有那種
// 影響力）。而且拿掉一列資料會改變 Math.random 的消耗順序，同一個種子並不會走
// 同一條軌跡，所以 (B) 的配對比較從一開始就不成立。
import { CONFIG as C, PASSENGERS, EVENTS, UPGRADES, AUTOMATION } from '../js/content.js';
import * as M from '../js/sim.js';
import * as S from '../js/state.js';
import { setLang } from '../js/i18n.js';

setLang('zh');

const DT = 1 / 20;
const AUTO_ORDER = ['autodoor', 'fifo', 'scan', 'look'];

function seeded(seed){
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const q = (arr, p) => { if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const sum = a => a.reduce((x, y) => x + y, 0);
const mean = a => a.length ? sum(a) / a.length : 0;
const r2 = n => Math.round(n * 100) / 100;
const money = n => '$' + Math.round(n).toLocaleString();

// ---------------------------------------------------------------- 共用的跑一段
// 一次量測：釘住亂數、跑 days 個遊戲日，回報封鎖事件與人口統計。
function measure(seed, cfg){
  cfg = cfg || {};
  const origRandom = Math.random;
  const paxSnap = PASSENGERS.map(p => ({ ...p }));
  const evSnap = EVENTS.map(e => ({ ...e }));
  try {
    if (cfg.summonOff) for (const p of PASSENGERS) delete p.summon;
    if (cfg.waxOff){ const i = EVENTS.findIndex(e => e.id === 'waxing'); if (i >= 0) EVENTS.splice(i, 1); }
    Math.random = seeded(seed);

    const st = S.newGame();
    if (cfg.floors) st.floors = cfg.floors;
    if (cfg.auto) Object.assign(st.auto, cfg.auto);
    if (cfg.up) for (const k in cfg.up) st.up[k] = cfg.up[k];
    const sim = M.createSim(st);
    M.syncShafts(st, sim);

    const steps = Math.round((cfg.days || 20) * C.DAY_SECONDS / DT);
    const cap = cfg.autoPlay ? steps : steps;

    const origin = new Map();
    const blocks = [];
    let curBlock = null;
    const waitLen = [];
    let organicInf = 0, summonedInf = 0, abandonedOnBlocked = 0, abandonedTotal = 0;
    const seenIds = new Set();
    let buyT = 0;

    for (let i = 0; i < cap; i++){
      if (cfg.autoPlay){
        buyT += DT;
        if (buyT >= 2){ buyT = 0; autoBuy(st);
          if (sim.shafts.length !== S.derived(st).shafts) M.syncShafts(st, sim); }
        tapFloors(st, sim);
      }
      const before = new Map(origin);
      M.step(st, sim, DT);

      const nowW = new Set(), nowR = new Set();
      for (const p of sim.waiting){
        nowW.add(p.id); origin.set(p.id, p.origin);
        if (!seenIds.has(p.id)){ seenIds.add(p.id);
          if (p.type === 'influencer'){ if (p.summoned) summonedInf++; else organicInf++; } }
      }
      for (const s of sim.shafts) for (const r of s.riders){ nowR.add(r.id); seenIds.add(r.id); }
      for (const [id, o] of before){
        if (!nowW.has(id) && !nowR.has(id)){
          origin.delete(id); abandonedTotal++;
          if (curBlock && o === curBlock.floor) abandonedOnBlocked++;
        }
      }
      if (i % 20 === 0) waitLen.push(sim.waiting.length);

      const bf = M.blockedFloors(st, sim);
      if (bf.length && !curBlock){
        const f = bf[0], h = M.hourOf(st);
        curBlock = { floor: f, startT: st.t, hour: h, day: Math.floor(st.t / C.DAY_SECONDS),
                     floors: st.floors, queueAtStart: sim.waiting.filter(p => p.origin === f).length,
                     abandonBase: abandonedOnBlocked, waiting: sim.waiting.length };
      } else if (!bf.length && curBlock){
        curBlock.secs = st.t - curBlock.startT;
        curBlock.lost = abandonedOnBlocked - curBlock.abandonBase;
        curBlock.rush = (curBlock.hour >= 8 && curBlock.hour < 10) ? '早尖峰(×3.0)'
                      : (curBlock.hour >= 17 && curBlock.hour < 19) ? '晚尖峰(×2.4)' : '平時';
        blocks.push(curBlock);
        curBlock = null;
      }
      if (cfg.autoPlay && st.floors >= C.MAX_FLOORS && st.cash > 2e6) break;
    }

    return { seed, days: st.t / C.DAY_SECONDS, floors: st.floors,
             revenue: st.runRevenue, served: st.stats.served, abandoned: st.stats.abandoned,
             rating: st.rating, blocks, abandonedOnBlocked, organicInf, summonedInf,
             codex: { ...st.codex },   // 送達的人裡各種型別各有幾個
             waitP50: q(waitLen, 0.5), waitP95: q(waitLen, 0.95),
             waitMax: waitLen.length ? Math.max(...waitLen) : 0 };
  } finally {
    Math.random = origRandom;
    PASSENGERS.length = 0; for (const p of paxSnap) PASSENGERS.push(p);
    EVENTS.length = 0; for (const e of evSnap) EVENTS.push(e);
  }
}

// 自動玩家的採購：自動化優先，而且**會為下一階自動化留錢**；有錢先加蓋。
// 第一版是「買得起就買最便宜的」，結果 12 局收入全是 0：它花 $60 買自動關門、
// 剩下的錢一直拿去買 $50 的載客量，永遠存不到 $450 的 FIFO——而沒有 FIFO，
// chooseTarget() 直接回傳 null，電梯**一步都不會動**。那不是模擬的 bug，是遊戲
// 開場的真實形狀（前 $450 必須玩家自己點樓層），所以下面另外補了手動點擊。
function autoBuy(st){
  let nextAuto = null;
  for (const id of AUTO_ORDER){
    const a = AUTOMATION.find(x => x.id === id);
    if (!st.auto[id] && a.cur === 'cash'){ nextAuto = a; break; }
  }
  if (nextAuto && st.cash >= nextAuto.cost){ S.buyAutomation(st, nextAuto.id); return; }
  const reserve = nextAuto ? nextAuto.cost : 0;
  const spend = st.cash - reserve;
  // 加蓋優先（遊戲自己的建議：樓越高，同樣的距離值越多錢），其次電梯井，再來最便宜的
  for (const id of ['floor', 'shaft']){
    if (!S.upgradeMaxed(st, id) && S.upgradeCost(st, id) <= spend){ S.buyUpgrade(st, id); return; }
  }
  let best = null, bestC = Infinity;
  for (const u of UPGRADES){
    if (S.upgradeMaxed(st, u.id)) continue;
    const c = S.upgradeCost(st, u.id);
    if (c <= spend && c < bestC){ bestC = c; best = u.id; }
  }
  if (best) S.buyUpgrade(st, best);
}

// 手動點樓層：還沒買調度演算法的時候，電梯只會去玩家點的地方。
function tapFloors(st, sim){
  if (!S.isManual(st)) return;
  for (const s of sim.shafts){
    if (s.mode !== 'idle' && s.mode !== 'held') continue;
    if (s.target != null || s.queue.length) continue;
    if (s.riders.length){
      let best = s.riders[0].dest;
      for (const r of s.riders) if (Math.abs(r.dest - s.pos) < Math.abs(best - s.pos)) best = r.dest;
      M.requestFloor(st, sim, best, s.id);
    } else if (sim.waiting.length){
      let oldest = null;
      for (const p of sim.waiting) if (!oldest || p.born < oldest.born) oldest = p;
      if (oldest) M.requestFloor(st, sim, oldest.origin, s.id);
    }
  }
}

// 隨機事件池在一天中每個小時有哪些事件可選（資料層的事實，不用跑模擬）
function poolByHour(){
  const out = [];
  for (let h = 0; h < 24; h++){
    const pool = EVENTS.filter(e => !e.byTenant && M.inHourWindow(h + 0.5, e.hours));
    const total = sum(pool.map(e => e.w));
    const wax = pool.find(e => e.id === 'waxing');
    out.push({ h, n: pool.length, ids: pool.map(e => e.id), waxShare: wax && total ? wax.w / total : 0 });
  }
  return out;
}

// 三種樓況：早期（手動買到 LOOK 之前的樣子）、中期、後期
const STAGES = [
  ['早期 10 層 · FIFO',        { floors: 10,  auto: { autodoor:1, fifo:1 } }],
  ['中期 40 層 · LOOK',        { floors: 40,  auto: { autodoor:1, fifo:1, scan:1, look:1 }, up:{ cap:6, speed:10, accel:8, shaft:2 } }],
  ['後期 100 層 · 群組+目的地', { floors: 100, auto: { autodoor:1, fifo:1, scan:1, look:1, dest:1, group:1, shuttle:1 }, up:{ cap:14, speed:30, accel:26, door:10, shaft:5 } }],
];
const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88];
const DAYS = 25;

export async function run(){
  const out = [];
  const say = (title, body) => out.push({ title, body });

  // ---------------------------------------------------------------- 事件池的形狀
  const pool = poolByHour();
  const empty = pool.filter(p => p.n === 0).map(p => p.h);
  const only = pool.filter(p => p.n === 1).map(p => `${p.h}時只有 ${p.ids[0]}`);
  say('隨機事件池 · 每小時可選的事件（資料層，不用模擬）', [
    `完全沒有事件可選的小時：${empty.length ? empty.join(', ') + ' 時' : '無'}`
      + `　← 加這一列之前是 0–6 時共 7 個小時，現在剩 5 個`,
    `只有一列可選的小時：${only.join('、') || '無'}`,
    `地板打蠟在池子裡的權重占比：`
      + pool.filter(p => p.waxShare > 0).map(p => `${p.h}時 ${(p.waxShare * 100).toFixed(0)}%`).join('、'),
  ]);

  // ---------------------------------------------------------------- 三種樓況 × 8 個種子
  const byStage = {};
  for (const [name, cfg] of STAGES){
    byStage[name] = {
      on:  SEEDS.map(s => measure(s, { ...cfg, days: DAYS })),
      noS: SEEDS.map(s => measure(s, { ...cfg, days: DAYS, summonOff: true })),
      noW: SEEDS.map(s => measure(s, { ...cfg, days: DAYS, waxOff: true })),
    };
  }

  // ---- 頻率
  const freqLines = [];
  for (const [name] of STAGES){
    const rs = byStage[name].on;
    const n = rs.map(r => r.blocks.length);
    freqLines.push(`${name}：每 ${DAYS} 個遊戲日 ${n.join(', ')} 次`
      + `（中位 ${q(n, 0.5)}、最少 ${Math.min(...n)}、最多 ${Math.max(...n)}）`
      + ` → 每個遊戲日 ${r2(mean(n) / DAYS)} 次`);
  }
  say('地板打蠟 · 頻率（一天 = 3 分鐘實時）', freqLines.concat([
    `註：頻率跟樓高幾乎無關——瓶頸是 hours:[5,10) 這個窗，不是 w:12。`,
  ]));

  // ---- 每一次的代價
  const costLines = [];
  let worstAll = null;
  for (const [name] of STAGES){
    const bs = byStage[name].on.flatMap(r => r.blocks);
    if (!bs.length){ costLines.push(`${name}：一次都沒發生`); continue; }
    const lost = bs.map(b => b.lost), qs = bs.map(b => b.queueAtStart);
    costLines.push(`${name}（${bs.length} 次）：開始時那層在等 中位 ${q(qs, 0.5)} / P90 ${q(qs, 0.9)} / 最多 ${Math.max(...qs)}；`
      + `流失 中位 ${q(lost, 0.5)} / P90 ${q(lost, 0.9)} / **最糟 ${Math.max(...lost)}**；`
      + `零流失的比例 ${(lost.filter(x => x === 0).length / lost.length * 100).toFixed(0)}%`);
    const w = bs.slice().sort((a, b) => b.lost - a.lost)[0];
    if (!worstAll || w.lost > worstAll.b.lost) worstAll = { name, b: w };
  }
  const allSecs = Object.values(byStage).flatMap(o => o.on).flatMap(r => r.blocks).map(b => b.secs);
  say('地板打蠟 · 每一次的代價（分布，不是平均）', costLines.concat([
    `封鎖秒數（全部）：中位 ${r2(q(allSecs, 0.5))}、最短 ${r2(Math.min(...allSecs))}、最長 ${r2(Math.max(...allSecs))}`
      + `（資料寫 [18,30]）`,
  ]));

  say('地板打蠟 · 最糟的那一次', worstAll ? [
    `${worstAll.name}｜第 ${worstAll.b.day} 個遊戲日、${r2(worstAll.b.hour)} 點、樓層索引 ${worstAll.b.floor}（第 ${worstAll.b.floor + 1} 樓）`,
    `封鎖 ${r2(worstAll.b.secs)} 秒；開始時那層有 ${worstAll.b.queueAtStart} 個人在等、全樓 ${worstAll.b.waiting} 個人在等`,
    `流失 ${worstAll.b.lost} 人｜時段：${worstAll.b.rush}`,
  ] : ['沒有任何封鎖發生']);

  // ---- 尖峰碰撞
  const rushLines = [];
  for (const [name] of STAGES){
    const bs = byStage[name].on.flatMap(r => r.blocks);
    const g = {};
    for (const b of bs) (g[b.rush] = g[b.rush] || []).push(b.lost);
    rushLines.push(`${name}：` + Object.keys(g).map(k =>
      `${k} ${g[k].length} 次 → 流失中位 ${q(g[k], 0.5)}/P90 ${q(g[k], 0.9)}/最糟 ${Math.max(...g[k])}`).join('　'));
  }
  say('地板打蠟 × 尖峰時段（這是刻意設計的碰撞）', rushLines.concat([
    `hours:[5,10) 有一半落在早尖峰 8–10 點（rushMult ×3.0）。零售帶自己的尖峰窗是`
      + `[11,20]/[11,21]，所以封鎖永遠不會落在**這一帶**的尖峰裡——被放大的是全樓人流，`
      + `不是被封那一層的人流。`,
  ]));

  // ---- 打蠟開/關
  const waxAB = [];
  for (const [name] of STAGES){
    const o = byStage[name].on, w = byStage[name].noW;
    const rate = rs => q(rs.map(r => r.abandoned / Math.max(1, r.served + r.abandoned)), 0.5);
    waxAB.push(`${name}：送達中位 ${q(o.map(r => r.served), 0.5)} → ${q(w.map(r => r.served), 0.5)}（關掉打蠟）；`
      + `放棄率 ${(rate(o) * 100).toFixed(1)}% → ${(rate(w) * 100).toFixed(1)}%；`
      + `收入 ${money(q(o.map(r => r.revenue), 0.5))} → ${money(q(w.map(r => r.revenue), 0.5))}`);
  }
  say('地板打蠟 · 開 vs 關（各 8 個種子，非配對）', waxAB.concat([
    `拿掉一列 EVENTS 會改變 Math.random 的消耗順序，所以同種子**不是**同一條軌跡；`
      + `這是兩組各 8 局的比較，差異要小於組內散布才算「沒影響」。`,
  ]));

  // ---- 招來同伴
  const sumLines = [], snowLines = [];
  for (const [name] of STAGES){
    const o = byStage[name].on, n = byStage[name].noS;
    const org = o.map(r => r.organicInf), smd = o.map(r => r.summonedInf);
    const mult = o.map(r => r.organicInf ? (r.organicInf + r.summonedInf) / r.organicInf : 0);
    sumLines.push(`${name}：有機 中位 ${q(org, 0.5)}、同伴 中位 ${q(smd, 0.5)} → `
      + `倍率 中位 ${r2(q(mult, 0.5))}（範圍 ${r2(Math.min(...mult))}–${r2(Math.max(...mult))}）`);
    const rate = rs => q(rs.map(r => r.abandoned / Math.max(1, r.served + r.abandoned)), 0.5);
    snowLines.push(`${name}：waiting P95 ${q(o.map(r => r.waitP95), 0.5)} vs ${q(n.map(r => r.waitP95), 0.5)}（關掉）；`
      + `waiting 最大 ${Math.max(...o.map(r => r.waitMax))} vs ${Math.max(...n.map(r => r.waitMax))}；`
      + `放棄率 ${(rate(o) * 100).toFixed(1)}% vs ${(rate(n) * 100).toFixed(1)}%；`
      + `收入 ${money(q(o.map(r => r.revenue), 0.5))} vs ${money(q(n.map(r => r.revenue), 0.5))}`);
  }
  say('網紅排隊客 · 同伴的倍率（實際看到的量 ÷ 資料裡的 w）', sumLines.concat([
    `理論上限 4.0（每個有機網紅招 2–3 個，同伴不再招人）。實際低於上限的原因：`
      + `只有**被送到**的網紅才招人（放棄的不算），而且目的地是大廳時不招（大廳 → 大廳）。`,
    `倍率跟樓況有關：早期大部分網紅在被送到之前就放棄了（1.04），後期幾乎每個都送得到（3.3）。`
      + `所以這個機制是**越會玩越強**的獎勵，不是一個固定加成。`,
  ]));
  say('招來同伴 · 會不會在高人流時滾雪球（WAIT_CAP = 160）', snowLines.concat([
    `雪球被兩道閘擋住：同伴不再招同伴（深度上限 1），以及跟 spawn 迴圈共用 WAIT_CAP。`
      + `拿掉深度上限實測會生到 159 個（只剩 WAIT_CAP 擋著）。`,
  ]));

  // ---------------------------------------------------------------- 人口占比
  // w 對不對，看的不是 w 本身而是「玩家實際載到的人裡，網紅占多少」——
  // 招來的同伴是直接注入大廳的，繞過樓層帶抽樣，所以 w 說的量跟看到的量不是同一件事。
  // 帶專屬人物的家族（房客 30 / 住戶 34 / 觀景客 30 / 研究員 26）是對照組。
  const shareLines = [];
  for (const [name] of STAGES){
    const agg = {};
    for (const r of byStage[name].on) for (const k in r.codex) agg[k] = (agg[k] || 0) + r.codex[k];
    const tot = sum(Object.values(agg));
    const rows = Object.keys(agg).sort((a, b) => agg[b] - agg[a])
      .map(k => `${k} ${(agg[k] / tot * 100).toFixed(1)}%`);
    // 關掉同伴之後網紅占多少
    const agg2 = {};
    for (const r of byStage[name].noS) for (const k in r.codex) agg2[k] = (agg2[k] || 0) + r.codex[k];
    const tot2 = sum(Object.values(agg2));
    shareLines.push(`${name}（送達 ${tot} 人）：${rows.join('、')}`);
    shareLines.push(`　↳ 關掉同伴後網紅占 ${tot2 ? ((agg2.influencer || 0) / tot2 * 100).toFixed(1) : '-'}%`
      + `（有同伴時 ${(( agg.influencer || 0) / tot * 100).toFixed(1)}%）`);
  }
  say('送達乘客的型別占比（w 對不對，看這個，不是看 w 本身）', shareLines);

  // ---------------------------------------------------------------- 參數掃描
  // 我選的是 hours:[5,10) / block:[18,30]。上面的數字說它「幾乎不痛」（中位流失 0、
  // 最糟 2）。要不要更痛是 owner 的決定，不是我的——所以把幾個候選一起量出來。
  const sweepCfg = STAGES[1][1];   // 中期 40 層 · LOOK
  const variants = [
    ['[5,10) × 18–30s（現在的選擇）', [5, 10],  [18, 30]],
    ['[5,10) × 40–70s',              [5, 10],  [40, 70]],
    ['[11,20) × 18–30s（撞零售自己的尖峰）', [11, 20], [18, 30]],
    ['[11,20) × 40–70s',             [11, 20], [40, 70]],
    ['整天 [0,24) × 18–30s',          [0, 24],  [18, 30]],
  ];
  const sweepLines = [];
  for (const [label, hours, block] of variants){
    const evSnap = EVENTS.map(e => ({ ...e }));
    try {
      const w = EVENTS.find(e => e.id === 'waxing');
      w.hours = hours; w.block = block;
      const rs = SEEDS.map(s => measure(s, { ...sweepCfg, days: DAYS }));
      const bs = rs.flatMap(r => r.blocks);
      const lost = bs.map(b => b.lost), qs = bs.map(b => b.queueAtStart);
      const rate = q(rs.map(r => r.abandoned / Math.max(1, r.served + r.abandoned)), 0.5);
      sweepLines.push(`${label}：${bs.length} 次 / ${SEEDS.length * DAYS} 遊戲日`
        + `｜開始時在等 中位 ${q(qs, 0.5)}/最多 ${Math.max(0, ...qs)}`
        + `｜流失 中位 ${q(lost, 0.5)}/P90 ${q(lost, 0.9)}/最糟 ${Math.max(0, ...lost)}`
        + `｜零流失 ${bs.length ? (lost.filter(x => x === 0).length / lost.length * 100).toFixed(0) : '-'}%`
        + `｜全場放棄率 ${(rate * 100).toFixed(1)}%`);
    } finally { EVENTS.length = 0; for (const e of evSnap) EVENTS.push(e); }
  }
  say('地板打蠟 · 參數掃描（中期 40 層 · LOOK，8 個種子 × 25 日）', sweepLines.concat([
    `對照：關掉打蠟時同樣樓況的放棄率是 `
      + `${(q(byStage[STAGES[1][0]].noW.map(r => r.abandoned / Math.max(1, r.served + r.abandoned)), 0.5) * 100).toFixed(1)}%。`,
    `我選 [5,10) × 18–30s 的理由寫在 content.js。但這一格的代價**很輕**（中位 0、最糟 2），`
      + `要不要更痛是 owner 的決定；上面的表就是那個決定要用的曲線。`,
  ]));

  // ---------------------------------------------------------------- 一場遊戲有多長
  const full = [11, 22, 33, 44, 55, 66].map(s => measure(s, { autoPlay: true, days: 150 }));
  const reached = full.filter(r => r.floors >= 100);
  say('一場遊戲有多長（自動玩家代理，只用來換算「幾次」）', [
    `樓層結果：${full.map(r => r.floors).join(', ')}（${reached.length}/${full.length} 蓋到 100 層）`,
    `遊戲日：${full.map(r => r2(r.days)).join(', ')}`,
    `⚠ 這個代理會分岔：一樣的政策有的局起飛、有的卡在 5 層。所以上面所有 A/B 都不用它，`
      + `只用它換算「一場遊戲會遇到幾次」。`,
    `以中期樓況每日 ${r2(mean(byStage[STAGES[1][0]].on.map(r => r.blocks.length)) / DAYS)} 次計算：`
      + `一場 60 分鐘實時（= 20 個遊戲日）約 `
      + `${r2(mean(byStage[STAGES[1][0]].on.map(r => r.blocks.length)) / DAYS * 20)} 次；`
      + `跑滿 150 個遊戲日約 ${r2(mean(byStage[STAGES[1][0]].on.map(r => r.blocks.length)) / DAYS * 150)} 次。`,
  ]);

  return out;
}
