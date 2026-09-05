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
const NIGHT = {
  floorA: 0.50, floorB: 0.40, stripe: 2.05, floorAlpha: 1,
  // 家具相對於樓層帶顏色的倍率。暗底上家具要更亮，亮底上要更暗，
  // 所以這兩個數字在兩張表裡是反過來的。
  furn: 1.95, furnAcc: 2.90, glassK: 1.50,
  night: 1,                                  // 1 = 全夜、0 = 全日。插值出來就是「現在多暗」
  winLit: '#ffcf6a',                         // 夜裡窗戶的燈色
  slab:       '#1b2130',                     // 樓板：每層之間那道縫
  empty:      '#1e222a', emptyAlpha: 0.85,
  emptyHatch: '#788296', emptyHatchA: 0.16,
  floorNum:   '#7c8499', floorNumOn: '#7cc4ff', label: '#8d97ae',
  shaft:      '#161a22', shaftEdge: '#2c313d', shaftExpress: '#c08a3a',
  expressTint:'#f0c04a', expressTintA: 0.06,
  car:        '#20242e', carEdge: '#3d4557', carDoors: '#f0c04a',
  door:       '#39404f', carGlass: '#171c2f',
  ink:        '#cfd6e6', inkCar: '#eef2fb',
  heatCool:   '#6d7690', heatWarm: '#f0a04a',
  money:      '#5ddc9a', bad: '#e2645a', warn: '#f0a04a',
  personText: '#cfd6e6', crowdBar: '#7f89a3', riderBar: '#8fa4c8',
  patienceBg: '#2a2f3b',
  wall:       '#1b2130', wallWin: '#39414f',  // 外牆與牆上的窗
  deck:       '#242a38',                      // 屋頂平台
  ground:     '#12141c', groundLine: '#2a3040', lamp: '#f0c04a', lampA: 0.95,
  far:        '#1a2030',                      // 遠景城市剪影
  tile:       '#e0a838', tileDark: '#b07d22', tileRidge: '#8a6018',
  tileOrn:    '#ffd23f', tileBrk: '#b8503f',
};
const DAY = {
  // 亮版的樓層底色不再是平塗米白：那會讓七個樓層帶全部糊成一片灰
  // （100 層時左緣色條只有 6px，撐不起分帶）。改成把帶色拉亮成粉彩。
  floorA: 1.95, floorB: 1.72, stripe: 1.15, floorAlpha: 1,
  furn: 0.78, furnAcc: 0.55, glassK: 1.25,
  night: 0,
  winLit: '#ffcf6a',
  slab:       '#b9bfd0',
  empty:      '#d6cebc', emptyAlpha: 0.9,
  emptyHatch: '#16183a', emptyHatchA: 0.14,
  floorNum:   '#6a6480', floorNumOn: '#1f6fd0', label: '#5c5f8a',
  shaft:      '#c3d2e6', shaftEdge: '#16183a', shaftExpress: '#c08a3a',
  expressTint:'#f0c04a', expressTintA: 0.14,
  car:        '#eef3fb', carEdge: '#16183a', carDoors: '#ffd23f',
  door:       '#9fb3cf', carGlass: '#dbe7f7',
  ink:        '#16183a', inkCar: '#16183a',
  heatCool:   '#8a93b5', heatWarm: '#ff9d2e',
  money:      '#12915f', bad: '#d63b3b', warn: '#d97a06',
  personText: '#16183a', crowdBar: '#5c5f8a', riderBar: '#2f6fd0',
  patienceBg: '#c9c0ab',
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
