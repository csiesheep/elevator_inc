// sim.js — 模擬。乘客、電梯井、調度演算法、過熱、評價、統計流量模型。
// 這裡的東西都是暫時的：存檔只存 GameState，不存乘客陣列（設計 4.13）。
import { CONFIG as C, PASSENGERS, BANDS, EVENTS, WEEKDAYS, bandOf, tierAt,
         TENANTS, tenantById, defaultTenant, passengerById } from './content.js';
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
    // #111 電力突波的觀察單（同一個形狀，見 blockWatch）：停機期間沒有人放棄才記一筆。
    stallWatch: null,
    // #114 諾貝爾獎來訪：暫時的評價加值，到期扣回。null = 現在沒有任何加值。
    ratingLift: null,
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
// evId（選填）：**是哪一列事件封的**。只有一個用途，而那個用途是一條會安靜壞掉的路：
// 觀察單到期時記的計數器 `codex.waxClean` 名字叫「打蠟」，而 `waxdry` 那條成就的文案
// 也寫「撐過 4 次地板打蠟」。#96 起霧是第二列寫 `block:` 的事件——不帶 evId 的話它會
// 安靜地灌進同一個計數器，於是**一句沒有數字錯誤的文案開始描述一件沒發生過的事**
// （驗收第 8 組只比數字，比不出這一種）。所以觀察單記得住是誰封的。
// ⚠ **下一個寫 `block:` 的事件要在到期那裡多一行**，否則它會回到同一個坑。
export function blockFloor(st, sim, f, secs, evId){
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
  else sim.blockWatch.push({ f, until, clean: true, ev: evId || null });
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
  if (type.pair) makeMate(st, sim, p, out);
  if (type.summon) summonCompanions(st, sim, p, h, 'spawn', out);
  return p;
}

// ------------------------------------------------------------ 必須同車（成對，可重用）
// 人物資料上的 pair:true（欄位說明在 content.js）。#63 新婚夫婦是第一個用它的，
// 住宅 B／E7（遛狗）與觀景台 B／E4（求婚）也要用同一個欄位，所以它是資料不是特例。
//
// 這裡只做一件事：**再生一個同起訖、同型別的人，兩邊互指**。真正的「必須同車」
// 發生在 openDoors 的上客迴圈裡（兩個一起上，或兩個都不上）。
//
// 三條刻意的規則：
//   1. **同伴不會再帶同伴**（pairing 這個深度旗標）。少了它 makePassenger → makeMate
//      → makePassenger 是無窮遞迴，不是慢慢長大而是直接爆掉。
//   2. **WAIT_CAP 擋掉同伴的話，第一個人就不成對**（不設 p.mate）。
//      上客那邊看的是 `p.mate` 不是 `p.t.pair`，所以他退回一個普通乘客，
//      而不是一個「永遠等不到另一半、必然佔著位子到耐性歸零」的殭屍。
//   3. **兩個人的 patience 逐字相同**（同 origin/dest → 同 far），所以耐性迴圈裡
//      他們一定同一個 tick 一起放棄。不需要第二條「一個走了另一個怎麼辦」的路——
//      多一條路就多一個以後會分岔的地方。上客那邊仍然防禦性地檢查 mate 還在不在。
//
// 事件用 pair 型別這條路（#5-E4 求婚是第一個）：**已經接上了，在 runEvent 裡。**
//    runEvent 在 makePassenger **回傳之後**才蓋 `p.surge` / `p.fromEvent` /
//    `p.blockArm`、也才乘 `ev.panic`，而同伴是在 makePassenger **裡面**生的，
//    所以那四項原本全部只蓋得到第一個人。後果依序是：同伴少一份尖峰加給、
//    不算事件乘客、以及**兩個人的耐性分岔**——而規則 3（同一個 tick 一起放棄）
//    正是靠「兩份 patience 逐字相同」成立的，分岔之後上客那邊就只剩一行止血。
//    現在 runEvent 把四項逐字補到 `p.mate` 上，同伴也計入 made。
//    ⚠ **以後在 runEvent 裡新增任何「事後蓋在 p 上」的欄位，都要同時蓋到 p.mate**，
//    否則就會再長出一次同樣的分岔。
let pairing = false;
function makeMate(st, sim, p, out){
  if (pairing) return null;                                     // 規則 1
  if (sim.waiting.length + (out ? out.length : 0) >= WAIT_CAP) return null;   // 規則 2
  pairing = true;
  let q = null;
  try {
    q = makePassenger(st, sim, p.origin, p.dest, hourOf(st), { type: p.type }, out);
  } finally { pairing = false; }
  if (!q || q.type !== p.type){ if (q) q.mate = null; return null; }
  p.mate = q; q.mate = p;
  // 「整對送到」的計數用共用物件，跟 #27 的 crew 同一個形狀：送達時 --left，
  // 歸零才記一筆。他們同上同下，所以這個數字就是「幾對」。
  const g = { left: 2 };
  p.pairOf = q.pairOf = g;
  return q;
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

// 這裡曾經有 tenantEvents()：每一帶的 defaultTenant 週期性製造自己的事件。
// 招商移除之後七個 defaultTenant 全是 plain、都沒有 event，所以它 **0 次觸發**
// （實測 3 種子 × 60 遊戲日 × 12/30/60 層）。orchestrator 裁決（#86）連同那七列
// byTenant 的 EVENTS 一起移除；理由與量到的頻率寫在 content.js 的 TENANTS 註解裡。
// **runEvent() 的 band / tenant / scale 三個參數留著**——隨機事件用不到它們（都傳 null／
// 預設），但拿掉會動到一支還在服役的函式的簽名，那不是這一趟的範圍。
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
// 機制的東西。
// rollGap() 也在這裡：它讀 tenant.every，唯一的呼叫點是 tenantEvents()，
// 兩者一起在 #86 移除。

function fireEvent(st, sim){
  const h = hourOf(st);
  const simTopAll = st.floors - 1;
  const pool = EVENTS.filter(e => {
    // #86 之後 EVENTS 裡已經沒有 byTenant 的列，所以這一行今天恆為 false。
    // 留著是因為它便宜且防呆：byTenant 的列沒有 hours，少了這道關 inHourWindow()
    // 會拿到 undefined。真正該擋住「加了一列卻沒有路走得到它」的是可達性 guard。
    if (e.byTenant) return false;
    // 一輪只發生一次（#134 最後升空）。記在 `st.fired`（state.js），**不是 sim**——
    // sim 每次讀檔都重建，記在那裡等於「關掉再打開就能再看一次結局前的最後一批人」。
    // 拆樓會重置，因為 `doPrestige` 明列 carry、沒列到的就是新的一輪。
    if (e.once && st.fired && st.fired[e.id]) return false;
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
  // 倒數計時（#128）：一段時間內全棟票價乘上一個倍率。跟封鎖同一種形狀——
  // **它是這一趟第二種「不生人也真的發生了」的事件**，所以下面那個提前 return
  // 要放它過去，否則玩家永遠看不到倒數開始的提示。
  let boostSecs = 0;
  if (ev.fareBoost){
    boostSecs = ev.fareBoost[1] + Math.random() * (ev.fareBoost[2] - ev.fareBoost[1]);
    const until = st.t + boostSecs;
    // 已經在加倍中就延長，不疊乘：兩次 ×2 疊成 ×4 會讓「剛好連續抽到兩次」變成
    // 一個玩家無法預期、也無法重現的暴利。
    if (!sim.fareBoost || sim.fareBoost.until < until)
      sim.fareBoost = { mult: ev.fareBoost[0], until };
  }
  let blockSecs = 0, arm = null;
  if (ev.block){
    const secs = ev.block[0] + Math.random() * (ev.block[1] - ev.block[0]);
    if (ev.blockOn === 'deliver'){ arm = { ev, secs, floor: from, used: false }; blockSecs = secs; }
    else if (blockFloor(st, sim, from, secs, ev.id)) blockSecs = secs;
  }
  // 電力突波（#111）：**所有**電梯井強制停機。資料寫了 stall:[a,b] 才會發生，
  // 沒寫的事件一個位元組都沒變。
  //
  // 走的是**既有的 `s.lock` 狀態機**（超速過熱用的那一個），不是第二套「電梯不能動」：
  // 停機期間的行為因此跟過熱逐字相同（不移動、不開門、解鎖時熱量歸零），而玩家對
  // 那個懲罰的體感已經被超速教過一次。`s.heat = heatMax` 只是為了讓畫面上的熱量條
  // 對得起「熱量瞬間拉滿」這句文案——真正讓車停下來的是 `lock`。
  let stallSecs = 0;
  if (ev.stall){
    stallSecs = ev.stall[0] + Math.random() * (ev.stall[1] - ev.stall[0]);
    for (const sh of sim.shafts){ sh.heat = d.heatMax; sh.lock = stallSecs; }
    // #111 的成就「停機也沒人走」用的觀察單，形狀跟 #22 的 blockWatch 一樣：
    // 開一張，停機期間有人放棄就作廢，撐過去才記一筆。**一次只有一張**——
    // 突波期間再來一次突波是同一段停機的延長，開兩張等於同一件事算兩次。
    sim.stallWatch = { until: st.t + stallSecs, abandoned: st.stats.abandoned };
  }
  // 暫時的評價加值（#114）。夾限與漂移造成的失真寫在 content.js 的 ratingLift 欄位說明。
  if (ev.ratingLift){
    st.rating += ev.ratingLift[0];
    sim.ratingLift = { amt: ev.ratingLift[0], until: st.t + ev.ratingLift[1] };
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
    p.evId = ev.id;                              // 是哪一列事件生的（成就的計數器要用）
    if (ev.exclusive) p.exclusive = true;        // 這一趟包場（#122）。⚠ 同伴拿不到，見 isExcl 的 #136
    if (arm) p.blockArm = arm;                   // 送達時才真的封鎖
    made++;
    // pair:true 的型別在 makePassenger **裡面**就把同伴生好了，所以上面那四項只蓋得到
    // 第一個人。四項逐字補到同伴身上——**`ev.panic` 尤其不能漏**：兩個人的耐性一旦
    // 分岔，「同一個 tick 一起放棄」（makeMate 規則 3）的前提就沒了，而上客那邊只剩
    // 一行防殭屍的止血。同伴也算一個「這次事件生出來的人」，所以 made 一起加。
    const mate = p.mate;
    if (mate){
      if (ev.panic) mate.left = mate.patience = mate.patience * ev.panic;
      mate.surge = p.surge;
      mate.fromEvent = true;
      mate.evId = p.evId;                        // ⚠ 下面那條規則的第一個新欄位，逐字補上
      if (ev.exclusive) mate.exclusive = true;   // ⚠ 同一條規則，第二個（summon 那一半仍是 #136）
      if (arm) mate.blockArm = arm;
      made++;
    }
  }
  // 「一個人都沒生出來」原本就靜靜結束（免得跳出「0 個人」的提示）。**立刻封鎖**的
  // 事件是第一種不生人也真的發生了的事件，所以它要能走到下面；但**送達才封鎖**的
  // 事件在沒有人可送的時候什麼都不會發生，那就跟沒發生一樣，要靜靜結束。
  // **停機是第二種「不生人也真的發生了」的事件**（第一種是立刻封鎖），所以它跟
  // blockSecs 一起放行。送達才封鎖的那一種仍然要靜靜結束。
  // **倒數計時（#128）是第三種**：它只把票價乘上一段時間，同樣一個人都不生。
  // 三個都放行，而 `{s}` 取其中不為 0 的那一個——一列事件不會同時是這三種。
  if (!made && (arm || (!blockSecs && !stallSecs && !boostSecs))) return;
  // 走到這裡才算「真的發生了」，所以 `once`（#134 最後升空）在這裡才劃掉——
  // 放在函式開頭的話，一次抽中但一個人都沒生出來的靜默 return 會把這一輪唯一的機會吃掉。
  if (ev.once && st.fired) st.fired[ev.id] = true;
  const label = tenant ? `${L(tenant,'name','tenants')}：` : '';
  sim.toasts.push({ txt: label + L(ev,'text','events')
    .replace('{n}', made).replace('{f}', from + 1)
    .replace('{s}', Math.round(blockSecs || stallSecs || boostSecs)), life: 4 });
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
  const ok = blockFloor(st, sim, fired.floor, fired.secs, fired.ev && fired.ev.id);
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
// 倒數計時（#128）：一段時間內全棟票價乘上一個倍率。
// **跟 `p.surge` 不是同一件事**：`surge` 在乘客**生出來的那一刻**蓋在他身上，
// 所以它是「這一批人比較值錢」；這個是讀**收錢的那一刻**的時鐘，所以它是
// 「這一段時間比較值錢」——倒數期間你多跑一趟就多賺一趟，那才是玩家的決定。
function fareBoostMult(st, sim){
  const b = sim && sim.fareBoost;
  if (!b || b.until <= st.t) return 1;
  return b.mult;
}

function fareOf(st, d, p, sim){
  const dist = Math.abs(p.dest - p.origin);
  // 樓層越高 = 租戶等級越高 = 同樣的距離值更多錢
  const tier = Math.max(tierAt(p.origin + 1), tierAt(p.dest + 1));
  const mix = Math.max(tenantMix(st, bandOf(p.origin + 1)).fare,
                       tenantMix(st, bandOf(p.dest + 1)).fare);   // A 租戶決定單價
  const surge = p.surge || 1;                                     // B 尖峰加給
  return C.FARE_BASE * dist * p.t.fare * tier * mix * d.fareMult * surge * fareBoostMult(st, sim);
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
// ------------------------------------------------------------ 包場（可重用，#117 機密貨箱）
// 人物資料上的 `exclusive:true`（欄位說明在 content.js）。**它是一條上車規則，
// 不是一個佔位數字**——用 `size:6` 表達「佔滿整台」在起始載客量 4 是「永遠上不了車」、
// 在載客量 16 是「只佔 3/8」，兩端都壞。
//
// **載客量是可以升級的**（`CAP_START` 4，`cap` 滿級 16 段 → 4 + 2×16 = **36**），
// 所以任何寫死的 size 都只在其中一個升級階段剛好等於「整台車」；上車規則在
// 4 到 36 之間每一個值都成立。（#122 衛星送件那一支各自實作過一次「把它算成
// 整個 cap」，合併時撤掉——**兩支為同一個機制各造一個輪子，而三張 id 表都看不到**。）
//
// ⚠ **`exclusive` 可以是型別的，也可以是事件蓋在乘客身上的。**
//   型別那一種是「這個東西本來就要包場」（#117 機密貨箱）；乘客那一種是
//   「這一列事件生出來的這一個要包場」（#122 衛星送件借既有的送貨員當押運，
//   而送貨員平常當然不包場）。兩種在這支檔案裡是同一件事，所以只有一個判斷式。
//   ⚠ 事件那一半有 **#136** 那個洞：`runEvent` 在 `makePassenger()` **回傳之後**
//   才蓋 `p.exclusive`，而 `makeMate()` / `summonCompanions()` 在它**裡面**跑，
//   所以**同伴拿不到**（`runEvent` 已經逐字補了 `p.mate`，但補不到 summon 那一批）。
//   `satellite` 是 n:1 又不 summon，今天量不出來——**下一個寫「包場 ＋ summon」的人會踩到。**
const isExcl = p => !!(p.exclusive || p.t.exclusive);

// 這支只回答一個問題：這台車現在被包場了嗎。三個呼叫點共用它，因為
// 「車上有沒有包場的乘客」在這支檔案裡只能有一個定義。
const isSealed = s => s.riders.some(isExcl);

// **空車優先去接包場的乘客。這一條不是優化，是這個機制能不能運作的關鍵。**
// 包場的乘客只上空車，而一台空車在高人流下幾乎立刻就會載到別人——所以
// 「剛好空著、而且第一個停靠剛好是他那層」是一個機率極低的巧合，不是一條路。
// 實測（100 層 / LOOK / 4 井 / cap 8 / 8 種子 × 20 遊戲日，逐步量上車前的等待）：
//     只擋「載不了他就不瞄準他」      中位 856 秒、最長 1555 秒，8 場裡 6 場結束時還卡著一個
//     再加上這一條                    數字寫在 content.js 的 `crate` 那一列
// 代價是明確而且是**這個機制本來就該付的**：一台空車會為了一個貨箱跑一趟遠路，
// 那正是「誰都不能一起搭」的意思。crate 的 `w:3`（一場約兩個）讓它不會變成常態。
// 回傳 null = 現在沒有這種呼叫，呼叫端照原本的路走（所以沒有 exclusive 資料時
// 這支永遠回 null，整個機制等於不存在）。
function soloCalls(st, sim, s){
  if (s.riders.length) return null;
  const out = [];
  for (const p of sim.waiting){
    if (!isExcl(p)) continue;
    if (p.origin < s.from || p.origin > s.to) continue;
    if (isFloorBlocked(st, sim, p.origin)) continue;
    out.push({ f: p.origin, since: p.born });
  }
  return out.length ? out : null;
}

function candidates(st, sim, s){
  const out = [], spare = [];
  // 封鎖中的樓層不是候選：車上要去那層的人先留在車上，等解封再送。
  for (const r of s.riders) if (!isFloorBlocked(st, sim, r.dest)) out.push({ f: r.dest, since: r.born });
  // 包場中：這一趟一個人都上不了，所以候選只剩「把他送到」。
  // **少了這一行，載著貨箱的車會照常開去接一整層它一個都收不了的人**，而 FIFO 會
  // 照 `since` 把它釘在最早出現的那一層——貨箱於是永遠到不了，而且畫面上看起來
  // 電梯很忙。這正是 #68「瞄準一個上不了車的乘客」的形狀，只是這次上不了車的
  // 是別人。
  if (isSealed(s)) return out;
  for (const p of sim.waiting){
    if (p.origin < s.from || p.origin > s.to) continue;
    if (isFloorBlocked(st, sim, p.origin)) continue;
    // **不要瞄準一個這台車載不了的乘客**——這是 #68 那條學費的正面版本。
    // 包場的乘客只上空車，所以一台載著人的車去他那層是白跑一趟；而他 patience 999,
    // 會永遠是 FIFO 排序裡「最早開始等」的那一個，於是**每一台車都一直開去同一層、
    // 每一次都載不到他**。實測（100 層 / LOOK / 4 井 / cap 8 / 8 種子 × 20 遊戲日，
    // 沒有這一行）：貨箱上車前的等待中位 **449 秒**、最長 **998 秒**，場上最久的一個
    // 等了 **1950 秒（10.8 個遊戲日）**，而且**每一場結束時都還有一個卡在佇列裡**。
    // 加上這一行之後的數字寫在 content.js 的 `crate` 那一列。
    if (isExcl(p) && s.riders.length) continue;

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

  // 空車優先去接包場的乘客（#117）。**放在這裡而不是 candidates() 裡面**：目的地控制
  // 那一段不讀 `cand`，它自己從 sim.waiting 重算一遍權重，所以只擋 candidates() 會
  // 漏掉一半的呼叫端。這裡是三種演算法唯一都會經過的地方。
  // 排序用 `since`（開始等的時刻），跟 FIFO 同一個時鐘——兩個貨箱時先接先等的那一個。
  const solo = soloCalls(st, sim, s);
  if (solo) return solo.sort((a, b) => a.since - b.since)[0].f;

  // 目的地控制：系統知道每個人要去哪，所以會挑「最多人受益」的那一站
  if (st.auto.dest){
    const weight = new Map();
    const add = (f, w) => weight.set(f, (weight.get(f) || 0) + w);
    for (const r of s.riders) if (!isFloorBlocked(st, sim, r.dest)) add(r.dest, 1.4);   // 車上的人優先送到
    // 包場中不收人，所以等待的人一個都不進權重表——理由與 candidates() 那一行相同。
    // **這條路要單獨擋一次**：目的地控制不讀 cand，它自己從 sim.waiting 重算一遍。
    if (!isSealed(s)) for (const p of sim.waiting){
      if (p.origin < s.from || p.origin > s.to) continue;
      if (isFloorBlocked(st, sim, p.origin)) continue;
      if (isExcl(p) && s.riders.length) continue;   // 載不了他，理由見 candidates()
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
      const fare = fareOf(st, d, p, sim);
      // 送得夠快的小費（#25 大包小包購物客）。**資料寫了 tip:{sat,mult} 才會發生**，
      // 沒寫的人物走的還是原本那一行、一個位元組都沒變。
      // 走跟車資完全一樣的帳（現金／本輪／終身／離線速率窗），因為它就是收入的一部分，
      // 不是另一種貨幣；分開記帳只會多一個以後對不起來的數字。
      const onTime = !!p.t.tip && sat >= (p.t.tip.sat != null ? p.t.tip.sat : 0.6);
      const tip = onTime ? fare * (p.t.tip.mult || 0) : 0;
      if (tip > 0) st.stats.tips = (st.stats.tips || 0) + 1;
      // 限時獎金（#106 / #116）。**這不是第二個「快」的定義，是第二件事。**
      // `tip` 的門檻是 `sat`（等待佔**耐性**的比例）；這一個的門檻是**絕對秒數**。
      //
      // 為什麼非要第二個欄位不可 —— 我先用 `tip` 做，然後量了：
      //   100 層 / LOOK / 4 井 / cap 8，6 種子 × 20 遊戲日，大廳 → 實驗層，
      //   **送到的樣本送件員 sat 全部是 0**（n=9，max 0.000）。
      //   原因是結構性的：`sat = 1 − 等待/場上耐性`，而「等待」含移動時間；
      //   一趟 90 層的移動本身就要 76–253 秒，場上耐性只有 66.7 秒。
      //   所以 `tip` **無論門檻訂多低都給不出來**（sat≥0.1 也是 0%）。
      //   一個永遠不會觸發的獎金，跟沒有這個獎金是一樣的。
      // 「時間內送到」在長程上只能用秒數表達，這就是那個欄位。短程的人物繼續用 `tip`
      // ——兩個欄位各自回答一個問題，沒有哪一個是另一個的複本。
      // **沒寫 `bonus` 的人物一個位元組都沒變**，而且它不進 `st.stats.tips`：
      // 那個計數器是 #25 那條成就的，混進來會讓那句文案變成假的。
      const inTime = !!p.t.bonus && wait <= p.t.bonus.secs;
      const bonus = inTime ? fare * (p.t.bonus.mult || 0) : 0;
      const money = fare + tip + bonus;
      st.cash += money; st.runRevenue += money; st.lifetimeRevenue += money;
      sim.rateAcc += money;
      st.stats.served++; s.st.carried++;
      if (!st.codex[p.type]) { st.codex[p.type] = 0; }
      st.codex[p.type]++;
      // 實驗樓層帶（#109 / #110 / #112）：三個事件跟三個人物**共用同一個型別**
      // （#105：每開一個新型別，artist 就要多擠一個顏色進一個快要沒有位置的空間），
      // 而兩條成就不可以讀同一個 codex 鍵。所以事件那一半改數「這一趟是不是事件生的」
      // ——`p.fromEvent` 是 runEvent 蓋上去的旗標，隨機池裡遇到的同一種人沒有它。
      // ⚠ **鍵寫成字面值，不是 `p.type + 'Event'` 算出來的**，跟 intervieweeOnTime /
      //   waxClean / crewIntact 同一個形狀：驗收第 11 組靜態掃這支檔案的 `codex.xxx`，
      //   算出來的鍵它看不到，而它看不到的正好是它要抓的那種安靜錯誤。
      // ⚠ **這三行的前提是「今天只有那一個事件會生出這個型別」。**
      //   再加一列 `type:'crate'` / `'hazmat'` / `'keeper'` 的事件，這三個計數器就會
      //   被混進去，那三條成就的文案就變成假的。**下一個寫這三種 type 的事件要回來看這裡。**
      if (p.fromEvent){
        if (p.type === 'crate')  st.codex.crateEscort = (st.codex.crateEscort || 0) + 1;
        if (p.type === 'hazmat') st.codex.protoDemo   = (st.codex.protoDemo   || 0) + 1;
        if (p.type === 'keeper') st.codex.animalRound = (st.codex.animalRound || 0) + 1;
      }
      // #27「一團都不能少」：整團送完、而且一路上沒有人放棄，才記一筆。
      // 記在 codex 不是 stats —— codex 跨拆樓保留（doPrestige），這是長線的收藏。
      if (p.crew && --p.crew.left === 0)
        st.codex.crewIntact = (st.codex.crewIntact || 0) + 1;
      // 必須同車（#63）：整對送到才記一筆。他們同上同下，所以 left 一定會歸零，
      // 這個數字就是「送到幾對」而不是「送到幾個人」。
      // ⚠ **鍵是字面值，而且帶著型別**，跟 intervieweeOnTime 同一個形狀：
      //   驗收第 11 組那條 guard 靜態掃這支檔案的 `codex.xxx`，算出來的鍵它看不到。
      //   而共用一個 codex.pairsDelivered 會讓下一個寫 pair:true 的人物
      //   （住宅 B 遛狗、觀景台 B 求婚）把「新婚夫婦」那句成就文案變成假的。
      //   **下一個寫 pair:true 的人物要在這裡多一行。**
      if (p.pairOf && --p.pairOf.left === 0 && p.type === 'newlywed')
        st.codex.newlywedPairs = (st.codex.newlywedPairs || 0) + 1;
      // 觀景台帶的事件（#5，#90–#99）：**一列事件一個計數器。**
      //
      // 為什麼不用 `codex[p.type]`（上面那兩行已經在寫的東西）：這一帶九列事件指的是
      // **五個型別，而那五個鍵全部已經被別的成就佔走了**——`skyline` 讀 observer、
      // `saidyes` 讀 proposer、`shutterbug` 讀 photocrew、`groundlevel` 讀 acrophobe、
      // `flagfollower` 讀 deckguide（#100–#104）。再掛一條上去就是 `walkies`／`hotfood`
      // 第三次重演：**同一個 codex 鍵、同一個意思、只有門檻不同，而兩邊各自的
      // harness 都會是綠的**，因為衝突只在兩邊同時存在時才存在。
      // 而且那五個型別**都有 w > 0**（8/12/20/3 與 observer 的 30），所以它們的鍵裡
      // 混著大量自然生成的人：`codex.observer` 有 34.5% 是導遊招來的同伴。
      // 「送達幾個觀景客」與「在夕陽時段送上去幾個」不是同一件事，也不該共用一個數字。
      //
      // 兩條路可以走，選的是 (b)：
      //   (a) 一列事件一個 w:0 的專屬型別 —— 辦公帶（八個型別）與零售帶走的路。
      //   (b) 在乘客身上記下「是哪一列事件生的」，計數器掛在事件 id 上。
      // (b) 的理由是這幾列的差別**在時段與人數，不在人物的數值**：夕陽的人跟煙火的人
      // 是同一種觀景客，只是來的時間不一樣。為它們各開一個型別是拿**色彩空間**
      // （三條硬判準同時滿足的點只剩 476/262,144）去換一個計數器。
      // 唯一有既有型別表達不了的數值的那一列（`student`，全表最低票價）仍然是型別，
      // 而且它 w:0、只有 `schooltrip` 指得到它，所以 `codex.student` 本來就是乾淨的。
      //
      // ⚠ **鍵一定要寫成字面的 `st.codex.xxx`**：驗收第 11 組靜態掃這支檔案的
      //   `codex.xxx` 來決定「成就讀的鍵有沒有人寫得進去」，`st.codex['ev_'+id]`
      //   算出來的鍵它看不到，於是那一整類安靜的錯又變回安靜的。
      // ⚠ **`summon` 招來的同伴拿不到 `evId`**，跟它們拿不到 `ev.panic` 是同一個洞：
      //   `summonCompanions()` 跟 `makeMate()` 一樣在 `makePassenger()` **裡面**跑，
      //   而這三個欄位是 `runEvent()` 在它**回傳之後**才蓋的。今天沒有任何一列事件
      //   指向會招同伴的型別（唯一一個是 `deckguide`，它靠 w:3 自然生成），所以這個
      //   洞今天量不出來。**哪天有一列事件寫 `type:'deckguide'`，這裡跟 panic 兩邊
      //   都要補。** 已回報 orchestrator。
      if (p.evId){
        if (p.evId === 'tour')        st.codex.tourUp      = (st.codex.tourUp      || 0) + 1;
        if (p.evId === 'sunset')      st.codex.sunsetUp    = (st.codex.sunsetUp    || 0) + 1;
        if (p.evId === 'deckclose')   st.codex.deckDown    = (st.codex.deckDown    || 0) + 1;
        if (p.evId === 'proposal')    st.codex.proposalUp  = (st.codex.proposalUp  || 0) + 1;
        if (p.evId === 'sunrisecrew') st.codex.sunriseUp   = (st.codex.sunriseUp   || 0) + 1;
        if (p.evId === 'fireworks')   st.codex.fireworksUp = (st.codex.fireworksUp || 0) + 1;
        if (p.evId === 'vertigo')     st.codex.vertigoDown = (st.codex.vertigoDown || 0) + 1;
        if (p.evId === 'droneshow')   st.codex.droneHop    = (st.codex.droneHop    || 0) + 1;
        // 屋頂帶（#120–#134）。同一個理由：五個型別的 codex 鍵各自被一條「人物」的
        // 成就佔著，事件那十條要自己的計數器。字面 `st.codex.xxx`，第 11 組靜態掃得到。
        if (p.evId === 'launchwindow') st.codex.launchUp    = (st.codex.launchUp    || 0) + 1;
        if (p.evId === 'cablecheck')  st.codex.cableUp     = (st.codex.cableUp     || 0) + 1;
        if (p.evId === 'satellite')   st.codex.satelliteUp = (st.codex.satelliteUp || 0) + 1;
        if (p.evId === 'vipview')     st.codex.vipUp       = (st.codex.vipUp       || 0) + 1;
        if (p.evId === 'stormwarn')   st.codex.stormDown   = (st.codex.stormDown   || 0) + 1;
        if (p.evId === 'boarding')    st.codex.boardingUp  = (st.codex.boardingUp  || 0) + 1;
        if (p.evId === 'presscon')    st.codex.pressUp     = (st.codex.pressUp     || 0) + 1;
        if (p.evId === 'liftoff')     st.codex.liftoffUp   = (st.codex.liftoffUp   || 0) + 1;
      }
      // 倒數計時（#128）那一條成就數的**不是「你遇到過幾次倒數」**，是「倒數期間你
      // 送了幾個人」——那才是玩家為了那個乘數多跑的幾趟。讀的是收錢那一刻的時鐘，
      // 跟 `fareOf()` 用同一個判斷（`fareBoostMult` > 1）。
      if (fareBoostMult(st, sim) > 1) st.codex.boostRides = (st.codex.boostRides || 0) + 1;
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
        if (blockFloor(st, sim, ff, p.blockArm.secs, p.blockArm.ev && p.blockArm.ev.id))
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
      // 限時獎金的評價那一半，跟 `tip.rating` 完全平行：**純資料驅動**，
      // 任何一列寫了 `bonus.rating` 就有，沒寫的一個位元組都沒變。
      // 計數器帶著型別、而且是字面值 —— 跟 `intervieweeOnTime` 同一個形狀，
      // 理由也逐字相同（第 11 組靜態掃這支檔案的 `codex.xxx`，算出來的鍵它看不到）。
      // `codex.runner`（#116 那條成就）數的是**送到幾個**，這一個數的是**趕上倒數幾次**。
      // **下一個寫 `bonus.rating` 的人物要在這裡多一行。**
      if (inTime && p.t.bonus.rating){
        st.rating += p.t.bonus.rating;
        if (p.type === 'runner')
          st.codex.runnerOnTime = (st.codex.runnerOnTime || 0) + 1;
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
  // 包場（#117）。整個機制在上車這一段，兩條規則：
  //   1. **車上已經有包場的乘客 → 這一趟誰都不能再上。** `sealed` 在下客之後才算，
  //      所以「貨箱下車了」的那一次開門會照常收人。
  //   2. **包場的乘客只上空車。** 車上還有別人就跳過他，他繼續等下一台空的。
  // 沒有任何一列資料寫 `exclusive` 的時候 `sealed` 恆為 false，這一段等於不存在。
  //
  let sealed = isSealed(s);
  for (const ff of boardFloors){
    if (sealed) break;
    for (let i = 0; i < sim.waiting.length; i++){
      if (sealed) break;
      const p = sim.waiting[i];
      if (p.origin !== ff) continue;
      // 規則 2。**用 riders.length 不是 used()**：一個 size 0 的幽靈也算「車上有人」，
      // 而「包場」講的是誰都不能一起搭，不是還剩幾格。
      if (isExcl(p) && s.riders.length) continue;
      // 必須同車（#63）：兩個人要嘛一起上，要嘛都不上。**位子要一次留兩份**——
      // 這一行就是這個機制的全部成本，也是它唯一會失敗的地方。
      let mate = (p.mate && p.mate.mate === p) ? p.mate : null;
      // 另一半已經不在等了 → 這個人退回一個普通乘客，不要變成一個永遠訂著
      // 四格、永遠上不了車的殭屍。今天走不到這一行（兩個人的耐性逐字相同，
      // 一定同一個 tick 一起放棄），但**只要有人給一列 pair 的資料加上事件的
      // panic，兩邊的耐性就會分岔**——runEvent 的 `p.left = p.patience * ev.panic`
      // 只改得到第一個人。留這一行比留一句「不會發生」便宜。
      if (mate && sim.waiting.indexOf(mate) < 0) mate = null;
      const need = p.t.size + (mate ? mate.t.size : 0);
      if (used() + need > cap) continue;
      // 目的地控制：只收同方向的人，停靠次數大減。成對的兩個人 origin/dest 逐字
      // 相同，所以判一次等於判兩次。
      if (st.auto.dest && s.riders.length && used() >= cap * 0.5){
        const dir = Math.sign(s.riders[0].dest - ff);
        if (dir !== 0 && Math.sign(p.dest - ff) !== dir) continue;
      }
      p.board = st.t;
      s.riders.push(p); sim.waiting.splice(i, 1); i--;
      boarded++;
      if (isExcl(p)) sealed = true;    // 規則 1 從這一刻起生效（兩層轎廂的第二層也擋掉）
      if (p.t.doorPenalty) extra += p.t.doorPenalty;
      if (mate){
        // 另一半一定跟他同一層（同 origin）而且還在等（同 patience → 同一個 tick
        // 才會放棄）。indexOf 是為了不假設他排在誰後面：招來同伴、封鎖清除都會
        // 動到 sim.waiting 的順序。
        const j = sim.waiting.indexOf(mate);
        if (j >= 0){
          mate.board = st.t;
          s.riders.push(mate); sim.waiting.splice(j, 1);
          if (j <= i) i--;
          boarded++;
          if (mate.t.doorPenalty) extra += mate.t.doorPenalty;
        }
      }
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
      // **一列事件一個計數器**，理由寫在 blockFloor 的 evId 那一段：`waxClean` 這個名字
      // 已經被 `waxdry` 那條成就的文案綁死成「打蠟」，共用它等於讓文案開始說謊。
      if (!w.clean) continue;
      if (w.ev === 'fog') st.codex.fogClear = (st.codex.fogClear || 0) + 1;
      else                st.codex.waxClean = (st.codex.waxClean || 0) + 1;
    }
  }

  // #111 結算停機觀察單。**跟 blockWatch 一樣放在耐性迴圈之後**，理由逐字相同：
  // 解除停機的那一格 tick 裡，因為停機而耗盡耐性的人是在這一輪才被結算掉的，
  // 先結案就會把最後那一秒的流失算成「撐過去了」。
  // 比的是 st.stats.abandoned 的**前後差**，不是某一層——突波停的是所有車，
  // 所以整棟樓的任何一個放棄都算數。
  if (sim.stallWatch && sim.stallWatch.until <= st.t){
    if (st.stats.abandoned === sim.stallWatch.abandoned)
      st.codex.surgeRide = (st.codex.surgeRide || 0) + 1;
    sim.stallWatch = null;
  }

  // #114 暫時的評價加值到期：扣回同樣的 amt。下面的夾限那一行會處理超出範圍的情況
  // ——所以「加之前是 4.9」的那一次扣完會是 4.65，這個失真寫在 content.js 的欄位說明。
  if (sim.ratingLift && sim.ratingLift.until <= st.t){
    st.rating -= sim.ratingLift.amt;
    sim.ratingLift = null;
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
