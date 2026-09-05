// roof.js — 大樓頂上的屋頂。五種樣式，同一個高度、同一個寬度，樓體完全不變。
//
// 為什麼是「逐欄剖面」而不是粗格子的像素圖：
// 屋頂只有 10–18px 高、卻有 400–500px 寬。用 49×12 那種手排格子去畫，
// 每一格會被拉成 10×1 的長條——那不是像素藝術，是模糊的色帶。
// 所以這裡是 1px 解析度：每一欄自己算 top/bot，畫出來的每一個點就是螢幕上
// 真的一個像素。曲線（圓頂、反宇）在這個尺度下也才有機會成立。
//
// 高度是共用的。以前依樓層數分三段大／中／小，砍成一半之後三段會全部撞到
// 下限、變成同一個數字，那個階梯就沒有意義了。

import { P, mix } from './theme.js';

const H_FRAC = 0.026, H_MIN = 10, H_MAX = 18;
const OVER = 0.035;                      // 屋簷比牆面出挑多少（佔大樓寬）

export function roofHeight(buildingW){
  return Math.round(Math.max(H_MIN, Math.min(H_MAX, buildingW * H_FRAC)));
}

// ---------------------------------------------------------------- 顏色
// 每個角色兩個值：[夜, 日]。用 pal.night 插值，屋頂才會跟著天色走。
const COLORS = {
  chinese: { body:['#e0a838','#f2c452'], shade:['#b07d22','#c9932f'],
             ridge:['#8a6018','#9c7020'], trim:['#ffd23f','#ffe07a'], deep:['#b8503f','#cf6250'] },
  roman:   { body:['#d9d2be','#f0ebdc'], shade:['#a89f88','#cfc7b0'],
             ridge:['#8c8370','#b0a892'], trim:['#efe9d8','#ffffff'], deep:['#6f6857','#948b76'] },
  deco:    { body:['#c9c3b4','#e6e0cf'], shade:['#9a9484','#c0b9a6'],
             ridge:['#7a7566','#a19a88'], trim:['#e0a838','#ffd23f'], deep:['#5f5b50','#87806f'] },
  gothic:  { body:['#8a91a4','#b9c0d0'], shade:['#646b7e','#8d95a8'],
             ridge:['#4a5064','#6b7286'], trim:['#c8cfe0','#eef2fa'], deep:['#383d4e','#5a6074'] },
  islamic: { body:['#2f9e97','#48c2ba'], shade:['#237a75','#379a93'],
             ridge:['#1a5a56','#2a7d78'], trim:['#e0a838','#ffd23f'], deep:['#c9bda0','#efe6cf'] },
};

export const STYLES = [
  { id:'chinese', name:'中式歇山頂',   en:'Chinese hip-and-gable' },
  { id:'roman',   name:'古羅馬山牆',   en:'Roman pediment' },
  { id:'deco',    name:'裝飾藝術階梯冠', en:'Art Deco crown' },
  { id:'gothic',  name:'哥德尖塔群',   en:'Gothic spires' },
  { id:'islamic', name:'伊斯蘭圓頂',   en:'Islamic domes' },
];

// ---------------------------------------------------------------- 剖面
// 每個樣式把角色字元填進 W×h 的格子；'.'= 透明。
// b=本體 s=陰影 r=脊/暗邊 t=亮邊/裝飾 d=深色重點

// 重複的細節（斗拱、齒飾、凹槽、城垛、拱廊）間距一律用「屋頂寬度的幾分之一」，
// 不能寫死像素數：屋頂有 500~760px 寬，固定間距會讓它們全部糊成一排梳齒。
const pitch = (W, n) => Math.max(6, Math.round(W / n));

function blank(W, h){ return Array.from({ length: h }, () => new Array(W).fill('.')); }
function vspan(g, x, a, b, ch){
  for (let y = Math.max(0, Math.round(a)); y <= Math.min(g.length - 1, Math.round(b)); y++) g[y][x] = ch;
}

// --- 1 中式歇山頂：反宇（屋面凹曲）+ 翼角起翹 + 正脊鴟吻 + 斗拱
function chinese(W, h){
  const g = blank(W, h);
  const cx = (W - 1) / 2, ridge = 0.15, flare = 0.10;
  const brk = h - 1;                       // 最後一列留給斗拱
  for (let x = 0; x < W; x++){
    const d = Math.abs(x - cx) / cx;
    let top;
    if (d <= ridge) top = 0;
    else {
      // 指數 < 1：靠正脊掉得快（陡）、靠屋簷變平。這就是反宇。
      const u = (d - ridge) / (1 - ridge);
      top = Math.pow(u, 0.62) * (brk - 2);
    }
    // 翼角起翹：最外側往上抬，上下緣一起抬才不會斷
    const lift = d > 1 - flare ? Math.pow((d - (1 - flare)) / flare, 1.5) * (h * 0.3) : 0;
    const bot = brk - 1 - lift;
    top = Math.min(top - lift * 0.8, bot);
    vspan(g, x, top, bot, 'b');
    const t = Math.round(Math.max(0, top));
    if (t <= bot) g[t][x] = d <= ridge ? 'r' : 't';          // 正脊壓深、屋面邊緣提亮
    const mid = Math.round((top + bot) / 2);
    if (mid > t && mid < bot) g[mid][x] = 's';               // 一道瓦壟
  }
  // 鴟吻：正脊兩端各一個
  for (const s of [-1, 1]){
    const x = Math.round(cx + s * ridge * cx);
    for (let dx = -1; dx <= 1; dx++) vspan(g, x + dx, 0, 1, 't');
  }
  // 斗拱：屋簷下一排朱紅
  const bp = pitch(W, 26), bw2 = Math.max(3, Math.round(bp * 0.45));
  for (let x = bp; x < W - bp; x += bp)
    for (let dx = 0; dx < bw2 && x + dx < W; dx++) g[brk][x + dx] = 'd';
  return g;
}

// --- 2 古羅馬山牆：三角山牆 + 額枋 + 齒飾 + 簷口
function roman(W, h){
  const g = blank(W, h);
  const cx = (W - 1) / 2;
  const pedH = h - 5;                       // 山牆佔的高度，下面留給三條水平帶
  // 山牆只佔中央一段。拉到滿版的話是 40:1 的超淺三角，看起來不像神廟像斜坡；
  // 兩側改成平的女兒牆，這也是真實寬立面的做法（中央神廟式門面 + 兩翼）。
  const halfPed = W * 0.24;
  for (let x = 0; x < W; x++){
    const d = Math.abs(x - cx);
    if (d <= halfPed){
      const top = (d / halfPed) * pedH;
      vspan(g, x, top, pedH, 'b');
      g[Math.round(top)][x] = 't';          // 斜簷（raking cornice）提亮
    } else {
      vspan(g, x, pedH - 1, pedH, 'b');     // 兩翼的女兒牆
      g[pedH - 1][x] = 't';
    }
  }
  for (let x = 0; x < W; x++){
    g[pedH + 1][x] = 'r';                   // 額枋上緣
    g[pedH + 2][x] = 'b';
    g[h - 1][x] = 's';                      // 簷口
  }
  const dp = pitch(W, 34), dw = Math.max(2, Math.round(dp * 0.45));
  for (let x = dp; x < W - dp; x += dp)     // 齒飾：一排小方齒
    for (let dx = 0; dx < dw && x + dx < W; dx++) g[pedH + 3][x + dx] = 'd';
  return g;
}

// --- 3 裝飾藝術階梯冠：層層退縮 + 垂直凹槽 + 中央尖飾
function deco(W, h){
  const g = blank(W, h);
  const cx = (W - 1) / 2;
  const steps = [0.10, 0.26, 0.44, 0.63, 0.82, 1.0];    // 每一階的半寬（比例）
  const per = (h - 1) / steps.length;
  for (let x = 0; x < W; x++){
    const d = Math.abs(x - cx) / cx;
    let i = steps.findIndex(s => d <= s);
    if (i < 0) continue;
    const top = Math.round(i * per);
    vspan(g, x, top, h - 1, 'b');
    g[top][x] = 't';                        // 每一階的頂緣鍍金
  }
  const fp = pitch(W, 26);
  for (let x = 0; x < W; x += fp){          // 垂直凹槽：裝飾藝術的招牌
    for (let y = 0; y < h; y++) if (g[y][x] === 'b') g[y][x] = 's';
  }
  for (let dx = -1; dx <= 1; dx++)          // 中央尖飾：只在頂端，不然會變成一條接縫
    vspan(g, Math.round(cx) + dx, 0, 2, 't');
  for (let x = 0; x < W; x++) if (g[h - 1][x] !== '.') g[h - 1][x] = 'r';
  return g;
}

// --- 4 哥德尖塔群：一排尖塔 + 城垛
function gothic(W, h){
  const g = blank(W, h);
  const wallTop = Math.round(h * 0.55);
  for (let x = 0; x < W; x++) vspan(g, x, wallTop, h - 1, 'b');
  for (let x = 0; x < W; x++) g[wallTop][x] = 't';
  const mp = pitch(W, 16), mw = Math.round(mp * 0.5);
  for (let x = 0; x < W; x += mp)           // 城垛：垛口
    for (let dx = 0; dx < mw && x + dx < W; dx++) vspan(g, x + dx, wallTop - 2, wallTop, 'b');
  // 尖塔：位置與高度都固定，中央與兩端最高
  const spires = [0.06, 0.19, 0.32, 0.5, 0.68, 0.81, 0.94];
  const tall   = [0.95, 0.55, 0.75, 1.0, 0.75, 0.55, 0.95];
  spires.forEach((p, i) => {
    const sx = Math.round(p * (W - 1));
    const top = Math.round((1 - tall[i]) * wallTop);
    const halfBase = Math.max(3, Math.round(W * 0.012));
    for (let dx = -halfBase; dx <= halfBase; dx++){
      const x = sx + dx; if (x < 0 || x >= W) continue;
      const a = top + Math.abs(dx) * ((wallTop - top) / (halfBase + 0.5));
      vspan(g, x, a, wallTop, dx === 0 ? 't' : 'b');
    }
    if (sx > 0 && sx < W) g[Math.max(0, top)][sx] = 't';
  });
  for (let x = 0; x < W; x++) if (g[h - 1][x] !== '.') g[h - 1][x] = 'r';
  return g;
}

// --- 7 伊斯蘭圓頂：中央大圓頂 + 兩側小頂 + 馬蹄拱廊
function islamic(W, h){
  const g = blank(W, h);
  const arcTop = Math.round(h * 0.52);      // 拱廊的上緣
  for (let x = 0; x < W; x++) vspan(g, x, arcTop, h - 1, 'd');   // 拱廊底是砂岩色
  // 馬蹄拱：在拱廊上挖出一排圓拱的洞
  // 拱洞不能開太大：ar 佔間距一半以上時柱墩會細到不見，整排讀成黑色的水滴
  const ap = pitch(W, 15), ar = Math.max(2, Math.round(ap * 0.22));
  for (let cxA = ap * 0.6; cxA < W - ap * 0.6; cxA += ap){
    for (let dx = -ar; dx <= ar; dx++){
      const x = Math.round(cxA) + dx; if (x < 1 || x >= W - 1) continue;
      const yTop = arcTop + 2 + Math.round(ar - Math.sqrt(Math.max(0, ar * ar - dx * dx)));
      for (let y = yTop; y < h - 2; y++) g[y][x] = '.';   // 底下留一條實心的基座
    }
  }
  // 圓頂：中央一大、兩側各一小
  const domes = [[0.5, 1.0], [0.19, 0.55], [0.81, 0.55]];
  for (const [p, k] of domes){
    const dcx = p * (W - 1);
    const rx = W * 0.085 * k, ry = arcTop * k;
    for (let x = Math.round(dcx - rx); x <= Math.round(dcx + rx); x++){
      if (x < 0 || x >= W) continue;
      const u = (x - dcx) / rx;
      if (Math.abs(u) > 1) continue;
      const top = arcTop - Math.sqrt(1 - u * u) * ry;
      vspan(g, x, top, arcTop, 'b');
      g[Math.round(Math.max(0, top))][x] = Math.abs(u) < 0.35 ? 's' : 'r';
    }
    const fx = Math.round(dcx);             // 頂上的金色尖飾
    if (fx >= 0 && fx < W) vspan(g, fx, Math.max(0, arcTop - ry - 2), arcTop - ry, 't');
  }
  return g;
}

const BUILDERS = { chinese, roman, deco, gothic, islamic };

// ---------------------------------------------------------------- 繪製
const cache = new Map();
function grid(style, W, h){
  const key = style + '|' + W + '|' + h;
  let g = cache.get(key);
  if (!g){
    g = (BUILDERS[style] || chinese)(W, h);
    // 逐列把同色的連續段合併成一個 rect，畫的時候才不是幾千次 fillRect
    const runs = [];
    for (let y = 0; y < h; y++){
      let x = 0;
      while (x < W){
        const ch = g[y][x];
        if (ch === '.'){ x++; continue; }
        let n = 1;
        while (x + n < W && g[y][x + n] === ch) n++;
        runs.push([x, y, n, ch]);
        x += n;
      }
    }
    g = runs; cache.set(key, runs);
  }
  return g;
}

export function drawRoof(ctx, style, bx, by, buildingW, h){
  const over = Math.round(buildingW * OVER);
  // W 是格子數，必須是非負整數。buildingW 一路來自 getBoundingClientRect()，
  // 在多數視窗寬度下是小數（375px 的手機上量到 297.20001220703125），於是
  // blank() 裡的 new Array(317.2...) 丟 RangeError。那個例外會從 draw() 一路
  // 逃到 frame()，而 requestAnimationFrame(frame) 是 frame() 的最後一行——
  // 排不到下一幀，整個遊戲迴圈就死在第一幀，樓一層都畫不出來。
  const x0 = bx - over, W = Math.max(0, Math.round(buildingW + over * 2));
  const c = COLORS[style] || COLORS.chinese;
  const n = P().night;
  const col = { b: mix(c.body[0], c.body[1], 1 - n), s: mix(c.shade[0], c.shade[1], 1 - n),
                r: mix(c.ridge[0], c.ridge[1], 1 - n), t: mix(c.trim[0], c.trim[1], 1 - n),
                d: mix(c.deep[0], c.deep[1], 1 - n) };
  for (const [x, y, w, ch] of grid(style, W, h)){
    ctx.fillStyle = col[ch] || col.b;
    ctx.fillRect(x0 + x, by + y, w, 1);
  }
}
