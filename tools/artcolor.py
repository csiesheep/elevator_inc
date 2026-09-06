# -*- coding: utf-8 -*-
"""配件色的可行域掃描 + 挑選。**只在最後印出來才格式化，而且四位小數。**"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artlib as A
import numpy as np

P = A.parse_people()
SHADES = [h for _, h in A.floor_shades()]
BODY = [h for _, h in A.body_colors()]
EXIST = sorted(set(s['acc'] for s in P.values()))

FLOOR_MIN = 25.0
BODY_MIN = 25.0
ACC_MIN = 12.0


def grid(step):
    v = np.arange(0, 256, step, dtype=np.int32)
    r, g, b = np.meshgrid(v, v, v, indexing='ij')
    return np.stack([r.ravel(), g.ravel(), b.ravel()], axis=-1)


def feasible(step=4, floor_min=FLOOR_MIN, body_min=BODY_MIN, acc_min=ACC_MIN, against=None):
    pts = grid(step)
    labs = A.rgb_to_lab(pts)                     # (N,3)
    n = len(pts)
    okm = np.ones(n, dtype=bool)
    mins_floor = np.full(n, np.inf)
    for h in SHADES:
        d = A.de2000(labs, A.lab(h))
        mins_floor = np.minimum(mins_floor, d)
    okm &= mins_floor >= floor_min
    for h in BODY:
        okm &= A.de2000(labs, A.lab(h)) >= body_min
    for h in (EXIST if against is None else against):
        okm &= A.de2000(labs, A.lab(h)) >= acc_min
    return pts, labs, okm, mins_floor


def cmd_scan():
    step = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    fmin = float(sys.argv[3]) if len(sys.argv) > 3 else FLOOR_MIN
    pts, labs, ok, mf = feasible(step, floor_min=fmin)
    n = len(pts)
    k = int(ok.sum())
    print('step=%d  母體 %d 點  地板門檻 %.1f' % (step, n, fmin))
    print('  同時滿足三條硬判準：%d / %d（%.4f%%）' % (k, n, 100.0 * k / n))
    if k == 0:
        return
    L = labs[ok][:, 0]
    print('  L* 範圍 %.4f .. %.4f' % (L.min(), L.max()))
    rgb = pts[ok]
    # 色相分佈（用 Lab 的 hue angle）
    h = np.degrees(np.arctan2(labs[ok][:, 2], labs[ok][:, 1])) % 360
    bins = {}
    for name, lo, hi in [('紅 0-30', 0, 30), ('橙 30-60', 30, 60), ('黃 60-100', 60, 100),
                         ('綠 100-160', 100, 160), ('青 160-220', 160, 220),
                         ('藍 220-280', 220, 280), ('紫 280-330', 280, 330), ('洋紅 330-360', 330, 360)]:
        bins[name] = int(((h >= lo) & (h < hi)).sum())
    print('  Lab 色相分佈：', bins)
    print('  地板餘裕最大的 8 點：')
    idx = np.argsort(-mf[ok])[:8]
    for i in idx:
        r, g, b = rgb[i]
        print('    #%02x%02x%02x  floor %.4f  L* %.4f' % (r, g, b, mf[ok][i], labs[ok][i][0]))


def cmd_pick():
    """貪婪 + 局部改良：挑 9 個彼此 >= ACC_MIN、對地板 >= target 的點。"""
    step = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    target = float(sys.argv[3]) if len(sys.argv) > 3 else 28.0
    want = 9
    pts, labs, ok, mf = feasible(step, floor_min=target)
    cand = labs[ok]
    crgb = pts[ok]
    cmf = mf[ok]
    print('候選 %d 點（地板 >= %.1f）' % (len(cand), target))
    if len(cand) == 0:
        return
    # 貪婪：每次挑「離已選集合最遠」的點，起點取地板餘裕最大的
    sel = [int(np.argmax(cmf))]
    dmin = A.de2000(cand, cand[sel[0]])
    while len(sel) < want:
        i = int(np.argmax(dmin))
        if dmin[i] < ACC_MIN:
            print('  只湊得到 %d 個彼此 >= %.1f' % (len(sel), ACC_MIN))
            break
        sel.append(i)
        dmin = np.minimum(dmin, A.de2000(cand, cand[i]))
    for i in sel:
        r, g, b = crgb[i]
        print('  #%02x%02x%02x  floor %.4f  L* %.4f' % (r, g, b, cmf[i], cand[i][0]))
    # 選出來的彼此最小
    mn = 1e9
    for i in range(len(sel)):
        for j in range(i + 1, len(sel)):
            mn = min(mn, float(A.de2000(cand[sel[i]], cand[sel[j]])))
    print('  彼此最小 ΔE %.4f' % mn)


def report(colors):
    """colors: {id: hex} —— 對四條判準逐一報數字。回 (rows, worst)"""
    rows = []
    for k, h in colors.items():
        lh = A.lab(h)
        f = min((float(A.de2000(lh, A.lab(s))), nm) for nm, s in A.floor_shades())
        bd = min((float(A.de2000(lh, A.lab(c))), nm) for nm, c in A.body_colors())
        others = {**{i: v['acc'] for i, v in P.items()}, **{i: v for i, v in colors.items() if i != k}}
        ac = min((float(A.de2000(lh, A.lab(v))), i) for i, v in others.items() if i != k)
        rows.append((k, h, f, bd, ac))
    return rows


def cmd_report():
    colors = json.load(open(sys.argv[2], encoding='utf-8'))
    print('%-13s %-9s %-26s %-24s %s' % ('id', 'acc', '對地板 (>=25, 瞄 28)', '對身體色 (>=25)', '對其他配件 (>=12)'))
    worst = {}
    for k, h, f, bd, ac in report(colors):
        print('%-13s %-9s %9.4f @%-14s %9.4f %-12s %9.4f %s'
              % (k, h, f[0], f[1], bd[0], bd[1], ac[0], ac[1]))
        worst[k] = (f[0], bd[0], ac[0])
    fs = [v[0] for v in worst.values()]
    bs = [v[1] for v in worst.values()]
    az = [v[2] for v in worst.values()]
    print('\n最糟：地板 %.4f  身體 %.4f  配件互斥 %.4f' % (min(fs), min(bs), min(az)))
    bad = []
    if min(fs) < 25: bad.append('地板 < 25')
    if min(bs) < 25: bad.append('身體 < 25')
    if min(az) < 12: bad.append('配件互斥 < 12')
    print('結論：' + ('全部過關' if not bad else '不過：' + '、'.join(bad)))


if __name__ == '__main__':
    globals()['cmd_' + (sys.argv[1] if len(sys.argv) > 1 else 'scan')]()
