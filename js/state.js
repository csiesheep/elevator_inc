// state.js — 單一個可序列化的 GameState。無法 JSON.stringify 的東西不准進來。
import { CONFIG as C, UPGRADES, AUTOMATION, SKILLS, ACHIEVEMENTS, DIFFICULTIES,
         defaultTenant, tenantById } from './content.js';

import { t, L } from './i18n.js';

const SAVE_KEY = 'elevator_inc_v1';

export function newGame(carry){
  const st = {
    v: 1,
    cash: C.CASH_START, bp: (carry && carry.bp) || 0,
    rating: C.RATING_START,
    floors: C.FLOORS_START,
    t: 0, day: 0,
    up: {}, auto: {}, skills: (carry && carry.skills) || {},
    codex: (carry && carry.codex) || {},
    achieved: (carry && carry.achieved) || {},
    prestiges: (carry && carry.prestiges) || 0,
    bandsSeen: (carry && carry.bandsSeen) || { retail:true },
    runRevenue: 0, lifetimeRevenue: (carry && carry.lifetimeRevenue) || 0,
    // tips = 收到幾次小費（#25）。舊存檔沒有這一欄，sim.js 那邊是 `(st.stats.tips || 0) + 1`，
    // 所以不會變成 NaN；load() 只補頂層的欄位，不補 stats 裡面的，這是刻意的——
    // 補進去等於幫舊存檔憑空發明一個「他曾經拿過 0 次」的事實，而那本來就是 0。
    stats: { served:0, abandoned:0, trips:0, floorsTravelled:0, boostTime:0, overheats:0,
             tips:0, shafts:[], bestRun:(carry && carry.bestRun) || 0 },
    ending: (carry && carry.ending) || false,
    // 難度（#165）。兩個都是 `DIFFICULTIES` 的**索引**（0 = 普通）。
    //   difficulty        這一輪的難度。拆樓時選（doPrestige 的第二個參數），選了就帶進新的一輪。
    //   difficultyCleared **已經通關的最高一級**；-1 = 一級都還沒通關。
    //                     可以選的是 0 … difficultyCleared + 1（逐級解鎖，不能跳）。
    // 「通關」= 在那個難度上蓋到 `ENDING_FLOOR`（owner 裁決，#165）——**不是發射、不是 `st.ending`**。
    // 判斷在 noteCleared()。兩個都跨拆樓保留（doPrestige 的 carry 明列）。
    difficulty: (carry && carry.difficulty) || 0,
    difficultyCleared: (carry && carry.difficultyCleared != null) ? carry.difficultyCleared : -1,
    roofStyle: (carry && carry.roofStyle) || 'chinese',   // 外觀，跨拆樓保留
    // 跨 Prestige 保留的永久解鎖（自動化的藍圖階段）
    autoPerm: (carry && carry.autoPerm) || {},
    // 「一輪只發生一次」的事件記在這裡（`EVENTS` 的 `once:true`，#134 最後升空第一個用）。
    // **刻意不在 `doPrestige` 的 carry 裡**：那支函式明列要帶走什麼，沒列到的就重置，
    // 而「一輪一次」的意思就是拆樓之後可以再遇到一次。放在 `st` 而不是 `sim`，
    // 因為 `sim` 每次讀檔都重建——放在那裡的話關掉遊戲再打開它就會再發生一次。
    fired: {},
  };
  for (const u of UPGRADES) st.up[u.id] = 0;
  for (const a of AUTOMATION) st.auto[a.id] = !!st.autoPerm[a.id];
  // 地基等級：起始樓層由技能樹決定
  st.floors = Math.min(C.MAX_FLOORS, C.FLOORS_START + 5 * (st.skills.a_floor || 0));
  st.rating = Math.min(C.RATING_MAX, C.RATING_START + 0.3 * (st.skills.a_rate || 0));
  st.t = C.DAY_SECONDS * 8 / 24;   // 從早上 8 點開場，不要一開局就是半夜
  return st;
}

// ------------------------------------------------------------ 樓層帶
// 招商已經取消（owner 裁決）：**蓋好就有人**。沒有空樓層，也沒有入住率。
// 錢坑由加蓋樓層獨力接手，評價只剩下乘數的角色（票價、人流），沒有離散的懲罰。
export function builtInBand(st, b){
  const hi = Math.min(st.floors, b.to);
  return Math.max(0, hi - b.from + 1);
}

// 這一帶的票價／人流倍率。由該帶的 defaultTenant 決定——玩家不再挑租戶。
// 回傳形狀跟招商時代一樣是 { fare, pop, n }，n 現在是「這一帶蓋了幾層」。
// 這是 #1–#7（每種樓層自己的事件與人物）的接縫：之後只換資料來源，不動簽章。
export function tenantMix(st, b){
  const n = builtInBand(st, b);
  const t = n ? tenantById(defaultTenant(b.key)) : null;
  return t ? { fare: t.fare, pop: t.pop, n } : { fare: 1, pop: 1, n: 0 };
}

// ------------------------------------------------------------ 衍生數值
export function derived(st){
  const sk = st.skills, up = st.up;
  const d = {
    cruise:   C.CRUISE_START + 0.40 * up.speed + 0.10 * (sk.m_speed || 0),
    accel:    C.ACC_START    + 0.21333 * up.accel + 0.06 * (sk.m_accel || 0),
    capacity: C.CAP_START    + 2 * up.cap      + 2 * (sk.m_cap || 0),
    door:     Math.max(C.DOOR_MIN, C.DOOR_START - 0.10 * up.door),
    shafts:   1 + up.shaft + (sk.o_shaft || 0),
    heatMax:  6 + 2 * up.cooling + 4 * (sk.m_cool || 0),
    heatCool: 1 + 0.35 * up.cooling + 0.4 * (sk.m_cool || 0),
  };
  if (st.auto.double) d.capacity *= 2;
  // 載客量越大，上下客越久 —— 這是設計 4.6 的取捨，不是懲罰
  d.boardTime = 0.18 * Math.max(0, d.capacity - 4) / 4;
  d.noOverheat = (sk.m_cool || 0) >= 5;
  d.fareMult = (1 + 0.25 * st.rating) * (1 + 0.06 * (sk.o_fare || 0));
  d.ratingGain = 1 + 0.2 * (sk.a_rate || 0);
  // 11 口碑迴圈：評價不只影響票價，也影響「有多少人願意上門」
  d.womMult = C.WOM_MIN + (C.WOM_MAX - C.WOM_MIN) * (st.rating / C.RATING_MAX);
  // 難度（#165）。人流跟 womMult 同一層（sim.js 的 arrivalRate 把兩個一起乘上去），
  // **但分成兩個欄位**：womMult 在頂欄與統計頁印成「口碑對人流」，混進難度那句話就不對了。
  // 人流**只乘到達率，不乘事件機率**（orchestrator 解讀第四點）。耐性那一欄在 sim.js 的產生點讀。
  const diff = difficultyOf(st);
  d.trafficMult = diff.traffic;
  d.incomeMult  = diff.income;
  // 5.6 的 B：事件工具
  d.surgeMult = 1 + 0.18 * (sk.o_surge || 0);               // 事件乘客的票價加給
  d.evacLevel = sk.o_evac || 0;
  d.evacCool  = d.evacLevel ? [0, 90, 70, 50][d.evacLevel] : 0;
  // 6 解除 clamp：人流不再由 min(floors, 40) 決定，改由 sim.js 依「真實樓數 × 每層人口
  // 權重」算出來，所以蓋高樓真的會變忙。
  return d;
}

export function algoName(st){
  if (st.auto.group) return L({ id:'group' }, 'name', 'automation') || '群組控制';
  if (st.auto.dest)  return L({ id:'dest' }, 'name', 'automation') || '目的地控制';
  if (st.auto.look) return 'LOOK';
  if (st.auto.scan) return 'SCAN';
  if (st.auto.fifo) return 'FIFO';
  return t('manual');
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
  // 樓層的上限是 MAX_FLOORS，不是「買了幾段」——深基礎會墊高起始樓層，
  // 只數段數的話點滿技能樹可以蓋到兩百層，天花板等於不存在。
  if (id === 'floor' && st.floors >= C.MAX_FLOORS) return true;
  return st.up[id] >= u.max;
}
export function buyUpgrade(st, id){
  if (upgradeMaxed(st, id)) return false;
  const c = upgradeCost(st, id);
  if (st.cash < c) return false;
  st.cash -= c; st.up[id]++;
  // 加蓋就是把樓蓋起來，沒有第二步。蓋好的那一刻就有人搭電梯。
  if (id === 'floor'){ st.floors = Math.min(C.MAX_FLOORS, st.floors + 5); noteCleared(st); }
  return true;
}

// ------------------------------------------------------------ 難度（#165）
// 這一輪的那一列。索引壞掉（手改的存檔、以後刪掉一級）就退回普通，不要讓乘數變成 undefined → NaN。
export function difficultyOf(st){
  return DIFFICULTIES[st && st.difficulty] || DIFFICULTIES[0];
}
// 這一級現在選不選得到。普通永遠可以；其他要「前一級已經通關」。
export function difficultyUnlocked(st, lv){
  if (!Number.isInteger(lv) || lv < 0 || lv >= DIFFICULTIES.length) return false;
  const cleared = (st && Number.isInteger(st.difficultyCleared)) ? st.difficultyCleared : -1;
  return lv <= cleared + 1;
}
// **「通關」的唯一判斷點**（owner 裁決，#165）：在這一輪的難度上蓋到 ENDING_FLOOR。
// 呼叫點：buyUpgrade('floor')（玩家唯一會碰到的路）與 sim.js 的 step()（其他任何改 st.floors
// 的路，例如除錯鉤子）。只會往上：在普通蓋到 100 樓不會把已經通關的地獄降回去。
// 回傳這一次是不是**新**解鎖了一級（main.js 拿它跳提示）。
export function noteCleared(st){
  if (st.floors < C.ENDING_FLOOR) return false;
  const lv = Number.isInteger(st.difficulty) ? st.difficulty : 0;
  const before = Number.isInteger(st.difficultyCleared) ? st.difficultyCleared : -1;
  if (lv <= before) return false;
  st.difficultyCleared = lv;
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

// 全手動 = 還沒有任何調度演算法。畫面要用這個決定轎廂顯示什麼：
// 手動時你得知道車上的人要去哪（那是你決定點哪層的依據），自動之後那是雜訊。
// 條件跟 sim.js 的 nextTarget() 用的是同一個，不能各寫各的。
export function isManual(st){
  return !st.auto.fifo && !(st.auto.dest || st.auto.group || st.auto.shuttle
                            || st.auto.double || st.auto.skylobby);
}

// ------------------------------------------------------------ Prestige
export function prestigeGain(st){
  return Math.floor(Math.sqrt(st.runRevenue / C.PRESTIGE_DIV));
}
// `difficulty`：下一輪的難度（#165）。省略 = 沿用這一輪的。
// **鎖住的難度回傳 null，而且什麼都不做**（不發藍圖、不重置）——呼叫端要自己處理拒絕。
// 閘在這裡而不是只在 UI：UI 只是不給按，真正不准的是這支函式。
export function doPrestige(st, difficulty){
  const lv = difficulty == null ? (st.difficulty || 0) : difficulty;
  if (!difficultyUnlocked(st, lv)) return null;
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
    difficulty: lv,
    difficultyCleared: st.difficultyCleared,
    roofStyle: st.roofStyle,
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
// `lastSave` 一起拿掉了（#155）：離線收益是它唯一的讀者。留著一個只寫不讀、
// 名字叫 lastSave 的欄位，下一個人會以為開場還有補算。舊存檔帶著這一欄不會炸——
// `load()` 只補「缺的欄位」，多出來的原樣留著、沒有人讀。
export function save(st){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); return true; }
  catch(e){ return false; }
}
export function load(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw);
    if (!st || st.v !== 1) return null;
    migrate(st);
    return st;
  } catch(e){ return null; }
}
// 讀檔的遷移，從 load() 拆出來（#165），驗收才叫得到——`load()` 讀 localStorage，
// 測試去寫玩家的存檔是不行的。行為跟拆出來之前逐字相同，只多了難度那一段。
export function migrate(st){
    // 難度（#165）：**舊存檔沒有 difficultyCleared。** 已經蓋到 100 樓、或已經有 `st.ending` 的，
    // 視為普通已通關（owner 裁決，#165）——他們已經打完這個遊戲了。
    // 要在下面「補齊欄位」**之前**判斷：補完之後就分不出「沒有這一欄」和「-1」了。
    if (!('difficultyCleared' in st))
      st.difficultyCleared = (st.floors >= C.ENDING_FLOOR || st.ending) ? 0 : -1;
    // 補齊新增的欄位，舊存檔不會炸
    const fresh = newGame();
    for (const k in fresh) if (!(k in st)) st[k] = fresh[k];
    for (const u of UPGRADES) if (!(u.id in st.up)) st.up[u.id] = 0;
    for (const a of AUTOMATION) if (!(a.id in st.auto)) st.auto[a.id] = false;
    // 招商取消：舊存檔的 leased 直接丟掉，不遷移也不報錯。已經蓋好的樓層本來就有人，
    // 玩家什麼都不會失去——那些沒招到商的空樓層現在自己會生出乘客。
    delete st.leased;
    // 技能會被移除（#32 拿掉了 o_warn）。舊存檔會帶著一個 SKILLS 裡不存在的 id：
    // 留著它就是一個幽靈——skillCost()／buySkill() 對它會 `s.cost is not a function` 直接炸，
    // 而 UI 只走 SKILLS 迴圈所以永遠不會顯示它。這裡逐一丟掉，跟上面 leased 同一種處理。
    // **藍圖不退。** 退幾張是平衡決定（整棵樹因此便宜 20 張），不是載入程式可以自己決定的。
    if (st.skills && typeof st.skills === 'object'){
      const known = new Set(SKILLS.map(s => s.id));
      for (const k in st.skills) if (!known.has(k)) delete st.skills[k];
    }
    return st;
}
export function wipe(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }

// 離線收益（`applyOffline`）在 #155 整支拿掉了：**關掉分頁就不再賺錢**。
// 連帶消失的有 `CONFIG.OFFLINE_CAP_H` / `OFFLINE_RATE`、i18n 的 offlineTitle／Body／Btn
// 與 hours／minutes、以及 `st.lastSave`。驗收在 `tests/acceptance.js` 第 27 組。
