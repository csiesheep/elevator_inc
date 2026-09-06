# -*- coding: utf-8 -*-
"""觀景帶（#135）的可行域掃描：**全 sRGB step 1，16,777,216 點**。

保留同時滿足下列三條的點，並且把三個餘裕一起存下來（挑色的時候要看餘裕，
不是只看過不過）：

    對 29 種背景色（28 樓層底色 + 轎廂內裝）  ΔE >= BG_MIN
    對三種身體色（ink / inkCar / bad）        ΔE >= BODY_MIN
    對既有 60 個配件色                        ΔE >= ACC_MIN

    python tools/artobs_scan.py [BG_MIN] [BODY_MIN] [ACC_MIN]

存到 tools/_obs_cand.npz（刻意不進版本庫）。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artobs as O
import artlib as A          # 向量化的 de2000（已跟 artobs 對到 0.000000）
import numpy as np

BG_MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 25.0
BODY_MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 25.0
ACC_MIN = float(sys.argv[3]) if len(sys.argv) > 3 else 9.0

BG = [A.lab(h) for _, h in O.backgrounds()]
BODY = [A.lab(h) for _, h in O.pal_body()]
P = O.people()
EX = sorted({s['acc'] for s in P.values()})
EXL = [A.lab(h) for h in EX]

print('母體：%d 種背景、%d 種身體色、%d 個既有配件色' % (len(BG), len(BODY), len(EX)))
print('門檻：背景 >= %.1f、身體 >= %.1f、互斥 >= %.1f' % (BG_MIN, BODY_MIN, ACC_MIN))

kr, kbg, kbd, kac = [], [], [], []
CH = 1 << 18
TOT = 1 << 24
for lo in range(0, TOT, CH):
    idx = np.arange(lo, min(lo + CH, TOT), dtype=np.int64)
    rgb = np.stack([(idx >> 16) & 255, (idx >> 8) & 255, idx & 255], axis=-1)
    labs = A.rgb_to_lab(rgb)
    m = np.full(len(idx), np.inf)
    for s in BG:
        m = np.minimum(m, A.de2000(labs, s))
    keep = m >= BG_MIN
    if not keep.any():
        continue
    labs, rgb, mbg = labs[keep], rgb[keep], m[keep]
    m = np.full(len(labs), np.inf)
    for s in BODY:
        m = np.minimum(m, A.de2000(labs, s))
    keep = m >= BODY_MIN
    if not keep.any():
        continue
    labs, rgb, mbg, mbd = labs[keep], rgb[keep], mbg[keep], m[keep]
    m = np.full(len(labs), np.inf)
    for s in EXL:
        m = np.minimum(m, A.de2000(labs, s))
        keep = m >= ACC_MIN
        if not keep.any():
            labs = labs[:0]
            break
        labs, rgb, mbg, mbd, m = labs[keep], rgb[keep], mbg[keep], mbd[keep], m[keep]
    if len(labs) == 0:
        continue
    kr.append(rgb); kbg.append(mbg); kbd.append(mbd); kac.append(m)

if not kr:
    print('可行域是空的。')
    raise SystemExit(1)

RGB = np.concatenate(kr)
MBG = np.concatenate(kbg)
MBD = np.concatenate(kbd)
MAC = np.concatenate(kac)
LAB = A.rgb_to_lab(RGB)
HUE = np.degrees(np.arctan2(LAB[:, 2], LAB[:, 1])) % 360
np.savez(os.path.join(O.ROOT, 'tools', '_obs_cand.npz'),
         rgb=RGB, bg=MBG, body=MBD, acc=MAC)
print('可行點 %d 個（%.6f%% 的 sRGB）' % (len(RGB), 100.0 * len(RGB) / TOT))

BINS = [('紅', 0, 30), ('橙', 30, 60), ('黃', 60, 100), ('綠', 100, 160),
        ('青', 160, 220), ('藍', 220, 280), ('紫', 280, 330), ('洋紅', 330, 360)]
for name, thr in [('全部', 0.0), ('餘裕版（三軸都 >= 28）', 28.0)]:
    if thr:
        m = (MBG >= thr) & (MBD >= thr)
    else:
        m = np.ones(len(RGB), dtype=bool)
    if not m.any():
        print('%s：0 點' % name); continue
    h = HUE[m]
    print('%s：%d 點  L* %.1f–%.1f  | %s'
          % (name, int(m.sum()), LAB[m][:, 0].min(), LAB[m][:, 0].max(),
             '  '.join('%s %d' % (nm, int(((h >= a) & (h < b)).sum())) for nm, a, b in BINS)))
