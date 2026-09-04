// content.js — 全部的內容都是資料。邏輯不准寫死任何一項。
// 這裡改數字 = 調平衡；這裡加一筆 = 加內容。

export const CONFIG = {
  FLOORS_START:   10,
  CRUISE_START:   1.0,    // 樓/秒
  ACC_START:      0.5,    // 樓/秒^2
  CAP_START:      4,
  DOOR_START:     2.0,    // 秒（開 0.4 + 停 + 關 0.4）
  DOOR_MIN:       0.6,
  SPAWN_START:    6.5,    // 秒/人（10 樓時）
  FARE_BASE:      1,      // $ / 樓層差
  STEP:           1/60,
  DAY_SECONDS:    180,    // 一天 = 3 分鐘
  SIM_FLOORS:     40,     // 超過這層改用統計流量模型（見 4.13）
  BOOST_MULT:     1.8,
  HEAT_PER_SEC:   1.0,    // 超速時每秒累積
  OVERHEAT_LOCK:  8.0,    // 過熱停機秒數
  RATING_START:   3.0,
  RATING_MAX:     5.0,
  RATING_MIN:     0.8,    // 評價有地板，避免死亡螺旋
  SAVE_EVERY:     15,
  OFFLINE_CAP_H:  4,
  OFFLINE_RATE:   0.5,
  PRESTIGE_FLOOR: 60,     // 開放拆樓的門檻
  PRESTIGE_DIV:   1e6,    // 藍圖 = floor(sqrt(本輪總收入 / 這個數))
  ENDING_FLOOR:   200,
};

// ---------------------------------------------------------------- 現金升級
// 五個屬性互相牽制，沒有一個是「全面更好」的（設計 4.6）
export const UPGRADES = [
  { id:'speed',   name:'巡航速度',   icon:'⬆',  base:60,    growth:1.12, max:40,
    detail:'+0.15 樓/秒', hint:'長程變快，短程幾乎沒感覺' },
  { id:'accel',   name:'加速度',     icon:'⚡', base:70,    growth:1.12, max:40,
    detail:'+0.08 樓/秒²', hint:'短程變快，長程幾乎沒感覺' },
  { id:'cap',     name:'載客量',     icon:'👥', base:50,    growth:1.14, max:16,
    detail:'+2 人',        hint:'一趟載更多，但上下客時間變長' },
  { id:'door',    name:'開關門',     icon:'🚪', base:80,    growth:1.13, max:12,
    detail:'-0.12 秒',     hint:'站數多才划算' },
  { id:'cooling', name:'散熱',       icon:'❄',  base:150,   growth:1.16, max:12,
    detail:'+2 熱容量 / 冷卻加快', hint:'讓超速撐更久' },
  { id:'shaft',   name:'加一座電梯井', icon:'🛗', base:1400, growth:1.95, max:5,
    detail:'+1 井',        hint:'最貴，而且要有調度演算法才發揮得出來' },
  { id:'floor',   name:'加蓋 5 層',  icon:'🏗', base:200,  growth:1.22, max:38,
    detail:'+5 樓',        hint:'樓越高，單趟票價越高' },
];

// ---------------------------------------------------------------- 自動化階梯
// 電梯調度是真的電腦科學問題，每一階都真的改變電梯行為（設計 4.8）
export const AUTOMATION = [
  { id:'autodoor', name:'自動關門', cur:'cash', cost:120,
    plain:'門會自己關。你不用再點一下叫它走。',
    tech:'解除手動關門' },
  { id:'fifo', name:'FIFO 調度', cur:'cash', cost:450,
    plain:'誰先按誰先服務。笨，但你終於不用一直點了。',
    tech:'先進先出佇列' },
  { id:'scan', name:'SCAN 演算法', cur:'cash', cost:1600,
    plain:'像掃描線一樣掃到頂、再掃到底，沿路順便接人。',
    tech:'單向掃掠，到端點才折返' },
  { id:'look', name:'LOOK 演算法', cur:'cash', cost:4200,
    plain:'掃到「最遠的那個請求」就折返，不跑沒人的空段。',
    tech:'SCAN + 提前折返，省掉空跑' },
  { id:'dest', name:'目的地控制', cur:'bp', cost:2,
    plain:'乘客在大廳就先輸入目的地，系統把去同方向的人分到同一台。',
    tech:'Destination Dispatch：上客時只收同方向，停靠次數大減' },
  { id:'group', name:'群組控制', cur:'bp', cost:4,
    plain:'多座電梯井不再各自為政，會挑「最快到得了」的那台去接。',
    tech:'以 ETA 估計指派 hall call' },
  { id:'shuttle', name:'快速電梯', cur:'bp', cost:6,
    plain:'指定最後一座井當快車，只跑高樓層，不再被低樓瑣事拖住。',
    tech:'Shuttle：限制服務區間' },
  { id:'double', name:'雙層轎廂', cur:'bp', cost:10,
    plain:'一台車兩層樓，一次服務兩個樓層。',
    tech:'Double-decker：載客量 ×2，同時服務 f 與 f+1' },
  { id:'skylobby', name:'空中大廳', cur:'bp', cost:16,
    plain:'半空中蓋一個轉運大廳。真實摩天樓就是這樣才蓋得上去的。',
    tech:'Sky Lobby：高樓層行程從大廳起算，超高樓吞吐量 ×3' },
];

// ---------------------------------------------------------------- 乘客類型
// fare = 票價倍率, patience = 耐性秒數, size = 佔幾格
export const PASSENGERS = [
  { id:'office',   name:'上班族', fare:1.0, patience:46, size:1, w:100, band:'any',
    note:'量最大。尖峰時段會暴增。' },
  { id:'tourist',  name:'觀光客', fare:1.6, patience:82, size:1, w:22,  band:'any',
    doorPenalty:1.2, note:'一直拍照，開門時間 +1.2 秒。' },
  { id:'courier',  name:'送貨員', fare:2.4, patience:56, size:2, w:20,  band:'any',
    note:'推車佔 2 格空間。' },
  { id:'guard',    name:'保全',   fare:0,   patience:999, size:1, w:10, band:'any',
    rating:0.06, note:'不付錢，但巡邏會提升大樓評價。' },
  { id:'ceo',      name:'CEO',    fare:8.0, patience:17, size:1, w:5,   band:'office',
    angry:2.5, note:'極高單價、極沒耐性。讓他等會重扣評價。' },
  { id:'cat',      name:'貓',     fare:0,   patience:90, size:1, w:3,   band:'any',
    rating:0.25, rare:true, note:'不付錢。純粹提升評價。稀有。' },
  { id:'ghost',    name:'幽靈',   fare:0,   patience:999, size:0, w:2,  band:'floor13',
    ghost:true, rare:true, note:'只在 13 樓出現。載到它會掉落一筆意外之財。' },
  { id:'mover',    name:'搬家公司', fare:6.0, patience:33, size:4, w:6, band:'resid',
    note:'幾乎塞滿整台電梯。' },
  { id:'guest',    name:'房客',   fare:2.2, patience:52, size:2, w:30,  band:'hotel',
    note:'帶行李，佔 2 格。飯店層專屬。' },
  { id:'resident', name:'住戶',   fare:1.3, patience:64, size:1, w:34,  band:'resid',
    note:'常客，耐性好。住宅層專屬。' },
  { id:'observer', name:'觀景客', fare:3.2, patience:76, size:1, w:30,  band:'obs',
    note:'成群結隊往觀景台衝。' },
  { id:'scientist',name:'研究員', fare:5.0, patience:29, size:1, w:26,  band:'exp',
    note:'實驗樓層專屬。趕時間，而且不解釋在趕什麼。' },
];

// ---------------------------------------------------------------- 樓層類型（進度軸）
export const BANDS = [
  { key:'retail', from:1,   to:10,  name:'零售',     color:'#3a4a63', tier:1.0, unlock:'基礎流量' },
  { key:'office', from:11,  to:30,  name:'辦公',     color:'#3f5a52', tier:1.5, unlock:'尖峰時段：早上 9 點與傍晚 6 點暴衝' },
  { key:'hotel',  from:31,  to:60,  name:'飯店',     color:'#5c4a3a', tier:2.2, unlock:'行李（佔位）與夜間流量' },
  { key:'resid',  from:61,  to:100, name:'住宅',     color:'#4a3f5c', tier:3.0, unlock:'常客、搬家公司' },
  { key:'obs',    from:101, to:150, name:'觀景台',   color:'#3a5570', tier:4.0, unlock:'觀光客潮' },
  { key:'exp',    from:151, to:199, name:'實驗樓層', color:'#5c3a4a', tier:5.5, unlock:'研究員與破壞平衡的東西' },
  { key:'roof',   from:200, to:9999,name:'屋頂→軌道', color:'#2f4f6b', tier:7.0, unlock:'結局' },
];

export const bandOf = f => BANDS.find(b => f >= b.from && f <= b.to) || BANDS[0];
export const tierAt = f => bandOf(Math.round(f)).tier || 1;

// ---------------------------------------------------------------- 技能樹（藍圖，跨 Prestige）
export const SKILLS = [
  // 機械
  { id:'m_speed', branch:'機械', name:'高張力鋼纜',   max:10, cost:l=>1+l,      detail:'起始巡航速度 +0.10' },
  { id:'m_accel', branch:'機械', name:'線性馬達',     max:10, cost:l=>1+l,      detail:'起始加速度 +0.06' },
  { id:'m_cap',   branch:'機械', name:'加大轎廂',     max:8,  cost:l=>2+l,      detail:'起始載客量 +2' },
  { id:'m_cool',  branch:'機械', name:'超導馬達',     max:5,  cost:l=>3+l*2,    detail:'熱容量 +4、冷卻 +40%（滿級等於拿掉過熱機制）' },
  // 營運
  { id:'o_shaft', branch:'營運', name:'預留井道',     max:3,  cost:l=>6+l*6,    detail:'起始電梯井 +1' },
  { id:'o_algo',  branch:'營運', name:'控制器韌體',   max:4,  cost:l=>3+l*2,    detail:'演算法效率 +8%（吞吐量與抽象樓層收益）' },
  { id:'o_fare',  branch:'營運', name:'動態票價',     max:8,  cost:l=>2+l,      detail:'所有票價 +6%' },
  // 建築
  { id:'a_floor', branch:'建築', name:'深基礎',       max:10, cost:l=>2+l,      detail:'起始樓層 +10' },
  { id:'a_cost',  branch:'建築', name:'預鑄工法',     max:6,  cost:l=>3+l*2,    detail:'加蓋樓層成本 -10%（相乘）' },
  { id:'a_rate',  branch:'建築', name:'招商部門',     max:6,  cost:l=>2+l,      detail:'起始評價 +0.3、評價上升快 20%' },
];

// ---------------------------------------------------------------- 成就
export const ACHIEVEMENTS = [
  { id:'first',    name:'第一趟',       test:s=>s.stats.served>=1,        note:'送到第一個人。' },
  { id:'hundred',  name:'百人斬',       test:s=>s.stats.served>=100,      note:'送達 100 人。' },
  { id:'auto',     name:'它自己會跑了', test:s=>s.auto.fifo,              note:'買下第一個調度演算法。' },
  { id:'look',     name:'不跑空段',     test:s=>s.auto.look,              note:'解鎖 LOOK 演算法。' },
  { id:'five',     name:'五星大樓',     test:s=>s.rating>=4.9,            note:'評價衝到 5.0。' },
  { id:'ghost',    name:'十三樓的東西', test:s=>!!s.codex.ghost,          note:'載到幽靈。' },
  { id:'cat',      name:'貓派',         test:s=>!!s.codex.cat,            note:'載到貓。' },
  { id:'demo',     name:'打掉重蓋',     test:s=>s.prestiges>=1,           note:'第一次拆樓。' },
  { id:'sky',      name:'空中大廳',     test:s=>s.auto.skylobby,          note:'蓋出轉運大廳。' },
  { id:'tall',     name:'一百層',       test:s=>s.floors>=100,            note:'蓋到 100 層。' },
  { id:'orbit',    name:'離開大氣層',   test:s=>s.ending,                 note:'把電梯開出地球。' },
];
