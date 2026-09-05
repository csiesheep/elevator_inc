// _probe/probe.js — BE peer 自己的證偽探針（不是 tests/，不會進交付）。
// 每一條都是「會咬人的案例」，而且都設計成在修好之前是紅的。
import * as C0 from '../js/content.js';
import * as M from '../js/sim.js';
import * as S from '../js/state.js';
import { setLang } from '../js/i18n.js';

// sim.lastEvent 只留翻譯後的字串，而英文對照表兩列 party 共用同一個 id、
// 因此兩列都顯示成 "Party ends"——在英文語系下用名字分不出來。釘成中文再量。
setLang('zh');

const C = C0.CONFIG, BANDS = C0.BANDS, EVENTS = C0.EVENTS,
      PASSENGERS = C0.PASSENGERS, TENANTS = C0.TENANTS;

const rows = [];
const add = (id, label, ok, msg) => rows.push({ id, label, ok: !!ok, msg });
const T = (id, label, fn) => {
  try { const r = fn(); add(id, label, r.ok, r.msg); }
  catch (e){ add(id, label, false, 'EXCEPTION: ' + ((e && e.message) || e)); }
};

// 把 h 釘在指定小時（hourOf = ((t % DAY)/DAY)*24）
const tAt = h => (h / 24) * C.DAY_SECONDS;

function tower(floors){
  const st = S.newGame(); st.floors = floors;
  const sim = M.createSim(st); M.syncShafts(st, sim);
  return { st, sim };
}

// 逐步驅動 spawn()：每一步都把時鐘釘回去、把 spawnT 打成負的、清掉排隊的人，
// 並且把 eventT 歸零（不讓隨機事件汙染型別分布）。
function driveSpawns(st, sim, hour, iters){
  const out = [];
  for (let i = 0; i < iters; i++){
    st.t = tAt(hour); sim.spawnT = -0.001; sim.eventT = 0;
    sim.waiting.length = 0;
    M.step(st, sim, 1 / 20);
    for (const p of sim.waiting) out.push({ origin: p.origin, dest: p.dest, type: p.type });
  }
  return out;
}

// 強制檢查隨機事件：eventT 頂到門檻，跑 n 次，收集 lastEvent
function forceRandomEvents(st, sim, hour, checks){
  const seen = [];
  for (let i = 0; i < checks; i++){
    st.t = tAt(hour); sim.eventT = C.EVENT_EVERY; sim.spawnT = 999;
    sim.lastEvent = null; sim.waiting.length = 0;
    M.step(st, sim, 1 / 20);
    if (sim.lastEvent) seen.push({ name: sim.lastEvent.name,
                                   people: sim.waiting.map(p => ({ o:p.origin, type:p.type,
                                     ratio: p.patience / (p.t.patience * (1 + Math.max(p.origin,p.dest)/45)) })) });
  }
  return seen;
}

// ---- 快照 / 還原（探針會改 module 級的資料，跑完要放回去）
function snapEvents(){ return EVENTS.map(e => ({ ...e })); }
function restoreEvents(s){ EVENTS.length = 0; for (const e of s) EVENTS.push(e); }
function snapBands(){ return BANDS.map(b => b.pop); }
function restoreBands(s){ BANDS.forEach((b, i) => b.pop = s[i]); }
function snapTenants(){ return TENANTS.map(t => ({ ...t })); }
function restoreTenants(s){ TENANTS.length = 0; for (const t of s) TENANTS.push(t); }

// xorshift32：把 Math.random 釘死，讓「改之前 / 改之後」跑同一條亂數序列。
function seeded(seed){
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function fnv(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export async function run(){

  // ================================================================ 不可退步（最硬的一條）
  // 統計式的比對有 2–3 個標準差的散布，分不出「沒退步」與「退步一點點」。
  // 這條把 Math.random 釘死，用**同一條亂數序列**跑同一個情境：pickFloor / pickType /
  // fireEvent 的重構如果對既有資料是逐字等價的，兩個 build 的輸出必須**完全相同**。
  // （抽樣次數與順序都沒變，所以這是可以要求的；不同就是真的動到行為。）
  T('det-ab', '決定性 A/B：釘住亂數序列，既有資料的輸出逐字相同', () => {
    const origRandom = Math.random;
    try {
      Math.random = seeded(0x5eed1234);
      const st = S.newGame(); st.floors = 60;
      const sim = M.createSim(st); M.syncShafts(st, sim);
      const log = [];
      for (let i = 0; i < 3000; i++){
        st.t = (i / 3000) * C.DAY_SECONDS * C.WEEK_DAYS;   // 掃過一整週（平日＋週末、0–24 點）
        sim.spawnT = -0.001;
        if (i % 40 === 0) sim.eventT = C.EVENT_EVERY;       // 定期強制檢查隨機事件
        const before = sim.waiting.length;
        sim.lastEvent = null;
        M.step(st, sim, 1 / 20);
        for (let k = before; k < sim.waiting.length; k++){
          const p = sim.waiting[k];
          log.push(p.origin + '>' + p.dest + ':' + p.type + (p.fromEvent ? '!' + p.left.toFixed(3) : ''));
        }
        if (sim.lastEvent) log.push('EV=' + sim.lastEvent.name + '@' + sim.lastEvent.floor + 'x' + sim.lastEvent.n);
        if (sim.waiting.length > 140) sim.waiting.length = 0;
      }
      const s = log.join('|');
      return { ok: log.length > 2000,
        msg: `樣本 ${log.length} 筆，指紋 ${fnv(s)}，長度 ${s.length}，開頭 ${s.slice(0, 90)}` };
    } finally { Math.random = origRandom; }
  });

  // ================================================================ #8
  // 會咬人的案例：範圍**非空**、但權重**全為 0**。
  // 把每一帶的 pop 打成 0 → floorWeight 合法地回傳 0 → pickFloor 的 total = 0。
  T('#8-behav', 'pickFloor：範圍非空、權重全為 0（端對端）', () => {
    const bs = snapBands();
    try {
      for (const b of BANDS) b.pop = 0;
      const { st, sim } = tower(40);
      const ps = driveSpawns(st, sim, 12, 900);
      if (!(ps.length > 50)) return { ok:false, msg:`母體太小（${ps.length} 個乘客），這條沒有試到東西` };
      const floors = new Set(); for (const p of ps){ floors.add(p.origin); floors.add(p.dest); }
      const hi = [...floors].filter(f => f > 2).length;
      return { ok: floors.size >= 10 && hi >= 5,
        msg: `${ps.length} 個乘客、權重全為 0，只碰到 ${floors.size} 個相異樓層`
           + `（>2 樓的有 ${hi} 個）：${[...floors].sort((a,b)=>a-b).slice(0,14).join(',')}`
           + ` — 權重全為 0 時應該是「均勻抽樣」，不是塌成範圍最低的那一層` };
    } finally { restoreBands(bs); }
  });

  T('#8-unit', 'pickIndex：全 0 權重要均勻，不是永遠回傳第 0 項', () => {
    if (typeof M.pickIndex !== 'function')
      return { ok:false, msg:'sim.js 沒有匯出 pickIndex——三處加權抽樣還是各寫各的，沒有共用的零總和防護' };
    const N = 8, hits = new Array(N).fill(0);
    for (let i = 0; i < 4000; i++) hits[M.pickIndex(new Array(N).fill(0))]++;
    const min = Math.min(...hits);
    return { ok: min > 4000 / N * 0.6,
      msg: `全 0 權重抽 4000 次的落點分布 [${hits.join(',')}]，最少的一格 ${min}（期望 ${4000/N}）` };
  });

  T('#8-nonreg', 'pickIndex：正權重時仍照權重（不可退步）', () => {
    if (typeof M.pickIndex !== 'function') return { ok:false, msg:'pickIndex 不存在' };
    const hits = [0,0,0];
    for (let i = 0; i < 6000; i++) hits[M.pickIndex([1, 0, 9])]++;
    return { ok: hits[1] === 0 && hits[2] > hits[0] * 4,
      msg: `權重 [1,0,9] 抽 6000 次 → [${hits.join(',')}]（第 1 格權重 0，必須是 0 次）` };
  });

  // ================================================================ hours 跨午夜
  // 會咬人的案例：hours=[23,4]、取樣 h=1（在窗內、但小於 hours[0]）
  T('hours-1', 'hours=[23,4] 在 h=1 要進得了隨機池', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'meeting', name:'X-CROSS', w:100, n:[8,8], at:'office', to:'lobby',
                    hours:[23,4], text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 1, 60);
      return { ok: seen.length > 0,
        msg: `h=1、唯一的事件 hours=[23,4]，強制檢查 60 次，觸發 ${seen.length} 次`
           + `（現在的條件 h<hours[0]||h>=hours[1] 在 h=1 兩邊都成立 → 永遠排除）` };
    } finally { restoreEvents(es); }
  });

  T('hours-2', 'hours=[0,4]（不跨午夜）在 h=1 仍要進得了——存活對照', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'meeting', name:'X-PLAIN', w:100, n:[8,8], at:'office', to:'lobby',
                    hours:[0,4], text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 1, 60);
      return { ok: seen.length > 0,
        msg: `h=1、hours=[0,4]，強制檢查 60 次，觸發 ${seen.length} 次（這條本來就該綠；`
           + `它紅代表儀器本身壞了，上面那條的紅不算數）` };
    } finally { restoreEvents(es); }
  });

  T('hours-3', 'hours=[23,4] 在 h=5（窗外）不可以觸發——擋掉「一律為真」的錯解', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'meeting', name:'X-CROSS', w:100, n:[8,8], at:'office', to:'lobby',
                    hours:[23,4], text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 5, 60);
      return { ok: seen.length === 0,
        msg: `h=5（在 [23,4] 之外），強制檢查 60 次，卻觸發 ${seen.length} 次` };
    } finally { restoreEvents(es); }
  });

  T('hours-4', 'hours=[23,4] 在 h=23.5 要觸發——窗的另一半', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'meeting', name:'X-CROSS', w:100, n:[8,8], at:'office', to:'lobby',
                    hours:[23,4], text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 23.5, 60);
      return { ok: seen.length > 0, msg: `h=23.5，強制檢查 60 次，觸發 ${seen.length} 次` };
    } finally { restoreEvents(es); }
  });

  T('hours-5', '既有 15 列的 hours 判定一個字都不變（回歸）', () => {
    // 舊條件逐字抄下來，跟現行程式碼的實際結果對照（用 fireEvent 的可觸發性當觀測點）
    const es = snapEvents();
    try {
      const orig = es.filter(e => !e.byTenant);
      const bad = [];
      for (const e of orig){
        for (const h of [0,1,5,7.5,9,11,13,15.5,17,19,20.5,21,22,23,23.9]){
          const oldIn = !(h < e.hours[0] || h >= e.hours[1]);
          EVENTS.length = 0;
          EVENTS.push({ ...e, name:'REG', w:100, n:[8,8] });
          const { st, sim } = tower(100);
          const seen = forceRandomEvents(st, sim, h, 40);
          const nowIn = seen.length > 0;
          if (oldIn !== nowIn) bad.push(`${e.id}@h=${h}: 舊=${oldIn} 新=${nowIn}`);
        }
      }
      return { ok: bad.length === 0, msg: bad.length ? '行為變了：' + bad.join(' / ')
        : `${orig.length} 列 × 15 個取樣點，舊條件與現行行為完全一致` };
    } finally { restoreEvents(es); }
  });

  // ================================================================ 事件指定人物型別
  // 會咬人的案例：**大廳出發**的飯店事件要生出 guest（大廳屬 retail 帶，guest 是 hotel 帶）
  T('type-ctl', '存活對照：沒指定 type 時，大廳出發的事件拿得到 office', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'checkin', name:'CTL', w:100, n:[12,12], at:'lobby', to:'hotel',
                    hours:[0,24], text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 16, 40);
      const ppl = seen.flatMap(s => s.people).filter(p => p.o === 0);
      const kinds = {}; for (const p of ppl) kinds[p.type] = (kinds[p.type] || 0) + 1;
      return { ok: ppl.length > 100 && (kinds.office || 0) > 0 && !(kinds.guest > 0),
        msg: `${ppl.length} 個大廳出發的事件乘客，型別分布 ${JSON.stringify(kinds)}`
           + `（要有 office、而且不該有 guest——證明母體非空、而且今天確實生不出 guest）` };
    } finally { restoreEvents(es); }
  });

  T('type-1', 'type:\'guest\'：大廳出發的飯店事件要生出 guest', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'checkin', name:'TYPED', w:100, n:[12,12], at:'lobby', to:'hotel',
                    hours:[0,24], type:'guest', text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 16, 40);
      const ppl = seen.flatMap(s => s.people).filter(p => p.o === 0);
      const kinds = {}; for (const p of ppl) kinds[p.type] = (kinds[p.type] || 0) + 1;
      return { ok: ppl.length > 100 && kinds.guest === ppl.length,
        msg: `${ppl.length} 個大廳出發的事件乘客，型別分布 ${JSON.stringify(kinds)}`
           + `（指定 type:'guest' 之後應該全部是 guest）` };
    } finally { restoreEvents(es); }
  });

  T('type-2', 'types:{} 加權：兩種都要出得來，而且比例大致對得上', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'checkin', name:'TYPED2', w:100, n:[12,12], at:'lobby', to:'hotel',
                    hours:[0,24], types:{ guest:3, courier:1 }, text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 16, 40);
      const ppl = seen.flatMap(s => s.people).filter(p => p.o === 0);
      const k = {}; for (const p of ppl) k[p.type] = (k[p.type] || 0) + 1;
      const g = k.guest || 0, c = k.courier || 0;
      const ratio = c ? g / c : Infinity;
      return { ok: ppl.length > 100 && g > 0 && c > 0 && ratio > 1.8 && ratio < 5.5 && g + c === ppl.length,
        msg: `${ppl.length} 個乘客，分布 ${JSON.stringify(k)}，guest/courier = ${ratio.toFixed(2)}（期望 ~3）` };
    } finally { restoreEvents(es); }
  });

  T('type-3', '沒寫 type 的事件行為完全不變（不可退步）', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'checkout', name:'NOTYPE', w:100, n:[12,12], at:'hotel', to:'lobby',
                    hours:[0,24], text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 9, 40);
      const ppl = seen.flatMap(s => s.people);
      const k = {}; for (const p of ppl) k[p.type] = (k[p.type] || 0) + 1;
      // 飯店帶出發 → 池子是 any + hotel，guest 一定在裡面、scientist 一定不在
      return { ok: ppl.length > 100 && (k.guest || 0) > 0 && !(k.scientist > 0) && !(k.resident > 0),
        msg: `${ppl.length} 個飯店層出發的事件乘客，分布 ${JSON.stringify(k)}`
           + `（要有 guest、不該有 scientist/resident——沒指定 type 就照出發樓層的帶）` };
    } finally { restoreEvents(es); }
  });

  T('type-4', 'type 指到不存在的 id → 退回樓層帶，不是生不出人', () => {
    const es = snapEvents();
    try {
      EVENTS.length = 0;
      EVENTS.push({ id:'checkin', name:'BADTYPE', w:100, n:[12,12], at:'lobby', to:'hotel',
                    hours:[0,24], type:'no_such_passenger', text:'x' });
      const { st, sim } = tower(30);
      const seen = forceRandomEvents(st, sim, 16, 40);
      const ppl = seen.flatMap(s => s.people).filter(p => p.o === 0);
      return { ok: ppl.length > 100, msg: `打錯的 type 之後仍生出 ${ppl.length} 個乘客（不可以歸零）` };
    } finally { restoreEvents(es); }
  });

  // ================================================================ PASSENGERS 時段欄位
  const shareOf = (st, sim, hour, id, iters) => {
    const ps = driveSpawns(st, sim, hour, iters);
    const hit = ps.filter(p => p.type === id).length;
    return { n: ps.length, hit, share: ps.length ? hit / ps.length : 0 };
  };

  // 存活對照。前兩版都用「占比」比對，容差怎麼訂都不對：占比本來就有 2–3 個標準差
  // 的散布（office 的 rushMult 隨小時變、mood 隨機遊走、rating 會漂），一次紅一次綠。
  // 改成釘住亂數序列做**逐字相等**：窗外的窗如果真的不生效，權重一模一樣、
  // 抽樣次數一模一樣，輸出就必須完全相同。零容差，而且不會偶爾紅。
  const exactPeakProbe = (hour, offWin, onWin) => {
    const p = PASSENGERS.find(x => x.id === 'courier');
    const old = p.peaks, origRandom = Math.random;
    const sample = () => {
      Math.random = seeded(0xC0FFEE01);
      const st = S.newGame(); st.floors = 45;
      const sim = M.createSim(st); M.syncShafts(st, sim);
      const out = [];
      for (let i = 0; i < 700; i++){
        st.t = tAt(hour); sim.spawnT = -0.001; sim.eventT = 0; sim.waiting.length = 0;
        M.step(st, sim, 1 / 20);
        for (const q of sim.waiting) out.push(q.origin + '>' + q.dest + ':' + q.type);
      }
      return out;
    };
    try {
      delete p.peaks;                       const none = sample();
      p.peaks = [{ hours: offWin, mult:40 }]; const off = sample();
      p.peaks = [{ hours: onWin,  mult:40 }]; const on  = sample();
      const j = a => a.join('|');
      return { ok: none.length > 400 && j(off) === j(none) && j(on) !== j(none),
        msg: `h=${hour}、n=${none.length}：沒窗 ${fnv(j(none))}、`
           + `窗外 [${offWin}]×40 ${fnv(j(off))}（必須相同）、`
           + `窗內 [${onWin}]×40 ${fnv(j(on))}（必須不同——證明這個量測看得見差別）` };
    } finally { Math.random = origRandom; if (old === undefined) delete p.peaks; else p.peaks = old; }
  };

  T('peak-ctl', '存活對照：h=1 掛一個窗外的窗 → 輸出逐字相同（跨午夜的窗當窗內）',
    () => exactPeakProbe(1, [8,12], [0,4]));

  // 純報數字（永遠綠）：拿去跟 baseline 逐個對，證明既有行為沒有退步。
  T('peak-reg', '回歸讀數：沒有 peaks 的人物在各時段的占比（拿去對 baseline）', () => {
    const { st, sim } = tower(45);
    const out = {};
    for (const h of [1, 9, 12, 18, 23]){
      const r = shareOf(st, sim, h, 'courier', 1200);
      out['h' + h] = { n: r.n, courier: +(r.share * 100).toFixed(2) };
    }
    const { st: s2, sim: m2 } = tower(45);
    for (const h of [1, 9, 12, 18, 23]){
      const r = shareOf(s2, m2, h, 'office', 1200);
      out['h' + h].office = +(r.share * 100).toFixed(2);
    }
    return { ok: true, msg: JSON.stringify(out) };
  });

  T('peak-1', '跨午夜的窗 [23,4]：h=1 的占比要明顯高於 h=12', () => {
    const p = PASSENGERS.find(x => x.id === 'courier');
    const old = p.peaks;
    try {
      p.peaks = [{ hours:[23,4], mult:40 }];
      const { st, sim } = tower(30);
      const a = shareOf(st, sim, 1, 'courier', 700);
      const b = shareOf(st, sim, 12, 'courier', 700);
      return { ok: a.n > 300 && b.n > 300 && a.share > b.share * 3,
        msg: `courier peaks=[23,4]×40：h=1 ${(a.share*100).toFixed(1)}% (n=${a.n})、`
           + `h=12 ${(b.share*100).toFixed(1)}% (n=${b.n})——h=1 在窗內，占比必須衝上去` };
    } finally { if (old === undefined) delete p.peaks; else p.peaks = old; }
  });

  T('peak-2', '不跨午夜的窗 [0,4]：h=1 的占比也要衝上去', () => {
    const p = PASSENGERS.find(x => x.id === 'courier');
    const old = p.peaks;
    try {
      p.peaks = [{ hours:[0,4], mult:40 }];
      const { st, sim } = tower(30);
      const a = shareOf(st, sim, 1, 'courier', 700);
      const b = shareOf(st, sim, 12, 'courier', 700);
      return { ok: a.n > 300 && b.n > 300 && a.share > b.share * 3,
        msg: `courier peaks=[0,4]×40：h=1 ${(a.share*100).toFixed(1)}% (n=${a.n})、`
           + `h=12 ${(b.share*100).toFixed(1)}% (n=${b.n})` };
    } finally { if (old === undefined) delete p.peaks; else p.peaks = old; }
  });

  // 跨午夜的窗掛在窗外的小時上，一樣要完全不生效——擋掉「跨午夜寫成一律為真」的錯解。
  T('peak-3', '窗外不可以生效：h=12 掛跨午夜的 [23,4] → 輸出逐字相同',
    () => exactPeakProbe(12, [23,4], [8,16]));

  T('peak-4', 'guest 的 22–6 ×2.2 已經是資料，不是寫死的', () => {
    const g = PASSENGERS.find(x => x.id === 'guest');
    const has = g && Array.isArray(g.peaks) && g.peaks.length === 1
              && g.peaks[0].hours[0] === 22 && g.peaks[0].hours[1] === 6 && g.peaks[0].mult === 2.2;
    return { ok: has, msg: `PASSENGERS['guest'].peaks = ${JSON.stringify(g && g.peaks)}`
      + `（期望 [{hours:[22,6],mult:2.2}]——sim.js:103 那行要收進同一個機制）` };
  });

  T('peak-5', 'guest 的夜間倍率行為不可退步（h=23 vs h=12，飯店層出發）', () => {
    const { st, sim } = tower(45);
    const at = hour => {
      const ps = driveSpawns(st, sim, hour, 1400).filter(p => p.origin + 1 >= 21 && p.origin + 1 <= 45);
      const hit = ps.filter(p => p.type === 'guest').length;
      return { n: ps.length, share: ps.length ? hit / ps.length : 0 };
    };
    const night = at(23), noon = at(12);
    const ratio = noon.share ? night.share / noon.share : 0;
    return { ok: night.n > 200 && noon.n > 200 && ratio > 1.5 && ratio < 3.2,
      msg: `飯店層出發：h=23 guest 占 ${(night.share*100).toFixed(1)}% (n=${night.n})、`
         + `h=12 占 ${(noon.share*100).toFixed(1)}% (n=${noon.n})，比值 ${ratio.toFixed(2)}（×2.2 的基準）` };
  });

  // ================================================================ 重複的 id:'party'
  T('party-1', '兩列 id:\'party\' 都還在（不可以用刪一列解決）', () => {
    const all = EVENTS.filter(e => e.id === 'party');
    const names = all.map(e => e.name);
    return { ok: all.length === 2 && all.some(e => !e.byTenant) && all.some(e => e.byTenant && e.panic === 0.75),
      msg: `EVENTS 裡 id='party' 有 ${all.length} 列：${JSON.stringify(names)}` };
  });

  T('party-2', '拿得到「宴會散場」那一列（panic 0.75 只有它有）', () => {
    if (typeof C0.eventById !== 'function')
      return { ok:false, msg:'content.js 沒有匯出 eventById——查詢分不出兩列，'
        + `EVENTS.find(e=>e.id==='party') 拿到的是 ${JSON.stringify(EVENTS.find(e=>e.id==='party').name)}`
        + `，panic=${EVENTS.find(e=>e.id==='party').panic}` };
    const tenant = C0.eventById('party', { byTenant: true });
    const rand = C0.eventById('party', { byTenant: false });
    return { ok: tenant && tenant.panic === 0.75 && rand && !rand.byTenant && rand.panic === undefined,
      msg: `byTenant → ${JSON.stringify(tenant && tenant.name)} panic=${tenant && tenant.panic}；`
         + `隨機池 → ${JSON.stringify(rand && rand.name)} panic=${rand && rand.panic}` };
  });

  T('party-3', '租戶路徑真的打到「宴會散場」（panic 0.75 生效，端對端）', () => {
    const ts = snapTenants();
    try {
      // 探針側把 hotel 的 plain 租戶接上 party（產品的接線由 #1–#7 決定，這裡只是量測）
      const room = TENANTS.find(t => t.id === 'room');
      room.event = 'party'; room.every = [180, 260];
      const { st, sim } = tower(45);
      const found = [];
      for (let i = 0; i < 40 && found.length < 1; i++){
        st.t = tAt(3); sim.spawnT = 999; sim.eventT = 0;
        sim.waiting.length = 0; sim.lastEvent = null;
        sim.tenantT = { 'hotel:room': 0.0001 };
        M.step(st, sim, 1 / 20);
        if (sim.lastEvent){
          const ratios = sim.waiting.map(p =>
            p.patience / (p.t.patience * (1 + Math.max(p.origin, p.dest) / 45)));
          found.push({ name: sim.lastEvent.name, n: sim.waiting.length,
                       ratio: ratios.length ? ratios[0] : null });
        }
      }
      const f = found[0];
      return { ok: !!f && f.name === '宴會散場' && Math.abs(f.ratio - 0.75) < 1e-6,
        msg: f ? `租戶事件觸發：${f.name}，${f.n} 人，耐性倍率 ${f.ratio}（期望 宴會散場 / 0.75）`
               : '租戶事件一次也沒有觸發，這條沒有試到東西' };
    } finally { restoreTenants(ts); }
  });

  T('party-4', '「尾牙散場」仍在隨機池裡（h=21 打得到）', () => {
    const es = snapEvents();
    try {
      const keep = es.filter(e => e.id === 'party' && !e.byTenant);
      EVENTS.length = 0; for (const e of keep) EVENTS.push({ ...e, w:100, n:[8,8] });
      const { st, sim } = tower(60);
      const seen = forceRandomEvents(st, sim, 21, 60);
      return { ok: seen.length > 0 && seen[0].name === '尾牙散場',
        msg: `h=21 強制檢查 60 次，觸發 ${seen.length} 次，第一次是 ${JSON.stringify(seen[0] && seen[0].name)}` };
    } finally { restoreEvents(es); }
  });

  T('party-5', '隨機池不會誤收 byTenant 的那一列（h=21 也不行）', () => {
    const es = snapEvents();
    try {
      const keep = es.filter(e => e.id === 'party' && e.byTenant);
      EVENTS.length = 0; for (const e of keep) EVENTS.push({ ...e, w:100, n:[8,8] });
      const { st, sim } = tower(60);
      const seen = forceRandomEvents(st, sim, 21, 60);
      return { ok: seen.length === 0,
        msg: `池子裡只剩 byTenant 的「宴會散場」，強制檢查 60 次卻觸發 ${seen.length} 次` };
    } finally { restoreEvents(es); }
  });

  return rows;
}
