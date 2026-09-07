# -*- coding: utf-8 -*-
"""artexp_pick.py — 從可行集合裡挑九個配件色。

輸入是 artexp_scan.py 存下來的可行點（門檻最鬆的那一份：acc>=9、body/bg>=25）。
這裡再收緊、再挑：

  · **硬下限**：對現有 64 個 acc 的 ΔE >= 9.5146。
    9.5146 是表上目前的最小值（delegate|acrophobe）。**把它壓下去是 orchestrator
    的決定，不是我的**，所以這支工具連挑都不挑低於它的點。
  · **餘裕**：body/bg 收到 --margin（預設 25.2）。門檻是 25，而兩個獨立的
    CIEDE2000 實作在同一組顏色上差過 0.0022——25.2 是那個差距的 90 倍。
    收更緊（26）的代價是**藍色整段消失**，那是語意上付不起的（夜班研究員）。
  · **目標**：最大化「九個新色彼此 + 對既有 64 個」的**最小** ΔE。
    先用最遠點貪婪起手，再做座標上升（一次固定八個、重挑一個），直到不再變好。
    ⚠ 貪婪自己會停在一個不好的局部解：第一版（只有窗內貪婪、沒有座標上升）
      挑出來九個裡有六個是綠的，接觸表上讀起來是一團。

色相窗是**語意**，不是判準：金牌要是金色、夜班要是藍的、防護衣要是螢光黃。
窗按稀缺度排序處理（藍色幾百點、黃綠四萬點）——反過來做的話寬的那幾張會把
窄的那幾張唯一的落點吃掉。
"""
import sys, os, argparse
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artexp import World, ROOT, de as de_scalar, srgb_to_lab   # noqa: E402
from artexp_scan import rgb_to_lab_np, de2000_np                   # noqa: E402

TABLE_MIN = 9.5146          # 表上現有的互斥最小值，不可以被壓低

# id, 色相窗 [lo,hi)，語意。順序 = 處理順序 = 稀缺度由窄到寬。
WANT = [
    ('nightlab', (196, 292), '夜班：藍。可行域最薄的一段'),
    ('laureate', (60, 100), '諾貝爾獎牌：金'),
    ('leaker',   (326, 360), '外洩警示：紅是 0 個點，洋紅是最靠近警示的一段'),
    ('crate',    (292, 326), '機密封條：紫'),
    ('hazmat',   (100, 122), '防護衣面罩：螢光黃綠'),
    ('rackman',  (160, 196), '機櫃指示燈：青綠'),
    ('keeper',   (145, 160), '動物籠：偏冷的綠'),
    ('runner',   (122, 134), '樣本：亮綠'),
    ('student',  (134, 145), '書包：草綠'),
]


def hue_of(lab):
    return np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360


class Pool(object):
    def __init__(self, w, feas_path, margin):
        keep = np.load(feas_path)
        lab = rgb_to_lab_np(keep)
        # 收緊 body / bg
        body = [w.pal['ink'], w.pal['inkCar'], w.pal['bad']]
        bgs = [c for _, c in w.bgs]
        alive = np.ones(keep.shape[0], dtype=bool)
        for c in body + bgs:
            alive &= de2000_np(lab, srgb_to_lab(c)) >= margin
        # 收緊對既有 acc
        exist = sorted(set(sp['acc'] for sp in w.people.values()))
        base = np.full(keep.shape[0], np.inf)
        for c in exist:
            base = np.minimum(base, de2000_np(lab, srgb_to_lab(c)))
        alive &= base >= TABLE_MIN
        self.rgb = keep[alive]
        self.lab = lab[alive]
        self.base = base[alive]          # 對既有 64 個的最小 ΔE
        self.hue = hue_of(self.lab)
        self.n = self.rgb.shape[0]

    def hexof(self, j):
        return '#%02x%02x%02x' % tuple(int(x) for x in self.rgb[j])


def optimise(pool, rounds=12, verbose=True):
    ids = [x[0] for x in WANT]
    win = {i: w for i, w, _ in WANT}
    masks = {i: (pool.hue >= win[i][0]) & (pool.hue < win[i][1]) for i in ids}
    for i in ids:
        if not masks[i].any():
            print('%-9s **窗 %s 裡沒有可行點**' % (i, win[i]))

    # --- 起手：依稀缺度貪婪
    cur = {}
    score = pool.base.copy()
    for i in ids:
        m = masks[i]
        if not m.any():
            continue
        idx = np.flatnonzero(m)
        j = idx[int(np.argmax(score[idx]))]
        cur[i] = j
        score = np.minimum(score, de2000_np(pool.lab, pool.lab[j]))

    # --- 座標上升：一次固定其他八個、重挑一個
    def minpair(sel):
        v = np.inf
        ks = list(sel)
        for a in range(len(ks)):
            v = min(v, pool.base[sel[ks[a]]])
            for b in range(a + 1, len(ks)):
                v = min(v, de_scalar(pool.hexof(sel[ks[a]]), pool.hexof(sel[ks[b]])))
        return v

    for it in range(rounds):
        moved = 0
        for i in ids:
            if i not in cur:
                continue
            others = [cur[k] for k in cur if k != i]
            s = pool.base.copy()
            for j in others:
                s = np.minimum(s, de2000_np(pool.lab, pool.lab[j]))
            m = masks[i]
            idx = np.flatnonzero(m)
            best = idx[int(np.argmax(s[idx]))]
            if s[best] > s[cur[i]] + 1e-12:
                cur[i] = best
                moved += 1
        if verbose:
            print('  第 %d 輪：動了 %d 個，全域最小 %.4f' % (it + 1, moved, minpair(cur)))
        if moved == 0:
            break
    return {i: pool.hexof(j) for i, j in cur.items()}


def audit(w, chosen):
    """挑完之後把每一條**重算**一次——不信任挑的過程，只信任重算的結果。"""
    allc = {i: sp['acc'] for i, sp in w.people.items()}
    allc.update(chosen)
    rows = []
    seen = set()
    for a in chosen:
        for b in allc:
            if a == b or (b, a) in seen:
                continue
            seen.add((a, b))
            rows.append((de_scalar(chosen[a], allc[b]), a, b))
    rows.sort()
    print('\n-- 新色帶進來的互斥最小十組 --')
    for d, a, b in rows[:10]:
        print('   %-9s vs %-12s %.4f' % (a, b, d))
    print('   新色最小 %.4f｜表上現有最小 %.4f｜門檻 9'
          % (rows[0][0], TABLE_MIN))
    print('   %s' % ('壓低了表上最小值 —— **要先問 orchestrator**'
                     if rows[0][0] < TABLE_MIN - 1e-9 else '沒有壓低表上最小值'))
    print('\n-- 對身體色 / 背景（門檻都是 25）--')
    for pid in [x[0] for x in WANT]:
        if pid not in chosen:
            continue
        hx = chosen[pid]
        b, bn = min((de_scalar(hx, w.pal[k]), k) for k in ('ink', 'inkCar', 'bad'))
        g, at = min(((de_scalar(hx, c), nm) for nm, c in w.bgs))
        lab = srgb_to_lab(hx)
        h = np.degrees(np.arctan2(lab[2], lab[1])) % 360
        print('   %-9s %s  h=%5.1f L=%5.1f  身體 %7.4f (%s)  背景 %7.4f @%s'
              % (pid, hx, h, lab[0], b, bn, g, at))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('feas')
    ap.add_argument('--margin', type=float, default=25.2)
    a = ap.parse_args()
    w = World(ROOT)
    pool = Pool(w, a.feas, a.margin)
    print('候選池 %d 點（body/bg >= %.2f、對既有 acc >= %.4f）' % (pool.n, a.margin, TABLE_MIN))
    chosen = optimise(pool)
    audit(w, chosen)
    print('\n' + repr(chosen))


if __name__ == '__main__':
    sys.exit(main())
