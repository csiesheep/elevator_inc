// i18n-content.js — content.js 那些資料的英文對照。
// 中文留在 content.js 當原稿；這裡只放翻譯，查不到就自動退回中文。
export const EN = {

  upgrades: {
    speed:   { name:'Cruise speed',  detail:'+0.15 floors/s',   hint:'Helps long trips. Barely touches short ones.' },
    accel:   { name:'Acceleration',  detail:'+0.08 floors/s²',  hint:'Helps short trips. Barely touches long ones.' },
    cap:     { name:'Car capacity',  detail:'+2 people',        hint:'More per trip, but loading takes longer.' },
    door:    { name:'Door cycle',    detail:'-0.12 s',          hint:'Only pays off once you make a lot of stops.' },
    cooling: { name:'Cooling',       detail:'+2 heat capacity / faster cooling', hint:'Lets you hold overdrive longer.' },
    shaft:   { name:'Extra shaft',   detail:'+1 shaft',         hint:'The priciest, and useless without a dispatch algorithm.' },
    floor:   { name:'Build 5 floors',detail:'+5 floors', hint:'They fill themselves. A taller tower means longer trips, and longer trips pay more.' },
  },

  automation: {
    autodoor: { name:'Automatic doors', plain:'The doors close themselves. You stop tapping to send the car away.',
                tech:'Removes manual door close' },
    fifo:     { name:'FIFO dispatch', plain:'Whoever pressed first gets served first. Dumb, but you can finally stop tapping.',
                tech:'First-in first-out queue' },
    scan:     { name:'SCAN algorithm', plain:'Sweeps to the top, then to the bottom, picking people up along the way.',
                tech:'One-directional sweep, reverses only at the ends' },
    look:     { name:'LOOK algorithm', plain:'Turns around at the furthest actual request instead of running empty to the end.',
                tech:'SCAN with early reversal — no empty legs' },
    dest:     { name:'Destination dispatch', plain:'Passengers enter their destination in the lobby, so the system can group people going the same way.',
                tech:'Boards same-direction only, and picks the stop that serves the most people' },
    group:    { name:'Group control', plain:'The shafts stop working alone and send whichever car can get there soonest.',
                tech:'Assigns hall calls by estimated time of arrival' },
    shuttle:  { name:'Express shuttle', plain:'The last shaft becomes an express, serving only the upper floors instead of being dragged into lobby traffic.',
                tech:'Shaft with a restricted service range' },
    double:   { name:'Double-decker', plain:'Two cars stacked into one, serving two floors at every stop.',
                tech:'Capacity ×2, serves floors f and f+1 together' },
    skylobby: { name:'Sky lobby', plain:'A transfer hall halfway up. This is genuinely how real supertall towers are made to work.',
                tech:'A mid-building transfer floor — the express shuttle waits there, and its service range reaches lower' },
  },

  passengers: {
    office:    { name:'Office worker', note:'The bulk of your traffic. Multiplies during rush hour.' },
    tourist:   { name:'Tourist',       note:'Keeps taking photos. Adds 1.2s to the door cycle.' },
    courier:   { name:'Courier',       note:'The trolley takes two slots.' },
    guard:     { name:'Security',      note:'Pays nothing, but patrolling lifts the building rating.' },
    ceo:       { name:'CEO',           note:'Enormous fare, no patience at all. Keeping one waiting hurts the rating badly. Far more common at rush hour.' },
    cat:       { name:'Cat',           note:'Pays nothing. Purely raises the rating. Rare.' },
    ghost:     { name:'Ghost',         note:'Only ever on the 13th floor. Carrying it leaves you an unexpected sum.' },
    mover:     { name:'Removals crew', note:'The load takes four slots and fills most of the car. One of the best fares in the building, too — it earns those slots.' },
    guest:     { name:'Hotel guest',   note:'Luggage takes two slots. Hotel floors only.' },
    resident:  { name:'Resident',      note:'A regular, and patient with it. Residential floors only.' },
    observer:  { name:'Sightseer',     note:'Arrives in groups heading for the observation deck.' },
    // 觀景台帶的事件（#5）。十列事件只加了這一個型別，其餘指向既有的
    // `observer` 與 #101–#103 的三個。
    student:   { name:'Schoolchild',   note:'Twenty or thirty of them at once, and the lowest fare on the board.' },
    scientist: { name:'Researcher',    note:'Experimental floors only. In a hurry, and will not say why.' },
    influencer:{ name:'Queue influencer', note:'Retail floors only. Deliver one and two or three companions turn up in the lobby. The companions bring nobody.' },
    waxer:     { name:'Cleaning crew',    note:'The floor-waxing crew. Deliver them and the floor closes — leave them in the lobby and they will take the stairs anyway.' },
    stroller:  { name:'Parent with a pushchair', note:'Retail floors only. The pushchair takes three slots and adds 1.5s to the door cycle — it costs you space and time at once.' },
    loaded:    { name:'Laden shopper',    note:'Retail floors only. The bags take two slots. Get one there quickly (waiting under 40% of their patience) and they add half the fare again as a tip.' },
    janitor:   { name:'Closing-time cleaner', note:'Turns up once the shops shut. Pays nothing, but taking them down lifts the rating.' },
    sampler:   { name:'Sample seller',    note:'Works the retail floors. Pays little, never gives up, and rides straight back once you deliver them.' },
    closing:   { name:'Shop staff',       note:'Pulling the shutters down and heading home. Only appears at closing time.' },
    anniv:     { name:'Sale shopper',     note:'Here for the anniversary sale. Cheap fares, enormous numbers.' },
    diner:     { name:'Food-court diner', note:'The whole floor goes down to eat at noon. The lowest fare in the building, and the most reliable.' },
    movie:     { name:'Cinema crowd',     note:'A full house leaving at once, and all of them in a hurry. The shortest patience in retail.' },
    dolly:     { name:'Restocking porter',note:'Dawn restock trolleys. Two slots each, and paid less than a courier — nobody competes for the lift at 6am.' },
    queuer:    { name:'Launch queuer',    note:'Queued all night for one product. The biggest crowd, and the most patient one.' },
    child:     { name:'Lost child',       note:'A child looking for a parent between floors. Pays nothing; delivering raises the rating. Ignore them and they wander off.' },
    winner:    { name:'Prize winner',     note:'Rushing down to collect a raffle prize. The best fare in retail — on half the usual patience.' },
    // 辦公帶九個事件的人物（#39 #41 #42 #43 #44 #45 #46 #47 #40）
    attendee:  { name:'Meeting attendee', note:'A whole meeting room emptying at once. A little more patient than an office worker — they walked out under their own steam.' },
    townhaller:{ name:'All-hands attendee', note:'Summoned to the all-hands. They converge on one floor from every floor — attendance is mandatory, so they will not walk away.' },
    evacuee:   { name:'Evacuee',          note:'Herded downstairs by the fire drill. The event halves their patience — it is the alarm going off that makes them impatient, not the drill.' },
    client:    { name:'Visiting client',  note:'One important guest, lobby to the offices. The highest fare in the building, and barely more patience than the CEO.' },
    newhire:   { name:'New starter',      note:'First day. Each one spends a second fumbling for a pass — and five to nine of them arrive together, so the doors never shut.' },
    outager:   { name:'Outage refugee',   note:'The system is down, so the whole floor gives up and heads home. One of the largest crowds in the game.' },
    nightowl:  { name:'Late worker',      note:'Still here at midnight. Few of them, well paid, and the most patient — nobody else wants the lift at this hour.' },
    coffeegoer:{ name:'Coffee run',       note:'Office workers heading down for an afternoon coffee. The only crowd the offices send into the shops.' },
    laidoff:   { name:'Laid-off worker',  note:'Their last trip down, carrying a box. The shortest patience of anyone who arrives in a crowd — and leaving them behind hurts the rating extra.' },
    // 辦公帶的隨機池人物（#50 #52 #53）
    interviewee:{ name:'Interviewee',     note:'Office floors only. On the way to a job interview — get one there on time and the rating goes up; let one give up and it costs more than usual.' },
    repairman: { name:'Copier engineer',  note:'Office floors only. The toolbox takes three slots, but he is in no hurry — this one costs you space, not time.' },
    remote:    { name:'Remote worker',    note:'Office floors only. Turns up between 10pm and 5am and nowhere else, and waits patiently — the night shift owns those floors.' },
    // 飯店帶八個事件的九個人物（#54 #56 #57 #59 #60 #61 #62 #55）
    tourgroup:   { name:'Tour guest',      note:'Checking in with the group. The luggage takes two slots, but they are in no hurry.' },
    checkouter:  { name:'Departing guest', note:'Leaving together in the morning. The luggage takes two slots, and they have a flight to catch.' },
    weddingguest:{ name:'Wedding guest',   note:'Leaving the reception together. The biggest crowd in the hotel, and all of them tired — the event cuts their patience to three quarters.' },
    lateguest:   { name:'Late arrival',    note:'Arrived in the middle of the night. Few of them, the highest fare, and the most patient — nobody else wants the lift at this hour.' },
    breakfaster: { name:'Breakfast guest', note:'On the way down to the buffet. The only hotel crowd that heads for the retail floors.' },
    celeb:       { name:'Celebrity',       note:'A celebrity checking in — a pack of reporters turns up with them. Second-highest fare in the game, and barely more patient than the CEO.' },
    reporter:    { name:'Reporter',        note:'Press following the celebrity up. The gear takes two slots, and six to nine of them will not fit in one car.' },
    delegate:    { name:'Conference delegate', note:'A whole delegation arriving at once, all for the same floor. Plenty of them, but nothing in their hands except a lanyard.' },
    jamcart:     { name:'Luggage trolley', note:'A luggage trolley pushed by a hotel porter. Three slots, and it jams the doors open for 8 seconds — that car is going nowhere.' },
    // 飯店帶的四個人物（#63 #64 #65 #66）
    newlywed:  { name:'Honeymoon couple', note:'Hotel floors only. The two of them must ride together — delivering them separately does not count, so a couple needs four slots free. Worth well over double a hotel guest.' },
    roomcart:  { name:'Room-service cart',note:'A trolley that fills most of the car, moving between floors. Never gives up — leave it and it just stands there.' },
    bellhop:   { name:'Bellhop',          note:'Carries the luggage. Pays nothing and never gives up, but a ride lifts the building rating. Two slots.' },
    nightguest:{ name:'Late-night guest', note:'Hotel floors only. Turns up between 11pm and 4am and nowhere else, for the best fare on the floor — nobody else wants the lift at that hour.' },
    // 住宅帶的四個人物（#80 #81 #82 #83）。#79 搬家公司的英文在上面 mover 那一行。
    // 數字要跟 content.js 的資料對得上：遛狗一組 4 格（size 2 × 2）、外送小費是
    // 車資的一半（tip.mult 0.5）、深夜回家 0–4 點（peaks 的補集窗）、裝修 3 格。
    dogwalker: { name:'Dog walker',       note:'Residential floors only. The dog rides with its owner or not at all — delivered apart does not count, so one pair needs four slots free. Far more common in the evening.' },
    fooddeliv: { name:'Food courier',     note:'Residential floors only. The shortest patience on these floors — get one there fast (waiting under 40% of their patience) and they hand you half the fare again as a tip; too slow and they simply stop waiting. Far more common around dinner.' },
    latehome:  { name:'Late homecomer',   note:'Residential floors only. Turns up between midnight and 4am and nowhere else, and is the most patient person in the building — nobody else wants the lift at that hour.' },
    renovator: { name:'Renovation crew',  note:'Residential floors only. The tools take three slots, but he is in no hurry — this one costs you space, not time. Works while the residents are out.' },
    // 住宅帶十個事件的五個人物（#69 #70 #73 #74 #78）。另外五個事件指到 #79–#83 的人物，
    // 那五列的英文在那一支分支上，不在這裡。
    commuter:   { name:'Morning commuter', note:'Residents heading down to work between seven and nine. An ordinary fare, over and over — that is what this band is.' },
    homecomer:  { name:'Returning resident', note:'Residents coming home in the evening. Their hands are full, so they pay a little more; nobody is late for their own sofa, so they wait a little longer.' },
    waterhauler:{ name:'Water carrier',    note:'The water is off and the whole block is going down with buckets. The cheapest fare on these floors — this is an incident, not a service.' },
    neighbor:   { name:'Neighbour',        note:'A block party, with everyone converging on one floor. The only short trip in this band, so the fare has to make up for the distance.' },
    blackouter: { name:'Resident in the dark', note:'The power is out and everyone is pushing downstairs. Patience drops to a third during the event — they know there is no other way down, but they will not wait long.' },
    // 觀景台帶的四個人物（#101 #102 #103 #104）。**#100 觀景客沒有在這裡**：
    // 它就是上面既有的 `observer` / Sightseer，這一趟沒有開第二個觀景客。
    // ⚠ 第 13 組會比對「文案說佔 N 格」與 `size`（中英各一次），成對的允許 2×size；
    //   而「N 秒」會拿去對 `doorPenalty`，這四列都沒有 doorPenalty，**所以英文
    //   一個「second」都不可以出現**（`sat:0.55` 那件事寫成「patience」不寫成秒）。
    proposer:  { name:'Proposal couple',  note:'Observation deck only. The two of them must ride together — delivered apart does not count, so a couple needs four slots free. Get them up before the nerve goes (waiting under 45% of their patience) and the rating jumps.' },
    photocrew: { name:'Photo crew',       note:'Observation deck only. Tripods and kit take three slots, but they are here to wait for the light — this one costs you space, not time.' },
    acrophobe: { name:'Vertigo visitor',  note:'One look over the edge and they want straight back down. The least patient passenger in the building — but only one slot, and no hard feelings.' },
    deckguide: { name:'Deck guide',       note:'Observation deck only. Turns up with four to six sightseers in tow, so a party needs a whole row of slots. He barely pays a thing himself — the money is in the group.' },
  },

  tenants: {
    shop:    { name:'Retail unit',      note:'Steady. No surprises.' },
    food:    { name:'Food court',       note:'Busy, mid fares, and the whole floor goes down at lunch.' },
    cinema:  { name:'Cinema',           note:'Quiet, until a screening ends and a full house comes out at once.' },
    desk:    { name:'Open-plan office', note:'A steady commute, morning and evening.' },
    conf:    { name:'Conference centre',note:'High fares, but every session that ends is a surge.' },
    callctr: { name:'Call centre',      note:'Enormous headcount, and the whole shift changes together.' },
    room:    { name:'Guest rooms',      note:'Arrivals at night, checkout in the morning.' },
    banquet: { name:'Banquet hall',     note:'Empties late at night, all at once, and everyone is tired.' },
    expo:    { name:'Exhibition hall',  note:'Footfall all day, with a wave at opening and closing.' },
    flat:    { name:'Apartments',       note:'Regulars on a predictable routine.' },
    sublet:  { name:'Short-let flats',  note:'Higher rent, but somebody is always moving in or out.' },
    deck:    { name:'Observation deck', note:'One-way pilgrimage of sightseers.' },
    skyrest: { name:'Sky restaurant',   note:'The highest fares up here. Seated in waves, emptied in waves.' },
    lab:     { name:'Laboratory',       note:'Researchers in a hurry.' },
    server:  { name:'Data centre',      note:'Almost nobody needs the lift, but the few trips pay enormously.' },
    sky:     { name:'Rooftop plant',    note:'The roof.' },
  },

  bands: {
    retail: { name:'Retail',      unlock:'Base footfall' },
    office: { name:'Offices',     unlock:'Rush hours: a surge at 9am and again at 6pm' },
    hotel:  { name:'Hotel',       unlock:'Luggage takes space; night arrivals and morning checkout' },
    resid:  { name:'Residential', unlock:'Regulars and removals crews; down in the morning, home at night' },
    obs:    { name:'Observation', unlock:'Waves of sightseers, mostly one way' },
    exp:    { name:'Laboratories',unlock:'Researchers, and things that break the balance' },
    roof:   { name:'Roof → orbit',unlock:'The ending' },
  },

  skills: {
    m_speed: { name:'High-tensile rope',  detail:'Starting cruise speed +0.10' },
    m_accel: { name:'Linear motor',       detail:'Starting acceleration +0.06' },
    m_cap:   { name:'Wider car',          detail:'Starting capacity +2' },
    m_cool:  { name:'Superconducting motor', detail:'Heat capacity +4, cooling +40% (at max, overheating is gone entirely)' },
    o_shaft: { name:'Pre-cut shaft',      detail:'Start with +1 shaft' },
    o_fare:  { name:'Dynamic pricing',    detail:'All fares +6%' },
    o_surge: { name:'Surge pay',          detail:'Passengers from an event pay +18%' },
    o_evac:  { name:'Evacuation mode',    detail:'Unlocks a button that sends every car to the surge floor (cooldown 90/70/50s)' },
    a_floor: { name:'Deep foundation',    detail:'Start with +5 floors' },
    a_cost:  { name:'Precast construction', detail:'Floor construction -10% (multiplicative)' },
    a_rate:  { name:'PR department',      detail:'Starting rating +0.3, rating climbs 20% faster' },
  },

  achievements: {
    first:   { name:'First trip',        note:'Deliver your first passenger.' },
    hundred: { name:'A hundred fares',   note:'Deliver 100 people.' },
    auto:    { name:'It runs itself',    note:'Buy your first dispatch algorithm.' },
    look:    { name:'No empty legs',     note:'Unlock the LOOK algorithm.' },
    five:    { name:'Five stars',        note:'Reach a 5.0 rating.' },
    ghost:   { name:'The thirteenth',    note:'Carry the ghost.' },
    cat:     { name:'Cat person',        note:'Carry the cat.' },
    demo:    { name:'Tear it down',      note:'Demolish for the first time.' },
    sky:     { name:'Sky lobby',         note:'Build the transfer hall.' },
    tall:    { name:'Seventy floors',    note:'Reach 70 floors.' },
    orbit:   { name:'Escape velocity',   note:'Take the elevator off the planet.' },
    pram:    { name:'Pushchair express', note:'Deliver 30 parents with pushchairs.' },
    tipjar:  { name:'Much obliged',      note:'Collect 10 tips.' },
    lastcall:{ name:'Shutters down',     note:'Deliver 4 shop staff at closing time.' },
    mopup:   { name:'Closing up',        note:'Deliver 6 closing-time cleaners.' },
    taster:  { name:'One more sample',   note:'Deliver 12 sample sellers.' },
    // 零售帶七個事件的成就（#14 #15 #16 #17 #18 #19 #21）。
    // 數字要跟 content.js 的判定一致——驗收第 8 組會逐條比對中英文案裡的數字。
    anniv:     { name:'Sale survivor',    note:'Deliver 50 anniversary shoppers.' },
    lunchrush: { name:'Lunch rush',       note:'Deliver 100 food-court diners.' },
    housefull: { name:'Full house',       note:'Deliver 200 people out of a cinema.' },
    restocked: { name:'Restocked',        note:'Deliver 100 restocking trolleys.' },
    launchday: { name:'Launch day',       note:'Deliver 30 launch queuers.' },
    foundkid:  { name:'Found you',        note:'Carry a lost child.' },
    jackpot:   { name:'Collect the prize',note:'Deliver 20 prize winners.' },
    // #22 / #27。數字要跟 content.js 的判定一致（驗收第 8 組逐條比對）。
    waxdry:    { name:'Clean finish',     note:'Ride out 4 floor-waxing shutdowns with nobody giving up on the sealed floor.' },
    entourage: { name:'Nobody left behind',note:'Deliver 25 complete influencer entourages without losing a single companion.' },
    // 辦公帶九個事件的成就。數字要跟 content.js 的判定一致（驗收第 8 組逐條比對）。
    adjourned: { name:'Meeting adjourned', note:'Deliver 60 meeting attendees.' },
    allhands:  { name:'All present',       note:'Deliver 12 people to an all-hands.' },
    firedrill: { name:'Drill over',        note:'Evacuate 20 people to the lobby during fire drills.' },
    bigdeal:   { name:'Good for business', note:'Deliver 3 visiting clients on time.' },
    firstday:  { name:'First day',         note:'Take 12 new starters up to their first day.' },
    rebooted:  { name:'Rebooted',          note:'Deliver 30 people escaping a system outage.' },
    burningoil:{ name:'Overtime',          note:'Take 25 late workers home.' },
    caffeine:  { name:'Caffeine',          note:'Deliver 6 people on a coffee run.' },
    severance: { name:'Severance',         note:'Deliver 25 laid-off workers.' },
    // 辦公帶隨機池那四個人物的成就（#49 #50 #52 #53）。
    // 數字要跟 content.js 的判定一致（驗收第 8 組逐條比對中英兩邊）。
    boardroom: { name:'Take the boss up',  note:'Deliver 5 CEOs — the least patient people in the building.' },
    hired:     { name:'You got the job',   note:'Get 3 interviewees there on time.' },
    toner:     { name:'Toner rescue',      note:'Deliver 10 copier engineers, three slots each.' },
    nightshift:{ name:'The night office',  note:'Deliver 24 remote workers, who only ever turn up after dark.' },
    // 飯店帶八個事件的成就（#54 #56 #57 #59 #60 #61 #62 #55）。
    // 數字要跟 content.js 的判定一致——驗收第 8 組會逐條比對中英兩邊的數字。
    groupbooking:{ name:'Whole tour checked in', note:'Take 40 tour guests up to their rooms.' },
    vacated:   { name:'All rooms empty',    note:'Deliver 8 guests down in the checkout rush.' },
    afterparty:{ name:'After the reception',note:'Deliver 16 wedding guests down.' },
    nightdesk: { name:'Night desk',         note:'Take 22 late arrivals up in the small hours.' },
    buffet:    { name:'Breakfast is served',note:'Take 8 guests down to breakfast.' },
    flashbulb: { name:'Flashbulbs',         note:'Take 2 celebrities up, reporters in tow.' },
    conference:{ name:'Delegation seated',  note:'Take 13 conference delegates up to the session.' },
    jammed:    { name:'Trolley through the doors', note:'Take 10 luggage trolleys up — every one of them jams a lift door.' },
    // 飯店帶的四條（#63 #64+#58 #65 #66）。
    // 數字要跟 content.js 的判定一致（驗收第 8 組逐條比對中英兩邊）。
    honeymoon:  { name:'Honeymoon suite',  note:'Get 29 honeymoon couples there together — delivered apart does not count.' },
    trolley:    { name:'Trolley service',  note:'Deliver 10 room-service carts, four slots each.' },
    porter:     { name:'Bags upstairs',    note:'Deliver 36 bellhops — they pay nothing and only lift the rating.' },
    lastcheckin:{ name:'Home at last',     note:'Deliver 29 late-night guests, who only ever turn up in the small hours.' },
    // 住宅帶的五條（#79 #80 #81 #82 #83）。
    // 數字要跟 content.js 的判定一致（驗收第 8 組逐條比對中英兩邊）。
    // walkies 的兩個數字都寫出來，理由跟中文那一列一樣：它數的是人次不是組數。
    bigmove:   { name:'Moving day',        note:'Deliver 10 removals crews — their load takes four slots, so it is nearly a whole empty car.' },
    walkies:   { name:'Walkies',           note:'Deliver 48 dog-walker rides — the owner and the dog each count, so 24 pairs in all.' },
    hotfood:   { name:'Still hot',         note:'Deliver 26 food couriers — the shortest patience on these floors.' },
    lastlight: { name:'Last light',        note:'Deliver 28 late homecomers, who only ever turn up between midnight and 4am.' },
    renovated: { name:'Refurbished',       note:'Deliver 12 renovation crews — three slots of tools every time.' },
    // 住宅帶十個事件的成就（#69–#78）。**門檻的數字要跟中文那一邊一致**，
    // harness 第 8 組會逐條比對。五條跟 #79–#83 共用計數器，見 content.js 的註解。
    // ⚠ 這一區原本還有 `hotfood`（Take 60…）與 `walkies`（Take 40…）兩行，**merge 時
    //   刪掉了**：它們跟上面人物那一支的同名鍵是同一條成就，而且在同一個物件字面量裡
    //   重複的鍵會**蓋掉**上面那兩行（後寫的贏），讓英文的門檻對不上留下來的中文。
    //   留下的是上面 48／26 的那兩行，見 content.js ACHIEVEMENTS 裡的裁決註解。
    earlyshift: { name:'Early shift',      note:'Deliver 90 morning commuters.' },
    welcomehome:{ name:'Welcome home',     note:'Get 80 residents home from work.' },
    boxedup:    { name:'Load by load',     note:'Move 24 loads of furniture, each one filling four slots.' },
    waterrun:   { name:'Bucket brigade',   note:'Take 30 water carriers down.' },
    potluck:    { name:'Everyone eats',    note:'Bring 70 residents to the block party.' },
    toolbelt:   { name:'Tools and all',    note:'Take 20 fitters up, each of them filling three slots.' },
    afterhours: { name:'Only you are running', note:'Get 18 people home between midnight and 3am.' },
    pitchdark:  { name:'Pitch dark',       note:'Take 45 people down during a blackout, on a third of their usual patience.' },
    // 觀景台帶五個人物的成就（#100–#104）。**門檻的數字要跟中文那一邊一致**，
    // harness 第 8 組會逐條比對中英兩邊。
    // saidyes 的兩個數字都寫出來，理由跟中文那一列一樣：它數的是人次不是對數。
    skyline:    { name:'Skyline',          note:'Deliver 82 sightseers — the parties a guide brings up all count.' },
    saidyes:    { name:'She said yes',     note:'Deliver 24 proposal-couple rides — both of them count, so 12 couples who rode the whole way together.' },
    shutterbug: { name:'Tripods upstairs', note:'Deliver 20 photo crews — three slots of kit every time.' },
    groundlevel:{ name:'Ground is better', note:'Take 22 vertigo visitors back down — the shortest patience in the building.' },
    flagfollower:{name:'Follow the flag',  note:'Deliver 6 deck guides — each one arrives with four to six sightseers in tow.' },
    // 觀景台帶的事件（#5，#90–#99）。門檻的數字要跟中文那一列逐字對得上（第 8 組）。
    // ⚠ 英文名字刻意不跟事件的英文名字撞：事件叫 'Golden hour' / 'Drone show'，
    //   成就叫 'Sunset shift' / 'The night of the drones'。兩張表是不同的命名空間，
    //   第 13 組不會紅，但玩家是在同一個畫面上看它們的。
    viewdeck:    { name:'Up the queue',    note:'Deliver 22 people from the deck-queue event up to the observation deck.' },
    goldenhour:  { name:'Sunset shift',    note:'Get 25 people up to the deck during the golden hour.' },
    deckcleared: { name:'Last ones down',  note:'Bring 30 people down from the deck after closing.' },
    thequestion: { name:'He asked',        note:'Deliver 4 proposal riders — two couples, each of them in the same car the whole way.' },
    fieldtrip:   { name:'A coachload',     note:'Take 32 schoolchildren up to the deck at the lowest fare on the board.' },
    firstlight:  { name:'First light',     note:'Get 10 sunrise photographers up there, three slots each.' },
    fogbound:    { name:'After the fog',   note:'Ride out 4 fogs without a single person giving up on the closed floor.' },
    frontrow:    { name:'Best seats',      note:'Deliver 16 people to the deck on fireworks night — one night brings 24 to 36, so catching one is enough.' },
    straightdown:{ name:'Straight back down', note:'Deliver 4 people down from the vertigo event — this lot will not wait for you.' },
    dronenight:  { name:'The night of the drones', note:'Move 6 people to a different deck floor during the drone show.' },
  },

  roofs: {
    chinese: { name:'Chinese' },
    roman:   { name:'Roman' },
    deco:    { name:'Art Deco' },
    gothic:  { name:'Gothic' },
    islamic: { name:'Islamic' },
  },

  events: {
    meeting:  { name:'Session ends',   text:'📣 A session lets out: {n} people leave floor {f} at once' },
    checkin:  { name:'Tour check-in',  text:'🧳 A tour group has landed: {n} people heading up to the hotel' },
    checkout: { name:'Checkout rush',  text:'🧳 Checkout rush: {n} people dragging luggage down' },
    drill:    { name:'Fire drill',     text:'🚨 Fire drill: everyone to the lobby, and nobody is being patient about it' },
    tour:     { name:'Deck queue',     text:'📷 Queue for the deck: {n} people in the lobby want to go up' },
    delivery: { name:'Delivery wave',  text:'📦 Delivery wave: {n} couriers arrive together' },
    party:    { name:'Year-end party', text:'🎉 The office party is over: {n} people leaving floor {f} together' },
    newyear:  { name:'Countdown',      text:'🎆 Countdown: {n} people all want the roof' },
    waxing:   { name:'Floor waxing',   text:'🧴 A cleaning crew of {n} is in the lobby, headed for floor {f}: it shuts for {s}s once they get up there — by lift or by stairs',
                blockText:'🧴 Waxing has started: floor {f} is closed for {s}s — no stopping',
                blockLateText:'🧴 The cleaners gave up on the lift and took the stairs up to floor {f}: closed for {s}s' },
    closetime:{ name:'Closing time',   text:'🔒 Closing time: the shutters come down on floor {f} and {n} people all want to leave' },
    sampling: { name:'Sample stands',  text:'🍢 Sample stands: {n} sellers set out from floor {f}, and they ride straight back once you deliver them' },
    // 零售帶的七個事件（#14 #15 #16 #17 #18 #19 #21）
    anniversary:{ name:'Anniversary sale', text:'🎊 The sale opens: the shutters go up and {n} people surge out of the lobby' },
    launch:   { name:'Launch day',     text:'🛍 Launch day: the queue is let in — {n} people, all of them going to floor {f}' },
    restock:  { name:'Dawn restock',   text:'📦 Dawn restock: {n} trolleys in the lobby, headed for the shops' },
    foodcourt:{ name:'Food court',     text:'🍜 Lunch: {n} people come down from floor {f} together' },
    // 'Moviegoer crowd' 不是 'Last screening' —— 舊名字跟下面 byTenant 那一列的
    // 'Screening ends' 幾乎同一句，而中文那兩列本來是一字不差的「電影散場」。
    // 見 content.js 的 screening 那一列：兩列是兩條不同的路，名字要分得開。
    // 另外舊名字 'Last screening' 對 hours[13,1] 的下午場也不成立。
    screening:{ name:'Moviegoer crowd', text:'🎬 Moviegoer crowd: a showing on floor {f} has just ended and {n} people surge toward the lobby' },
    lostkid:  { name:'Lost child',     text:'🧒 Lost child: a kid on floor {f} is looking for a parent' },
    raffle:   { name:'Prize draw',     text:'🎁 The draw is announced: {n} winners on floor {f} want to get down there fast' },
    // 辦公帶的七個新事件（#41 #43 #44 #45 #46 #47 #40）。
    // meeting / drill 那兩列的英文本來就在上面，這一趟只加了 type:，文案沒動。
    townhall:   { name:'All-hands',      text:'📢 All-hands: {n} people converging on floor {f} from every floor' },
    clientvisit:{ name:'Client visit',   text:'🤝 A client is waiting in the lobby for floor {f}, and they will not wait long' },
    onboarding: { name:'New starters',   text:'🪪 First day: {n} new starters in the lobby, all of them hunting for a pass' },
    outage:     { name:'System outage',  text:'💥 System outage: {n} people on floor {f} give up and head down' },
    overtime:   { name:'Working late',   text:'🌙 Working late: {n} people are still on floor {f}' },
    coffee:     { name:'Coffee run',     text:'☕ Coffee run: {n} people head down from floor {f}' },
    layoff:     { name:'Layoff day',     text:'📄 Layoff day: {n} people leave floor {f} with a box, and none of them will wait' },
    // 飯店帶的六個新事件（#57 #59 #60 #61 #62 #55）。
    // checkin / checkout 那兩列的英文本來就在上面，這一趟只加了 type:，文案沒動。
    wedding:    { name:'Reception ends',  text:'🥂 The reception is over: {n} people come down from floor {f}, and all of them are tired' },
    latearrival:{ name:'Late arrivals',   text:'🌃 Late arrivals: {n} guests reach the lobby in the small hours, headed for their rooms' },
    breakfast:  { name:'Breakfast',       text:'🍳 Breakfast: {n} guests come down from floor {f} to eat' },
    celebrity:  { name:'Celebrity check-in', text:'🎥 A celebrity is in the lobby — and so is the pack of reporters following them' },
    delegation: { name:'Delegation arrives', text:'🎫 A delegation arrives: {n} delegates in the lobby, all of them for floor {f}' },
    cartjam:    { name:'Jammed trolley',  text:'🛎 A bellhop is waiting in the lobby for floor {f} — that trolley will jam a lift door open' },
    // 飯店帶：客房服務（#58）
    roomservice:{ name:'Room service',   text:'🛎 Room service: {n} trolleys wheel out of floor {f}, each one filling most of a car' },
    // 住宅帶的十個事件（#69–#78）。
    // ⚠ movingday 刻意不叫 moving：byTenant 那一列已經占了 `moving` 這個鍵，
    //   同名的話**英文玩家兩個事件會看到同一句話**（#30 party 踩過的坑）。
    // ⚠ 而**分開 id 還不夠**：第一版兩列的 name 都是 'Moving day'，harness 第 13 組
    //   當場紅（「events(en)「Moving day」= movingday 與 moving」）。id 只有我們
    //   看得到，玩家看到的是 name 跟 text。照 cinema／screening 的前例，
    //   byTenant 那一列留著，我這一列改成 'Moving crew'，text 也重寫。
    morningrush: { name:'Morning commute', text:'🌅 Morning commute: {n} residents leave floor {f} for work together' },
    eveninghome: { name:'Evening return',  text:'🌇 Evening return: {n} residents in the lobby, all of them going home' },
    movingday:   { name:'Moving crew',     text:'📦 Moving crew: {n} movers turn up on floor {f}, each one filling most of a car' },
    fooddelivery:{ name:'Delivery rush',   text:'🛵 Delivery rush: {n} riders waiting in the lobby — cold food earns no tip' },
    watercut:    { name:'Water shut off',  text:'🚰 The water is off: {n} residents leave floor {f} carrying buckets' },
    blockparty:  { name:'Block party',     text:'🍲 Block party: {n} residents converging on floor {f}' },
    dogwalk:     { name:'Walking the dog', text:'🐕 Walking the dog: residents on floor {f} are heading down — the dog rides with them, or neither of them boards' },
    renovation:  { name:'Fitting-out crew',text:'🔨 Fitting-out crew: {n} fitters in the lobby with their tools, bound for floor {f}, three slots each' },
    latenight:   { name:'Home in the small hours', text:'🌃 Home in the small hours: {n} people in the lobby — yours is the only lift still running' },
    blackout:    { name:'Blackout',        text:'🔌 The power is out: {n} people push down from floor {f} in the dark, and none of them will wait' },
    // 觀景台帶（#5，#90–#99）。`tour` 的英文在上面，本來就在。
    // ⚠ `proposal` 的文案現在才可以講「兩個人」與「同一台」：#101 的 `proposer`
    //   （pair:true）已經落地，事件補上 `type:` 之後這一句才是真的。中文同理。
    // ⚠ `deckclose` 的英文名字不能叫 'Closing time'——`closetime`（零售帶的打烊清場）
    //   已經占了那個意思，中文那邊也是同一個坑（既有的 `closetime` 中文就叫「打烊清場」，
    //   所以這一列改叫「觀景台清場」）。驗收第 13 組擋的正是這個。
    sunset:      { name:'Golden hour',    text:'🌇 Golden hour: {n} people in the lobby, all of them racing the sunset up to the deck' },
    deckclose:   { name:'Deck closing',   text:'🌃 The deck closes: all {n} of them want to leave floor {f} at once' },
    proposal:    { name:'The proposal',   text:'💍 A proposal: two people in the lobby are heading up to the deck, and they have to ride together' },
    schooltrip:  { name:'School trip',    text:'🎒 School trip: {n} schoolchildren in the lobby bound for the deck, at the lowest fare on the board' },
    sunrisecrew: { name:'Sunrise crew',   text:'📸 Chasing the sunrise: {n} photographers in the lobby with tripods, three slots each' },
    fog:         { name:'Fogged in',      text:'🌫 Fog closes in: floor {f} is a wall of white, and nobody is getting up there for {s} seconds' },
    fireworks:   { name:'Fireworks night',text:'🎆 Fireworks night: {n} people pour out of the lobby for the deck all at once' },
    // ⚠ n:[1,3]，所以 {n} 會是 1。第一版寫 '{n} people … want'，實測跑出
    //   'Vertigo: 1 people on floor 72 … want back down'。這一句刻意不用會隨單複數
    //   變形的名詞與動詞（中文那一行沒有這個問題，所以只有英文要繞）。
    vertigo:     { name:'Vertigo',        text:'😰 Vertigo: {n} on floor {f} took one look over the edge and went straight back to the down button' },
    droneshow:   { name:'Drone show',     text:'🚁 Drone show: {n} people on floor {f} are moving to another deck for a better angle' },
  },
};
