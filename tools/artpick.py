# -*- coding: utf-8 -*-
"""挑九個色：先固定門檻 t，再**按「色相有多稀缺」的順序**逐一挑
「在可行域裡離字面色最近的點」。稀缺的先挑，否則它會被先挑的擠掉。
輸出 tools/_picked.json。"""
import sys, os, json
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

# 字面色（故事上「應該」是什麼顏色）與挑選順序（稀缺色相先挑）
WANT = [
    # 順序 = 色相的稀缺度。可行域裡青只有 2 點、洋紅 6 點、黃 112 點（內部最遠 22.89，
    # 塞得下 2 個）、紫 3100 點（只塞得下 1 個）、綠 8806 點（塞得下 4 個）。
    # 2+1+1+1+4 = 9 —— **剛好九個，一個都不能多。**
    ('waterhauler', '#8fa0a0', '鍍鋅水桶的灰青（可行域裡的青只有一點）'),
    ('neighbor',    '#c060b0', '菜盤上那塊布（可行域裡的洋紅只有一點）'),
    ('renovator',   '#e08a00', '安全帽的工地琥珀（黃團塊的高彩度端）'),
    ('latehome',    '#b8b070', '一串鑰匙的黃銅（黃團塊的高明度端）'),
    ('commuter',    '#6b5b95', '公事包的板岩紫（可行域裡的紫只有一點）'),
    ('blackouter',  '#a0ffc0', '手電筒的光——**要的是明度不是色相**，取綠團塊 L* 最高處'),
    ('fooddeliv',   '#16a34a', '保溫箱的外送綠'),
    ('homecomer',   '#7a9b5a', '購物袋的草綠'),
    ('dogwalker',   '#3ad06a', '牽繩（狗本身是身體色，見 sprites.js 的註解）'),
]


def pick(t, floor_min):
    exist = [A.lab(v) for v in {i: s['acc'] for i, s in C.P.items()}.values()]
    base = (FLR >= floor_min)
    if not base.any():
        return None
    lab, rgb = LAB[base], RGB[base]
    # 對既有 51 色的最小 ΔE（_cand_acc 已經是這個，但要跟 base 對齊）
    acc = ACC[base]
    live = acc >= t
    out = {}
    for k, target, why in WANT:
        if not live.any():
            return None
        d = A.de2000(lab[live], A.lab(target))
        i = int(np.argmin(d))
        c = rgb[live][i]
        h = '#%02x%02x%02x' % tuple(int(v) for v in c)
        out[k] = h
        # 把新色也加進「要離得夠遠」的集合
        keep = A.de2000(lab, A.lab(h)) >= t
        live = live & keep
    return out


if __name__ == '__main__':
    fm = float(sys.argv[1]) if len(sys.argv) > 1 else 28.0
    best = None
    t = 11.4
    while t > 9.0:
        r = pick(t, fm)
        if r is not None and len(r) == 9:
            best = (t, r); break
        t -= 0.02
    t, cols = best
    print('地板 >= %.1f，互斥門檻 t = %.4f' % (fm, t))
    allc = {**{i: s['acc'] for i, s in C.P.items()}, **cols}
    print('%-13s %-9s %-9s %-10s %s' % ('id', '字面色', '實得', '偏離 ΔE', '為什麼'))
    for k, target, why in WANT:
        h = cols[k]
        print('%-13s %-9s %-9s %9.4f  %s' % (k, target, h, A.de_hex(target, h), why))
    print()
    mn = 1e9; arg = None
    for k, h in cols.items():
        for j, v in allc.items():
            if j == k: continue
            d = A.de_hex(h, v)
            if d < mn: mn, arg = d, (k, j)
    print('新色對「51 既有 + 其餘新色」的最小 ΔE = %.4f  (%s / %s)' % (mn, arg[0], arg[1]))
    fw = min((min(A.de_hex(h, s) for _, s in A.floor_shades()), k) for k, h in cols.items())
    bw = min((min(A.de_hex(h, c) for _, c in A.body_colors()), k) for k, h in cols.items())
    print('對地板最小 %.4f (%s)   對身體色最小 %.4f (%s)' % (fw[0], fw[1], bw[0], bw[1]))
    json.dump(cols, open(os.path.join(A.ROOT, 'tools', '_picked.json'), 'w'), indent=1)
