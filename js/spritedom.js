// spritedom.js — 把 sprites.js 的 7×9 字元網格畫成 **DOM**（inline SVG），
// 給三個地方共用：遊戲頁圖鑑 tab、圖鑑頁、favicon。
//
// 為什麼不是 canvas：既有的畫法只有 render.js 的 drawPerson()，那是畫在**一張**
// 全螢幕 canvas 上、每幀重畫。圖鑑是 78 張靜態小圖，開 78 個 <canvas> 等於
// 78 個 GPU 貼圖與 78 次 2D context 建立，而且選不起來、縮放要自己處理、
// favicon 還得再 toDataURL 一次。同一個網格用 <rect> 畫是純標記，零 context。
//
// ---- 為什麼是 <path> 不是一格一個 <rect> ----
// 一張圖有 20～50 格不透明。78 張 × 一格一個 rect ≈ 2,400 個元素。
// 這裡做兩層壓縮，**先橫向合併同色連續格**（`.####..` → 一個 4 格寬的矩形），
// 再把同一色的所有矩形併成**一個 <path>**。結果是每張圖固定 **≤ 2 個元素**
// （身體一個、配件一個；配件 0 格時只有 1 個），78 張 = 155 個元素。
// 量到的數字寫在 #149：見 `spriteCost()`。
//
// ---- 座標系 ----
// viewBox 一律用「格」為單位（`0 0 7 9`，或裁切後的子矩形），縮放交給 CSS 的
// width/height。這樣同一份標記在圖鑑卡（每格 3px）、favicon（每格 2px）
// 與 hover 放大（每格 6px）之間**只有外框尺寸不同**，路徑資料完全一樣。
// 整數座標 + shape-rendering:crispEdges → 任何整數倍都不糊。
//
// ⚠ **這個檔不改任何一張圖，也不改任何一個顏色。** `js/sprites.js` 唯讀
// （#149 的邊界；acceptance 第 15/16/17/19/20 組在守）。這裡只引用 spriteFor()。

import { SPRITE_W, SPRITE_H, spriteFor, PEOPLE } from './sprites.js';

// ---------------------------------------------------------------- 佔用範圍
//
// 78 張裡有 9 張沒有用滿 9 列（cat 只有 6 列、ghost 只有 8 列……）。
// favicon 那邊要靠這個判斷「這張圖 2× 之後裝不裝得進 16px 高」，所以
// **這是量出來的，不是假設 9 列**。
export function spriteBox(rows){
  let top = SPRITE_H, bot = -1, left = SPRITE_W, right = -1;
  for (let r = 0; r < SPRITE_H; r++){
    for (let c = 0; c < SPRITE_W; c++){
      if (rows[r][c] === '.') continue;
      if (r < top) top = r;
      if (r > bot) bot = r;
      if (c < left) left = c;
      if (c > right) right = c;
    }
  }
  if (bot < 0) return { top: 0, bot: SPRITE_H - 1, left: 0, right: SPRITE_W - 1, w: SPRITE_W, h: SPRITE_H };
  return { top, bot, left, right, w: right - left + 1, h: bot - top + 1 };
}

// ---------------------------------------------------------------- 路徑
//
// 回傳一個 SVG path 的 d 字串：同一列連續的同符號格合併成一個矩形。
// 每個矩形寫成 `M x y h n v 1 h -n z`——相對指令，字串比絕對座標短一截。
function pathFor(rows, sym, ox, oy, rowFrom, rowTo){
  let d = '';
  for (let r = rowFrom; r <= rowTo; r++){
    const row = rows[r];
    let c = 0;
    while (c < SPRITE_W){
      if (row[c] !== sym) { c++; continue; }
      let n = 1;
      while (c + n < SPRITE_W && row[c + n] === sym) n++;
      d += `M${c - ox} ${r - oy}h${n}v1h-${n}z`;
      c += n;
    }
  }
  return d;
}

// ---------------------------------------------------------------- 主函式
//
// opts:
//   urgent      false   用 urgent 姿勢（配件仍保留自己的顏色，跟 drawPerson 一致）
//   ink         CSS var 身體色。預設吃 `--sprite-ink`，讓主題自己決定
//   acc         null    覆寫配件色（傳 ink 的值就變成純剪影）
//   silhouette  false   配件也用身體色畫 —— 丙案（公開剪影、藏身分）要用的模式
//   cell        null    每格幾 px。給了就寫死 width/height，沒給就讓 CSS 決定
//   trim        false   裁掉四周全空的列與行（favicon 用；圖鑑卡不用，
//                       因為整排要對齊同一條基線，裁了會高低不一）
//   rowFrom/rowTo       只畫這幾列（favicon 砍冗餘的最後一列用）
//   bg          null    底色磚。給了就先鋪一塊滿版矩形
//   cls / title / extra
//
// 回傳 **字串**，不是節點：三個呼叫端裡有兩個（圖鑑 tab、圖鑑頁）本來就是
// 用 innerHTML 一次貼一大塊，回節點會逼它們改成 append 迴圈，反而更慢。
export function spriteSVG(typeId, opts = {}){
  // `rows` 覆寫（#153）：不是每一張 7×9 的圖都在 `PEOPLE` 裡——問號就不是，而它
  // **必須走這一支**，才會跟旁邊的人物同一個網格、同一條壓縮路徑、同一個尺寸。
  // `typeId` 在這條路徑上是 null；下面除了 spriteFor 之外沒有人用到它。
  const { rows, acc } = opts.rows ? { rows: opts.rows, acc: opts.acc || null }
                                  : spriteFor(typeId, !!opts.urgent);
  const ink = opts.ink || 'var(--sprite-ink, currentColor)';
  const accCol = opts.silhouette ? ink : (opts.acc || acc);

  const box = spriteBox(rows);
  let rowFrom = opts.rowFrom != null ? opts.rowFrom : 0;
  let rowTo   = opts.rowTo   != null ? opts.rowTo   : SPRITE_H - 1;
  let ox = 0, oy = rowFrom, vw = SPRITE_W, vh = rowTo - rowFrom + 1;
  if (opts.trim){
    rowFrom = Math.max(rowFrom, box.top); rowTo = Math.min(rowTo, box.bot);
    ox = box.left; oy = rowFrom; vw = box.w; vh = rowTo - rowFrom + 1;
  }

  const dInk = pathFor(rows, '#', ox, oy, rowFrom, rowTo);
  const dAcc = pathFor(rows, 'o', ox, oy, rowFrom, rowTo);

  let body = '';
  if (opts.bg) body += `<rect x="0" y="0" width="${vw}" height="${vh}" fill="${opts.bg}"/>`;
  if (dInk) body += `<path fill="${ink}" d="${dInk}"/>`;
  // 配件永遠自己的顏色（silhouette 模式除外）。理由跟 render.js:drawPerson 同一條：
  // 配件跟著身體變色的話，形狀換來的辨識度會被顏色吃掉。
  if (dAcc) body += `<path fill="${accCol}" d="${dAcc}"/>`;

  const size = opts.cell ? ` width="${vw * opts.cell}" height="${vh * opts.cell}"` : '';
  const cls  = opts.cls ? ` class="${opts.cls}"` : '';
  const ttl  = opts.title ? `<title>${opts.title}</title>` : '';
  const aria = opts.title ? '' : ' aria-hidden="true"';
  return `<svg${cls}${size} viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg"`
       + ` shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet"${aria}`
       + `${opts.extra || ''}>${ttl}${body}</svg>`;
}

// ---------------------------------------------------------------- 圖鑑卡片的小人
//
// 兩個圖鑑（遊戲頁的 tab、獨立的圖鑑頁）共用這一格，所以它住在這裡而不是 ui.js
// ——不然圖鑑頁就得為了一格小人去 import 整個面板模組。
//
// ⚠ **這一格只給「載過的人」。** #149 那一輪是丙（圖給看、字不給），所以這裡
// 本來寫著「圖永遠畫，不管載過沒有」。**owner 在 #153 修訂了那個裁決**：
// 現在是「圖鑑頁 = 圖鑑 tab 的網頁版」，載過的名字＋說明＋數值全給，
// **沒載過的連圖都不給，換成 `unknownTile()` 的問號**。呼叫端自己分岔。
//
// **載過的那一張是完整的圖，不是單色剪影。** orchestrator 量過（我也獨立量過，
// 兩邊數字對得上）：78 張的二態剪影兩兩 Hamming，normal 最小 2、urgent 最小 0，
// ≤ 4 格的有 23 組。純剪影會讓 ceo/closing、guard/tourist 這些在頁面上變成同一個
// 東西。**配件色才是識別**（第 19 組守著兩兩 ΔE ≥ 9），所以這裡照常上配件色。
//
// cell = 4 → 28×36 px，是 sprites.js 檔頭聲明的 14×18 下限的兩倍；
// 窄螢幕由 CSS 縮到 21×27，仍在下限之上。
export function codexTile(id, opts = {}){
  return `<div class="pxTile">${spriteSVG(id, { cell: 4, ...opts })}</div>`;
}

// ---------------------------------------------------------------- 沒遇過的那一格
//
// owner 修訂了 #149 的裁決（#153）：**圖鑑頁 = 圖鑑 tab 的網頁版**。載過的人
// 名字、說明、數值全給；**沒載過的，連圖都不給——換成一個問號**。
// 兩個介面同一條規則（#153 的表）。
//
// ---- 為什麼問號在這裡，不在 `js/sprites.js` ----
// `sprites.js` 是**人物**表，而且檔頭那五條 CIEDE2000 判準（驗收第 15/16/17/19/20 組
// 在守）守的是「配件識別色」——每一種人靠一個專屬顏色被認出來。
// **問號沒有配件識別色**，它是「還沒有」這個狀態的圖形，不是第 79 種人。
// 塞進 `PEOPLE` 會讓那五條 guard 開始守一個不該守的東西（而且 78→79 之後
// 第 19 組的兩兩 ΔE 母體會多出一列假的配對）。所以它是這一層的常數。
//
// ---- 為什麼不是文字的 `?` ----
// 整頁是 7×9 的像素格。混一個字型的問號進去，字重、基線、抗鋸齒全都跟旁邊
// 對不上。這裡走同一支 `spriteSVG()`：同一個網格、同一個 `<path>` 壓縮、
// 同一個 `shape-rendering:crispEdges`，所以它在每一個倍率下都跟人物一樣銳利。
//
// 筆畫一律 2 格寬：cell 最小會被 CSS 縮到 3px（窄螢幕 21×27），
// 1 格寬的筆畫在那個尺寸下會斷。
export const UNKNOWN_GLYPH = [
  '.#####.',
  '##...##',
  '##...##',
  '.....##',
  '...###.',
  '...##..',
  '...##..',
  '.......',
  '...##..',
];

// 問號的顏色**不寫死**，走 `--sprite-unknown`。理由是量出來的、也是被修正過的：
// #153 寫「畫布沒有亮色主題」，那對 `js/theme.js` 的 `ink`（日夜都是 #eaf0fb）成立，
// **但 `css/style.css` 有 `:root[data-theme="day"]`**（`--text:#16183a`，深色墨）——
// 遊戲頁的面板是有亮色主題的。寫死一個淺色會在白天的面板上消失。
// 兩個呼叫端各自把 `--sprite-unknown` 餵成「比 `--sprite-ink` 低一階、但還看得見」。
export function unknownTile(opts = {}){
  const { title, ...rest } = opts;
  return `<div class="pxTile pxUnknown">`
       + spriteSVG(null, { cell: 4, rows: UNKNOWN_GLYPH,
                           ink: 'var(--sprite-unknown, var(--sprite-ink, currentColor))',
                           title, ...rest })
       + `</div>`;
}

// ---------------------------------------------------------------- favicon
//
// 16×16 的排版問題（#149）：`sprites.js` 檔頭聲明剪影下限 14×18，而 favicon 是
// 16×16。7×9 的整數倍只有 1×（7×9，空太多）與 2×（14×18，**高度爆 2px**）。
//
// 解法不是把圖裁小去遷就，而是**先問這張圖佔幾列**：
//   · 佔用列 ≤ 8 → 2× 之後 ≤ 16px，原封不動置中，零裁切（cat 6 列、ghost 8 列……）
//   · 佔用列 = 9 但最後一列跟前一列逐字相同（或全空）→ 砍掉它是無損的
//   · 兩者都不是 → `faviconPlan()` 回 null，這張圖不該當 favicon
//
// 底色磚是必要的，不是裝飾：theme.js 的 `ink` 日夜都是 `#eaf0fb`（這套 UI 沒有
// 亮色主題），淺色剪影在瀏覽器亮色分頁列上會消失。
export const FAVICON_BG = '#16183a';   // 首頁大樓的外殼色（index.html 的 tower）
export const FAVICON_INK = '#f2f4fb';  // CSS_DAY.text —— 深藍磚上最亮的那一階

// 這張圖 2× 之後裝不裝得進 16×16？裝得進的話要怎麼擺？
// 回 null = 裝不進（會掉資訊），不要拿它當 favicon。
export function faviconPlan(typeId){
  const { rows } = spriteFor(typeId, false);
  const box = spriteBox(rows);
  if (box.h <= 8) return { rowFrom: box.top, rowTo: box.bot, crop: 'none', rowsUsed: box.h };
  // 9 列。最後一列冗餘的話砍掉它，剩 8 列。
  const last = rows[SPRITE_H - 1], prev = rows[SPRITE_H - 2];
  if (last.replace(/\./g, '') === '' || last === prev){
    return { rowFrom: box.top, rowTo: SPRITE_H - 2, crop: 'redundant-last-row', rowsUsed: 8 };
  }
  return null;
}

// 16×16 的 favicon SVG。cell=2 是寫死的：這裡的整個論證就是「2× 是唯一
// 能維持銳利的倍率」，讓呼叫端改倍率等於讓它把論證繞過去。
export function faviconSVG(typeId, opts = {}){
  const plan = faviconPlan(typeId);
  if (!plan) return null;
  const { rows, acc } = spriteFor(typeId, false);
  const box = spriteBox(rows);
  const ink = opts.ink || FAVICON_INK, bg = opts.bg || FAVICON_BG;

  const w = box.w * 2, h = (plan.rowTo - plan.rowFrom + 1) * 2;
  const ox = Math.floor((16 - w) / 2), oy = Math.floor((16 - h) / 2);
  const dInk = pathFor(rows, '#', box.left, plan.rowFrom, plan.rowFrom, plan.rowTo);
  const dAcc = pathFor(rows, 'o', box.left, plan.rowFrom, plan.rowFrom, plan.rowTo);

  let g = '';
  if (dInk) g += `<path fill="${ink}" d="${dInk}"/>`;
  if (dAcc) g += `<path fill="${opts.acc || acc}" d="${dAcc}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">`
       + `<rect width="16" height="16" fill="${bg}"/>`
       + `<g transform="translate(${ox} ${oy}) scale(2)">${g}</g></svg>`;
}

// ---------------------------------------------------------------- 量測用
//
// 「78 張圖一次進 DOM 會不會慢」——單子說自己量，不要假設。這支回的是
// **元素數與標記長度**，實際的 layout 時間由 tests 那邊的探針量。
export function spriteCost(ids){
  const list = ids || Object.keys(PEOPLE);
  let els = 0, bytes = 0, cells = 0;
  for (const id of list){
    const svg = spriteSVG(id, { cell: 3 });
    bytes += svg.length;
    els += 1 + (svg.match(/<path/g) || []).length;
    const { rows } = spriteFor(id, false);
    for (const r of rows) for (const ch of r) if (ch !== '.') cells++;
  }
  return { n: list.length, elements: els, bytes, cells };
}
