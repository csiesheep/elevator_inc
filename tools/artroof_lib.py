# artroof_lib.py — 屋頂帶五張圖的量尺。
#
# 這支檔案只做兩件事：
#   1. 從**產品檔**（js/sprites.js、js/theme.js、js/content.js）解析出圖與顏色。
#      **不從設計文件抄、不寫死任何一個 hex**——寫死的常數會安靜地跟產品漂移。
#   2. 提供一支自己實作的 CIEDE2000，並拿 Sharma/Wu/Dalal (2005) 的 34 組
#      校驗資料對過（`artroof_selftest.py`）。
#
# ⚠ 為什麼要自己實作而不是抄 tests/acceptance.js：抄過來的話，我量到的
#   「通過」只證明我跟 harness 有同一個 bug。上一趟的 artist 寫了四支實作、
#   彼此差 0.000000，而那四支**共用同一組 sRGB→XYZ 矩陣**——一致不等於對。
#   所以這裡的校驗資料是 **Lab 直接進、不經過 sRGB**，繞開矩陣這一層。
import re, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- 解析產品檔
def _read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

def load_people(src=None):
    """js/sprites.js → {id: {'acc': '#rrggbb', 'normal': [9 x 7 str], 'urgent': [...]}}"""
    s = _read('js/sprites.js') if src is None else src
    # 只吃 PEOPLE 那個物件裡的東西
    body = s[s.index('export const PEOPLE'):]
    out = {}
    pat = re.compile(
        r"^  (\w+): \{ acc: '(#[0-9a-fA-F]{6})', normal: \[(.*?)\], urgent: \[(.*?)\]\}",
        re.S | re.M)
    for m in pat.finditer(body):
        rid, acc, nrm, urg = m.groups()
        rows = lambda blk: re.findall(r"'([.#o]{7})'", blk)
        n, u = rows(nrm), rows(urg)
        assert len(n) == 9 and len(u) == 9, (rid, len(n), len(u))
        out[rid] = {'acc': acc, 'normal': n, 'urgent': u}
    return out

def load_palette():
    """js/theme.js 的**畫布**調色盤（NIGHT/DAY，不含 CSS_*）。"""
    s = _read('js/theme.js')
    canvas = s[:s.index('CSS_NIGHT')]
    pick = lambda k: re.search(r"\b%s:\s*'(#[0-9a-fA-F]{6})'" % k, canvas).group(1)
    ks = sorted(set(float(x) for x in re.findall(r"floor[AB]:\s*([0-9.]+)", canvas)))
    return {'ink': pick('ink'), 'inkCar': pick('inkCar'), 'bad': pick('bad'),
            'car': pick('car'), 'floorK': ks}

def load_bands():
    s = _read('js/content.js')
    blk = s[s.index('export const BANDS'):]
    blk = blk[:blk.index('\n];')]
    return [{'key': k, 'color': c} for k, c in
            re.findall(r"key:'(\w+)',[^\n]*?color:'(#[0-9a-fA-F]{6})'", blk)]

def load_passengers():
    """content.js 的 PASSENGERS：只要 id 與 band（第 15/17 組用 band 過濾）。"""
    s = _read('js/content.js')
    blk = s[s.index('export const PASSENGERS'):]
    blk = blk[:blk.index('\n];')]
    return re.findall(r"\{ id:'(\w+)',", blk)

# shadeHex：從 render.js 逐字抄，並且**檢查抄本沒有漂移**（跟 harness 同一個作法）
SHADE_SIG = 'out |= Math.min(255, Math.round(((n >> sh) & 255) * k)) << sh'
def shade_hex(hexs, k):
    n = int(hexs[1:], 16)
    out = 0
    for sh in (16, 8, 0):
        out |= min(255, round(((n >> sh) & 255) * k)) << sh
    return '#%06x' % out

def shade_src_ok():
    return SHADE_SIG in _read('js/render.js')

def backgrounds():
    """29 種：7 帶 × 4 個明暗係數 + 轎廂內裝。"""
    pal, bands = load_palette(), load_bands()
    out = [(b['key'] + '@' + repr(k), shade_hex(b['color'], k))
           for b in bands for k in pal['floorK']]
    out.append(('轎廂內裝 ' + pal['car'], pal['car']))
    return out

# ---------------------------------------------------------------- CIEDE2000
def hex_to_lab(h):
    n = int(h[1:], 16)
    rgb = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    lin = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    r, g, b = lin
    X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750)
    Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))

def de2000_lab(lab1, lab2, kL=1.0, kC=1.0, kH=1.0):
    """CIEDE2000，Lab 直接進。獨立寫的：跟 tests/acceptance.js 的那支
    唯一共同的東西是那條公式本身，而校驗資料繞開了 sRGB→XYZ 這一層。"""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    C1 = math.hypot(a1, b1); C2 = math.hypot(a2, b2)
    Cbar = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25.0 ** 7))) if Cbar > 0 else 0.5
    ap1, ap2 = (1 + G) * a1, (1 + G) * a2
    Cp1, Cp2 = math.hypot(ap1, b1), math.hypot(ap2, b2)
    def hp(ap, bp):
        if ap == 0 and bp == 0: return 0.0
        d = math.degrees(math.atan2(bp, ap))
        return d + 360 if d < 0 else d
    hp1, hp2 = hp(ap1, b1), hp(ap2, b2)
    dLp = L2 - L1
    dCp = Cp2 - Cp1
    if Cp1 * Cp2 == 0:
        dhp = 0.0
    else:
        dhp = hp2 - hp1
        if dhp > 180: dhp -= 360
        elif dhp < -180: dhp += 360
    dHp = 2 * math.sqrt(Cp1 * Cp2) * math.sin(math.radians(dhp / 2))
    Lbp = (L1 + L2) / 2
    Cbp = (Cp1 + Cp2) / 2
    if Cp1 * Cp2 == 0:
        hbp = hp1 + hp2
    elif abs(hp1 - hp2) <= 180:
        hbp = (hp1 + hp2) / 2
    else:
        hbp = (hp1 + hp2 + 360) / 2 if (hp1 + hp2) < 360 else (hp1 + hp2 - 360) / 2
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30))
           + 0.24 * math.cos(math.radians(2 * hbp))
           + 0.32 * math.cos(math.radians(3 * hbp + 6))
           - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dth = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7)) if Cbp > 0 else 0.0
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dth)) * Rc
    return math.sqrt((dLp / (kL * Sl)) ** 2 + (dCp / (kC * Sc)) ** 2
                     + (dHp / (kH * Sh)) ** 2
                     + Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)))

def de(h1, h2):
    return de2000_lab(hex_to_lab(h1), hex_to_lab(h2))

# ---------------------------------------------------------------- 形狀
def tri(ch):   return 0 if ch == '.' else (1 if ch == '#' else 2)
def tri_ham(a, b):
    return sum(1 for r in range(9) for c in range(7) if tri(a[r][c]) != tri(b[r][c]))
def sil_ham(a, b):
    return sum(1 for r in range(9) for c in range(7)
               if (a[r][c] != '.') != (b[r][c] != '.'))

def shape_dist(P, x, y):
    return min(tri_ham(P[x]['normal'], P[y]['normal']),
               tri_ham(P[x]['urgent'], P[y]['urgent']))
def sil_dist(P, x, y):
    return min(sil_ham(P[x]['normal'], P[y]['normal']),
               sil_ham(P[x]['urgent'], P[y]['urgent']))

# ---------------------------------------------------------------- Sharma 校驗資料
# Sharma, Wu & Dalal (2005), "The CIEDE2000 color-difference formula:
# implementation notes, supplementary test data, and mathematical observations",
# Color Research & Application 30(1), 21-30. 表格是 34 組 Lab 對。
# ⚠ 第 9–15 組正是**平均色相 180° 分支**那一段——上一趟的量尺就是在那裡壞掉的。
SHARMA = [
 ((50.0000,2.6772,-79.7751),(50.0000,0.0000,-82.7485),2.0425),
 ((50.0000,3.1571,-77.2803),(50.0000,0.0000,-82.7485),2.8615),
 ((50.0000,2.8361,-74.0200),(50.0000,0.0000,-82.7485),3.4412),
 ((50.0000,-1.3802,-84.2814),(50.0000,0.0000,-82.7485),1.0000),
 ((50.0000,-1.1848,-84.8006),(50.0000,0.0000,-82.7485),1.0000),
 ((50.0000,-0.9009,-85.5211),(50.0000,0.0000,-82.7485),1.0000),
 ((50.0000,0.0000,0.0000),(50.0000,-1.0000,2.0000),2.3669),
 ((50.0000,-1.0000,2.0000),(50.0000,0.0000,0.0000),2.3669),
 ((50.0000,2.4900,-0.0010),(50.0000,-2.4900,0.0009),7.1792),
 ((50.0000,2.4900,-0.0010),(50.0000,-2.4900,0.0010),7.1792),
 ((50.0000,2.4900,-0.0010),(50.0000,-2.4900,0.0011),7.2195),
 ((50.0000,2.4900,-0.0010),(50.0000,-2.4900,0.0012),7.2195),
 ((50.0000,-0.0010,2.4900),(50.0000,0.0009,-2.4900),4.8045),
 ((50.0000,-0.0010,2.4900),(50.0000,0.0010,-2.4900),4.8045),
 ((50.0000,-0.0010,2.4900),(50.0000,0.0011,-2.4900),4.7461),
 ((50.0000,2.5000,0.0000),(50.0000,0.0000,-2.5000),4.3065),
 ((50.0000,2.5000,0.0000),(73.0000,25.0000,-18.0000),27.1492),
 ((50.0000,2.5000,0.0000),(61.0000,-5.0000,29.0000),22.8977),
 ((50.0000,2.5000,0.0000),(56.0000,-27.0000,-3.0000),31.9030),
 ((50.0000,2.5000,0.0000),(58.0000,24.0000,15.0000),19.4535),
 ((50.0000,2.5000,0.0000),(50.0000,3.1736,0.5854),1.0000),
 ((50.0000,2.5000,0.0000),(50.0000,3.2972,0.0000),1.0000),
 ((50.0000,2.5000,0.0000),(50.0000,1.8634,0.5757),1.0000),
 ((50.0000,2.5000,0.0000),(50.0000,3.2592,0.3350),1.0000),
 ((60.2574,-34.0099,36.2677),(60.4626,-34.1751,39.4387),1.2644),
 ((63.0109,-31.0961,-5.8663),(62.8187,-29.7946,-4.0864),1.2630),
 ((61.2901,3.7196,-5.3901),(61.4292,2.2480,-4.9620),1.8731),
 ((35.0831,-44.1164,3.7933),(35.0232,-40.0716,1.5901),1.8645),
 ((22.7233,20.0904,-46.6940),(23.0331,14.9730,-42.5619),2.0373),
 ((36.4612,47.8580,18.3852),(36.2715,50.5065,21.2231),1.4146),
 ((90.8027,-2.0831,1.4410),(91.1528,-1.6435,0.0447),1.4441),
 ((90.9257,-0.5406,-0.9208),(88.6381,-0.8985,-0.7239),1.5381),
 ((6.7747,-0.2908,-2.4247),(5.8714,-0.0985,-2.2286),0.6377),
 ((2.0776,0.0795,-1.1350),(0.9033,-0.0636,-0.5514),0.9082),
]
