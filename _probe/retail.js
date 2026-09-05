// _probe/retail.js — BE peer（零售機制那一趟）自己的證偽探針。
// 不是 tests/。tests/ 是 orchestrator 的，這裡是我拿來「先把產品弄壞、看它紅不紅」的工具。
//
// 每一組機制都有三條，缺一組就不算驗過：
//   1. **會咬人的案例** —— 在容易的點取樣只會確認 bug，不會發現它
//   2. **存活對照** —— 一條本來就該綠的；它紅代表儀器壞了，上面那條的紅不算數
//   3. **反瑣碎解** —— 擋掉「一律為真 / 一律為零」那種錯解
//
// 另外有一條 NOOP：把這一趟新增的兩列資料拿掉之後，釘住亂數序列跑出來的指紋
// 必須跟 origin/main 逐字相同——「新機制一律要有預設關閉／不影響既有事件的路徑」
// 這句話只有這樣才證明得了。
import * as C0 from '../js/content.js';
import * as M from '../js/sim.js';
import * as S from '../js/state.js';
import { setLang, getLang, L } from '../js/i18n.js';

const C = C0.CONFIG, BANDS = C0.BANDS, EVENTS = C0.EVENTS,
      PASSENGERS = C0.PASSENGERS, TENANTS = C0.TENANTS;

const rows = [];
const add = (id, label, ok, msg) => rows.push({ id, label, ok: !!ok, msg });
const T = (id, label, fn) => {
  try { const r = fn(); add(id, label, r.ok, r.msg); }
  catch (e){ add(id, label, false, 'EXCEPTION: ' + ((e && e.message) || e) + '\n' + (e && e.stack || '')); }
};

const tAt = h => (h / 24) * C.DAY_SECONDS;
const byId = id => PASSENGERS.find(p => p.id === id);

// ---- 快照 / 還原
const snapEvents  = () => EVENTS.map(e => ({ ...e }));
const restEvents  = s => { EVENTS.length = 0; for (const e of s) EVENTS.push(e); };
const snapPax     = () => PASSENGERS.map(p => ({ ...p }));
const restPax     = s => { PASSENGERS.length = 0; for (const p of s) PASSENGERS.push(p); };
const snapTenants = () => TENANTS.map(t => ({ ...t }));
const restTenants = s => { TENANTS.length = 0; for (const t of s) TENANTS.push(t); };

function seeded(seed){
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function fnv(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// 一棟可以真的跑起來的樓：買好自動關門 + FIFO，否則電梯全手動、一步都不會動。
function tower(floors, opts){
  const st = S.newGame();
  st.floors = floors;
  st.auto.autodoor = true; st.auto.fifo = true;
  if (opts) Object.assign(st.auto, opts);
  const sim = M.createSim(st); M.syncShafts(st, sim);
  return { st, sim };
}

// 直接注入一個等待中的乘客。用 makePassenger 會被時段／樓層帶的抽樣影響，
// 這裡要的是「這一層確實有一個人在等」這件事本身。
function inject(st, sim, origin, dest, typeId){
  const t = byId(typeId || 'office');
  const p = { id: -(sim.waiting.length + 1), origin, dest, type: t.id, t,
              born: st.t, patience: 9999, left: 9999 };
  sim.waiting.push(p);
  return p;
}

// 樓裡所有還沒被送走的人：**等待中的 + 已經在車上的**。
// 只數 sim.waiting 會漏掉「同一步就被剛好停在那層的車接走」的人——第一版的 sum-guide
// 就是這樣紅的（導遊和 3 個觀景客在同一次開門裡上了車，儀器數到 0 個導遊）。
const everyone = sim => sim.waiting.concat(...sim.shafts.map(s => s.riders));

// 跑 n 步，回報「每一次開門發生在哪一層」。openDoors() 會把 s.pos 設成該層並且
// s.st.trips++，所以 trips 的增量就是開門事件。
function runAndWatchStops(st, sim, steps, dt, onStep){
  const stops = [];
  const prev = sim.shafts.map(s => s.st.trips);
  for (let i = 0; i < steps; i++){
    if (onStep) onStep(i);
    M.step(st, sim, dt);
    sim.shafts.forEach((s, k) => {
      if (s.st.trips > prev[k]){ prev[k] = s.st.trips; stops.push(Math.round(s.pos)); }
    });
  }
  return stops;
}

export async function run(){
  const lang0 = getLang();
  setLang('zh');

  // ============================================================== 封鎖樓層（#22）
  // 場景：12 層的樓，索引 1..9 每層各站一個人要下大廳，**完全關掉隨機生成**
  // （生成會讓兩次跑的候選集不一樣，比較就變成在比雜訊）。封鎖索引 4。
  // 期望：索引 4 完全沒有停靠、其它 8 層一個不少地送到。
  // 4000 步 × 1/20 = 200 秒。載客量起始只有 4，9 個人要跑三趟來回才接得完；
  // 80 秒版本的「其它 8 層只接走 7 層」是時間不夠，不是封鎖的效果。
  const DT = 1 / 20, SERVE_STEPS = 4000;
  const FLOORS = [1, 2, 3, 4, 5, 6, 7, 8, 9], BLK = 4;

  // ⚠ 儀器筆記：這裡**不能用 FIFO**。candidates() 給車上乘客的排序鍵是 r.board（上車
  // 時間），一定比任何還在等的人的 p.born 新，所以只要還有人在等，FIFO 永遠先去接
  // 下一個 hall call、不去放人 —— 實測 34 次停靠、stats.served = 0。那是既有行為
  // （「FIFO 笨」本來就是它的賣點），不是這一趟改出來的，但它會讓「送達數」這個
  // 量測失效。所以主場景用 LOOK，另外用 blk-algos 掃過每一種調度。
  function serveScenario(doBlock, auto){
    const { st, sim } = tower(12, auto || { look: true });
    st.t = tAt(3);                       // 半夜：隨機事件最少，量的是調度不是雜訊
    for (const f of FLOORS) inject(st, sim, f, 0);
    if (doBlock) M.blockFloor(st, sim, BLK, 999);
    // 生成與隨機事件都關掉：這一段要量的是調度，不是人流
    const stops = runAndWatchStops(st, sim, SERVE_STEPS, DT, () => { sim.spawnT = 999; sim.eventT = 0; });
    // 「還在原地等」才是與演算法無關的量測。用「停靠在哪一層」會漏掉雙層轎廂
    // ——它停在 f 卻同時服務 f+1，停靠紀錄上永遠看不到 f+1。
    const left = new Set(sim.waiting.filter(p => p.id < 0).map(p => p.origin));
    return { st, sim, stops, left,
             served: st.stats.served,
             takenBlk: !left.has(BLK),
             atBlk: stops.filter(f => f === BLK).length,
             others: FLOORS.filter(f => f !== BLK).filter(f => !left.has(f)) };
  }

  // ---- 1 會咬人的案例
  T('blk-bite', '封鎖層完全不停靠、沒有人被接走，同一趟裡其它 8 層全部接走', () => {
    const r = serveScenario(true);
    return { ok: r.atBlk === 0 && !r.takenBlk && r.others.length === 8 && r.served > 0,
      msg: `索引 ${BLK}（封鎖中）停靠 ${r.atBlk} 次、被接走=${r.takenBlk}（期望 false）；`
         + `其它 8 層被接走 ${r.others.length} 層（期望 8）；stats.served=${r.served}、總停靠 ${r.stops.length} 次` };
  });

  // ---- 2 存活對照：同一個場景不封鎖，索引 4 一定要被服務到。
  // 這條紅 = 儀器根本沒有在製造「本來會停靠索引 4」的情境，上面那個 0 是空的宇宙。
  T('blk-alive', '存活對照：不封鎖時索引 4 本來就會被停靠、被接走', () => {
    const r = serveScenario(false);
    return { ok: r.atBlk > 0 && r.takenBlk && r.others.length === 8 && r.served > 0,
      msg: `不封鎖：索引 ${BLK} 停靠 ${r.atBlk} 次、被接走=${r.takenBlk}（期望 true）、`
         + `其它 8 層被接走 ${r.others.length} 層、stats.served=${r.served}` };
  });

  // ---- 3 反瑣碎解：「把電梯整台停掉」也會讓索引 4 停靠 0 次。
  // 所以要求：封鎖前後只差**剛好那一個人**，不是差一整棟樓。
  T('blk-nontrivial', '反瑣碎解：封鎖只吃掉那一層，剩下 8 層一個不少（不是少一整棟）', () => {
    const a = serveScenario(false), b = serveScenario(true);
    const stillWaiting = [...b.left].sort((x, y) => x - y);
    return { ok: a.left.size === 0 && stillWaiting.length === 1 && stillWaiting[0] === BLK
                 && b.stops.length > 0 && b.served > 0,
      msg: `不封鎖後還在等的樓層：${JSON.stringify([...a.left])}（期望 []）；`
         + `封鎖後還在等的：${JSON.stringify(stillWaiting)}（期望 [${BLK}]）；`
         + `封鎖後仍停靠 ${b.stops.length} 次、送達 ${b.served} 人（兩個都必須 > 0）` };
  });

  // ---- 每一種調度都要跳過封鎖層。chooseTarget 有五條互不相同的分支
  // （疏散 / 玩家佇列 / 目的地控制 / LOOK / SCAN）加上雙層轎廂的 f+1，
  // 只驗一種等於只驗五分之一。每一種都自己帶存活對照（不封的時候要停得到）。
  T('blk-algos', '會咬人：六種調度設定下都停靠 0 次（每種各自帶存活對照）', () => {
    const modes = [
      ['FIFO',      { fifo: true }],
      ['SCAN',      { scan: true }],
      ['LOOK',      { look: true }],
      ['目的地控制', { look: true, dest: true }],
      ['群組控制',   { look: true, dest: true, group: true }],
      ['雙層轎廂',   { look: true, double: true }],
    ];
    const bad = [], note = [];
    for (const [name, auto] of modes){
      const off = serveScenario(false, auto), on = serveScenario(true, auto);
      note.push(`${name} ${off.takenBlk ? '接走' : '沒接走'}→${on.takenBlk ? '接走' : '沒接走'}`);
      if (!off.takenBlk)  bad.push(`${name}：不封鎖時也沒接走索引 ${BLK} 的人，這一格是空的宇宙`);
      if (on.takenBlk)    bad.push(`${name}：封鎖中還是把索引 ${BLK} 的人接走了`);
      if (on.atBlk !== 0) bad.push(`${name}：封鎖中仍在索引 ${BLK} 開門 ${on.atBlk} 次`);
    }
    return { ok: bad.length === 0,
      msg: `索引 ${BLK}（不封→封）：${note.join('、')}` + (bad.length ? '｜' + bad.join('｜') : '') };
  });

  // ---- 封鎖層不生需求（獨立量，附存活對照）
  T('blk-nodemand', '封鎖層不再被抽為出發／目的地（對照：不封鎖時抽得到）', () => {
    function sample(doBlock){
      const { st, sim } = tower(12);
      st.t = tAt(3);
      if (doBlock) M.blockFloor(st, sim, BLK, 9999);
      let hit = 0, total = 0;
      for (let i = 0; i < 1200; i++){
        sim.spawnT = -0.001; sim.eventT = 0; sim.waiting.length = 0;
        M.step(st, sim, DT);
        for (const p of sim.waiting){ total++; if (p.origin === BLK || p.dest === BLK) hit++; }
      }
      return { hit, total };
    }
    const off = sample(false), on = sample(true);
    return { ok: off.total > 300 && off.hit > 0 && on.total > 300 && on.hit === 0,
      msg: `不封鎖：${off.total} 個乘客中 ${off.hit} 個碰到索引 ${BLK}（必須 > 0，否則母體是空的）；`
         + `封鎖：${on.total} 個乘客中 ${on.hit} 個（期望 0）` };
  });

  // ---- 大廳封不了
  T('blk-lobby', '大廳（索引 0）永遠封不了，其它層封得了（存活對照在同一條裡）', () => {
    const { st, sim } = tower(12);
    const lobby = M.blockFloor(st, sim, 0, 30);
    const other = M.blockFloor(st, sim, 3, 30);
    const oob   = M.blockFloor(st, sim, 99, 30);
    return { ok: lobby === false && other === true && oob === false
                 && !M.isFloorBlocked(st, sim, 0) && M.isFloorBlocked(st, sim, 3),
      msg: `blockFloor(0)=${lobby}、blockFloor(3)=${other}、blockFloor(99, 樓層外)=${oob}；`
         + `blockedFloors=${JSON.stringify(M.blockedFloors(st, sim))}` };
  });

  // ---- 會到期（反「永久封鎖」）
  T('blk-expire', '封鎖會到期，到期後那一層立刻恢復服務', () => {
    const { st, sim } = tower(12);
    st.t = tAt(3);
    inject(st, sim, 4, 0);
    M.blockFloor(st, sim, 4, 5);
    const during = runAndWatchStops(st, sim, 80, DT).filter(f => f === 4).length;   // 4 秒
    const blockedMid = M.isFloorBlocked(st, sim, 4);
    const after = runAndWatchStops(st, sim, 600, DT).filter(f => f === 4).length;   // 再 30 秒
    return { ok: during === 0 && blockedMid && after > 0 && !M.isFloorBlocked(st, sim, 4),
      msg: `封鎖 5 秒：前 4 秒停靠 ${during} 次（期望 0，且當下 isFloorBlocked=${blockedMid}）、`
         + `之後 30 秒停靠 ${after} 次（期望 > 0），現在 isFloorBlocked=${M.isFloorBlocked(st, sim, 4)}` };
  });

  // ---- 車上的人不會不見（反「封鎖 = 弄丟乘客」）
  T('blk-riders', '車上要去封鎖層的人留在車上，解封後還是送得到', () => {
    const { st, sim } = tower(12);
    st.t = tAt(3);
    const s = sim.shafts[0];
    const t = byId('office');
    s.riders.push({ id:-99, origin:0, dest:4, type:'office', t, born:st.t,
                    patience:9999, left:9999, board:st.t });
    M.blockFloor(st, sim, 4, 6);
    runAndWatchStops(st, sim, 100, DT);          // 5 秒：封鎖中
    const stillOn = sim.shafts.some(x => x.riders.some(r => r.id === -99));
    const served0 = st.stats.served;
    runAndWatchStops(st, sim, 600, DT);          // 再 30 秒：已解封
    const delivered = st.stats.served > served0;
    const gone = !sim.shafts.some(x => x.riders.some(r => r.id === -99));
    return { ok: stillOn && delivered && gone,
      msg: `封鎖中還在車上=${stillOn}；解封後送達=${delivered}（stats.served ${served0} → ${st.stats.served}）、`
         + `已離開車廂=${gone}` };
  });

  // ---- 資料真的接得上（地板打蠟走隨機池，而且真的封了一層）
  T('blk-wired', '「地板打蠟」在 hours 內從隨機池抽得到，而且真的封鎖了一層', () => {
    const { st, sim } = tower(12);
    let fired = 0, blockedSeen = [], floors = [];
    for (let i = 0; i < 400; i++){
      st.t = tAt(6); sim.spawnT = 999; sim.eventT = C.EVENT_EVERY;
      sim.blocked = {}; sim.lastEvent = null; sim.toasts.length = 0;
      M.step(st, sim, DT);
      if (sim.lastEvent && sim.lastEvent.name === '地板打蠟'){
        fired++;
        floors.push(sim.lastEvent.floor);
        blockedSeen.push(M.blockedFloors(st, sim).join(','));
      }
    }
    const lows = floors.filter(f => f < 1).length;
    const highs = floors.filter(f => f > 9).length;
    const consistent = blockedSeen.every((b, i) => b === String(floors[i]));
    return { ok: fired > 20 && lows === 0 && highs === 0 && consistent,
      msg: `h=6 檢查 400 次，地板打蠟觸發 ${fired} 次；落點樓層索引 ${JSON.stringify([...new Set(floors)].sort((a,b)=>a-b))}`
         + `（大廳 ${lows} 次、零售帶外 ${highs} 次，都必須是 0）；封鎖狀態與事件樓層一致=${consistent}` };
  });

  // ============================================================== 招來同伴（#27）
  // 場景：一個網紅從 3 樓被送到 8 樓（索引 2 → 7）。送到的那一刻，大廳（索引 0）
  // 應該多出 2–3 個要去索引 7 的網紅，而且他們身上有 summoned 標記。
  function deliverOne(typeId, opts){
    const o = (opts && opts.origin) != null ? opts.origin : 2;
    const dest = (opts && opts.dest) != null ? opts.dest : 7;
    const { st, sim } = tower(12);
    st.t = tAt(14);
    const s = sim.shafts[0];
    const t = byId(typeId);
    s.riders.push({ id:-77, origin:o, dest, type:t.id, t, born:st.t,
                    patience:9999, left:9999, board:st.t });
    if (opts && opts.block) M.blockFloor(st, sim, opts.block, 60);
    if (opts && opts.fill) while (sim.waiting.length < opts.fill) inject(st, sim, 1, 0);
    const before = sim.waiting.length;
    for (let i = 0; i < 900 && st.stats.served === 0; i++){ sim.spawnT = 999; M.step(st, sim, DT); }
    const fresh = sim.waiting.slice(before);
    return { st, sim, fresh, served: st.stats.served, dest };
  }

  // ---- 1 會咬人的案例
  T('sum-bite', '送達網紅 → 大廳出現 2–3 個同伴，去他剛才去的那一層', () => {
    const r = deliverOne('influencer');
    const comp = r.fresh.filter(p => p.summoned);
    const ok = r.served === 1 && comp.length >= 2 && comp.length <= 3
            && comp.every(p => p.origin === 0 && p.dest === r.dest && p.type === 'influencer');
    return { ok, msg: `送達 ${r.served} 人；新增 ${r.fresh.length} 人，其中標記 summoned 的 ${comp.length} 個 → `
         + JSON.stringify(comp.map(p => `${p.type} ${p.origin}→${p.dest}`)) };
  });

  // ---- 2 存活對照：同一套儀器換成不會招人的乘客，必須是 0。
  // 這條紅 = 儀器把普通生成當成同伴在數，上面那個 2–3 不算數。
  T('sum-alive', '存活對照：換成上班族，同一套儀器數到 0 個同伴', () => {
    const r = deliverOne('office');
    const comp = r.fresh.filter(p => p.summoned);
    return { ok: r.served === 1 && comp.length === 0,
      msg: `送達 ${r.served} 人；新增 ${r.fresh.length} 人，標記 summoned 的 ${comp.length} 個（期望 0）` };
  });

  // ---- 3 反瑣碎解 A：同伴不會再招同伴（沒有這道閘就是指數成長）
  T('sum-nosnow', '反瑣碎解：把同伴也送到，一個新的同伴都不會出現', () => {
    const r = deliverOne('influencer');
    const comp = r.fresh.filter(p => p.summoned);
    if (!comp.length) return { ok:false, msg:'第一代同伴就是 0，這條沒有試到東西' };
    // 把第一代同伴直接搬上車再送一次
    const { st, sim } = tower(12);
    st.t = tAt(14);
    const s = sim.shafts[0];
    for (const p of comp) s.riders.push({ ...p, board: st.t });
    const before = sim.waiting.length;
    for (let i = 0; i < 900 && st.stats.served < comp.length; i++){ sim.spawnT = 999; M.step(st, sim, DT); }
    const gen2 = sim.waiting.slice(before).filter(p => p.summoned);
    return { ok: st.stats.served === comp.length && gen2.length === 0,
      msg: `第一代 ${comp.length} 個同伴全部送達（stats.served=${st.stats.served}），第二代同伴 ${gen2.length} 個（期望 0）` };
  });

  // ---- 3 反瑣碎解 B：on:'spawn' 的自我遞迴必須在深度 1 停住。
  // 沒有 summonDepth 這道閘，這一條會直接 stack overflow。
  T('sum-recur', '反瑣碎解：出現時招自己的人物，停在深度 1（沒有閘就是爆堆疊）', () => {
    const ps = snapPax();
    try {
      PASSENGERS.push({ id:'_selfsum', name:'自招測試', fare:1, patience:60, size:1, w:0, band:'any',
                        summon:{ on:'spawn', n:[2,2], type:'_selfsum', from:'origin', to:'dest' } });
      const { st, sim } = tower(12);
      st.t = tAt(14);
      // 用事件的 type: 指定型別，逼 makePassenger 生出這個人物
      const es = snapEvents();
      try {
        EVENTS.length = 0;
        EVENTS.push({ id:'_selftest', name:'自招事件', w:100, n:[1,1], at:'office', to:'lobby',
                      hours:[0,24], type:'_selfsum', text:'x' });
        // EVENT_CHANCE 是 0.55，一次 step 只有一半機率真的開事件——要跑到它開為止，
        // 不然這條會隨機紅（第一版就是這樣紅的，而且紅的理由跟被測的東西無關）
        for (let i = 0; i < 60 && !sim.waiting.length; i++){
          sim.eventT = C.EVENT_EVERY; sim.spawnT = 999;
          M.step(st, sim, DT);
        }
      } finally { restEvents(es); }
      const all = everyone(sim).filter(p => p.type === '_selfsum');
      const roots = all.filter(p => !p.summoned), kids = all.filter(p => p.summoned);
      return { ok: roots.length === 1 && kids.length === 2,
        msg: `生出 ${all.length} 個：根 ${roots.length} 個、同伴 ${kids.length} 個（期望 1 + 2；沒有深度上限的話會無限遞迴）` };
    } finally { restPax(ps); }
  });

  // ---- 3 反瑣碎解 C：WAIT_CAP 是共用的，招來同伴不是繞過它的第二條路
  T('sum-cap', '反瑣碎解：waiting 已經頂到上限時，招來同伴不會再往上疊', () => {
    const r = deliverOne('influencer', { fill: 160 });
    const comp = r.fresh.filter(p => p.summoned);
    return { ok: comp.length === 0 && r.sim.waiting.length <= 161,
      msg: `waiting 預先填到 ${160}，送達後同伴 ${comp.length} 個（期望 0），waiting=${r.sim.waiting.length}` };
  });

  // ---- 交互：同伴的目的地被封鎖時不生同伴（不製造注定接不到的人）
  T('sum-blocked', '封鎖 × 招來同伴：目的地被封時一個同伴都不生', () => {
    const r = deliverOne('influencer', { dest: 7, block: 7 });
    const comp = r.fresh.filter(p => p.summoned);
    // 送不到（7 樓封著），所以這裡量的是「就算硬送到也不會生同伴」——改用直接呼叫
    const { st, sim } = tower(12);
    st.t = tAt(14);
    M.blockFloor(st, sim, 7, 60);
    const s = sim.shafts[0];
    const t = byId('influencer');
    s.riders.push({ id:-78, origin:2, dest:7, type:'influencer', t, born:st.t,
                    patience:9999, left:9999, board:st.t });
    const before = sim.waiting.length;
    for (let i = 0; i < 200; i++){ sim.spawnT = 999; M.step(st, sim, DT); }
    const gen = sim.waiting.slice(before).filter(p => p.summoned);
    return { ok: comp.length === 0 && gen.length === 0 && st.stats.served === 0,
      msg: `目的地索引 7 封鎖中：同伴 ${comp.length}/${gen.length} 個（期望 0/0）、送達 ${st.stats.served} 人（期望 0，車不能停）` };
  });

  // ---- 導遊（#5-E）能不能直接套用這個介面，不動 sim.js
  T('sum-guide', '介面可重用：導遊型設定（出現時帶 4–6 個觀景客）只靠資料就跑得起來', () => {
    const ps = snapPax();
    try {
      PASSENGERS.push({ id:'_guide', name:'導遊', fare:1.0, patience:95, size:1, w:0, band:'any',
                        summon:{ on:'spawn', n:[4,6], type:'observer', from:'origin', to:'dest' } });
      const { st, sim } = tower(80);
      st.t = tAt(14);
      const es = snapEvents();
      try {
        EVENTS.length = 0;
        EVENTS.push({ id:'_guidetest', name:'導遊測試', w:100, n:[1,1], at:'lobby', to:'obs',
                      hours:[0,24], type:'_guide', text:'x' });
        for (let i = 0; i < 60 && !everyone(sim).length; i++){   // 同上：EVENT_CHANCE 0.55
          sim.eventT = C.EVENT_EVERY; sim.spawnT = 999;
          M.step(st, sim, DT);
        }
      } finally { restEvents(es); }
      const all = everyone(sim);
      const g = all.filter(p => p.type === '_guide');
      const obs = all.filter(p => p.type === 'observer' && p.summoned);
      const sameTrip = g.length === 1 && obs.every(p => p.origin === g[0].origin && p.dest === g[0].dest);
      return { ok: g.length === 1 && obs.length >= 4 && obs.length <= 6 && sameTrip,
        msg: `導遊 ${g.length} 個帶來 ${obs.length} 個觀景客（期望 4–6），`
           + `行程一致=${sameTrip}：${g[0] ? g[0].origin + '→' + g[0].dest : '-'}` };
    } finally { restPax(ps); }
  });

  // ============================================================== #30 兩列 party
  T('p30-en', '英文兩句不一樣（存活對照：中文本來就不一樣、兩邊都非空）', () => {
    const rand = EVENTS.find(e => e.id === 'party' && !e.byTenant);
    const ten  = EVENTS.find(e => e.id === 'banquet' && e.byTenant);
    if (!rand || !ten) return { ok:false, msg:`找不到兩列：尾牙=${!!rand}、宴會=${!!ten}` };
    setLang('zh');
    const zh = [L(rand,'text','events'), L(ten,'text','events')];
    const zhName = [L(rand,'name','events'), L(ten,'name','events')];
    setLang('en');
    const en = [L(rand,'text','events'), L(ten,'text','events')];
    const enName = [L(rand,'name','events'), L(ten,'name','events')];
    setLang('zh');
    const nonEmpty = [...zh, ...en].every(s => s && s.length > 5);
    const notChinese = en.every(s => !/[一-鿿]/.test(s));   // 反瑣碎解：不能靠退回中文
    return { ok: nonEmpty && zh[0] !== zh[1] && en[0] !== en[1] && enName[0] !== enName[1] && notChinese,
      msg: `zh 不同=${zh[0] !== zh[1]}、en 不同=${en[0] !== en[1]}、en 名稱不同=${enName[0] !== enName[1]}、`
         + `都非空=${nonEmpty}、英文沒有退回中文=${notChinese}｜EN: ${JSON.stringify(enName)}` };
  });

  T('p30-wire', '宴會廳租戶的 event 接得到那一列（端對端，panic 0.75 生效）', () => {
    const ts = snapTenants();
    try {
      const banquetTenant = TENANTS.find(t => t.id === 'banquet');
      const target = C0.eventById(banquetTenant.event, { byTenant: true });
      // 產品的 hotel 帶 plain 租戶是「客房」，所以把宴會廳的接線逐字搬到 plain 那一列來量
      const room = TENANTS.find(t => t.id === 'room');
      room.event = banquetTenant.event; room.every = [180, 260];
      const { st, sim } = tower(45);
      const found = [];
      for (let i = 0; i < 60 && !found.length; i++){
        st.t = tAt(3); sim.spawnT = 999; sim.eventT = 0;
        sim.waiting.length = 0; sim.lastEvent = null;
        sim.tenantT = { 'hotel:room': 0.0001 };
        M.step(st, sim, DT);
        if (sim.lastEvent){
          const ratios = sim.waiting.map(p =>
            p.patience / (p.t.patience * (1 + Math.max(p.origin, p.dest) / 45)));
          found.push({ name: sim.lastEvent.name, n: sim.waiting.length, ratio: ratios[0] });
        }
      }
      const f = found[0];
      return { ok: !!target && !!f && f.name === '宴會散場' && Math.abs(f.ratio - 0.75) < 1e-6,
        msg: `租戶 banquet.event='${banquetTenant.event}' → ${target ? JSON.stringify(target.name) : '查無'}；`
           + (f ? `端對端觸發：${f.name}，${f.n} 人，耐性倍率 ${f.ratio}（期望 宴會散場 / 0.75）`
                : '租戶事件一次也沒有觸發，這條沒有試到東西') };
    } finally { restTenants(ts); }
  });

  T('p30-unique', 'EVENTS 的 id 沒有重複，而且每一列都有英文（反「安靜退回中文」）', () => {
    const seen = {}, dup = [];
    for (const e of EVENTS){ if (seen[e.id]) dup.push(e.id); seen[e.id] = 1; }
    setLang('en');
    const noEn = EVENTS.filter(e => /[一-鿿]/.test(L(e, 'name', 'events'))).map(e => e.id);
    setLang('zh');
    return { ok: dup.length === 0 && noEn.length === 0 && EVENTS.length > 10,
      msg: `${EVENTS.length} 列；重複 id：${JSON.stringify(dup)}；英文查不到而退回中文的：${JSON.stringify(noEn)}` };
  });

  T('p30-pax-en', '每一種乘客都有英文（新增的網紅也要有）', () => {
    setLang('en');
    const noEn = PASSENGERS.filter(p => /[一-鿿]/.test(L(p, 'name', 'passengers'))).map(p => p.id);
    setLang('zh');
    return { ok: noEn.length === 0,
      msg: `${PASSENGERS.length} 種乘客，英文查不到而退回中文的：${JSON.stringify(noEn)}` };
  });

  // ============================================================== NOOP：預設關閉的路徑
  // 把這一趟新增的兩列資料拿掉，釘住亂數序列跑一整週。指紋必須跟 origin/main 逐字相同。
  T('noop-fp', '拿掉新資料之後的決定性指紋（跟 origin/main 對照）', () => {
    const es = snapEvents(), ps = snapPax();
    const origRandom = Math.random;
    try {
      const keepE = es.filter(e => e.id !== 'waxing').map(e => ({ ...e,
        // #30 改了 id 與租戶接線，那是**刻意**的行為改動，不在 NOOP 的範圍內。
        // 為了跟 origin/main 對得起來，這裡把 banquet 那一列的 id 改回 party。
        id: e.id === 'banquet' && e.byTenant ? 'party' : e.id }));
      restEvents(keepE);
      restPax(ps.filter(p => p.id !== 'influencer'));
      Math.random = seeded(0x5eed1234);
      const st = S.newGame(); st.floors = 60;
      const sim = M.createSim(st); M.syncShafts(st, sim);
      const log = [];
      for (let i = 0; i < 3000; i++){
        st.t = (i / 3000) * C.DAY_SECONDS * C.WEEK_DAYS;
        sim.spawnT = -0.001;
        if (i % 40 === 0) sim.eventT = C.EVENT_EVERY;
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
    } finally { Math.random = origRandom; restEvents(es); restPax(ps); }
  });

  setLang(lang0);
  return rows;
}
