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
    <p>You start with <b>five floors and $200</b> — one dollar short of buying both the auto-door
    ($60) and the next five floors ($150), so the first decision is which one.</p>
    <p>People appear on a floor with somewhere to be and a patience bar. Tap a floor to send the
    car there. Fares are <b>$1 × the number of floors travelled</b>, times the passenger, times the
    kind of floor they are travelling between, times your rating — so a tall building is worth more
    per trip than a short one. A day lasts three minutes; 8–10am and 5–7pm are rush hours.</p>

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

    <h3>Height decides who rides</h3>
    <p>A floor fills itself the moment it is built — there is nobody to sign up and nothing to pick.
    What you are choosing is <b>how high</b>, because the height decides what the floor becomes:
    shops at street level, offices that surge at 9am and again at 6pm, hotel rooms that arrive at
    night, apartments, an observation deck, laboratories. Each band moves a different crowd at a
    different hour, so building upward changes the <i>shape</i> of your traffic and not just the
    amount. The Codex tab lists every band and what it does to your timetable.</p>

    <h3>Rating is a multiplier</h3>
    <p>Delivering people quickly raises the rating; letting them give up and walk lowers it. It then
    does exactly two things, and both are dials rather than gates: it multiplies fares (<b>×1.20</b>
    at the 0.8-star floor, <b>×2.25</b> at five stars) and it multiplies how many people turn up
    (<b>×0.91</b> to <b>×1.50</b>). Both numbers sit beside the stars in the top bar, so you can
    watch them move. A bad rating means you earn less — that is the whole of it. It also recovers on
    its own, slowly, and only up to 2 stars. The rest you have to earn.</p>

    <h3>Controls</h3>
    <div class="keys"><kbd>tap a floor</kbd><kbd>1–9, 0</kbd><kbd>space / 🔥 = overdrive</kbd></div>
    <p>Overdrive runs the cars at 1.8× but builds heat; overheat and that shaft shuts down for
    8 seconds. Progress saves itself, and the building keeps earning while you are away — at half
    rate, and for at most four hours.</p>

    <h3>The ending</h3>
    <p>Demolish the tower to convert a run into blueprints, which never disappear. You can do it
    whenever you like — there is no minimum.</p>
    <p>The hundredth floor unlocks the way out of the atmosphere. It is not free: <b>$20M and
    20 blueprints</b>, and the cash has to be sitting there in a <i>single</i> run, because
    demolishing resets it. That is not somewhere you get to on your first tower.</p>`;

  return `
    <h3>核心循環</h3>
    <p>開場是<b>五層樓和 $200</b>——剛好買不起「自動關門 $60」和「加蓋五層 $150」兩樣，
    第一個決定就是二選一。</p>
    <p>乘客在某一層出現，頭上是目的地，旁邊是耐性條。點樓層把電梯叫過去。
    票價是 <b>$1 × 跑了幾層樓</b>，再乘上乘客、起訖那兩層的樓種與大樓評價——所以樓越高，同一趟越值錢。
    遊戲裡的一天是三分鐘，早上 8–10 點與傍晚 5–7 點是尖峰。</p>

    <h3>五個屬性互相牽制</h3>
    <p>巡航速度只幫得上長程，對短程幾乎沒感覺；加速度剛好相反。載客量大一趟載更多，
    但上下客更久。開關門快只有在站數多的時候才划算。電梯井最貴，而且沒有調度演算法的話
    幾乎沒用。<b>沒有一個是「全面更好」的</b>。</p>

    <h3>不要再一直點了</h3>
    <p>你買的不是自動點擊器，是<b>更好的調度演算法</b>：FIFO → SCAN → LOOK →
    目的地控制 → 群組控制 → 快速電梯 → 雙層轎廂 → 空中大廳。
    這些都是真實存在的電梯演算法，而且效率真的有差——統計頁看得出哪一座井在偷懶。</p>

    <h3>蓋到哪，就決定誰來搭</h3>
    <p>樓一蓋好就有人搬進來，沒有東西要招、也沒得挑。你選的是<b>蓋多高</b>——
    高度決定那一層會變成什麼：街面的店鋪、早九晚六各爆一次的辦公室、夜裡才進房的旅館、
    住宅、觀景台、實驗室。每一種樓層帶在不同的時間帶動不同的人潮，
    所以往上蓋改變的是人流的<i>形狀</i>，不只是多少。圖鑑頁列出每一帶各做什麼。</p>

    <h3>評價是一個乘數</h3>
    <p>把人快點送到評價就上去，讓人等到走掉評價就下來。接著它只做兩件事，而且都是旋鈕、不是關卡：
    乘票價（0.8 星的地板 <b>×1.20</b>，五星 <b>×2.25</b>），以及乘上門的人數（<b>×0.91</b> 到 <b>×1.50</b>）。
    這兩個數字就寫在頂欄的星等旁邊，你看得到它們在動。評價低就是賺得少——就這樣而已。
    爛評價會自己慢慢往回爬，但只爬到 2 星——再上去要自己掙。</p>

    <h3>操作</h3>
    <div class="keys"><kbd>點樓層</kbd><kbd>1–9、0</kbd><kbd>空白鍵 / 🔥 超速</kbd></div>
    <p>超速讓電梯跑 1.8 倍，但會累積熱量；過熱該座井強制停機 8 秒。
    進度會自動存檔；你不在的時候大樓還在賺，但只算半速，而且最多算四小時。</p>

    <h3>結局</h3>
    <p>拆掉大樓可以把這一輪換成藍圖，藍圖永遠不會消失。什麼時候拆都可以，沒有門檻。</p>
    <p>蓋到<b>第 100 層</b>會解鎖離開大氣層的路。它不是免費的：<b>$2000 萬加 20 張藍圖</b>，
    而且現金必須在<i>同一輪</i>裡存到——拆樓會把現金歸零。那不是第一棟樓就到得了的地方。</p>`;
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
