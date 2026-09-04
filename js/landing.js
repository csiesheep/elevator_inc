// landing.js — 首頁：開始 / 說明 / 帳本 / 更多遊戲，以及語言切換。
// 帳本直接讀存檔，不啟動整個遊戲迴圈。
import { t, L, getLang, toggleLang } from './i18n.js';
import { PASSENGERS, ACHIEVEMENTS, BANDS, CONFIG as C } from './content.js';
import { fmtShort } from './sim.js';

const $ = s => document.querySelector(s);
const SAVE_KEY = 'elevator_inc_v1';

function readSave(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw);
    return (st && st.v === 1) ? st : null;
  } catch(e){ return null; }
}

// ---------------------------------------------------------------- 說明
function rulesHTML(){
  const en = getLang() === 'en';
  if (en) return `
    <h3>The loop</h3>
    <p>People appear on a floor with somewhere to be and a patience bar. Tap a floor to send the
    car there. Fares are <b>$1 × the number of floors travelled</b>, times the passenger, times the
    tenants, times your rating — so a tall building is worth more per trip than a short one.</p>

    <h3>The five stats fight each other</h3>
    <p>Cruise speed helps long trips and barely touches short ones. Acceleration is the reverse.
    A bigger car carries more but loads slower. Faster doors only pay off once you make a lot of
    stops. Extra shafts are the most expensive thing you can buy and do almost nothing until you
    own a dispatch algorithm. None of them is simply better than the others.</p>

    <h3>Stop tapping</h3>
    <p>You are not buying an auto-clicker, you are buying <b>a better scheduling algorithm</b>:
    FIFO, then SCAN, then LOOK, then destination dispatch, group control, an express shuttle,
    double-deck cars and finally a sky lobby. They are real elevator algorithms and they really do
    perform differently — the Stats tab shows you which shaft is slacking.</p>

    <h3>Tenants, not just floors</h3>
    <p>Building a floor does not put anyone in it. Lease it, and choose who to: a quiet open-plan
    office, a conference centre that empties all at once, a data centre where almost nobody rides
    but the few trips pay enormously. Your leasing decides the <i>shape</i> of your traffic.</p>

    <h3>Rating cuts both ways</h3>
    <p>Delivering people quickly raises the rating, which raises fares <i>and brings more people
    in</i>. Let them give up and walk and it falls; below 1.6 stars nobody new will move in.</p>

    <h3>Controls</h3>
    <div class="keys"><kbd>tap a floor</kbd><kbd>1–9, 0</kbd><kbd>space / 🔥 = overdrive</kbd></div>
    <p>Overdrive runs the cars at 1.8× but builds heat; overheat and that shaft shuts down for
    8 seconds. Progress saves itself, and the building keeps earning while you are away.</p>

    <h3>The ending</h3>
    <p>Demolish the tower to convert a run into blueprints, which never disappear. Two hundred
    floors up, there is a way out of the atmosphere.</p>`;

  return `
    <h3>核心循環</h3>
    <p>乘客在某一層出現，頭上是目的地，旁邊是耐性條。點樓層把電梯叫過去。
    票價是 <b>$1 × 跑了幾層樓</b>，再乘上乘客、租戶與大樓評價——所以樓越高，同一趟越值錢。</p>

    <h3>五個屬性互相牽制</h3>
    <p>巡航速度只幫得上長程，對短程幾乎沒感覺；加速度剛好相反。載客量大一趟載更多，
    但上下客更久。開關門快只有在站數多的時候才划算。電梯井最貴，而且沒有調度演算法的話
    幾乎沒用。<b>沒有一個是「全面更好」的</b>。</p>

    <h3>不要再一直點了</h3>
    <p>你買的不是自動點擊器，是<b>更好的調度演算法</b>：FIFO → SCAN → LOOK →
    目的地控制 → 群組控制 → 快速電梯 → 雙層轎廂 → 空中大廳。
    這些都是真實存在的電梯演算法，而且效率真的有差——統計頁看得出哪一座井在偷懶。</p>

    <h3>蓋好不等於有人</h3>
    <p>樓蓋起來還要招商，而且要選租給誰：安靜的一般辦公、每場散場都爆量的會議中心、
    幾乎沒人搭電梯但單價極高的資料中心。你的招商決定人流的<i>形狀</i>，不只是多少。</p>

    <h3>評價是雙面刃</h3>
    <p>把人快點送到會提升評價，評價高則票價高、<i>而且更多人上門</i>。
    讓人等到走掉評價就掉，低於 1.6 星就再也招不到新租戶。</p>

    <h3>操作</h3>
    <div class="keys"><kbd>點樓層</kbd><kbd>1–9、0</kbd><kbd>空白鍵 / 🔥 超速</kbd></div>
    <p>超速讓電梯跑 1.8 倍，但會累積熱量；過熱該座井強制停機 8 秒。
    進度會自動存檔，你不在的時候大樓也還在賺。</p>

    <h3>結局</h3>
    <p>拆掉大樓可以把這一輪換成藍圖，藍圖永遠不會消失。蓋到兩百層，會有一條離開大氣層的路。</p>`;
}

// ---------------------------------------------------------------- 帳本
function ledgerHTML(){
  const st = readSave();
  if (!st) return `<p>${t('ledgerEmpty')}</p>`;
  const s = st.stats || {};
  const codexSeen = PASSENGERS.filter(p => st.codex && st.codex[p.id]).length;
  const achSeen = ACHIEVEMENTS.filter(a => st.achieved && st.achieved[a.id]).length;
  const band = BANDS.filter(b => st.floors >= b.from).slice(-1)[0];

  const rows = (title, list) =>
    `<h3>${title}</h3><table class="ledger">` +
    list.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') + `</table>`;

  let h = rows(t('ledgerRun'), [
    [t('rowRunRev'),   '$' + fmtShort(st.runRevenue || 0)],
    [t('floorsUnit'),  st.floors],
    [t('secFloorTypes'), band ? L(band, 'name', 'bands') : '—'],
    ['★',              (st.rating || 0).toFixed(2)],
    ['📐',             st.bp || 0],
  ]);
  h += rows(t('ledgerAll'), [
    [t('rowLifetime'),  '$' + fmtShort(st.lifetimeRevenue || 0)],
    [t('rowBestRun'),   '$' + fmtShort(s.bestRun || 0)],
    [t('rowServed'),    `${Math.round(s.served || 0)} / ${Math.round(s.abandoned || 0)}`],
    [t('thStops'),      Math.round(s.trips || 0)],
    [t('rowPrestiges'), st.prestiges || 0],
    [t('rowBoost'),     Math.round(s.boostTime || 0) + t('overheatTimes', s.overheats || 0)],
  ]);
  h += rows(t('ledgerCodex'), [
    [t('tabCodex'),     `${codexSeen}/${PASSENGERS.length}`],
    [t('secAchieve'),   `${achSeen}/${ACHIEVEMENTS.length}`],
  ]);
  return h;
}

// ---------------------------------------------------------------- 浮層
function openSheet(title, html){
  const wrap = document.createElement('div');
  wrap.className = 'sheetWrap';
  wrap.innerHTML = `<div class="sheetBox"><h2>${title}</h2>${html}
    <button class="close">${t('close')}</button></div>`;
  const shut = () => wrap.remove();
  wrap.querySelector('.close').onclick = shut;
  wrap.onclick = e => { if (e.target === wrap) shut(); };
  addEventListener('keydown', function esc(e){
    if (e.key === 'Escape'){ shut(); removeEventListener('keydown', esc); }
  });
  $('#sheetHost').appendChild(wrap);
}

// ---------------------------------------------------------------- 畫面
function paint(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  const st = readSave();
  $('#btnStart').textContent = st ? t('btnContinue') : t('btnStart');
  $('#saveLine').textContent = st
    ? t('landSaveLine', st.floors, fmtShort(Math.round((st.stats && st.stats.served) || 0)),
        (st.rating || 0).toFixed(1))
    : t('landNoSave');
  $('#lang').textContent = getLang() === 'zh' ? 'EN' : '中';
}

$('#btnStart').addEventListener('click', () => { location.href = 'game.html'; });
$('#btnRules').addEventListener('click', () => openSheet(t('rulesTitle'), rulesHTML()));
$('#btnLedger').addEventListener('click', () => openSheet(t('ledgerTitle'), ledgerHTML()));
$('#lang').addEventListener('click', () => {
  toggleLang(); paint();
  document.querySelectorAll('.sheetWrap').forEach(w => w.remove());
});

paint();
