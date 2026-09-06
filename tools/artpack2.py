# -*- coding: utf-8 -*-
"""比 artpack 更用力的搜尋：每個門檻用「所有點當起點」的貪婪 + 交換改良。
另外報色相可用性——「哪一種字面顏色保不住」要有數字。"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artlib as A
import artcolor as C
import numpy as np

_C = os.path.join(A.ROOT, 'tools', '_cand_rgb.npy')
if not os.path.exists(_C):
    raise SystemExit('先跑 `python tools/artfull.py 25 25 9.0`，它會掃全 sRGB 並存下 '
                     'tools/_cand_*.npy（約 5 分鐘、12MB，刻意不進版本庫）。')

RGB = np.load(os.path.join(A.ROOT, 'tools', '_cand_rgb.npy'))
ACC = np.load(os.path.join(A.ROOT, 'tools', '_cand_acc.npy'))
FLR = np.load(os.path.join(A.ROOT, 'tools', '_cand_floor.npy'))
LAB = A.rgb_to_lab(RGB)
HUE = np.degrees(np.arctan2(LAB[:, 2], LAB[:, 1])) % 360
WANT = 9

BINS = [('紅', 0, 30), ('橙', 30, 60), ('黃', 60, 100), ('綠', 100, 160),
        ('青', 160, 220), ('藍', 220, 280), ('紫', 280, 330), ('洋紅', 330, 360)]


def cmd_hue():
    for t in [12.0, 11.5, 11.0, 10.5, 10.0]:
        for fm in [25.0, 28.0]:
            m = (ACC >= t) & (FLR >= fm)
            if m.sum() == 0:
                print('acc>=%-5.1f floor>=%-4.1f  —— 0 點' % (t, fm)); continue
            h = HUE[m]
            parts = []
            for nm, lo, hi in BINS:
                n = int(((h >= lo) & (h < hi)).sum())
                parts.append('%s %d' % (nm, n))
            L = LAB[m][:, 0]
            print('acc>=%-5.1f floor>=%-4.1f  %6d 點  L* %.1f–%.1f  | %s'
                  % (t, fm, int(m.sum()), L.min(), L.max(), '  '.join(parts)))


def pack(t, floor_min, starts=400, seed=1):
    m = (ACC >= t) & (FLR >= floor_min)
    if m.sum() < WANT:
        return None
    lab, rgb = LAB[m], RGB[m]
    n = len(lab)
    rng = np.random.default_rng(seed)
    order = rng.permutation(n)[:starts] if n > starts else np.arange(n)
    for start in order:
        sel = [int(start)]
        dmin = A.de2000(lab, lab[int(start)])
        while len(sel) < WANT:
            i = int(np.argmax(dmin))
            if dmin[i] < t:
                break
            sel.append(i)
            dmin = np.minimum(dmin, A.de2000(lab, lab[i]))
        if len(sel) == WANT:
            return rgb[sel]
    return None


def cmd_max():
    floor_min = float(sys.argv[2]) if len(sys.argv) > 2 else 25.0
    lo, hi, bestset = 8.0, 12.5, None
    for _ in range(22):
        mid = (lo + hi) / 2
        s = pack(mid, floor_min)
        if s is not None:
            lo, bestset = mid, s
        else:
            hi = mid
    print('地板門檻 %.1f：9 個新色撐得到的最大互斥門檻 t = %.4f' % (floor_min, lo))
    if bestset is None:
        print('  找不到解'); return
    hexes = ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in bestset]
    exist = list({i: s['acc'] for i, s in C.P.items()}.values())
    allc = exist + hexes
    mn = min(A.de_hex(h, c) for h in hexes for c in allc if c != h)
    print('  一組解 (%d)：%s' % (len(hexes), ' '.join(hexes)))
    print('  複驗最小 ΔE = %.4f' % mn)
    for h in hexes:
        f = min(A.de_hex(h, s) for _, s in A.floor_shades())
        b = min(A.de_hex(h, c) for _, c in A.body_colors())
        hu = float(np.degrees(np.arctan2(A.lab(h)[2], A.lab(h)[1])) % 360)
        print('    %s  地板 %8.4f  身體 %8.4f  hue %6.1f  L* %5.1f' % (h, f, b, hu, A.lab(h)[0]))


def cmd_near():
    """給一個想要的字面色，回傳「在可行域裡離它最近的點」——保不住的時候要說出代價。"""
    want = sys.argv[2]
    t = float(sys.argv[3]) if len(sys.argv) > 3 else 11.2
    fm = float(sys.argv[4]) if len(sys.argv) > 4 else 28.0
    m = (ACC >= t) & (FLR >= fm)
    d = A.de2000(LAB[m], A.lab(want))
    i = int(np.argmin(d))
    r, g, b = RGB[m][i]
    print('%s -> #%02x%02x%02x  （偏離 ΔE %.4f）  acc %.4f  floor %.4f'
          % (want, r, g, b, float(d[i]), ACC[m][i], FLR[m][i]))


if __name__ == '__main__':
    globals()['cmd_' + (sys.argv[1] if len(sys.argv) > 1 else 'hue')]()
