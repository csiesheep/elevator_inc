# -*- coding: utf-8 -*-
"""四個配件色的聯合最佳化：**在硬判準之內，讓四個色離各自的字面色總和最近**。

貪婪（`artobs_pick.py`）的問題是順序決定結果——先挑的把後挑的擠到很遠。這裡用
座標下降：固定其他三個，把第 i 個換成「可行域裡離它的字面色最近的點」，掃到不動為止；
多個隨機起點取最好的一組。

    python tools/artobs_opt.py [ACC_MIN] [MARGIN]
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

P = O.people()

# (id, 字面色, 這一格自己的背景/身體餘裕, 為什麼)
# ⚠ photocrew 的 26.5 是**唯一一個低於 28 的**：掃描顯示中性灰（C* <= 12）在背景餘裕
#   26.8 有一個斷崖，27.0 以上就只剩海綠色。判準是 25，理由寫在 js/sprites.js。
WANT = [
    ('photocrew', '#8c8c8c', 26.5, '相機機身與腳架的中性灰'),
    ('deckguide', '#2a6ff0', 28.0, '導遊旗的旗面藍'),
    ('proposer',  '#ff4d94', 28.0, '捧花的玫瑰粉'),
    ('acrophobe', '#5fd08a', 28.0, '臉色發青的那個綠'),
]

# **同框最需要分開的那幾對，門檻自己再提高。**
# 判準只要求 9；這幾對是「玩家一定會並排看到」的，9 不夠。
SPECIAL = {
    'proposer':  [('newlywed', 12.0)],   # 全表另一張「一個框裡兩個人」
    'deckguide': [('observer', 25.0)],   # 34.5% 的觀景客是跟著導遊到的（#135）
    'acrophobe': [('observer', 20.0)],   # 同帶，常同車
    'photocrew': [('observer', 20.0), ('tourist', 12.0)],   # tourist 也是相機
}

TL = [A.lab(t) for _, t, _, _ in WANT]
DRIFT = np.stack([A.de2000(LAB, t) for t in TL], axis=1)      # (N, 4)

POOL = []
for pid, _, margin, _ in WANT:
    ok = (BG >= margin) & (BD >= margin)
    for other, thr in SPECIAL.get(pid, []):
        ok &= A.de2000(LAB, A.lab(P[other]['acc'])) >= thr
    POOL.append(np.flatnonzero(ok))


def hexof(i):
    return '#%02x%02x%02x' % tuple(int(v) for v in RGB[i])


def solve(acc_min, starts=120, seed=17):
    """座標下降：固定其他三個，把第 i 個換成「可行域裡離它的字面色最近的點」。"""
    rng = np.random.default_rng(seed)
    pools = [p[AC[p] >= acc_min] for p in POOL]
    if min(len(p) for p in pools) < 1:
        return None
    best = None
    for _ in range(starts):
        sel = [int(rng.choice(p)) for p in pools]
        for _ in range(40):
            moved = False
            for i in range(4):
                p = pools[i]
                okm = np.ones(len(p), dtype=bool)
                for j in range(4):
                    if j != i:
                        okm &= A.de2000(LAB[p], LAB[sel[j]]) >= acc_min
                idx = p[okm]
                if len(idx) == 0:
                    sel = None
                    break
                cand = int(idx[int(np.argmin(DRIFT[idx, i]))])
                if cand != sel[i]:
                    sel[i] = cand
                    moved = True
            if sel is None or not moved:
                break
        if sel is None:
            continue
        if not all(A.de2000(LAB[sel[i]], LAB[sel[j]]) >= acc_min
                   for i in range(4) for j in range(i + 1, 4)):
            continue
        tot = sum(float(DRIFT[sel[i], i]) for i in range(4))
        if best is None or tot < best[0]:
            best = (tot, list(sel))
    return best


def ceiling(margin, starts=200, seed=9, cap=20000):
    """**四個新色撐得到的最大互斥門檻**（二分 + 多起點貪婪）。
    這個數字是「我為什麼取 9.5 而不是更高」的分母，所以要跑得出來，不能只寫在註解裡。
    ⚠ 可行域最多有 111,110 點，全部拿去跑會把記憶體吃爆（實測 segfault），
    所以固定亂數種子抽 `cap` 個點。**這樣算出來的是下界**——真正的上限只會更高或相等，
    而我要的正是「至少可以到多少」。"""
    base = np.flatnonzero((BG >= margin) & (BD >= margin))
    if len(base) > cap:
        base = np.random.default_rng(seed).choice(base, cap, replace=False)
    lab, rgb = LAB[base], RGB[base]
    acc = AC[base]

    def pack(t):
        m = acc >= t
        if m.sum() < 4:
            return None
        L, R = lab[m], rgb[m]
        rng = np.random.default_rng(seed)
        order = rng.permutation(len(L))[:starts] if len(L) > starts else np.arange(len(L))
        for s in order:
            sel = [int(s)]
            dmin = A.de2000(L, L[int(s)])
            while len(sel) < 4:
                i = int(np.argmax(dmin))
                if dmin[i] < t:
                    break
                sel.append(i)
                dmin = np.minimum(dmin, A.de2000(L, L[i]))
            if len(sel) == 4:
                return R[sel]
        return None

    lo, hi, best = 8.0, 20.0, None
    for _ in range(24):
        mid = (lo + hi) / 2
        r = pack(mid)
        if r is not None:
            lo, best = mid, r
        else:
            hi = mid
    return lo, best


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'ceiling':
        for m in [25.0, 26.5, 28.0, 30.0, 32.0]:
            t, s = ceiling(m)
            hexes = ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in s] if s is not None else []
            print('背景/身體瞄 %.1f -> 四個新色撐得到的最大互斥門檻 t = %.4f   %s'
                  % (m, t, ' '.join(hexes)))
        raise SystemExit(0)
    acc_min = float(sys.argv[1]) if len(sys.argv) > 1 else 9.5
    r = solve(acc_min)
    if r is None:
        print('acc >= %.2f 之下無解' % acc_min)
        raise SystemExit(1)
    tot, sel = r
    cols = {WANT[i][0]: hexof(sel[i]) for i in range(4)}
    allc = {k: v['acc'] for k, v in P.items()}
    allc.update(cols)
    print('互斥 >= %.2f  |  字面色偏離總和 %.4f' % (acc_min, tot))
    print('%-11s %-9s %-9s %-10s %s' % ('id', '字面色', '實得', '偏離 ΔE', '為什麼'))
    for pid, target, _, why in WANT:
        print('%-11s %-9s %-9s %9.4f  %s' % (pid, target, cols[pid], O.de2000(target, cols[pid]), why))
    print()
    for pid, _, _, _ in WANT:
        h = cols[pid]
        bg = min((O.de2000(h, c), nm) for nm, c in O.backgrounds())
        bd = min((O.de2000(h, c), nm) for nm, c in O.pal_body())
        ac = min((O.de2000(h, v), k) for k, v in allc.items() if k != pid)
        L, a, b = A.lab(h)
        print('%-11s %s  背景 %8.4f @%-14s 身體 %8.4f %-10s 互斥 %8.4f %-12s hue %5.1f L* %5.1f'
              % (pid, h, bg[0], bg[1], bd[0], bd[1], ac[0], ac[1],
                 float(np.degrees(np.arctan2(b, a)) % 360), L))
    json.dump(cols, open(os.path.join(O.ROOT, 'tools', '_obs_picked.json'), 'w'), indent=1)
    print('\n-> tools/_obs_picked.json')
