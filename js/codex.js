// codex.js — 獨立的乘客圖鑑頁（#149）。
//
// ---- owner 裁決是丙，而丙給了這一頁一個真正的設計問題 ----
// 「公開剪影與圖，藏名字與數值」。orchestrator 的解讀：**公開頁永遠不解鎖**，
// 而它同時問了「一頁 78 個沒有名字的人，要怎麼才有用?它不能只是一片無名的圖。」
//
// 我的答案是三件事，理由各自寫在下面：
//   1. **按樓層帶分組**——名字拿掉之後，樓層帶是唯一還在的語意軸
//   2. **兩個姿勢都給**——urgent 是玩家真的要認的東西，而且它不含任何被藏的字
//   3. **進度只給數字，不給名字**——蒐集感留著，但不靠「打問號」撐版面
//
// ---- 明確不做的 ----
// **不放假的名字、編號或「???」當佔位**（orchestrator：「藏名字就是藏名字」）。
// 所以每一格只有圖，沒有標籤；認人靠形狀與配件色，那正是這套圖被設計的方式。
//
// ---- 為什麼是完整的圖而不是單色剪影 ----
// orchestrator 量過、我也獨立量過（數字對得上）：78 張的二態剪影兩兩 Hamming
// normal 最小 2、urgent 最小 0、≤ 4 格的有 23 組。純剪影會讓 ceo/closing、
// guard/tourist 在這一頁上變成同一個東西。**配件色才是識別**（第 19 組守著
// 兩兩 ΔE ≥ 9）。所以這裡照常上配件色，spriteSVG 也不走 silhouette 模式。

import { PASSENGERS, BANDS } from './content.js';
import { codexTile } from './spritedom.js';
import { t, L, getLang, setLang, toggleLang } from './i18n.js';

const $ = s => document.querySelector(s);

// 存檔只用來算「見過幾個」。**不用它解鎖任何名字或數值**——那是裁決的字面。
// 讀失敗（無痕視窗、清過站台資料）就當成沒有存檔，不報錯。
function readSave(){
  try {
    const raw = localStorage.getItem('elevator_inc_v1');
    if (!raw) return null;
    const st = JSON.parse(raw);
    return (st && st.v === 1) ? st : null;
  } catch(e){ return null; }
}

// ---------------------------------------------------------------- 分組
//
// PASSENGERS 的 `band` 是樓層帶的 key，或 `'any'`（每一層都會出現的那幾種）。
// 順序照 BANDS 的樓層順序，`any` 放最前面——它是玩家第一天就看得到的那一批。
//
// **分組是這一頁唯一的資訊架構。** 名字與數值都藏了之後，「這個人出現在幾樓」
// 是唯一還能講的事，而它剛好是遊戲的第二個賣點（樓越高的人越奇怪）。
function groups(){
  const out = [];
  const any = PASSENGERS.filter(p => p.band === 'any');
  if (any.length) out.push({ key:'any', label:t('codexAnyBand'), range:'', list:any });
  for (const b of BANDS){
    const list = PASSENGERS.filter(p => p.band === b.key);
    if (!list.length) continue;
    out.push({ key:b.key, label:L(b, 'name', 'bands'),
               range:`${b.from}–${b.to > 900 ? '∞' : b.to}`, list });
  }
  // `band` 還有第三種值：**單一樓層**（`sim.js:251` 讀 `'floor13'`，只有 ghost 用）。
  // 它不在 BANDS 裡，所以上面兩圈都撈不到。給它自己一組，標成樓層號碼——
  // 樓層本來就是這一頁對每一個人都公開的軸，13 樓不該是例外。
  //
  // ⚠ 這是我的判斷：一組只有一個人的「13 樓」等於告訴訪客那層有東西。
  // 我認為那跟整頁的做法一致（藏的是名字與數值，不是出現在幾樓），
  // 但**要拿掉的話這裡改一行就好**，見 #149 的交付。
  const placed = new Set(out.flatMap(g => g.list.map(p => p.id)));
  const rest = PASSENGERS.filter(p => !placed.has(p.id));
  const single = new Map();
  const odd = [];
  for (const p of rest){
    const m = /^floor(\d+)$/.exec(p.band || '');
    if (!m) { odd.push(p); continue; }
    if (!single.has(m[1])) single.set(m[1], []);
    single.get(m[1]).push(p);
  }
  for (const [f, list] of [...single].sort((a, b) => a[0] - b[0]))
    out.push({ key:'f' + f, label:t('codexOneFloor', f), range:'', list });   // label 已經講了樓層，range 再講一次是重複
  // 真的認不得的 band（打錯字、新帶還沒進 BANDS）**不能安靜消失**，
  // 否則 78 張裡少了幾張沒有人會發現。撿到一個看得見的籃子裡。
  if (odd.length) out.push({ key:'?', label:'band=' + [...new Set(odd.map(p => p.band))].join(','),
                             range:'', list:odd });
  return out;
}

// ---------------------------------------------------------------- 畫面
//
// 每一格畫**兩張** SVG（normal 與 urgent），用 CSS 疊著切換：hover 換單格、
// 頂欄的按鈕換整頁（觸控沒有 hover，不能只靠 hover）。
// 兩張一起進 DOM 是刻意的——切換不重建節點，就不會有第一次換姿勢的閃爍。
// 代價量過：78 張 × 2 = 156 張圖、308 個 <path>、首次 13.5ms / 重畫 6.0ms（含 layout）。
// 量的方法在下面的 mark()——不是估的。
function tile(p){
  return `<div class="cxCell" role="img" aria-label="passenger">`
       + `<span class="n">${codexTile(p.id, { cell: 5 })}</span>`
       // urgent 的身體色用 **`--spriteBad`（= theme.js 的 `pal.bad` #e2645a，逐字）**，
       // 不是 UI 的 `--bad` #ff8a8a。理由是量出來的：配件色對 #e2645a 最小 ΔE 24.17，
       // 對 #ff8a8a 只有 17.47（anniv）——#e2645a 才是 acceptance 第 20 組守著的那個對象。
       + `<span class="u">${codexTile(p.id, { cell: 5, urgent: true, ink: 'var(--spriteBad)' })}</span>`
       + `</div>`;
}

function paint(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('#lang').textContent = getLang() === 'zh' ? 'EN' : '中';
  $('#pose').textContent = document.body.classList.contains('urgentAll')
    ? t('codexPoseCalm') : t('codexPoseUrgent');
  $('#btnPlay').textContent = readSave() ? t('btnContinue') : t('btnStart');

  const st = readSave();
  const seen = st && st.codex ? PASSENGERS.filter(p => st.codex[p.id]).length : 0;
  $('#seenLine').textContent = st ? t('codexSeen', seen, PASSENGERS.length) : t('codexNoSave');

  const t0 = performance.now();
  $('#bands').innerHTML = groups().map(g => `<section class="cxBand">
      <h2 class="cxBandHead">
        ${g.range ? `<span class="cxRange pxs">${g.range}</span>` : ''}
        <span class="cxBandName">${g.label}</span>
        <span class="cxCount pxs">${t('codexBandN', g.list.length)}</span>
      </h2>
      <div class="cxGrid">${g.list.map(tile).join('')}</div>
    </section>`).join('');
  mark(t0);
}

// 「78 張圖一次進 DOM 會不會慢，自己量，不要假設」（#149）。這一頁比遊戲頁的
// tab 更極端：兩個姿勢都畫，所以是 156 張。數字印在 console，不佔畫面。
function mark(t0){
  const svgs = document.querySelectorAll('#bands svg').length;
  const paths = document.querySelectorAll('#bands svg path').length;
  document.querySelector('#bands').getBoundingClientRect();   // 逼 layout
  console.log(`[codex] ${PASSENGERS.length} 種 × 2 姿勢 = ${svgs} 張圖、${paths} 個 path、`
            + `${(performance.now() - t0).toFixed(1)}ms（含 layout）`);
}

// 觸控沒有 hover，而提示文案講了「點一下」——所以點一格就要真的會換姿勢，
// 不能只有頂欄那顆整頁的按鈕。用委派，78 格不掛 78 個 listener。
$('#bands').addEventListener('click', e => {
  const cell = e.target.closest('.cxCell');
  if (cell) cell.classList.toggle('on');
});

$('#lang').addEventListener('click', () => { toggleLang(); paint(); });
$('#pose').addEventListener('click', () => {
  document.body.classList.toggle('urgentAll');
  $('#pose').textContent = document.body.classList.contains('urgentAll')
    ? t('codexPoseCalm') : t('codexPoseUrgent');
});

setLang(getLang());   // 把 <html lang> 同步成目前的語言
paint();
