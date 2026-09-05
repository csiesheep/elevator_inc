// render.js — 畫面。相機永遠框住整棟樓：樓越高，樓就越細，這本身就是獎勵（設計 4.12）。
//
// 版面（方向 A：天際線）。以前大樓是滿版剖面，從 pad 畫到 W - pad，左右不留一點空，
// 所以沒有地方放天空。現在讓出四塊：
//
//   ┌──────────── 天空（日月在這裡走弧）────────────┐
//   │        ▄▄▄▄ 中式屋頂 ▄▄▄▄                     │
//   │  天空 │███ 樓層 ███ 井道 │ 天空               │
//   │       └── 街道 ─────────┘                     │
//   └───────────────────────────────────────────────┘
//
// 代價寫在設計稿裡：100 層時每層從 3.72px 降到約 2.8px。換到的是一棟站在
// 世界裡的樓，而不是一張剖面圖。

import { CONFIG as C, bandOf } from './content.js';
import { derived, isLeased } from './state.js';
import { hourOf, dayName, fmtShort } from './sim.js';
import { t } from './i18n.js';
import { P, setHour, mix } from './theme.js';
import { spriteFor, SPRITE_W, SPRITE_H } from './sprites.js';
import { drawSky, drawFar } from './sky.js';
import { roofHeight, drawRoof } from './roof.js';
import { MOTIFS, SIGNATURES, GLOW, MOTIF_W, MOTIF_H } from './interior.js';

export const view = {
  W:0, H:0, pad:10, fh:0, shaftX:0, shaftW:0, colW:0,
  bx0:0, bx1:0, bw:0,        // 大樓的外緣（含外牆）
  fx0:0, fx1:0,              // 樓層的可畫範圍（外牆內側）
  towerTop:0, horizon:0, roofH:0, deck:5, wall:6, skyTop:0, arc:0,
};

export function layout(cv, ctx, st, sim){
  const r = cv.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = r.width, H = r.height;
  view.W = W; view.H = H;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 左右讓給天空。畫面很窄的時候（手機直式）少讓一點，不然樓會細到沒法玩。
  const skyPad = Math.round(Math.min(62, Math.max(14, W * 0.085)));
  view.bx0 = skyPad; view.bx1 = W - skyPad; view.bw = view.bx1 - view.bx0;
  view.wall = view.bw >= 220 ? 6 : 3;
  view.fx0 = view.bx0 + view.wall; view.fx1 = view.bx1 - view.wall;

  const groundH = Math.round(Math.max(10, Math.min(22, H * 0.055)));
  view.horizon = H - groundH;
  view.roofH = roofHeight(st.floors, view.bw);

  // 上方留一條真的天空。不留的話屋頂會頂到畫面邊緣，而且太陽在正午
  // 會整個躲在大樓後面——那就等於沒有「日月隨時間變化」這件事。
  view.skyTop = Math.round(Math.max(30, Math.min(58, H * 0.11)));
  view.arc = view.horizon - view.skyTop * 0.42;
  const towerH = view.horizon - (view.skyTop + view.roofH + view.deck);
  view.fh = Math.max(2, towerH / st.floors);
  view.towerTop = view.horizon - st.floors * view.fh;

  const n = sim.shafts.length;
  const inner = view.fx1 - view.fx0;
  view.shaftW = Math.min(inner * 0.46, n * 30 + 10);
  view.shaftX = view.fx1 - view.shaftW;
  view.colW = view.shaftW / n;
  return true;
}

export const floorY = f => view.horizon - (f + 1) * view.fh;
export const floorAt = y => Math.floor((view.horizon - y) / view.fh);

// ---------------------------------------------------------------- 室內
// 四段階梯，不是一個門檻。以前只有 detail = fh >= 16，過了就整個消失；
// 現在中段還留得住樓層帶的辨識度。
function drawInterior(ctx, key, color, x0, x1, y, fh, pal){
  if (fh < 8) return;
  if (fh >= 14){
    const m = MOTIFS[key]; if (!m) return;
    const cs = fh >= 24 ? 2 : 1;
    const top = y + fh - 1 - MOTIF_H * cs;
    const gap = cs * 6;                       // 留空隙才讀得成「一間一間」，貼滿是壁紙
    const furn = shade(color, pal.furn);
    // 夜裡窗戶會亮。不做這件事的話整棟樓入夜就變成一塊黑色的板子——
    // 真實的大樓正好相反，天越黑它越亮。
    const acc = mix(shadeHex(color, pal.furnAcc), pal.winLit, pal.night * 0.8);
    const glass = shade(color, pal.glassK), glow = GLOW[key] || pal.tileOrn;
    for (let x = x0 + 6; x + MOTIF_W * cs < x1; x += MOTIF_W * cs + gap){
      for (let r = 0; r < MOTIF_H; r++){
        const row = m[r];
        let c = 0;
        while (c < MOTIF_W){
          const ch = row[c];
          if (ch === '.'){ c++; continue; }
          let n = 1;
          while (c + n < MOTIF_W && row[c + n] === ch) n++;
          ctx.fillStyle = ch === '#' ? furn : ch === 'o' ? acc : ch === 'g' ? glow : glass;
          ctx.fillRect(x + c * cs, top + r * cs, n * cs, cs);
          c += n;
        }
      }
    }
  } else {
    // 家具畫不下了，只剩窗格的節奏——每一帶自己的簽名
    const sig = SIGNATURES[key]; if (!sig) return;
    ctx.fillStyle = mix(shadeHex(color, pal.furnAcc), pal.winLit, pal.night * 0.8);
    const hh = Math.max(2, fh * 0.4), yy = y + fh * 0.32;
    let i = 0;
    for (let x = x0 + 6; x < x1; x += 5, i++)
      if (sig[i % sig.length] === 'o') ctx.fillRect(x, yy, 3, hh);
  }
}

export function draw(ctx, st, sim){
  const { W, H, pad, fh } = view;
  const d = derived(st);
  const h = hourOf(st);
  setHour(h);                       // 色表跟著時間走，沒有手動切換了
  const pal = P();

  ctx.clearRect(0, 0, W, H);
  const sky = drawSky(ctx, h, W, H, view.horizon, view.arc);
  drawFar(ctx, W, view.horizon, pal.far);

  const detail = fh >= 16;

  // ---- 屋頂 + 屋頂平台
  drawRoof(ctx, st.floors, view.bx0, view.towerTop - view.deck - view.roofH, view.bw);
  ctx.fillStyle = pal.deck;
  ctx.fillRect(view.bx0 - 3, view.towerTop - view.deck, view.bw + 6, view.deck);

  // ---- 樓板：每層之間那道縫要是混凝土，不是天空。不補這層的話夕陽會從
  //      縫裡透出來，整棟樓變成一道道橘線。
  ctx.fillStyle = pal.slab;
  ctx.fillRect(view.fx0, view.towerTop, view.fx1 - view.fx0, view.horizon - view.towerTop);

  // ---- 樓層
  const fw = view.fx1 - view.fx0;
  for (let f = 0; f < st.floors; f++){
    const y = floorY(f), band = bandOf(f + 1);
    const empty = !isLeased(st, f);
    const bh = Math.max(1, fh - (fh > 6 ? 1 : 0));
    ctx.fillStyle = empty
      ? shade(pal.empty, 1, pal.emptyAlpha)
      : shade(band.color, f % 2 ? pal.floorA : pal.floorB, pal.floorAlpha);
    ctx.fillRect(view.fx0, y, fw, bh);

    if (!empty){
      // 左緣的樓層帶色條。門檻不能設在 4：100 層擠滿畫面時每層只有 3px，
      // 色條會整條消失，而那時候它是唯一還看得出樓層帶的東西。
      if (fh >= 2){
        ctx.fillStyle = shade(band.color, pal.stripe, 1);
        ctx.fillRect(view.fx0, y, Math.min(10, Math.max(5, fh * 0.6)), bh);
      }
      drawInterior(ctx, band.key, band.color, view.fx0 + 8, view.shaftX - 4, y, fh, pal);
    } else if (fh >= 5){
      ctx.strokeStyle = shade(pal.emptyHatch, 1, pal.emptyHatchA); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = view.fx0; x < view.fx1; x += 9){ ctx.moveTo(x, y + fh); ctx.lineTo(x + fh, y); }
      ctx.stroke();
    }
    if (detail){
      const req = sim.shafts.some(s => s.target === f || s.queue.includes(f));
      ctx.fillStyle = req ? pal.floorNumOn : pal.floorNum;
      ctx.font = '600 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(String(f + 1), view.fx0 + 12, y + fh / 2 + 4);
    }
  }

  // ---- 外牆
  ctx.fillStyle = pal.wall;
  ctx.fillRect(view.bx0, view.towerTop, view.wall, view.horizon - view.towerTop);
  ctx.fillRect(view.bx1 - view.wall, view.towerTop, view.wall, view.horizon - view.towerTop);
  if (view.wall >= 5){
    ctx.fillStyle = pal.wallWin;
    for (let y = view.towerTop + 3; y < view.horizon - 3; y += 9){
      ctx.fillRect(view.bx0 + 2, y, view.wall - 4, 4);
      ctx.fillRect(view.bx1 - view.wall + 2, y, view.wall - 4, 4);
    }
  }

  // 空中大廳
  if (sim.lobby){
    const y = floorY(sim.lobby);
    ctx.strokeStyle = pal.carDoors; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(view.fx0, y + fh); ctx.lineTo(view.fx1, y + fh); ctx.stroke();
  }

  // ---- 等待中的乘客
  const perFloor = new Map();
  for (const p of sim.waiting){
    perFloor.set(p.origin, (perFloor.get(p.origin) || []).concat(p)); }
  for (const [f, list] of perFloor){
    const y = floorY(f);
    if (detail){
      const csF = Math.max(1, Math.min(3, Math.floor(fh / 11)));
      const step = Math.max(18, SPRITE_W * csF + 5);
      let n = 0;
      for (const p of list){
        const x = view.fx0 + 24 + step * n + step / 2;
        if (x + step / 2 > view.shaftX - 6) break;
        drawPerson(ctx, x, y + fh / 2 + 6, String(p.dest + 1), false, p);
        if (++n > 6) break;
      }
      if (list.length > n){
        ctx.fillStyle = pal.label; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
        ctx.fillText('+' + (list.length - n), view.shaftX - 16, y + fh / 2 + 4);
      }
    } else {
      const w = Math.min(view.shaftX - view.fx0 - 24, list.length * 5);
      const worst = Math.min(...list.map(p => p.left / p.patience));
      ctx.fillStyle = worst < 0.25 ? pal.bad : pal.crowdBar;
      ctx.fillRect(view.fx0 + 18, y + Math.max(0, fh / 2 - 1.5), w, Math.max(1.5, fh - 2));
    }
  }

  // ---- 電梯井
  const shaftTop = view.towerTop, shaftH = view.horizon - view.towerTop;
  for (let i = 0; i < sim.shafts.length; i++){
    const s = sim.shafts[i];
    const x = view.shaftX + i * view.colW + 2, w = view.colW - 4;
    ctx.fillStyle = pal.shaft; ctx.fillRect(x, shaftTop, w, shaftH);
    ctx.strokeStyle = s.express ? pal.shaftExpress : pal.shaftEdge; ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, shaftTop + .5, w - 1, shaftH - 1);
    if (s.express && s.from){
      ctx.fillStyle = shade(pal.expressTint, 1, pal.expressTintA);
      ctx.fillRect(x, floorY(s.to), w, (s.to - s.from + 1) * fh);
    }

    const carH = Math.max(4, fh - 2), y = floorY(s.pos) + 1;
    ctx.fillStyle = pal.car; ctx.fillRect(x + 1, y, w - 2, carH);

    // 門。畫在乘客「之前」——原本畫在之後，門一關就把整台車蓋住，
    // 車裡的人永遠看不見（亮色下更明顯，整台變成一個黑盒子）。
    let open = 0;
    if (s.mode === 'doors' || s.mode === 'held'){
      const tt = s.doorT, L = s.doorLen;
      open = s.mode === 'held' ? 1 : (tt < 0.35 ? tt / 0.35 : (tt > L - 0.35 ? Math.max(0, (L - tt) / 0.35) : 1));
    }
    const half = (w - 2) / 2, slide = half * open;
    ctx.fillStyle = pal.door;
    ctx.fillRect(x + 1, y, half - slide, carH);
    ctx.fillRect(x + 1 + half + slide, y, half - slide, carH);
    if (carH >= 10){
      const gy = y + carH * 0.18, gh = carH * 0.62;
      ctx.fillStyle = pal.carGlass;
      ctx.fillRect(x + 3, gy, Math.max(0, half - slide - 2), gh);
      ctx.fillRect(x + 1 + half + slide + 1, gy, Math.max(0, half - slide - 2), gh);
    }

    if (detail && s.riders.length){
      const shown = Math.min(s.riders.length, 4);
      const slot = (w - 4) / shown;
      s.riders.slice(0, shown).forEach((p, k) => {
        drawPerson(ctx, x + 2 + slot * (k + 0.5), y + carH / 2 + 6, String(p.dest + 1), true, p, slot - 1);
      });
    } else if (s.riders.length){
      ctx.fillStyle = pal.riderBar;
      ctx.fillRect(x + 2, y + 1, (w - 4) * Math.min(1, s.riders.length / Math.max(1, d.capacity)), Math.max(1, carH - 2));
    }

    ctx.strokeStyle = s.lock > 0 ? pal.bad : (s.mode === 'doors' ? pal.carDoors : pal.carEdge);
    ctx.lineWidth = s.mode === 'doors' ? 2 : 1;
    ctx.strokeRect(x + 1.5, y + .5, w - 3, carH - 1);

    if (s.heat > 0.05 || s.lock > 0){
      const hp = s.lock > 0 ? 1 : s.heat / d.heatMax;
      ctx.fillStyle = s.lock > 0 ? pal.bad : (hp > 0.7 ? pal.heatWarm : pal.heatCool);
      ctx.fillRect(x + 1, shaftTop + 2, (w - 2) * hp, 2);
    }
  }

  // ---- 街道
  ctx.fillStyle = pal.ground; ctx.fillRect(0, view.horizon, W, H - view.horizon);
  ctx.fillStyle = pal.groundLine; ctx.fillRect(0, view.horizon, W, 2);
  const lampOn = sky.star > 0.02 || h < 6.8 || h > 17.2;
  for (let lx = 18; lx < W; lx += 74){
    ctx.fillStyle = pal.groundLine; ctx.fillRect(lx, view.horizon - 12, 2, 12);
    ctx.fillStyle = shade(pal.lamp, 1, lampOn ? pal.lampA : 0.12);
    ctx.fillRect(lx - 2, view.horizon - 14, 6, 3);
  }
  ctx.fillStyle = pal.groundLine;
  const midY = view.horizon + (H - view.horizon) * 0.55;
  for (let dx = 8; dx < W; dx += 26) ctx.fillRect(dx, midY, 12, 2);

  // ---- 飄出來的錢
  ctx.textAlign = 'right'; ctx.font = '700 13px system-ui';
  for (const p of sim.pops){
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.bad ? pal.bad : pal.money;
    ctx.fillText(p.txt, view.shaftX - 6, floorY(p.floor) + fh / 2 + p.off - (1 - p.life) * 26);
  }
  ctx.globalAlpha = 1;

  // ---- 時鐘。畫在天空上，所以要用會跟著天色走的顏色。
  const hh = String(Math.floor(h)).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  ctx.textAlign = 'left'; ctx.font = '600 11px system-ui';
  ctx.fillStyle = shade(sky.star > 0.4 ? '#ffffff' : '#101426', 1, 0.72);
  ctx.fillText(`${dayName(st)} ${hh}:${mm}`, 8, 14);
  let hx = 82;
  if ((h >= 8 && h < 10) || (h >= 17 && h < 19)){
    ctx.fillStyle = pal.warn; ctx.fillText(t('peak'), hx, 14); hx += 34;
  }
  if (sim.mood >= 1.25){ ctx.fillStyle = pal.bad; ctx.fillText(t('busy'), hx, 14); }
  else if (sim.mood <= 0.75){ ctx.fillStyle = pal.heatCool; ctx.fillText(t('quiet'), hx, 14); }
}

function drawPerson(ctx, x, y, label, inCar, p, maxW){
  const pal = P();
  const urgent = p && (p.left / p.patience) < 0.25;
  const wob = urgent ? Math.round(Math.sin(performance.now() / 90 + x)) : 0;
  const { rows, acc } = spriteFor(p && p.type, urgent);

  // 一格幾像素：樓層越高格子越大，但保持整數，才不會糊掉。
  // 也不能寬過分配到的位置，否則人會疊在一起。
  let cs = Math.max(1, Math.min(3, Math.floor(view.fh / 11)));
  if (maxW) cs = Math.max(1, Math.min(cs, Math.floor(maxW / SPRITE_W)));
  const w = SPRITE_W * cs, hgt = SPRITE_H * cs;
  const left = Math.round(x - w / 2) + wob, top = Math.round(y - hgt) + 2;

  const ink = urgent ? pal.bad : (inCar ? pal.inkCar : pal.ink);
  ctx.fillStyle = ink;
  for (let r = 0; r < SPRITE_H; r++){
    const row = rows[r];
    for (let c = 0; c < SPRITE_W; c++) if (row[c] === '#') ctx.fillRect(left + c * cs, top + r * cs, cs, cs);
  }
  // 配件永遠保留自己的顏色。第一版連配件都轉紅，結果所有人急起來長得一模一樣——
  // 形狀好不容易換來的辨識度，會被緊急狀態整個吃掉。
  ctx.fillStyle = acc;
  for (let r = 0; r < SPRITE_H; r++){
    const row = rows[r];
    for (let c = 0; c < SPRITE_W; c++) if (row[c] === 'o') ctx.fillRect(left + c * cs, top + r * cs, cs, cs);
  }
  // 急了就在頭上插一個驚嘆號：貓跟幽靈整身都是配件色，光靠身體變紅看不出來
  if (urgent){
    ctx.fillStyle = pal.bad;
    const ex = Math.round(x + w / 2 - cs / 2) + wob, ey = top - cs * 4;
    ctx.fillRect(ex, ey, cs, cs * 2);
    ctx.fillRect(ex, ey + cs * 3, cs, cs);
  }

  ctx.fillStyle = urgent ? pal.bad : pal.personText;
  ctx.font = '600 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(label, x + wob, y + 10);

  if (p && p.patience < 500){
    const bw = 12, ratio = Math.max(0, p.left / p.patience);
    ctx.fillStyle = pal.patienceBg; ctx.fillRect(x - bw/2, top - 4, bw, 2);
    ctx.fillStyle = ratio < 0.25 ? pal.bad : ratio < 0.6 ? pal.warn : pal.money;
    ctx.fillRect(x - bw/2, top - 4, bw * ratio, 2);
  }
}

// 同樣的乘法，但回傳 hex，才能再拿去跟別的顏色混
function shadeHex(hex, k){
  const n = parseInt(hex.slice(1), 16);
  let out = 0;
  for (const sh of [16, 8, 0]) out |= Math.min(255, Math.round(((n >> sh) & 255) * k)) << sh;
  return '#' + out.toString(16).padStart(6, '0');
}

function shade(hex, k, alpha){
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgba(${r},${g},${b},${alpha == null ? 1 : alpha})`;
}
