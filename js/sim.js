// sim.js — 模擬。乘客、電梯井、調度演算法、過熱、評價、統計流量模型。
// 這裡的東西都是暫時的：存檔只存 GameState，不存乘客陣列（設計 4.13）。
import { CONFIG as C, PASSENGERS, BANDS, EVENTS, WEEKDAYS, bandOf, tierAt,
         TENANTS, tenantById, defaultTenant, eventById, passengerById } from './content.js';
import { t, L, getLang } from './i18n.js';
import { derived, builtInBand, tenantMix } from './state.js';

let nextId = 1;
const d0 = st => derived(st);

// sim.waiting 的硬上限。原本是 spawn 迴圈裡的一個字面值 160；「招來同伴」是第二條
// 會把人推進 waiting 的路徑，兩條共用同一條線，所以把它拉成具名常數，不要各寫一份。
const WAIT_CAP = 160;

export function createSim(st){
  const sim = {
    shafts: [], waiting: [], pops: [], toasts: [],
    spawnT: 0, boost: false,
    mood: 1, moodT: 0, eventT: 0,       // 7 今日人潮 / 8 突發事件
    evacUntil: 0, evacReady: 0,         // B 疏散模式
    rateWin: 0, rateAcc: 0,
    lobby: 0,
    blocked: {},                        // 封鎖樓層：{ 樓層索引: 解封時的 st.t }
    // #22 的成就用的觀察單：每一次封鎖開一張，那層樓有人放棄就作廢。
    // 放在 sim 而不是 st：它是「這一次封鎖進行到哪」的暫時狀態，解封就結案，
    // 結案的**次數**才寫進 st.codex（設計 4.13：存檔只存 GameState）。
    blockWatch: [],
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
  const expressFrom = Math.floor(st.floors * (st.auto.skylobby ? 0.45 : 0.55));
  sim.lobby = st.auto.skylobby ? Math.floor(st.floors * 0.5) : 0;
  sim.shafts.forEach((s, i) => {
    s.express = !!st.auto.shuttle && i === sim.shafts.length - 1 && sim.shafts.length > 1;
    s.from = s.express ? expressFrom : 0;
    s.to   = st.floors - 1;
    if (s.express) s.to = Math.max(s.from, st.floors - 1);
  });
}

// ------------------------------------------------------------ 時間 / 尖峰 / 星期
export function hourOf(st){ return ((st.t % C.DAY_SECONDS) / C.DAY_SECONDS) * 24; }
export function dayOf(st){ return Math.floor(st.t / C.DAY_SECONDS) % C.WEEK_DAYS; }
export function dayName(st){ return WEEKDAY_NAMES()[dayOf(st)]; }
export function isWeekend(st){ return dayOf(st) >= 5; }
const WEEKDAY_NAMES = () => getLang() === 'en'
  ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : WEEKDAYS;

function rushMult(h){
  if (h >= 8 && h < 10)  return 3.0;    // 早上 9 點暴衝
  if (h >= 17 && h < 19) return 2.4;    // 下班
  if (h >= 22 || h < 5)  return 0.55;   // 深夜
  return 1;
}

// 時段窗 [a,b)，**唯一**的判定實作。整個檔案裡所有「現在算不算在這個時間窗裡」
// 都要走這裡：EVENTS.hours、PASSENGERS.peaks、樓層帶的 up/down 尖峰窗。
//
// a > b 代表跨午夜（例：[23,4] = 23:00 到隔天 04:00），窗內是 h>=a 或 h<b。
// 舊寫法 `h < a || h >= b` 在跨午夜時**兩邊同時成立**，所以窗的兩端都打不到
// （實測：hours=[23,4] 在 h=1 與 h=23.5 都是 0 次觸發）。
// a === b 維持舊行為（空窗，永遠為假）——沒有資料用到，改成「全天」等於偷偷發明規則。
export function inHourWindow(h, win){
  if (!win) return true;
  const [a, b] = win;
  return a <= b ? (h >= a && h < b) : (h >= a || h < b);
}

// 尖峰窗 [a,b)：窗內 1.8 倍，窗外隨時間距離遞減到 0.45。
// 這是「調變」不是「開關」——平均值大約 1，所以到達率的基準不會被時段吃掉。
function windowWeight(h, win){
  if (!win) return 1;
  const [a, b] = win;
  if (inHourWindow(h, win)) return 1.8;
  const d = Math.min(Math.abs(h - a), Math.abs(h - b),
                     24 - Math.abs(h - a), 24 - Math.abs(h - b));
  return Math.max(0.45, 1.25 - d * 0.11);
}

// 加權抽樣，**唯一**的實作（#8）。回傳落在哪一格的索引；空陣列回傳 -1。
//
// 原本這個形狀在 pickFloor / pickType / fireEvent 各抄了一份，三份都只防了
// 「池子是空的」、沒防「池子非空但權重全為 0」。total 為 0 時 r = 0，第一圈
// `r -= 0` 就 <= 0，於是**永遠回傳第 0 項**——一個充滿自信的錯答案。
// 實測（權重全為 0、40 層）：900 個乘客只落在 2 個樓層（0 與 1）。
// 權重全為 0 的正確意思是「這些選項一樣可能」，所以退回均勻抽樣。
export function pickIndex(w){
  const n = w.length;
  if (n <= 0) return -1;
  let total = 0;
  for (let i = 0; i < n; i++) total += w[i] > 0 ? w[i] : 0;   // 負權重當 0，別讓它把總和吃掉
  if (total <= 0 || !Number.isFinite(total)) return (Math.random() * n) | 0;   // NaN 也走這裡
  let r = Math.random() * total;
  for (let i = 0; i < n; i++){ r -= w[i] > 0 ? w[i] : 0; if (r <= 0) return i; }
  return n - 1;   // 浮點殘差跑完整圈：落在最後一項，不是第一項
}

// 2 垂直人口分布：某一層在這個時刻、當「起點」或「終點」的權重
function floorWeight(st, f, h, role){
  // 蓋好就有人：大廳以上每一層都會產生乘客，沒有「空樓層」這回事（招商已取消）。
  const b = bandOf(f + 1);
  let w = (b.pop != null ? b.pop : 1) * tenantMix(st, b).pop;   // A 租戶決定人流量
  w *= windowWeight(h, role === 'dest' ? b.up : b.down);
  if (isWeekend(st)) w *= (b.wknd != null ? b.wknd : 1);
  return w;
}

// 依人口權重抽一層（lo..hi 含端點）
function pickFloor(st, h, role, lo, hi){
  const n = hi - lo + 1;
  if (n <= 0) return lo;
  const w = new Array(n);
  for (let i = 0; i < n; i++) w[i] = floorWeight(st, lo + i, h, role);
  return lo + pickIndex(w);
}

// ------------------------------------------------------------ 封鎖樓層（獨立的狀態機制）
// 「某一層暫時不能停靠」是**樓的狀態**，不是某一個事件的內部細節。任何一列 EVENTS
// 寫 block:[a,b] 就會封鎖它發生的那一層，沒寫的完全不受影響（預設關閉）。
// 封鎖期間（owner 裁決 #22，2026-09-05 改過一次，改的是第二條）：
//   · 電梯不以它為目標，也不在那裡開門（雙層轎廂的 f+1 一起擋）
//   · **那層樓照常產生乘客**——封鎖只影響「停靠」，不影響「需求」。
//     這一條原本是反的：舊版在生成端就擋掉起點與終點，於是整層安靜下來，
//     人流重新分配到其它樓層，實測**送達反而上升、放棄下降**——一件小小的好事。
//     現在起點照常生：你看著他們的耐性條掉、什麼都做不了，那才是「被封鎖」。
//     **終點仍然不生**（owner 明確裁示先只做這半邊）：讓「要去那層的人」上車，
//     他會卡在車上佔位到解封，那是另一種痛，而且有 bug 風險。
//   · **已經在等的人照常消耗耐性**。這就是這個事件真正的成本，而且它的大小取決於
//     玩家封鎖前把那層清得多乾淨，不是一個固定的罰款
//   · 車上要去那層的人留在車上佔位，等解封再送。封鎖一定會到期，所以不會鎖死
// 大廳（索引 0）永遠封不了：40% 的行程有一端是大廳（LOBBY_SHARE），封住它不是
// 「一層不能停」而是整棟樓停擺。
//
// 之所以做成 export 的三支小 API 而不是塞在事件裡：#5-7「起霧」、#20「打烊清場」
// 這類「一段時間內某層不一樣」的項目都要接同一個狀態。
export function blockFloor(st, sim, f, secs){
  if (!(secs > 0)) return false;
  if (!(f > 0) || f >= st.floors) return false;      // 大廳與不存在的樓層封不了
  sim.blocked = sim.blocked || {};
  const until = st.t + secs;
  if (!(until > (sim.blocked[f] || 0))) return false;  // 已經封更久了：不縮短、也不算新的一次
  sim.blocked[f] = until;
  // 已經指向這一層的電梯要立刻改道，否則它會抵達、然後在封鎖的樓層開門。
  for (const s of sim.shafts){
    if (s.queue.length) s.queue = s.queue.filter(q => q !== f);
    if (s.target === f && s.mode === 'moving'){ s.target = null; s.vel = 0; s.mode = 'idle'; }
  }
  // #22 成就「撐過一次打蠟」：開一張觀察單。**掛在 blockFloor() 而不是打蠟事件裡**，
  // 因為這裡是「某一層剛剛被封起來」唯一的入口（事件送達觸發與 stairsUp 兩條路都經過
  // 這裡）；掛在事件上就會有第二條漏掉的路。
  // 同一層再被封（延長）不開第二張——延長的是同一次封鎖，開兩張等於同一件事算兩次。
  sim.blockWatch = sim.blockWatch || [];
  const open = sim.blockWatch.find(w => w.f === f);
  if (open) open.until = until;
  else sim.blockWatch.push({ f, until, clean: true });
  return true;
}

// 那層樓有人放棄 → 這次封鎖不算乾淨。沒有觀察單的樓層是 no-op，所以呼叫端
// 不必先問「現在有沒有被封」——那個問題問了兩次就會有兩種答案。
function markBlockLoss(sim, f){
  if (!sim.blockWatch) return;
  for (const w of sim.blockWatch) if (w.f === f) w.clean = false;
}
export function isFloorBlocked(st, sim, f){
  const until = sim.blocked && sim.blocked[f];
  return until != null && until > st.t;
}
export function blockedFloors(st, sim){
  const out = [];
  for (const k in (sim.blocked || {})) if (sim.blocked[k] > st.t) out.push(+k);
  return out;
}
// 還剩幾秒。blockedFloors() 只回樓層索引，畫倒數不夠用——畫面那半（render.js）
// 不是我的檔案，但它需要這個數字，而讓它自己去讀 sim.blocked 的內部形狀就是
// 把一個內部結構變成公開契約。沒被封鎖回 0 而不是 null，呼叫端可以直接 if (secs)。
export function blockedSecs(st, sim, f){
  const until = sim.blocked && sim.blocked[f];
  return (until != null && until > st.t) ? until - st.t : 0;
}

// ------------------------------------------------------------ 生成乘客
// 人物的時段欄位：peaks:[{ hours:[a,b], mult:m }, …]，hours 跨午夜照樣成立。
// 沒寫 peaks 的人物乘數是 1 —— 這是「新欄位一律有預設值」的那個預設值。
function peakMult(p, h){
  if (!p.peaks) return 1;
  let m = 1;
  for (const k of p.peaks) if (inHourWindow(h, k.hours)) m *= (k.mult != null ? k.mult : 1);
  return m;
}

// 事件指定的人物型別。ev.type = 單一 id；ev.types = { id: 權重 }。
// 回傳 [人物, 權重] 的池；沒指定、或 id 全部打錯，回傳 null（呼叫端退回樓層帶的預設）。
// 事件指定的權重是**字面值**，不再乘 rushMult / peaks / rare ——
// 事件寫了什麼就出什麼，不然事件的組成會被時段偷偷改掉。
function forcedTypePool(ev){
  if (!ev) return null;
  const pool = [];
  if (ev.types){
    for (const id in ev.types){
      const p = passengerById(id);
      if (p && ev.types[id] > 0) pool.push([p, ev.types[id]]);
    }
  } else if (ev.type){
    const p = passengerById(ev.type);
    if (p) pool.push([p, 1]);
  }
  return pool.length ? pool : null;
}

// ev 沒帶或沒指定型別時，行為跟今天完全一樣：照出發樓層那一帶抽。
function pickType(st, floor, h, ev){
  const forced = forcedTypePool(ev);
  const pool = forced || bandTypePool(st, floor, h);
  if (!pool.length) return PASSENGERS[0];
  return pool[pickIndex(pool.map(x => x[1]))][0];
}

function bandTypePool(st, floor, h){
  const band = bandOf(floor + 1).key;
  const pool = [];
  for (const p of PASSENGERS){
    if (p.band === 'floor13'){ if (floor + 1 !== 13) continue; }
    else if (p.band !== 'any' && p.band !== band) continue;
    let w = p.w;
    if (p.id === 'office')  w *= rushMult(h);
    w *= peakMult(p, h);          // 原本是寫死的 `guest && (h>=22||h<6) → ×2.2`，現在是資料
    if (p.rare) w *= 0.25;
    pool.push([p, w]);
  }
  return pool;
}

// out：把新乘客推到別的陣列而不是 sim.waiting（招來同伴時要延後才能併進去，
// 否則新來的人會在同一次開門裡被正在上客的迴圈看到）。沒帶就是原本的行為。
function makePassenger(st, sim, origin, dest, h, ev, out){
  const type = pickType(st, origin, h, ev);
  // 樓層越高，來回一趟本來就越久，耐性要跟著放大；否則 190 樓的人在物理上
  // 不可能被服務到（單程就超過他的耐性），只會變成必然的流失。
  const far = Math.max(origin, dest);
  const patience = type.patience * (1 + far / 45);
  const p = {
    id: nextId++, origin, dest, type: type.id, t: type,
    born: st.t, patience, left: patience,
  };
  (out || sim.waiting).push(p);
  if (type.summon) summonCompanions(st, sim, p, h, 'spawn', out);
  return p;
}

// ------------------------------------------------------------ 招來同伴（可重用）
// 人物資料上的 summon 欄位（欄位說明在 content.js）。#27 網紅排隊客用 on:'deliver'，
// #5-E 導遊用 on:'spawn'——同一支程式，差別只在資料。
//
// 兩道防滾雪球的閘，缺一不可：
//   1. **同伴不會再招同伴**。少了它，每個人招 2–3 個、無限代就是指數成長：
//      一次送達可以生出整棟樓的人。深度上限 1 讓一個「有機」乘客的總影響固定是
//      1 + n，可以直接算進平衡。
//      on:'spawn' 的遞迴發生在 makePassenger **內部**（同伴還沒回到這裡被標記），
//      所以那一邊要靠 summonDepth；on:'deliver' 的鏈是後來才發生的，靠 p.summoned。
//   2. **共用 WAIT_CAP**。高人流時 sim.waiting 已經逼近上限，招來同伴不可以是
//      繞過那條線的第二條路。
let summonDepth = 0;

const summonSlot = (p, which) =>
  which === 'origin' ? p.origin : which === 'dest' ? p.dest : 0;   // 預設 'lobby'

function summonCompanions(st, sim, p, h, when, out){
  const cfg = p.t && p.t.summon;
  if (!cfg) return 0;
  if ((cfg.on || 'deliver') !== when) return 0;
  if (summonDepth > 0 || p.summoned) return 0;             // 閘 1
  if (cfg.chance != null && Math.random() >= cfg.chance) return 0;
  const o  = summonSlot(p, cfg.from || 'lobby');
  const to = summonSlot(p, cfg.to   || 'dest');
  if (o === to || o < 0 || to < 0 || o >= st.floors || to >= st.floors) return 0;
  if (isFloorBlocked(st, sim, to)) return 0;   // 跟 spawn() 同一條規則：終點不生，起點照常
  const [a, z] = cfg.n || [1, 1];
  const want = a + ((Math.random() * (z - a + 1)) | 0);
  const crew = [];
  summonDepth++;
  try {
    for (let i = 0; i < want; i++){
      if (sim.waiting.length + (out ? out.length : 0) >= WAIT_CAP) break;   // 閘 2
      const q = makePassenger(st, sim, o, to, h, cfg.type ? { type: cfg.type } : null, out);
      q.summoned = true;
      crew.push(q);
    }
  } finally { summonDepth--; }
  // #27 的成就「一團都不能少」：真的招到兩個以上才算一團。
  //   · **用 crew.length 不是 want**：WAIT_CAP 擋掉的那幾個從來沒有存在過，
  //     拿 want 當分母等於要求玩家送到不存在的人——一條永遠拿不到的成就。
  //   · **≥2 才成團**：n:[1,1] 的試吃推銷員（#26）與走失兒童（#21）走的是同一支
  //     程式，一個人的「團」只是一位乘客，算進來會把這條變成「又一個計數器」。
  //     今天唯一 on:'deliver' 且會招到 2 個以上的資料列就是網紅排隊客（n:[2,3]）。
  //     **再加一列這種資料的人：回來看這裡，成就文案寫的是網紅。**
  //   · left 從 crew.length 開始，每**送到**一個減一，歸零才記一筆。
  //     ⚠ 這裡原本還有一個 `ok` 旗標，在耐性迴圈裡標記「有人放棄了」——**那是死碼**，
  //     實測拿掉它 8×3×4 格的數字一個都沒動。理由：left 只有送達會減，放棄的人
  //     不會減，所以只要有一個人放棄，left 就永遠到不了 0。「整團送完」本身已經
  //     蘊含「一個都沒放棄」。留著一個永遠不會改變結果的旗標，下一個人會以為
  //     那裡有一道防線。
  if (crew.length >= 2 && (cfg.on || 'deliver') === 'deliver'){
    const g = { left: crew.length };
    for (const q of crew) q.crew = g;
  }
  return crew.length;
}

// 2 垂直人口分布。整棟樓逐個模擬 —— 不再有「高樓層只取樣 5%」這件事，
// 第 95 樓的人跟第 3 樓的人一樣是真的，電梯真的要去接他。
function spawn(st, sim){
  const h = hourOf(st);
  const top = st.floors - 1;
  const lobbyTrip = Math.random() < C.LOBBY_SHARE;
  let o, d;

  if (lobbyTrip){
    o = 0; d = pickFloor(st, h, 'dest', 1, Math.max(1, top));
    if (Math.random() < 0.5){ const t = o; o = d; d = t; }
  } else {
    o = pickFloor(st, h, 'origin', 0, top);
    d = pickFloor(st, h, 'dest',   0, top);
  }
  if (o === d) d = o === 0 ? Math.min(1, top) : 0;
  if (o === d) return;
  // **起點照常生**：封鎖不影響需求，只影響停靠。那層樓的人照常出現、照常掉耐性，
  // 而電梯就是不能去接——這是這個事件唯一的成本，也是玩家真的看得到的那件事。
  // **終點不生**：他上得了車、下不了車，會卡在車上佔位到解封（owner 裁決：先不做）。
  if (isFloorBlocked(st, sim, d)) return;
  makePassenger(st, sim, o, d, h);
}

// 到達率：整棟樓的人口權重加總。O(floors)，所以每 0.5 秒才重算一次。
function arrivalRate(st, sim){
  if (sim.rateAt != null && st.t - sim.rateAt < 0.5) return sim.rateVal;
  sim.rateAt = st.t;
  const W = bandDemand(st, hourOf(st), 0, st.floors - 1);
  sim.rateVal = C.RATE_PER_WEIGHT * Math.pow(Math.max(0, W), C.RATE_EXP) * derived(st).womMult;
  return sim.rateVal;
}

// 一段樓層的總需求權重
function bandDemand(st, h, lo, hi){
  let total = 0;
  for (let f = lo; f <= hi; f++) total += floorWeight(st, f, h, 'dest');
  return total;
}

// 8 突發流量事件
function floorInBand(st, key, simTopAll){
  if (key === 'lobby') return 0;
  // 每一層都有人，所以不用再重抽到「租出去的那層」為止——直接抽。
  // 上界是 simTopAll + 1：舊版寫 Math.max(1, simTopAll)，最頂那層永遠抽不到。
  if (key === 'any') return (Math.random() * Math.max(1, simTopAll + 1)) | 0;
  const b = BANDS.find(x => x.key === key);
  if (!b) return -1;
  const lo = Math.min(b.from - 1, st.floors - 1);
  const hi = Math.min(b.to - 1, st.floors - 1);
  if (hi < lo) return -1;
  // 還沒蓋到這一帶就沒有事件（注意 lo/hi 在這種情況下仍然非空，所以這關不能省）
  const built = builtInBand(st, b);
  if (built <= 0) return -1;
  return lo + ((Math.random() * Math.min(built, hi - lo + 1)) | 0);
}

// A：每一帶的租戶會發生什麼事件。每一帶各自累積自己的計時器。
// 招商取消之後資料來源換成「這一帶的 defaultTenant × 蓋了幾層」，機制本身不動——
// 這是 #1–#7（每種樓層自己的事件與人物）要接的地方，到時候只換 tenant 的來源。
// ⚠ 現況：七個 defaultTenant 全都是 plain 且沒有 event，所以這裡目前一次也不會觸發。
function tenantEvents(st, sim, dt){
  sim.tenantT = sim.tenantT || {};
  for (const b of BANDS){
    const count = builtInBand(st, b);
    if (count <= 0) continue;
    const id = defaultTenant(b.key);
    const tn = tenantById(id);
    if (!tn || !tn.event) continue;
    const key = b.key + ':' + id;
    if (sim.tenantT[key] == null) sim.tenantT[key] = rollGap(tn);
    // 樓層越多，事件「稍微」更頻繁、而且規模更大。
    // 一開始寫成線性（× 層數），20 層會議中心就變成每 9 秒一次散場，太吵。
    sim.tenantT[key] -= dt * (1 + count / 8);
    if (sim.tenantT[key] <= 0){
      sim.tenantT[key] = rollGap(tn);
      // 有兩列 id:'party'（尾牙散場在隨機池、宴會散場掛在宴會廳），裸 .find() 只拿得到
      // 第一列，租戶路徑會安靜地拿到隨機池那一列（實測：耐性倍率 1，不是 0.75）。
      const ev = eventById(tn.event, { byTenant: true });
      if (ev) runEvent(st, sim, ev, b, tn, st.floors - 1, 1 + count / 25);
    }
  }
}
// 事件發生在哪一層。租戶事件在該租戶那一帶，隨機事件照它的 at。
// **封鎖事件多兩個限制**：不能落在大廳（blockFloor 會拒絕），也不要疊在已經封住的
// 那層（同一層封兩次玩家只看得到一次，但吃掉兩次事件機會）。抽不到就這次不發生——
// 一個安靜的不發生，比一個玩家無能為力的災難好。
// 非封鎖事件走的還是原本那一行，連 Math.random() 的呼叫次數都一樣。
function eventFloor(st, sim, ev, band, simTopAll){
  const pick = () => band ? floorInBand(st, band.key, simTopAll)
                          : floorInBand(st, ev.at, simTopAll);
  if (!ev.block) return pick();
  for (let i = 0; i < 8; i++){
    const f = pick();
    if (f > 0 && !isFloorBlocked(st, sim, f)) return f;
  }
  return -1;
}

// 這裡曾經有 schedule()：「人流預警」技能（o_warn）把事件延後 warnLead 秒、先跳一則
// 倒數提示。它只有 tenantEvents() 一個呼叫點，而那條路在招商移除之後 0 次觸發
// （七個 defaultTenant 都是 plain、都沒有 event），隨機事件則從 fireEvent() 直接
// 呼叫 runEvent()、根本不經過它。owner 裁決（#32）移除整個技能。
// 這裡刻意不留一個只剩 pass-through 的空函式：那正是下一個人會照著找一個不存在的
// 機制的東西。tenantEvents() 現在直接呼叫 runEvent()。
function rollGap(t){
  const [a, z] = t.every || [180, 260];
  return a + Math.random() * (z - a);
}

function fireEvent(st, sim){
  const h = hourOf(st);
  const simTopAll = st.floors - 1;
  const pool = EVENTS.filter(e => {
    if (e.byTenant) return false;              // 租戶事件不進隨機池
    if (!inHourWindow(h, e.hours)) return false;
    return floorInBand(st, e.at, simTopAll) >= 0 && floorInBand(st, e.to, simTopAll) >= 0;
  });
  if (!pool.length) return;
  const ev = pool[pickIndex(pool.map(e => e.w))];

  runEvent(st, sim, ev, null, null, simTopAll);
}

// fixedFloor 參數跟著 schedule() 一起拿掉了：它存在的唯一理由是「預警時先抽好樓層、
// 到期再用同一層跑」，沒有第二個呼叫端。留著一個永遠是 null 的參數，下一個人會以為
// 有個地方會傳它。
function runEvent(st, sim, ev, band, tenant, simTopAll, scale){
  const h = hourOf(st);
  const d = derived(st);
  // 租戶事件發生在該租戶所在的那一帶；隨機事件照原本的 at 決定
  const from = eventFloor(st, sim, ev, band, simTopAll);
  if (from < 0) return;
  // 封鎖樓層：資料寫了 block:[a,b] 才會發生，沒寫的事件一個位元組都沒變。
  //
  // blockOn:'deliver' —— 封鎖**不在事件發生的瞬間開始**，而是等這個事件生出來的
  // 乘客真的被送到那一層才開始（#22：清潔工到了才開始打蠟）。arm 是這一次事件的
  // 所有乘客**共用的同一個物件**，所以兩個清潔工只會封一次，而第二個人晚一點才
  // 下車也不會在解封之後又封一次。
  // 沒寫 blockOn 的事件走原本那一行：發生的瞬間就封。
  let blockSecs = 0, arm = null;
  if (ev.block){
    const secs = ev.block[0] + Math.random() * (ev.block[1] - ev.block[0]);
    if (ev.blockOn === 'deliver'){ arm = { ev, secs, floor: from, used: false }; blockSecs = secs; }
    else if (blockFloor(st, sim, from, secs)) blockSecs = secs;
  }
  const base = ev.n[0] + ((Math.random() * (ev.n[1] - ev.n[0] + 1)) | 0);
  const n = Math.min(40, Math.round(base * (scale || 1)));
  let made = 0;
  for (let i = 0; i < n; i++){
    // inbound:true —— 事件的樓層是**終點**（人往那裡去），ev.to 說的是他們從哪來。
    // 打蠟需要它：要封的是 from，而清潔工必須「抵達」那裡這件事才算數。
    const other = floorInBand(st, ev.to, simTopAll);
    const here  = (!band && ev.at === 'any') ? floorInBand(st, 'any', simTopAll) : from;
    const o  = ev.inbound ? other : here;
    const to = ev.inbound ? here  : other;
    if (to === o || to < 0 || o < 0) continue;
    if (isFloorBlocked(st, sim, to)) continue;   // 跟 spawn() 同一條規則：終點不生，起點照常
    const p = makePassenger(st, sim, o, to, h, ev);   // ev 決定人物型別（type / types）
    if (ev.panic) p.left = p.patience = p.patience * ev.panic;
    p.surge = d.surgeMult;                       // B 尖峰加給
    p.fromEvent = true;
    if (arm) p.blockArm = arm;                   // 送達時才真的封鎖
    made++;
  }
  // 「一個人都沒生出來」原本就靜靜結束（免得跳出「0 個人」的提示）。**立刻封鎖**的
  // 事件是第一種不生人也真的發生了的事件，所以它要能走到下面；但**送達才封鎖**的
  // 事件在沒有人可送的時候什麼都不會發生，那就跟沒發生一樣，要靜靜結束。
  if (!made && (arm || !blockSecs)) return;
  const label = tenant ? `${L(tenant,'name','tenants')}：` : '';
  sim.toasts.push({ txt: label + L(ev,'text','events')
    .replace('{n}', made).replace('{f}', from + 1).replace('{s}', Math.round(blockSecs)), life: 4 });
  sim.lastEvent = { name: L(ev,'name','events'), t: st.t, floor: from, n: made,
                    block: blockSecs, armed: !!arm };
  // B 疏散模式的目標。封鎖那層沒有人可疏散（電梯根本不能停），指過去只會讓玩家
  // 白白按掉一次冷卻，所以只有真的湧出人的事件才設。
  // inbound 事件同理：人潮在**起點**不在 from，而且 1–2 個清潔工也稱不上爆量。
  if (made && !ev.inbound) sim.surgeFloor = { f: from, until: st.t + 25 };
}

// ------------------------------------------------------------ 等不到電梯就自己走樓梯（#22）
// blockOn:'deliver' 把「封鎖什麼時候開始」交給玩家。沒有上限的話那不是「延後」
// 而是「取消」：清潔工 patience:999，永遠不載他們就永遠不會被封鎖 —— 一個玩家
// 察覺得到、可以刻意執行的支配策略，零成本解掉整個事件。
// 而且就算玩家想載，FIFO 也載不到：實測清潔工從出現到被送達，FIFO 12 層中位
// **250 秒**、最長 **766 秒**（遊戲一天只有 180 秒，所以是 1.4–4.3 個遊戲日），
// SCAN／LOOK 只有 22–27 秒。FIFO 是玩家買的第一個演算法，所以「看到打蠟提示、
// 然後四天什麼都沒發生」是新手最可能踩到的那條路。
//
// ev.blockAfter = N（秒，選填）：這一批人出現 N 秒之後還沒被送上去，他們就自己
// 走樓梯上去，封鎖照樣開始。**沒寫這個欄位的事件一個位元組都沒變。**
//
// 為什麼是這個做法而不是「把 FIFO 改快」：慢就是 FIFO 的本體，它慢是對的
// （那正是玩家該去買 SCAN 的理由）。要有界的是**這個事件**，不是那個演算法。
function stairsUp(st, sim){
  let fired = null;
  // 等著的與**已經在車上**的都要看：只看 sim.waiting 的話，「兩個清潔工都上了車、
  // 然後車被 FIFO 的佇列卡住」這個最糟的情況一輩子不會觸發上限。
  const seen = p => {
    if (fired) return;
    const arm = p.blockArm;
    if (!arm || arm.used) return;
    const after = arm.ev && arm.ev.blockAfter;
    if (!(after > 0) || st.t - p.born < after) return;
    fired = arm;
  };
  for (const p of sim.waiting) seen(p);
  for (const s of sim.shafts) for (const r of s.riders) seen(r);
  if (!fired) return;
  fired.used = true;
  const ok = blockFloor(st, sim, fired.floor, fired.secs);
  // arm 是同一次事件共用的同一個物件，所以逐個比對就抓得到同一批人：一起走樓梯。
  //
  // **車上的那個也要一起下車走。** 第一版寫的是「已經有人在車上就不觸發，讓那一趟
  // 跑完」，實測打臉：FIFO 下清潔工上了車之後會被自己的乘客佇列餓死——一次量到
  // 上車後又坐了 **1101 秒**（6 個遊戲日）才到，於是「提示 → 樓真的封起來」的最糟值
  // 又變回無界，而那正是這條上限要解掉的東西。留他在車上也不對：那層封起來之後
  // openDoors 不在封鎖層開門，他會下不了車、一路佔著位子到解封。
  for (const s of sim.shafts)
    for (let i = s.riders.length - 1; i >= 0; i--)
      if (s.riders[i].blockArm === fired) s.riders.splice(i, 1);
  for (let i = sim.waiting.length - 1; i >= 0; i--)
    if (sim.waiting[i].blockArm === fired) sim.waiting.splice(i, 1);
  // 他們不算「放棄」——沒有扣評價、也不進 stats.abandoned。走樓梯是他們的工作，
  // 不是一個對玩家的懲罰；懲罰是接下來那層樓不能停。
  const txt = L(fired.ev, 'blockLateText', 'events') || L(fired.ev, 'blockText', 'events');
  if (ok && txt)
    sim.toasts.push({ txt: txt.replace('{f}', fired.floor + 1)
      .replace('{s}', Math.round(fired.secs)), life: 4 });
}

// ------------------------------------------------------------ 票價
function fareOf(st, d, p){
  const dist = Math.abs(p.dest - p.origin);
  // 樓層越高 = 租戶等級越高 = 同樣的距離值更多錢
  const tier = Math.max(tierAt(p.origin + 1), tierAt(p.dest + 1));
  const mix = Math.max(tenantMix(st, bandOf(p.origin + 1)).fare,
                       tenantMix(st, bandOf(p.dest + 1)).fare);   // A 租戶決定單價
  const surge = p.surge || 1;                                     // B 尖峰加給
  return C.FARE_BASE * dist * p.t.fare * tier * mix * d.fareMult * surge;
}

// ------------------------------------------------------------ 玩家點樓層
// B 一鍵疏散
export function evacuate(st, sim){
  const d = derived(st);
  if (!d.evacLevel || !sim.surgeFloor) return false;
  if (st.t < sim.evacReady) return false;
  sim.evacUntil = st.t + C.EVAC_SECONDS;
  sim.evacReady = st.t + d.evacCool;
  for (const s of sim.shafts){ s.queue.length = 0; if (s.mode === 'held') s.mode = 'idle'; }
  sim.toasts.push({ txt:t('evacFire', sim.surgeFloor.f + 1), life:3 });
  return true;
}

export function requestFloor(st, sim, f, shaftIdx){
  if (f < 0 || f >= st.floors) return;
  if (isFloorBlocked(st, sim, f)) return;   // 封鎖中：玩家點了也不去（電梯不停靠）
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
// `since` = 這位乘客「開始等」的時刻，**兩種來源必須是同一個時鐘**。
// 這裡曾經是 `t`，而且車上的人填 `r.board`（上車時刻）、等待的人填 `p.born`
// （出生時刻）——同一個欄位名承載兩種意思。一個人的 board 必然晚於他自己的 born，
// 所以只要還有任何一個更早出生、還在等的人，車上的人就永遠排在 FIFO 的最後面：
// 車廂載滿了人在樓裡繞，一邊繼續開去接它已經接不下的人（#38）。
// 上車時 s.riders.push(p) 推的是同一個物件，born 還在，所以兩邊都用 born。
// 改這裡之前先問：新填進去的值，跟旁邊那一行是同一個時鐘嗎？
function candidates(st, sim, s){
  const out = [], spare = [];
  // 封鎖中的樓層不是候選：車上要去那層的人先留在車上，等解封再送。
  for (const r of s.riders) if (!isFloorBlocked(st, sim, r.dest)) out.push({ f: r.dest, since: r.born });
  for (const p of sim.waiting){
    if (p.origin < s.from || p.origin > s.to) continue;
    if (isFloorBlocked(st, sim, p.origin)) continue;
    if (st.auto.group && p.assigned != null && p.assigned !== s.id){ spare.push({ f: p.origin, since: p.born }); continue; }
    out.push({ f: p.origin, since: p.born });
  }
  // 自己沒被指派到任何人的時候，不要空等 —— 去接別台顧不到的
  return out.length ? out : spare;
}

// 群組控制：把每個 hall call 指派給「最快到得了」的那台（ETA 估計）
function groupAssign(st, sim, d){
  // 每次重算：指派會隨電梯位置變動，黏著不放會讓其他台閒著看人流失
  const load = new Map(sim.shafts.map(s => [s.id, s.riders.length * 0.4]));
  const queue = [...sim.waiting].sort((a, b) => a.left / a.patience - b.left / b.patience);
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
  // B 疏散模式：全部電梯先去爆量的那一層
  if (sim.evacUntil > st.t && sim.surgeFloor && sim.surgeFloor.f >= s.from && sim.surgeFloor.f <= s.to
      && !isFloorBlocked(st, sim, sim.surgeFloor.f)){
    if (Math.abs(s.pos - sim.surgeFloor.f) > 1e-6 || s.riders.length === 0) return sim.surgeFloor.f;
  }
  // 玩家手動點的最優先。封鎖是在按下之後才發生的話，那一格要丟掉而不是照去。
  while (s.queue.length){
    const q = s.queue.shift();
    if (!isFloorBlocked(st, sim, q)) return q;
  }
  // 藍圖階的控制系統比 FIFO 更進階，本身就足以自己跑（Prestige 之後不會退回全手動）
  const advanced = st.auto.dest || st.auto.group || st.auto.shuttle || st.auto.double || st.auto.skylobby;
  if (!st.auto.fifo && !advanced) return null;         // 還沒買調度演算法 = 全手動
  const cand = candidates(st, sim, s);
  if (!cand.length) return null;

  // 目的地控制：系統知道每個人要去哪，所以會挑「最多人受益」的那一站
  if (st.auto.dest){
    const weight = new Map();
    const add = (f, w) => weight.set(f, (weight.get(f) || 0) + w);
    for (const r of s.riders) if (!isFloorBlocked(st, sim, r.dest)) add(r.dest, 1.4);   // 車上的人優先送到
    for (const p of sim.waiting){
      if (p.origin < s.from || p.origin > s.to) continue;
      if (isFloorBlocked(st, sim, p.origin)) continue;
      if (st.auto.group && p.assigned != null && p.assigned !== s.id) continue;
      add(p.origin, 1 + (1 - p.left / p.patience));   // 快沒耐性的權重更高
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
    if (isFloorBlocked(st, sim, end)){ s.dir = -dir; return null; }   // 端點被封：這一輪不掃
    if (Math.abs(s.pos - end) > 1e-6) return end;
    s.dir = -dir;
    return null;
  }
  // FIFO：誰先開始等誰先服務（since 是同一個時鐘，見 candidates()）
  cand.sort((a, b) => a.since - b.since);
  return cand[0].f;
}

// ------------------------------------------------------------ 開門與上下客
function openDoors(st, sim, s, f){
  const d = derived(st);
  s.mode = 'doors'; s.doorT = 0; s.vel = 0; s.pos = f;
  s.st.trips++; st.stats.trips++;
  let extra = 0, boarded = 0;
  const summoned = [];   // 招來的同伴先收在這裡，等這一次上下客都結束再併進 waiting

  // 封鎖中的樓層不開門。雙層轎廂會同時服務 f 與 f+1，所以要逐個過濾而不是整組擋掉。
  const floorsServed = (st.auto.double ? [f, Math.min(f + 1, st.floors - 1)] : [f])
    .filter(x => !isFloorBlocked(st, sim, x));

  // 下客
  for (const ff of floorsServed){
    for (let i = s.riders.length - 1; i >= 0; i--){
      const p = s.riders[i];
      if (p.dest !== ff) continue;
      // 滿意度：等待越短越高。下面結算評價要用它，**小費也用同一個**——
      // 「夠快」在這支檔案裡只能有一個定義（#25）。
      const wait = st.t - p.born;
      const sat = 1 - Math.min(1, wait / Math.max(1, p.patience));
      const fare = fareOf(st, d, p);
      // 送得夠快的小費（#25 大包小包購物客）。**資料寫了 tip:{sat,mult} 才會發生**，
      // 沒寫的人物走的還是原本那一行、一個位元組都沒變。
      // 走跟車資完全一樣的帳（現金／本輪／終身／離線速率窗），因為它就是收入的一部分，
      // 不是另一種貨幣；分開記帳只會多一個以後對不起來的數字。
      const onTime = !!p.t.tip && sat >= (p.t.tip.sat != null ? p.t.tip.sat : 0.6);
      const tip = onTime ? fare * (p.t.tip.mult || 0) : 0;
      if (tip > 0) st.stats.tips = (st.stats.tips || 0) + 1;
      const money = fare + tip;
      st.cash += money; st.runRevenue += money; st.lifetimeRevenue += money;
      sim.rateAcc += money;
      st.stats.served++; s.st.carried++;
      if (!st.codex[p.type]) { st.codex[p.type] = 0; }
      st.codex[p.type]++;
      // #27「一團都不能少」：整團送完、而且一路上沒有人放棄，才記一筆。
      // 記在 codex 不是 stats —— codex 跨拆樓保留（doPrestige），這是長線的收藏。
      if (p.crew && --p.crew.left === 0)
        st.codex.crewIntact = (st.codex.crewIntact || 0) + 1;
      if (p.t.ghost){
        const bonus = 50 * st.floors;
        st.cash += bonus; st.runRevenue += bonus; sim.rateAcc += bonus;
        sim.toasts.push({ txt:t('ghostBonus', Math.round(bonus)), life:4 });
      }
      // 送達觸發的封鎖（#22 的清潔工）。掛在這裡而不是另造一套「送達事件」機制：
      // 這一段本來就是「送到之後會發生什麼」的地方——幽靈的意外之財、乘客的評價、
      // 招來同伴（#27）都在這裡。arm 是同一次事件的清潔工共用的，所以只會封一次。
      if (p.blockArm && !p.blockArm.used && p.blockArm.floor === ff){
        p.blockArm.used = true;
        if (blockFloor(st, sim, ff, p.blockArm.secs))
          sim.toasts.push({ txt: L(p.blockArm.ev, 'blockText', 'events')
            .replace('{f}', ff + 1).replace('{s}', Math.round(p.blockArm.secs)), life:4 });
      }
      // 滿意度 → 評價（設計 4.5：別讓乘客生氣有長期複利價值）。sat 在上面算過了。
      st.rating += (sat - 0.40) * 0.035 * d.ratingGain;
      if (p.t.rating) st.rating += p.t.rating;
      // 準時獎勵的評價那一半（#50 面試者）。跟小費**同一個 sat、同一個門檻**——
      // 「夠快」在這支檔案裡只有一個定義。**加評價這一半是純資料驅動的**：
      // 任何一列寫了 tip.rating 就有，沒寫的人物一個位元組都沒變。
      //
      // 計數器帶著型別（intervieweeOnTime），不是一個共用的 codex.onTime：
      // 成就的文案講的是**哪一種人**準時送到幾個，共用計數器會讓下一個寫
      // tip.rating 的人物把那句話變成假的。
      //
      // ⚠ **鍵寫成字面值，不是 `p.type + 'OnTime'` 算出來的**（第一版是算出來的）。
      // 驗收第 11 組那條 guard 靜態掃這支檔案的 `codex.xxx`，確認「成就讀的鍵真的
      // 有人寫得進去」——算出來的鍵它看不到，而它看不到的正好是它要抓的那種安靜
      // 錯誤：成就的鍵打錯一個字母 → 那條成就永遠拿不到，不丟例外、不壞畫面。
      // 這跟 crewIntact／waxClean 是同一個形狀（條件來自資料，計數器的名字是字面值）。
      // **下一個寫 tip.rating 的人物要在這裡多一行。** 那一行是刻意的成本，
      // 它換到的是「這個計數器有人寫得進去」變成機器檢查得到的事實。
      if (onTime && p.t.tip.rating){
        st.rating += p.t.tip.rating;
        if (p.type === 'interviewee')
          st.codex.intervieweeOnTime = (st.codex.intervieweeOnTime || 0) + 1;
      }
      if (money > 0) sim.pops.push({ txt:'+$' + fmtShort(money), floor: ff, life:1, off: Math.random()*20-10 });
      // 招來同伴（#27）：送到之後才發生，所以掛在這裡而不是上車或生成的時候。
      summonCompanions(st, sim, p, hourOf(st), 'deliver', summoned);
      s.riders.splice(i, 1);
    }
  }

  // 上客
  // **要重算一次**：下客的過程中這一層可能剛剛被封起來（清潔工到了就開始打蠟）。
  // 沿用上面那份 floorsServed 的話，「開始打蠟」的那一趟會順手把整層的人載走，
  // 這個事件最痛的第一秒剛好被自己抵銷掉。門是開著的，但從這一刻起不能再上人。
  const boardFloors = floorsServed.filter(x => !isFloorBlocked(st, sim, x));
  const cap = d.capacity;
  const used = () => s.riders.reduce((a, p) => a + p.t.size, 0);
  for (const ff of boardFloors){
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
  // 同伴要等上客結束才進 waiting：不然「送到 A 樓 → 同伴出現在 A 樓 → 同一次開門
  // 就上了同一台車」，玩家看到的是一個瞬間自我消化掉的機制。
  for (const q of summoned) sim.waiting.push(q);

  const grouping = st.auto.dest ? 0.6 : 1;   // 目的地控制：分組上客，時間省下來
  s.doorLen = d.door + extra + d.boardTime * boarded * grouping;
  s.st.load = cap ? used() / cap : 0;
}

// ------------------------------------------------------------ 主步進
export function step(st, sim, dt){
  const d = derived(st);
  st.t += dt;

  // --- 封鎖到期就消失。isFloorBlocked 自己會比時間，這裡只是不要讓表無限長大。
  if (sim.blocked) for (const k in sim.blocked) if (sim.blocked[k] <= st.t) delete sim.blocked[k];

  // --- 7「今日人潮」：緩慢隨機遊走。平均值不變，體感有忙有閒
  sim.moodT += dt;
  if (sim.moodT >= C.MOOD_EVERY){
    sim.moodT = 0;
    sim.mood = Math.max(C.MOOD_MIN, Math.min(C.MOOD_MAX,
      sim.mood + (Math.random() * 2 - 1) * C.MOOD_DRIFT));
  }

  // --- 生成：Poisson 到達（指數分布的間隔），不再是固定節拍器
  // 到達率 = 每層人口權重的總和 × 今日人潮。時段的形狀已經在 floorWeight 的尖峰窗裡，
  // 所以這裡不再乘 rushMult，避免尖峰被算兩次。
  const rate = arrivalRate(st, sim) * sim.mood;                  // 人/秒
  sim.spawnT -= dt;
  let guard = 0;
  while (sim.spawnT <= 0 && guard++ < 40){
    if (sim.waiting.length < WAIT_CAP) spawn(st, sim);
    sim.spawnT += -Math.log(1 - Math.random()) / Math.max(1e-4, rate);
  }

  // --- 11 口碑迴圈：評價現在**只**透過 derived().womMult 影響到達率，沒有別的路徑。
  // 這裡原本有一段每 60 秒的 churn：低評價趕走租戶、高評價免費送一層。招商取消之後
  // 兩邊都沒有意義了——退租是 owner 裁決掉的「離散懲罰」，送租戶是招商的反向操作，
  // 而且已經沒有空樓層可以送。評價低的後果就是賺比較少，僅此而已。

  // --- 8/A 租戶自己會製造的事件
  tenantEvents(st, sim, dt);

  // --- 8 隨機突發事件（跟租戶無關的那些）
  sim.eventT += dt;
  if (sim.eventT >= C.EVENT_EVERY){
    sim.eventT = 0;
    if (Math.random() < C.EVENT_CHANCE) fireEvent(st, sim);
  }

  // --- 等不到電梯的工班自己走樓梯上去（#22）。要在耐性之前：他們 patience:999，
  // 順序其實無關緊要，但「先讓事件推進、再結算耐性」讀起來才是因果的順序。
  stairsUp(st, sim);

  // --- 耐性
  for (let i = sim.waiting.length - 1; i >= 0; i--){
    const p = sim.waiting[i];
    p.left -= dt;
    if (p.left <= 0){
      sim.waiting.splice(i, 1);
      st.stats.abandoned++;
      st.rating -= 0.02 * (p.t.angry || 1);
      markBlockLoss(sim, p.origin);          // #22：這一層正在封鎖的話，這次不算乾淨
      sim.pops.push({ txt:t('gaveUp'), floor:p.origin, life:1, bad:true, off: Math.random()*20-10 });
    }
  }

  // #22 結算觀察單。**放在耐性迴圈之後**：解封的那一格 tick 裡，因為封鎖而耗盡耐性
  // 的人還是在這一輪才被結算掉，先結案就會把最後那一秒的流失算成「乾淨」。
  if (sim.blockWatch){
    for (let i = sim.blockWatch.length - 1; i >= 0; i--){
      const w = sim.blockWatch[i];
      if (w.until > st.t) continue;
      sim.blockWatch.splice(i, 1);
      if (w.clean) st.codex.waxClean = (st.codex.waxClean || 0) + 1;
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
        sim.toasts.push({ txt:t('overheated'), life:3 }); continue; }
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
      else if (s.mode === 'idle' && s.express && sim.lobby && !isFloorBlocked(st, sim, sim.lobby)
               && Math.abs(s.pos - sim.lobby) > 2){
        startMove(st, sim, s, sim.lobby);
      }
    }
  }

  // 抽象層已經拿掉：100 層全部逐個模擬，收入只有一種來源——真的把人送到。
  // --- 收尾
  // 評價回穩：只往上拉，不往下拉——五星是玩家自己掙來的，不該被平均值吃掉。
  if (st.rating < C.RATING_DRIFT_TO)
    st.rating += (C.RATING_DRIFT_TO - st.rating) * C.RATING_DRIFT * dt;
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

export function fmtShort(n){
  if (n < 1000) return (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
  const u = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac'];
  let i = 0; while (n >= 1000 && i < u.length - 1){ n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)) + u[i];
}
