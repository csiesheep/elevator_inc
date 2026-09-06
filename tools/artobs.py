# -*- coding: utf-8 -*-
"""觀景帶四張新圖（#135）的量測核心。

**這是第二個獨立實作，不是 artlib 的包裝。** CIEDE2000、shadeHex、theme.js 的解析
全部在這裡各自寫一次（純 Python、逐點、不用 numpy），然後跟 `tools/artlib.py`
與 `tests/acceptance.js` 對數字。三個實作對不上就代表有一支錯了。

為什麼要第二個實作：#105 記著一件事——一個 artist 的量測頁抓到 `pal.money`
而不是 `pal.bad`（兩個在 theme.js 同一行），每個身體色數字都錯而且看起來完全真實，
**是第二個獨立實作不同意才找到的**。所以這裡的 `pal_body()` 用的是
「切出 NIGHT/DAY 兩個物件、逐鍵解析」，而不是正則抓 `money:...bad:`。

⚠ **比較之前不做任何格式化。** 一律回 float，只有印出來那一步才 %.4f。
"""
import os
import re
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------- theme.js（逐鍵解析）
def _canvas_objects(src):
    """把 theme.js 的 `const NAME = { ... };` 逐個切出來，回 {name: {key: value_str}}。
    **靠大括號配對切，不靠正則**——正則抓「同一行的第二個鍵」正是 #105 那個陷阱。"""
    out = {}
    for m in re.finditer(r'^const\s+(\w+)\s*=\s*\{', src, re.M):
        name = m.group(1)
        i = m.end() - 1
        depth = 0
        for j in range(i, len(src)):
            if src[j] == '{':
                depth += 1
            elif src[j] == '}':
                depth -= 1
                if depth == 0:
                    body = src[i + 1:j]
                    break
        else:
            continue
        # 去掉行註解，再逐個 `key: value,` 拆
        body = re.sub(r'//[^\n]*', '', body)
        kv = {}
        for km in re.finditer(r"(\w+)\s*:\s*('[^']*'|[-0-9.]+)", body):
            kv[km.group(1)] = km.group(2).strip("'")
        out[name] = kv
    return out


def theme_objects(path=None):
    src = open(path or os.path.join(ROOT, 'js', 'theme.js'), encoding='utf-8').read()
    return _canvas_objects(src)


CANVAS_TABLES = ('NIGHT', 'DAY')          # 只有這兩個上得了畫布；CSS_* 只寫進 CSS 變數


def pal_body(path=None):
    """三種身體色，**逐鍵取**：pal.ink / pal.inkCar / pal.bad。回 [(名字, hex)]。"""
    objs = theme_objects(path)
    out = []
    for key in ('ink', 'inkCar', 'bad'):
        vals = sorted({objs[t][key].lower() for t in CANVAS_TABLES})
        assert len(vals) == 1, ('%s 在 NIGHT/DAY 不同色，這一頁的前提要改' % key, vals)
        out.append(('pal.' + key, vals[0]))
    assert len({c for _, c in out}) == 3, '三種身體色不是三個相異值'
    return out


def pal_car(path=None):
    objs = theme_objects(path)
    vals = sorted({objs[t]['car'].lower() for t in CANVAS_TABLES})
    assert len(vals) == 1, ('pal.car 在 NIGHT/DAY 不同色', vals)
    return vals[0]


def floor_ks(path=None):
    objs = theme_objects(path)
    ks = set()
    for t in CANVAS_TABLES:
        for k in ('floorA', 'floorB'):
            ks.add(float(objs[t][k]))
    return sorted(ks)


# ---------------------------------------------------------------- content.js
def bands(path=None):
    src = open(path or os.path.join(ROOT, 'js', 'content.js'), encoding='utf-8').read()
    seg = src[src.index('export const BANDS'):]
    seg = seg[:seg.index('];')]
    return [(m.group(1), m.group(2).lower())
            for m in re.finditer(r"key:'(\w+)',.*?color:'(#[0-9a-fA-F]{6})'", seg, re.S)]


def passengers(path=None):
    """{id: {'band':.., 'name':.., 'size':int, 'pair':bool}}"""
    src = open(path or os.path.join(ROOT, 'js', 'content.js'), encoding='utf-8').read()
    seg = src[src.index('export const PASSENGERS'):src.index('export const BANDS')]
    out = {}
    # 逐個 id 抓起點，然後往後看到下一個 id 為止——比「配對整個物件」的正則穩。
    idxs = [(m.start(), m.group(1), m.group(2))
            for m in re.finditer(r"\{\s*id:'(\w+)',\s*name:'([^']*)'", seg)]
    for n, (pos, pid, name) in enumerate(idxs):
        end = idxs[n + 1][0] if n + 1 < len(idxs) else len(seg)
        blob = seg[pos:end]
        band = re.search(r"band:'(\w+)'", blob)
        size = re.search(r"size:(\d+)", blob)
        out[pid] = {'band': band.group(1) if band else None,
                    'name': name,
                    'size': int(size.group(1)) if size else 1,
                    'pair': "pair:true" in blob.replace(' ', '')}
    return out


# ---------------------------------------------------------------- sprites.js
def people(path=None):
    src = open(path or os.path.join(ROOT, 'js', 'sprites.js'), encoding='utf-8').read()
    body = src[src.index('export const PEOPLE'):]
    out = {}
    for m in re.finditer(r"^  (\w+): \{ acc: '(#[0-9a-fA-F]{6})', normal: \[(.*?)\], urgent: \[(.*?)\]\}",
                         body, re.S | re.M):
        rows = lambda blob: re.findall(r"'([.#o]{7})'", blob)
        n, u = rows(m.group(3)), rows(m.group(4))
        assert len(n) == 9 and len(u) == 9, (m.group(1), len(n), len(u))
        out[m.group(1)] = {'acc': m.group(2).lower(), 'normal': n, 'urgent': u}
    return out


# ---------------------------------------------------------------- shadeHex
SHADE_SIG = 'out |= Math.min(255, Math.round(((n >> sh) & 255) * k)) << sh'


def shade_src_ok():
    src = open(os.path.join(ROOT, 'js', 'render.js'), encoding='utf-8').read()
    return SHADE_SIG in src


def shade_hex(h, k):
    """跟 render.js 逐字同構。JS 的 Math.round 是 half-up，所以不能用 python round()。"""
    n = int(h[1:], 16)
    out = 0
    for sh in (16, 8, 0):
        v = ((n >> sh) & 255) * k
        out |= min(255, math.floor(v + 0.5)) << sh
    return '#%06x' % out


def floor_shades():
    return [('%s@%s' % (bk, k), shade_hex(bc, k))
            for bk, bc in bands() for k in floor_ks()]


def backgrounds():
    """29 種：28 種樓層底色 + 轎廂內裝。"""
    return floor_shades() + [('car ' + pal_car(), pal_car())]


# ---------------------------------------------------------------- CIEDE2000（獨立、純量）
def _srgb_to_lab(h):
    n = int(h[1:], 16)
    ch = []
    for sh in (16, 8, 0):
        v = ((n >> sh) & 255) / 255.0
        ch.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    r, g, b = ch
    # D65 / 2°，跟 acceptance.js 同一組矩陣（那是規格的一部分，不是實作細節）
    X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750)
    Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883

    def f(t):
        return t ** (1.0 / 3.0) if t > 216.0 / 24389.0 else (24389.0 / 27.0 * t + 16) / 116.0

    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de2000(h1, h2):
    """Sharma/Wu/Dalal 的式子，逐項照抄論文，**不參考 artlib 的寫法**。"""
    L1, a1, b1 = _srgb_to_lab(h1)
    L2, a2, b2 = _srgb_to_lab(h2)
    kL = kC = kH = 1.0
    C1 = math.hypot(a1, b1)
    C2 = math.hypot(a2, b2)
    Cbar = (C1 + C2) / 2.0
    G = 0.5 * (1.0 - math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25.0 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)

    def hp(ap, bp):
        if ap == 0 and bp == 0:
            return 0.0
        d = math.degrees(math.atan2(bp, ap))
        return d + 360.0 if d < 0 else d

    h1p, h2p = hp(a1p, b1), hp(a2p, b2)
    dLp = L2 - L1
    dCp = C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    else:
        dhp = h2p - h1p
        if dhp > 180:
            dhp -= 360
        elif dhp < -180:
            dhp += 360
    dHp = 2.0 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2.0))
    Lbp = (L1 + L2) / 2.0
    Cbp = (C1p + C2p) / 2.0
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2.0
    elif h1p + h2p < 360:
        hbp = (h1p + h2p + 360) / 2.0
    else:
        hbp = (h1p + h2p - 360) / 2.0
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30))
           + 0.24 * math.cos(math.radians(2 * hbp))
           + 0.32 * math.cos(math.radians(3 * hbp + 6))
           - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dth = 30.0 * math.exp(-(((hbp - 275.0) / 25.0) ** 2))
    Rc = 2.0 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7))
    Sl = 1.0 + (0.015 * (Lbp - 50) ** 2) / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1.0 + 0.045 * Cbp
    Sh = 1.0 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dth)) * Rc
    tl, tc, th = dLp / (kL * Sl), dCp / (kC * Sc), dHp / (kH * Sh)
    return math.sqrt(tl * tl + tc * tc + th * th + Rt * tc * th)


# ---------------------------------------------------------------- 形狀
_CELL = {'.': 0, '#': 1, 'o': 2}


def ham3(a, b):
    return sum(1 for r in range(9) for c in range(7) if _CELL[a[r][c]] != _CELL[b[r][c]])


def sil2(a, b):
    return sum(1 for r in range(9) for c in range(7)
               if (a[r][c] != '.') != (b[r][c] != '.'))


def shape_dist(pa, pb):
    return min(ham3(pa['normal'], pb['normal']), ham3(pa['urgent'], pb['urgent']))


def sil_dist(pa, pb):
    return min(sil2(pa['normal'], pb['normal']), sil2(pa['urgent'], pb['urgent']))


# ---------------------------------------------------------------- Sharma 校準測資
# 論文附表裡的 15 組（Lab 直給）。**這是唯一的外部校準**：對稱與自距離為零
# 兩條自檢通過的錯誤實作是存在的。
SHARMA = [
    ((50.0000, 2.6772, -79.7751), (50.0000, 0.0000, -82.7485), 2.0425),
    ((50.0000, 3.1571, -77.2803), (50.0000, 0.0000, -82.7485), 2.8615),
    ((50.0000, 2.8361, -74.0200), (50.0000, 0.0000, -82.7485), 3.4412),
    ((50.0000, -1.3802, -84.2814), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, -1.1848, -84.8006), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, -0.9009, -85.5211), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, 0.0000, 0.0000), (50.0000, -1.0000, 2.0000), 2.3669),
    ((50.0000, -1.0000, 2.0000), (50.0000, 0.0000, 0.0000), 2.3669),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0009), 7.1792),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0010), 7.1792),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0011), 7.2195),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0012), 7.2195),
    ((50.0000, -0.0010, 2.4900), (50.0000, 0.0009, -2.4900), 4.8045),
    ((50.0000, -0.0010, 2.4900), (50.0000, 0.0011, -2.4900), 4.7461),
    ((50.0000, 2.5000, 0.0000), (50.0000, 0.0000, -2.5000), 4.3065),
]


def de2000_lab(lab1, lab2):
    """吃 Lab 的入口（Sharma 測資直接給 Lab，不經過 sRGB）。"""
    return _core(lab1, lab2)


def _core(lab1, lab2):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    C1 = math.hypot(a1, b1)
    C2 = math.hypot(a2, b2)
    Cbar = (C1 + C2) / 2.0
    G = 0.5 * (1.0 - math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25.0 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)

    def hp(ap, bp):
        if ap == 0 and bp == 0:
            return 0.0
        d = math.degrees(math.atan2(bp, ap))
        return d + 360.0 if d < 0 else d

    h1p, h2p = hp(a1p, b1), hp(a2p, b2)
    dLp = L2 - L1
    dCp = C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    else:
        dhp = h2p - h1p
        if dhp > 180:
            dhp -= 360
        elif dhp < -180:
            dhp += 360
    dHp = 2.0 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2.0))
    Lbp = (L1 + L2) / 2.0
    Cbp = (C1p + C2p) / 2.0
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2.0
    elif h1p + h2p < 360:
        hbp = (h1p + h2p + 360) / 2.0
    else:
        hbp = (h1p + h2p - 360) / 2.0
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30))
           + 0.24 * math.cos(math.radians(2 * hbp))
           + 0.32 * math.cos(math.radians(3 * hbp + 6))
           - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dth = 30.0 * math.exp(-(((hbp - 275.0) / 25.0) ** 2))
    Rc = 2.0 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7))
    Sl = 1.0 + (0.015 * (Lbp - 50) ** 2) / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1.0 + 0.045 * Cbp
    Sh = 1.0 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dth)) * Rc
    tl, tc, th = dLp / Sl, dCp / Sc, dHp / Sh
    return math.sqrt(tl * tl + tc * tc + th * th + Rt * tc * th)
