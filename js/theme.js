// theme.js — 兩個美術方向做成可切換的主題。
//   night = 介面像素化、井道維持深色（設計 B）
//   day   = 整個變亮，跟首頁同一個世界（設計 A）
// 介面的顏色走 CSS 變數（style.css 裡的 [data-theme] 區塊），
// canvas 沒有 CSS 變數可用，所以顏色表放在這裡。

const KEY = 'elevator_inc_theme';

function detect(){
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'day' || saved === 'night') return saved;
  } catch(e){}
  return 'night';
}

let theme = detect();
export const getTheme = () => theme;

export function setTheme(t){
  theme = (t === 'day') ? 'day' : 'night';
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(KEY, theme); } catch(e){}
}
export function toggleTheme(){ setTheme(theme === 'night' ? 'day' : 'night'); return theme; }

// ---------------------------------------------------------------- canvas 顏色表
const PALETTES = {
  night: {
    bg:        '#0f1116',
    floorA:    0.50, floorB: 0.40,   // 樓層底色 = 樓層帶顏色乘上這個係數
    stripe:    2.05,                 // 左緣色條：同色相但拉亮
    floorAlpha: 1,   abstractAlpha: 0.55,
    empty:     '30,34,42',           // 空樓層（未招商）
    emptyHatch:'rgba(120,130,150,.16)',
    floorNum:  '#7c8499', floorNumOn: '#7cc4ff',
    divider:   '#59627a', label: '#8d97ae',
    shaft:     '#161a22', shaftEdge: '#2c313d', shaftExpress: '#c08a3a',
    expressTint: 'rgba(240,192,74,.06)',
    car:       '#20242e', carEdge: '#3d4557', carDoors: '#f0c04a',
    door:      '#39404f',
    heatCool:  '#6d7690', heatWarm: '#f0a04a', heatHot: '#e2645a',
    money:     '#5ddc9a', bad: '#e2645a', warn: '#f0a04a',
    personFill:'#333949', personStroke: '#9aa3ba',
    riderFill: '#2b2f3a', riderStroke: '#7f88a0',
    personText:'#cfd6e6', crowdBar: '#7f89a3', riderBar: '#8fa4c8',
    patienceBg:'#2a2f3b',
    sampled:   '#f0c04a',
    motes:     '140,180,230',
    nightTint: '18,22,44', nightMax: 0.55,
  },
  day: {
    bg:        '#dceeff',
    // 亮版的樓層底色是固定的米白交錯（像設計 A 的剖面），
    // 樓層帶不靠整片底色表達，而是左緣那條色條——不然整面會變成濁掉的深綠深藍。
    floorFlat: ['#fff8ea', '#f4ecd9'], floorFlatAbstract: '#efe7d4',
    floorA:    1.62, floorB: 1.42,
    stripe:    1.0,
    floorAlpha: 1,   abstractAlpha: 0.5,
    empty:     '214,206,188',
    emptyHatch:'rgba(22,24,58,.14)',
    floorNum:  '#8a8299', floorNumOn: '#1f6fd0',
    divider:   '#8a93b5', label: '#5c5f8a',
    shaft:     '#c3d2e6', shaftEdge: '#16183a', shaftExpress: '#c08a3a',
    expressTint: 'rgba(240,192,74,.14)',
    car:       '#16183a', carEdge: '#16183a', carDoors: '#ffd23f',
    door:      '#8f9db5',
    heatCool:  '#8a93b5', heatWarm: '#ff9d2e', heatHot: '#e23b3b',
    money:     '#12915f', bad: '#d63b3b', warn: '#d97a06',
    personFill:'#16183a', personStroke: '#16183a',
    riderFill: '#16183a', riderStroke: '#16183a',
    personText:'#16183a', crowdBar: '#5c5f8a', riderBar: '#2f6fd0',
    patienceBg:'#c9c0ab',
    sampled:   '#c08a1a',
    motes:     '40,80,140',
    nightTint: '24,30,70', nightMax: 0.30,
  },
};

export const P = () => PALETTES[theme];

setTheme(theme);
