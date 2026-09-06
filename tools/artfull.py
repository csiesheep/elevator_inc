# -*- coding: utf-8 -*-
"""全 sRGB（step 1，16,777,216 點）掃描：在「對地板 >= F、對三種身體色 >= 25」的
母體裡，找出**對 51 個既有配件色的最小 ΔE 最大**的點。
step 4 的 262,144 點只夠說「粗網格上沒有」，說不了「整個 sRGB 都沒有」。
分塊算，每一塊先用地板/身體濾掉，再拿存活者去比 51 個既有色，
邊比邊用門檻剪枝（min 只會變小，低於門檻就永遠不會回來）。
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artlib as A
import artcolor as C
import numpy as np

FLOOR_MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 25.0
BODY_MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 25.0
PRUNE = float(sys.argv[3]) if len(sys.argv) > 3 else 9.0   # 低於這個就丟，只為了省記憶體

SH = [A.lab(h) for h in C.SHADES]
BD = [A.lab(h) for h in C.BODY]
EX = [(k, A.lab(v)) for k, v in sorted({i: s['acc'] for i, s in C.P.items()}.items())]

best = (-1.0, None, None, None)
kept_r, kept_a, kept_f = [], [], []
CH = 1 << 18
total = 1 << 24
for lo in range(0, total, CH):
    hi = min(lo + CH, total)
    idx = np.arange(lo, hi, dtype=np.int64)
    rgb = np.stack([(idx >> 16) & 255, (idx >> 8) & 255, idx & 255], axis=-1)
    labs = A.rgb_to_lab(rgb)
    mf = np.full(len(idx), np.inf)
    for s in SH:
        mf = np.minimum(mf, A.de2000(labs, s))
    m = mf >= FLOOR_MIN
    if not m.any():
        continue
    labs, rgb, mf = labs[m], rgb[m], mf[m]
    mb = np.full(len(labs), np.inf)
    for s in BD:
        mb = np.minimum(mb, A.de2000(labs, s))
    m = mb >= BODY_MIN
    if not m.any():
        continue
    labs, rgb, mf = labs[m], rgb[m], mf[m]
    ma = np.full(len(labs), np.inf)
    who = np.zeros(len(labs), dtype=np.int32)
    for i, (k, s) in enumerate(EX):
        d = A.de2000(labs, s)
        upd = d < ma
        ma = np.where(upd, d, ma)
        who = np.where(upd, i, who)
        keep = ma >= PRUNE
        if not keep.any():
            labs = labs[:0]
            break
        labs, rgb, mf, ma, who = labs[keep], rgb[keep], mf[keep], ma[keep], who[keep]
    if len(labs) == 0:
        continue
    kept_r.append(rgb); kept_a.append(ma); kept_f.append(mf)
    j = int(np.argmax(ma))
    if ma[j] > best[0]:
        best = (float(ma[j]), tuple(int(v) for v in rgb[j]), float(mf[j]), EX[int(who[j])][0])

print('地板門檻 %.1f  身體門檻 %.1f' % (FLOOR_MIN, BODY_MIN))
if best[1] is None:
    print('整個 sRGB 沒有任何一點對既有 51 色的最小 ΔE >= %.1f' % PRUNE)
else:
    r, g, b = best[1]
    print('全 sRGB 最遠點：#%02x%02x%02x  對既有 51 色最小 ΔE = %.4f（最近的是 %s）  對地板 %.4f'
          % (r, g, b, best[0], best[3], best[2]))
if kept_a:
    ma = np.concatenate(kept_a)
    for t in [12.0, 11.9974, 11.5, 11.0, 10.5, 10.0, 9.5]:
        print('  對既有 51 色最小 ΔE >= %-8.4f 的點數：%d' % (t, int((ma >= t).sum())))
    np.save(os.path.join(A.ROOT, 'tools', '_cand_rgb.npy'), np.concatenate(kept_r))
    np.save(os.path.join(A.ROOT, 'tools', '_cand_acc.npy'), ma)
    np.save(os.path.join(A.ROOT, 'tools', '_cand_floor.npy'), np.concatenate(kept_f))
    print('  存了 %d 個候選點到 tools/_cand_*.npy' % len(ma))
