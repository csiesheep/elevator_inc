// sim.js — 模擬。乘客、電梯井、調度演算法、過熱、評價、統計流量模型。
// 這裡的東西都是暫時的：存檔只存 GameState，不存乘客陣列（設計 4.13）。
import { CONFIG as C, PASSENGERS, bandOf, tierAt } from './content.js';
import { derived } from './state.js';

let nextId = 1;
const d0 = st => derived(st);

export function createSim(st){
  const sim = {
    shafts: [], waiting: [], pops: [], toasts: [],
    spawnT: 0, boost: false,
    rateWin: 0, rateAcc: 0,
    abstract: { income: 0, ratio: 1, demand: 0, supply: 0 },
    lobby: 0,
  };
  syncShafts(st, sim);
  return sim;
}

export function syncShafts(st, sim){
  const d = derived(st);
  while (sim.shafts.length < d.shafts){
    sim.shafts.push({
      id: sim.shafts.length, pos: 0, vel: 0, dir: 1, target: null, queue: [],
      mode: 'idle', doorT: 0, doorLen: C.DOOR_START, riders: [], heat: 0, lock: 0,
      st: { trips:0, floors:0, busy:0, total:0, carried:0, load:0 },
    });
  }
  while (sim.shafts.length > d.shafts) sim.shafts.pop();
  // 快速電梯：最後一座井只服務高樓層
  const simTop = Math.min(st.floors, C.SIM_FLOORS);
  const expressFrom = Math.floor(simTop * (st.auto.skylobby ? 0.45 : 0.55));
  sim.lobby = st.auto.skylobby ? Math.min(Math.floor(st.floors * 0.5), simTop - 1) : 0;
  sim.shafts.forEach((s, i) => {
    s.express = !!st.auto.shuttle && i === sim.shafts.length - 1 && sim.shafts.length > 1;
    s.from = s.express ? expressFrom : 0;
    s.to   = st.floors - 1;
    if (s.express) s.to = Math.max(s.from, st.floors - 1);
  });
}

// ------------------------------------------------------------ 時間 / 尖峰
export function hourOf(st){ return ((st.t % C.DAY_SECONDS) / C.DAY_SECONDS) * 24; }
function rushMult(h){
  if (h >= 8 && h < 10)  return 3.0;    // 早上 9 點暴衝
  if (h >= 17 && h < 19) return 2.4;    // 下班
  if (h >= 22 || h < 5)  return 0.55;   // 深夜
  return 1;
}

// ------------------------------------------------------------ 生成乘客
function pickType(st, floor, h){
  const band = bandOf(floor + 1).key;
  const pool = [];
  for (const p of PASSENGERS){
    if (p.band === 'floor13'){ if (floor + 1 !== 13) continue; }
    else if (p.band !== 'any' && p.band !== band) continue;
    let w = p.w;
    if (p.id === 'office')  w *= rushMult(h);
    if (p.id === 'guest' && (h >= 22 || h < 6)) w *= 2.2;
    if (p.rare) w *= 0.25;
    pool.push([p, w]);
  }
  if (!pool.length) return PASSENGERS[0];
  let total = pool.reduce((a, x) => a + x[1], 0), r = Math.random() * total;
  for (const [p, w] of pool){ r -= w; if (r <= 0) return p; }
  return pool[0][0];
}

function spawn(st, sim){
  const top = Math.min(st.floors, C.SIM_FLOORS);
  const h = hourOf(st);
  // 低樓層流量隨大樓高度同步成長 —— 住戶都要經過大廳（設計 4.14 的對策）
  const lobbyBias = Math.random() < Math.min(0.45, 0.15 + st.floors / 400);
  let o = lobbyBias ? 0 : (Math.random() * top) | 0;
  let dest;
  if (lobbyBias) dest = 1 + ((Math.random() * (top - 1)) | 0);
  else dest = Math.random() < 0.35 ? 0 : (Math.random() * top) | 0;
  if (dest === o) dest = (o + 1) % top;
  const type = pickType(st, o, h);
  sim.waiting.push({
    id: nextId++, origin: o, dest, type: type.id, t: type,
    born: st.t, patience: type.patience, left: type.patience,
  });
}

// ------------------------------------------------------------ 票價
function fareOf(st, d, p){
  const dist = Math.abs(p.dest - p.origin);
  // 樓層越高 = 租戶等級越高 = 同樣的距離值更多錢
  const tier = Math.max(tierAt(p.origin + 1), tierAt(p.dest + 1));
  return C.FARE_BASE * dist * p.t.fare * tier * d.fareMult;
}

// ------------------------------------------------------------ 玩家點樓層
export function requestFloor(st, sim, f, shaftIdx){
  if (f < 0 || f >= st.floors) return;
  let s;
  if (shaftIdx != null) s = sim.shafts[shaftIdx];
  else {
    const ok = sim.shafts.filter(x => f >= x.from && f <= x.to && !x.lock);
    const pool = ok.length ? ok : sim.shafts;
    // 最近的閒置井優先，沒有的話丟給最近的那台排隊
    const idle = pool.filter(x => x.mode === 'idle' || x.mode === 'held');
    const cand = idle.length ? idle : pool;
    s = cand.reduce((a, b) => Math.abs(a.pos - f) <= Math.abs(b.pos - f) ? a : b);
  }
  if (!s) return;
  if (s.target === f || s.queue.includes(f)) return;
  if (s.target === null) startMove(st, sim, s, f);
  else s.queue.push(f);
}

function startMove(st, sim, s, f){
  s.target = f;
  if (Math.abs(s.pos - f) < 1e-3){ openDoors(st, sim, s, f); }
  else { s.mode = 'moving'; s.dir = Math.sign(f - s.pos); }
}

// ------------------------------------------------------------ 自動調度
function candidates(st, sim, s){
  const out = [], spare = [];
  for (const r of s.riders) out.push({ f: r.dest, t: r.board });
  for (const p of sim.waiting){
    if (p.origin < s.from || p.origin > s.to) continue;
    if (st.auto.group && p.assigned != null && p.assigned !== s.id){ spare.push({ f: p.origin, t: p.born }); continue; }
    out.push({ f: p.origin, t: p.born });
  }
  // 自己沒被指派到任何人的時候，不要空等 —— 去接別台顧不到的
  return out.length ? out : spare;
}

// 群組控制：把每個 hall call 指派給「最快到得了」的那台（ETA 估計）
function groupAssign(st, sim, d){
  // 每次重算：指派會隨電梯位置變動，黏著不放會讓其他台閒著看人流失
  const load = new Map(sim.shafts.map(s => [s.id, s.riders.length * 0.4]));
  const queue = [...sim.waiting].sort((a, b) => (a.left / a.patience) - (b.left / b.patience));
  for (const p of queue){
    let best = null, bestEta = Infinity;
    for (const s of sim.shafts){
      if (p.origin < s.from || p.origin > s.to) continue;
      const eta = Math.abs(s.pos - p.origin) / Math.max(0.2, d.cruise)
                + (load.get(s.id) || 0) * (d.door + 0.8)
                + (s.lock > 0 ? s.lock : 0);
      if (eta < bestEta){ bestEta = eta; best = s.id; }
    }
    p.assigned = best;
    if (best != null) load.set(best, (load.get(best) || 0) + 1);
  }
}

function chooseTarget(st, sim, s){
  if (s.queue.length) return s.queue.shift();          // 玩家手動點的最優先
  // 藍圖階的控制系統比 FIFO 更進階，本身就足以自己跑（Prestige 之後不會退回全手動）
  const advanced = st.auto.dest || st.auto.group || st.auto.shuttle || st.auto.double || st.auto.skylobby;
  if (!st.auto.fifo && !advanced) return null;         // 還沒買調度演算法 = 全手動
  const cand = candidates(st, sim, s);
  if (!cand.length) return null;

  // 目的地控制：系統知道每個人要去哪，所以會挑「最多人受益」的那一站
  if (st.auto.dest){
    const weight = new Map();
    const add = (f, w) => weight.set(f, (weight.get(f) || 0) + w);
    for (const r of s.riders) add(r.dest, 1.4);            // 車上的人優先送到
    for (const p of sim.waiting){
      if (p.origin < s.from || p.origin > s.to) continue;
      if (st.auto.group && p.assigned != null && p.assigned !== s.id) continue;
      add(p.origin, 1 + (1 - p.left / p.patience));        // 快沒耐性的權重更高
    }
    const dir = s.dir || 1;
    const pool = [...weight.keys()].filter(f => dir > 0 ? f > s.pos + 1e-6 : f < s.pos - 1e-6);
    const use = pool.length ? pool : [...weight.keys()];
    if (!pool.length) s.dir = -dir;
    let best = null, bestScore = -Infinity;
    for (const f of use){
      const travel = Math.abs(f - s.pos) / Math.max(0.2, d0(st).cruise) + 1;
      const score = weight.get(f) / travel;
      if (score > bestScore){ bestScore = score; best = f; }
    }
    if (best != null){ if (pool.length) s.dir = Math.sign(best - s.pos) || s.dir; return best; }
  }

  if (st.auto.look || st.auto.scan || advanced){
    const dir = s.dir || 1;
    const ahead = cand.filter(c => dir > 0 ? c.f > s.pos + 1e-6 : c.f < s.pos - 1e-6);
    if (ahead.length){
      return dir > 0 ? Math.min(...ahead.map(c => c.f)) : Math.max(...ahead.map(c => c.f));
    }
    if (st.auto.look || advanced){                      // LOOK：直接折返到最遠的請求
      s.dir = -dir;
      const back = cand.filter(c => s.dir > 0 ? c.f > s.pos : c.f < s.pos);
      if (!back.length) return null;
      return s.dir > 0 ? Math.min(...back.map(c => c.f)) : Math.max(...back.map(c => c.f));
    }
    // SCAN：先跑到端點才折返（所以會跑空段，這就是它比 LOOK 慢的原因）
    const end = dir > 0 ? s.to : s.from;
    if (Math.abs(s.pos - end) > 1e-6) return end;
    s.dir = -dir;
    return null;
  }
  // FIFO：誰先按誰先服務
  cand.sort((a, b) => a.t - b.t);
  return cand[0].f;
}

// ------------------------------------------------------------ 開門與上下客
function openDoors(st, sim, s, f){
  const d = derived(st);
  s.mode = 'doors'; s.doorT = 0; s.vel = 0; s.pos = f;
  s.st.trips++; st.stats.trips++;
  let extra = 0, boarded = 0;

  const floorsServed = st.auto.double ? [f, Math.min(f + 1, st.floors - 1)] : [f];

  // 下客
  for (const ff of floorsServed){
    for (let i = s.riders.length - 1; i >= 0; i--){
      const p = s.riders[i];
      if (p.dest !== ff) continue;
      const money = fareOf(st, d, p);
      st.cash += money; st.runRevenue += money; st.lifetimeRevenue += money;
      sim.rateAcc += money;
      st.stats.served++; s.st.carried++;
      if (!st.codex[p.type]) { st.codex[p.type] = 0; }
      st.codex[p.type]++;
      if (p.t.ghost){
        const bonus = 50 * st.floors;
        st.cash += bonus; st.runRevenue += bonus; sim.rateAcc += bonus;
        sim.toasts.push({ txt:`👻 十三樓的房客留下了 $${Math.round(bonus)}`, life:4 });
      }
      // 滿意度 → 評價（設計 4.5：別讓乘客生氣有長期複利價值）
      const wait = st.t - p.born;
      const sat = 1 - Math.min(1, wait / Math.max(1, p.patience));
      st.rating += (sat - 0.40) * 0.035 * d.ratingGain;
      if (p.t.rating) st.rating += p.t.rating;
      if (money > 0) sim.pops.push({ txt:'+$' + fmtShort(money), floor: ff, life:1, off: Math.random()*20-10 });
      s.riders.splice(i, 1);
    }
  }

  // 上客
  const cap = d.capacity;
  const used = () => s.riders.reduce((a, p) => a + p.t.size, 0);
  for (const ff of floorsServed){
    for (let i = 0; i < sim.waiting.length; i++){
      const p = sim.waiting[i];
      if (p.origin !== ff) continue;
      if (used() + p.t.size > cap) continue;
      // 目的地控制：只收同方向的人，停靠次數大減
      if (st.auto.dest && s.riders.length && used() >= cap * 0.5){
        const dir = Math.sign(s.riders[0].dest - ff);
        if (dir !== 0 && Math.sign(p.dest - ff) !== dir) continue;
      }
      p.board = st.t;
      s.riders.push(p); sim.waiting.splice(i, 1); i--;
      boarded++;
      if (p.t.doorPenalty) extra += p.t.doorPenalty;
    }
  }
  const grouping = st.auto.dest ? 0.6 : 1;   // 目的地控制：分組上客，時間省下來
  s.doorLen = d.door + extra + d.boardTime * boarded * grouping;
  s.st.load = cap ? used() / cap : 0;
}

// ------------------------------------------------------------ 主步進
export function step(st, sim, dt){
  const d = derived(st);
  st.t += dt;

  // --- 生成
  const top = Math.min(st.floors, C.SIM_FLOORS);
  sim.spawnT += dt * rushMult(hourOf(st));
  const every = d.spawnEvery;
  while (sim.spawnT >= every){ sim.spawnT -= every; if (sim.waiting.length < 120) spawn(st, sim); }

  // --- 耐性
  for (let i = sim.waiting.length - 1; i >= 0; i--){
    const p = sim.waiting[i];
    p.left -= dt;
    if (p.left <= 0){
      sim.waiting.splice(i, 1);
      st.stats.abandoned++;
      st.rating -= 0.02 * (p.t.angry || 1);
      sim.pops.push({ txt:'走了', floor:p.origin, life:1, bad:true, off: Math.random()*20-10 });
    }
  }

  if (st.auto.group) groupAssign(st, sim, d);

  // --- 每座井
  const boosting = sim.boost && !d.noOverheat;
  for (const s of sim.shafts){
    s.st.total += dt;
    if (s.mode !== 'idle' && s.mode !== 'held') s.st.busy += dt;

    if (s.lock > 0){ s.lock -= dt; if (s.lock <= 0){ s.lock = 0; s.heat = 0; } continue; }

    // 過熱：主動遊玩的風險操作（設計 4.4）
    const active = s.mode === 'moving';
    if (sim.boost && active && !d.noOverheat){
      s.heat += C.HEAT_PER_SEC * dt; st.stats.boostTime += dt;
      if (s.heat >= d.heatMax){ s.lock = C.OVERHEAT_LOCK; st.stats.overheats++;
        sim.toasts.push({ txt:'🔥 馬達過熱，強制停機 8 秒', life:3 }); continue; }
    } else {
      s.heat = Math.max(0, s.heat - d.heatCool * dt);
    }
    const speedMult = (sim.boost && !d.noOverheat) ? C.BOOST_MULT : (d.noOverheat && sim.boost ? C.BOOST_MULT : 1);

    if (s.mode === 'moving'){
      const cruise = d.cruise * speedMult;
      const acc = d.accel * speedMult;
      const dist = s.target - s.pos, dir = Math.sign(dist), rem = Math.abs(dist);
      const stopDist = (s.vel * s.vel) / (2 * acc);
      if (rem <= stopDist) s.vel = Math.max(0, s.vel - acc * dt);
      else                 s.vel = Math.min(cruise, s.vel + acc * dt);
      const np = s.pos + dir * s.vel * dt;
      s.st.floors += Math.abs(np - s.pos); st.stats.floorsTravelled += Math.abs(np - s.pos);
      if (dir * (np - s.target) >= 0 || (rem < 0.01 && s.vel < 0.05)) openDoors(st, sim, s, s.target);
      else { s.pos = np; s.dir = dir; }
    }
    else if (s.mode === 'doors'){
      s.doorT += dt;
      if (s.doorT >= s.doorLen){
        // 沒買自動關門的話，門就這樣開著等你下一次點擊
        if (!st.auto.autodoor){ s.mode = 'held'; s.target = null; }
        else { s.target = null; s.mode = 'idle'; }
      }
    }
    if (s.mode === 'idle' || s.mode === 'held'){
      const f = chooseTarget(st, sim, s);
      if (f != null && f !== undefined){
        // 空中大廳：快車閒著的時候回轉運層待命
        startMove(st, sim, s, f);
      } else if (s.mode === 'held' && st.auto.autodoor) s.mode = 'idle';
      else if (s.mode === 'idle' && s.express && sim.lobby && Math.abs(s.pos - sim.lobby) > 2){
        startMove(st, sim, s, sim.lobby);
      }
    }
  }

  // --- 統計流量模型：SIM_FLOORS 以上不逐個模擬乘客（設計 4.13）
  abstractStep(st, sim, d, dt);

  // --- 收尾
  st.rating = Math.max(C.RATING_MIN, Math.min(C.RATING_MAX, st.rating));
  for (let i = sim.pops.length - 1; i >= 0; i--){ sim.pops[i].life -= dt * 0.9; if (sim.pops[i].life <= 0) sim.pops.splice(i, 1); }
  for (let i = sim.toasts.length - 1; i >= 0; i--){ sim.toasts[i].life -= dt; if (sim.toasts[i].life <= 0) sim.toasts.splice(i, 1); }

  // 收益速率（給離線收益用的平均值）
  sim.rateWin += dt;
  if (sim.rateWin >= 2){
    const r = sim.rateAcc / sim.rateWin;
    st.stats.avgRate = st.stats.avgRate ? st.stats.avgRate * 0.85 + r * 0.15 : r;
    sim.rateAcc = 0; sim.rateWin = 0;
  }
}

function abstractStep(st, sim, d, dt){
  const a = sim.abstract;
  const n = st.floors - C.SIM_FLOORS;
  if (n <= 0){ a.income = 0; a.ratio = 1; a.demand = 0; a.supply = 0; return; }
  const avgFloor = (C.SIM_FLOORS + st.floors) / 2;
  const rush = rushMult(hourOf(st));
  a.demand = n * 0.022 * rush;
  a.supply = d.shafts * d.cruise * d.capacity * d.algoEff * 0.020
           * (st.auto.skylobby ? 3 : (avgFloor > 100 ? 0.45 : 1));
  a.ratio = a.demand > 0 ? Math.min(1, a.supply / a.demand) : 1;
  const farePer = C.FARE_BASE * (avgFloor * 0.55) * 1.7 * tierAt(avgFloor) * d.fareMult;
  a.income = Math.min(a.demand, a.supply) * farePer;
  const earn = a.income * dt;
  st.cash += earn; st.runRevenue += earn; st.lifetimeRevenue += earn;
  st.stats.abstractEarned += earn; sim.rateAcc += earn;
  // 高樓層服務不過來，評價會慢慢掉 —— 逼你回頭買井跟演算法
  if (a.ratio < 1) st.rating -= (1 - a.ratio) * 0.006 * dt;
}

export function fmtShort(n){
  if (n < 1000) return (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
  const u = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac'];
  let i = 0; while (n >= 1000 && i < u.length - 1){ n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)) + u[i];
}
