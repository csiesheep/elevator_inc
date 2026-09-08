// codex.js — 獨立的乘客圖鑑頁。
//
// ---- owner 在 #153 修訂了 #149 的裁決。這一頁的定義換了 ----
// #149 是丙（「公開剪影與圖，藏名字與數值」），所以上一版這一頁是 78 個**沒有名字
// 的圖**，靠樓層帶分組撐住可讀性。**#153 取消了那個規則**，改成：
//
//   > **圖鑑頁 = 圖鑑 tab 的網頁版。**「完全比照 tab（名字＋說明＋數值）」
//
//   | | 已遇過 | 沒遇過 |
//   |---|---|---|
//   | 人物圖 | 正常顯示 | **問號** |
//   | 名字 / 說明 / 單價·耐性·佔位 / 載過幾次 | **顯示** | 藏 |
//
// 所以這一頁跟 `js/ui.js` 的圖鑑 tab **共用同一支卡片產生器**（`codexCardHTML`）。
// 上一輪兩邊各寫一份，結果兩邊的規則長得不一樣；一條規則套兩個介面，就該只有一份實作。
//
// ---- 已經確認過、不要再改的後果 ----
// **沒有存檔的訪客會看到 78 個問號。** orchestrator 在提甲乙丙時就標了這個缺點，
// owner 明確裁決：**「可以，圖鑑就是要蒐集的。」**
// 所以這裡**沒有**「沒存檔就全部給看」的旁路，也**沒有**假的名字或編號當佔位。
// 空狀態說的話是 `codexNoSave`，而 #153 說它「現在只是一行小字，位置和份量要重想」
// ——它現在是頁首的整塊空狀態卡（`.cxEmpty`），跟「開始遊戲」放在一起。
//
// ---- 留下來的（#153 沒有動到，而且新規則下更成立）----
// **按樓層帶分組**：名字回來之後它不再是唯一的資訊軸，但「這個人出現在幾樓」
// 仍然是這一頁唯一講得出、而遊戲 tab 那條平鋪的清單講不出的事。
// **兩個姿勢**：hover / 點一下換 urgent。只給**載過**的人——沒載過的是一個問號，
// 問號沒有「快沒耐性」的樣子。

import { PASSENGERS, BANDS } from './content.js';
// 卡片本體從 `ui.js` 借，**方向是刻意的**：裁決的字面是「圖鑑頁 = 圖鑑 tab 的
// 網頁版」，所以 tab 那一支是正本，這一頁是它的網頁版，不是反過來。
// ⚠ 代價：這一頁的模組圖因此多了 `ui.js` → `state.js` / `sim.js` / `roof.js`
// （未壓縮約 +130 KB，量在 #153 的交付）。用「兩邊各寫一份」換掉這個代價，
// 換來的就是上一輪那個結果：兩個介面的規則安靜地長得不一樣。
import { codexCardHTML } from './ui.js';
import { codexTile } from './spritedom.js';
import { t, L, getLang, setLang, toggleLang } from './i18n.js';

const $ = s => document.querySelector(s);

// 存檔只用來讀 `st.codex`（載過幾次）。讀失敗（無痕視窗、清過站台資料）就當成
// 沒有存檔，不報錯——那條路徑跟「還沒玩過」是同一個畫面。
export function readSave(){
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
export function groups(){
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
  // 它不在 BANDS 裡，所以上面兩圈都撈不到。給它自己一組，標成樓層號碼。
  //
  // ⚠ 這是我的判斷（#149 交付時點名過，沒有被推翻）：一組只有一個人的「13 樓」
  // 等於告訴訪客那層有東西。**新規則下這件事的份量更小了**——沒載過的那一格
  // 現在是問號，樓層標題透露的只有「13 樓有一種人」，名字仍然要載過才有。
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
    out.push({ key:'f' + f, label:t('codexOneFloor', f), range:'', list });
  // 真的認不得的 band（打錯字、新帶還沒進 BANDS）**不能安靜消失**，
  // 否則 78 張裡少了幾張沒有人會發現。撿到一個看得見的籃子裡。
  if (odd.length) out.push({ key:'?', label:'band=' + [...new Set(odd.map(p => p.band))].join(','),
                             range:'', list:odd });
  return out;
}

// ---------------------------------------------------------------- 一格
//
// 卡片本體**整段來自 `codexCardHTML`**（tab 那一支），這裡只多包一層負責
// 「換姿勢」的殼：載過的人多畫一張 urgent 的圖疊上去，CSS 切換 visibility。
// 兩張一起進 DOM 是刻意的——切換不重建節點，就不會有第一次換姿勢的閃爍。
//
// **沒載過的不進這一層。** 它整張卡就是 `codexCardHTML(p, 0)` 的問號，
// 沒有第二張圖可以疊——問號沒有「快沒耐性」的姿勢。
export function entryHTML(p, n){
  if (!n) return codexCardHTML(p, 0);
  // urgent 的身體色用 **`--spriteBad`（= theme.js 的 `pal.bad` #e2645a，逐字）**，
  // 不是 UI 的 `--bad` #ff8a8a。理由是量出來的：配件色對 #e2645a 最小 ΔE 24.17，
  // 對 #ff8a8a 只有 17.47（anniv）——#e2645a 才是 acceptance 第 20 組守著的那個對象。
  const tileHTML = `<div class="cxSwap">`
    + `<span class="n">${codexTile(p.id, { title: L(p,'name','passengers') })}</span>`
    + `<span class="u">${codexTile(p.id, { urgent: true, ink: 'var(--spriteBad)' })}</span>`
    + `</div>`;
  return codexCardHTML(p, n, { tileHTML });
}

// ---------------------------------------------------------------- 整頁
//
// **純函式：state 進、HTML 字串出。** 沒有存檔就傳 null。
// 第 25 組的 guard 直接呼叫它，掃輸出裡有沒有洩漏——所以「頁面看起來對」跟
// 「guard 驗到的」是同一份字串，不是兩個近似物。
export function codexBodyHTML(st){
  const codex = (st && st.codex) || {};
  return groups().map(g => `<section class="cxBand">
      <h2 class="cxBandHead">
        ${g.range ? `<span class="cxRange pxs">${g.range}</span>` : ''}
        <span class="cxBandName">${g.label}</span>
        <span class="cxCount pxs">${t('codexBandN', g.list.length)}</span>
      </h2>
      <div class="cxGrid">${g.list.map(p => entryHTML(p, codex[p.id] || 0)).join('')}</div>
    </section>`).join('');
}

// ---------------------------------------------------------------- 頁面
//
// 下面整段只在 `codex.html` 上跑。`if (mount)` 是必要的，不是防禦性程式：
// 驗收 harness 要 `import` 上面那三支純函式，而它的頁面上沒有 `#bands`——
// 沒有這道閘，光是 import 就會在模組頂層炸掉（#153 的第 25 組就掛在這上面）。
const mount = $('#bands');
if (mount){
  const paint = () => {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('#lang').textContent = getLang() === 'zh' ? 'EN' : '中';
    $('#pose').textContent = document.body.classList.contains('urgentAll')
      ? t('codexPoseCalm') : t('codexPoseUrgent');
    $('#btnPlay').textContent = readSave() ? t('btnContinue') : t('btnStart');

    // 空狀態是這一頁最重要的一句話（#153），所以它不是一行小字：有存檔就顯示
    // 「見過 N / 78」的計數條，沒有存檔就整塊換成 `.cxEmpty`。
    const st = readSave();
    const seen = st && st.codex ? PASSENGERS.filter(p => st.codex[p.id]).length : 0;
    $('#seenLine').hidden = !st;
    $('#emptyBox').hidden = !!st;
    if (st) $('#seenLine').textContent = t('codexSeen', seen, PASSENGERS.length);

    const t0 = performance.now();
    mount.innerHTML = codexBodyHTML(st);
    mark(t0);
  };

  // 「78 張圖一次進 DOM 會不會慢，自己量，不要假設」（#149）。數字印在 console。
  const mark = t0 => {
    const svgs = mount.querySelectorAll('svg').length;
    const paths = mount.querySelectorAll('svg path').length;
    mount.getBoundingClientRect();   // 逼 layout
    console.log(`[codex] ${PASSENGERS.length} 種 → ${svgs} 張圖、${paths} 個 path、`
              + `${(performance.now() - t0).toFixed(1)}ms（含 layout）`);
  };

  // 觸控沒有 hover，而提示文案講了「點一下」——所以點一格就要真的會換姿勢。
  // 用委派，78 格不掛 78 個 listener。沒載過的那些沒有 `.cxSwap`，點了不動。
  mount.addEventListener('click', e => {
    const cell = e.target.closest('.pxCard');
    if (cell && cell.querySelector('.cxSwap')) cell.classList.toggle('on');
  });

  $('#lang').addEventListener('click', () => { toggleLang(); paint(); });
  $('#pose').addEventListener('click', () => {
    document.body.classList.toggle('urgentAll');
    $('#pose').textContent = document.body.classList.contains('urgentAll')
      ? t('codexPoseCalm') : t('codexPoseUrgent');
  });

  setLang(getLang());   // 把 <html lang> 同步成目前的語言
  paint();
}
