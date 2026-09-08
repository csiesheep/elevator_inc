// ui.js — 面板。手機用底部抽屜，桌機用右側欄。
import { UPGRADES, AUTOMATION, SKILLS, PASSENGERS, BANDS, ACHIEVEMENTS,
         CONFIG as C } from './content.js';
import { derived, upgradeCost, upgradeMaxed, buyUpgrade, buyAutomation, skillCost, buySkill,
         prestigeGain, algoName, save } from './state.js';
import { fmtShort, dayName, hourOf } from './sim.js';
import { STYLES as ROOF_STYLES } from './roof.js';
import { codexTile, unknownTile } from './spritedom.js';
import { t, L } from './i18n.js';

const $ = s => document.querySelector(s);
let app, tab = 'up';

export function buildUI(a){
  app = a;
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    if (tab === b.dataset.tab && document.body.classList.contains('open')) {
      document.body.classList.remove('open');
    } else {
      tab = b.dataset.tab; document.body.classList.add('open');
    }
    render(true);
  });
  $('#panelBody').addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const { act, id } = el.dataset;
    const st = app.st;
    if (act === 'up')     { if (buyUpgrade(st, id)) app.onBuy(id); }
    if (act === 'auto')   { if (buyAutomation(st, id)) app.onBuy(id); }
    if (act === 'skill')  { buySkill(st, id); }
    if (act === 'prestige') app.onPrestige();
    if (act === 'orbit')  app.onOrbit();
    if (act === 'roof')   { st.roofStyle = id; save(st); }
    if (act === 'wipe')   app.onWipe();
    render(true);
  });
  $('#grabber').addEventListener('click', () => {
    document.body.classList.toggle('open'); render(true);
  });
  render(true);
}

export function refreshUI(){ render(false); }

// ------------------------------------------------------------ 頂欄
function header(){
  const st = app.st, sim = app.sim, d = derived(st);
  $('#cash').textContent = '$' + fmtShort(st.cash);
  $('#rate').textContent = '$' + fmtShort(st.stats.avgRate || 0) + t('perSec');
  $('#bp').textContent = '📐 ' + st.bp;
  const stars = Math.round(st.rating * 2) / 2;
  $('#rating').innerHTML = `★ ${st.rating.toFixed(2)} ` +
    `<span class="dim">×${d.fareMult.toFixed(2)} ${t('fareMult')} · ×${d.womMult.toFixed(2)} ${t('footfall')}</span>`;
  $('#rating').className = stars >= 4 ? 'good' : stars >= 2.5 ? '' : 'bad';
  const mood = sim.mood >= 1.25 ? t('busy') : sim.mood <= 0.75 ? t('quiet') : t('normal');
  $('#hud').textContent =
    `${st.floors} ${t('floorsUnit')} · ${sim.shafts.length} ${t('shaftsUnit')} · ${algoName(st)} · ` +
    `${t('waiting')} ${sim.waiting.length}` +
    ` · ${dayName(st)} ${mood}`;
}

// ------------------------------------------------------------ 分頁
function render(full){
  header();
  document.querySelectorAll('#tabs [data-tab]').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === tab));
  const body = $('#panelBody');
  const html = ({ up: tabUpgrades, auto: tabAuto, skill: tabSkills,
                  codex: tabCodex, stats: tabStats, pres: tabPrestige })[tab]();
  if (body.dataset.k !== tab) { body.dataset.k = tab; body.scrollTop = 0; }
  body.innerHTML = html;
}

function card(o){
  const dis = o.dis ? ' dis' : '';
  return `<div class="card${dis}" ${o.act ? `data-act="${o.act}" data-id="${o.id}"` : ''}>
    <div class="cardTop"><span class="cName">${o.icon || ''} ${o.name}</span>
      <span class="cCost">${o.cost || ''}</span></div>
    ${o.detail ? `<div class="cDetail">${o.detail}</div>` : ''}
    ${o.hint ? `<div class="cHint">${o.hint}</div>` : ''}
  </div>`;
}

function tabUpgrades(){
  const st = app.st, d = derived(st);
  let h = `<div class="statRow">
    <span>${t('statSpeed')} ${d.cruise.toFixed(2)} ${t('floorsPerSec')}</span>
    <span>${t('statAccel')} ${d.accel.toFixed(2)}</span>
    <span>${t('statCap')} ${d.capacity}</span><span>${t('statDoor')} ${d.door.toFixed(2)}s</span>
    <span>${t('statShaft')} ${d.shafts}</span></div>`;
  h += `<div class="sect">${t('secElevator')}</div>`;
  for (const u of UPGRADES){
    const maxed = upgradeMaxed(st, u.id), c = upgradeCost(st, u.id);
    h += card({ act:'up', id:u.id, icon:u.icon, name:`${L(u,'name','upgrades')} <b>${st.up[u.id]}</b>`,
      cost: maxed ? t('maxed') : '$' + fmtShort(c),
      detail: L(u,'detail','upgrades'), hint: L(u,'hint','upgrades'), dis: maxed || st.cash < c });
  }
  if (st.floors >= C.ENDING_FLOOR && !st.ending){
    h += `<div class="sect">${t('secEnding')}</div>` + card({ act:'orbit', id:'orbit', icon:'🚀',
      name:t('orbitName'), cost:'$' + fmtShort(C.ORBIT_CASH) + ' + 📐' + C.ORBIT_BP,
      detail:t('orbitDetail'), hint:t('orbitHint'),
      dis: st.cash < C.ORBIT_CASH || st.bp < C.ORBIT_BP });
  }
  h += `<div class="sect">${t('secRoof')}</div>`
     + `<div class="note">${t('roofHint')}</div><div class="roofRow">`
     + ROOF_STYLES.map(s => `<button class="roofChip${st.roofStyle === s.id ? ' on' : ''}"
         data-act="roof" data-id="${s.id}">${L(s, 'name', 'roofs')}</button>`).join('')
     + `</div>`;

  return h;
}

function tabAuto(){
  const st = app.st;
  let h = `<div class="note">${t('autoIntro')}</div>`;
  for (const a of AUTOMATION){
    const owned = st.auto[a.id];
    const cost = a.cur === 'cash' ? '$' + fmtShort(a.cost) : '📐 ' + a.cost;
    const afford = a.cur === 'cash' ? st.cash >= a.cost : st.bp >= a.cost;
    h += `<div class="card ${owned ? 'owned' : (afford ? '' : 'dis')}"
      ${owned ? '' : `data-act="auto" data-id="${a.id}"`}>
      <div class="cardTop"><span class="cName">${owned ? '✓' : ''} ${L(a,'name','automation')}</span>
        <span class="cCost">${owned ? t('installed') : cost}</span></div>
      <div class="cDetail">${L(a,'plain','automation')}</div>
      <div class="cHint mono">${L(a,'tech','automation')}</div></div>`;
  }
  return h;
}

function tabSkills(){
  const st = app.st;
  let h = `<div class="note">${t('bpIntro', st.bp)}</div>`;
  const branches = [['機械','branchMech'], ['營運','branchOps'], ['建築','branchArch']];
  for (const [br, bkey] of branches){
    h += `<div class="sect">${t(bkey)}</div>`;
    for (const s of SKILLS.filter(x => x.branch === br)){
      const lv = st.skills[s.id] || 0, maxed = lv >= s.max, c = skillCost(st, s.id);
      h += card({ act:'skill', id:s.id, name:`${L(s,'name','skills')} <b>${lv}/${s.max}</b>`,
        cost: maxed ? t('skillFull') : '📐 ' + c, detail: L(s,'detail','skills'), dis: maxed || st.bp < c });
    }
  }
  return h;
}

// ---------------------------------------------------------------- 圖鑑的一張卡
//
// **兩個介面的唯一產出點**（#153）。遊戲頁的 tab 與 `codex.html` 都呼叫這一支，
// 所以「載過給什麼、沒載過給什麼」只有一份實作，不可能兩邊漂開。
// 上一輪（#149）兩邊各寫一份，結果就是兩邊的規則長得不一樣。
//
// owner 裁決（#153，取代 #149 的丙）：
//   | | 已遇過 | 沒遇過 |
//   | 人物圖 | 正常顯示 | **問號** |
//   | 名字 / note / 單價·耐性·佔位 / 載過幾次 | 顯示 | 藏 |
//
// 匯出是為了讓 guard 拿得到（驗收第 25 組）。**這不是為了測試而改形狀**：
// 一條規則套在兩個介面上，本來就該有一個叫得到的產出點。
//
// `opts.tileHTML` 覆寫「圖」那一格：圖鑑頁要在同一格裡疊第二個姿勢（hover 換）。
// **只覆寫圖，不覆寫字**——字那一半是這條裁決的本體，不開任何入口。
export function codexCardHTML(p, n, opts = {}){
  if (!n){
    // 沒載過：**圖也不給**，換成 7×9 的問號（`unknownTile`，走同一支 spriteSVG）。
    // `.pxHidden` 留著讓右半再淡一階——問號本身已經比人物暗一階，兩層加起來
    // 才是「這一格是空的」。**這裡一個字都不可以是真的名字、note 或數值**，
    // `unknownName`／`notCarried`／`notCarriedNote` 三個鍵是常數，不吃 `p`。
    return `<div class="card pxCard pxHidden">
      ${unknownTile({ title: t('codexUnknownAlt') })}
      <div class="pxBody">
      <div class="cardTop"><span class="cName">${t('unknownName')}</span>
        <span class="cCost">${t('notCarried')}</span></div>
      <div class="cDetail">${t('notCarriedNote')}</div>
      </div>
    </div>`;
  }
  return `<div class="card pxCard">
    ${opts.tileHTML || codexTile(p.id, { title: L(p,'name','passengers') })}
    <div class="pxBody">
    <div class="cardTop"><span class="cName">${L(p,'name','passengers')}</span>
      <span class="cCost">×${fmtShort(n)}</span></div>
    <div class="cDetail">${L(p,'note','passengers')}</div>
    <div class="cHint mono">${t('codexMeta', p.fare, p.patience > 500 ? '∞' : p.patience + 's', p.size)}</div>
    </div>
  </div>`;
}

// 純函式版：state 進、HTML 字串出。`tabCodex()` 只是「拿 app.st 餵它」。
// 第 25 組的 guard 餵一個空 codex 的 state 進來,掃輸出裡有沒有洩漏。
export function tabCodexHTML(st){
  const seen = PASSENGERS.filter(p => st.codex[p.id]).length;
  let h = `<div class="note">${t('codexIntro', seen, PASSENGERS.length)}</div>`;
  for (const p of PASSENGERS) h += codexCardHTML(p, st.codex[p.id] || 0);
  h += `<div class="sect">${t('secFloorTypes')}</div>`;
  for (const b of BANDS){
    const open = st.floors >= b.from;
    h += `<div class="card ${open ? '' : 'unknown'}">
      <div class="cardTop"><span class="cName">${b.from}–${b.to > 900 ? '∞' : b.to} ${L(b,'name','bands')}</span>
      <span class="cCost">${open ? t('built') : t('locked')}</span></div>
      <div class="cDetail">${L(b,'unlock','bands')}</div></div>`;
  }
  h += `<div class="sect">${t('secAchieve')}</div>`;
  for (const a of ACHIEVEMENTS){
    const got = st.achieved[a.id];
    h += `<div class="card ${got ? 'owned' : 'unknown'}">
      <div class="cardTop"><span class="cName">${got ? '🏆' : '🔒'} ${L(a,'name','achievements')}</span></div>
      <div class="cHint">${L(a,'note','achievements')}</div></div>`;
  }
  return h;
}

function tabCodex(){ return tabCodexHTML(app.st); }

function tabStats(){
  const st = app.st, sim = app.sim, d = derived(st);
  let h = `<div class="note">${t('statsIntro')}</div>`;
  h += `<table class="tb"><tr><th>${t('thShaft')}</th><th>${t('thStops')}</th><th>${t('thCarried')}</th>` +
       `<th>${t('thFpm')}</th><th>${t('thBusy')}</th><th>${t('thEff')}</th></tr>`;
  for (const s of sim.shafts){
    const fpm = s.st.total > 0 ? s.st.floors / (s.st.total / 60) : 0;
    const busy = s.st.total > 0 ? s.st.busy / s.st.total : 0;
    const eff = fpm * Math.max(0.05, s.st.load);
    h += `<tr><td>${s.id + 1}${s.express ? ' ' + t('expressTag') : ''}</td><td>${s.st.trips}</td><td>${Math.round(s.st.carried)}</td>
      <td>${fpm.toFixed(1)}</td><td>${Math.round(busy * 100)}%</td><td>${eff.toFixed(1)}</td></tr>`;
  }
  h += `</table>`;
  const rows = [
    [t('rowAlgo'), algoName(st)],
    [t('rowServed'), `${Math.round(st.stats.served)} / ${Math.round(st.stats.abandoned)}`],
    [t('rowLostPct'), st.stats.served + st.stats.abandoned > 0
       ? Math.round(st.stats.abandoned / (st.stats.served + st.stats.abandoned) * 100) + '%' : '—'],
    [t('rowWom'), '×' + d.womMult.toFixed(2)],
    [t('rowRunRev'), '$' + fmtShort(st.runRevenue)],
    [t('rowLifetime'), '$' + fmtShort(st.lifetimeRevenue)],
    [t('rowBestRun'), '$' + fmtShort(st.stats.bestRun)],
    [t('rowBoost'), Math.round(st.stats.boostTime) + t('overheatTimes', st.stats.overheats)],
    [t('rowPrestiges'), st.prestiges],
  ];
  h += `<table class="tb">` + rows.map(r => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td></tr>`).join('') + `</table>`;
  return h;
}

function tabPrestige(){
  const st = app.st;
  const gain = prestigeGain(st);
  const col = (key, listKey, kind) =>
    `<div class="ledCol"><div class="ledHead"><i class="${kind}"></i>${t(key)}</div>`
    + t(listKey).split('|').map(x => `<div class="ledItem">${x}</div>`).join('')
    + `</div>`;

  let h = `<div class="note">${t('presIntro')}</div>`;
  h += `<div class="bigNum">📐 ${gain}</div>
    <div class="note center">${t('presGain')}<br>
      <span class="dim">${t('presFormula', C.PRESTIGE_DIV.toLocaleString('en-US'))}</span></div>`;
  // 保留／歸零是「說明」，不是「可以按的東西」。用 .card 會長得跟購買鍵
  // 一模一樣（同樣的邊框、陰影、hover），玩家會一直想去點它。
  h += `<div class="ledger">${col('presKeep', 'presKeepList', 'keep')}${col('presLose', 'presLoseList', 'lose')}</div>`;
  // 拆樓沒有門檻，隨時都能拆。藍圖是 0 的時候只提醒，不擋。
  h += `<div class="card danger" data-act="prestige" data-id="p">
    <div class="cardTop"><span class="cName">${t('presDo')}</span></div>
    <div class="cHint">${gain > 0 ? t('presReady') : t('presZero')}</div></div>`;
  // 清空存檔跟拆樓放在一起：兩個都是「重來」，只差重來多少。
  // 放在升級頁很怪——那一頁其他每一張卡都是花錢買東西。
  h += `<div class="sect">${t('secDanger')}</div>
    <div class="card dangerCard" data-act="wipe" data-id="wipe">
      <div class="cardTop"><span class="cName">${t('wipeName')}</span></div>
      <div class="cHint">${t('wipeHint')}</div></div>`;
  return h;
}

// ------------------------------------------------------------ 提示 / 覆蓋層
// 同一個 frame 可能一次丟出幾十則:**舊存檔第一次載入新版本**時，這一輪新增的成就
// 門檻早就滿足了，checkAchievements() 會在同一幀把它們全部判成剛達成。實測一個
// 45 層的舊存檔一次丟出 **28 則**，而 `#toasts` 有 max-width 卻**沒有 max-height**
// （#34 只修了寬度），所以它們會疊出視窗，手機上還會蓋掉整個遊戲畫面。
//
// 夾住「同時看得到幾則」，多出來的收斂成一行計數。
// **刻意不採用的做法:把 toast 縮小或字改小。** 那只是把「裝不下」換成
// 「裝得下但看不清楚」——這個專案為那個換法付過一次學費。
// N = 3 是**從裁決推出來的下界，取最小值**，不是填一個好看的數字：
//   · 裁決要求「一般遊玩同時解鎖 2–3 條時，每一條都要完整顯示」→ N >= 3
//   · 最小支援視窗 375×667 上，每多一個框就吃掉**約 5% 的塔**（實測 45 層：
//     3 框 11%、4 框 15%、5 框 20%、9 框以上飽和在 37%）
//   · 所以在滿足裁決的前提下取最小的 N：3 具名 + 1 計數 = 4 框 = 塔被蓋 15%
//   · 溢出（被切出視窗）在 375×667 要 14 則才發生，用 4 框差 3.5 倍，
//     **綁住上限的是遮蔽不是溢出**——這正是裁決指定的判準
const MAX_TOASTS = 3;
let overflowN = 0, overflowEl = null;

export function toast(txt, ms = 2600){
  const box = $('#toasts');
  const live = box.querySelectorAll('.toast:not(.more)').length;

  if (live >= MAX_TOASTS){
    overflowN++;
    if (!overflowEl || !overflowEl.isConnected){
      overflowEl = document.createElement('div');
      overflowEl.className = 'toast more';
      overflowN = 1;
    }
    box.appendChild(overflowEl);            // 計數列固定留在最下面
    overflowEl.textContent = t('toastMore', overflowN);
    clearTimeout(overflowEl._timer);
    const dying = overflowEl;
    dying._timer = setTimeout(() => {
      dying.classList.add('out');
      setTimeout(() => { dying.remove(); if (overflowEl === dying){ overflowEl = null; overflowN = 0; } }, 400);
    }, ms);
    return;
  }

  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = txt;
  // 新的一則插在計數列上面，計數列永遠是最後一個
  box.insertBefore(el, (overflowEl && overflowEl.isConnected) ? overflowEl : null);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
}

export function overlay(title, body, btn, cb){
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `<div class="sheet"><h2>${title}</h2><div>${body}</div>
    <button class="big">${btn}</button></div>`;
  el.querySelector('button').onclick = () => { el.remove(); cb && cb(); };
  document.body.appendChild(el);
}
