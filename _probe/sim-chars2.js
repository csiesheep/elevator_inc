// _probe/sim-chars2.js — 第 3 階段的第二輪。第一輪丟出兩個要回答的問題：
//   Q1 打烊清場「這一批」的放棄率中位 69–88%。這是我造成的，還是這個遊戲本來就這樣？
//      → 對照組必須是**現有的爆量事件**（尾牙散場 12–22 人、會議散場 8–16 人…），
//        不是「全樓的平均放棄率」。拿全樓平均當對照會把「一次丟 13 個人到同一層」
//        這件事本身的成本算到我頭上。
//   Q2 小費的門檻 sat ≥ 0.65 實測只有 1/6 的購物客拿得到，而且 100 層是 0。
//      門檻是我定的，所以要掃過去看它長什麼樣，不能只填一個數字。
//   Q3 成就門檻對不上（closing 要 10 場、tips 要 6.3 場）。要重新回推。
import { CONFIG as C, PASSENGERS, EVENTS, passengerById } from '../js/content.js';
import * as M from '../js/sim.js';
import * as S from '../js/state.js';
import { setLang } from '../js/i18n.js';

setLang('zh');
const DT = 1 / 20;
const ALGOS = {
  manual: {}, fifo: { autodoor:true, fifo:true },
  scan: { autodoor:true, fifo:true, scan:true },
  look: { autodoor:true, fifo:true, scan:true, look:true },
  dest: { autodoor:true, fifo:true, scan:true, look:true, dest:true },
  group:{ autodoor:true, fifo:true, scan:true, look:true, dest:true, group:true },
};
function seeded(seed){ let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const sum = a => a.reduce((x, y) => x + y, 0);
const mean = a => a.length ? sum(a) / a.length : 0;
const q = (a0, p) => { if (!a0.length) return null; const a = [...a0].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const r2 = n => Math.round(n * 100) / 100;
const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '—';

function run(seed, cfg){
  const orig = Math.random;
  const snapPax = PASSENGERS.map(p => ({ ...p }));
  const snapEv  = EVENTS.map(e => ({ ...e }));
  try {
    if (cfg.tipSat != null){ const p = passengerById('loaded'); if (p) p.tip = { sat: cfg.tipSat, mult: 0.5 }; }
    if (cfg.flatTypes){ const e = EVENTS.find(x => x.id === 'closetime'); if (e) e.types = { closing:16 }; }
    Math.random = seeded(seed);
    const st = S.newGame();
    st.floors = cfg.floors;
    Object.assign(st.auto, ALGOS[cfg.algo]);
    if (cfg.floors >= 40){ st.up.speed = 6; st.up.accel = 5; st.up.cap = 5; st.up.door = 4; st.up.shaft = 3; }
    else if (cfg.floors >= 12){ st.up.speed = 2; st.up.accel = 2; st.up.cap = 1; st.up.door = 1; }
    st.cash = 0;
    const sim = M.createSim(st); M.syncShafts(st, sim);
    const steps = Math.round(cfg.days * C.DAY_SECONDS / DT);
    const seen = new Map(); const episodes = []; let lastEvT = -1;
    for (let i = 0; i < steps; i++){
      const before = new Set(sim.waiting.map(p => p.id));
      M.step(st, sim, DT);
      let ep = null;
      if (sim.lastEvent && sim.lastEvent.t !== lastEvT){
        lastEvT = sim.lastEvent.t;
        ep = { name: sim.lastEvent.name, ids: new Set() };
        episodes.push(ep);
      }
      for (const p of sim.waiting){
        if (seen.has(p.id)) continue;
        seen.set(p.id, { type: p.type, size: p.t.size });
        if (ep) ep.ids.add(p.id);
      }
      const inCar = new Set();
      for (const s of sim.shafts) for (const r of s.riders) inCar.add(r.id);
      for (const id of before){
        if (inCar.has(id)) continue;
        if (sim.waiting.some(p => p.id === id)) continue;
        const rec = seen.get(id); if (rec && !rec.gone) rec.gone = true;
      }
    }
    return { st, seen, episodes };
  } finally {
    Math.random = orig;
    PASSENGERS.length = 0; for (const p of snapPax) PASSENGERS.push(p);
    EVENTS.length = 0;     for (const e of snapEv)  EVENTS.push(e);
  }
}

// 一次事件「這一批」的放棄率與平均佔位
function batches(r){
  const out = {};
  for (const ep of r.episodes){
    let n = 0, gone = 0, size = 0;
    for (const id of ep.ids){ const rec = r.seen.get(id); if (!rec) continue;
      n++; size += rec.size; if (rec.gone) gone++; }
    if (!n) continue;
    (out[ep.name] = out[ep.name] || []).push({ n, gone, eSize: size / n });
  }
  return out;
}

export async function main(){
  const secs = []; const push = (t, b) => secs.push({ title: t, body: b });
  const y = () => new Promise(r => setTimeout(r, 0));
  const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88];

  // ---------------------------------------------------------- Q1 對照組：所有爆量事件
  {
    const acc = {};
    for (const algo of ['fifo', 'look', 'group']){
      for (const s of SEEDS){
        const b = batches(run(s, { floors: 12, algo, days: 20 }));
        for (const k in b){ (acc[k] = acc[k] || []).push(...b[k].map(x => ({ ...x, algo }))); }
        await y();
      }
    }
    const body = ['12 層、8 顆種子 × {fifo, look, group}、20 日。',
      '**「這一批」的放棄率 = 這次事件生出來的人裡有幾個沒等到**，不是全樓的放棄率。',
      '對照組是現有的爆量事件——打烊清場如果跟它們同一個量級，那個痛就是這個遊戲本來的痛。', ''];
    body.push('  事件         次數  一批人數  平均佔位  這一批的放棄率 中位 / p90 / 最糟');
    const keys = Object.keys(acc).sort((a, b) => mean(acc[b].map(x => x.n)) - mean(acc[a].map(x => x.n)));
    for (const k of keys){
      const v = acc[k]; const rates = v.map(x => x.gone / x.n);
      const mark = (k === '打烊清場' || k === '試吃推銷') ? ' ◀' : '';
      body.push(`  ${k.padEnd(6, '　')} ${String(v.length).padStart(4)}　${r2(mean(v.map(x => x.n))).toString().padStart(6)}　` +
        `${r2(mean(v.map(x => x.eSize))).toString().padStart(6)}　` +
        `${pc(q(rates, 0.5), 1).padStart(8)} / ${pc(q(rates, 0.9), 1).padStart(6)} / ${pc(Math.max(...rates), 1).padStart(6)}${mark}`);
    }
    push('Q1 打烊清場的痛，跟現有的爆量事件比起來', body);
  }

  // ---------------------------------------------------------- Q1b types 的貢獻
  {
    const body = ['同樣是打烊清場，把 types 換成「全部都是 size 1 的店員」當對照，',
      '看那 69–88% 裡有多少是我選的 types（loaded size 2 / stroller size 3）造成的。',
      '⚠ 換 types 不改變亂數的**消耗次數**（forcedTypePool 走 pickIndex，一次一顆），',
      '   但抽到不同的人會改變後面的軌跡，所以這仍然不是逐字的配對比較。', ''];
    for (const flat of [false, true]){
      const all = [];
      for (const algo of ['fifo', 'look', 'group'])
        for (const s of SEEDS){
          const b = batches(run(s, { floors: 12, algo, days: 20, flatTypes: flat }));
          if (b['打烊清場']) all.push(...b['打烊清場']);
          await y();
        }
      const rates = all.map(x => x.gone / x.n);
      body.push(`  ${flat ? '全部 size 1  ' : '我的 types   '} ${String(all.length).padStart(3)} 次　` +
        `平均佔位 ${r2(mean(all.map(x => x.eSize)))}　放棄率 中位 ${pc(q(rates, 0.5), 1)}　` +
        `p90 ${pc(q(rates, 0.9), 1)}　最糟 ${pc(Math.max(...rates), 1)}`);
    }
    push('Q1b 那個痛有多少是我選的 types 造成的', body);
  }

  // ---------------------------------------------------------- Q2 小費門檻掃描
  {
    const body = ['sat = 1 - 等待/耐性。門檻越高 = 要越快送到。掃 0.40 / 0.50 / 0.60 / 0.65 / 0.75。',
      '看的是「**多少比例的購物客拿得到**」，不是總金額——金額由 mult 決定，那是另一顆旋鈕。', ''];
    body.push('  門檻    5 層/look   12 層/look   12 層/fifo   40 層/look   100 層/look');
    for (const satv of [0.40, 0.50, 0.60, 0.65, 0.75]){
      const cells = [];
      for (const cfg of [[5,'look'], [12,'look'], [12,'fifo'], [40,'look'], [100,'look']]){
        let tips = 0, loaded = 0;
        for (const s of SEEDS.slice(0, 6)){
          const r = run(s, { floors: cfg[0], algo: cfg[1], days: 20, tipSat: satv });
          tips += r.st.stats.tips || 0; loaded += r.st.codex.loaded || 0;
          await y();
        }
        cells.push(`${pc(tips, loaded)}(${tips}/${loaded})`.padStart(11));
      }
      body.push(`  ${satv.toFixed(2)}  ${cells.join(' ')}`);
    }
    push('Q2 小費門檻掃描：多少比例的購物客拿得到', body);
  }

  // ---------------------------------------------------------- Q3 成就門檻重新回推
  {
    const body = ['一場 = 20 個遊戲日。codex 跨拆樓保留，所以門檻是「幾場」而不是「一場內」。',
      '目標：**兩到三場**。一場就拿得到 = 沒有門檻；十場 = 沒有人會拿到。',
      '八顆種子 × 三種調度（fifo/look/group）的每場中位數：', ''];
    for (const floors of [5, 12, 40, 100]){
      const per = { stroller:[], loaded:[], janitor:[], sampler:[], closing:[], tips:[] };
      for (const algo of ['fifo', 'look', 'group'])
        for (const s of SEEDS){
          const r = run(s, { floors, algo, days: 20 });
          for (const k of ['stroller','loaded','janitor','sampler','closing']) per[k].push(r.st.codex[k] || 0);
          per.tips.push(r.st.stats.tips || 0);
          await y();
        }
      body.push(`— ${floors} 層 —`);
      for (const k in per)
        body.push(`  ${k.padEnd(9)} 中位 ${String(q(per[k], 0.5)).padStart(3)}　平均 ${String(r2(mean(per[k]))).padStart(6)}　` +
                  `範圍 ${Math.min(...per[k])}–${Math.max(...per[k])}`);
      body.push('');
    }
    push('Q3 成就門檻重新回推（含 5 層與 fifo，第一輪漏了）', body);
  }

  return secs;
}
