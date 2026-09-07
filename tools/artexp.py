# -*- coding: utf-8 -*-
"""artexp.py — 乘客像素圖的五條判準，全部自己算一次。

為什麼不直接跑 harness 就好：harness 是 orchestrator 的，它只回「過／不過」。
畫圖的時候要的是**每一格的距離值**、**最糟落在哪裡**、以及**改一個字之後差多少**，
所以這裡重算一次，而且**判定句是算出來的，不是寫死的字串**。

五條判準（門檻與 tests/acceptance.js 對齊，但實作是獨立的）：
  1. 配件色互斥        ΔE00 >= 9    對其它每一個 acc
  2. 配件對身體色      ΔE00 >= 25   normal 的 '#' -> pal.ink / pal.inkCar
                                    urgent 的 '#' -> pal.bad     （分姿勢，不混算）
  3. 配件對背景        ΔE00 >= 25   7 帶 x 4 個明暗係數 + 轎廂內裝 = 29 種
  4. 形狀              三態 Hamming >= 12   兩個姿勢取 min
  5. 剪影              二態 Hamming != 0

⚠ ΔE 的正確性不靠「多寫幾支實作、看它們同不同意」。四支共用同一組 sRGB->XYZ 矩陣
  的實作會完美地同意一個錯的答案。這裡分成兩段各自校驗：
    · Lab -> ΔE00 的公式：Sharma/Wu/Dalal (2005) 的 34 組測資（--selftest）
    · sRGB -> Lab 的轉換：六個獨立公佈的參考值（黑/白/紅/綠/藍/中灰）
  兩段都過，才算這支尺是準的。
"""
import sys, os, re, math, json, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------- 色彩

def srgb_to_lab(hexstr):
    n = int(hexstr[1:], 16)
    out = []
    for sh in (16, 8, 0):
        v = ((n >> sh) & 255) / 255.0
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    r, g, b = out
    # D65 / 2deg, sRGB primaries (IEC 61966-2-1)
    X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000
    Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883

    def f(t):
        return t ** (1.0 / 3.0) if t > 216.0 / 24389.0 else (24389.0 / 27.0 * t + 16.0) / 116.0
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de2000_lab(lab1, lab2, kL=1.0, kC=1.0, kH=1.0):
    """CIEDE2000。輸入 CIELAB，跟 sRGB 轉換完全分開——這樣 Sharma 測資才驗得到公式本身。"""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    rad, deg = math.pi / 180.0, 180.0 / math.pi

    C1 = math.hypot(a1, b1)
    C2 = math.hypot(a2, b2)
    Cbar = (C1 + C2) / 2.0
    c7 = Cbar ** 7
    G = 0.5 * (1 - math.sqrt(c7 / (c7 + 25.0 ** 7)))
    ap1, ap2 = (1 + G) * a1, (1 + G) * a2
    Cp1, Cp2 = math.hypot(ap1, b1), math.hypot(ap2, b2)

    def hp(a, b):
        if a == 0 and b == 0:
            return 0.0
        t = math.atan2(b, a) * deg
        return t + 360.0 if t < 0 else t
    hp1, hp2 = hp(ap1, b1), hp(ap2, b2)

    dLp = L2 - L1
    dCp = Cp2 - Cp1
    if Cp1 * Cp2 == 0:
        dhp = 0.0
    else:
        dhp = hp2 - hp1
        if dhp > 180:
            dhp -= 360
        elif dhp < -180:
            dhp += 360
    dHp = 2.0 * math.sqrt(Cp1 * Cp2) * math.sin(dhp / 2.0 * rad)

    Lbp = (L1 + L2) / 2.0
    Cbp = (Cp1 + Cp2) / 2.0
    if Cp1 * Cp2 == 0:
        hbp = hp1 + hp2
    elif abs(hp1 - hp2) <= 180:
        hbp = (hp1 + hp2) / 2.0
    else:
        hbp = (hp1 + hp2 + (360 if hp1 + hp2 < 360 else -360)) / 2.0

    T = (1 - 0.17 * math.cos((hbp - 30) * rad) + 0.24 * math.cos(2 * hbp * rad)
         + 0.32 * math.cos((3 * hbp + 6) * rad) - 0.20 * math.cos((4 * hbp - 63) * rad))
    dtheta = 30.0 * math.exp(-(((hbp - 275.0) / 25.0) ** 2))
    cbp7 = Cbp ** 7
    Rc = 2.0 * math.sqrt(cbp7 / (cbp7 + 25.0 ** 7))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -math.sin(2 * dtheta * rad) * Rc

    return math.sqrt((dLp / (kL * Sl)) ** 2 + (dCp / (kC * Sc)) ** 2 + (dHp / (kH * Sh)) ** 2
                     + Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)))


_LAB_CACHE = {}


def de(h1, h2):
    for h in (h1, h2):
        if h not in _LAB_CACHE:
            _LAB_CACHE[h] = srgb_to_lab(h)
    return de2000_lab(_LAB_CACHE[h1], _LAB_CACHE[h2])


def de2000_side(lab1, lab2, side):
    """CIEDE2000，但**指定走平均色相的哪一側**。

    公式在 |h1'-h2'| == 180 那條線上是分段定義的（Sharma 等人的論文明講）。
    兩個色相角剛好差 180 度附近時，「哪一側」會讓 ΔE 跳好幾個單位——
    那時一對顏色的及格與否就取決於實作，而不是取決於顏色。

    ⚠ `dh` 與 `hb` **一定要一起翻**：dh 決定 dH 的正負號，而 dH 又進到
      `Rt * (dC/Sc) * (dH/Sh)` 那個交叉項。只翻一個會得到一個
      **不存在於任何一側**的混合值。far 側的 hb 用 `hb_near + 180`（mod 360），
      因為 hb_near 是對稱的，這樣翻出來也是對稱的。
    回 (dE, gap)，gap = |h1' - h2'|。
    """
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    rad, deg = math.pi / 180.0, 180.0 / math.pi
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cbar = (C1 + C2) / 2.0
    c7 = Cbar ** 7
    G = 0.5 * (1 - math.sqrt(c7 / (c7 + 25.0 ** 7)))
    ap1, ap2 = (1 + G) * a1, (1 + G) * a2
    Cp1, Cp2 = math.hypot(ap1, b1), math.hypot(ap2, b2)

    def hp(a, b):
        if a == 0 and b == 0:
            return 0.0
        t = math.atan2(b, a) * deg
        return t + 360.0 if t < 0 else t
    hp1, hp2 = hp(ap1, b1), hp(ap2, b2)
    dLp, dCp = L2 - L1, Cp2 - Cp1
    Lbp, Cbp = (L1 + L2) / 2.0, (Cp1 + Cp2) / 2.0
    raw = hp2 - hp1
    hs = hp1 + hp2
    if Cp1 * Cp2 == 0:
        dhp, hbp = 0.0, hs
    else:
        hb_near = hs / 2.0 if abs(hp1 - hp2) <= 180 else (hs + (360 if hs < 360 else -360)) / 2.0
        if side == 'near':
            dhp = raw - 360 if raw > 180 else (raw + 360 if raw < -180 else raw)
            hbp = hb_near
        else:
            dhp = raw + (360 if raw < 0 else -360)
            hbp = (hb_near + 180) % 360
    dHp = 2.0 * math.sqrt(Cp1 * Cp2) * math.sin(dhp / 2.0 * rad)
    T = (1 - 0.17 * math.cos((hbp - 30) * rad) + 0.24 * math.cos(2 * hbp * rad)
         + 0.32 * math.cos((3 * hbp + 6) * rad) - 0.20 * math.cos((4 * hbp - 63) * rad))
    dth = 30.0 * math.exp(-(((hbp - 275.0) / 25.0) ** 2))
    cbp7 = Cbp ** 7
    Rc = 2.0 * math.sqrt(cbp7 / (cbp7 + 25.0 ** 7))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -math.sin(2 * dth * rad) * Rc
    dE = math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2
                   + Rt * (dCp / Sc) * (dHp / Sh))
    return dE, abs(hp1 - hp2)


def de_side(h1, h2, side):
    for h in (h1, h2):
        if h not in _LAB_CACHE:
            _LAB_CACHE[h] = srgb_to_lab(h)
    return de2000_side(_LAB_CACHE[h1], _LAB_CACHE[h2], side)


def shade_hex(hexstr, k):
    """逐字抄自 render.js 的 shadeHex（那裡沒有 export）。"""
    n = int(hexstr[1:], 16)
    out = 0
    for sh in (16, 8, 0):
        out |= min(255, round(((n >> sh) & 255) * k)) << sh
    return '#%06x' % out


# ---------------------------------------------------------------- 校驗

# Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference Formula:
# Implementation Notes, Supplementary Test Data and Mathematical Observations",
# Color Research & Application 30(1):21-30. 附錄的 34 組測資。
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
    ((50.0000, -0.0010, 2.4900), (50.0000, 0.0010, -2.4900), 4.8045),
    ((50.0000, -0.0010, 2.4900), (50.0000, 0.0011, -2.4900), 4.7461),
    ((50.0000, 2.5000, 0.0000), (50.0000, 0.0000, -2.5000), 4.3065),
    ((50.0000, 2.5000, 0.0000), (73.0000, 25.0000, -18.0000), 27.1492),
    ((50.0000, 2.5000, 0.0000), (61.0000, -5.0000, 29.0000), 22.8977),
    ((50.0000, 2.5000, 0.0000), (56.0000, -27.0000, -3.0000), 31.9030),
    ((50.0000, 2.5000, 0.0000), (58.0000, 24.0000, 15.0000), 19.4535),
    ((50.0000, 2.5000, 0.0000), (50.0000, 3.1736, 0.5854), 1.0000),
    ((50.0000, 2.5000, 0.0000), (50.0000, 3.2972, 0.0000), 1.0000),
    ((50.0000, 2.5000, 0.0000), (50.0000, 1.8634, 0.5757), 1.0000),
    ((50.0000, 2.5000, 0.0000), (50.0000, 3.2592, 0.3350), 1.0000),
    ((60.2574, -34.0099, 36.2677), (60.4626, -34.1751, 39.4387), 1.2644),
    ((63.0109, -31.0961, -5.8663), (62.8187, -29.7946, -4.0864), 1.2630),
    ((61.2901, 3.7196, -5.3901), (61.4292, 2.2480, -4.9620), 1.8731),
    ((35.0831, -44.1164, 3.7933), (35.0232, -40.0716, 1.5901), 1.8645),
    ((22.7233, 20.0904, -46.6940), (23.0331, 14.9730, -42.5619), 2.0373),
    ((36.4612, 47.8580, 18.3852), (36.2715, 50.5065, 21.2231), 1.4146),
    ((90.8027, -2.0831, 1.4410), (91.1528, -1.6435, 0.0447), 1.4441),
    ((90.9257, -0.5406, -0.9208), (88.6381, -0.8985, -0.7239), 1.5381),
    ((6.7747, -0.2908, -2.4247), (5.8714, -0.0985, -2.2286), 0.6377),
    ((2.0776, 0.0795, -1.1350), (0.9033, -0.0636, -0.5514), 0.9082),
]

# sRGB -> Lab 的參考值。**這一段 Sharma 驗不到**（它的輸入就是 Lab），
# 而「四支實作彼此相同」也驗不到（它們共用同一組矩陣）。
# 這四個是 sRGB 原色/中灰在 D65 2deg 下公佈的 CIELAB 值。
SRGB_REF = [
    ('#ffffff', (100.0000, 0.0000, 0.0000)),
    ('#000000', (0.0000, 0.0000, 0.0000)),
    ('#ff0000', (53.2408, 80.0925, 67.2032)),
    ('#00ff00', (87.7347, -86.1827, 83.1793)),
    ('#0000ff', (32.2970, 79.1875, -107.8602)),
    ('#808080', (53.5850, 0.0000, 0.0000)),
]


def selftest(verbose=True):
    """回 (ok, 訊息)。判定是算的：逐組比對最大誤差對容差。"""
    lines = []
    # --- 1. Lab -> dE00：Sharma 34 組
    TOL = 0.0001
    worst, worst_i = 0.0, -1
    for i, (l1, l2, want) in enumerate(SHARMA):
        got = de2000_lab(l1, l2)
        err = abs(got - want)
        if err > worst:
            worst, worst_i = err, i
    n_ok = sum(1 for l1, l2, w in SHARMA if abs(de2000_lab(l1, l2) - w) <= TOL)
    ok1 = n_ok == len(SHARMA)
    lines.append('Sharma et al. 34 組：%d/%d 在 %g 之內，最大誤差 %.6f（第 %d 組）'
                 % (n_ok, len(SHARMA), TOL, worst, worst_i + 1))

    # --- 2. dE00 的對稱性與自距離（分支只翻一半會壞掉的性質）
    cols = [c for c, _ in SRGB_REF] + ['#3a4a63', '#5c3a4a', '#e2645a', '#e6ecf7']
    asym = 0.0
    selfmax = 0.0
    for i in range(len(cols)):
        selfmax = max(selfmax, abs(de(cols[i], cols[i])))
        for j in range(i + 1, len(cols)):
            asym = max(asym, abs(de(cols[i], cols[j]) - de(cols[j], cols[i])))
    ok2 = asym <= 1e-9 and selfmax <= 1e-9
    lines.append('對稱性最大差 %.3e、自距離最大 %.3e（門檻 1e-9）' % (asym, selfmax))

    # --- 3. sRGB -> Lab：獨立參考值
    TOL3 = 0.02
    worst3, worst3_c = 0.0, ''
    for hx, want in SRGB_REF:
        got = srgb_to_lab(hx)
        e = max(abs(got[k] - want[k]) for k in range(3))
        if e > worst3:
            worst3, worst3_c = e, hx
    n_ok3 = sum(1 for hx, want in SRGB_REF
                if max(abs(srgb_to_lab(hx)[k] - want[k]) for k in range(3)) <= TOL3)
    ok3 = n_ok3 == len(SRGB_REF)
    lines.append('sRGB->Lab 參考值 %d/%d 在 %g 之內，最大誤差 %.4f（%s）'
                 % (n_ok3, len(SRGB_REF), TOL3, worst3, worst3_c))

    # --- 4. 儀器活著嗎：要看得到一個大的值
    bw = de('#000000', '#ffffff')
    ok4 = bw > 90
    lines.append('黑對白 ΔE = %.4f（要 > 90）' % bw)

    allok = ok1 and ok2 and ok3 and ok4
    if verbose:
        print('== 尺的校驗 ==')
        for s in lines:
            print('   ' + s)
        print('   => ' + ('全部通過' if allok else '**有一段沒過，下面的所有數字都不可信**'))
    return allok, lines


# ---------------------------------------------------------------- 讀產品檔

def strip_line_comments(src):
    out = []
    for ln in src.split('\n'):
        s = ln.lstrip()
        out.append('' if s.startswith('//') else ln)
    return '\n'.join(out)


def parse_sprites(path):
    src = strip_line_comments(open(path, encoding='utf-8').read())
    body = src[src.index('export const PEOPLE'):]
    people = {}
    pat = re.compile(
        r"(\w+)\s*:\s*\{\s*acc\s*:\s*'(#[0-9a-fA-F]{6})'\s*,\s*normal\s*:\s*\[(.*?)\]\s*,"
        r"\s*urgent\s*:\s*\[(.*?)\]\s*\}", re.S)
    order = []
    for m in pat.finditer(body):
        pid, acc, nrm, urg = m.group(1), m.group(2), m.group(3), m.group(4)
        rows_n = re.findall(r"'([^']*)'", nrm)
        rows_u = re.findall(r"'([^']*)'", urg)
        people[pid] = {'acc': acc, 'normal': rows_n, 'urgent': rows_u}
        order.append(pid)
    return people, order


def parse_theme(path):
    src = open(path, encoding='utf-8').read()
    canvas = src[:src.index('CSS_NIGHT')]          # 只要畫布調色盤

    def pick(k):
        m = re.search(r"\b%s\s*:\s*'(#[0-9a-fA-F]{6})'" % k, canvas)
        return m.group(1) if m else None
    ks = sorted(set(float(x.split(':')[1]) for x in re.findall(r"floor[AB]:\s*[0-9.]+", canvas)))
    return {'ink': pick('ink'), 'inkCar': pick('inkCar'), 'bad': pick('bad'),
            'car': pick('car'), 'floorK': ks}


def parse_bands(path):
    src = strip_line_comments(open(path, encoding='utf-8').read())
    blk = src[src.index('export const BANDS'):]
    blk = blk[:blk.index('];')]
    return [{'key': k, 'color': c} for k, c in
            re.findall(r"key\s*:\s*'(\w+)'[^\n]*?color\s*:\s*'(#[0-9a-fA-F]{6})'", blk)]


def parse_passengers(path):
    src = strip_line_comments(open(path, encoding='utf-8').read())
    blk = src[src.index('export const PASSENGERS'):]
    blk = blk[:blk.index('\n];')]
    return [{'id': i, 'band': b} for i, b in
            re.findall(r"id\s*:\s*'(\w+)'[^\n]*?band\s*:\s*'(\w+)'", blk)] + \
           [{'id': i, 'band': b} for i, b in
            re.findall(r"id\s*:\s*'(\w+)'(?:(?!\bid\s*:).)*?band\s*:\s*'(\w+)'", blk, re.S)]


# ---------------------------------------------------------------- 形狀

def cell3(ch):
    return 0 if ch == '.' else (1 if ch == '#' else 2)


def ham3(a, b):
    return sum(1 for r in range(9) for c in range(7) if cell3(a[r][c]) != cell3(b[r][c]))


def ham2(a, b):
    return sum(1 for r in range(9) for c in range(7) if (a[r][c] != '.') != (b[r][c] != '.'))


def shape_dist(p, q):
    return min(ham3(p['normal'], q['normal']), ham3(p['urgent'], q['urgent']))


def sil_dist(p, q):
    return min(ham2(p['normal'], q['normal']), ham2(p['urgent'], q['urgent']))


# ---------------------------------------------------------------- 判準

# tests/acceptance.js 的既有背債（身分棘輪）。這裡照抄是為了「新圖不可以讓它變糟」
# 這個問題問得對；**這張表不是我可以擴充的**——要加名字得先問 orchestrator。
SHAPE_DEBT = set("""
guest|office ceo|coffeegoer ceo|interviewee office|scientist courier|diner
courier|movie attendee|ceo attendee|coffeegoer ceo|remote ceo|tourist
closing|sampler interviewee|office interviewee|tourist office|waxer ceo|office
coffeegoer|interviewee coffeegoer|remote guard|tourist observer|office
observer|tourist office|stroller office|tourist scientist|tourist
attendee|nightowl child|guard courier|office dolly|office guard|interviewee
stroller|waxer
attendee|scientist blackouter|waxer ceo|diner ceo|observer ceo|scientist
child|observer coffeegoer|guest coffeegoer|scientist diner|newhire
dolly|guest guest|scientist guest|stroller guest|waxer homecomer|loaded
interviewee|observer interviewee|scientist laidoff|sampler laidoff|waxer
loaded|repairman movie|outager nightowl|scientist observer|remote
observer|scientist remote|scientist remote|waxer
""".split())

FLOOR_DEBT = set('tourist office queuer ceo child ghost stroller lateguest scientist'.split())
BODY_DEBT = set(['influencer'])
SIL_DEBT = set(['closing|sampler'])

ACC_MIN, BODY_MIN, FLOOR_MIN, SHAPE_MIN = 9.0, 25.0, 25.0, 12


class World(object):
    def __init__(self, root=ROOT, sprites_path=None, overlay=None):
        self.people, self.order = parse_sprites(sprites_path or os.path.join(root, 'js', 'sprites.js'))
        if overlay:
            with open(overlay, encoding='utf-8') as f:
                ov = json.load(f)
            for k, v in ov.items():
                assert len(v['normal']) == 9 and len(v['urgent']) == 9, k + ' 不是 9 列'
                assert all(len(r) == 7 for r in v['normal'] + v['urgent']), k + ' 有一列不是 7 格'
                bad = set(''.join(v['normal'] + v['urgent'])) - set('.#o')
                assert not bad, k + ' 有非法格子 ' + repr(bad)
                if k not in self.people:
                    self.order.append(k)
                self.people[k] = v
        self.pal = parse_theme(os.path.join(root, 'js', 'theme.js'))
        self.bands = parse_bands(os.path.join(root, 'js', 'content.js'))
        seen = {}
        for p in parse_passengers(os.path.join(root, 'js', 'content.js')):
            seen.setdefault(p['id'], p['band'])
        self.band_of = seen
        self.bgs = []
        for b in self.bands:
            for k in self.pal['floorK']:
                self.bgs.append((b['key'] + '@' + str(k), shade_hex(b['color'], k)))
        self.bgs.append(('轎廂內裝 ' + self.pal['car'], self.pal['car']))

    # --- 1 互斥
    def acc_mutual(self, pid):
        acc = self.people[pid]['acc']
        rows = [(o, de(acc, sp['acc'])) for o, sp in self.people.items() if o != pid]
        rows.sort(key=lambda x: x[1])
        return rows

    # --- 2 身體色（分姿勢）
    def body_min(self, pid):
        sp = self.people[pid]
        acc = sp['acc']
        nb = ''.join(sp['normal']).count('#')
        ub = ''.join(sp['urgent']).count('#')
        na = ''.join(sp['normal']).count('o')
        ua = ''.join(sp['urgent']).count('o')
        if nb == 0 and ub == 0:
            return None, '跳過（兩個姿勢都沒有身體格）'
        best, at = float('inf'), ''
        if nb > 0 and na > 0:
            for nm, c in (('pal.ink', self.pal['ink']), ('pal.inkCar', self.pal['inkCar'])):
                d = de(acc, c)
                if d < best:
                    best, at = d, 'normal 對 ' + nm
        if ub > 0 and ua > 0:
            d = de(acc, self.pal['bad'])
            if d < best:
                best, at = d, 'urgent 對 pal.bad'
        if best == float('inf'):
            return None, '跳過（沒有同時有身體與配件的姿勢）'
        return best, at

    # --- 3 背景
    def bg_min(self, pid):
        acc = self.people[pid]['acc']
        best, at = float('inf'), ''
        for nm, c in self.bgs:
            d = de(acc, c)
            if d < best:
                best, at = d, nm
        return best, at

    # --- 4/5 形狀與剪影
    def shape_rows(self, pid):
        ids = [i for i in self.people if i in self.band_of and i != pid]
        rows = [(o, shape_dist(self.people[pid], self.people[o])) for o in ids]
        rows.sort(key=lambda x: x[1])
        return rows

    def sil_rows(self, pid):
        ids = [i for i in self.people if i in self.band_of and i != pid]
        rows = [(o, sil_dist(self.people[pid], self.people[o])) for o in ids]
        rows.sort(key=lambda x: x[1])
        return rows


def key2(a, b):
    return a + '|' + b if a < b else b + '|' + a


def report(w, focus=None):
    """五條判準各算一次。**每一句判定都從算出來的數字產生**，沒有寫死的 PASS。"""
    ids = sorted(w.people)
    banded = [i for i in ids if i in w.band_of]
    fails = []
    print('== 母體 ==')
    print('   PEOPLE %d 張、其中在 PASSENGERS 裡的 %d 張；背景色 %d 種（%d 帶 x %d 個明暗 + 轎廂）'
          % (len(ids), len(banded), len(w.bgs), len(w.bands), len(w.pal['floorK'])))
    print('   身體色 ink=%s inkCar=%s bad=%s；轎廂 car=%s'
          % (w.pal['ink'], w.pal['inkCar'], w.pal['bad'], w.pal['car']))
    missing = [p for p in w.band_of if p not in w.people]
    print('   沒有圖的乘客型別：%s' % (('、'.join(missing)) if missing else '無'))

    # 1 互斥
    print('\n== 1 配件色互斥（ΔE >= %g）==' % ACC_MIN)
    allp = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            allp.append((key2(ids[i], ids[j]), de(w.people[ids[i]]['acc'], w.people[ids[j]]['acc'])))
    allp.sort(key=lambda x: x[1])
    bad = [x for x in allp if x[1] < ACC_MIN]
    print('   %d 組配對，%d 組低於門檻%s' % (len(allp), len(bad),
          ('：' + '、'.join('%s %.4f' % x for x in bad)) if bad else ''))
    print('   最小五組：' + '、'.join('%s %.4f' % x for x in allp[:5]))
    print('   12 以下 %d 組、10 以下 %d 組'
          % (sum(1 for x in allp if x[1] < 12), sum(1 for x in allp if x[1] < 10)))
    if bad:
        fails.append('判準1 互斥：%d 組' % len(bad))

    # 2 身體
    print('\n== 2 配件對身體色（ΔE >= %g，分姿勢）==' % BODY_MIN)
    bad2, tight2, skip2 = [], [], []
    for pid in ids:
        v, at = w.body_min(pid)
        if v is None:
            skip2.append(pid)
            continue
        if pid in BODY_DEBT:
            continue
        if v < BODY_MIN:
            bad2.append((pid, v, at))
        elif v < BODY_MIN + 1:
            tight2.append((pid, v, at))
    print('   %d 張低於門檻%s' % (len(bad2),
          ('：' + '、'.join('%s %.4f（%s）' % x for x in bad2)) if bad2 else ''))
    print('   跳過（沒有身體格）：%s' % ('、'.join(skip2) or '無'))
    tight2.sort(key=lambda x: x[1])
    print('   貼著門檻（25–26）：%s' % ('、'.join('%s %.4f' % (x[0], x[1]) for x in tight2) or '無'))
    if bad2:
        fails.append('判準2 身體色：%d 張' % len(bad2))

    # 3 背景
    print('\n== 3 配件對背景（ΔE >= %g，%d 種）==' % (FLOOR_MIN, len(w.bgs)))
    bad3, tight3 = [], []
    for pid in ids:
        v, at = w.bg_min(pid)
        if pid in FLOOR_DEBT:
            continue
        if v < FLOOR_MIN:
            bad3.append((pid, v, at))
        else:
            tight3.append((pid, v, at))
    tight3.sort(key=lambda x: x[1])
    print('   %d 張低於門檻%s' % (len(bad3),
          ('：' + '、'.join('%s %.4f @%s' % x for x in bad3)) if bad3 else ''))
    print('   最貼近門檻的五張：' + '、'.join('%s %.4f @%s' % x for x in tight3[:5]))
    if bad3:
        fails.append('判準3 背景：%d 張' % len(bad3))

    # 4 形狀
    print('\n== 4 形狀（三態 Hamming >= %d，兩姿勢取 min）==' % SHAPE_MIN)
    bad4, low4 = [], []
    for i in range(len(banded)):
        for j in range(i + 1, len(banded)):
            x, y = banded[i], banded[j]
            k = key2(x, y)
            d = shape_dist(w.people[x], w.people[y])
            if k in SHAPE_DEBT:
                continue
            if d < SHAPE_MIN:
                bad4.append((k, d))
            low4.append((k, d))
    low4.sort(key=lambda x: x[1])
    print('   %d 組低於門檻%s' % (len(bad4),
          ('：' + '、'.join('%s d=%d' % x for x in bad4)) if bad4 else ''))
    print('   非背債裡最小五組：' + '、'.join('%s d=%d' % x for x in low4[:5]))
    if bad4:
        fails.append('判準4 形狀：%d 組' % len(bad4))

    # 4b 背債表沒有過期
    stale = [k for k in SHAPE_DEBT
             if all(p in w.people and p in w.band_of for p in k.split('|'))
             and shape_dist(w.people[k.split('|')[0]], w.people[k.split('|')[1]]) >= SHAPE_MIN]
    gone = [k for k in SHAPE_DEBT if any(p not in w.people or p not in w.band_of for p in k.split('|'))]
    print('   形狀背債表 %d 筆：過期 %d、消失 %d' % (len(SHAPE_DEBT), len(stale), len(gone)))
    if stale or gone:
        fails.append('形狀背債表過期 %d 筆' % (len(stale) + len(gone)))

    # 5 剪影
    print('\n== 5 剪影（二態 Hamming != 0）==')
    same, known = [], []
    sil_low = []
    for i in range(len(banded)):
        for j in range(i + 1, len(banded)):
            x, y = banded[i], banded[j]
            d = sil_dist(w.people[x], w.people[y])
            sil_low.append((key2(x, y), d))
            if d != 0:
                continue
            (known if key2(x, y) in SIL_DEBT else same).append(key2(x, y))
    sil_low.sort(key=lambda x: x[1])
    print('   %d 組**新的**剪影一模一樣%s' % (len(same), ('：' + '、'.join(same)) if same else ''))
    print('   已知背債：%s' % ('、'.join(known) or '無'))
    print('   最小五組：' + '、'.join('%s %d' % x for x in sil_low[:5]))
    if same:
        fails.append('判準5 剪影：%d 組' % len(same))

    # 6 分支斷崖：有沒有任何一條判定的真假取決於 CIEDE2000 走了哪一側
    print('\n== 6 分支斷崖（色相差 180 度 ±1 度以內的配對，兩側都算）==')
    EPS = 1.0
    body_cols = [w.pal['ink'], w.pal['inkCar'], w.pal['bad']]
    accs = [(i, w.people[i]['acc']) for i in ids]
    axes = [('配件×背景', 25.0, [(i, a, c) for i, a in accs for _, c in w.bgs]),
            ('配件×配件', 9.0, [(accs[i][0] + '/' + accs[j][0], accs[i][1], accs[j][1])
                              for i in range(len(accs)) for j in range(i + 1, len(accs))]),
            ('配件×身體色', 25.0, [(i, a, c) for i, a in accs for c in body_cols])]
    flips = 0
    for name, thr, pairs in axes:
        near_n, closest = 0, float('inf')
        for label, h1, h2 in pairs:
            dA, gap = de_side(h1, h2, 'near')
            if abs(gap - 180) >= EPS:
                continue
            near_n += 1
            dB, _ = de_side(h1, h2, 'far')
            closest = min(closest, dA, dB)
            if (dA >= thr) != (dB >= thr):
                flips += 1
                print('   **翻面** %s %s：一側 %.4f、另一側 %.4f，門檻 %g'
                      % (name, label, dA, dB, thr))
        print('   %-12s %5d 對，%d 對在邊界 ±%g 度內%s'
              % (name, len(pairs), near_n, EPS,
                 ('，最近門檻的是 %.2f（門檻 %g）' % (closest, thr)) if near_n else ''))
    if flips:
        fails.append('判準6 分支斷崖：%d 對翻面' % flips)

    # 自洽：對稱 + 自距離為零，兩側都要
    cols = sorted(set([a for _, a in accs] + [c for _, c in w.bgs] + body_cols))
    asym_bad = []
    for side in ('near', 'far'):
        mx, at = 0.0, ''
        for i in range(len(cols)):
            if abs(de_side(cols[i], cols[i], side)[0]) > 1e-9:
                asym_bad.append('%s：%s 對自己不是 0' % (side, cols[i]))
            for j in range(i + 1, len(cols)):
                d = abs(de_side(cols[i], cols[j], side)[0] - de_side(cols[j], cols[i], side)[0])
                if d > mx:
                    mx, at = d, cols[i] + '/' + cols[j]
        print('   自洽 %-4s 側：最大不對稱 %.3e（%s）' % (side, mx, at))
        if mx > 1e-9:
            asym_bad.append('%s 側不對稱 %.6f' % (side, mx))
    if asym_bad:
        fails.append('色距函式不自洽：' + '；'.join(asym_bad))

    # focus：新圖逐張的細帳
    if focus:
        print('\n== 逐張細帳（%d 張）==' % len(focus))
        for pid in focus:
            if pid not in w.people:
                print('   %-9s **沒有圖**' % pid)
                continue
            sp = w.people[pid]
            b, bat = w.body_min(pid)
            g, gat = w.bg_min(pid)
            mu = w.acc_mutual(pid)
            sh = w.shape_rows(pid)
            si = w.sil_rows(pid)
            print('   %-9s %s  互斥 %.4f(%s) 身體 %s(%s) 背景 %.4f(@%s) 形狀 d=%d(%s) 剪影 %d(%s)'
                  % (pid, sp['acc'], mu[0][1], mu[0][0],
                     ('%.4f' % b) if b is not None else 'n/a', bat,
                     g, gat, sh[0][1], sh[0][0], si[0][1], si[0][0]))

    print('\n== 判定 ==')
    if fails:
        print('   **不通過**：' + '；'.join(fails))
    else:
        print('   五條判準全部通過（%d 張圖、%d 組配對、%d 種背景色）'
              % (len(ids), len(allp), len(w.bgs)))
    # 回**清單**不是布林：紅隊要問「紅的是哪一條」，而一個布林答不出來。
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=ROOT)
    ap.add_argument('--sprites', default=None)
    ap.add_argument('--overlay', default=None)
    ap.add_argument('--focus', default='')
    ap.add_argument('--selftest-only', action='store_true')
    ap.add_argument('--quiet-selftest', action='store_true')
    a = ap.parse_args()

    ok, _ = selftest(verbose=not a.quiet_selftest)
    if not ok:
        print('\n尺沒有校驗過，不繼續。')
        return 2
    if a.selftest_only:
        return 0
    if not a.quiet_selftest:
        print()
    w = World(a.root, a.sprites, a.overlay)
    fails = report(w, [x for x in a.focus.split(',') if x])
    return 0 if not fails else 1


if __name__ == '__main__':
    sys.exit(main())
