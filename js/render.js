// render.js — 畫面。相機永遠框住整棟樓：樓越高，樓就越細，這本身就是獎勵（設計 4.12）。
import { CONFIG as C, bandOf } from './content.js';
import { derived } from './state.js';
import { hourOf, fmtShort } from './sim.js';

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

  const detail = fh >= 16;
  const simTop = Math.min(st.floors, C.SIM_FLOORS);

  // ---- 樓層
  for (let f = 0; f < st.floors; f++){
    const y = floorY(f), band = bandOf(f + 1);
    const abstract = f >= C.SIM_FLOORS;
    ctx.fillStyle = shade(band.color, f % 2 ? 0.42 : 0.34, abstract ? 0.55 : 1);
    ctx.fillRect(pad, y, W - pad * 2, Math.max(1, fh - (fh > 6 ? 1 : 0)));
    if (detail){
      const req = sim.shafts.some(s => s.target === f || s.queue.includes(f));
      ctx.fillStyle = req ? '#7cc4ff' : '#7c8499';
      ctx.font = '600 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(String(f + 1), pad + 6, y + fh / 2 + 4);
    }
  }

  // 抽象樓層的分界線
  if (st.floors > C.SIM_FLOORS){
    const y = floorY(C.SIM_FLOORS - 1);
    ctx.strokeStyle = '#59627a'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8d97ae'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    ctx.save();
    ctx.beginPath(); ctx.rect(pad, y - 14, view.shaftX - pad - 6, 14); ctx.clip();
    ctx.fillText(`統計流量 $${fmtShort(sim.abstract.income)}/秒 · 服務率 ${Math.round(sim.abstract.ratio*100)}%`,
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
      ctx.fillStyle = `rgba(140,180,230,${0.10 + 0.28 * sim.abstract.ratio})`;
      ctx.fillRect(mx - 1, my, 2, 3);
    }
  }
  // 空中大廳
  if (sim.lobby){
    const y = floorY(sim.lobby);
    ctx.strokeStyle = '#f0c04a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad, y + fh); ctx.lineTo(W - pad, y + fh); ctx.stroke();
  }

  // ---- 等待中的乘客
  const perFloor = new Map();
  for (const p of sim.waiting) perFloor.set(p.origin, (perFloor.get(p.origin) || []).concat(p));
  for (const [f, list] of perFloor){
    const y = floorY(f);
    if (detail){
      let n = 0;
      for (const p of list){
        const x = pad + 26 + n * 20;
        if (x > view.shaftX - 18) break;
        drawPerson(ctx, x, y + fh / 2 + 6, String(p.dest + 1), false, p);
        if (++n > 6) break;
      }
      if (list.length > 7){
        ctx.fillStyle = '#8d97ae'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
        ctx.fillText('+' + (list.length - 7), pad + 26 + 7 * 20, y + fh / 2 + 4);
      }
    } else {
      // 樓太矮就畫成一條人數條
      const w = Math.min(view.shaftX - pad - 24, list.length * 5);
      const worst = Math.min(...list.map(p => p.left / p.patience));
      ctx.fillStyle = worst < 0.25 ? '#e2645a' : '#7f89a3';
      ctx.fillRect(pad + 20, y + Math.max(0, fh / 2 - 1.5), w, Math.max(1.5, fh - 2));
    }
  }

  // ---- 電梯井
  for (let i = 0; i < sim.shafts.length; i++){
    const s = sim.shafts[i];
    const x = view.shaftX + i * view.colW + 2, w = view.colW - 4;
    ctx.fillStyle = '#161a22'; ctx.fillRect(x, pad, w, H - pad * 2);
    ctx.strokeStyle = s.express ? '#c08a3a' : '#2c313d'; ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, pad + .5, w - 1, H - pad * 2 - 1);
    if (s.express && s.from){
      ctx.fillStyle = 'rgba(240,192,74,.06)';
      ctx.fillRect(x, floorY(s.to), w, (s.to - s.from + 1) * fh);
    }

    const carH = Math.max(4, fh - 2), y = floorY(s.pos) + 1;
    ctx.fillStyle = '#20242e'; ctx.fillRect(x + 1, y, w - 2, carH);
    ctx.strokeStyle = s.lock > 0 ? '#e2645a' : (s.mode === 'doors' ? '#f0c04a' : '#3d4557');
    ctx.lineWidth = s.mode === 'doors' ? 2 : 1;
    ctx.strokeRect(x + 1.5, y + .5, w - 3, carH - 1);

    if (detail && s.riders.length){
      const cap = derived(st).capacity;
      s.riders.slice(0, 6).forEach((p, k) => {
        drawPerson(ctx, x + (w) * (k + 0.5) / Math.min(6, Math.max(1, cap)), y + carH / 2 + 6, String(p.dest + 1), true, p);
      });
    } else if (s.riders.length){
      ctx.fillStyle = '#8fa4c8';
      ctx.fillRect(x + 2, y + 1, (w - 4) * Math.min(1, s.riders.length / Math.max(1, d.capacity)), Math.max(1, carH - 2));
    }

    // 門
    let open = 0;
    if (s.mode === 'doors' || s.mode === 'held'){
      const t = s.doorT, L = s.doorLen;
      open = s.mode === 'held' ? 1 : (t < 0.35 ? t / 0.35 : (t > L - 0.35 ? Math.max(0, (L - t) / 0.35) : 1));
    }
    const half = (w - 2) / 2, slide = half * open;
    ctx.fillStyle = '#39404f';
    ctx.fillRect(x + 1, y, half - slide, carH);
    ctx.fillRect(x + 1 + half + slide, y, half - slide, carH);

    // 熱量條
    if (s.heat > 0.05 || s.lock > 0){
      const hp = s.lock > 0 ? 1 : s.heat / d.heatMax;
      ctx.fillStyle = s.lock > 0 ? '#e2645a' : (hp > 0.7 ? '#f0a04a' : '#6d7690');
      ctx.fillRect(x + 1, pad + 2, (w - 2) * hp, 2);
    }
  }

  // ---- 飄出來的錢
  ctx.textAlign = 'right'; ctx.font = '700 13px system-ui';
  for (const p of sim.pops){
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.bad ? '#e2645a' : '#5ddc9a';
    ctx.fillText(p.txt, view.shaftX - 6, floorY(p.floor) + fh / 2 + p.off - (1 - p.life) * 26);
  }
  ctx.globalAlpha = 1;

  // ---- 夜色
  const nt = nightTint(h);
  if (nt > 0){ ctx.fillStyle = `rgba(18,22,44,${nt})`; ctx.fillRect(0, 0, W, H); }

  // ---- 時鐘
  const hh = String(Math.floor(h)).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  ctx.textAlign = 'left'; ctx.font = '600 11px system-ui'; ctx.fillStyle = '#8d97ae';
  ctx.fillText(`${hh}:${mm}`, pad + 2, pad + 10);
  if ((h >= 8 && h < 10) || (h >= 17 && h < 19)){
    ctx.fillStyle = '#f0a04a'; ctx.fillText('尖峰', pad + 38, pad + 10);
  }
}

function drawPerson(ctx, x, y, label, inCar, p){
  const urgent = p && (p.left / p.patience) < 0.25;
  const wob = urgent ? Math.sin(performance.now() / 90 + x) * 1.2 : 0;
  ctx.fillStyle = inCar ? '#2b2f3a' : '#333949';
  ctx.strokeStyle = urgent ? '#e2645a' : (inCar ? '#7f88a0' : '#9aa3ba');
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x + wob, y - 9, 3.4, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + wob, y - 5); ctx.lineTo(x + wob, y + 1); ctx.stroke();
  ctx.fillStyle = urgent ? '#e2645a' : '#cfd6e6';
  ctx.font = '600 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(label, x + wob, y + 10);
  if (p && p.patience < 500){
    const w = 12, ratio = Math.max(0, p.left / p.patience);
    ctx.fillStyle = '#2a2f3b'; ctx.fillRect(x - w/2, y - 16, w, 2);
    ctx.fillStyle = ratio < 0.25 ? '#e2645a' : ratio < 0.6 ? '#f0a04a' : '#5ddc9a';
    ctx.fillRect(x - w/2, y - 16, w * ratio, 2);
  }
}

function shade(hex, k, alpha){
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgba(${r},${g},${b},${alpha == null ? 1 : alpha})`;
}
