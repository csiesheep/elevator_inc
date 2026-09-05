// theme.js — 明暗完全由遊戲時間決定，沒有手動切換。
//
// 以前這裡是兩個「主題」，右上角一顆鍵切換。現在它們不是兩個主題，
// 而是同一條時間軸的兩端：dayness(h) 從 0（全夜）到 1（全日），
// 兩張色表之間插值。所以沒有 toggleTheme、沒有 localStorage、沒有那顆按鈕。
//
// 介面的顏色（右邊面板、頂欄）走 CSS 變數，也要跟著時間走——不然畫布是黃昏、
// 面板還停在深夜。那是這件事最容易漏掉的一塊，所以 applyChrome() 就放在這裡，
// 跟 canvas 的色表用同一個 dayness。

// ---------------------------------------------------------------- 時間 → 日照
// 太陽 6 點升、18 點落（sky.js 用同一組數字），所以天光的斜坡要跨在那兩點上：
// 5→7 天亮、17→19.5 天黑，中間是滿的。
export function dayness(h){
  h = ((h % 24) + 24) % 24;
  if (h >= 7 && h < 17) return 1;
  if (h >= 17 && h < 19.5) return 1 - (h - 17) / 2.5;
  if (h >= 5 && h < 7) return (h - 5) / 2;
  return 0;
}

// ---------------------------------------------------------------- canvas 色表
// 兩張表的鍵必須一模一樣，值只能是 #rrggbb 或數字——插值就是逐鍵做。
// 規則：**室外隨時間變，室內不變。**
//
// 以前是整張表都插值，結果兩件事同時發生：樓層底色的乘數從 0.40 盪到 1.95（近四倍），
// 而小人的墨色從淺翻到深。日夜交界時兩邊一起走到中間灰，對比歸零——黃昏和天微亮
// 的時候乘客和數字幾乎看不見。這跟介面 CSS 變數撞到的是同一個病。
//
// 所以：樓層、家具、乘客、數字、轎廂、井道都留在固定（或極小擺盪）的範圍；
// 天空、街道、外牆、屋頂、遠景照舊隨時間走。大樓內部本來就是人工照明的，
// 正午和晚上八點的辦公室看起來差不多。
//
// 唯一往反方向變的是 winLit：天越黑，窗戶越亮。那是該變的。
const NIGHT = {
  floorA: 0.62, floorB: 0.52, stripe: 2.30, floorAlpha: 1,
  furn: 1.42, furnAcc: 2.05, glassK: 1.40,
  night: 1,                                  // 1 = 全夜、0 = 全日。只剩窗戶的燈在用
  winLit: '#ffcf6a',
  numPlate:   '#0d1018',
  slab:       '#1b2130',
  floorNum:   '#c8d0e4', floorNumOn: '#7cc4ff', label: '#9aa4bd',
  shaft:      '#141924', shaftEdge: '#2c313d', shaftExpress: '#c08a3a',
  expressTint:'#f0c04a', expressTintA: 0.08,
  car:        '#e6ecf7', carEdge: '#2a3142', carDoors: '#f0c04a',
  door:       '#8f9db5', carGlass: '#cfdcf0',
  ink:        '#eaf0fb', inkCar: '#12161f',
  heatCool:   '#6d7690', heatWarm: '#f0a04a',
  money:      '#5ddc9a', bad: '#e2645a', warn: '#f0a04a',
  personText: '#eaf0fb', crowdBar: '#8f9ab5', riderBar: '#7f95bd',
  patienceBg: '#232a38',
  // ---- 以下是室外，會隨時間走
  wall:       '#1b2130', wallWin: '#39414f',
  deck:       '#242a38',
  ground:     '#12141c', groundLine: '#2a3040', lamp: '#f0c04a', lampA: 0.95,
  far:        '#1a2030',
  tile:       '#e0a838', tileDark: '#b07d22', tileRidge: '#8a6018',
  tileOrn:    '#ffd23f', tileBrk: '#b8503f',
};
const DAY = {
  // 只有這兩個乘數跟夜間不同：1.26 倍的擺盪，看得出時間但壓不過前景。
  floorA: 0.78, floorB: 0.66, stripe: 2.30, floorAlpha: 1,
  furn: 1.42, furnAcc: 2.05, glassK: 1.40,
  night: 0,
  winLit: '#ffcf6a',
  numPlate:   '#0d1018',
  slab:       '#2a3142',
  floorNum:   '#c8d0e4', floorNumOn: '#7cc4ff', label: '#9aa4bd',
  shaft:      '#141924', shaftEdge: '#2c313d', shaftExpress: '#c08a3a',
  expressTint:'#f0c04a', expressTintA: 0.08,
  car:        '#e6ecf7', carEdge: '#2a3142', carDoors: '#f0c04a',
  door:       '#8f9db5', carGlass: '#cfdcf0',
  ink:        '#eaf0fb', inkCar: '#12161f',
  heatCool:   '#6d7690', heatWarm: '#f0a04a',
  money:      '#5ddc9a', bad: '#e2645a', warn: '#f0a04a',
  personText: '#eaf0fb', crowdBar: '#8f9ab5', riderBar: '#7f95bd',
  patienceBg: '#232a38',
  // ---- 室外
  wall:       '#e6e0d0', wallWin: '#9aa8c0',
  deck:       '#cfd6e2',
  ground:     '#b7ae9c', groundLine: '#8d8676', lamp: '#f0c04a', lampA: 0.15,
  far:        '#b9c7db',
  tile:       '#f2c452', tileDark: '#c9932f', tileRidge: '#9c7020',
  tileOrn:    '#ffe07a', tileBrk: '#cf6250',
};

// ---------------------------------------------------------------- 介面色表
//
// 介面「不」跟著做整套亮暗翻轉，只在深色系裡漂移。兩個理由，都是實測撞到的：
//
//   1. 深色與淺色兩套 UI 做線性插值，文字和背景會在中點相遇——對比歸零，
//      整個面板褪成灰白，字讀不到。日夜交界每次都會經過那個中點。
//   2. 一天只有 180 秒（DAY_SECONDS）。就算解決了對比，介面每 90 秒
//      亮暗翻一次也是災難。
//
// 所以完整的日夜交給畫布（那是世界），介面只跟著呼吸：白天亮一階、暖一點，
// 夜裡沉下來、偏冷。文字永遠是淺色，永遠讀得到。
const CSS_NIGHT = {
  bg:'#0b0d18', panel:'#12142f', card:'#191c3e', line:'#3f4478',
  text:'#e2e6f2', dim:'#7f86c6', money:'#4fd08d', gold:'#f0c04a',
  hi:'#6cc9ee', bad:'#ff8a8a', edge:'#3f4478', drop:'#070819',
  chipBg:'#1d2046', sheet:'#12142f', sheetInk:'#e2e6f2',
};
const CSS_DAY = {
  bg:'#191d33', panel:'#232750', card:'#2a2e58', line:'#5b60a0',
  text:'#f2f4fb', dim:'#a3a9e0', money:'#6ce8a8', gold:'#ffd23f',
  hi:'#8fe0ff', bad:'#ff9d9d', edge:'#5b60a0', drop:'#101228',
  chipBg:'#2f3363', sheet:'#232750', sheetInk:'#f2f4fb',
};

// ---------------------------------------------------------------- 插值
export function mix(a, b, t){
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  let out = 0;
  for (const sh of [16, 8, 0]){
    const ca = (A >> sh) & 255, cb = (B >> sh) & 255;
    out |= Math.round(ca + (cb - ca) * t) << sh;
  }
  return '#' + out.toString(16).padStart(6, '0');
}

function blend(n, d, t){
  const out = {};
  for (const k in n){
    out[k] = typeof n[k] === 'number' ? n[k] + (d[k] - n[k]) * t : mix(n[k], d[k], t);
  }
  return out;
}

// 每幀重算 40 個顏色太浪費，而且肉眼分不出來：把 dayness 量化成 64 階再查快取。
const STEPS = 64;
const cache = new Map();
let cur = 0;

export function setHour(h){ cur = dayness(h); }

export function P(){
  const q = Math.round(cur * STEPS);
  let p = cache.get(q);
  if (!p){ p = blend(NIGHT, DAY, q / STEPS); cache.set(q, p); }
  return p;
}

// ---------------------------------------------------------------- 介面
let chromeAt = -1;
export function applyChrome(h){
  const q = Math.round(dayness(h) * STEPS);
  if (q === chromeAt) return;
  chromeAt = q;
  const s = document.documentElement.style;
  const t = q / STEPS;
  for (const k in CSS_NIGHT) s.setProperty('--' + k, mix(CSS_NIGHT[k], CSS_DAY[k], t));
  // tabOn / tabOnInk 兩個主題本來就同色，不用插值
  document.documentElement.setAttribute('data-theme', t >= 0.5 ? 'day' : 'night');
}
