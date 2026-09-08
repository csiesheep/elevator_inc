# -*- coding: utf-8 -*-
"""landgen.py — 產生 #148 的三個首頁方向設計稿（design/Land*.dc.html）。

**所有顏色、樓層帶、室內小景、小人圖、事件參數都從產品讀**，一個都不用手抄：
  js/sprites.js  → 78 張 7×9 小人（唯讀，只引用）
  js/content.js  → BANDS 的 from/to/color/up/down/wknd、EVENTS 的 n/at/to/hours
  js/theme.js    → DAY 那張色表（樓層乘數、轎廂、井道、墨色）
  js/interior.js → 每一帶的 16×8 家具小景與 GLOW
  js/digits.js   → 3×5 點陣數字
抄一次就會有一天對不上；這支腳本是**產生器**，不是設計稿本身。
"""
import os, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import artlib

JS = lambda n: open(os.path.join(ROOT, 'js', n), encoding='utf-8').read()

# ---------------------------------------------------------------- 從產品讀
PEOPLE = artlib.parse_people()


def parse_bands_full():
    src = JS('content.js')
    seg = src[src.index('export const BANDS'):]
    seg = seg[:seg.index('];')]
    out = []
    pat = re.compile(r"\{\s*key:'(\w+)',\s*from:(\d+),\s*to:(\d+),\s*name:'([^']*)',"
                     r"\s*color:'(#[0-9a-fA-F]{6})',\s*tier:([\d.]+),\s*\n?\s*"
                     r"pop:([\d.]+),\s*up:\[(\d+),\s*(\d+)\],\s*down:\[(\d+),\s*(\d+)\],"
                     r"\s*wknd:([\d.]+)", re.S)
    for m in pat.finditer(seg):
        out.append(dict(key=m.group(1), frm=int(m.group(2)), to=int(m.group(3)),
                        name=m.group(4), color=m.group(5).lower(), tier=float(m.group(6)),
                        pop=float(m.group(7)), up=[int(m.group(8)), int(m.group(9))],
                        down=[int(m.group(10)), int(m.group(11))], wknd=float(m.group(12))))
    assert len(out) == 7, len(out)
    return out


def parse_events():
    src = JS('content.js')
    seg = src[src.index('export const EVENTS'):]
    seg = seg[:seg.index('\n];')]
    out = {}
    for m in re.finditer(r"\{\s*id:'(\w+)',\s*name:'([^']*)',\s*w:(\d+),\s*n:\[(\d+),\s*(\d+)\]"
                         r"[^}]*?at:'(\w+)',\s*to:'(\w+)'[^}]*?hours:\[(\d+),\s*(\d+)\]", seg, re.S):
        out[m.group(1)] = dict(id=m.group(1), name=m.group(2), w=int(m.group(3)),
                               n=[int(m.group(4)), int(m.group(5))],
                               at=m.group(6), to=m.group(7),
                               hours=[int(m.group(8)), int(m.group(9))])
    return out


def parse_motifs():
    src = JS('interior.js')
    seg = src[src.index('export const MOTIFS'):]
    seg = seg[:seg.index('};')]
    out = {}
    for m in re.finditer(r"(\w+):\s*\[(.*?)\]", seg, re.S):
        rows = re.findall(r"'([.#ogw]{16})'", m.group(2))
        assert len(rows) == 8, (m.group(1), len(rows))
        out[m.group(1)] = rows
    glow = dict(re.findall(r"(\w+):'(#[0-9a-fA-F]{6})'",
                           src[src.index('export const GLOW'):src.index('export const GLOW') + 200]))
    return out, glow


def parse_day_pal():
    """回傳 (typed, raw)。

    `raw` 是**原始 token 的字串**（`'#3a4a63'` / `'0.5'`），不是 float。
    這是為了 LAND_SRC 那條 guard：驗收在瀏覽器裡拿同一段 regex 再剖一次，逐字元比。
    float 一過 JSON 兩邊的寫法就會分家（Python `1.0` vs JS `1`），
    所以**跨過 JSON 的那一份永遠是字串**。
    """
    src = JS('theme.js')
    seg = src[src.index('const DAY = {'):]
    seg = seg[:seg.index('\n};')]
    pal, raw = {}, {}
    for m in re.finditer(r"(\w+):\s*'(#[0-9a-fA-F]{6})'", seg):
        pal[m.group(1)] = m.group(2); raw[m.group(1)] = m.group(2)
    for m in re.finditer(r"(\w+):\s*([0-9.]+),", seg):
        if m.group(1) in pal: continue
        pal[m.group(1)] = float(m.group(2)); raw[m.group(1)] = m.group(2)
    return pal, raw


BANDS = parse_bands_full()
EVENTS = parse_events()
MOTIFS, GLOW = parse_motifs()
PAL, PAL_RAW = parse_day_pal()
BAND = {b['key']: b for b in BANDS}


def band_key_of(floor):
    for b in BANDS:
        if b['frm'] <= floor <= b['to']: return b['key']
    raise KeyError(floor)

GLYPH = {
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '###', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '..#', '..#'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
    '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
}
GLYPH_W, GLYPH_H = 3, 5
SPRITE_W, SPRITE_H = 7, 9

sh = artlib.shade_hex


def num_width(text, s):
    n = len(str(text))
    return 0 if n <= 0 else (n * GLYPH_W + (n - 1)) * s


# ---------------------------------------------------------------- SVG 積木
def rects(cells, cs, ox, oy, color):
    """cells: [(c, r, span)] -> <rect>；同一列連續的格子合併，跟 render.js 一樣。"""
    return ''.join('<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>'
                   % (ox + c * cs, oy + r * cs, n * cs, cs, color) for c, r, n in cells)


def grid_runs(rows, ch):
    out = []
    for r, row in enumerate(rows):
        c = 0
        while c < len(row):
            if row[c] != ch:
                c += 1; continue
            n = 1
            while c + n < len(row) and row[c + n] == ch: n += 1
            out.append((c, r, n)); c += n
    return out


def sprite(pid, urgent, cs, x, y, ink, mark=False):
    """一個 7×9 小人。x/y 是左上角。mark=True 時頭上插驚嘆號（跟 drawPerson 一樣）。"""
    p = PEOPLE[pid]
    rows = p['urgent' if urgent else 'normal']
    s = rects(grid_runs(rows, '#'), cs, x, y, ink)
    s += rects(grid_runs(rows, 'o'), cs, x, y, p['acc'])
    if urgent and mark:
        ex, ey = x + SPRITE_W * cs - cs, y - cs * 4
        s += ('<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>'
              '<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>'
              % (ex, ey, cs, cs * 2, PAL['bad'], ex, ey + cs * 3, cs, cs, PAL['bad']))
    return s


def num(text, x, y, s, color, align='left'):
    text = str(text)
    w = num_width(text, s)
    ox = x - w / 2 if align == 'center' else (x - w if align == 'right' else x)
    out = []
    for chx in text:
        g = GLYPH.get(chx)
        if g:
            out.append(rects(grid_runs(g, '#'), s, ox, y, color))
        ox += (GLYPH_W + 1) * s
    return ''.join(out)


def plate(text, cx, top, s, ink, bg, pad=2):
    w = num_width(text, s)
    x, y = round(cx - w / 2) - pad, round(top) - pad
    return ('<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>'
            % (x, y, w + pad * 2, GLYPH_H * s + pad * 2, bg)) + num(text, cx, top, s, ink, 'center')


def motif(key, cs, x, y):
    """一格 16×8 的室內小景（白天：night=0，所以 acc 不混 winLit）。"""
    m = MOTIFS[key]; color = BAND[key]['color']
    furn = sh(color, PAL['furn']); acc = sh(color, PAL['furnAcc'])
    glass = sh(color, PAL['glassK']); glow = GLOW.get(key, PAL['tileOrn'])
    out = rects(grid_runs(m, '#'), cs, x, y, furn)
    out += rects(grid_runs(m, 'o'), cs, x, y, acc)
    out += rects(grid_runs(m, 'g'), cs, x, y, glow)
    out += rects(grid_runs(m, 'w'), cs, x, y, glass)
    return out


def r(x, y, w, h, fill, extra=''):
    return '<rect x="%g" y="%g" width="%g" height="%g" fill="%s"%s/>' % (x, y, w, h, fill, extra)


# ---------------------------------------------------------------- 一層樓
FH = 44                     # 樓層高（遊戲 px）。fh = towerH / floors，5 層的新樓比這還高
CS = 3                      # 小人格子邊長：min(3, floor(fh/11)) 的上限就是 3
DS = 3                      # 樓層號的點陣縮放：numScale(fh) 在 fh>=24 時是 3
QDS = 2                     # 排隊乘客目的地牌：fh>=22 時是 2
FX0, FX1 = 6, 442           # 外牆內側
SHAFT_W = 96                # 兩座井，各 48（**這是為首頁重新排的，不是 layout() 算出來的**）
SHAFT_X = FX1 - SHAFT_W
QSTEP = SPRITE_W * CS + num_width('88', QDS) + 14      # 49
QSTOP = FX0 + 12 + num_width('88', DS) + 2 + 10        # 51


def floor_row(y, floor_no, key, parity, queue=(), blocked=False, req=False):
    """queue: [(pid, dest, urgent)]，由右（電梯門口）往左排，跟 render.js 同方向。"""
    color = BAND[key]['color']
    bh = FH - 1
    out = [r(FX0, y, FX1 - FX0, bh, sh(color, PAL['floorA'] if parity else PAL['floorB']))]
    out.append(r(FX0, y, min(10, max(5, FH * 0.6)), bh, sh(color, PAL['stripe'])))
    x = FX0 + 8 + 6
    while x + 16 * 2 < SHAFT_X - 4:
        out.append(motif(key, 2, x, y + FH - 1 - 8 * 2))
        x += 16 * 2 + 12
    txt = str(floor_no)
    out.append(plate(txt, FX0 + 12 + num_width(txt, DS) / 2, y + (FH - GLYPH_H * DS) / 2, DS,
                     PAL['floorNumOn'] if req else PAL['floorNum'], PAL['numPlate']))
    n = 0
    for pid, dest, urgent in queue:
        px = SHAFT_X - 6 - QSTEP * (n + 1)
        if px < QSTOP: break
        top = y + FH / 2 + 6 - SPRITE_H * CS + 2
        out.append(sprite(pid, urgent, CS, px, top, PAL['bad'] if urgent else PAL['ink'], mark=True))
        d = str(dest)
        out.append(plate(d, px + SPRITE_W * CS + 4 + num_width(d, QDS) / 2,
                         y + (FH - GLYPH_H * QDS) / 2, QDS,
                         PAL['bad'] if urgent else PAL['ink'], PAL['numPlate']))
        ratio = 0.18 if urgent else (0.55 if n % 2 else 0.85)
        bw = 12
        bx = px + SPRITE_W * CS / 2 - bw / 2
        out.append(r(bx, top - 4, bw, 2, PAL['patienceBg']))
        out.append(r(bx, top - 4, bw * ratio, 2,
                     PAL['bad'] if ratio < .25 else (PAL['warn'] if ratio < .6 else PAL['money'])))
        n += 1
    if len(queue) > n:
        out.append(num('+' + str(len(queue) - n), SHAFT_X - 6 - QSTEP * n - 6,
                       y + (FH - GLYPH_H * QDS) / 2, QDS, PAL['crowdBar'], 'right'))
    if blocked:
        out.append(r(FX0, y, SHAFT_X - FX0, bh, PAL['warn'], ' opacity=".26"'))
        out.append('<g clip-path="url(#clipF%d)">' % floor_no)
        sx = FX0 - bh
        while sx < SHAFT_X + bh:
            out.append('<path d="M%g %g L%g %g" stroke="%s" stroke-width="7" opacity=".55"/>'
                       % (sx, y + bh, sx + bh, y, PAL['warn']))
            sx += 21
        out.append('</g>')
        out.append(r(SHAFT_X - 5, y, 5, bh, PAL['warn']))
    return ''.join(out), (
        '<clipPath id="clipF%d"><rect x="%g" y="%g" width="%g" height="%g"/></clipPath>'
        % (floor_no, FX0, y, SHAFT_X - FX0, bh) if blocked else '')


def door_leaves(x, y, w, open_frac=0.0, cls_l='', cls_r=''):
    """兩片門 + 門上的玻璃。B 要把它們接上動畫，所以獨立出來。"""
    carH = FH - 2
    half = (w - 2) / 2; slide = half * open_frac
    gy, gh = y + carH * 0.18, carH * 0.62
    L = (r(x + 1, y, max(0, half - slide), carH, PAL['door'])
         + r(x + 3, gy, max(0, half - slide - 2), gh, PAL['carGlass']))
    R = (r(x + 1 + half + slide, y, max(0, half - slide), carH, PAL['door'])
         + r(x + 1 + half + slide + 1, gy, max(0, half - slide - 2), gh, PAL['carGlass']))
    return ('<g class="%s">%s</g><g class="%s">%s</g>' % (cls_l, L, cls_r, R)) if cls_l else L + R


def car(x, y, w, riders, open_frac=0.0, doors=False, skip_doors=False):
    """轎廂。riders: [pid]；門是先畫的（render.js 的順序），乘客畫在門之後看得見。"""
    carH = FH - 2
    out = [r(x + 1, y, w - 2, carH, PAL['car'])]
    if not skip_doors:
        out.append(door_leaves(x, y, w, open_frac))
    shown = riders[:4]
    if shown:
        slot = (w - 4) / len(shown)
        cs = max(1, min(3, int((slot - 1) // SPRITE_W)))
        for k, pid in enumerate(shown):
            cx = x + 2 + slot * (k + 0.5)
            out.append(sprite(pid, False, cs, cx - SPRITE_W * cs / 2,
                              y + carH / 2 + 6 - SPRITE_H * cs + 2, PAL['inkCar']))
    out.append('<rect x="%g" y="%g" width="%g" height="%g" fill="none" stroke="%s" stroke-width="%g"/>'
               % (x + 1.5, y + .5, w - 3, carH - 1,
                  PAL['carDoors'] if doors else PAL['carEdge'], 2 if doors else 1))
    return ''.join(out)


def shaft_col(x, w, top, bottom):
    return (r(x, top, w, bottom - top, PAL['shaft'])
            + r(x + w - 1, top, 1, bottom - top, PAL['shaftEdge']))


def walls(top, bottom):
    out = [r(0, top, 6, bottom - top, PAL['wall']), r(FX1, top, 6, bottom - top, PAL['wall'])]
    y = top + 3
    while y < bottom - 3:
        out.append(r(2, y, 2, 4, PAL['wallWin']))
        out.append(r(FX1 + 2, y, 2, 4, PAL['wallWin']))
        y += 9
    return ''.join(out)


def roof_chinese(x, w, y, h):
    """屋頂只畫一個示意的中式歇山頂輪廓（顏色取自 roof.js 的 DAY 那一欄）。
    真的實作要呼叫 drawRoof(st.roofStyle)——五種樣式都在存檔裡。"""
    body, shade_, ridge, trim, deep = '#f2c452', '#c9932f', '#9c7020', '#ffe07a', '#cf6250'
    cx = x + w / 2
    out = []
    n = 7
    for i in range(n):
        t = i / (n - 1.0)
        ww = w * (0.30 + 0.70 * t)
        yy = y + h * (0.30 + 0.62 * t)
        hh = max(3, h * 0.11)
        out.append(r(cx - ww / 2, yy, ww, hh, body if i % 2 == 0 else shade_))
    out.append(r(cx - w * 0.17, y + h * 0.16, w * 0.34, max(3, h * 0.14), ridge))
    out.append(r(cx - w * 0.20, y + h * 0.10, w * 0.40, 3, trim))
    out.append(r(cx - 4, y + h * 0.02, 8, h * 0.12, deep))
    out.append(r(x, y + h - 4, w, 4, ridge))
    return ''.join(out)


# ---------------------------------------------------------------- 共用外殼
HEAD = '''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Pixelify+Sans:wght@400;600;700&family=Noto+Sans+TC:wght@400;500;700;900&display=swap">
  <style>
    body { margin: 0; }
    x-dc { display: block; }
    a { color: #7dd8f7; } a:hover { color: #ffd23f; }
    svg { shape-rendering: crispEdges; }
    .px  { font-family: "Press Start 2P", "Courier New", monospace; }
    .pxs { font-family: "Pixelify Sans", "Courier New", monospace; }
    .han { font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif; }
    .k { color: #e8eaf0; font-weight: 700; }
    code { font-family: ui-monospace, monospace; color: #7dd8f7; font-size: .94em; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      border: 4px solid #16183a; box-shadow: 6px 6px 0 #16183a;
    }
    .scan {
      position: absolute; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(180deg, rgba(22,24,58,.05) 0 2px, transparent 2px 4px);
    }
    .beacon { animation: blink 1.6s steps(1) infinite; }
    @keyframes blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: .2; } }
    .cloudA { animation: drift 30s linear infinite; }
    @keyframes drift { from { transform: translateX(0); } to { transform: translateX(1500px); } }
__EXTRA_CSS__
    @media (prefers-reduced-motion: reduce) {
      .beacon, .cloudA__RM_EXTRA { animation: none; }
    }
  </style>
</helmet>
'''

TAIL = '''</x-dc>
</body>
</html>
'''


def doc_head(title, sub, intro):
    return ('''<div style="width: 1810px; background: #0f1116; padding: 26px 30px 34px;
     font-family: 'Noto Sans TC','PingFang TC',sans-serif; color: #e8eaf0;">

  <div style="display: flex; align-items: baseline; gap: 14px; margin-bottom: 6px;">
    <h1 class="pxs" style="margin: 0; font-size: 26px; font-weight: 700; color: #ffd23f;">%s</h1>
    <span style="font-size: 12.5px; color: #8f95d6;">%s</span>
  </div>
  <p style="margin: 0 0 20px; font-size: 12.5px; line-height: 1.85; color: #8f95d6; max-width: 92em;">%s</p>
''' % (title, sub, intro))


def note_block(motive, cost, rows):
    tr = ''.join(
        '<tr><td style="padding: 7px 14px 7px 0; color: #8f95d6; white-space: nowrap; '
        'border-bottom: 1px solid #23263a; vertical-align: top;">%s</td>'
        '<td style="padding: 7px 0; border-bottom: 1px solid #23263a; line-height: 1.8;">%s</td></tr>'
        % (a, b) for a, b in rows)
    return ('''
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 26px;">
    <div style="border-left: 5px solid #5ddc9a; padding: 4px 0 4px 14px;">
      <div class="pxs" style="font-size: 13px; color: #5ddc9a; letter-spacing: .08em; margin-bottom: 5px;">動機</div>
      <p style="margin: 0; font-size: 13px; line-height: 1.9;">%s</p>
    </div>
    <div style="border-left: 5px solid #e2645a; padding: 4px 0 4px 14px;">
      <div class="pxs" style="font-size: 13px; color: #e2645a; letter-spacing: .08em; margin-bottom: 5px;">主要缺點</div>
      <p style="margin: 0; font-size: 13px; line-height: 1.9;">%s</p>
    </div>
  </div>

  <table style="width: 100%%; border-collapse: collapse; margin-top: 22px; font-size: 12.5px;">%s</table>
''' % (motive, cost, tr))


def sky_bg(w, h, ground_y):
    """首頁既有的天空色帶 + 地面。色值逐字取自 index.html 與 landing.css。"""
    bands = [('#bff0ff', .125), ('#a5e8ff', .112), ('#8adcfb', .112), ('#6fd0f7', .105)]
    out = [r(0, 0, w, h, '#5bc6f2')]
    y = 0
    for c, f in bands:
        out.append(r(0, y, w, h * f, c)); y += h * f
    out.append(r(0, ground_y, w, h - ground_y, '#3ad39a'))
    out.append(r(0, ground_y, w, 10, '#2ab887'))
    return ''.join(out)


SUN = ('<svg width="%d" height="%d" viewBox="0 0 27 27" style="position:absolute;left:%dpx;top:%dpx;">'
       '<rect x="7" y="4" width="13" height="19" fill="#ffd23f"/>'
       '<rect x="4" y="7" width="19" height="13" fill="#ffd23f"/>'
       '<rect x="10" y="2" width="7" height="2" fill="#ffd23f"/>'
       '<rect x="10" y="23" width="7" height="2" fill="#ffd23f"/>'
       '<rect x="2" y="10" width="2" height="7" fill="#ffd23f"/>'
       '<rect x="23" y="10" width="2" height="7" fill="#ffd23f"/>'
       '<rect x="7" y="7" width="5" height="2" fill="#fff2b0"/>'
       '<rect x="7" y="9" width="2" height="5" fill="#fff2b0"/></svg>')

CLOUD = ('<svg class="cloudA" width="%d" height="%d" viewBox="0 0 28 10" '
         'style="position:absolute;left:%dpx;top:%dpx;">'
         '<rect x="6" y="2" width="14" height="3" fill="#ffffff"/>'
         '<rect x="3" y="5" width="22" height="3" fill="#ffffff"/>'
         '<rect x="9" y="0" width="8" height="2" fill="#ffffff"/>'
         '<rect x="3" y="8" width="19" height="2" fill="#d8f2ff"/></svg>')

CITY_L = ('<svg width="%d" height="%d" viewBox="0 0 55 32" style="position:absolute;left:0;top:%dpx;">'
          '<rect x="0" y="14" width="13" height="18" fill="#4f9fc4"/>'
          '<rect x="15" y="8" width="10" height="24" fill="#5aa9c9"/>'
          '<rect x="27" y="18" width="14" height="14" fill="#4f9fc4"/>'
          '<rect x="43" y="12" width="9" height="20" fill="#5aa9c9"/>'
          '<rect x="3" y="18" width="2" height="2" fill="#bfe9f7"/><rect x="8" y="18" width="2" height="2" fill="#bfe9f7"/>'
          '<rect x="18" y="12" width="2" height="2" fill="#bfe9f7"/><rect x="18" y="18" width="2" height="2" fill="#bfe9f7"/>'
          '<rect x="31" y="22" width="2" height="2" fill="#bfe9f7"/><rect x="46" y="16" width="2" height="2" fill="#bfe9f7"/></svg>')

CITY_R = ('<svg width="%d" height="%d" viewBox="0 0 55 32" style="position:absolute;right:0;top:%dpx;">'
          '<rect x="3" y="12" width="9" height="20" fill="#5aa9c9"/>'
          '<rect x="14" y="18" width="14" height="14" fill="#4f9fc4"/>'
          '<rect x="30" y="6" width="10" height="26" fill="#5aa9c9"/>'
          '<rect x="42" y="16" width="13" height="16" fill="#4f9fc4"/>'
          '<rect x="6" y="16" width="2" height="2" fill="#bfe9f7"/><rect x="18" y="22" width="2" height="2" fill="#bfe9f7"/>'
          '<rect x="33" y="10" width="2" height="2" fill="#bfe9f7"/><rect x="33" y="16" width="2" height="2" fill="#bfe9f7"/>'
          '<rect x="46" y="20" width="2" height="2" fill="#bfe9f7"/></svg>')

TAGLINE = '你經營一棟不斷長高的大樓的垂直運輸，而大樓越高，你越忙不過來。'


def menu(scale=1.0, wordmark_size=34, tag_size=18, gap=14, width=620, cols=None):
    s = lambda v: round(v * scale)
    cols = cols if cols else (3 if scale >= 1 else 2)
    span = '' if cols >= 3 else ' grid-column: 1 / -1;'
    return ('''
    <h1 class="px" style="margin: 0; text-align: center; font-size: %dpx; line-height: 1.34;
        color: #16183a; text-shadow: %dpx %dpx 0 #ffd23f;">ELEVATOR INC.</h1>
    <p class="han" style="margin: 0; text-align: center; font-size: %dpx; line-height: 1.7;
       font-weight: 500; color: #16183a; max-width: 720px;">%s</p>
    <div class="pxs" style="display: flex; align-items: center; gap: 9px; padding: 7px 14px;
         background: #16183a; color: #ffe9a8; font-size: %dpx; font-weight: 600; letter-spacing: .06em;">
      <span style="width: 8px; height: 8px; background: #3ad39a; display: block;"></span>50 樓 · 送達 120 人次 · ★3.0</div>
    <div style="display: flex; flex-direction: column; gap: %dpx; width: 100%%; max-width: %dpx; margin-top: 2px;">
      <div class="btn" style="background: #ff5c5c; padding: %dpx 24px;">
        <span class="han" style="font-size: %dpx; font-weight: 900; color: #fff; letter-spacing: .04em;">繼續遊戲</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(%d, minmax(0, 1fr)); gap: %dpx;">
        <div class="btn" style="background: #fff8ea; padding: %dpx 12px;"><span class="han" style="font-size: %dpx; font-weight: 700; color: #16183a;">玩法說明</span></div>
        <div class="btn" style="background: #fff8ea; padding: %dpx 12px;"><span class="han" style="font-size: %dpx; font-weight: 700; color: #16183a;">帳本</span></div>
        <div class="btn" style="background: #7dd8f7; padding: %dpx 12px;%s"><span class="han" style="font-size: %dpx; font-weight: 700; color: #16183a;">更多遊戲</span></div>
      </div>
    </div>
    <div class="pxs" style="display: flex; gap: 9px; font-size: 13px; color: #16183a; opacity: .72;">
      <span>GitHub</span><span>·</span><span>games.csiesheep.com</span>
    </div>''' % (wordmark_size, s(5), s(5), tag_size, TAGLINE, s(15), gap, width,
                 s(16), round(22 * scale), cols, gap,
                 s(13), round(17 * scale), s(13), round(17 * scale), s(13), span, round(17 * scale)))


# ---------------------------------------------------------------- 桌機外殼（兩欄）
# **這是一個版面決定，不只是換插圖**：今天 .tower 被 min(clamp(150,21vw,232), 26vh) 夾住，
# 1280×860 的視窗裡只有 224px 高。要讓 7×9 的小人在剖面裡讀得出來，樓至少要 ~580px。
# 單欄（樓在上、選單在下）裝不下，所以桌機改成「視覺在左、字與按鈕在右」，
# 手機維持今天的單欄堆疊。
def desktop_frame(visual_html, visual_w, text_w, horizon=712, badge=None):
    W, H = 1280, 860
    lx = 34
    tx = lx + visual_w + 40
    text_w = min(text_w, W - tx - 34)
    d = ['<div style="position: relative; flex: none; width: %dpx; height: %dpx; overflow: hidden; background: #5bc6f2;">' % (W, H)]
    d.append('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="position: absolute; inset: 0;">%s</svg>'
             % (W, H, W, H, sky_bg(W, H, horizon)))
    d.append(SUN % (92, 92, 44, 44))
    d.append(CLOUD % (150, 54, -180, 96))
    d.append(CITY_R % (260, 152, horizon - 152))
    d.append('<div style="position: absolute; left: %dpx; bottom: %dpx;">%s</div>'
             % (lx, H - horizon - 6, visual_html))
    if badge:
        d.append(badge)
    d.append('<div style="position: absolute; left: %dpx; top: 0; width: %dpx; height: %dpx; '
             'display: flex; flex-direction: column; justify-content: center; align-items: center; '
             'gap: 15px;">%s</div>'
             % (tx, text_w, H, menu(wordmark_size=30 if text_w >= 460 else 26,
                                    tag_size=17 if text_w >= 460 else 15,
                                    gap=13, width=text_w, cols=3)))
    d.append('<div class="pxs btn" style="position: absolute; right: 26px; top: 24px; background: #fff8ea; '
             'padding: 10px 16px; font-size: 15px; font-weight: 700; color: #16183a; letter-spacing: .1em;">EN</div>')
    d.append('<div class="scan"></div></div>')
    return ''.join(d)


def phone_frame(visual_html, ph_h=452):
    PW, PH = 390, 844
    p = ['<div style="position: relative; flex: none; width: %dpx; height: %dpx; overflow: hidden; background: #5bc6f2;">' % (PW, PH)]
    p.append('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="position: absolute; inset: 0;">%s</svg>'
             % (PW, PH, PW, PH, sky_bg(PW, PH, ph_h)))
    p.append(SUN % (60, 60, 20, 40))
    p.append(CLOUD % (104, 38, -120, 90))
    p.append(visual_html)
    p.append('<div style="position: absolute; left: 0; right: 0; bottom: 18px; display: flex; '
             'flex-direction: column; align-items: center; gap: 10px; padding: 0 18px;">%s</div>'
             % menu(scale=0.8, wordmark_size=22, tag_size=14, gap=10, width=354, cols=2))
    p.append('<div class="pxs btn" style="position: absolute; right: 14px; top: 16px; background: #fff8ea; '
             'padding: 8px 12px; font-size: 13px; font-weight: 700; color: #16183a; letter-spacing: .1em; '
             'border-width: 3px; box-shadow: 4px 4px 0 #16183a;">EN</div>')
    p.append('<div class="scan"></div></div>')
    return ''.join(p)


# ================================================================ 方向一：剖面
# 一列 = 一個樓層帶的代表樓層；帶與帶之間是**斷開的比例尺**（樓板色的缺口），
# 樓層號是真的（4 / 14 / 32 / 58 / 79 / 93 / 100），不是編出來的。
CUT = 14
ROOF_H = 56

A_ROWS = [
    # (樓層號, 帶, 隊伍[(圖, 目的地, urgent)], 總人數, 事件)
    (100, 'roof',  [('towerctl', 1, False), ('cableeng', 1, False), ('astronaut', 1, False)], 3,
     'boarding 軌道班機登機 · 大廳→屋頂 · 16–24 人'),
    (94,  'exp',   [('leaker', 1, True), ('hazmat', 1, False)], 12,
     '封鎖中的樓層：斜紋 + 門口擋條 + 倒數條（sim.blocked 的畫法）'),
    (93,  'exp',   [('scientist', 97, False), ('runner', 97, False), ('keeper', 97, True)], 6,
     'handover 夜班交接 · 實驗→實驗 · 22–24 點 · 4–7 人'),
    (79,  'obs',   [('observer', 1, False), ('acrophobe', 1, True), ('proposer', 1, False),
                    ('photocrew', 1, False), ('student', 1, False), ('deckguide', 1, False),
                    ('observer', 1, False)], 25,
     'deckclose 觀景台清場 · 觀景→大廳 · 22–24 點 · 18–28 人'),
    (58,  'resid', [('resident', 1, False), ('dogwalker', 1, False), ('mover', 1, False)], 16,
     'morningrush 早晨通勤 · 住宅→大廳 · 7–9 點 · 12–20 人'),
    (32,  'hotel', [('guest', 1, False), ('jamcart', 1, False), ('bellhop', 1, False),
                    ('celeb', 1, True)], 9,
     'checkout 退房潮 · 飯店→大廳 · 7–12 點 · 6–12 人'),
    (14,  'office', [('office', 18, False), ('ceo', 18, True), ('newhire', 18, False),
                     ('coffeegoer', 6, False), ('interviewee', 18, False), ('office', 18, False)], 21,
     'townhall 全員大會 · 辦公→辦公 · 9–11 點 · 14–24 人'),
    (4,   'retail', [('loaded', 1, False), ('diner', 1, False), ('stroller', 1, False),
                     ('child', 1, False)], 13,
     'foodcourt 美食街午餐 · 零售→大廳 · 11–14 點 · 10–18 人'),
    (1,   'retail', [('tourist', 6, False), ('courier', 6, False), ('cat', 6, False)], 5,
     'anniversary 週年慶開門 · 大廳→零售 · 10–12 點 · 14–24 人'),
]


def build_cutaway(blocked_floor=94, car_a=(14, True), car_b=(79, False)):
    """回傳 (svg 內容, 總高, {樓層號: y})。y=0 是屋頂頂端。"""
    body, defs, ys = [], [], {}
    y = ROOF_H
    for i, (fno, key, q, total, _ev) in enumerate(A_ROWS):
        ys[fno] = y
        y += FH + (CUT if i < len(A_ROWS) - 1 and A_ROWS[i + 1][0] != fno - 1 else 0)
    total_h = y + 6
    top, bottom = ROOF_H, y
    body.append(r(FX0, top, FX1 - FX0, bottom - top, PAL['slab']))
    for i, (fno, key, q, total, _ev) in enumerate(A_ROWS):
        queue = list(q) + [('office', 1, False)] * max(0, total - len(q))
        s, d = floor_row(ys[fno], fno, key, i % 2 == 0, queue, blocked=(fno == blocked_floor))
        body.append(s); defs.append(d)
        if i < len(A_ROWS) - 1 and A_ROWS[i + 1][0] != fno - 1:   # 斷開比例尺的缺口
            gy = ys[fno] + FH
            body.append(r(FX0, gy - 1, FX1 - FX0, CUT + 1, PAL['slab']))
            for dx in range(int(FX0) + 8, int(SHAFT_X) - 6, 12):
                body.append(r(dx, gy + CUT / 2 - 1, 6, 2, PAL['crowdBar'], ' opacity=".55"'))
    # 井道畫在樓層**之後**——render.js 就是這個順序（樓層先鋪滿 fx0..fx1，井道蓋上去）
    for x in (SHAFT_X, SHAFT_X + 48):
        body.append(shaft_col(x, 48, top, bottom))
    for (fno, doors), sx in ((car_a, SHAFT_X), (car_b, SHAFT_X + 48)):
        riders = ['office', 'tourist'] if doors else ['observer', 'photocrew']
        body.append(car(sx, ys[fno] + 1, 48, riders, 1.0 if doors else 0.0, doors))
    body.append(walls(top, bottom))
    body.append(roof_chinese(0, 448, 0, ROOF_H))
    body.append(r(0, bottom, 448, 6, '#16183a', ' opacity=".22"'))
    return '<defs>' + ''.join(defs) + '</defs>' + ''.join(body), total_h, ys


SKIP_GUTTER = {1, 94}          # 1F 併進零售那一列；94F 是 93F 同一帶的第二層（封鎖示範）


def band_gutter(ys, total_h):
    """右側的說明欄：帶名、樓層範圍、真正的上下行時段、週末乘數。全部取自 BANDS。"""
    out = []
    for fno, key, _q, _t, ev in A_ROWS:
        if fno in SKIP_GUTTER: continue
        b = BAND[key]
        rng = '%d–%dF' % (b['frm'], b['to']) if b['to'] < 9000 else '%dF+' % b['frm']
        hours = '上行 %d–%d 點 · 下行 %d–%d 點' % (b['up'][0], b['up'][1], b['down'][0], b['down'][1])
        out.append(
            '<div style="position: absolute; left: 0; top: %gpx; display: flex; gap: 10px; align-items: flex-start;">'
            '<span style="width: 8px; height: 40px; background: %s; display: block; flex: none;"></span>'
            '<div><div style="font-size: 15px; font-weight: 900; color: #16183a; line-height: 1.2;">%s'
            '<span class="pxs" style="font-size: 13px; font-weight: 700; color: #16183a; opacity: .62; margin-left: 8px;">%s</span></div>'
            '<div class="pxs" style="font-size: 12.5px; color: #16183a; opacity: .74; margin-top: 3px; letter-spacing: .02em;">%s · 週末 ×%s</div>'
            '<div style="font-size: 11.5px; color: #16183a; opacity: .58; margin-top: 2px;">%s</div></div></div>'
            % (ys[fno] - 3, sh(b['color'], PAL['stripe']), b['name'], rng, hours,
               ('%g' % b['wknd']), ev))
    return ''.join(out)


A_INTRO = ('現在首頁那棟樓是 <code>index.html</code> 裡一段手畫的 SVG，跟遊戲沒有一個共用的位元組。'
           '這個方向把它換成<span class="k">一張真的剖面圖</span>：樓層底色是 '
           '<code>shade(band.color, floorA/floorB)</code>、家具是 <code>interior.js</code> 的 16×8 小景、'
           '小人是 <code>sprites.js</code> 的 7×9 原圖、樓層號是 <code>digits.js</code> 的 3×5 點陣字。'
           '<span class="k">一格都沒有重畫。</span>'
           '七個帶各出一層代表樓層，帶與帶之間用<span class="k">斷開的比例尺</span>（樓板色的缺口）接起來，'
           '所以 100 層樓裝得進 500px，而樓層號還是真的。'
           '完全靜態：只有燈塔在閃，跟今天一樣。')

A_MOTIVE = ('<span class="k">它把兩個賣點同時畫出來，而且不需要你等。</span>'
            '「調度」是構圖講的：兩座井、一台開著門在 14 樓吃掉全員大會的隊伍、'
            '一台空車正要上 79 樓的清場——你看得到「有兩台車、有人在排隊、有人快沒耐性」，'
            '那就是調度問題本身。「樓越高人越不一樣」是七列並排講的：'
            '七種底色、七套家具、七群不同的人，一眼掃完。'
            '它也是 B 與 C 的 <code>prefers-reduced-motion</code> 退路，所以這份工不會白做。')

A_COST = ('<span class="k">「動起來很好玩」這件事完全沒有被表達。</span>'
          '遊戲真正的樂趣是「車在跑、耐性條在掉、你在決定先接誰」，'
          '一張靜止的圖只能講「這裡有很多人在等」，講不了「你來不及」。'
          '第二個代價是<span class="k">密度</span>：右側說明欄有七列文字，'
          '桌機讀得完，手機讀不完——所以手機版整欄收掉（跟現在兩側城市的作法一樣），'
          '而手機正是大多數人第一次看到這一頁的地方。')


def page_a():
    svg, th, ys = build_cutaway()
    tower = ('<svg width="448" height="%d" viewBox="0 0 448 %d" style="display: block;">%s</svg>'
             % (th, th, svg))
    gut_w = 296
    visual = ('<div style="display: flex; gap: 20px; align-items: flex-start;">'
              '<div>%s</div>'
              '<div style="position: relative; width: %dpx; height: %dpx;">%s</div></div>'
              % (tower, gut_w, th, band_gutter(ys, th)))
    d = desktop_frame(visual, 448 + 20 + gut_w, 400)

    k = 0.60
    ph_h = 470
    ph_vis = ('<div style="position: absolute; left: %gpx; top: %gpx; width: %gpx; height: %gpx;">'
              '<div style="transform: scale(%g); transform-origin: 0 0;">%s</div></div>'
              % ((390 - 448 * k) / 2, ph_h - th * k, 448 * k, th * k, k, tower))
    p = phone_frame(ph_vis, ph_h)

    rows = [
        ('資料來源', '樓層底色 <code>shade(BANDS[i].color, DAY.floorA/floorB)</code>；'
                     '家具 <code>MOTIFS[key]</code>（16×8，cs=2）；小人 <code>PEOPLE[id]</code>（7×9，cs=3）；'
                     '樓層號 <code>digits.js</code> 的 3×5 字（ds=3）；隊伍方向、+N 溢位、耐性條、'
                     '驚嘆號都照 <code>render.js</code> 的規則。'),
        ('圖上的事件', '14F <code>townhall</code>（辦公→辦公，9–11 點，14–24 人）· '
                       '79F <code>deckclose</code>（觀景→大廳，22–24 點，18–28 人）· '
                       '93F 封鎖中的斜紋（<code>sim.blocked</code> 的畫法，'
                       '<code>#f0a04a</code> 26% 染色 + 門口擋條）。三個都是真的表上的東西。'),
        ('比例尺是斷的', '樓層號 100 / 93 / 79 / 58 / 32 / 14 / 4 / 1 是真的，'
                         '中間的缺口用樓板色 <code>#2a3142</code> + 一排點表示「這裡省略了」。'
                         '不做這件事的話 100 層在 500px 裡每層 5px，什麼都畫不下。'),
        ('版面不是 layout()', '井道寬 2×48 是為首頁重排的；<code>render.js</code> 的 <code>layout()</code> '
                              '在自動期只給兩座井 70px（每台 35px，車裡的人會掉到 cs=1）。'
                              '**這是刻意的偏離**，理由是首頁要在三秒內讀懂，'
                              '<code>layout()</code> 是為了讓你玩得動。C 沒有這個自由。'),
        ('手機 390px', '右側說明欄整欄不出現（跟 <code>.city</code> 在 &lt;700px 收起來同一招）；'
                       '標題與按鈕的尺寸完全沿用現有的 clamp。'
                       '<span class="k">這一格是用 scale(0.60) 縮的，而那是錯的做法</span>：'
                       '3×5 的樓層號縮完之後每一個點是 1.8px，落在半格上，'
                       '<code>shape-rendering: crispEdges</code> 救不回來——螢幕上會糊。'
                       '真的實作要<span class="k">換整數格子重畫</span>（FH 44→30、'
                       '小人 cs 3→2、樓層號 ds 3→2），而不是縮放。'
                       '換完之後手機看得到的是<span class="k">七種顏色、七群人的剪影</span>，'
                       '樓層號還讀得到，但家具會掉到只剩窗格節奏。'),
        ('要新文案嗎', '需要一句：「七個樓層帶 · 七種人潮 · 七個尖峰」。'
                       '英文草稿 “Seven bands. Seven crowds. Seven rush hours.”。'
                       '這是 <span class="k">writer 的地盤</span>，我沒有動 '
                       '<code>js/i18n.js</code>；要用就開一個新的 i18n key。'),
    ]
    return (doc_head('方向 A ── 剖面', '靜態、資訊密、離遊戲最遠', A_INTRO)
            + '<div style="display: flex; gap: 40px; align-items: flex-start;">'
            + d + p + '</div>'
            + note_block(A_MOTIVE, A_COST, rows) + '</div>')


# ================================================================ 方向二：一趟到頂
#
# ⚠⚠ **節拍表 B_BEATS 是這一段唯一手寫的東西，而且它只寫得下「節奏」。**
#     哪一秒停、停多久、時鐘牌上的分鐘——這三樣資料裡沒有，是編排。
#     **其他每一個字都是從 EVENTS 那一列讀出來的**：事件名、起訖、時段、人數，
#     連隊伍多長都是 (n0+n1)//2。所以 BE 改了 `townhall.hours`，這裡跟著變，
#     committed 的產物就跟活的資料對不上 —— 那就是 #152 要的那把鎖。
#
B_ALL_GROUPS = [
    ('roof',   [100]),
    ('exp',    [93, 92]),
    ('obs',    [81, 80, 79, 78]),
    ('resid',  [59, 58, 57]),
    ('hotel',  [32, 31, 30]),
    ('office', [15, 14, 13, 12, 11]),
    ('retail', [4, 3, 2, 1]),
]
B_QUEUES = {
    1:  [('tourist', 13, False), ('courier', 13, False), ('office', 13, False)],
    13: [('office', 15, False), ('ceo', 15, True), ('newhire', 15, False),
         ('interviewee', 15, False), ('coffeegoer', 4, False), ('office', 15, False)],
    14: [('office', 1, False), ('attendee', 1, False)],
    12: [('remote', 1, False), ('office', 1, False)],
    79: [('observer', 1, False), ('acrophobe', 1, True), ('proposer', 1, False),
         ('photocrew', 1, False), ('student', 1, False), ('deckguide', 1, False)],
    80: [('observer', 1, False), ('student', 1, False)],
    100: [('towerctl', 1, False), ('astronaut', 1, False), ('cableeng', 1, False)],
    93: [('nightlab', 93, False), ('keeper', 93, True), ('nightlab', 93, False),
         ('scientist', 93, False)],
    30: [('guest', 1, False), ('jamcart', 1, False)],
    57: [('resident', 1, False), ('dogwalker', 1, False)],
    92: [('scientist', 93, False), ('hazmat', 93, False)],
}
CUT_RIDE = 120              # 直達段的高度：相機要走得夠遠，一趟到頂才像一趟
VW, VH = 448, 420
# 字幕帶的高度（.rideCap + 邊距）。**相機的下界要留這麼多。**
# 不留的話：第一站停在 1 樓，而 1 樓已經是圖的最底一列，
# 相機卡在底→**大廳整列精好藏在它自己的字幕背後**（兩欄模式下我看到的）。
# 改了這個數字要跟 `css/landing.css` 的 `.rideCap` 一起改。
CAP_FOOT = 62

# 18 秒一圈。**一列 = 一站**：
#   t0 / t1  相機停在這一站的區間（秒）——編排
#   floor    停在哪一層——編排
#   minute   時鐘牌上的分鐘——編排（**小時從事件的 hours[0] 生出來，不手寫**）
#   ev       EVENTS 的 id —— 名字、起訖、時段、人數全部從那一列讀
#
# ⚠ **最後一列在等 owner 裁決（#152）**：現在停在 93 樓實驗樓層的夜班交接。
#   裁決如果是「相機要帶到 100 樓」，把最後一列換成
#   `(15.2, 18.0, 100, 30, 'boarding')` 再跑一次 landgen.py ——
#   **改一列，樓層、相機關鍵影格、字幕全部自動跟上。**
B_BEATS = [
    (0.0,  2.2,    1,  5, 'anniversary'),
    (4.4,  7.6,   13,  5, 'townhall'),
    (10.0, 13.2,  79, 40, 'deckclose'),
    (15.2, 18.0,  93, 10, 'handover'),
]
LOOP = 18.0

# 轎廂裡的乘客。兩台車、反向跑——「先接誰」就是這個遊戲的問題本身。
RIDER_UP = ['office', 'tourist']
RIDER_DOWN = ['guest', 'observer']

# 相機到得了的最高樓 = 節拍表的最高一站。**不是另外一個常數**——
# 兩個常數會分家，然後某一天相機停在一層沒有畫出來的樓。
B_TOP = max(b[2] for b in B_BEATS)
B_GROUPS = [(k, [f for f in fl if f <= B_TOP]) for k, fl in B_ALL_GROUPS]
B_GROUPS = [g for g in B_GROUPS if g[1]]

# EVENTS 的 at/to 用 'lobby'，那不是 BANDS 的 key，所以要一張小對照表。
ZH_PLACE = {'lobby': '大廳'}


def place_zh(key):
    return ZH_PLACE.get(key) or BAND[key]['name']


def beat_rows():
    """把節拍表展開成完整的一站。**除了 t0/t1/floor/minute，每個欄位都來自 EVENTS。**"""
    out = []
    for i, (t0, t1, fl, mi, eid) in enumerate(B_BEATS):
        ev = EVENTS[eid]
        out.append(dict(
            i=i, t0=t0, t1=t1, floor=fl, minute=mi,
            # 1 樓是大廳，不是「零售 1 樓」——事件那一列自己也是這樣寫的（at:'lobby'）。
            place=('lobby' if fl == 1 else band_key_of(fl)),
            band=band_key_of(fl),
            clock='%02d:%02d' % (ev['hours'][0], mi),
            ev=dict(id=ev['id'], name=ev['name'], n=ev['n'],
                    at=ev['at'], to=ev['to'], hours=ev['hours']),
            # 隊伍多長也是資料：事件人數區間的中位數，不是我挑的。
            total=(ev['n'][0] + ev['n'][1]) // 2,
        ))
    return out


B_ROWS = beat_rows()
B_TOTALS = {b['floor']: b['total'] for b in B_ROWS}


def beat_zh(b):
    """設計稿上那一行中文字幕。**逐字由 EVENTS 生出來，寫不出跟資料矛盾的句子。**"""
    ev = b['ev']
    hrs = ('任何時段' if ev['hours'] == [0, 24]
           else '%d–%d 點' % (ev['hours'][0], ev['hours'][1]))
    return ('%s %s · %s→%s · %s · %d–%d 人'
            % (ev['id'], ev['name'], place_zh(ev['at']), place_zh(ev['to']),
               hrs, ev['n'][0], ev['n'][1]))


def beat_place_zh(b):
    return '%s %d 樓' % (place_zh(b['place']), b['floor'])


def build_ride():
    ys, y = {}, ROOF_H
    for gi, (key, fl) in enumerate(B_GROUPS):
        for f in fl:
            ys[f] = y; y += FH
        if gi < len(B_GROUPS) - 1: y += CUT_RIDE
    total = y + 6
    body, defs = [], []
    body.append(r(FX0, ROOF_H, FX1 - FX0, y - ROOF_H, PAL['slab']))
    parity = 0
    for gi, (key, fl) in enumerate(B_GROUPS):
        for f in fl:
            q = list(B_QUEUES.get(f, []))
            tot = B_TOTALS.get(f, len(q))
            q = q + [('office', 1, False)] * max(0, tot - len(q))
            s, d = floor_row(ys[f], f, key, parity % 2 == 0, q)
            body.append(s); defs.append(d); parity += 1
        if gi < len(B_GROUPS) - 1:
            # 直達段：電梯真的會這樣跑（中間那些樓不停）。省略幾層就寫幾層。
            gy = ys[fl[-1]] + FH
            skipped = fl[-1] - B_GROUPS[gi + 1][1][0] - 1
            body.append(r(FX0, gy - 1, FX1 - FX0, CUT_RIDE + 1, PAL['slab']))
            for dy in range(int(gy) + 10, int(gy + CUT_RIDE) - 8, 16):
                body.append(r(FX0 + 3, dy, 4, 8, PAL['crowdBar'], ' opacity=".30"'))
            body.append(num(str(skipped), (FX0 + SHAFT_X) / 2, gy + CUT_RIDE / 2 - 10, 3,
                            PAL['crowdBar'], 'center'))
            body.append(r((FX0 + SHAFT_X) / 2 - 30, gy + CUT_RIDE / 2 + 12, 60, 2,
                          PAL['crowdBar'], ' opacity=".45"'))
    for x in (SHAFT_X, SHAFT_X + 48):
        body.append(shaft_col(x, 48, ROOF_H, y))
    body.append(walls(ROOF_H, y))
    body.append(roof_chinese(0, 448, 0, ROOF_H))
    return '<defs>' + ''.join(defs) + '</defs>' + ''.join(body), total, ys


def dedupe(frames):
    seen, out = set(), []
    for k, v in frames:
        if k in seen: continue
        seen.add(k); out.append((k, v))
    return out


def kf(name, frames):
    return '    @keyframes %s {\n%s    }\n' % (
        name, ''.join('      %s { %s }\n' % (k, v) for k, v in frames))


def build_b_css(ys, total, prefix=''):
    """相機、轎廂、車門、字幕的關鍵影格 -- 全部由 B_ROWS 與 ys 算出來，不手寫百分比。

    prefix 給產品用（`ride-`），免得首頁的 keyframes 撞到別人的 `camera` / `doorL`。
    回傳 (css, t=0 的相機位移)——後者是 reduced-motion 那一格的定格位置。
    """
    BB = [(b['t0'], b['t1'], b['floor']) for b in B_ROWS]
    nm = lambda n: prefix + n
    def pct(t): return '%.4g%%' % (t / LOOP * 100)
    def cam_y(f): return max(-(total - VH + CAP_FOOT), min(0, VH / 2 - ys[f] - FH / 2))

    frames, prev = [], None
    for i, (t0, t1, f) in enumerate(BB):
        v = 'transform: translateY(%.1fpx);' % cam_y(f)
        if prev is not None and prev != t0:
            frames.append((pct(prev), 'transform: translateY(%.1fpx);' % cam_y(BB[i - 1][2])))
        frames.append((pct(t0), v)); frames.append((pct(t1), v))
        prev = t1
    frames.append(('100%', 'transform: translateY(%.1fpx);' % cam_y(BB[-1][2])))
    css = kf(nm('camera'), dedupe(frames))

    base = BB[0][2]
    cf, prev = [], None
    for i, (t0, t1, f) in enumerate(BB):
        v = 'transform: translateY(%.1fpx);' % (ys[f] - ys[base])
        if prev is not None and prev != t0:
            cf.append((pct(prev), 'transform: translateY(%.1fpx);' % (ys[BB[i - 1][2]] - ys[base])))
        cf.append((pct(t0), v)); cf.append((pct(t1), v))
        prev = t1
    cf.append(('100%', 'transform: translateY(%.1fpx);' % (ys[BB[-1][2]] - ys[base])))
    css += kf(nm('carUp'), dedupe(cf))

    # 第二座井反向跑：同一批人、兩台車，「先接誰」就是這個遊戲的問題
    df = []
    order = [b[2] for b in reversed(BB)]
    for i, f in enumerate(order):
        df.append(('%.4g%%' % (i / (len(order) - 1.0) * 100),
                   'transform: translateY(%.1fpx);' % (ys[f] - ys[base])))
    css += kf(nm('carDown'), df)

    dl, dr = [], []
    for (t0, t1, _f) in BB:
        a, b = t0 + 0.35, t1 - 0.35
        for lst, sgn in ((dl, -1), (dr, 1)):
            lst.append((pct(max(0.0, t0 - 0.01)), 'transform: translateX(0);'))
            lst.append((pct(a), 'transform: translateX(%dpx);' % (sgn * 22)))
            lst.append((pct(b), 'transform: translateX(%dpx);' % (sgn * 22)))
            lst.append((pct(min(LOOP, t1 + 0.01)), 'transform: translateX(0);'))
    keyf = lambda x: float(x[0][:-1])
    css += kf(nm('doorL'), dedupe(sorted(dl, key=keyf)))
    css += kf(nm('doorR'), dedupe(sorted(dr, key=keyf)))

    for i, (t0, t1, _f) in enumerate(BB):
        # ⚠ 第一站的 t0 是 0，所以 `pct(t0)` 也是 `'0%'`——跟開場那一格擞 key。
        #   dedupe 留前面那一個，所以寫死 `'0%': opacity 0` 的話，
        #   第一站的字幕**在自己的節拍裡是看不見的**，
        #   反而會在 t1 之後（2.2–2.6s，相機已經在往上跑）閃一下。
        #   開場那一格的值要跟著 t0 走。
        head = 'opacity: %d;' % (1 if t0 <= 0 else 0)
        f = [('0%', head), (pct(max(0.0, t0 - 0.3)), head),
             (pct(t0), 'opacity: 1;'), (pct(t1), 'opacity: 1;'),
             (pct(min(LOOP, t1 + 0.4)), 'opacity: 0;'), ('100%', 'opacity: 0;')]
        seen, uniq = set(), []
        for k2, v2 in sorted(f, key=keyf):
            if k2 in seen: continue
            seen.add(k2); uniq.append((k2, v2))
        css += kf(nm('beat%d') % i, uniq)
    return css, cam_y(BB[0][2])


def build_b_css_doc(ys, total):
    """設計稿那一份：keyframes 不加 prefix，reduced-motion 的退路寫在同一段裡。"""
    css, cam0 = build_b_css(ys, total)
    css += ('    [class^="beat"] { opacity: 0; }\n'
            '    @media (prefers-reduced-motion: reduce) {\n'
            '      .camera { transform: translateY(%.1fpx); }\n'
            '      .doorL  { transform: translateX(-22px); }\n'
            '      .doorR  { transform: translateX(22px); }\n'
            '      .beat0  { opacity: 1; }\n'
            '    }\n' % cam0)
    return css


B_INTRO = ('一段<span class="k">手工編排</span>的 18 秒循環：相機從大廳出發，'
           '一路往上經過辦公、觀景，停在 %d 樓。'
           '素材與 A 完全相同（真的樓層帶、真的家具、真的小人），差別是<span class="k">它會動</span>——'
           '車在跑、門在開、隊伍在特定的時間出現、耐性條在掉。'
           '四站都是 <code>EVENTS</code> 表上真的事件，<span class="k">字幕逐字由那一列生成</span>；'
           '兩座井故意反向跑，因為「先接誰」就是這個遊戲的問題本身。') % B_TOP

B_MOTIVE = ('<span class="k">它是唯一一個把「來不及」演出來的方向。</span>'
            '9 點 05 分 13 樓一次湧出十幾個人、耐性條由綠轉紅、一台車在門口只吃得下四個——'
            '這一段五秒鐘講完了規則書那句「你買的不是自動點擊器，是更好的調度演算法」，'
            '而規則書要點進去才看得到。往上爬的相機也把「樓越高人越不一樣」講成一件'
            '<span class="k">會發生的事</span>，不是一張對照表：你是<em>經過</em>那幾群人的。')

# ⚠ 這一段在 #148 寫的是「它會安靜地過期，不會有任何 guard 紅」。
#   #152 把 B 做成真的首頁的時候把那個缺點解掉了，所以這裡跟著改寫——
#   **留著一句已經不成立的「主要缺點」，比沒有寫還糟。**
B_COST = ('<span class="k">節奏是演出來的——但只剩節奏。</span>'
          '什麼時候停、停多久、時鐘牌上的分鐘，這三樣資料裡沒有，是我寫的。'
          '<span class="k">其他每一個字都從 <code>EVENTS</code> 生成</span>：'
          '事件名、起訖、時段、人數，連隊伍多長都是 <code>(n0+n1)//2</code>。'
          'BE 明天把 <code>townhall</code> 的 <code>hours</code> 從 9-11 改成 8-10，'
          'committed 的產物跟活的 <code>EVENTS</code> 對不上 → <span class="k">harness 紅</span>（#152 第 26 組）。'
          '剩下的代價是它有 18 秒：三秒就離開的訪客只會看到第一站。')


def page_b():
    svg, total, ys = build_ride()
    beats_html = ''.join(
        '<div class="beat%d" style="position: absolute; inset: 0; animation: beat%d %gs steps(1) infinite;">'
        '<div class="pxs" style="position: absolute; left: 12px; top: 10px; background: #16183a; '
        'color: #ffe9a8; padding: 5px 9px; font-size: 13px; font-weight: 700; letter-spacing: .08em;">%s</div>'
        '<div style="position: absolute; left: 12px; bottom: 10px; right: 12px; background: rgba(22,24,58,.86); '
        'color: #fff8ea; padding: 7px 10px; font-size: 12px; line-height: 1.55;">'
        '<b style="color: #ffd23f;">%s</b><br><span style="opacity: .8; font-size: 11px;">%s</span></div></div>'
        % (b['i'], b['i'], LOOP, b['clock'], beat_place_zh(b), beat_zh(b)) for b in B_ROWS)

    base = B_ROWS[0]['floor']
    car_svg = (
        '<g class="carUp">%s</g><g class="carDown">%s</g>'
        % (car(SHAFT_X, ys[base] + 1, 48, RIDER_UP, 0, False, skip_doors=True),
           car(SHAFT_X + 48, ys[base] + 1, 48, RIDER_DOWN, 0, False)))
    doors = ('<g class="carUp">%s</g>'
             % door_leaves(SHAFT_X, ys[base] + 1, 48, 0, 'doorL', 'doorR'))

    inner = ('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="display: block;">'
             '<g class="camera">%s%s%s</g></svg>' % (VW, total, VW, total, svg, car_svg, doors))
    window_ = ('<div style="position: relative; width: %dpx; height: %dpx; overflow: hidden; background: #2a3142;">%s%s</div>'
               % (VW, VH, inner, beats_html))
    framed = ('<div style="border: 4px solid #16183a; box-shadow: 8px 8px 0 #16183a;">%s</div>' % window_)
    d = desktop_frame(framed, VW + 8, 520)

    k = 0.66
    ph_h = 452
    ph_vis = ('<div style="position: absolute; left: %gpx; top: %gpx; width: %gpx; height: %gpx; '
              'border: 3px solid #16183a; box-shadow: 5px 5px 0 #16183a; overflow: hidden;">'
              '<div style="transform: scale(%g); transform-origin: 0 0;">%s</div></div>'
              % ((390 - VW * k) / 2 - 3, ph_h - VH * k - 14, VW * k, VH * k, k, window_))
    p = phone_frame(ph_vis, ph_h)

    rows = [
        ('18 秒的四站', ' &nbsp;→&nbsp; '.join(
            '%s %s（%.1f–%.1fs）' % (b['clock'], beat_place_zh(b), b['t0'], b['t1'])
            for b in B_ROWS)),
        ('關鍵影格怎麼來的', '不是手寫百分比：<code>tools/landgen.py</code> 從 <code>B_BEATS</code> 與'
                             '每一層樓的 y 算出 <code>camera</code> / <code>carUp</code> / '
                             '<code>carDown</code> / <code>doorL</code> / <code>doorR</code> 五組 '
                             '<code>@keyframes</code>。改一個時間點，五組一起重算，不會對不上。'),
        ('reduced-motion', '五組動畫全部 <code>animation: none</code>，畫面停在 <span class="k">t=0</span>：'
                           '大廳、門開著、三個人要上車。那一格自己就成立——'
                           '<span class="k">方向 A 就是這個退路的完整版</span>。'),
        ('手機 390px', '這一格是用 <code>scale(0.66)</code> 縮的，<span class="k">而真的首頁沒有這樣做</span>：'
                       '產品那一份把 <code>&lt;svg&gt;</code> 設成 <code>width: 100%</code> + '
                       '外框 <code>aspect-ratio</code>。相機的 <code>translateY</code> 是 viewBox 的 '
                       'user unit，會跟著自己縮，所以不需要 CSS <code>scale()</code>，'
                       '<code>shape-rendering: crispEdges</code> 還救得回來。'),
        ('100 樓那題（#152 待裁決）',
         '相機往上爬是「樓越高人越不一樣」最好的表達，但它同時暗示「你會一路蓋到 100 樓」。'
         '100 樓是 <code>ENDING_FLOOR</code>，規則書寫得很清楚：那要 <b>$1000 萬加 20 張藍圖</b>，'
         '<span class="k">不是第一棟樓就到得了的地方</span>。'
         '<span class="k">這份稿現在停在 93 樓</span>（實驗樓層的夜班交接）。'
         '裁決如果是「帶到 100 樓」，把 <code>B_BEATS</code> 最後一列換成 '
         '<code>(15.2, 18.0, 100, 30, &#39;boarding&#39;)</code> 重新生成就換完了：'
         '樓層、相機關鍵影格、字幕全部自動跟上。'),
        ('要新文案嗎', '事件名與樓層帶名不用（<code>EVENTS[].name</code> / <code>BANDS[].name</code>，'
                       '<code>i18n-content.js</code> 中英兩版都有）。真的首頁另外需要六個接合詞的鍵'
                       '（<code>landRideAt</code> / <code>landRideHours</code> / <code>landRideCount</code> / '
                       '<code>landRideAllDay</code> / <code>landRideLobby</code> / <code>landRideAlt</code>），'
                       '已經照 #149 的先例加在 <code>js/i18n.js</code>。'),
    ]
    return (doc_head('方向 B ── 一趟到頂', '編排過的 18 秒循環，距離遊戲中等', B_INTRO)
            + '<div style="display: flex; gap: 40px; align-items: flex-start;">'
            + d + p + '</div>'
            + note_block(B_MOTIVE, B_COST, rows) + '</div>'), build_b_css_doc(ys, total)


# ================================================================ 方向三：真的跑一場
# 這一格的每一個數字都是把 render.js 的 layout() 逐行算一次得到的，不是估的。
def layout_real(W, H, floors, shafts=2, wide=False):
    skyPad = round(min(62, max(14, W * 0.085)))
    bx0, bx1 = skyPad, W - skyPad
    bw = bx1 - bx0
    wall = 6 if bw >= 220 else 3
    fx0, fx1 = bx0 + wall, bx1 - wall
    groundH = round(max(10, min(22, H * 0.055)))
    horizon = H - groundH
    roofH = round(max(10, min(18, bw * 0.026)))
    skyTop = round(max(30, min(58, H * 0.11)))
    deck = 5
    towerH = horizon - (skyTop + roofH + deck)
    fh = max(2, towerH / floors)
    towerTop = horizon - floors * fh
    inner = fx1 - fx0
    shaftW = min(inner * (0.60 if wide else 0.46), shafts * 30 + 10)
    return dict(W=W, H=H, bx0=bx0, bx1=bx1, bw=bw, wall=wall, fx0=fx0, fx1=fx1,
                groundH=groundH, horizon=horizon, roofH=roofH, skyTop=skyTop, deck=deck,
                fh=fh, towerTop=towerTop, shaftW=shaftW, shaftX=fx1 - shaftW,
                colW=shaftW / shafts, floors=floors)


def band_of(f):
    for b in BANDS:
        if b['frm'] <= f <= b['to']: return b
    return BANDS[0]


C_QUEUES = {
    13: [('office', 15, False), ('ceo', 15, True), ('newhire', 15, False),
         ('interviewee', 15, False), ('office', 15, False), ('office', 15, False),
         ('office', 15, False), ('remote', 15, False)],
    12: [('coffeegoer', 1, False), ('office', 1, False)],
    11: [('attendee', 1, False), ('office', 1, False), ('office', 1, False)],
    6:  [('loaded', 1, False), ('diner', 1, False), ('stroller', 1, False)],
    3:  [('child', 1, False), ('cat', 9, False)],
    1:  [('tourist', 12, False), ('courier', 12, False)],
}


def render_real(v, queues, cars, show_people=True):
    """照 render.js 的門檻畫一張真的畫面。門檻全部是那個檔案裡的數字。"""
    fh, fx0, fx1 = v['fh'], v['fx0'], v['fx1']
    shaftX, colW = v['shaftX'], v['colW']
    horizon, towerTop = v['horizon'], v['towerTop']
    floorY = lambda f: horizon - (f + 1) * fh
    detail = fh >= 16
    out = []
    # 天空（sky.js 在 09:05 的插值：zen/gnd 由 KEYS 兩端 mix 出來）
    out.append('<defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1">'
               '<stop offset="0" stop-color="#6a9dd2"/><stop offset="1" stop-color="#c9d3d8"/>'
               '</linearGradient></defs>')
    out.append(r(0, 0, v['W'], horizon, 'url(#skyC)'))
    out.append(r(0, horizon - 14, v['W'], 14, PAL['far']))
    out.append(r(0, horizon, v['W'], v['groundH'], PAL['ground']))
    out.append(r(0, horizon, v['W'], 1, PAL['groundLine']))
    # 屋頂 + 平台
    out.append(roof_chinese(v['bx0'], v['bw'], towerTop - v['deck'] - v['roofH'], v['roofH']))
    out.append(r(v['bx0'] - 3, towerTop - v['deck'], v['bw'] + 6, v['deck'], PAL['deck']))
    # 樓板
    out.append(r(fx0, towerTop, fx1 - fx0, horizon - towerTop, PAL['slab']))
    for f in range(v['floors']):
        y = floorY(f)
        b = band_of(f + 1)
        bh = max(1, fh - (1 if fh > 6 else 0))
        out.append(r(fx0, y, fx1 - fx0, bh,
                     sh(b['color'], PAL['floorA'] if f % 2 else PAL['floorB'])))
        if fh >= 2:
            out.append(r(fx0, y, min(10, max(5, fh * 0.6)), bh, sh(b['color'], PAL['stripe'])))
        if fh >= 14:                                    # drawInterior 的第一段門檻
            cs = 2 if fh >= 24 else 1
            x = fx0 + 8 + 6
            while x + 16 * cs < shaftX - 4:
                out.append(motif(b['key'], cs, x, y + fh - 1 - 8 * cs))
                x += 16 * cs + cs * 6
        elif fh >= 8:                                   # 只剩窗格節奏
            acc = sh(b['color'], PAL['furnAcc'])
            hh, yy = max(2, fh * 0.4), y + fh * 0.32
            sig = {'retail': 'o.o.o.o.o.o.o.o.', 'office': 'oo..oo..oo..oo..',
                   'hotel': 'o..o..o..o..o..o', 'resid': 'oo.o..oo.o..oo.o',
                   'obs': 'oooooooooooooooo', 'exp': 'o...o...o...o...',
                   'roof': 'ooo.....ooo.....'}[b['key']]
            i, x = 0, fx0 + 8
            while x < shaftX:
                if sig[i % len(sig)] == 'o': out.append(r(x, yy, 3, hh, acc))
                x += 5; i += 1
        if fh >= 13:                                    # 樓層號的門檻
            ds = 3 if fh >= 24 else 2
            txt = str(f + 1)
            out.append(plate(txt, fx0 + 12 + num_width(txt, ds) / 2,
                             y + (fh - GLYPH_H * ds) / 2, ds, PAL['floorNum'], PAL['numPlate']))
        q = queues.get(f + 1, [])
        if q and show_people:
            if detail:
                csF = max(1, min(3, int(fh // 11)))
                ds = 2 if fh >= 22 else 1
                step = SPRITE_W * csF + num_width('88', ds) + 14
                stop = fx0 + 12 + num_width('88', 3 if fh >= 24 else 2) + 2 + 10
                n = 0
                for pid, dest, urg in q:
                    px = shaftX - 6 - step * (n + 1)
                    if px < stop: break
                    out.append(sprite(pid, urg, csF, px,
                                      y + fh / 2 + 6 - SPRITE_H * csF + 2,
                                      PAL['bad'] if urg else PAL['ink'], mark=True))
                    d = str(dest)
                    out.append(plate(d, px + SPRITE_W * csF + 4 + num_width(d, ds) / 2,
                                     y + (fh - GLYPH_H * ds) / 2, ds,
                                     PAL['bad'] if urg else PAL['ink'], PAL['numPlate']))
                    n += 1
                if len(q) > n:
                    out.append(num('+' + str(len(q) - n), shaftX - 6 - step * n - 6,
                                   y + (fh - GLYPH_H * ds) / 2, ds, PAL['crowdBar'], 'right'))
            else:
                w = min(shaftX - fx0 - 24, len(q) * 5)
                out.append(r(shaftX - 6 - w, y + max(0, fh / 2 - 1.5), w,
                             max(1.5, fh - 2), PAL['crowdBar']))
    out.append(r(v['bx0'], towerTop, v['wall'], horizon - towerTop, PAL['wall']))
    out.append(r(v['bx1'] - v['wall'], towerTop, v['wall'], horizon - towerTop, PAL['wall']))
    if v['wall'] >= 5:
        yy = towerTop + 3
        while yy < horizon - 3:
            out.append(r(v['bx0'] + 2, yy, v['wall'] - 4, 4, PAL['wallWin']))
            out.append(r(v['bx1'] - v['wall'] + 2, yy, v['wall'] - 4, 4, PAL['wallWin']))
            yy += 9
    for i in range(2):
        out.append(shaft_col(shaftX + colW * i, colW, towerTop, horizon))
    for (f, riders, doors), i in zip(cars, range(2)):
        carH = max(4, fh - 2)
        x = shaftX + colW * i
        yy = floorY(f) + 1
        w = colW
        out.append(r(x + 1, yy, w - 2, carH, PAL['car']))
        half = (w - 2) / 2
        slide = half if doors else 0
        out.append(r(x + 1, yy, max(0, half - slide), carH, PAL['door']))
        out.append(r(x + 1 + half + slide, yy, max(0, half - slide), carH, PAL['door']))
        if carH >= 10:
            out.append(r(x + 3, yy + carH * 0.18, max(0, half - slide - 2), carH * 0.62, PAL['carGlass']))
            out.append(r(x + 1 + half + slide + 1, yy + carH * 0.18, max(0, half - slide - 2), carH * 0.62, PAL['carGlass']))
        if detail and riders:
            shown = riders[:4]
            slot = (w - 4) / len(shown)
            cs = max(1, min(3, int(slot - 1) // SPRITE_W))
            for k2, pid in enumerate(shown):
                cx = x + 2 + slot * (k2 + 0.5)
                out.append(sprite(pid, False, cs, cx - SPRITE_W * cs / 2,
                                  yy + carH / 2 + 6 - SPRITE_H * cs + 2, PAL['inkCar']))
        elif riders:
            out.append(r(x + 2, yy + 1, (w - 4) * min(1, len(riders) / 8.0),
                         max(1, carH - 2), PAL['riderBar']))
        out.append('<rect x="%g" y="%g" width="%g" height="%g" fill="none" stroke="%s" stroke-width="%g"/>'
                   % (x + 1.5, yy + .5, w - 3, carH - 1,
                      PAL['carDoors'] if doors else PAL['carEdge'], 2 if doors else 1))
    out.append(num('0905', 8, 6, 2, '#101426'))
    return ''.join(out)


V14 = layout_real(448, 420, 14)
V71 = layout_real(448, 420, 71)
V100 = layout_real(448, 420, 100)

C_INTRO = ('把 <code>js/sim.js</code> + <code>js/render.js</code> 直接接到首頁的一塊 '
           '<code>&lt;canvas&gt;</code> 上，跑一場真的、沒有輸入的模擬。'
           '螢幕上的每一件事都是真的：真的乘客生成、真的耐性、真的調度演算法、真的日夜。'
           '下面這一格<span class="k">不是示意圖</span>——它是把 <code>layout()</code> 逐行算一次'
           '（448×420、14 層、兩座井）之後，照 <code>render.js</code> 的每一道門檻畫出來的，'
           '所以它就是接上去之後你會看到的東西。')

C_MOTIVE = ('<span class="k">它不會過期，而且它不可能說謊。</span>'
            'BE 改事件、artist 改小人、theme 改色表——首頁跟著變，不需要有人記得回來改設計稿。'
            '「這是不是真的遊戲畫面」這個問題也就消失了：它<em>是</em>。'
            '成本也比想像的低——<code>index.html</code> 今天已經載了 <code>content.js</code>（408KB）'
            '與 <code>sim.js</code>（89KB），因為 <code>landing.js</code> 要 <code>fmtShort</code>。'
            '再加的是 <code>render.js</code> + <code>sprites.js</code> + <code>theme/sky/roof/interior/digits</code>，'
            '<span class="k">約 160KB</span>，不是一整個遊戲。')

C_COST = ('<span class="k">它做不到這張工單的第二個要求，而且原因是幾何的、不是效能的。</span>'
          '首頁那塊畫布 448×420 給 <code>layout()</code> 之後，樓體只有 337px 高，'
          '而 <code>fh = 337 / 樓層數</code>。<code>render.js</code> 的門檻是寫死的：'
          '<span class="k">fh ≥ 16 才畫得出一個一個的人</span>、fh ≥ 13 才有樓層號、fh ≥ 8 才有室內。'
          '要有人 → 最多 21 層 → <span class="k">只到飯店帶的第一層，七帶只看得到三帶</span>。'
          '要看到觀景台（71 樓）→ fh = 4.7px → 沒有人、沒有數字、沒有家具，只剩色條。'
          '<span class="k">「一眼看出調度」與「看得出樓越高人越不一樣」在同一塊畫布上互斥。</span>'
          '其次：新開的樓是 5 層、單井、<code>isManual</code> 為真——'
          '真的跑一場新遊戲，畫面演的是<em>手動點樓層</em>，正好是這張工單想反駁的那件事。'
          '所以 C 一定要餵一份<span class="k">捏造的存檔</span>：真的程式碼，假的初始狀態。')


def page_c():
    frame14 = ('<svg width="448" height="420" viewBox="0 0 448 420" style="display: block;">%s</svg>'
               % render_real(V14, C_QUEUES,
                             [(12, ['office', 'ceo'], True), (3, ['loaded'], False)]))
    frame71 = ('<svg width="448" height="420" viewBox="0 0 448 420" style="display: block;">%s</svg>'
               % render_real(V71, {f: [('office', 1, False)] * ((f * 7) % 9 + 1)
                                   for f in range(1, 72, 3)},
                             [(40, ['office'], False), (12, ['office'], False)]))

    badge = ('<div class="pxs" style="position: absolute; left: 42px; top: %dpx; background: #16183a; '
             'color: #ffe9a8; padding: 4px 8px; font-size: 12px; font-weight: 700; z-index: 2;">'
             'canvas 448×420 · 真的 sim.js</div>' % (712 - 6 - 420 - 4 + 4))
    framed = ('<div style="border: 4px solid #16183a; box-shadow: 8px 8px 0 #16183a;">%s</div>' % frame14)
    d = desktop_frame(framed, 448 + 8, 520, badge=badge)

    k = 0.66
    ph_h = 452
    ph_vis = ('<div style="position: absolute; left: %gpx; top: %gpx; width: %gpx; height: %gpx; '
              'border: 3px solid #16183a; box-shadow: 5px 5px 0 #16183a; overflow: hidden;">'
              '<div style="transform: scale(%g); transform-origin: 0 0;">%s</div></div>'
              % ((390 - 448 * k) / 2 - 3, ph_h - 420 * k - 14, 448 * k, 420 * k, k, frame14))
    p = phone_frame(ph_vis, ph_h)

    proof = ('<div style="margin-top: 30px; border: 2px solid #3a2020; background: #16101a; padding: 18px 20px;">'
             '<div class="pxs" style="font-size: 14px; color: #e2645a; letter-spacing: .06em; margin-bottom: 4px;">'
             '缺點不是講的，是畫的</div>'
             '<p style="margin: 0 0 14px; font-size: 12.5px; line-height: 1.85; color: #8f95d6; max-width: 88em;">'
             '同一塊 448×420 的畫布，同一支 <code>render.js</code>，只把樓層數從 14 改成 71'
             '（第一次看得到觀景台的高度）。右邊那張是首頁訪客會看到的東西：'
             '<span class="k">沒有人、沒有樓層號、沒有家具</span>，'
             '因為 <code>fh</code> 從 %.2fpx 掉到 %.2fpx，而三道門檻分別是 16 / 13 / 8。</p>'
             '<div style="display: flex; gap: 30px; align-items: flex-start;">'
             '<div><div class="pxs" style="font-size: 12px; color: #5ddc9a; margin-bottom: 6px;">'
             '14 層 · fh = %.2fpx · 零售 + 辦公（七帶中的二帶）</div>%s</div>'
             '<div><div class="pxs" style="font-size: 12px; color: #e2645a; margin-bottom: 6px;">'
             '71 層 · fh = %.2fpx · 七帶都在，一個人也看不到</div>%s</div>'
             '</div></div>'
             % (V14['fh'], V71['fh'], V14['fh'], frame14, V71['fh'], frame71))

    rows = [
        ('layout() 算出來的（448×420）',
         'skyPad %d · 樓寬 %d · 外牆 %d · 地面 %d · horizon %d · 屋頂 %d · 天空上緣 %d · '
         '樓體高 %d px。<code>fh = 樓體高 / 樓層數</code>。'
         % (V14['bx0'], V14['bw'], V14['wall'], V14['groundH'], V14['horizon'],
            V14['roofH'], V14['skyTop'], V14['horizon'] - (V14['skyTop'] + V14['roofH'] + V14['deck']))),
        ('三道寫死的門檻', '<code>fh ≥ 16</code> 才有一個一個的人（否則是人數條）· '
                           '<code>fh ≥ 13</code> 才有樓層號 · <code>fh ≥ 14</code> 才有家具、'
                           '<code>≥ 8</code> 才有窗格節奏。'
                           '對應的樓層數上限：<span class="k">21 / 25 / 42</span> 層。'
                           '觀景台從 71 樓開始，實驗樓層 86，屋頂 100。'),
        ('井道也是 layout() 的',
         '自動期兩座井只拿到 %d px（每台 %.0f px）。車裡的人 <code>slot = (w-4)/4 = %.2f</code>，'
         '<code>cs = min(3, floor(slot/7)) = 1</code> —— 車上的人是 7×9 的原尺寸，'
         '<span class="k">A 與 B 可以把井道排寬到 48px，C 不行</span>。'
         % (V14['shaftW'], V14['colW'], (V14['colW'] - 4) / 4)),
        ('天空會對不起來', '<code>sky.js</code> 有自己的天空（13 個關鍵時刻的漸層 + 星星 + 遠景）。'
                           '首頁的天空是五條硬邊色帶（<code>index.html</code> 的 <code>.sky i</code>）。'
                           '兩者疊在一起，畫布會讀成<span class="k">貼在頁面上的一塊螢幕</span>，'
                           '而不是這個場景的一部分。要嘛首頁改成漸層天空（那要動 '
                           '<code>landing.css</code> 的整個視覺語彙），要嘛承認它是一塊螢幕。'),
        ('必須捏造一份存檔', '新開的樓 <code>FLOORS_START = 5</code>、單井、'
                             '<code>isManual(st)</code> 為真——手動期轎廂顯示的是「車上的人要去哪」的數字，'
                             '井道還會被撐寬到 60%%。要演調度就得餵一份買好演算法的存檔。'
                             '真的程式碼，假的狀態。'),
        ('沒有量到的部分',
         '<span style="color:#f0a04a">[待填：實機量測]</span> 手機上的 fps 與電池、'
         '低階 Android 的 <code>requestAnimationFrame</code> 掉幀、'
         '首頁多載 160KB 之後的 LCP。'
         '<span class="k">這三個我沒有量，不編。</span>選了 C 才值得花那個時間去量。'),
        ('reduced-motion', '停在第一幀（<code>draw()</code> 跑一次就不再 raf）。'
                           '那一格看起來就是方向 A 的縮小版，只是資訊少很多——'
                           '<span class="k">C 的退路比 A 弱</span>，因為它沒有說明欄也沒有斷開的比例尺。'),
    ]
    return (doc_head('方向 C ── 真的跑一場', '接上 sim.js + render.js，距離遊戲最近', C_INTRO)
            + '<div style="display: flex; gap: 40px; align-items: flex-start;">'
            + d + p + '</div>'
            + proof + note_block(C_MOTIVE, C_COST, rows) + '</div>')


# ================================================================ 產品：首頁真的跑的那一段（#152）
#
# 這一段產生**兩個 committed 的產物**，首頁直接載入：
#   js/landride.js    動畫的 SVG + 節拍資料 + LAND_SRC
#   css/landride.css  相機／轎廂／車門／字幕的 @keyframes
#
# **為什麼要 LAND_SRC**：#148 說 B「會安靜過期」——BE 改 `townhall.hours`，首頁繼續說謊。
# 驗收（tests/acceptance.js 第 26 組）拿**活的** EVENTS / BANDS / PEOPLE / MOTIFS /
# theme.js 的 DAY 重新算一份同樣的結構，跟 LAND_SRC 逐字元比。
# 對不上 = 有人改了資料而沒有重新生成 = 紅。
#
# 逐 byte 的那一半在 `python tools/landgen.py --check`（瀏覽器開不了 python）。

RECT_RE = re.compile(r'<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" '
                     r'fill="(#[0-9a-fA-F]{6})"/>')


def pack_svg(src):
    """把**連續同色**的 <rect> 併成一個 <path>。純機械，畫出來一模一樣。

    首頁那一段有 4090 個 <rect>、243KB。一個 rect 約 62 bytes，一段 path 約 17 bytes，
    而且四千個節點會縮到幾百個 —— 這是 spritedom.js（#149）在圖鑑上用過的同一招，
    差別是那邊每張圖分開壓，這裡整段掃過去壓。
    帶 opacity / stroke 的 rect 屬性不一樣，regex 不會命中，原樣留著。
    """
    out, pos, state = [], 0, {'fill': None, 'run': []}

    def flush():
        run = state['run']
        if not run: return
        if len(run) == 1:
            out.append(run[0][1])
        else:
            out.append('<path fill="%s" d="%s"/>' % (state['fill'], ''.join(d for d, _ in run)))
        state['run'] = []

    for m in RECT_RE.finditer(src):
        if m.start() != pos:
            flush(); state['fill'] = None
            out.append(src[pos:m.start()])
        x, y, w, h, f = m.groups()
        if f != state['fill']:
            flush(); state['fill'] = f
        state['run'].append(('M%s %sh%sv%sh-%sz' % (x, y, w, h, w), m.group(0)))
        pos = m.end()
    flush()
    out.append(src[pos:])
    return ''.join(out)


def land_src():
    """產生當下讀到的**每一筆產品資料**，原樣。驗收會從活的模組再算一份來比。

    只收「這段動畫真的用到的」：畫進去的小人、畫進去的樓層帶小景、四站的事件。
    BANDS 與 DAY 整張收——它們小、而且動到任何一格都代表要重新生成。
    """
    drawn_people, drawn_bands = set(), set()
    for key, fl in B_GROUPS:
        drawn_bands.add(key)
        for f in fl:
            for pid, _d, _u in B_QUEUES.get(f, []):
                drawn_people.add(pid)
    for pid in RIDER_UP + RIDER_DOWN:
        drawn_people.add(pid)
    return {
        'events': [{'id': b['ev']['id'], 'name': b['ev']['name'], 'n': b['ev']['n'],
                    'at': b['ev']['at'], 'to': b['ev']['to'], 'hours': b['ev']['hours']}
                   for b in B_ROWS],
        'bands': [{'key': b['key'], 'from': b['frm'], 'to': b['to'],
                   'name': b['name'], 'color': b['color']} for b in BANDS],
        'people': [{'id': pid, 'acc': PEOPLE[pid]['acc'],
                    'normal': PEOPLE[pid]['normal'], 'urgent': PEOPLE[pid]['urgent']}
                   for pid in sorted(drawn_people)],
        'motifs': [{'key': k, 'glow': GLOW.get(k), 'rows': MOTIFS[k]}
                   for k in sorted(drawn_bands)],
        'palette': PAL_RAW,
    }


LANDRIDE_HEAD = """// landride.js \u2014 \u9996\u9801\u90a3\u4e00\u6bb5 18 \u79d2\u5faa\u74b0\u7684\u8cc7\u6599\u8207\u5716\u3002
//
// \u26a0\u26a0\u26a0 **\u9019\u500b\u6a94\u662f `python tools/landgen.py` \u751f\u51fa\u4f86\u7684\u3002\u4e0d\u8981\u624b\u6539\u3002** \u26a0\u26a0\u26a0
//
// \u8981\u6539\u5c31\u6539 `tools/landgen.py` \u7684 `B_BEATS` / `B_QUEUES` / `B_ALL_GROUPS`\uff0c
// \u6539\u5b8c\u91cd\u8dd1\u4e00\u6b21\u3002
//
// \u4e0b\u9762\u7684 `LAND_SRC` \u662f\u7522\u751f\u7576\u4e0b\u5f9e `content.js` / `sprites.js` / `interior.js` /
// `theme.js` \u8b80\u5230\u7684**\u6bcf\u4e00\u7b46\u8cc7\u6599\u539f\u6a23**\u3002\u9a57\u6536\u7b2c 25 \u7d44\u62ff\u6d3b\u7684\u6a21\u7d44
// \u518d\u7b97\u4e00\u4efd\u4f86\u9010\u5b57\u5143\u6bd4\uff1a**BE \u6539\u4e86 `townhall.hours` \u800c\u6c92\u6709\u91cd\u65b0\u751f\u6210 \u2192 harness \u7d05\u3002**
"""


def build_product():
    svg, total, ys = build_ride()
    base = B_ROWS[0]['floor']
    car_svg = ('<g class="rideUp">%s</g><g class="rideDown">%s</g>'
               % (car(SHAFT_X, ys[base] + 1, 48, RIDER_UP, 0, False, skip_doors=True),
                  car(SHAFT_X + 48, ys[base] + 1, 48, RIDER_DOWN, 0, False)))
    doors = ('<g class="rideUp">%s</g>'
             % door_leaves(SHAFT_X, ys[base] + 1, 48, 0, 'rideDoorL', 'rideDoorR'))
    full = pack_svg('<svg class="rideSvg" viewBox="0 0 %d %d" '
                    'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
                    '<g class="rideCam">%s%s%s</g></svg>'
                    % (VW, total, svg, car_svg, doors))

    css_body, cam0 = build_b_css(ys, total, prefix='ride-')
    css = (u'/* landride.css \u2014 \u9996\u9801\u52d5\u756b\u7684\u95dc\u9375\u5f71\u683c\u3002\n'
           u'   \u26a0\u26a0 **\u7531 `python tools/landgen.py` \u7522\u751f\uff0c\u4e0d\u8981\u624b\u6539\u3002**\n'
           u'   \u767e\u5206\u6bd4\u662f\u5f9e `B_BEATS` \u8207\u6bcf\u4e00\u5c64\u6a13\u7684 y \u7b97\u51fa\u4f86\u7684\uff1b\n'
           u'   \u624b\u6539\u4e00\u7d44\uff0c\u5225\u7684\u56db\u7d44\u5c31\u8ddf\u5b83\u5c0d\u4e0d\u4e0a\u4e86\u3002*/\n'
           '.rideCam   { animation: ride-camera %(l)gs linear infinite; }\n'
           '.rideUp    { animation: ride-carUp %(l)gs linear infinite; }\n'
           '.rideDown  { animation: ride-carDown %(l)gs linear infinite; }\n'
           '.rideDoorL { animation: ride-doorL %(l)gs linear infinite; }\n'
           '.rideDoorR { animation: ride-doorR %(l)gs linear infinite; }\n'
           '.rideBeat  { opacity: 0; }\n' % {'l': LOOP})
    css += ''.join('.rideBeat%d { animation: ride-beat%d %gs steps(1) infinite; }\n'
                   % (b['i'], b['i'], LOOP) for b in B_ROWS)
    css += ('\n' + css_body.replace('    @keyframes', '@keyframes')
            .replace('\n      ', '\n  ').replace('\n    }', '\n}'))
    css += (u'\n/* \u9000\u8def\uff1a\u5b9a\u683c\u5728 t=0 \u2014\u2014 \u5927\u5ef3\u3001\u9580\u958b\u8457\u3001\u7b2c\u4e00\u7ad9\u7684\u5b57\u5e55\u9084\u5728\u3002\n'
            u'   \u90a3\u4e00\u683c\u81ea\u5df1\u5c31\u6210\u7acb\uff08#148 \u65b9\u5411 A \u5c31\u662f\u9019\u500b\u9000\u8def\u7684\u5b8c\u6574\u7248\uff09\u3002*/\n'
            '@media (prefers-reduced-motion: reduce) {\n'
            '  .rideCam, .rideUp, .rideDown, .rideDoorL, .rideDoorR,\n'
            '  [class*="rideBeat"] { animation: none !important; }\n'
            '  .rideCam   { transform: translateY(%.1fpx); }\n'
            '  .rideDoorL { transform: translateX(-22px); }\n'
            '  .rideDoorR { transform: translateX(22px); }\n'
            '  .rideBeat0 { opacity: 1; }\n'
            '}\n' % cam0)

    data = {
        'loop': LOOP,
        'view': {'w': VW, 'h': VH, 'total': total},
        'beats': [{'i': b['i'], 't0': b['t0'], 't1': b['t1'], 'floor': b['floor'],
                   'place': b['place'], 'band': b['band'], 'clock': b['clock'],
                   'total': b['total'], 'ev': b['ev']} for b in B_ROWS],
    }
    js = (LANDRIDE_HEAD
          + '\nexport const RIDE = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
          + '\nexport const RIDE_SVG = ' + json.dumps(full, ensure_ascii=False) + ';\n'
          + u'\n// \u7522\u751f\u7576\u4e0b\u8b80\u5230\u7684\u6bcf\u4e00\u7b46\u8cc7\u6599\u3002'
            u'**\u9a57\u6536\u7b2c 25 \u7d44\u62ff\u6d3b\u7684\u6a21\u7d44\u518d\u7b97\u4e00\u4efd\u4f86\u6bd4\u3002**\n'
          + 'export const LAND_SRC = '
          + json.dumps(land_src(), ensure_ascii=False, indent=1, sort_keys=True) + ';\n')
    return js, css


# ================================================================ 輸出
def render_all():
    """三份設計稿 + 兩個產品產物，**全部算到記憶體裡**，回傳 {相對路徑: 內容}。

    寫檔與 --check 走同一條路徑：不然「檢查的產物」跟「寫出去的產物」可以分家。
    """
    out = {}

    def doc(path, body, extra_css='', rm_extra=''):
        out['design/' + path] = (HEAD.replace('__EXTRA_CSS__', extra_css)
                                 .replace('__RM_EXTRA', rm_extra) + body + TAIL)

    doc('LandCutaway.dc.html', page_a())
    doc_b, css_b = page_b()
    anim = ('    .camera { animation: camera %gs linear infinite; }\n'
            '    .carUp  { animation: carUp %gs linear infinite; }\n'
            '    .carDown{ animation: carDown %gs linear infinite; }\n'
            '    .doorL  { animation: doorL %gs linear infinite; }\n'
            '    .doorR  { animation: doorR %gs linear infinite; }\n'
            % (LOOP, LOOP, LOOP, LOOP, LOOP)) + css_b
    doc('LandOneRide.dc.html', doc_b, anim,
        ', .camera, .carUp, .carDown, .doorL, .doorR, [class^="beat"]')
    doc('LandLiveRun.dc.html', page_c())

    canvas = {
        "artboards": [
            {"file": "LandCutaway.dc.html", "x": 0,    "y": 0, "w": 1870, "h": 1620,
             "title": "\u65b9\u5411 A \u2500\u2500 \u5256\u9762"},
            {"file": "LandOneRide.dc.html", "x": 1990, "y": 0, "w": 1870, "h": 1620,
             "title": "\u65b9\u5411 B \u2500\u2500 \u4e00\u8d9f\u5230\u9802"},
            {"file": "LandLiveRun.dc.html", "x": 3980, "y": 0, "w": 1870, "h": 2180,
             "title": "\u65b9\u5411 C \u2500\u2500 \u771f\u7684\u8dd1\u4e00\u5834"},
        ],
        "annotations": [
            {"id": "axis", "x": 0, "y": -230, "w": 1400,
             "text": "#148 \u4e09\u500b\u65b9\u5411\uff0c\u6cbf\u300c\u9996\u9801\u8ddf\u904a\u6232\u7684\u8ddd\u96e2\u300d\u7531\u9060\u5230\u8fd1\u6392\u3002\n"
                     "A \u975c\u614b\u5256\u9762 \u2192 B \u7de8\u6392\u904e\u7684 18 \u79d2\u5faa\u74b0 \u2192 C \u771f\u7684\u63a5\u4e0a sim.js\u3002\n"
                     "\u4e09\u4efd\u7528\u7684\u662f\u540c\u4e00\u6279\u7d20\u6750\uff08\u771f\u7684\u6a13\u5c64\u5e36\u8272\u3001\u771f\u7684 16\u00d78 \u5bb6\u5177\u3001\u771f\u7684 7\u00d79 \u5c0f\u4eba\u3001"
                     "\u771f\u7684 3\u00d75 \u6a13\u5c64\u865f\uff09\uff0c\u7531 tools/landgen.py \u5f9e\u7522\u54c1\u8b80\u51fa\u4f86\u7522\u751f\uff0c\u6c92\u6709\u624b\u6284\u7684\u984f\u8272\u3002"},
            {"id": "picked", "x": 1990, "y": -370, "w": 1400,
             "text": "owner \u9078\u4e86 B\u3002#152 \u628a\u5b83\u505a\u6210\u771f\u7684\u9996\u9801\uff1a\n"
                     "\u540c\u4e00\u652f landgen.py \u53e6\u5916\u7522\u751f js/landride.js \u8207 css/landride.css\uff0c\n"
                     "\u9a57\u6536\u7b2c 25 \u7d44\u62ff\u6d3b\u7684 EVENTS/BANDS/PEOPLE/MOTIFS/DAY \u8ddf\u7522\u7269\u88e1\u7684 LAND_SRC \u9010\u5b57\u5143\u6bd4\u3002\n"
                     "\u76f8\u6a5f\u73fe\u5728\u505c\u5728 93 \u6a13\uff1b100 \u6a13\u90a3\u984c\u5728 #152 \u7b49 owner \u88c1\u6c7a\u3002"},
            {"id": "warning", "x": 3980, "y": -230, "w": 1400,
             "text": "C \u6709\u4e00\u500b\u5e7e\u4f55\u4e0a\u7684\u9650\u5236\uff0c\u5de5\u55ae\u88e1\u6c92\u6709\u9810\u6599\u5230\uff1a448\u00d7420 \u7684\u756b\u5e03\u4e0a\uff0c"
                     "\u300c\u770b\u5f97\u5230\u4e00\u500b\u4e00\u500b\u7684\u4eba\u300d\u8207\u300c\u770b\u5f97\u5230\u4e03\u500b\u6a13\u5c64\u5e36\u300d\u4e92\u65a5\u3002\n"
                     "\u7d30\u7bc0\u8207\u4e26\u6392\u7684\u8b49\u660e\u5728 C \u7684\u7a3f\u88e1\u3002"},
        ],
        "launch": {"view": "canvas"},
    }
    out['design/canvas.json'] = json.dumps(canvas, ensure_ascii=False, indent=2)

    js, css = build_product()
    out['js/landride.js'] = js
    out['css/landride.css'] = css
    return out


if __name__ == '__main__':
    # Windows 的 stdout 預設是 cp1252，而下面每一句診斷都是中文。
    # 不接這一行的話，`--check` 全綠的時候會在最後一句 print 上
    # UnicodeEncodeError 而以 exit 1 收場：鎖本身是綠的，回傳值却是紅的。
    for _s in (sys.stdout, sys.stderr):
        try: _s.reconfigure(encoding='utf-8', errors='replace')
        except Exception: pass

    files = render_all()
    check = '--check' in sys.argv
    bad = 0

    for rel in sorted(files):
        path = os.path.join(ROOT, *rel.split('/'))
        data = files[rel].encode('utf-8')
        if not check:
            open(path, 'wb').write(data)
            print('%-28s %7.1f KB' % (rel, len(data) / 1024))
            continue
        # \u884c\u5c3e\u6b78\u4e00\uff1agit \u5728 Windows \u4e0a\u62ff CRLF \u7d66\u5de5\u4f5c\u6a39\uff0c\u5eab\u88e1\u662f LF\u3002
        # \u90a3\u662f\u5e73\u53f0\u7684\u4e8b\uff0c\u4e0d\u662f\u300c\u6709\u4eba\u6539\u4e86\u8cc7\u6599\u300d\u3002
        norm = lambda b: b.replace(b'\r\n', b'\n')
        old = open(path, 'rb').read() if os.path.exists(path) else None
        if old is not None and norm(old) == norm(data):
            print('OK    %-28s %7.1f KB' % (rel, len(data) / 1024))
            continue
        bad += 1
        if old is None:
            print('\u7f3a    %-28s \u91cd\u65b0\u751f\u6210\u6703\u5efa\u7acb\u9019\u500b\u6a94\uff0c\u4f46\u5b83\u4e0d\u5728\u6a39\u4e0a' % rel)
            continue
        a, b = norm(old), norm(data)
        k = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]), min(len(a), len(b)))
        print('\u7d05    %-28s \u7b2c %d \u500b byte \u8d77\u4e0d\u540c'
              '\uff08committed %d bytes / \u91cd\u65b0\u751f\u6210 %d bytes\uff09' % (rel, k, len(a), len(b)))
        print('      committed  : ...%s...' % a[max(0, k - 40):k + 60].decode('utf-8', 'replace'))
        print('      \u91cd\u65b0\u751f\u6210: ...%s...' % b[max(0, k - 40):k + 60].decode('utf-8', 'replace'))

    if check:
        if bad:
            print('\n\u26a0 %d \u500b\u7522\u7269\u8ddf\u91cd\u65b0\u751f\u6210\u7684\u4e0d\u4e00\u6a23\u3002'
                  '\u6709\u4eba\u6539\u4e86\u8cc7\u6599\uff08content.js / sprites.js / interior.js / theme.js\uff09'
                  '\u6216\u6539\u4e86 landgen.py \u800c\u6c92\u6709\u91cd\u65b0\u751f\u6210\u3002'
                  '\u8dd1 `python tools/landgen.py`\u3002' % bad)
            sys.exit(1)
        print('\n\u5168\u90e8\u9010 byte \u76f8\u540c\u3002')
