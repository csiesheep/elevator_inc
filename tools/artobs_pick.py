# -*- coding: utf-8 -*-
"""挑四個配件色。先固定門檻，再**按色相稀缺度**逐一挑「可行域裡離字面色最近的點」，
每挑一個就把它加進「要離得夠遠」的集合。稀缺的先挑，否則會被先挑的擠掉。

    python tools/artobs_pick.py [ACC_MIN] [MARGIN]

ACC_MIN  互斥門檻（第 19 組是 9）
MARGIN   背景 / 身體色兩軸實際瞄準的值（判準是 25，但 25 不是可以瞄準的數字）
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artobs as O
import artlib as A
import numpy as np

_C = os.path.join(O.ROOT, 'tools', '_obs_cand.npz')
if not os.path.exists(_C):
    raise SystemExit('先跑 `python tools/artobs_scan.py 25 25 9`，它會掃全 sRGB 並存下 '
                     'tools/_obs_cand.npz（約 4 分鐘、5MB，刻意不進版本庫）。')

Z = np.load(os.path.join(O.ROOT, 'tools', '_obs_cand.npz'))
RGB, BG, BD, AC = Z['rgb'], Z['bg'], Z['body'], Z['acc']
LAB = A.rgb_to_lab(RGB)
HUE = np.degrees(np.arctan2(LAB[:, 2], LAB[:, 1])) % 360

ACC_MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 9.0
MARGIN = float(sys.argv[2]) if len(sys.argv) > 2 else 28.0

# 字面色（故事上「應該」是什麼顏色）與挑選順序（**稀缺的先挑**）
WANT = [
    ('photocrew', '#8c8c8c', '相機機身與腳架的中性灰——器材本來是黑的，而可行域 L* 最低 44.8，黑色不存在'),
    ('deckguide', '#2a6ff0', '導遊旗。字面色是紅／橘（旗子最常見的顏色），可行域裡紅 0、橘 0'),
    ('proposer',  '#ff4d94', '捧花／戒指。玫瑰的紅拿不到，粉紅是最接近的真東西'),
    ('acrophobe', '#5fd08a', '臉色發青的那個綠——這一格要的是「不舒服」，綠是可行域最寬的一段'),
]


def pick(acc_min, margin, want=WANT):
    live = (BG >= margin) & (BD >= margin) & (AC >= acc_min)
    if not live.any():
        return None
    out = {}
    for pid, target, why in want:
        if not live.any():
            return None
        idx = np.flatnonzero(live)
        d = A.de2000(LAB[idx], A.lab(target))
        j = int(np.argmin(d))
        i = idx[j]
        h = '#%02x%02x%02x' % tuple(int(v) for v in RGB[i])
        out[pid] = h
        live = live & (A.de2000(LAB, A.lab(h)) >= acc_min)
    return out


if __name__ == '__main__':
    cols = pick(ACC_MIN, MARGIN)
    if cols is None:
        print('在 acc >= %.2f、餘裕 >= %.2f 之下挑不滿四個。' % (ACC_MIN, MARGIN))
        raise SystemExit(1)
    P = O.people()
    allc = {k: v['acc'] for k, v in P.items()}
    allc.update(cols)
    print('互斥門檻 %.2f、背景/身體瞄 %.2f' % (ACC_MIN, MARGIN))
    print('%-11s %-9s %-9s %-10s %s' % ('id', '字面色', '實得', '偏離 ΔE', '為什麼'))
    for pid, target, why in WANT:
        h = cols[pid]
        print('%-11s %-9s %-9s %9.4f  %s' % (pid, target, h, O.de2000(target, h), why))
    print()
    for pid in [w[0] for w in WANT]:
        h = cols[pid]
        bg = min((O.de2000(h, c), nm) for nm, c in O.backgrounds())
        bd = min((O.de2000(h, c), nm) for nm, c in O.pal_body())
        ac = min((O.de2000(h, v), k) for k, v in allc.items() if k != pid)
        hue = float(np.degrees(np.arctan2(*A.lab(h)[:0:-1])) % 360)
        print('%-11s %s  背景 %8.4f @%-14s 身體 %8.4f %-10s 互斥 %8.4f %-12s hue %5.1f L* %5.1f'
              % (pid, h, bg[0], bg[1], bd[0], bd[1], ac[0], ac[1], hue, A.lab(h)[0]))
    json.dump(cols, open(os.path.join(O.ROOT, 'tools', '_obs_picked.json'), 'w'), indent=1)
    print('\n-> tools/_obs_picked.json')
