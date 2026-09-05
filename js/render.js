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
import { derived, isLeased, isManual } from './state.js';
import { hourOf, dayName, fmtShort } from './sim.js';
import { t } from './i18n.js';
import { P, setHour, mix } from './theme.js';
import { spriteFor, SPRITE_W, SPRITE_H } from './sprites.js';
import { drawSky, drawFar } from './sky.js';
import { roofHeight, drawRoof } from './roof.js';
import { MOTIFS, SIGNATURES, GLOW, MOTIF_W, MOTIF_H } from './interior.js';
import { drawNum, drawPlate, numWidth, GLYPH_H } from './digits.js';

export const view = {
  W:0, H:0, pad:10, fh:0, shaftX:0, shaftW:0, colW:0,
  bx0:0, bx1:0, bw:0,        // 大樓的外緣（含外牆）
  fx0:0, fx1:0,              // 樓層的可畫範圍（外牆內側）
  towerTop:0, horizon:0, roofH:0, deck:5, wall:6, skyTop:0, arc:0, manual:true,
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
  view.roofH = roofHeight(view.bw);

  // 上方留一條真的天空。不留的話屋頂會頂到畫面邊緣，而且太陽在正午
  // 會整個躲在大樓後面——那就等於沒有「日月隨時間變化」這件事。
  view.skyTop = Math.round(Math.max(30, Math.min(58, H * 0.11)));
  view.arc = view.horizon - view.skyTop * 0.42;
  const towerH = view.horizon - (view.skyTop + view.roofH + view.deck);
  view.fh = Math.max(2, towerH / st.floors);
  view.towerTop = view.horizon - st.floors * view.fh;

  const n = sim.shafts.length;
  const inner = view.fx1 - view.fx0;
  // 手動期的轎廂要排下「車上所有人要去哪」，所以井道加寬；
  // 買到調度演算法之後那些數字就是雜訊，井道縮回去，樓層拿回寬度。
  view.manual = isManual(st);
  // 只有真的畫得出數字時才加寬。樓層一多（100 層時每層 3.7px）轎廂裡什麼都
  // 畫不下，這時候還把井道撐開只是白白吃掉樓層的寬度。
  const wide = view.manual && view.fh >= 16;
  let per = 30;
  if (wide){
    // 手動期一定要看得到「全部」的目的地，所以井道要寬到排得下滿載的一車。
    // 依據是**載客量**而不是當下車上幾個人——後者每次有人上下車版面就會抖，
    // 那比截斷還糟。載客量只在買升級時才變。
    const carH = Math.max(4, view.fh - 2);
    const rows = Math.max(1, Math.floor(carH / (GLYPH_H + 2)));      // ×1 的列高
    const target = Math.min(derived(st).capacity, Math.max(1, st.floors - 1));
    const cw = numWidth('8'.repeat(String(st.floors).length), 1);
    per = Math.max(60, Math.min(120, Math.ceil(target / rows) * (cw + 2) + 14));
  }
  view.shaftW = Math.min(inner * (wide ? 0.60 : 0.46), n * per + 10);
  view.shaftX = view.fx1 - view.shaftW;
  view.colW = view.shaftW / n;
  return true;
}

// 樓層號牌子的右緣。畫樓層號跟排隊的人都要用它，不能各算各的。
const numScale = fh => (fh >= 24 ? 3 : 2);
const numLeft = fh => view.fx0 + 12 + numWidth('88', numScale(fh)) + 2;

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
  // 五種樣式共用同一個高度與寬度，樓體完全不變——換屋頂只換這一行畫的東西
  drawRoof(ctx, st.roofStyle || 'chinese', view.bx0, view.towerTop - view.deck - view.roofH, view.bw, view.roofH);
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
    if (fh >= 13){
      // 點陣字 + 底板。11px 的 system-ui 在這個尺度會被反鋸齒糊掉，而且
      // 沒有底板的話數字會直接跟室內家具疊在一起。
      const req = sim.shafts.some(s => s.target === f || s.queue.includes(f));
      const ds = numScale(fh);
      const txt = String(f + 1);
      drawPlate(ctx, txt, view.fx0 + 12 + numWidth(txt, ds) / 2,
                y + (fh - GLYPH_H * ds) / 2, ds,
                req ? pal.floorNumOn : pal.floorNum, pal.numPlate, 2);
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
      // 隊伍靠著電梯、由右往左排。兩個理由：排隊的人本來就該在門口，
      // 而且原本從左邊排起時，第一個人的牌子會緊貼左緣的樓層號。
      // 每一格內部仍是「小人在左、目的地牌在右」——垂直方向塞不下牌子，
      // 樓層只有 26px 高、小人就佔 18px（原本畫在腳下的數字已經溢出到下一層樓）。
      const csF = Math.max(1, Math.min(3, Math.floor(fh / 11)));
      const ds = fh >= 22 ? 2 : 1;
      const step = SPRITE_W * csF + numWidth('88', ds) + 14;
      const stop = numLeft(fh) + 10;          // 樓層號右緣之後才准站人
      let n = 0;
      for (const p of list){
        const x = view.shaftX - 6 - step * (n + 1);
        if (x < stop) break;
        drawPerson(ctx, x + SPRITE_W * csF / 2, y + fh / 2 + 6, null, false, p);
        const txt = String(p.dest + 1);
        const urgent = (p.left / p.patience) < 0.25;
        drawPlate(ctx, txt, x + SPRITE_W * csF + 4 + numWidth(txt, ds) / 2,
                  y + (fh - GLYPH_H * ds) / 2, ds,
                  urgent ? pal.bad : pal.ink, pal.numPlate, 2);
        if (++n >= 6) break;
      }
      // 隊伍還有多長：標在隊尾（左端），不是門口
      if (list.length > n)
        drawNum(ctx, '+' + (list.length - n), view.shaftX - 6 - step * n - 6,
                y + (fh - GLYPH_H * ds) / 2, ds, pal.crowdBar, 'right');
    } else {
      // 人數條也貼著電梯往左長，跟上面同一個方向
      const w = Math.min(view.shaftX - numLeft(fh) - 12, list.length * 5);
      const worst = Math.min(...list.map(p => p.left / p.patience));
      ctx.fillStyle = worst < 0.25 ? pal.bad : pal.crowdBar;
      ctx.fillRect(view.shaftX - 6 - w, y + Math.max(0, fh / 2 - 1.5), w, Math.max(1.5, fh - 2));
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
      if (view.manual){
        // 手動期：只顯示「要去哪」，由小排到大，不畫乘客。
        // 你要的是下一個該點哪一層，不是誰坐在裡面。一人一個數字排不下——
        // 原本的做法給每位乘客 6.1px，四個數字是疊在一起的。
        const dests = [...new Set(s.riders.map(r => r.dest + 1))].sort((a, b) => a - b);
        // 手動期一定要看到「全部」的目的地——那是你決定點哪層的依據，少一個就漏一趟。
        // 所以不是固定字級再用 +N 截斷，而是從大到小試，挑第一個裝得下全部的字級：
        // 車上人少就大大地寫，人多就縮小，但不省略。
        const digits = String(dests[dests.length - 1]).length;
        const fit = sc => {
          const cw = numWidth('8'.repeat(digits), sc);
          const gap = Math.max(2, sc * 2), ch = GLYPH_H * sc + Math.max(2, sc);
          const cols = Math.max(1, Math.floor((w - 6 + gap) / (cw + gap)));
          const rows = Math.max(1, Math.floor(carH / ch));
          return { sc, cw, gap, ch, cols, rows, ok: GLYPH_H * sc <= carH - 2 && cols * rows >= dests.length };
        };
        let g = null;
        for (const sc of [3, 2, 1]){ const t = fit(sc); if (t.ok || sc === 1){ g = t; break; } }
        const slots = g.cols * g.rows;
        // 只有連 ×1 都排不下時才截斷——那表示車真的太小，畫得下也看不清
        const show = dests.length > slots ? slots - 1 : dests.length;
        const gw = g.cols * g.cw + (g.cols - 1) * g.gap;
        const gh = g.rows * g.ch - (g.ch - GLYPH_H * g.sc);
        const gx = x + (w - gw) / 2, gy = y + (carH - gh) / 2;
        const cell = (i, txt, color) => {
          const r = Math.floor(i / g.cols), c = i % g.cols;
          drawNum(ctx, txt, gx + c * (g.cw + g.gap) + g.cw, gy + r * g.ch, g.sc, color, 'right');
        };
        for (let i = 0; i < show; i++) cell(i, String(dests[i]), pal.inkCar);
        if (show < dests.length) cell(show, '+' + (dests.length - show), pal.crowdBar);
      } else {
        // 有調度演算法之後就不用你點了，目的地變成雜訊——改成看人。
        const shown = Math.min(s.riders.length, 4);
        const slot = (w - 4) / shown;
        s.riders.slice(0, shown).forEach((p, k) => {
          drawPerson(ctx, x + 2 + slot * (k + 0.5), y + carH / 2 + 6, null, true, p, slot - 1);
        });
      }
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

  // label 現在由呼叫端自己畫成點陣字（見 digits.js）——這裡只在有傳字串時才畫
  if (label != null){
    ctx.fillStyle = urgent ? pal.bad : pal.personText;
    ctx.font = '600 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(label, x + wob, y + 10);
  }

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
