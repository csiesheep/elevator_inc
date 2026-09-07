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
import { derived, isManual } from './state.js';
import { hourOf, dayName, fmtShort, isFloorBlocked } from './sim.js';
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
    // 上限是載客量：一位乘客一個數字，重複的樓層也各佔一格，所以跟樓層數無關。
    const target = Math.max(1, derived(st).capacity);
    const cw = numWidth('8'.repeat(String(st.floors).length), 1);
    per = Math.max(60, Math.min(160, Math.ceil(target / rows) * (cw + 2) + 14));
  }
  view.shaftW = Math.min(inner * (wide ? 0.60 : 0.46), n * per + 10);   // 上限保護樓層：井道再寬也不能把樓層擠掉
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

// ---------------------------------------------------------------- 封鎖中的樓層（#33）
// 這兩張表**只有畫面在用**：不進存檔，也不回寫 sim。封鎖的機制歸 sim.js 所有，
// 這裡一個位元組都不改。
//
// 為什麼需要 peak：`sim.blocked[f]` 只存「解封的那一刻」，沒有存這次封了多久。
// 要把倒數畫成比例條就需要分母。寫死一個名目秒數（例如事件表的 18–30）會在
// 事件長度改變的那天安靜地說謊，所以分母由畫面自己記：第一次看到這次封鎖時的
// 剩餘秒數就是滿格。
const blockView = new Map();    // f -> { until, peak }
const blockFlash = new Map();   // f -> 拒絕閃爍的結束時間（遊戲時間）

function blockInfo(st, sim, f){
  const until = sim.blocked && sim.blocked[f];
  if (!(until > st.t)){ blockView.delete(f); return null; }
  const left = until - st.t;
  let v = blockView.get(f);
  if (!v || v.until !== until){ v = { until, peak: left }; blockView.set(f, v); }
  else if (left > v.peak) v.peak = left;
  return { left, frac: v.peak > 0 ? Math.max(0, Math.min(1, left / v.peak)) : 0 };
}

// 點了封鎖中的樓層：要有明確的拒絕，不能靜靜地什麼都不發生。
// 回傳 true = 我處理掉了，呼叫端不必再送 requestFloor（送了也只會被靜靜丟掉）。
export function rejectIfBlocked(st, sim, f){
  if (!isFloorBlocked(st, sim, f)) return false;
  if (!((blockFlash.get(f) || 0) > st.t)){        // 連點不要洗版
    const until = sim.blocked[f];
    sim.toasts.push({ txt: t('blockedTap', f + 1, Math.max(1, Math.ceil(until - st.t))), life: 2.5 });
  }
  blockFlash.set(f, st.t + 0.5);
  return true;
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
    const bh = Math.max(1, fh - (fh > 6 ? 1 : 0));
    // 蓋好的樓層一定有人（招商已移除），所以沒有「空樓層」這種畫法了
    ctx.fillStyle = shade(band.color, f % 2 ? pal.floorA : pal.floorB, pal.floorAlpha);
    ctx.fillRect(view.fx0, y, fw, bh);

    // 左緣的樓層帶色條。門檻不能設在 4：100 層擠滿畫面時每層只有 3px，
    // 色條會整條消失，而那時候它是唯一還看得出樓層帶的東西。
    if (fh >= 2){
      ctx.fillStyle = shade(band.color, pal.stripe, 1);
      ctx.fillRect(view.fx0, y, Math.min(10, Math.max(5, fh * 0.6)), bh);
    }
    drawInterior(ctx, band.key, band.color, view.fx0 + 8, view.shaftX - 4, y, fh, pal);
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

  // ---- 封鎖中的樓層
  // 畫在「等待的乘客」之後是刻意的：#22 的裁決之後，被封的樓層**照常有人在等**，
  // 標記要蓋在人上面。畫在人下面會變成「看得到人、看不出接不到」——那正是這張
  // issue 的症狀本身。
  for (let f = 0; f < st.floors; f++){
    const b = blockInfo(st, sim, f);
    if (!b) continue;
    const y = floorY(f);
    const bh = Math.max(1, fh - (fh > 6 ? 1 : 0));
    const x0 = view.fx0, x1 = view.shaftX, w = Math.max(0, x1 - x0);
    const hot = (blockFlash.get(f) || 0) > st.t;      // 剛剛被點過

    // 整列染色。100 層時每層只有 3.7px，斜紋和秒數都畫不下，這一層是那時候
    // 唯一還看得見的東西，所以它沒有高度門檻。
    ctx.save();
    // 樓層很矮的時候（100 層，每層 3～5px）斜紋、倒數條、秒數全部低於門檻，
    // 染色是**唯一**還在的訊號，所以那時候要更濃。這不會擠到樓層號：
    // 樓層號自己在 fh < 13 就不畫了，那個高度沒有東西可以被擠掉。
    const wash = fh < 8 ? 0.44 : 0.26;
    ctx.fillStyle = shade(pal.warn, 1, hot ? Math.min(0.64, wash + 0.18) : wash);
    ctx.fillRect(x0, y, w, bh);

    // 斜紋 = 施工中。太矮會糊成雜訊，所以設門檻。
    if (fh >= 8){
      ctx.beginPath(); ctx.rect(x0, y, w, bh); ctx.clip();
      ctx.strokeStyle = shade(pal.warn, 1, hot ? 0.9 : 0.55);
      ctx.lineWidth = Math.max(2, Math.min(5, fh * 0.16));
      const gap = ctx.lineWidth * 3;
      for (let sx = x0 - bh; sx < x1 + bh; sx += gap){
        ctx.beginPath(); ctx.moveTo(sx, y + bh); ctx.lineTo(sx + bh, y); ctx.stroke();
      }
    }
    ctx.restore();

    // 門口的擋條。電梯門就在這條線上，這是「這一層停不了」最直接的說法，
    // 也是 3.7px 時唯一還能分辨的**形狀**線索（染色只是顏色）。
    const barW = Math.max(3, Math.min(6, fh * 0.5));
    ctx.fillStyle = shade(pal.warn, hot ? 1.3 : 1, 1);
    ctx.fillRect(x1 - barW, y, barW, bh);

    // 倒數條：還要多久。分母見 blockInfo 的註解。
    if (fh >= 5){
      const ch = Math.max(1.5, Math.min(3, fh * 0.16));
      ctx.fillStyle = shade(pal.numPlate, 1, 0.6);
      ctx.fillRect(x0, y + bh - ch, w, ch);
      ctx.fillStyle = shade(pal.warn, 1.15, 1);
      ctx.fillRect(x0, y + bh - ch, w * b.frac, ch);
    }

    // 秒數：只有畫得下才畫，而且緊跟著樓層號放在左邊——隊伍是從右邊（電梯門）
    // 往左長的，放右邊會跟等待的人搶同一塊地方。
    if (fh >= 13){
      const txt = String(Math.max(0, Math.ceil(b.left)));
      drawPlate(ctx, txt, numLeft(fh) + 5 + numWidth(txt, 1) / 2,
                y + (fh - GLYPH_H) / 2, 1, pal.warn, pal.numPlate, 2);
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

    // 加速的雙噴口（#144）。畫在車「之前」，讓車身蓋住噴口的底邊，火才像從車底噴出來。
    //
    // 三個條件同時成立才畫：按住加速、這座井真的在動、而且沒被鎖住。
    // 鎖住的時候車是停的，那時候畫火會說謊——過熱是懲罰，不是還在衝。
    // d.noOverheat（m_cool 滿級）時 heat 恆為 0，heat01 自然落在最低那一檔：
    // 顏色最暖、長度只有下限，但**還是要畫**，因為玩家仍然在加速。
    if (sim.boost && s.mode === 'moving' && s.lock === 0){
      const heat01 = d.heatMax > 0 ? Math.max(0, Math.min(1, s.heat / d.heatMax)) : 0;
      // 方向用 target - pos 的正負。往上飛火在車底，往下降火在車頂。
      const delta = s.target == null ? s.dir : s.target - s.pos;
      drawJets(ctx, pal, x, y, w, carH, delta >= 0 ? 1 : -1, heat01);
    }

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
        // 一位乘客一個數字，重複的樓層要重複出現——去重會把「兩個人都去 9 樓」
        // 壓成一個 9，就看不出車上有幾個人、也看不出哪一層下得多。
        const dests = s.riders.map(r => r.dest + 1).sort((a, b) => a - b);
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

// ---------------------------------------------------------------- 加速噴口
//
// 按住加速時，在行進方向的**反面**噴兩束火（往上飛火在車底，往下降火在車頂）。
// 長度與顏色都跟著熱量走，所以這一個形狀同時講兩件事：「你在加速」與「你快燒了」。
//
// 為什麼顏色要順便把熱量講出來（#143）：散熱 0～2 級時，按住加速直到過熱
// **比完全不按還慢**（0 級是 0.771×），而過熱的懲罰是那座井停機 8 秒。
// 今天畫面上唯一的訊號是井道頂端一條 2px 的熱量條，離車子很遠——新手會讓自己
// 變慢 23%，而畫面上沒有任何東西告訴他。
//
// 三個下限（長 3px、寬 2px、太窄就合併）是這一段的核心，不是保守：
// 100 層時 carH 只有 4px，沒有下限的話兩束火會退化成兩個看不出來的點。
// 原型的原樣（長度下限 1.5px、寬度 0.22w、不合併）實測就是那樣。
//
// 純視覺：不讀寫任何模擬狀態。抖動的相位用 performance.now()，不寫回去。
function drawJets(ctx, pal, x, y, w, carH, dir, heat01){
  const base = dir > 0 ? y + carH : y, sgn = dir > 0 ? 1 : -1;
  const flick = 0.78 + 0.22 * Math.sin(performance.now() / 1000 * 26);
  const len = Math.max(3, 3 + heat01 * carH * 1.4) * flick;   // ← 長度下限 3px

  // 顏色：暖橘 → 金 → 紅。用 pal 裡既有的鍵，沒有新增。
  // ⚠ pal 沒有 `gold`——那是 CSS 色表（CSS_NIGHT/CSS_DAY）的鍵，畫布拿不到。
  // 畫布這邊的金色是 `carDoors` #f0c04a（日夜都一樣）。issue 給的另一個備案
  // `pal.warn` 不能用：它跟 `heatWarm` 是同一個字串 #f0a04a，拿它當中點會讓
  // heat01 0→0.5 整段完全不變色，等於把一半的訊號扔掉。
  const col = heat01 < 0.5 ? mix(pal.heatWarm, pal.carDoors, heat01 * 2)
                           : mix(pal.carDoors, pal.bad, (heat01 - 0.5) * 2);
  const inner = mix(col, '#ffffff', 0.55);

  const jw = Math.max(2, w * 0.26);                            // ← 寬度下限 2px
  const merged = (w - 4) < (jw * 2 + 2);                       // ← 太窄就合成一束

  const one = (jx, jwid, L) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(jx, base); ctx.lineTo(jx + jwid, base);
    ctx.lineTo(jx + jwid / 2, base + sgn * L);
    ctx.closePath(); ctx.fill();
    // 亮芯只在畫得下的時候加。再小就跟外焰糊成一團，反而看不出形狀。
    if (jwid >= 3 && L >= 4){
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.moveTo(jx + jwid * 0.3, base); ctx.lineTo(jx + jwid * 0.7, base);
      ctx.lineTo(jx + jwid / 2, base + sgn * L * 0.5);
      ctx.closePath(); ctx.fill();
    }
  };

  if (merged) one(x + 2, w - 4, len);
  else { one(x + 2, jw, len); one(x + w - 2 - jw, jw, len); }
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
