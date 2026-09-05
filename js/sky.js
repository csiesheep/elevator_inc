// sky.js — 天空、日月、星星、遠景城市。
//
// 以前沒有天空：draw() 第一件事是用 P().bg 平塗整張畫布，夜晚再疊一層半透明的
// nightTint。那層疊色現在拿掉了——天空自己就有日夜，樓層的色表也自己有，
// 不需要在最後蓋一層灰。
//
// 太陽 6 點升、18 點落，月亮反過來；兩者走同一條拋物線，所以交接的瞬間
// 剛好都貼在地平線上，不會有一個跳掉的畫格。theme.js 的 dayness() 用同一組數字。

import { mix } from './theme.js';

// 小時, 天頂, 近地平, 日月的顏色, 星星透明度
const KEYS = [
  [ 0.0, '#0b1026', '#161f3d', '#dfe6f5', 1.00],
  [ 3.0, '#080d20', '#111a34', '#dfe6f5', 1.00],
  [ 5.0, '#1b1b3c', '#5c3f5e', '#dfe6f5', 0.55],
  [ 6.2, '#3b3a68', '#c9705a', '#ffd9a8', 0.15],
  [ 7.5, '#5c7db2', '#e8ab80', '#ffe9b8', 0.00],
  [ 9.5, '#6ea8dc', '#bfe0f5', '#fff3c4', 0.00],
  [12.0, '#4a9fe0', '#cfeeff', '#fff8dc', 0.00],
  [15.0, '#57a4dc', '#d6ecf8', '#fff3c4', 0.00],
  [17.0, '#6f8fc0', '#f2b673', '#ffd48a', 0.00],
  [18.3, '#46467e', '#e8703a', '#ff9d5a', 0.10],
  [19.5, '#282a56', '#9c4a6c', '#e6ecfb', 0.45],
  [21.0, '#131a38', '#2a3358', '#dfe6f5', 0.90],
  [24.0, '#0b1026', '#161f3d', '#dfe6f5', 1.00],
];

export function skyAt(h){
  h = ((h % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i++){
    const a = KEYS[i], b = KEYS[i + 1];
    if (h >= a[0] && h <= b[0]){
      const t = (h - a[0]) / (b[0] - a[0]);
      return { zen: mix(a[1], b[1], t), gnd: mix(a[2], b[2], t),
               body: mix(a[3], b[3], t), star: a[4] + (b[4] - a[4]) * t };
    }
  }
  return { zen: KEYS[0][1], gnd: KEYS[0][2], body: KEYS[0][3], star: KEYS[0][4] };
}

// 太陽 06→18，月亮 18→06，同一條弧
export function bodyPos(h, x0, w, horizon, arc){
  h = ((h % 24) + 24) % 24;
  const sun = h >= 6 && h <= 18;
  const t = sun ? (h - 6) / 12 : (((h - 18) % 24 + 24) % 24) / 12;
  return { sun, t,
           x: x0 + (0.06 + t * 0.88) * w,
           y: horizon - Math.sin(t * Math.PI) * arc };
}

// 星星的位置固定，不是每幀亂數——會閃爍的星空很吵，而且相機一動就穿幫
const STARS = [
  [0.05,0.16],[0.12,0.40],[0.19,0.09],[0.26,0.30],[0.33,0.52],[0.38,0.14],
  [0.45,0.36],[0.52,0.07],[0.58,0.27],[0.63,0.47],[0.70,0.12],[0.76,0.33],
  [0.82,0.20],[0.88,0.44],[0.94,0.11],[0.09,0.55],[0.29,0.62],[0.49,0.58],
  [0.67,0.60],[0.85,0.56],[0.16,0.24],[0.42,0.20],[0.73,0.42],[0.97,0.30],
];
// 遠景：x 比例, 寬比例, 高（px）。固定的一排，給地平線一點深度
const FAR = [
  [0.00,0.055,34],[0.06,0.036,22],[0.10,0.060,48],[0.17,0.044,30],[0.23,0.050,40],
  [0.30,0.038,26],[0.35,0.062,52],[0.43,0.030,20],
  [0.62,0.034,24],[0.67,0.056,44],[0.74,0.040,28],[0.80,0.048,38],
  [0.87,0.032,22],[0.91,0.058,46],[0.97,0.040,30],
];

export function drawSky(ctx, h, W, H, horizon, arc){
  const s = skyAt(h);
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, s.zen);
  g.addColorStop(1, s.gnd);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);

  if (s.star > 0.01){
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = s.star * 0.8;
    for (const [sx, sy] of STARS) ctx.fillRect(Math.round(sx * W), Math.round(sy * horizon * 0.8), 2, 2);
    ctx.globalAlpha = 1;
  }

  const b = bodyPos(h, 0, W, horizon, arc);
  if (b.y < horizon + 10){
    ctx.fillStyle = s.body;
    if (b.sun){
      ctx.globalAlpha = 0.26;
      ctx.fillRect(b.x - 10, b.y - 3, 20, 6);
      ctx.fillRect(b.x - 3, b.y - 10, 6, 20);
      ctx.globalAlpha = 1;
      ctx.fillRect(b.x - 7, b.y - 7, 14, 14);
    } else {
      ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
      ctx.fillStyle = s.zen;                     // 咬掉一角就是月相
      ctx.fillRect(b.x - 7, b.y - 6, 7, 9);
    }
  }
  return s;
}

export function drawFar(ctx, W, horizon, color){
  ctx.fillStyle = color;
  for (const [fx, fw, fh] of FAR) ctx.fillRect(Math.round(fx * W), horizon - fh, Math.max(10, fw * W), fh);
}
