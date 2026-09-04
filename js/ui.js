// ui.js — 面板。手機用底部抽屜，桌機用右側欄。
import { UPGRADES, AUTOMATION, SKILLS, PASSENGERS, BANDS, ACHIEVEMENTS, CONFIG as C } from './content.js';
import { derived, upgradeCost, upgradeMaxed, buyUpgrade, buyAutomation, skillCost, buySkill,
         prestigeGain, canPrestige, algoName,
         builtInBand, leasedInBand, occOf, leaseCost, canLease, buyLease, leaseBlocked } from './state.js';
import { fmtShort, dayName, hourOf } from './sim.js';

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
    if (act === 'lease')  { buyLease(st, id); }
    if (act === 'prestige') app.onPrestige();
    if (act === 'orbit')  app.onOrbit();
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
  $('#rate').textContent = '$' + fmtShort(st.stats.avgRate || 0) + '/秒';
  $('#bp').textContent = '📐 ' + st.bp;
  const stars = Math.round(st.rating * 2) / 2;
  $('#rating').innerHTML = `★ ${st.rating.toFixed(2)} ` +
    `<span class="dim">×${d.fareMult.toFixed(2)} 票價 · ×${d.womMult.toFixed(2)} 人流</span>`;
  $('#rating').className = stars >= 4 ? 'good' : stars >= 2.5 ? '' : 'bad';
  const mood = sim.mood >= 1.25 ? '人潮洶湧' : sim.mood <= 0.75 ? '冷清' : '平常';
  const heavy = sim.waiting.filter(p => (p.w || 1) > 1).length;
  $('#hud').textContent =
    `${st.floors} 樓 · ${sim.shafts.length} 井 · ${algoName(st)} · 等待 ${sim.waiting.length}` +
    (heavy ? `（高樓 ${heavy}）` : '') + ` · ${dayName(st)} ${mood}`;
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
    <span>速度 ${d.cruise.toFixed(2)} 樓/秒</span><span>加速 ${d.accel.toFixed(2)}</span>
    <span>載客 ${d.capacity}</span><span>開門 ${d.door.toFixed(2)}s</span>
    <span>井 ${d.shafts}</span></div>`;
  // ---- 10 招商：蓋好的樓層要先招到租戶才有人搭電梯
  const bands = BANDS.filter(b => builtInBand(st, b) > 0);
  const vacant = bands.reduce((a, b) => a + (builtInBand(st, b) - leasedInBand(st, b)), 0);
  const blocked = leaseBlocked(st);
  h += `<div class="sect">招商${vacant ? `　<span class="bad">${vacant} 層空著</span>` : ''}</div>`;
  if (blocked) h += `<div class="note bad">評價 ${st.rating.toFixed(1)} 太低，現在沒有租戶願意進來。
    先把服務做好（少讓人等到走掉），評價回到 ${C.LEASE_BLOCK} 以上才招得到人。</div>`;
  else if (!vacant) h += `<div class="note">每一層都有租戶了。再蓋新的樓層就要重新招商。</div>`;
  for (const b of bands){
    const built = builtInBand(st, b), leased = leasedInBand(st, b);
    const full = leased >= built, c = leaseCost(st, b);
    const pct = Math.round(occOf(st, b) * 100);
    h += `<div class="card ${full ? 'owned' : (st.cash < c || blocked ? 'dis' : '')}"
      ${full || st.cash < c || blocked ? '' : `data-act="lease" data-id="${b.key}"`}>
      <div class="cardTop"><span class="cName">${b.name} <b>${leased}/${built}</b></span>
        <span class="cCost">${full ? '滿租' : '$' + fmtShort(c)}</span></div>
      <div class="occBar"><i style="width:${pct}%"></i></div>
      <div class="cHint">入住率 ${pct}%${full ? '' : ' —— 空的樓層不會有任何乘客'}</div></div>`;
  }

  h += `<div class="sect">電梯</div>`;
  for (const u of UPGRADES){
    const maxed = upgradeMaxed(st, u.id), c = upgradeCost(st, u.id);
    h += card({ act:'up', id:u.id, icon:u.icon, name:`${u.name} <b>${st.up[u.id]}</b>`,
      cost: maxed ? '已滿級' : '$' + fmtShort(c),
      detail: u.detail, hint: u.hint, dis: maxed || st.cash < c });
  }
  if (st.floors >= C.ENDING_FLOOR && !st.ending){
    h += `<div class="sect">終局</div>` + card({ act:'orbit', id:'orbit', icon:'🚀',
      name:'軌道發射', cost:'$' + fmtShort(5e8) + ' + 📐20',
      detail:'把井道延伸出大氣層。',
      hint:'這是結局。按下去就結束了。',
      dis: st.cash < 5e8 || st.bp < 20 });
  }
  h += `<div class="sect">危險區</div>
    <div class="card dangerCard" data-act="wipe" data-id="wipe">
      <div class="cardTop"><span class="cName">🗑 清空存檔</span></div>
      <div class="cHint">連藍圖跟圖鑑一起，全部歸零。</div></div>`;
  return h;
}

function tabAuto(){
  const st = app.st;
  let h = `<div class="note">電梯調度是真的電腦科學問題。每一階都真的改變電梯怎麼跑，統計頁看得出差別。</div>`;
  for (const a of AUTOMATION){
    const owned = st.auto[a.id];
    const cost = a.cur === 'cash' ? '$' + fmtShort(a.cost) : '📐 ' + a.cost;
    const afford = a.cur === 'cash' ? st.cash >= a.cost : st.bp >= a.cost;
    h += `<div class="card ${owned ? 'owned' : (afford ? '' : 'dis')}"
      ${owned ? '' : `data-act="auto" data-id="${a.id}"`}>
      <div class="cardTop"><span class="cName">${owned ? '✓' : ''} ${a.name}</span>
        <span class="cCost">${owned ? '已裝設' : cost}</span></div>
      <div class="cDetail">${a.plain}</div>
      <div class="cHint mono">${a.tech}</div></div>`;
  }
  return h;
}

function tabSkills(){
  const st = app.st;
  let h = `<div class="note">藍圖 📐 ${st.bp} —— 拆樓重蓋也不會消失。</div>`;
  for (const br of ['機械', '營運', '建築']){
    h += `<div class="sect">${br}</div>`;
    for (const s of SKILLS.filter(x => x.branch === br)){
      const lv = st.skills[s.id] || 0, maxed = lv >= s.max, c = skillCost(st, s.id);
      h += card({ act:'skill', id:s.id, name:`${s.name} <b>${lv}/${s.max}</b>`,
        cost: maxed ? '滿' : '📐 ' + c, detail: s.detail, dis: maxed || st.bp < c });
    }
  }
  return h;
}

function tabCodex(){
  const st = app.st;
  const seen = PASSENGERS.filter(p => st.codex[p.id]).length;
  let h = `<div class="note">乘客圖鑑 ${seen}/${PASSENGERS.length} —— 獨立於數字線之外的第二條獎勵管道。</div>`;
  for (const p of PASSENGERS){
    const n = st.codex[p.id] || 0;
    h += `<div class="card ${n ? '' : 'unknown'}">
      <div class="cardTop"><span class="cName">${n ? p.name : '？？？'}</span>
        <span class="cCost">${n ? '×' + fmtShort(n) : '未載到'}</span></div>
      <div class="cDetail">${n ? p.note : '還沒載到這種乘客。'}</div>
      ${n ? `<div class="cHint mono">票價 ×${p.fare} · 耐性 ${p.patience > 500 ? '∞' : p.patience + 's'} · 佔 ${p.t_size || p.size} 格</div>` : ''}
    </div>`;
  }
  h += `<div class="sect">樓層類型</div>`;
  for (const b of BANDS){
    const open = st.floors >= b.from;
    h += `<div class="card ${open ? '' : 'unknown'}">
      <div class="cardTop"><span class="cName">${b.from}–${b.to > 900 ? '∞' : b.to} ${b.name}</span>
      <span class="cCost">${open ? '已蓋到' : '未解鎖'}</span></div>
      <div class="cDetail">${b.unlock}</div></div>`;
  }
  h += `<div class="sect">成就</div>`;
  for (const a of ACHIEVEMENTS){
    const got = st.achieved[a.id];
    h += `<div class="card ${got ? 'owned' : 'unknown'}">
      <div class="cardTop"><span class="cName">${got ? '🏆' : '🔒'} ${a.name}</span></div>
      <div class="cHint">${a.note}</div></div>`;
  }
  return h;
}

function tabStats(){
  const st = app.st, sim = app.sim, d = derived(st);
  let h = `<div class="note">誰在偷懶，這頁看得出來。效率 = 每分鐘跑的樓層 × 載客率。</div>`;
  h += `<table class="tb"><tr><th>井</th><th>停靠</th><th>載客</th><th>樓/分</th><th>忙碌</th><th>效率</th></tr>`;
  for (const s of sim.shafts){
    const fpm = s.st.total > 0 ? s.st.floors / (s.st.total / 60) : 0;
    const busy = s.st.total > 0 ? s.st.busy / s.st.total : 0;
    const eff = fpm * Math.max(0.05, s.st.load);
    h += `<tr><td>${s.id + 1}${s.express ? ' 快' : ''}</td><td>${s.st.trips}</td><td>${s.st.carried}</td>
      <td>${fpm.toFixed(1)}</td><td>${Math.round(busy * 100)}%</td><td>${eff.toFixed(1)}</td></tr>`;
  }
  h += `</table>`;
  const rows = [
    ['演算法', algoName(st) + `（效率係數 ${d.algoEff.toFixed(2)}）`],
    ['送達 / 放棄', `${st.stats.served} / ${st.stats.abandoned}`],
    ['放棄率', st.stats.served + st.stats.abandoned > 0
       ? Math.round(st.stats.abandoned / (st.stats.served + st.stats.abandoned) * 100) + '%' : '—'],
    ['高樓層服務率', st.floors > C.SIM_FLOORS ? Math.round(sim.abstract.ratio * 100) + '%' : '尚未蓋到'],
    ['高樓層收益', '$' + fmtShort(sim.abstract.income) + '/秒'],
    ['抽象樓層累計', '$' + fmtShort(st.stats.abstractEarned)],
    ['入住率', (() => { let bu = 0, le = 0;
        for (const b of BANDS){ bu += builtInBand(st, b); le += leasedInBand(st, b); }
        return bu ? `${le}/${bu}（${Math.round(le / bu * 100)}%）` : '—'; })()],
    ['口碑對人流', '×' + d.womMult.toFixed(2)],
    ['本輪收入', '$' + fmtShort(st.runRevenue)],
    ['總收入', '$' + fmtShort(st.lifetimeRevenue)],
    ['最佳單輪', '$' + fmtShort(st.stats.bestRun)],
    ['超速時間', Math.round(st.stats.boostTime) + 's（過熱 ' + st.stats.overheats + ' 次）'],
    ['拆樓次數', st.prestiges],
  ];
  h += `<table class="tb">` + rows.map(r => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td></tr>`).join('') + `</table>`;
  return h;
}

function tabPrestige(){
  const st = app.st;
  const gain = prestigeGain(st), ok = canPrestige(st);
  let h = `<div class="note">拆一棟樓，蓋更高的一棟。現實裡的摩天樓就是這樣長出來的。</div>`;
  h += `<div class="bigNum">📐 ${gain}</div>
    <div class="note center">這次拆樓可以拿到的藍圖<br><span class="dim">= √(本輪收入 ÷ 100萬)</span></div>`;
  h += `<div class="card"><div class="cardTop"><span class="cName">保留</span></div>
    <div class="cDetail">藍圖、技能樹、乘客圖鑑、成就、已解鎖的演算法（藍圖買的那些）、地基等級</div></div>`;
  h += `<div class="card"><div class="cardTop"><span class="cName">歸零</span></div>
    <div class="cDetail">現金、樓層數、所有現金升級、現金買的演算法</div></div>`;
  h += `<div class="card ${ok ? 'danger' : 'dis'}" ${ok ? 'data-act="prestige" data-id="p"' : ''}>
    <div class="cardTop"><span class="cName">🏗 拆掉重蓋</span></div>
    <div class="cHint">${ok ? '按下去就開新的一輪。' :
      `需要 ${C.PRESTIGE_FLOOR} 層樓（目前 ${app.st.floors}）且至少能換到 1 張藍圖。`}</div></div>`;
  return h;
}

// ------------------------------------------------------------ 提示 / 覆蓋層
export function toast(txt, ms = 2600){
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = txt;
  $('#toasts').appendChild(el);
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
