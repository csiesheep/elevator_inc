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
  busy:          ['人潮洶湧', 'heaving'],
  quiet:         ['冷清', 'quiet'],
  normal:        ['平常', 'normal'],
  peak:          ['尖峰', 'peak'],
  manual:        ['手動', 'manual'],
  boostTitle:    ['按住超速（會過熱）', 'Hold for overdrive (it overheats)'],
  // ⚠ **這個鍵是 FE 加的（#157），字本身還沒有 writer 簽過。** TEAM.md 說玩家看得到的
  // 字是 writer 的所有權；照 #149 那七個鍵的先例辦：現有格式、大聲點名是誰加的、
  // **譯文以 writer 為準**，writer 要改就直接改，不用回頭問 FE。
  // 用途：#156 方向 A 讓超速鈕從「一個 🔥」變成「🔥 + 一個詞」（`game.html` 的
  // `.bLabel`）。上面的 `boostTitle` 是滑鼠停留的長句，這個是鈕面上的短標籤，兩支不同。
  // ⚠⚠ **不要拿 `rowBoost`（本檔 ~130 行）來共用。** 它的英文剛好也是 'Overdrive'，
  // 但中文是「超速時間」——那是統計頁的欄名（`js/ui.js` 那一列後面接秒數）。
  // 共用的話英文看起來沒事，中文會在鈕面上印出「超速時間」。
  boostLabel:    ['超速', 'Overdrive'],

  secRoof:       ['屋頂', 'Roof'],
  roofHint:      ['純外觀，不影響任何數值。拆樓也會保留。',
                  'Cosmetic only — no effect on anything. Survives a rebuild.'],

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
  rowServed:     ['送達 / 放棄', 'Delivered / lost'],
  rowLostPct:    ['放棄率', 'Loss rate'],
  notBuiltYet:   ['尚未蓋到', 'not built yet'],
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
  presFormula:   ['= √(本輪收入 ÷ {0})', '= √(this run ÷ {0})'],
  presKeep:      ['保留', 'Kept'],
  // #165：已解鎖的難度也跨拆樓保留（`doPrestige` 的 carry 明列 difficultyCleared），
  // 所以這張「保留」清單要多一項——清單漏掉的東西，玩家只能靠拆一次來發現。
  presKeepList:  ['藍圖|技能樹|乘客圖鑑|成就|藍圖階的調度演算法|屋頂樣式|已解鎖的難度',
                  'Blueprints|Skill tree|Codex|Achievements|Blueprint-tier dispatch|Roof style|Unlocked difficulties'],
  presLose:      ['歸零', 'Reset'],
  presLoseList:  ['現金|樓層數|現金買的升級|現金階的調度演算法|評價',
                  'Cash|Floors|Every cash upgrade|Cash-tier dispatch|Rating'],
  presDo:        ['🏗 拆掉重蓋', '🏗 Demolish and rebuild'],
  // ---- 難度（#165）----
  // ⚠ **這七個鍵是 BE 加的，字本身還沒有 writer 簽過。** 照 #149 / #152 的先例：
  //   現有格式、大聲點名是誰加的、交付時列出來，**譯文以 writer 為準，改掉不用問我**。
  //   四個難度名（普通／惡夢／地獄／折磨）不在這裡：它們是資料，跟屋頂樣式一樣
  //   住在 `content.js` 的 `DIFFICULTIES`，英文在 `i18n-content.js` 的 `difficulties`。
  // ⚠ `diffIntro` 與 `diffLocked` 的「{0} 樓」吃的是 `C.ENDING_FLOOR`，不要寫死 100——
  //   那個常數改過一次（#150 的教訓：規則書裡寫死的價碼會變成謊話）。
  secDifficulty: ['下一輪的難度', 'Next run'],
  diffIntro:     ['在一個難度上蓋到 {0} 樓，就解鎖下一級。這一輪選的難度會一直跟著這一輪。',
                  'Reach floor {0} on a difficulty to unlock the next one. What you pick here lasts the whole run.'],
  diffMults:     ['人流 ×{0} · 耐性 ×{1} · 收入 ×{2}', 'Traffic ×{0} · patience ×{1} · income ×{2}'],
  diffChosen:    ['下一輪', 'Next run'],
  diffCleared:   ['已通關', 'cleared'],
  diffLocked:    ['在「{0}」蓋到 {1} 樓才解鎖', 'Reach floor {1} on {0} to unlock this'],
  diffUnlocked:  ['🔓 解鎖「{0}」——拆樓的時候選得到了', '🔓 {0} unlocked — pick it when you rebuild'],
  diffRejected:  ['那個難度還沒解鎖', 'That difficulty is still locked'],
  presReady:     ['按下去就開新的一輪。', 'This starts a fresh run.'],
  presZero:      ['這輪還沒賺到半張藍圖，現在拆掉等於白拆一次。',
                  'This run has not earned a blueprint yet — rebuilding now buys you nothing.'],

  // ---- 提示 / 覆蓋層
  newShaft:      ['新的電梯井上線了', 'A new shaft is running'],
  itRuns:        ['它開始自己跑了', 'It runs by itself now'],
  presTitle:     ['拆掉重蓋', 'Demolished'],
  presBody:      ['這一輪換到 <b>📐 {0}</b> 張藍圖。<br>樓沒了，圖紙還在。',
                  'This run paid <b>📐 {0}</b> blueprints.<br>The tower is gone. The drawings are not.'],
  presBtn:       ['蓋新的', 'Build again'],
  // offlineTitle／offlineBody／offlineBtn 在 #155 拿掉了（離線收益移除）。
  // hours／minutes 一起走：它們**唯一的讀者**是那個 overlay 的時長字串（main.js）。
  endTitle:      ['離開大氣層', 'Out of the atmosphere'],
  endBody:       ['電梯沒有在屋頂停下來。<br><br>井道繼續往上，穿過雲層、穿過對流層頂，最後停在一個沒有樓層編號的地方。<br><br>你蓋了 <b>{0}</b> 層，送了 <b>{1}</b> 個人，賺了 <b>${2}</b>。<br><br><span class="dim">遊戲結束了。你還是可以繼續蓋，但它已經沒有更高的地方可以去。</span>',
                  'The car does not stop at the roof.<br><br>The shaft keeps going, through the cloud deck, past the tropopause, and halts somewhere with no floor number at all.<br><br>You built <b>{0}</b> floors, carried <b>{1}</b> people, and earned <b>${2}</b>.<br><br><span class="dim">That is the ending. You can keep building, but there is nowhere higher to go.</span>'],
  endBtn:        ['好', 'OK'],
  evacName:      ['🚨 疏散模式', '🚨 Evacuate'],
  evacCool:      ['🚨 冷卻 {0}s', '🚨 Cooldown {0}s'],
  evacGo:        ['🚨 疏散 {0} 樓', '🚨 Clear floor {0}'],
  evacFire:      ['🚨 疏散模式：全部電梯趕往 {0} 樓', '🚨 Evacuating: every car to floor {0}'],
  overheated:    ['🔥 馬達過熱，強制停機 8 秒', '🔥 Motor overheated — 8 second shutdown'],
  blockedTap:    ['🚧 {0} 樓封鎖中，還要 {1} 秒', '🚧 Floor {0} is closed — {1}s to go'],
  toastMore:     ['⋯ 另外 {0} 則（成就頁看得到全部）', '⋯ and {0} more (see the Codex)'],
  ghostBonus:    ['👻 十三樓的房客留下了 ${0}', '👻 The thirteenth floor left you ${0}'],
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

  // ---- 圖鑑頁（#149 加，#153 改）
  // ⚠ **這些鍵是 FE 加的，字本身還沒有 writer 簽過。** TEAM.md 說玩家看得到的
  // 字是 writer 的所有權，我在 #149 上問過兩次「要 writer 加還是授權我加」，
  // 沒有拿到回答；擋著整個頁面不做比較糟，所以先照現有格式加上，交付時點名。
  // **譯文以 writer 的為準，改掉不用問我。**
  //
  // ⚠⚠ **#153 換掉了這一頁的規則，所以這一段的舊註解已經作廢，不要照它寫字。**
  // 舊的（#149 的丙）：「這一頁永遠不顯示名字與數值」。
  // 現在（#153，owner 修訂）：**圖鑑頁 = 圖鑑 tab 的網頁版**——載過的人
  // 名字＋說明＋數值全給，**沒載過的連圖都不給，換成一個 7×9 的問號**。
  // 所以「沒載過」那一格的字**沿用 tab 已經在用的三個鍵**
  //（`unknownName` / `notCarried` / `notCarriedNote`，都在上面的「圖鑑」那一段），
  // 不另立一套平行的字——兩份字就是兩份真相。
  //
  // 仍然成立的一條：**不放假的名字或編號當佔位。** 沒有存檔的訪客會看到
  // 78 個問號，owner 逐字裁決過那是可以的（「圖鑑就是要蒐集的」）。
  btnCodex:      ['乘客圖鑑', 'Codex'],
  codexTitle:    ['乘客圖鑑', 'Passenger Codex'],
  // #153 改寫。舊句是「這棟樓裡會搭電梯的每一種人，一個都不少。名字、票價與耐性
  // 要在遊戲裡載過才看得到。」——新規則下**圖也看不到了**，那句話不再描述這一頁。
  codexLead:     ['載過的人有名字、說明與數值；沒載過的只有一個問號。這一頁跟遊戲裡的圖鑑是同一份。',
                  'Carried them? Name, note and numbers. Not yet? A question mark. Same codex as the one in the game.'],
  // #153 新增。問號是純 SVG，沒有文字；`<title>` 空著的話，78 個問號對讀螢幕的人
  // 是 78 個沉默的方塊。**這句話不可以帶任何一個人的資訊**，它是常數。
  codexUnknownAlt:['還沒載過的乘客', 'A passenger you have not carried'],
  codexSeen:     ['你的存檔裡見過 {0} / {1}', 'Your save has met {0} of {1}'],
  codexNoSave:   ['你還沒有存檔——先玩一輪，這些人就會有名字。',
                  'No save yet — play a round and these people get names.'],
  // #153 改：換姿勢現在**只有載過的卡**做得到（沒載過的是一個問號，
  // 而問號沒有「快沒耐性」的樣子）。舊句寫「點一格」，會讓人去點問號。
  codexPose:     ['點一張載過的卡，換成「快沒耐性」的姿勢；右上角那顆整頁一起換。',
                  'Tap a card you have carried for its out-of-patience pose; the button above switches the whole page.'],
  codexBandN:    ['{0} 種', '{0} kinds'],
  codexAnyBand:  ['每一層都有', 'On every floor'],
  codexOneFloor: ['只有 {0} 樓', 'Floor {0} only'],
  codexPoseUrgent:['快沒耐性', 'Out of patience'],
  codexPoseCalm: ['一般', 'Calm'],

  // ---- 首頁那段 18 秒動畫的字幕（#152）
  // ⚠ **這六個鍵是 FE 加的，字本身還沒有 writer 簽過。** 跟上面那七個（#149）
  //   同一個狀況、同一個先例：TEAM.md 說玩家看得到的字是 writer 的所有權，
  //   擋著整頁不做比較糟，所以照現有格式加上，交付時點名。
  //   **譯文以 writer 的為準，改掉不用問我。**
  //
  // 這六個**只有接合詞**。字幕裡真正的內容——事件名與樓層帶名——一個字都沒有新增：
  //   事件名 = L(beat.ev, 'name', 'events')      → i18n-content.js 的 events
  //   樓層帶名 = L(band, 'name', 'bands')        → i18n-content.js 的 bands
  // 兩張表中英文都齊，所以這一段動畫**沒有任何一句話是我編的**。
  //
  // `landRideLobby` 是唯一的例外：EVENTS 的 at/to 用 'lobby'，而 'lobby' 不是
  // BANDS 的 key（1 樓在 retail 帶裡），所以它沒有現成的譯名。
  landRideAt:    ['{0} {1} 樓', '{0}, floor {1}'],
  landRideHours: ['{0}–{1} 點', '{0}:00–{1}:00'],
  landRideCount: ['{0}–{1} 人', '{0}–{1} people'],
  landRideAllDay:['任何時段', 'any hour'],
  landRideLobby: ['大廳', 'Lobby'],
  landRideAlt:   ['首頁動畫：電梯從大廳一路往上，在四個樓層停下來，每一站是遊戲裡真的會發生的事件。',
                  'Landing animation: the car rides up from the lobby and stops at four floors, each one a real in-game event.'],
};

export function t(key, ...args){
  const row = DICT[key];
  if (!row) return key;
  let s = row[lang === 'en' ? 1 : 0];
  args.forEach((a, i) => { s = s.split('{' + i + '}').join(a); });
  return s;
}

setLang(lang);
