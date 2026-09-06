# -*- coding: utf-8 -*-
"""art/resid 的量測核心。**不從產品讀任何演算法**：
CIEDE2000 與 shadeHex 都在這裡各自寫一次，然後跟 tests/acceptance.js 的實作對數字。
兩個獨立實作差 0.0022 是已知的（#84 量過），所以這裡一律回 float，**不格式化**；
只有印出來的那一步才 :.4f。
"""
import re, os, math
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------- 解析產品資料
def parse_people(path=None):
    """js/sprites.js -> {id: {'acc': '#rrggbb', 'normal': [9 strs], 'urgent': [9 strs]}}"""
    src = open(path or os.path.join(ROOT, 'js', 'sprites.js'), encoding='utf-8').read()
    body = src[src.index('export const PEOPLE'):]
    out = {}
    pat = re.compile(
        r"^  (\w+): \{ acc: '(#[0-9a-fA-F]{6})', normal: \[(.*?)\], urgent: \[(.*?)\]\}",
        re.S | re.M)
    for m in pat.finditer(body):
        rows = lambda blob: re.findall(r"'([.#o]{7})'", blob)
        n, u = rows(m.group(3)), rows(m.group(4))
        assert len(n) == 9 and len(u) == 9, (m.group(1), len(n), len(u))
        out[m.group(1)] = {'acc': m.group(2).lower(), 'normal': n, 'urgent': u}
    return out


def parse_passengers(path=None):
    """js/content.js -> {id: band}"""
    src = open(path or os.path.join(ROOT, 'js', 'content.js'), encoding='utf-8').read()
    seg = src[src.index('export const PASSENGERS'):src.index('export const BANDS')]
    return {m.group(1): m.group(2)
            for m in re.finditer(r"\{\s*id:'(\w+)'.*?band:'(\w+)'", seg, re.S)}


def parse_bands(path=None):
    src = open(path or os.path.join(ROOT, 'js', 'content.js'), encoding='utf-8').read()
    seg = src[src.index('export const BANDS'):]
    seg = seg[:seg.index('];')]
    return [(m.group(1), m.group(2).lower())
            for m in re.finditer(r"key:'(\w+)',.*?color:'(#[0-9a-fA-F]{6})'", seg, re.S)]


def parse_floor_k(path=None):
    """theme.js 的每一種 floorA/floorB —— **從產品讀，不從設計文件抄**，
    跟 acceptance.js 第 16 組同一個作法（有人加第三套主題也會被抓進來）。"""
    src = open(path or os.path.join(ROOT, 'js', 'theme.js'), encoding='utf-8').read()
    return sorted(set(float(m.group(1)) for m in re.finditer(r'floor[AB]:\s*([0-9.]+)', src)))


def parse_pal_body(path=None):
    """三種身體色：pal.ink（樓層）、pal.inkCar（轎廂）、pal.bad（urgent）。"""
    src = open(path or os.path.join(ROOT, 'js', 'theme.js'), encoding='utf-8').read()
    ink = sorted(set(m.group(1).lower() for m in re.finditer(r"ink:\s*'(#[0-9a-fA-F]{6})'", src)))
    car = sorted(set(m.group(1).lower() for m in re.finditer(r"inkCar:\s*'(#[0-9a-fA-F]{6})'", src)))
    # `money: '#5ddc9a', bad: '#e2645a', warn: ...` —— bad 跟 money 同一行，所以不能綁行首。
    # 只取 money/bad/warn 那一組（第 101/107 行另有兩個 UI 用的 bad，不是 render.js 476 行讀的那個）。
    bad = sorted(set(m.group(1).lower()
                     for m in re.finditer(r"money:\s*'#[0-9a-fA-F]{6}',\s*bad:\s*'(#[0-9a-fA-F]{6})'", src)))
    return ink, car, bad


# ---------------------------------------------------------------- shadeHex（逐字對照 render.js）
SHADE_SIG = 'out |= Math.min(255, Math.round(((n >> sh) & 255) * k)) << sh'


def shade_hex(hexs, k):
    n = int(hexs[1:], 16)
    out = 0
    for sh in (16, 8, 0):
        # JS 的 Math.round 是 half-up（不是 banker's rounding），所以不能用 python round()
        v = ((n >> sh) & 255) * k
        out |= min(255, int(math.floor(v + 0.5))) << sh
    return '#%06x' % out


def shade_src_ok():
    src = open(os.path.join(ROOT, 'js', 'render.js'), encoding='utf-8').read()
    return SHADE_SIG in src


# ---------------------------------------------------------------- CIEDE2000（獨立實作，向量化）
def hex_to_rgb(h):
    n = int(h[1:], 16)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


def rgb_to_lab(rgb):
    """rgb: (...,3) uint8/float 0-255 -> Lab (...,3)"""
    v = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[..., 0], lin[..., 1], lin[..., 2]
    X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750)
    Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883
    def f(t):
        return np.where(t > 0.008856451679, np.cbrt(t), (903.2962962 * t + 16) / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=-1)


def lab(h):
    return rgb_to_lab(hex_to_rgb(h))


def de2000(lab1, lab2):
    """CIEDE2000。lab1/lab2 broadcast 得起來的 (...,3)。回 float，**不格式化**。"""
    lab1 = np.asarray(lab1, dtype=np.float64)
    lab2 = np.asarray(lab2, dtype=np.float64)
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2.0
    Cb7 = Cb ** 7
    G = 0.5 * (1 - np.sqrt(Cb7 / (Cb7 + 25.0 ** 7)))
    A1, A2 = (1 + G) * a1, (1 + G) * a2
    Cp1, Cp2 = np.hypot(A1, b1), np.hypot(A2, b2)

    def hue(x, y):
        t = np.degrees(np.arctan2(y, x))
        t = np.where(t < 0, t + 360, t)
        return np.where((x == 0) & (y == 0), 0.0, t)

    hp1, hp2 = hue(A1, b1), hue(A2, b2)
    dL, dC = L2 - L1, Cp2 - Cp1
    prod = Cp1 * Cp2
    dh = hp2 - hp1
    dh = np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh))
    dh = np.where(prod == 0, 0.0, dh)
    dH = 2 * np.sqrt(prod) * np.sin(np.radians(dh / 2.0))
    Lb = (L1 + L2) / 2.0
    Cpb = (Cp1 + Cp2) / 2.0
    hsum = hp1 + hp2
    hb = np.where(prod == 0, hsum,
         np.where(np.abs(hp1 - hp2) <= 180, hsum / 2.0,
                  (hsum + np.where(hsum < 360, 360.0, -360.0)) / 2.0))
    T = (1 - 0.17 * np.cos(np.radians(hb - 30)) + 0.24 * np.cos(np.radians(2 * hb))
         + 0.32 * np.cos(np.radians(3 * hb + 6)) - 0.20 * np.cos(np.radians(4 * hb - 63)))
    dTh = 30 * np.exp(-(((hb - 275) / 25.0) ** 2))
    Cpb7 = Cpb ** 7
    Rc = 2 * np.sqrt(Cpb7 / (Cpb7 + 25.0 ** 7))
    Sl = 1 + (0.015 * (Lb - 50) ** 2) / np.sqrt(20 + (Lb - 50) ** 2)
    Sc = 1 + 0.045 * Cpb
    Sh = 1 + 0.015 * Cpb * T
    Rt = -np.sin(np.radians(2 * dTh)) * Rc
    return np.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2
                   + Rt * (dC / Sc) * (dH / Sh))


def de_hex(h1, h2):
    return float(de2000(lab(h1), lab(h2)))


# ---------------------------------------------------------------- 形狀距離（逐字對照第 15 組）
_CELL = {'.': 0, '#': 1, 'o': 2}


def ham(a, b):
    return sum(1 for r in range(9) for c in range(7) if _CELL[a[r][c]] != _CELL[b[r][c]])


def shape_dist(pa, pb):
    return min(ham(pa['normal'], pb['normal']), ham(pa['urgent'], pb['urgent']))


# ---------------------------------------------------------------- 派生集合
def floor_shades():
    ks = parse_floor_k()
    return [(bk + '@' + repr(k), shade_hex(bc, k)) for bk, bc in parse_bands() for k in ks]


def body_colors():
    ink, car, bad = parse_pal_body()
    return [('ink:' + c, c) for c in ink] + [('inkCar:' + c, c) for c in car] \
         + [('bad:' + c, c) for c in bad]
