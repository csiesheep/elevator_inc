// i18n.js — 語言切換。中文是原稿，英文放在 i18n-content.js 的對照表。
// t(key, ...args) 給 UI 字串；L(obj, field, kind) 給 content.js 裡的資料。
import { EN } from './i18n-content.js';

const KEY = 'elevator_inc_lang';

function detect(){
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch(e){}
  const n = (navigator.language || 'en').toLowerCase();
  return n.startsWith('zh') ? 'zh' : 'en';
}

let lang = detect();
export const getLang = () => lang;
export function setLang(l){
  lang = (l === 'en') ? 'en' : 'zh';
  try { localStorage.setItem(KEY, lang); } catch(e){}
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
}
export function toggleLang(){ setLang(lang === 'zh' ? 'en' : 'zh'); return lang; }

// content.js 的資料：英文查對照表，查不到就退回中文
export function L(obj, field, kind){
  if (!obj) return '';
  if (lang === 'en'){
    const cat = EN[kind];
    // BANDS 用 key，其它資料用 id
    const row = cat && cat[obj.id != null ? obj.id : obj.key];
    if (row && row[field] != null) return row[field];
  }
  return obj[field] != null ? obj[field] : '';
}

const DICT = {
  // ---- 頂欄 / HUD
  perSec:        ['/秒', '/s'],
  fareMult:      ['票價', 'fares'],
  footfall:      ['人流', 'footfall'],
  floorsUnit:    ['樓', 'floors'],
  shaftsUnit:    ['井', 'shafts'],
  waiting:       ['等待', 'waiting'],
  highRise:      ['高樓', 'upper'],
  busy:          ['人潮洶湧', 'heaving'],
  quiet:         ['冷清', 'quiet'],
  normal:        ['平常', 'normal'],
  peak:          ['尖峰', 'peak'],
  modelLine:     ['統計流量 ${0}/秒 · 服務率 {1}%', 'Modelled flow ${0}/s · served {1}%'],
  manual:        ['手動', 'manual'],
  boostTitle:    ['按住超速（會過熱）', 'Hold for overdrive (it overheats)'],

  // ---- 分頁
  tabUp:         ['升級', 'Build'],
  tabAuto:       ['自動化', 'Dispatch'],
  tabSkill:      ['藍圖', 'Blueprints'],
  tabCodex:      ['圖鑑', 'Codex'],
  tabStats:      ['統計', 'Stats'],
  tabPres:       ['拆樓', 'Rebuild'],

  // ---- 升級頁
  statSpeed:     ['速度', 'speed'],
  statAccel:     ['加速', 'accel'],
  statCap:       ['載客', 'capacity'],
  statDoor:      ['開門', 'doors'],
  statShaft:     ['井', 'shafts'],
  floorsPerSec:  ['樓/秒', 'fl/s'],
  secLeasing:    ['招商', 'Leasing'],
  vacantFloors:  ['{0} 層空著', '{0} vacant'],
  fullyLeased:   ['滿租', 'full'],
  occupancy:     ['入住率', 'Occupancy'],
  tenantMixLine: ['租戶組合 ×{0} 單價 · ×{1} 人流', 'Tenant mix ×{0} fares · ×{1} footfall'],
  leaseBlocked:  ['評價 {0} 太低，現在沒有租戶願意進來。先把服務做好（少讓人等到走掉），評價回到 {1} 以上才招得到人。',
                  'At {0} stars nobody wants to move in. Fix the service first — stop letting people give up and walk — and tenants return above {1}.'],
  allLeased:     ['每一層都有租戶了。再蓋新的樓層就要重新招商。',
                  'Every floor has a tenant. Build higher and you will have to lease again.'],
  tenantFare:    ['單價', 'fares'],
  tenantPop:     ['人流', 'footfall'],
  tenantBursts:  ['會爆量', 'bursts'],
  secElevator:   ['電梯', 'Elevator'],
  maxed:         ['已滿級', 'maxed'],
  secEnding:     ['終局', 'Ending'],
  orbitName:     ['軌道發射', 'Orbital launch'],
  orbitDetail:   ['把井道延伸出大氣層。', 'Extend the shaft past the atmosphere.'],
  orbitHint:     ['這是結局。按下去就結束了。', 'This is the ending. Pressing it ends the game.'],
  secDanger:     ['危險區', 'Danger'],
  wipeName:      ['🗑 清空存檔', '🗑 Wipe save'],
  wipeHint:      ['連藍圖跟圖鑑一起，全部歸零。', 'Blueprints and codex included. Everything goes.'],
  wipeConfirm:   ['確定要清空存檔？藍圖、圖鑑、成就都會不見。',
                  'Wipe the save? Blueprints, codex and achievements all go.'],
  wiped:         ['全部歸零', 'Everything reset'],

  // ---- 自動化頁
  autoIntro:     ['電梯調度是真的電腦科學問題。每一階都真的改變電梯怎麼跑，統計頁看得出差別。',
                  'Elevator dispatch is a real computer science problem. Every rung genuinely changes how the cars move, and the stats page shows the difference.'],
  installed:     ['已裝設', 'installed'],

  // ---- 技能樹
  bpIntro:       ['藍圖 📐 {0} —— 拆樓重蓋也不會消失。', 'Blueprints 📐 {0} — these survive a demolition.'],
  branchMech:    ['機械', 'Mechanical'],
  branchOps:     ['營運', 'Operations'],
  branchArch:    ['建築', 'Architecture'],
  skillFull:     ['滿', 'max'],

  // ---- 圖鑑
  codexIntro:    ['乘客圖鑑 {0}/{1} —— 獨立於數字線之外的第二條獎勵管道。',
                  'Passenger codex {0}/{1} — a reward track running alongside the numbers.'],
  unknownName:   ['？？？', '???'],
  notCarried:    ['未載到', 'not yet'],
  notCarriedNote:['還沒載到這種乘客。', 'You have not carried one of these yet.'],
  codexMeta:     ['票價 ×{0} · 耐性 {1} · 佔 {2} 格', 'Fare ×{0} · patience {1} · takes {2} slots'],
  secFloorTypes: ['樓層類型', 'Floor bands'],
  built:         ['已蓋到', 'built'],
  locked:        ['未解鎖', 'locked'],
  secAchieve:    ['成就', 'Achievements'],

  // ---- 統計頁
  statsIntro:    ['誰在偷懶，這頁看得出來。效率 = 每分鐘跑的樓層 × 載客率。',
                  'This page shows which shaft is slacking. Efficiency = floors per minute × load factor.'],
  thShaft:       ['井', 'Shaft'],
  thStops:       ['停靠', 'Stops'],
  thCarried:     ['載客', 'Carried'],
  thFpm:         ['樓/分', 'Fl/min'],
  thBusy:        ['忙碌', 'Busy'],
  thEff:         ['效率', 'Eff'],
  expressTag:    ['快', 'exp'],
  rowAlgo:       ['演算法', 'Algorithm'],
  algoCoef:      ['（效率係數 {0}）', ' (efficiency {0})'],
  rowServed:     ['送達 / 放棄', 'Delivered / lost'],
  rowLostPct:    ['放棄率', 'Loss rate'],
  rowHighServe:  ['高樓層服務率', 'Upper-floor service'],
  notBuiltYet:   ['尚未蓋到', 'not built yet'],
  rowHighIncome: ['高樓層收益', 'Upper-floor income'],
  rowAbstract:   ['抽象樓層累計', 'Modelled floors total'],
  rowOccupancy:  ['入住率', 'Occupancy'],
  rowWom:        ['口碑對人流', 'Word of mouth'],
  rowRunRev:     ['本輪收入', 'This run'],
  rowLifetime:   ['總收入', 'Lifetime'],
  rowBestRun:    ['最佳單輪', 'Best run'],
  rowBoost:      ['超速時間', 'Overdrive'],
  overheatTimes: ['s（過熱 {0} 次）', 's ({0} overheats)'],
  rowPrestiges:  ['拆樓次數', 'Demolitions'],

  // ---- 拆樓
  presIntro:     ['拆一棟樓，蓋更高的一棟。現實裡的摩天樓就是這樣長出來的。',
                  'Tear one tower down, build a taller one. That is how real skylines happen.'],
  presGain:      ['這次拆樓可以拿到的藍圖', 'Blueprints this demolition would pay'],
  presFormula:   ['= √(本輪收入 ÷ 100萬)', '= √(this run ÷ 1M)'],
  presKeep:      ['保留', 'Kept'],
  presKeepList:  ['藍圖、技能樹、乘客圖鑑、成就、已解鎖的演算法（藍圖買的那些）、地基等級',
                  'Blueprints, skill tree, codex, achievements, blueprint-bought dispatch, foundation level'],
  presLose:      ['歸零', 'Reset'],
  presLoseList:  ['現金、樓層數、所有現金升級、現金買的演算法',
                  'Cash, floors, every cash upgrade, cash-bought dispatch'],
  presDo:        ['🏗 拆掉重蓋', '🏗 Demolish and rebuild'],
  presReady:     ['按下去就開新的一輪。', 'This starts a fresh run.'],
  presNotReady:  ['需要 {0} 層樓（目前 {1}）且至少能換到 1 張藍圖。',
                  'Needs {0} floors (you have {1}) and at least 1 blueprint.'],

  // ---- 提示 / 覆蓋層
  newShaft:      ['新的電梯井上線了', 'A new shaft is running'],
  itRuns:        ['它開始自己跑了', 'It runs by itself now'],
  presTitle:     ['拆掉重蓋', 'Demolished'],
  presBody:      ['這一輪換到 <b>📐 {0}</b> 張藍圖。<br>樓沒了，圖紙還在。',
                  'This run paid <b>📐 {0}</b> blueprints.<br>The tower is gone. The drawings are not.'],
  presBtn:       ['蓋新的', 'Build again'],
  offlineTitle:  ['你不在的時候', 'While you were away'],
  offlineBody:   ['大樓自己跑了 <b>{0}</b>。<br>離線收益（50% 效率、上限 {1} 小時）：<b>${2}</b>',
                  'The building ran itself for <b>{0}</b>.<br>Offline earnings (50% rate, {1} hour cap): <b>${2}</b>'],
  offlineBtn:    ['收下', 'Collect'],
  hours:         ['{0} 小時 {1} 分', '{0}h {1}m'],
  minutes:       ['{0} 分', '{0} min'],
  endTitle:      ['離開大氣層', 'Out of the atmosphere'],
  endBody:       ['電梯沒有在屋頂停下來。<br><br>井道繼續往上，穿過雲層、穿過對流層頂，最後停在一個沒有樓層編號的地方。<br><br>你蓋了 <b>{0}</b> 層，送了 <b>{1}</b> 個人，賺了 <b>${2}</b>。<br><br><span class="dim">遊戲結束了。你還是可以繼續蓋，但它已經沒有更高的地方可以去。</span>',
                  'The car does not stop at the roof.<br><br>The shaft keeps going, through the cloud deck, past the tropopause, and halts somewhere with no floor number at all.<br><br>You built <b>{0}</b> floors, carried <b>{1}</b> people, and earned <b>${2}</b>.<br><br><span class="dim">That is the ending. You can keep building, but there is nowhere higher to go.</span>'],
  endBtn:        ['好', 'OK'],
  evacName:      ['🚨 疏散模式', '🚨 Evacuate'],
  evacCool:      ['🚨 冷卻 {0}s', '🚨 Cooldown {0}s'],
  evacGo:        ['🚨 疏散 {0} 樓', '🚨 Clear floor {0}'],
  evacFire:      ['🚨 疏散模式：全部電梯趕往 {0} 樓', '🚨 Evacuating: every car to floor {0}'],
  overheated:    ['🔥 馬達過熱，強制停機 8 秒', '🔥 Motor overheated — 8 second shutdown'],
  ghostBonus:    ['👻 十三樓的房客留下了 ${0}', '👻 The thirteenth floor left you ${0}'],
  tenantLeft:    ['📉 {0}層的{1}受不了搬走了（評價 {2}）', '📉 A {1} on the {0} floors gave up and left ({2} stars)'],
  tenantJoined:  ['📈 口碑帶來新租戶：{0}層免費多租出一層', '📈 Word of mouth: a free tenant on the {0} floors'],
  warnLead:      ['⏰ {0} 秒後：{1}（{2} 樓）', '⏰ In {0}s: {1} (floor {2})'],
  gaveUp:        ['走了', 'gave up'],

  // ---- 首頁
  landTagline:   ['你經營一棟不斷長高的大樓的垂直運輸，而大樓越高，你越忙不過來。',
                  'You run the vertical transport of a tower that keeps growing — and the taller it gets, the further behind you fall.'],
  btnStart:      ['開始遊戲', 'Play'],
  btnContinue:   ['繼續遊戲', 'Continue'],
  btnRules:      ['玩法說明', 'How to play'],
  btnLedger:     ['帳本', 'Ledger'],
  btnMore:       ['更多遊戲', 'More games'],
  landSaveLine:  ['{0} 樓 · 送達 {1} 人次 · ★{2}', '{0} floors · {1} delivered · ★{2}'],
  landNoSave:    ['還沒有存檔', 'No save yet'],
  rulesTitle:    ['玩法說明', 'How to play'],
  ledgerTitle:   ['帳本', 'Ledger'],
  ledgerEmpty:   ['還沒有紀錄。玩一輪再回來看。', 'Nothing recorded yet. Play a round and come back.'],
  ledgerRun:     ['這一輪', 'Current run'],
  ledgerAll:     ['歷來', 'All time'],
  ledgerCodex:   ['收集', 'Collection'],
  close:         ['關閉', 'Close'],
  back:          ['← 首頁', '← Home'],
};

export function t(key, ...args){
  const row = DICT[key];
  if (!row) return key;
  let s = row[lang === 'en' ? 1 : 0];
  args.forEach((a, i) => { s = s.split('{' + i + '}').join(a); });
  return s;
}

setLang(lang);
