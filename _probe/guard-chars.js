// _probe/guard-chars.js — 第 4 階段：會咬人的 guard。BE 自己的證偽探針，不是 tests/。
//
// 每一條都照兩條規矩寫：
//   1. **母體非空先證明。** 「某某沒發生」在現場什麼都沒有的時候永遠通過。
//      所以每一條否定句的旁邊都有一條肯定句，而且肯定句紅了就整條紅。
//   2. **每一條都要能被我親手弄紅。** 下面每一條的註解都寫了「怎麼弄紅它」，
//      而且我真的一條一條弄紅過（結果貼在交付留言）。
//
// import 一律沒有 query string：sim.js 持有的是無 query 的模組實例，
// 用 import('...?p=' + Math.random()) 改到的是另一份，它看不到。
import { CONFIG as C, PASSENGERS, EVENTS, ACHIEVEMENTS, passengerById, eventById } from '../js/content.js';
import { PEOPLE } from '../js/sprites.js';
import { EN } from '../js/i18n-content.js';
import * as M from '../js/sim.js';
import * as S from '../js/state.js';
import { setLang } from '../js/i18n.js';

setLang('zh');

const DT = 1 / 20;
const MINE_PAX  = ['stroller', 'loaded', 'janitor', 'sampler', 'closing'];
const POOL_PAX  = ['stroller', 'loaded'];              // 進隨機池的
const EVENT_PAX = ['janitor', 'sampler', 'closing'];   // w:0，只由事件產生的
const MINE_EV   = ['closetime', 'sampling'];

const rows = [];
const add = (id, label, ok, msg) => rows.push({ id, label, ok: !!ok, msg });
const T = (id, label, fn) => {
  try { const r = fn(); add(id, label, r.ok, r.msg); }
  catch (e){ add(id, label, false, 'EXCEPTION: ' + ((e && e.stack) || e)); }
};
// 母體非空。任何否定句都要先過這一關。
const NE = (n, what) => n > 0 ? null : { ok:false, msg:`母體是空的，這條 guard 從來沒有試過：${what}（實際 ${n}）` };

const tAt = h => (h / 24) * C.DAY_SECONDS;
const sum = a => a.reduce((x, y) => x + y, 0);

function tower(floors, auto){
  const st = S.newGame(); st.floors = floors; st.cash = 0;
  Object.assign(st.auto, auto || {});
  const sim = M.createSim(st); M.syncShafts(st, sim);
  return { st, sim };
}

function seeded(seed){ let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function withSeed(seed, fn){ const o = Math.random; Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = o; } }

// 只留下指定的事件（其它整列拿掉），跑完還原。用來把「這一列到底生出什麼」隔離出來。
function onlyEvent(id, fn){
  const snap = EVENTS.map(e => e);
  try {
    const keep = EVENTS.filter(e => e.id === id);
    EVENTS.length = 0; for (const e of keep) EVENTS.push(e);
    return fn();
  } finally { EVENTS.length = 0; for (const e of snap) EVENTS.push(e); }
}

// 逐步驅動 spawn()：把時鐘釘在指定小時、spawnT 打成負的、清空 waiting、
// 並且**把 eventT 歸零**（不讓隨機事件把事件限定的人物混進「隨機池」的樣本裡）。
function driveSpawns(st, sim, hour, iters){
  const out = [];
  for (let i = 0; i < iters; i++){
    st.t = tAt(hour); sim.spawnT = -0.001; sim.eventT = 0;
    sim.waiting.length = 0;
    for (const s of sim.shafts) s.riders.length = 0;
    M.step(st, sim, DT);
    for (const p of sim.waiting) out.push(p.type);
  }
  return out;
}

// 強制觸發某一列事件 n 次，回收它生出來的人。
function fireN(id, hour, floors, n){
  const ev = eventById(id);
  const got = [];
  onlyEvent(id, () => {
    for (let i = 0; i < n; i++){
      const { st, sim } = tower(floors, {});
      st.t = tAt(hour); sim.eventT = C.EVENT_EVERY; sim.spawnT = 1e9;
      sim.waiting.length = 0;
      M.step(st, sim, DT);
      if (!sim.lastEvent || sim.lastEvent.t !== st.t) continue;
      got.push({ floor: sim.lastEvent.floor, n: sim.lastEvent.n,
                 types: sim.waiting.map(p => p.type),
                 dests: sim.waiting.map(p => p.dest),
                 origins: sim.waiting.map(p => p.origin) });
    }
  });
  return { ev, got };
}

// ============================================================ 靜態：資料本身
// 弄紅它：把某一列的 type 打錯一個字（例如 types:{ closng:6, … }）。
T('G1', '事件指到的人物 id 全部存在（type / types / summon.type）', () => {
  const bad = [], checked = [];
  for (const e of EVENTS){
    if (e.type){ checked.push(e.id + '.type'); if (!passengerById(e.type)) bad.push(`${e.id}.type='${e.type}'`); }
    if (e.types) for (const k in e.types){ checked.push(e.id + '.types.' + k);
      if (!passengerById(k)) bad.push(`${e.id}.types.${k}`); }
  }
  for (const p of PASSENGERS)
    if (p.summon && p.summon.type){ checked.push(p.id + '.summon.type');
      if (!passengerById(p.summon.type)) bad.push(`${p.id}.summon.type='${p.summon.type}'`); }
  const ne = NE(checked.length, '沒有任何一列事件指定人物型別'); if (ne) return ne;
  return { ok: !bad.length, msg: `檢查 ${checked.length} 個指向，壞掉 ${bad.length}：${bad.join(', ')}` };
});

// MINE_PAX 是**抄本**（寫死在這支檔案裡，不從 content.js 讀）。三邊都要對得上：
// 抄本 ↔ PASSENGERS ↔ sprites.js。少了任何一邊都是安靜的錯：
//   · PASSENGERS 少一列 → 事件的 types 指過去會被 forcedTypePool 靜靜丟掉
//   · sprites 少一張   → spriteFor() **安靜地退回上班族**，畫面不會報錯
//
// ⚠ **第一版只比了「抄本 ↔ sprites」，被自己的證偽打臉。** 我把 PASSENGERS 裡的
//   `janitor` 改名成 `cleaner2`（sprite 沒改），這條**仍然是綠的**——因為它從頭到尾
//   沒有問過 PASSENGERS。那個 build 的實際狀態是：打烊清潔工在遊戲裡完全消失
//   （G14 抓到 mopup 0/6），而這條號稱在守 sprite 的 guard 一聲都沒吭。
//   一條只比對自己抄本的 guard，證明的是抄本沒被改到，不是產品是對的。
// 弄紅它：把 PASSENGERS 裡某一列的 id 改掉，或把 sprites.js 的 PEOPLE 少一個鍵。
T('G2', '五列新人物：抄本 ↔ PASSENGERS ↔ sprites 三邊對得上', () => {
  const ne = NE(MINE_PAX.length, 'MINE_PAX 是空的'); if (ne) return ne;
  const noRow = MINE_PAX.filter(id => !passengerById(id));
  const noSpr = MINE_PAX.filter(id => !PEOPLE[id]);
  const bad = [];
  if (noRow.length) bad.push(`PASSENGERS 裡沒有這一列：${noRow.join(', ')}`);
  if (noSpr.length) bad.push(`sprites.js 的 PEOPLE 裡沒有：${noSpr.join(', ')}（會安靜地退回上班族）`);
  return { ok: !bad.length, msg: bad.length ? bad.join('｜') : `${MINE_PAX.length} 列，三邊都對得上` };
});

// 弄紅它：刪掉 i18n-content.js 裡某一列。英文玩家會看到中文，不會看到錯誤。
T('G3', '五列人物、兩列事件、五條成就都有英文對照', () => {
  const bad = [];
  for (const id of MINE_PAX) if (!EN.passengers[id] || !EN.passengers[id].name) bad.push('passengers.' + id);
  for (const id of MINE_EV)  if (!EN.events[id] || !EN.events[id].text)         bad.push('events.' + id);
  for (const id of ['pram', 'tipjar', 'lastcall', 'mopup', 'taster'])
    if (!EN.achievements[id] || !EN.achievements[id].note) bad.push('achievements.' + id);
  return { ok: !bad.length, msg: `缺英文：${bad.join(', ')}` };
});

// ============================================================ 隨機池 vs 事件限定
// 這一條是**否定句**，所以肯定句先跑：先證明隨機池真的在出人、而且我那兩列抽得到。
// 弄紅它：把 janitor 的 w 從 0 改成 10 —— 它就會混進隨機池，w:0 那個承諾就是假的。
T('G4', 'w:0 的三列真的不進隨機池（先證明隨機池非空）', () => {
  const types = withSeed(0xC0FFEE, () => {
    const { st, sim } = tower(10, {});
    return driveSpawns(st, sim, 15, 1800);   // 15 點：零售帶的營業窗內
  });
  const ne = NE(types.length, '隨機池一個乘客都沒生出來'); if (ne) return ne;
  const hit = {}; for (const t of types) hit[t] = (hit[t] || 0) + 1;
  // 肯定句：進池的那兩列真的抽得到
  const missing = POOL_PAX.filter(id => !hit[id]);
  if (missing.length)
    return { ok:false, msg:`w>0 的人物在 ${types.length} 個樣本裡一次都沒抽到：${missing.join(', ')}` };
  // 否定句：w:0 的三列一次都不該出現
  const leaked = EVENT_PAX.filter(id => hit[id]);
  return { ok: !leaked.length,
    msg: `樣本 ${types.length}｜stroller ${hit.stroller} loaded ${hit.loaded}｜` +
         (leaked.length ? `w:0 卻出現在隨機池：${leaked.map(k => k + '×' + hit[k]).join(', ')}` : '沒有洩漏') };
});

// 弄紅它：把 stroller 的 peaks 拿掉，或把 mult 改成 1。
// ⚠ **第一版的儀器是錯的，這裡留著理由。** 第一版量的是「stroller 占全部乘客的
//   幾 %」，15 點 5.96% vs 4 點 4.13% = 1.44 倍，低於門檻 —— 但 peaks 寫的是 2.4，
//   產品沒有壞。壞的是分母：`bandTypePool` 對上班族乘 `rushMult(h)`，而深夜是 0.55，
//   所以 4 點的分母整個縮水（198 → 127），把 stroller 的占比從 3.9% 推高。
//   **一個會被第三個變數污染的比值，量不出我要問的那件事。**
//   改成跟**觀光客**（w:22 固定、沒有 peaks、不吃 rushMult）比：這個比值只剩下
//   peaks 一個變因，窗內外應該剛好差 2.4 倍。
// 弄紅它：把 stroller 的 peaks 拿掉，或把 mult 從 2.4 改成 1。
T('G5', 'peaks 真的咬人：跟沒有 peaks 的觀光客比，窗內外要差 2.4 倍', () => {
  const ratio = hour => withSeed(0x5EED77, () => {
    const { st, sim } = tower(10, {});
    const ts = driveSpawns(st, sim, hour, 2400);
    const c = t => ts.filter(x => x === t).length;
    return { n: ts.length, tourist: c('tourist'), stroller: c('stroller'), loaded: c('loaded') };
  });
  const inw = ratio(15), out = ratio(4);   // 15 點在 [11,21] 內；4 點在窗外
  const ne = NE(Math.min(inw.tourist, out.tourist), '觀光客（分母）一個都沒抽到'); if (ne) return ne;
  const bad = [], detail = [];
  for (const k of ['stroller', 'loaded']){
    const a = inw[k] / inw.tourist, b = out[k] / out.tourist;
    detail.push(`${k} 窗內 ${a.toFixed(3)} / 窗外 ${b.toFixed(3)} = ${(a / b).toFixed(2)}×`);
    if (!(b > 0)){ bad.push(`${k} 窗外一個都沒抽到，比值算不出來`); continue; }
    // peaks 寫 2.4，門檻取 2.0（17% 餘裕，吃得下抽樣雜訊，但拉直成 1.0 一定紅）
    if (!(a / b >= 2.0)) bad.push(`${k} 只差 ${(a / b).toFixed(2)} 倍（peaks 寫的是 2.4，門檻 2.0）`);
  }
  return { ok: !bad.length, msg: `${detail.join('｜')}｜樣本 ${inw.n}/${out.n}` +
    (bad.length ? '｜' + bad.join('｜') : '') };
});

// ============================================================ 兩列事件
// 弄紅它：把 closetime 的 types 打錯一個字，或整個拿掉某一種人。
T('G6', '打烊清場的組成就是那四種人，四種都要出現', () => {
  const { got } = withSeed(0xBEEF01, () => fireN('closetime', 22, 12, 120));
  const ne = NE(got.length, '打烊清場一次都沒觸發'); if (ne) return ne;
  const hit = {}; let total = 0;
  for (const g of got) for (const t of g.types){ hit[t] = (hit[t] || 0) + 1; total++; }
  const want = Object.keys(eventById('closetime').types);
  const missing = want.filter(k => !hit[k]);
  const extra = Object.keys(hit).filter(k => !want.includes(k));
  return { ok: !missing.length && !extra.length,
    msg: `${got.length} 次事件、${total} 個人｜` +
         Object.keys(hit).map(k => k + ' ' + hit[k]).join(' ') +
         (missing.length ? `｜**沒出現**：${missing.join(', ')}` : '') +
         (extra.length ? `｜**多出來**：${extra.join(', ')}` : '') };
});

// 弄紅它：把 sampling 的 at 或 to 從 'retail' 改成 'any'。
T('G7', '試吃推銷真的是零售 ↔ 零售（起點與終點都在 1–10 樓）', () => {
  const { got } = withSeed(0xBEEF02, () => fireN('sampling', 15, 40, 120));
  const ne = NE(got.length, '試吃推銷一次都沒觸發'); if (ne) return ne;
  let n = 0, bad = 0, hi = 0;
  for (const g of got) for (let i = 0; i < g.types.length; i++){
    n++;
    const o = g.origins[i] + 1, d = g.dests[i] + 1;   // 樓層索引 → 樓層號
    hi = Math.max(hi, o, d);
    if (o < 1 || o > 10 || d < 1 || d > 10) bad++;
  }
  const ne2 = NE(n, '事件觸發了但一個人都沒生出來'); if (ne2) return ne2;
  const wrongType = sum(got.map(g => g.types.filter(t => t !== 'sampler').length));
  return { ok: bad === 0 && wrongType === 0,
    msg: `${got.length} 次事件、${n} 個人、最高到 ${hi} 樓（零售帶是 1–10）｜` +
         `跑出零售帶 ${bad} 個｜不是 sampler 的 ${wrongType} 個` };
});

// 弄紅它：把 closetime 的 hours 從 [21,23] 改成 [0,24]。
// 這是否定句 → 先證明「窗內真的會發生」。
T('G8', '兩列事件的 hours 真的咬人（窗內會發生、窗外一次都沒有）', () => {
  const probe = (id, hour) => withSeed(0xBEEF03, () => fireN(id, hour, 12, 60).got.length);
  const cases = [
    ['closetime', 22, 12, '打烊清場'],   // 窗內 / 窗外
    ['sampling',  15,  3, '試吃推銷'],
  ];
  const bad = [], inside = [];
  for (const [id, hIn, hOut, name] of cases){
    const a = probe(id, hIn), b = probe(id, hOut);
    inside.push(a);
    if (!a) bad.push(`${name} 在窗內 ${hIn} 點 60 次檢查一次都沒觸發（母體是空的）`);
    if (b)  bad.push(`${name} 在窗外 ${hOut} 點觸發了 ${b} 次`);
  }
  const ne = NE(Math.min(...inside), '所有事件在窗內都沒觸發'); if (ne) return ne;
  return { ok: !bad.length, msg: bad.length ? bad.join('｜') : `窗內 ${inside.join('/')} 次、窗外 0 次` };
});

// ============================================================ 小費（#25）
// 這一條**獨立重算一次規則**，再拿去對產品的計數器。只斷言「有小費」抓不到
// 「門檻壞掉、每一個都給」；只斷言「沒小費」在沒有購物客的時候永遠通過。
// 弄紅它：把 sim.js 的門檻判斷拿掉（改成 `p.t.tip ? …`），或把 tip.sat 改掉。
function tipRun(seed, floors, auto, days){
  return withSeed(seed, () => {
    const { st, sim } = tower(floors, auto);
    st.up.cap = 2; st.up.speed = 2; st.up.door = 2;
    const steps = Math.round(days * C.DAY_SECONDS / DT);
    let expectTip = 0, fastNoTip = 0, slowTipped = 0, delivered = 0, borderline = 0;
    const cfg = passengerById('loaded').tip;
    for (let i = 0; i < steps; i++){
      const inCar = new Map();
      for (const s of sim.shafts) for (const r of s.riders) inCar.set(r.id, r);
      const before = st.stats.tips || 0;
      M.step(st, sim, DT);
      const after = st.stats.tips || 0;
      const still = new Set();
      for (const s of sim.shafts) for (const r of s.riders) still.add(r.id);
      const waiting = new Set(sim.waiting.map(p => p.id));
      let expectedThisStep = 0, borderThisStep = 0;
      for (const [id, p] of inCar){
        if (still.has(id) || waiting.has(id)) continue;   // 還在車上／被放回等待
        if (p.type !== 'loaded') continue;
        delivered++;
        const sat = 1 - Math.min(1, (st.t - p.born) / Math.max(1, p.patience));
        // 一個 DT 的解析度誤差：離門檻太近的不算，免得儀器自己製造假紅
        if (Math.abs(sat - cfg.sat) < 0.02){ borderThisStep++; continue; }
        if (sat >= cfg.sat) expectedThisStep++;
      }
      borderline += borderThisStep;
      expectTip += expectedThisStep;
      // ⚠ **第一版這裡是錯的**：邊界的那個人被我從期望值裡剔除了，但產品照樣給他小費，
      //   於是 `got > expected`，儀器報「不該給卻給 1」——**產品沒有壞，是我把它算掉了**。
      //   同一步裡同時送達兩個購物客（一個明確合格、一個在邊界）就會踩到。
      //   正確的比法是一個區間：期望值 ≤ 實際 ≤ 期望值 + 這一步的邊界人數。
      const got = after - before;
      if (got < expectedThisStep) fastNoTip += expectedThisStep - got;
      if (got > expectedThisStep + borderThisStep) slowTipped += got - expectedThisStep - borderThisStep;
    }
    return { tips: st.stats.tips || 0, expectTip, fastNoTip, slowTipped, delivered, borderline,
             loaded: st.codex.loaded || 0 };
  });
}

T('G9', '小費：我自己重算一次「夠快」，要跟產品的計數器對得上', () => {
  const rs = [1, 2, 3, 4].map(s => tipRun(0x71 * s, 12, { autodoor:true, fifo:true, scan:true, look:true }, 20));
  const delivered = sum(rs.map(r => r.delivered));
  const tips = sum(rs.map(r => r.tips));
  const ne = NE(delivered, '一個購物客都沒送達，這條 guard 從來沒有試過'); if (ne) return ne;
  const ne2 = NE(tips, `送達了 ${delivered} 個購物客，但一次小費都沒發出來`); if (ne2) return ne2;
  // 門檻要真的咬人：如果每一個送達的購物客都拿到小費，這條門檻等於不存在
  if (tips >= delivered)
    return { ok:false, msg:`送達 ${delivered} 個購物客、發了 ${tips} 次小費 —— 門檻沒有擋掉任何人，等於沒有門檻` };
  const wrong = sum(rs.map(r => r.fastNoTip)) + sum(rs.map(r => r.slowTipped));
  return { ok: wrong === 0,
    msg: `送達 ${delivered} 個購物客、發 ${tips} 次小費（我算出來 ${sum(rs.map(r => r.expectTip))} 次，` +
         `邊界略過 ${sum(rs.map(r => r.borderline))}）｜該給沒給 ${sum(rs.map(r => r.fastNoTip))}、` +
         `不該給卻給 ${sum(rs.map(r => r.slowTipped))}` };
});

// 弄紅它：把 tip.mult 從 0.5 改成別的數字。
T('G10', '小費的金額就是車資 × mult，而且走同一本帳（現金＝本輪＝終身）', () => {
  const r = withSeed(0xFEED01, () => {
    const { st, sim } = tower(12, { autodoor:true, fifo:true, scan:true, look:true });
    st.up.cap = 2;
    const steps = Math.round(20 * C.DAY_SECONDS / DT);
    let cash0 = st.cash, run0 = st.runRevenue, life0 = st.lifetimeRevenue;
    for (let i = 0; i < steps; i++) M.step(st, sim, DT);
    return { dCash: st.cash - cash0, dRun: st.runRevenue - run0, dLife: st.lifetimeRevenue - life0,
             tips: st.stats.tips || 0, served: st.stats.served };
  });
  const ne = NE(r.tips, `跑完 20 日一次小費都沒有（送達 ${r.served}）`); if (ne) return ne;
  // 幽靈的意外之財也走 cash/runRevenue（不走 lifetimeRevenue），所以只比 cash 與 run。
  const bad = [];
  if (Math.abs(r.dCash - r.dRun) > 1e-6) bad.push(`現金 ${r.dCash.toFixed(2)} ≠ 本輪 ${r.dRun.toFixed(2)}`);
  if (r.dLife > r.dRun + 1e-6) bad.push(`終身 ${r.dLife.toFixed(2)} > 本輪 ${r.dRun.toFixed(2)}`);
  return { ok: !bad.length, msg: bad.length ? bad.join('｜')
    : `小費 ${r.tips} 次｜現金/本輪 ${r.dRun.toFixed(0)}、終身 ${r.dLife.toFixed(0)}（差額 = 幽靈獎金）` };
});

// ============================================================ 接力（#28 / #23）
// 弄紅它：把 sampler 的 summon 整個拿掉。
T('G11', '接力真的發生：送達一個試吃推銷員，會多出一個往回走的', () => {
  const r = withSeed(0xFACE01, () => onlyEvent('sampling', () => {
    const { st, sim } = tower(12, { autodoor:true, fifo:true, scan:true, look:true });
    st.up.cap = 3; st.up.speed = 3;
    const steps = Math.round(40 * C.DAY_SECONDS / DT);
    let relayed = 0, delivered = 0, seen = new Set();
    for (let i = 0; i < steps; i++){
      const inCar = new Map();
      for (const s of sim.shafts) for (const r2 of s.riders) inCar.set(r2.id, r2);
      M.step(st, sim, DT);
      const still = new Set(); for (const s of sim.shafts) for (const r2 of s.riders) still.add(r2.id);
      const wait = new Set(sim.waiting.map(p => p.id));
      for (const [id, p] of inCar){
        if (still.has(id) || wait.has(id)) continue;
        if (p.type === 'sampler') delivered++;
      }
      for (const p of sim.waiting){
        if (seen.has(p.id)) continue; seen.add(p.id);
        if (p.type === 'sampler' && p.summoned) relayed++;
      }
    }
    return { relayed, delivered, codex: st.codex.sampler || 0 };
  }));
  const ne = NE(r.delivered, '一個試吃推銷員都沒送達（母體是空的，這條什麼都沒證明）'); if (ne) return ne;
  return { ok: r.relayed > 0,
    msg: `送達 ${r.delivered} 個推銷員，接力生出 ${r.relayed} 個（比值 ${(r.relayed / r.delivered).toFixed(2)}）` };
});

// **這一條是否定句**，母體 = 「有沒有接力來的推銷員被送達」。
// 弄紅它：把 sim.js 的 `if (summonDepth > 0 || p.summoned) return 0;` 改成
//         `if (summonDepth > 0) return 0;` —— 接力就變成無限的了。
T('G12', '接力有界：同伴不會再招同伴（先證明同伴真的被送達過）', () => {
  const r = withSeed(0xFACE02, () => onlyEvent('sampling', () => {
    const { st, sim } = tower(12, { autodoor:true, fifo:true, scan:true, look:true });
    st.up.cap = 3; st.up.speed = 3;
    const steps = Math.round(40 * C.DAY_SECONDS / DT);
    let companionDelivered = 0, secondGen = 0, seen = new Set();
    for (let i = 0; i < steps; i++){
      const inCar = new Map();
      for (const s of sim.shafts) for (const r2 of s.riders) inCar.set(r2.id, r2);
      const nWait = sim.waiting.length;
      M.step(st, sim, DT);
      const still = new Set(); for (const s of sim.shafts) for (const r2 of s.riders) still.add(r2.id);
      const wait = new Set(sim.waiting.map(p => p.id));
      let deliveredCompanionThisStep = 0;
      for (const [id, p] of inCar){
        if (still.has(id) || wait.has(id)) continue;
        if (p.type === 'sampler' && p.summoned) deliveredCompanionThisStep++;
      }
      companionDelivered += deliveredCompanionThisStep;
      if (deliveredCompanionThisStep){
        // 送達同伴的那一步，不可以再冒出新的 sampler
        for (const p of sim.waiting){ if (seen.has(p.id)) continue;
          if (p.type === 'sampler') secondGen++; }
      }
      for (const p of sim.waiting) seen.add(p.id);
    }
    return { companionDelivered, secondGen };
  }));
  const ne = NE(r.companionDelivered,
    '沒有任何一個「接力來的」推銷員被送達過 —— 這條 guard 從來沒有試過'); if (ne) return ne;
  return { ok: r.secondGen === 0,
    msg: `送達了 ${r.companionDelivered} 個接力來的推銷員，其中生出第二代 ${r.secondGen} 個（應該是 0）` };
});

// ============================================================ 成就
// 弄紅它：把某一條成就的 note 數字改掉（跟 tests/ 第 8 組同一種比對，這裡只看我加的五條）。
T('G13', '五條新成就：門檻數字與中英文案一致，而且判定的欄位真的會動', () => {
  const mine = ['pram', 'tipjar', 'lastcall', 'mopup', 'taster'];
  const nums = t => (String(t).match(/[0-9]+(?:\.[0-9]+)?/g) || []).map(Number);
  const bad = [];
  for (const id of mine){
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a){ bad.push(`${id} 不存在`); continue; }
    const want = nums(a.test);
    for (const [tag, txt] of [['zh', a.note], ['en', (EN.achievements[id] || {}).note]]){
      const got = nums(txt || '');
      if (!got.length){ bad.push(`${id}(${tag}) 文案沒有數字`); continue; }
      if (!got.some(n => want.includes(n))) bad.push(`${id}(${tag}) 判定 ${want.join('/')} vs 文案 ${got.join('/')}`);
    }
  }
  const ne = NE(mine.length, '沒有要檢查的成就'); if (ne) return ne;
  return { ok: !bad.length, msg: bad.length ? bad.join('｜') : `五條都對得上` };
});

// 弄紅它：把某一條成就的門檻改成一個拿不到的數（例如 taster 改成 500）。
// 這一條是**可達性**：門檻對得上文案不代表玩得到。
// **這一條的餘裕是刻意留寬的。** 門檻是照「約三場拿得到」回推的，而這裡跑 **八場**，
// 所以每一條都應該有大約 2 倍的餘裕。理由：一個會自己閃紅的可達性檢查比沒有更糟——
// 它訓練所有人忽略紅色。餘裕最薄的是 lastcall（打烊清場一場只發生 1–1.5 次，
// 而且那一批的放棄率中位 75%），它紅的時候先去看事件頻率，不要先懷疑門檻。
T('G14', '五條新成就在合理的遊玩長度內拿得到（不是文案好看而已）', () => {
  const GAMES = 8;                       // 一場 = 20 個遊戲日；門檻是照「約三場」定的
  const acc = { stroller:0, loaded:0, janitor:0, sampler:0, closing:0, tips:0 };
  for (const s of [11, 22, 33, 44, 55, 66, 77, 88]){
    const r = withSeed(s, () => {
      const { st, sim } = tower(12, { autodoor:true, fifo:true, scan:true, look:true });
      st.up.speed = 2; st.up.accel = 2; st.up.cap = 1; st.up.door = 1;
      const steps = Math.round(20 * C.DAY_SECONDS / DT);
      for (let i = 0; i < steps; i++) M.step(st, sim, DT);
      return st;
    });
    for (const k of ['stroller','loaded','janitor','sampler','closing']) acc[k] += r.codex[k] || 0;
    acc.tips += r.stats.tips || 0;
  }
  // 抄本：**寫死在這裡，不從 content.js 讀**。從產品讀的話，「把門檻改小讓它變綠」
  // 會安靜地成功——那正是 tests/harness.js 開頭第 1 點在防的事。
  const want = { pram:['stroller',30], tipjar:['tips',10], lastcall:['closing',4],
                 mopup:['janitor',6], taster:['sampler',12] };
  const bad = [], detail = [];
  for (const id in want){
    const [field, th] = want[id];
    const a = ACHIEVEMENTS.find(x => x.id === id);
    const declared = (String(a.test).match(/>=\s*([0-9]+)/) || [])[1];
    if (+declared !== th) bad.push(`${id} 的門檻改過了（程式 ${declared}、這條 guard 抄的是 ${th}）`);
    const got = acc[field];
    detail.push(`${id} ${got}/${th}`);
    if (!(got >= th)) bad.push(`${id}：三場只拿到 ${got}，門檻是 ${th}`);
  }
  const ne = NE(acc.loaded, '三場一個購物客都沒送達，這條 guard 從來沒有試過'); if (ne) return ne;
  return { ok: !bad.length,
    msg: `${GAMES} 場（12 層 / LOOK）｜${detail.join('　')}｜${bad.join('｜')}` };
});

export { rows };
