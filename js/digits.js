// digits.js — 畫面上的數字改用點陣字。
//
// 為什麼不是「把 font-size 調大就好」：整個遊戲是像素的，system-ui 在 9–11px
// 會被反鋸齒糊成一團灰，跟旁邊硬邊的像素小人也不同調。3×5 的點陣數字放大兩倍
// （6×10px）比 11px 的系統字還好認，而且每個點都落在整數像素上。
//
// 三個數字各有各的空間限制（實測，桌機 fh≈26px）：
//   樓層號        整層樓的寬度都能用
//   等待乘客      每人 19px
//   轎廂內乘客    每人只有 6.1px ← 這裡塞不下任何字，要換做法，不是換字型

const GLYPH = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '..#', '..#'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
};

export const GLYPH_W = 3, GLYPH_H = 5;

// 一串字在某個縮放下佔多寬（字距 1 格）
export function numWidth(text, s){
  const n = String(text).length;
  return n <= 0 ? 0 : (n * GLYPH_W + (n - 1)) * s;
}

// x/y 是左上角。align: 'left' | 'center' | 'right'
export function drawNum(ctx, text, x, y, s, color, align){
  const str = String(text);
  const w = numWidth(str, s);
  let ox = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? Math.round(x - w) : Math.round(x);
  const oy = Math.round(y);
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++){
    const g = GLYPH[str[i]];
    if (!g){ ox += (GLYPH_W + 1) * s; continue; }
    for (let r = 0; r < GLYPH_H; r++){
      const row = g[r];
      let c = 0;
      while (c < GLYPH_W){
        if (row[c] !== '#'){ c++; continue; }
        let n = 1;
        while (c + n < GLYPH_W && row[c + n] === '#') n++;
        ctx.fillRect(ox + c * s, oy + r * s, n * s, s);
        c += n;
      }
    }
    ox += (GLYPH_W + 1) * s;
  }
}

// 數字加一塊底板。小人站在花花綠綠的樓層上，沒有底板的數字會被家具吃掉。
export function drawPlate(ctx, text, cx, top, s, ink, bg, pad){
  const w = numWidth(text, s), p = pad == null ? s : pad;
  const x = Math.round(cx - w / 2) - p, y = Math.round(top) - p;
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w + p * 2, GLYPH_H * s + p * 2);
  drawNum(ctx, text, cx, top, s, ink, 'center');
  return { x, y, w: w + p * 2, h: GLYPH_H * s + p * 2 };
}
