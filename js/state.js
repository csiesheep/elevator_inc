// state.js — 單一個可序列化的 GameState。無法 JSON.stringify 的東西不准進來。
import { CONFIG as C, UPGRADES, AUTOMATION, SKILLS, ACHIEVEMENTS, BANDS, bandOf,
         TENANTS, tenantsFor, defaultTenant, tenantById } from './content.js';

const SAVE_KEY = 'elevator_inc_v1';

export function newGame(carry){
  const st = {
    v: 1,
    cash: 0, bp: (carry && carry.bp) || 0,
    rating: C.RATING_START,
    floors: C.FLOORS_START,
    t: 0, day: 0,
    up: {}, auto: {}, skills: (carry && carry.skills) || {},
    codex: (carry && carry.codex) || {},
    achieved: (carry && carry.achieved) || {},
    prestiges: (carry && carry.prestiges) || 0,
    bandsSeen: (carry && carry.bandsSeen) || { retail:true },
    runRevenue: 0, lifetimeRevenue: (carry && carry.lifetimeRevenue) || 0,
    stats: { served:0, abandoned:0, trips:0, floorsTravelled:0, boostTime:0, overheats:0,
             shafts:[], abstractEarned:0, bestRun:(carry && carry.bestRun) || 0 },
    ending: (carry && carry.ending) || false,
    lastSave: Date.now(),
    // 跨 Prestige 保留的永久解鎖（自動化的藍圖階段）
    autoPerm: (carry && carry.autoPerm) || {},
  };
  for (const u of UPGRADES) st.up[u.id] = 0;
  for (const a of AUTOMATION) st.auto[a.id] = !!st.autoPerm[a.id];
  // 地基等級：起始樓層由技能樹決定
  st.floors = C.FLOORS_START + 10 * (st.skills.a_floor || 0);
  st.rating = Math.min(C.RATING_MAX, C.RATING_START + 0.3 * (st.skills.a_rate || 0));
  st.t = C.DAY_SECONDS * 8 / 24;   // 從早上 8 點開場，不要一開局就是半夜
  st.leased = {};
  fillLease(st);                   // 起始的樓層一開始就有租戶，之後蓋的才要招商
  return st;
}

// ------------------------------------------------------------ 10 入住率
// 樓蓋好不等於有人。每個樓層帶記「已招商幾層」，空的樓層不會產生任何乘客。
export function builtInBand(st, b){
  const hi = Math.min(st.floors, b.to);
  return Math.max(0, hi - b.from + 1);
}
// st.leased[bandKey] = { tenantId: 幾層 }
export function bandLeases(st, b){
  const v = st.leased && st.leased[b.key];
  return (v && typeof v === 'object') ? v : {};
}
export function leasedInBand(st, b){
  const m = bandLeases(st, b);
  let n = 0; for (const k in m) n += m[k] || 0;
  return Math.min(n, builtInBand(st, b));
}
export function tenantCount(st, b, id){ return bandLeases(st, b)[id] || 0; }

// 這一帶的租戶組合平均出來的票價／人流倍率（樓層在模型裡是可互換的，所以取平均）
export function tenantMix(st, b){
  const m = bandLeases(st, b);
  let n = 0, fare = 0, pop = 0;
  for (const id in m){
    const t = tenantById(id); const c = m[id] || 0;
    if (!t || !c) continue;
    n += c; fare += t.fare * c; pop += t.pop * c;
  }
  return n ? { fare: fare / n, pop: pop / n, n } : { fare: 1, pop: 1, n: 0 };
}
export function occOf(st, b){
  const built = builtInBand(st, b);
  return built ? leasedInBand(st, b) / built : 0;
}
export function leasedTotal(st){
  let n = 0; for (const b of BANDS) n += leasedInBand(st, b); return n;
}
// 某一層（0-based）有沒有租戶？大廳永遠算有。
export function isLeased(st, f){
  if (f <= 0) return true;
  const b = bandOf(f + 1);
  return (f + 1) - b.from < leasedInBand(st, b);
}
export function leaseCost(st, b, tenantId){
  const t = tenantById(tenantId || defaultTenant(b.key));
  const mult = t ? (0.55 + 0.45 * t.fare + 0.25 * t.pop) : 1;   // 好租戶要花錢搶
  return Math.ceil(C.LEASE_BASE * (b.tier || 1) * mult * Math.pow(C.LEASE_GROWTH, leasedTotal(st)));
}
export function canLease(st, b){ return leasedInBand(st, b) < builtInBand(st, b); }
// 評價太差就招不到新租戶——比「趕走已經付過錢的租戶」溫和，但一樣擋住成長
export function leaseBlocked(st){ return st.rating < C.LEASE_BLOCK; }
export function buyLease(st, key, tenantId){
  const b = BANDS.find(x => x.key === key);
  if (!b || !canLease(st, b) || leaseBlocked(st)) return false;
  const id = tenantId || defaultTenant(key);
  const t = tenantById(id);
  if (!t || !t.bands.includes(key)) return false;
  const c = leaseCost(st, b, id);
  if (st.cash < c) return false;
  st.cash -= c;
  const m = st.leased[key] = bandLeases(st, b);
  m[id] = (m[id] || 0) + 1;
  return true;
}
// 把已蓋好的樓層全部標成已招商（開局與舊存檔轉換用）
export function fillLease(st){
  st.leased = st.leased || {};
  for (const b of BANDS){
    const built = builtInBand(st, b);
    st.leased[b.key] = built ? { [defaultTenant(b.key)]: built } : {};
  }
}
// 舊存檔的 leased 是純數字，轉成租戶表
export function migrateLeases(st){
  if (!st.leased) return;
  for (const b of BANDS){
    const v = st.leased[b.key];
    if (typeof v === 'number') st.leased[b.key] = v ? { [defaultTenant(b.key)]: v } : {};
    else if (!v) st.leased[b.key] = {};
  }
}

// ------------------------------------------------------------ 衍生數值
export function derived(st){
  const sk = st.skills, up = st.up;
  const d = {
    cruise:   C.CRUISE_START + 0.15 * up.speed + 0.10 * (sk.m_speed || 0),
    accel:    C.ACC_START    + 0.08 * up.accel + 0.06 * (sk.m_accel || 0),
    capacity: C.CAP_START    + 2 * up.cap      + 2 * (sk.m_cap || 0),
    door:     Math.max(C.DOOR_MIN, C.DOOR_START - 0.12 * up.door),
    shafts:   1 + up.shaft + (sk.o_shaft || 0),
    heatMax:  6 + 2 * up.cooling + 4 * (sk.m_cool || 0),
    heatCool: 1 + 0.35 * up.cooling + 0.4 * (sk.m_cool || 0),
  };
  if (st.auto.double) d.capacity *= 2;
  // 載客量越大，上下客越久 —— 這是設計 4.6 的取捨，不是懲罰
  d.boardTime = 0.18 * Math.max(0, d.capacity - 4) / 4;
  d.noOverheat = (sk.m_cool || 0) >= 5;
  d.fareMult = (1 + 0.25 * st.rating) * (1 + 0.06 * (sk.o_fare || 0));
  d.algoEff  = algoEfficiency(st) * (1 + 0.08 * (sk.o_algo || 0));
  d.ratingGain = 1 + 0.2 * (sk.a_rate || 0);
  // 11 口碑迴圈：評價不只影響票價，也影響「有多少人願意上門」
  d.womMult = C.WOM_MIN + (C.WOM_MAX - C.WOM_MIN) * (st.rating / C.RATING_MAX);
  // 5.6 的 B：事件工具
  d.warnLead  = 8 * (sk.o_warn || 0);                       // 提前幾秒預告
  d.surgeMult = 1 + 0.18 * (sk.o_surge || 0);               // 事件乘客的票價加給
  d.evacLevel = sk.o_evac || 0;
  d.evacCool  = d.evacLevel ? [0, 90, 70, 50][d.evacLevel] : 0;
  // 6 解除 clamp：人流不再由 min(floors, 40) 決定，改由 sim.js 依「真實樓數 × 每層人口
  // 權重」算出來，所以蓋高樓真的會變忙。
  return d;
}

// 演算法效率：既影響統計流量模型，也是統計頁上「誰在偷懶」的指標基準
export function algoEfficiency(st){
  let e = 0.35;                       // 純手動
  if (st.auto.autodoor) e = 0.45;
  if (st.auto.fifo)     e = 0.60;
  if (st.auto.scan)     e = 0.75;
  if (st.auto.look)     e = 0.90;
  if (st.auto.dest)     e *= 1.25;
  if (st.auto.group)    e *= 1.20;
  if (st.auto.shuttle)  e *= 1.15;
  if (st.auto.double)   e *= 1.30;
  if (st.auto.skylobby) e *= 1.40;
  return e;
}

export function algoName(st){
  if (st.auto.dest || st.auto.group) return st.auto.group ? '群組控制' : '目的地控制';
  if (st.auto.look) return 'LOOK';
  if (st.auto.scan) return 'SCAN';
  if (st.auto.fifo) return 'FIFO';
  return '手動';
}

// ------------------------------------------------------------ 成本
export function upgradeCost(st, id){
  const u = UPGRADES.find(x => x.id === id);
  const n = st.up[id];
  let c = u.base * Math.pow(u.growth, n);
  if (id === 'floor') c *= Math.pow(0.90, st.skills.a_cost || 0);
  return Math.ceil(c);
}
export function upgradeMaxed(st, id){
  const u = UPGRADES.find(x => x.id === id);
  return st.up[id] >= u.max;
}
export function buyUpgrade(st, id){
  if (upgradeMaxed(st, id)) return false;
  const c = upgradeCost(st, id);
  if (st.cash < c) return false;
  st.cash -= c; st.up[id]++;
  if (id === 'floor'){
    st.floors += 5;
    // 建商會先幫你租掉幾層（錨定租戶），剩下的要自己招商
    let left = C.ANCHOR_LEASE;
    for (const b of BANDS){
      if (left <= 0) break;
      const room = builtInBand(st, b) - leasedInBand(st, b);
      if (room <= 0) continue;
      const take = Math.min(room, left);
      const m = st.leased[b.key] = bandLeases(st, b);
      const id = defaultTenant(b.key);
      m[id] = (m[id] || 0) + take;
      left -= take;
    }
  }
  return true;
}

export function buyAutomation(st, id){
  const a = AUTOMATION.find(x => x.id === id);
  if (st.auto[id]) return false;
  if (a.cur === 'cash'){ if (st.cash < a.cost) return false; st.cash -= a.cost; }
  else                 { if (st.bp   < a.cost) return false; st.bp   -= a.cost; st.autoPerm[id] = true; }
  st.auto[id] = true;
  return true;
}

export function skillCost(st, id){
  const s = SKILLS.find(x => x.id === id);
  return s.cost(st.skills[id] || 0);
}
export function buySkill(st, id){
  const s = SKILLS.find(x => x.id === id);
  const lv = st.skills[id] || 0;
  if (lv >= s.max) return false;
  const c = skillCost(st, id);
  if (st.bp < c) return false;
  st.bp -= c; st.skills[id] = lv + 1;
  return true;
}

// ------------------------------------------------------------ Prestige
export function prestigeGain(st){
  return Math.floor(Math.sqrt(st.runRevenue / C.PRESTIGE_DIV));
}
export function canPrestige(st){
  return st.floors >= C.PRESTIGE_FLOOR && prestigeGain(st) >= 1;
}
export function doPrestige(st){
  const gain = prestigeGain(st);
  const carry = {
    bp: st.bp + gain,
    skills: st.skills,
    codex: st.codex,
    achieved: st.achieved,
    prestiges: st.prestiges + 1,
    bandsSeen: st.bandsSeen,
    lifetimeRevenue: st.lifetimeRevenue,
    bestRun: Math.max(st.stats.bestRun, st.runRevenue),
    autoPerm: st.autoPerm,
    ending: st.ending,
  };
  return { st: newGame(carry), gain };
}

// ------------------------------------------------------------ 成就
export function checkAchievements(st, onUnlock){
  for (const a of ACHIEVEMENTS){
    if (!st.achieved[a.id] && a.test(st)){
      st.achieved[a.id] = true;
      onUnlock && onUnlock(a);
    }
  }
}

// ------------------------------------------------------------ 存讀檔
export function save(st){
  st.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); return true; }
  catch(e){ return false; }
}
export function load(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw);
    if (!st || st.v !== 1) return null;
    // 補齊新增的欄位，舊存檔不會炸
    const fresh = newGame();
    for (const k in fresh) if (!(k in st)) st[k] = fresh[k];
    for (const u of UPGRADES) if (!(u.id in st.up)) st.up[u.id] = 0;
    for (const a of AUTOMATION) if (!(a.id in st.auto)) st.auto[a.id] = false;
    if (!st.leased) fillLease(st); else migrateLeases(st);   // 舊存檔相容
    return st;
  } catch(e){ return null; }
}
export function wipe(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }

// 離線收益：用平均流量 × 時間直接算，絕不重跑模擬（設計 4.13）
export function applyOffline(st){
  const now = Date.now();
  const secs = Math.max(0, (now - (st.lastSave || now)) / 1000);
  const capped = Math.min(secs, C.OFFLINE_CAP_H * 3600);
  if (capped < 60) return null;
  const rate = st.stats.avgRate || 0;
  const earned = Math.floor(rate * capped * C.OFFLINE_RATE);
  if (earned <= 0) return null;
  st.cash += earned; st.runRevenue += earned; st.lifetimeRevenue += earned;
  return { secs: capped, earned };
}
