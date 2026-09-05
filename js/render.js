// render.js — 畫面。相機永遠框住整棟樓：樓越高，樓就越細，這本身就是獎勵（設計 4.12）。
import { CONFIG as C, bandOf } from './content.js';
import { derived, isLeased } from './state.js';
import { hourOf, dayName, fmtShort } from './sim.js';
import { t } from './i18n.js';
import { P } from './theme.js';
import { spriteFor, SPRITE_W, SPRITE_H } from './sprites.js';

export const view = { W:0, H:0, pad:10, fh:0, shaftX:0, shaftW:0, colW:0 };

export function layout(cv, ctx, st, sim){
  const r = cv.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.W = r.width; view.H = r.height;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.fh = Math.max(3, (view.H - view.pad * 2) / st.floors);
  const n = sim.shafts.length;
  view.shaftW = Math.min(view.W * 0.46, n * 30 + 10);
  view.shaftX = view.W - view.pad - view.shaftW;
  view.colW = view.shaftW / n;
  return true;
}

export const floorY = f => view.H - view.pad - (f + 1) * view.fh;
export const floorAt = y => Math.floor((view.H - view.pad - y) / view.fh);

function nightTint(h){
  if (h >= 6 && h < 18) return 0;
  if (h >= 18 && h < 21) return (h - 18) / 3 * 0.55;
  if (h >= 21 || h < 4) return 0.55;
  return (6 - h) / 2 * 0.55;
}

export function draw(ctx, st, sim){
  const { W, H, pad, fh } = view;
  const d = derived(st);
  const h = hourOf(st);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = P().bg; ctx.fillRect(0, 0, W, H);

  const detail = fh >= 16;
  const simTop = Math.min(st.floors, C.SIM_FLOORS);

  // ---- 樓層
  for (let f = 0; f < st.floors; f++){
    const y = floorY(f), band = bandOf(f + 1);
    const abstract = f >= C.SIM_FLOORS;
    const empty = !isLeased(st, f);
    const pal = P();
    ctx.fillStyle = empty
      ? `rgba(${pal.empty},${abstract ? 0.5 : 0.85})`
      : (pal.floorFlat
          ? (abstract ? pal.floorFlatAbstract : pal.floorFlat[f % 2])
          : shade(band.color, f % 2 ? pal.floorA : pal.floorB,
                  abstract ? pal.abstractAlpha : pal.floorAlpha));
    ctx.fillRect(pad, y, W - pad * 2, Math.max(1, fh - (fh > 6 ? 1 : 0)));
    // 左緣的樓層帶色條：整片樓層底色太暗會看不出分帶，色條負責把它講清楚
    if (!empty && fh >= 4){
      ctx.fillStyle = shade(band.color, pal.stripe, abstract ? 0.6 : 1);
      ctx.fillRect(pad, y, Math.min(7, Math.max(3, fh * 0.5)), Math.max(1, fh - (fh > 6 ? 1 : 0)));
    }
    if (empty && fh >= 5){          // 空樓層畫成工地的斜線
      ctx.strokeStyle = P().emptyHatch; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = pad; x < W - pad; x += 9){ ctx.moveTo(x, y + fh); ctx.lineTo(x + fh, y); }
      ctx.stroke();
    }
    if (detail){
      const req = sim.shafts.some(s => s.target === f || s.queue.includes(f));
      ctx.fillStyle = req ? P().floorNumOn : P().floorNum;
      ctx.font = '600 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(String(f + 1), pad + 6, y + fh / 2 + 4);
    }
  }

  // 抽象樓層的分界線
  if (st.floors > C.SIM_FLOORS){
    const y = floorY(C.SIM_FLOORS - 1);
    ctx.strokeStyle = P().divider; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = P().label; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    ctx.save();
    ctx.beginPath(); ctx.rect(pad, y - 14, view.shaftX - pad - 6, 14); ctx.clip();
    ctx.fillText(t('modelLine', fmtShort(sim.abstract.income), Math.round(sim.abstract.ratio*100)),
                 pad + 4, y - 4);
    ctx.restore();

    // 上面那 160 層不是死的，只是不逐個模擬：用流動的光點表示吞吐量
    const motes = Math.min(60, Math.round(24 * sim.abstract.ratio) + 6);
    const spanTop = floorY(st.floors - 1), spanH = y - spanTop;
    const now = performance.now() / 1000;
    for (let i = 0; i < motes; i++){
      const seed = i * 137.5;
      const speed = 0.05 + (i % 5) * 0.02 + sim.abstract.ratio * 0.06;
      const up = i % 2 === 0;
      let k = ((now * speed + (seed % 1000) / 1000) % 1);
      if (!up) k = 1 - k;
      const my = spanTop + k * spanH;
      const col = i % sim.shafts.length;
      const mx = view.shaftX + col * view.colW + view.colW / 2 + ((i % 3) - 1) * 3;
      ctx.fillStyle = `rgba(${P().motes},${0.10 + 0.28 * sim.abstract.ratio})`;
      ctx.fillRect(mx - 1, my, 2, 3);
    }
  }
  // 空中大廳
  if (sim.lobby){
    const y = floorY(sim.lobby);
    ctx.strokeStyle = P().carDoors; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad, y + fh); ctx.lineTo(W - pad, y + fh); ctx.stroke();
  }

  // ---- 取樣乘客（代表 20 人份）：不管樓層被壓得多扁都要看得見
  const heavy = sim.waiting.filter(p => (p.w || 1) > 1);
  for (const p of heavy){
    const y = floorY(p.origin) + fh / 2;
    const urgent = p.left / p.patience < 0.3;
    ctx.fillStyle = urgent ? P().bad : P().sampled;
    ctx.beginPath(); ctx.arc(pad + 14, y, Math.max(3, Math.min(5, fh / 2)), 0, 7); ctx.fill();
    ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`×${p.w} → ${p.dest + 1}`, pad + 22, y + 3.5);
    // 耐性條
    const bw = 26, r = Math.max(0, p.left / p.patience);
    ctx.fillStyle = P().patienceBg; ctx.fillRect(pad + 22, y + 6, bw, 2);
    ctx.fillStyle = urgent ? P().bad : P().money;
    ctx.fillRect(pad + 22, y + 6, bw * r, 2);
  }

  // ---- 等待中的乘客
  const perFloor = new Map();
  for (const p of sim.waiting){ if ((p.w || 1) > 1) continue;
    perFloor.set(p.origin, (perFloor.get(p.origin) || []).concat(p)); }
  for (const [f, list] of perFloor){
    const y = floorY(f);
    if (detail){
      const csF = Math.max(1, Math.min(3, Math.floor(fh / 11)));
      const step = Math.max(18, SPRITE_W * csF + 5);
      let n = 0;
      for (const p of list){
        const x = pad + 20 + step * n + step / 2;
        if (x + step / 2 > view.shaftX - 6) break;
        drawPerson(ctx, x, y + fh / 2 + 6, String(p.dest + 1), false, p);
        if (++n > 6) break;
      }
      if (list.length > n){
        ctx.fillStyle = P().label; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
        ctx.fillText('+' + (list.length - n), view.shaftX - 16, y + fh / 2 + 4);
      }
    } else {
      // 樓太矮就畫成一條人數條
      const w = Math.min(view.shaftX - pad - 24, list.length * 5);
      const worst = Math.min(...list.map(p => p.left / p.patience));
      ctx.fillStyle = worst < 0.25 ? P().bad : P().crowdBar;
      ctx.fillRect(pad + 20, y + Math.max(0, fh / 2 - 1.5), w, Math.max(1.5, fh - 2));
    }
  }

  // ---- 電梯井
  for (let i = 0; i < sim.shafts.length; i++){
    const s = sim.shafts[i];
    const x = view.shaftX + i * view.colW + 2, w = view.colW - 4;
    ctx.fillStyle = P().shaft; ctx.fillRect(x, pad, w, H - pad * 2);
    ctx.strokeStyle = s.express ? P().shaftExpress : P().shaftEdge; ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, pad + .5, w - 1, H - pad * 2 - 1);
    if (s.express && s.from){
      ctx.fillStyle = P().expressTint;
      ctx.fillRect(x, floorY(s.to), w, (s.to - s.from + 1) * fh);
    }

    const pal = P();
    const carH = Math.max(4, fh - 2), y = floorY(s.pos) + 1;
    ctx.fillStyle = pal.car; ctx.fillRect(x + 1, y, w - 2, carH);

    // 門。畫在乘客「之前」——原本畫在之後，門一關就把整台車蓋住，
    // 車裡的人永遠看不見（亮色主題下更明顯，整台變成一個黑盒子）。
    let open = 0;
    if (s.mode === 'doors' || s.mode === 'held'){
      const t = s.doorT, L = s.doorLen;
      open = s.mode === 'held' ? 1 : (t < 0.35 ? t / 0.35 : (t > L - 0.35 ? Math.max(0, (L - t) / 0.35) : 1));
    }
    const half = (w - 2) / 2, slide = half * open;
    ctx.fillStyle = pal.door;
    ctx.fillRect(x + 1, y, half - slide, carH);
    ctx.fillRect(x + 1 + half + slide, y, half - slide, carH);
    // 門上的觀景窗：讓「隔著門看得到人」講得通
    if (carH >= 10){
      const gy = y + carH * 0.18, gh = carH * 0.62;
      ctx.fillStyle = pal.carGlass;
      ctx.fillRect(x + 3, gy, half - slide - 2 > 0 ? half - slide - 2 : 0, gh);
      ctx.fillRect(x + 1 + half + slide + 1, gy, half - slide - 2 > 0 ? half - slide - 2 : 0, gh);
    }

    // 乘客畫在門之上
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

    const heavyRiders = s.riders.filter(r => (r.w || 1) > 1).length;
    if (heavyRiders){
      ctx.fillStyle = pal.sampled;
      ctx.beginPath(); ctx.arc(x + w - 4, y + 4, 2.5, 0, 7); ctx.fill();
    }

    // 外框最後畫，才不會被門或乘客蓋掉
    ctx.strokeStyle = s.lock > 0 ? pal.bad : (s.mode === 'doors' ? pal.carDoors : pal.carEdge);
    ctx.lineWidth = s.mode === 'doors' ? 2 : 1;
    ctx.strokeRect(x + 1.5, y + .5, w - 3, carH - 1);

    // 熱量條
    if (s.heat > 0.05 || s.lock > 0){
      const hp = s.lock > 0 ? 1 : s.heat / d.heatMax;
      ctx.fillStyle = s.lock > 0 ? P().bad : (hp > 0.7 ? P().heatWarm : P().heatCool);
      ctx.fillRect(x + 1, pad + 2, (w - 2) * hp, 2);
    }
  }

  // ---- 飄出來的錢
  ctx.textAlign = 'right'; ctx.font = '700 13px system-ui';
  for (const p of sim.pops){
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.bad ? P().bad : P().money;
    ctx.fillText(p.txt, view.shaftX - 6, floorY(p.floor) + fh / 2 + p.off - (1 - p.life) * 26);
  }
  ctx.globalAlpha = 1;

  // ---- 夜色
  const nt = nightTint(h);
  if (nt > 0){ ctx.fillStyle = `rgba(${P().nightTint},${nt * P().nightMax / 0.55})`; ctx.fillRect(0, 0, W, H); }

  // ---- 時鐘
  const hh = String(Math.floor(h)).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  ctx.textAlign = 'left'; ctx.font = '600 11px system-ui'; ctx.fillStyle = P().label;
  ctx.fillText(`${dayName(st)} ${hh}:${mm}`, pad + 2, pad + 10);
  let hx = pad + 76;
  if ((h >= 8 && h < 10) || (h >= 17 && h < 19)){
    ctx.fillStyle = P().warn; ctx.fillText(t('peak'), hx, pad + 10); hx += 34;
  }
  if (sim.mood >= 1.25){ ctx.fillStyle = P().bad; ctx.fillText(t('busy'), hx, pad + 10); }
  else if (sim.mood <= 0.75){ ctx.fillStyle = P().heatCool; ctx.fillText(t('quiet'), hx, pad + 10); }
}

function drawPerson(ctx, x, y, label, inCar, p, maxW){
  const pal = P();
  const urgent = p && (p.left / p.patience) < 0.25;
  const wob = urgent ? Math.round(Math.sin(performance.now() / 90 + x)) : 0;
  const { rows, acc } = spriteFor(p && p.type, urgent);

  // 一格幾像素：樓層越高格子越大，但保持整數，才不會糊掉
  // 樓層 22px 就升到 2 倍，形狀才看得出來；但不能寬過分配到的位置，否則人會疊在一起
  let cs = Math.max(1, Math.min(3, Math.floor(view.fh / 11)));
  if (maxW) cs = Math.max(1, Math.min(cs, Math.floor(maxW / SPRITE_W)));
  const w = SPRITE_W * cs, h = SPRITE_H * cs;
  const left = Math.round(x - w / 2) + wob, top = Math.round(y - h) + 2;

  const ink = urgent ? pal.bad : (inCar ? pal.inkCar : pal.ink);
  // 分兩趟畫（身體、配件），省下每格切換顏色的成本
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

function shade(hex, k, alpha){
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgba(${r},${g},${b},${alpha == null ? 1 : alpha})`;
}
