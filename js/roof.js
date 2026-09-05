// roof.js — 大樓頂上的中式屋頂。
//
// 中式屋頂靠三件事被認出來，缺一件就變成金字塔：
//   1) 反宇 —— 屋面是凹的：靠正脊很陡、靠屋簷變平。半寬表上疏下密就是這件事。
//   2) 翼角起翹 —— 屋簷兩端往上挑（flick），這是招牌。
//   3) 正脊上的鴟吻 —— 兩個小獸頭。
//
// 半寬是手排的表，不是曲線公式：11 列的解析度下任何連續曲線四捨五入之後
// 翹角都會斷成碎片。手排才對稱、才每個像素都可控。
//
// 三個尺寸是因為屋頂會吃掉樓層的高度——相機永遠框住整棟樓（設計 4.12），
// 屋頂佔走的每一 px 都是從樓層身上拿的。樓越高，屋頂越小。

import { P } from './theme.js';

// frac = 屋頂寬度佔大樓的比例。1.08 = 蓋滿整個大樓寬，兩側各出挑 4%——
//        屋簷本來就該比牆面寬，那個出挑是中式屋頂的一部分。
// hFrac = 屋頂高度，也用大樓寬度當基準。高度必須跟格寬脫鉤：
//        以前高度是「格數 × 格寬」算出來的，寬度一拉滿，高度就跟著暴增。
//        現在格子是扁的（寬 >> 高），這也剛好是寬屋頂該有的比例。
const SPECS = {
  big:   { hw:[4,5,6,7,8,10,12,15,18,21,24], flare:3, upsweep:3,
           tiles:[2,5,8], orn:4, brk:3, frac:1.08, hFrac:0.050 },
  mid:   { hw:[3,4,5,6,8,10,13,16],          flare:2, upsweep:2,
           tiles:[2,5],   orn:3, brk:3, frac:1.08, hFrac:0.042 },
  small: { hw:[2,3,4,6,8,10],                flare:2, upsweep:2,
           tiles:[2],     orn:2, brk:2, frac:1.08, hFrac:0.034 },
};

function build(spec){
  const hw = spec.hw, R = hw.length, mx = hw[R - 1], W = mx * 2 + 1, cx = mx;
  const g = Array.from({ length: R + 1 }, () => new Array(W).fill('.'));
  const edge = mx - spec.flare;
  for (let dx = 0; dx <= mx; dx++){
    let top, bot;
    if (dx <= edge){
      // 屋面：半寬表上疏下密，這就是反宇（靠正脊很陡、靠屋簷變平）
      top = R - 1;
      for (let r = 0; r < R; r++) if (hw[r] >= dx){ top = r; break; }
      bot = R - 1;
    } else {
      // 翼角起翹：最外側每格只抬一階、厚度固定兩格。
      // 每格只抬一階是關鍵——抬多了相鄰欄位對不上，翹角會斷成飄在空中的碎塊，
      // 屋頂壓扁之後那個斷口會變成一百多 px 寬。
      const lift = Math.min(spec.upsweep, dx - edge);
      top = Math.max(0, R - 1 - lift);
      bot = Math.min(R - 1, top + 1);
    }
    for (let y = top; y <= bot; y++){
      const ch = spec.tiles.includes(y) ? '-' : '#';
      g[y][cx - dx] = ch; g[y][cx + dx] = ch;
    }
  }
  for (let x = 0; x < W; x++) if (g[0][x] !== '.') g[0][x] = '=';
  g[0][cx - spec.orn] = 'o'; g[0][cx + spec.orn] = 'o';    // 鴟吻
  for (let x = cx - mx + 1; x < cx + mx; x += spec.brk) g[R][x] = 'b';   // 斗拱
  return g;
}

const GRIDS = {};
for (const k in SPECS) GRIDS[k] = build(SPECS[k]);

export const kindFor = floors => floors <= 20 ? 'big' : (floors <= 50 ? 'mid' : 'small');
export const cellsWide = kind => GRIDS[kind][0].length;
export const cellsTall = kind => GRIDS[kind].length;

// 屋頂佔畫面多高。樓越高佔比越小，但不能小到看不出是屋頂。
export function roofHeight(floors, buildingW){
  return Math.max(12, Math.round(buildingW * SPECS[kindFor(floors)].hFrac));
}

export function drawRoof(ctx, floors, bx, by, buildingW){
  const k = kindFor(floors), g = GRIDS[k];
  const W = g[0].length, R = g.length;
  const cs = (buildingW * SPECS[k].frac) / W;
  const csy = roofHeight(floors, buildingW) / R;
  const ox = bx + (buildingW - W * cs) / 2;
  const pal = P();
  const COL = { '#': pal.tile, '-': pal.tileDark, '=': pal.tileRidge,
                'o': pal.tileOrn, 'b': pal.tileBrk };
  for (let r = 0; r < R; r++){
    const row = g[r];
    let c = 0;
    while (c < W){
      const ch = row[c];
      if (ch === '.'){ c++; continue; }
      let n = 1;
      while (c + n < W && row[c + n] === ch) n++;
      ctx.fillStyle = COL[ch];
      ctx.fillRect(ox + c * cs, by + r * csy, n * cs + 0.5, csy + 0.5);
      c += n;
    }
  }
}
