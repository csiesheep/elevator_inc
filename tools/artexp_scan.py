# -*- coding: utf-8 -*-
"""artexp_scan.py — 配件色的可行空間，全 sRGB 逐點掃。

「還有沒有顏色可以用」不是一個可以憑感覺回答的問題，也不是一個可以拿子取樣的
計數去回答的問題（#105 那個 1,639 就是 step 4 的計數被當成絕對值報出去）。
這裡掃**全部 16,777,216 個 sRGB 點**，同時要求：

    A. 對現有每一個 acc      ΔE00 >= ACC_MIN（預設 9）
    B. 對 pal.ink/inkCar/bad ΔE00 >= 25
    C. 對 29 種背景色         ΔE00 >= 25

⚠ 這支是**向量化**的實作，跟 artexp.py 那支純量的是兩份程式碼。
   向量化最容易在 atan2 的分支、以及 hbar 的 360 度環繞上出錯，而那種錯誤
   **只在一小片色相上發生**——整體計數看起來還是「合理」的。
   所以 --verify 會拿兩支在隨機色上逐點對過（純量那支已經對過 Sharma 34 組）。
"""
import sys, os, math, argparse
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artexp import World, de as de_scalar, srgb_to_lab, ROOT   # noqa: E402


def rgb_to_lab_np(rgb):
    """rgb: (N,3) uint8 -> (N,3) float64 Lab。跟 artexp.srgb_to_lab 同一組常數。"""
    v = rgb.astype(np.float64) / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[:, 0], lin[:, 1], lin[:, 2]
    X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750)
    Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883
    eps, kap = 216.0 / 24389.0, 24389.0 / 27.0
    def f(t):
        return np.where(t > eps, np.cbrt(t), (kap * t + 16.0) / 116.0)
    fx, fy, fz = f(X), f(Y), f(Z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=1)


def de2000_np(lab, ref):
    """lab: (N,3)；ref: (3,)。回 (N,)。"""
    L1, a1, b1 = lab[:, 0], lab[:, 1], lab[:, 2]
    L2, a2, b2 = ref
    rad, deg = math.pi / 180.0, 180.0 / math.pi

    C1 = np.hypot(a1, b1)
    C2 = math.hypot(a2, b2)
    Cbar = (C1 + C2) / 2.0
    c7 = Cbar ** 7
    G = 0.5 * (1 - np.sqrt(c7 / (c7 + 25.0 ** 7)))
    ap1 = (1 + G) * a1
    ap2 = (1 + G) * a2
    Cp1 = np.hypot(ap1, b1)
    Cp2 = np.hypot(ap2, b2)

    # ⚠ ap2 是**陣列**不是純量：G 隨每一個點的 C1 變，所以 (1+G)*a2 也隨點變。
    #   第一版這裡寫 math.atan2(b2, ap2)，在 N=1 的驗證裡「通過」了
    #   （長度 1 的陣列會被隱式轉成純量），N>1 才爆。**驗證用 N=1 是驗不到向量化的。**
    hp1 = np.degrees(np.arctan2(b1, ap1))
    hp1 = np.where((ap1 == 0) & (b1 == 0), 0.0, np.where(hp1 < 0, hp1 + 360, hp1))
    hp2 = np.degrees(np.arctan2(np.broadcast_to(b2, ap2.shape), ap2))
    hp2 = np.where((ap2 == 0) & (b2 == 0), 0.0, np.where(hp2 < 0, hp2 + 360, hp2))

    dLp = L2 - L1
    dCp = Cp2 - Cp1
    prod = Cp1 * Cp2
    raw = hp2 - hp1
    dhp = np.where(raw > 180, raw - 360, np.where(raw < -180, raw + 360, raw))
    dhp = np.where(prod == 0, 0.0, dhp)
    dHp = 2.0 * np.sqrt(prod) * np.sin(dhp / 2.0 * rad)

    Lbp = (L1 + L2) / 2.0
    Cbp = (Cp1 + Cp2) / 2.0
    hsum = hp1 + hp2
    hbp = np.where(np.abs(hp1 - hp2) <= 180, hsum / 2.0,
                   (hsum + np.where(hsum < 360, 360.0, -360.0)) / 2.0)
    hbp = np.where(prod == 0, hsum, hbp)

    T = (1 - 0.17 * np.cos((hbp - 30) * rad) + 0.24 * np.cos(2 * hbp * rad)
         + 0.32 * np.cos((3 * hbp + 6) * rad) - 0.20 * np.cos((4 * hbp - 63) * rad))
    dth = 30.0 * np.exp(-(((hbp - 275.0) / 25.0) ** 2))
    cbp7 = Cbp ** 7
    Rc = 2.0 * np.sqrt(cbp7 / (cbp7 + 25.0 ** 7))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -np.sin(2 * dth * rad) * Rc
    return np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2
                   + Rt * (dCp / Sc) * (dHp / Sh))


def verify(n=3000, seed=7):
    """向量化 vs 純量（純量那支已經對過 Sharma 34 組）。

    ⚠ **一定要用 N > 1 的批次跑。** 第一版我逐點用 `lab[i:i+1]`（N=1）驗，
      而 N=1 時 numpy 會把長度 1 的陣列隱式當成純量——**向量化的那一段
      整條沒有被執行到**，一個真的會爆的 bug 在驗證裡是綠的。
    """
    rng = np.random.default_rng(seed)
    # 隨機點 + 灰軸（atan2 的退化點）+ 純色角落，一起放進同一個批次
    pts = [rng.integers(0, 256, size=(n, 3), dtype=np.uint8),
           np.array([[v, v, v] for v in range(0, 256, 5)], dtype=np.uint8),
           np.array([[255, 0, 0], [0, 255, 0], [0, 0, 255], [0, 0, 0], [255, 255, 255]],
                    dtype=np.uint8)]
    a = np.concatenate(pts, axis=0)
    lab_a = rgb_to_lab_np(a)
    hexa = ['#%02x%02x%02x' % tuple(int(x) for x in row) for row in a]
    # 參考色也要含灰、含黑白、含實際會用到的身體色與背景色
    refs_hex = ['#000000', '#ffffff', '#808080', '#e2645a', '#eaf0fb', '#12161f',
                '#e6ecf7', '#3a4a63', '#5c3a4a', '#2d3a4d', '#1a5a62', '#f6a200']
    worst, worst_at = 0.0, None
    for hb in refs_hex:
        got = de2000_np(lab_a, srgb_to_lab(hb))          # **整批一次算，N > 1**
        for i, ha in enumerate(hexa):
            d = abs(got[i] - de_scalar(ha, hb))
            if d > worst:
                worst, worst_at = d, (ha, hb)
    ok = worst < 1e-9
    print('向量化 vs 純量：批次 N=%d × %d 個參考色 = %d 組（含灰軸與黑白角落），'
          '最大差 %.3e => %s'
          % (a.shape[0], len(refs_hex), a.shape[0] * len(refs_hex), worst,
             '一致' if ok else '**不一致 %s**' % (worst_at,)))
    return ok


def refs(w, acc_min):
    body = [w.pal['ink'], w.pal['inkCar'], w.pal['bad']]
    bgs = [c for _, c in w.bgs]
    accs = sorted(set(sp['acc'] for sp in w.people.values()))
    return body, bgs, accs


def scan(w, acc_min=9.0, body_min=25.0, bg_min=25.0, step=1, extra=(), report=True):
    body, bgs, accs = refs(w, acc_min)
    accs = list(accs) + list(extra)
    vals = np.arange(0, 256, step, dtype=np.uint8)
    keep_rgb = []
    n_total = 0
    # 逐 R 切片：一片 256*256 = 65536 點（step=1）
    for r in vals:
        gg, bb = np.meshgrid(vals, vals, indexing='ij')
        rgb = np.stack([np.full(gg.size, r, dtype=np.uint8), gg.ravel(), bb.ravel()], axis=1)
        n_total += rgb.shape[0]
        lab = rgb_to_lab_np(rgb)
        alive = np.ones(rgb.shape[0], dtype=bool)
        for c in body:                      # 3 個，最便宜、砍掉最多
            alive &= de2000_np(lab, srgb_to_lab(c)) >= body_min
            if not alive.any():
                break
        if alive.any():
            idx = np.flatnonzero(alive)
            lab2 = lab[idx]
            alive2 = np.ones(idx.size, dtype=bool)
            for c in bgs:
                alive2 &= de2000_np(lab2, srgb_to_lab(c)) >= bg_min
                if not alive2.any():
                    break
            if alive2.any():
                idx2 = idx[alive2]
                lab3 = lab[idx2]
                alive3 = np.ones(idx2.size, dtype=bool)
                for c in accs:
                    alive3 &= de2000_np(lab3, srgb_to_lab(c)) >= acc_min
                    if not alive3.any():
                        break
                if alive3.any():
                    keep_rgb.append(rgb[idx2[alive3]])
    keep = np.concatenate(keep_rgb, axis=0) if keep_rgb else np.zeros((0, 3), dtype=np.uint8)
    if report:
        print('掃了 %d 點（step=%d），可行 %d 點｜門檻 acc>=%g body>=%g bg>=%g｜'
              '對照的 acc %d 個、背景 %d 種'
              % (n_total, step, keep.shape[0], acc_min, body_min, bg_min, len(accs), len(bgs)))
    return keep


def hue_hist(keep):
    if keep.shape[0] == 0:
        return []
    lab = rgb_to_lab_np(keep)
    h = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
    names = [(0, 30, '紅'), (30, 60, '橘'), (60, 100, '黃'), (100, 160, '黃綠'),
             (160, 200, '綠/青'), (200, 250, '青/藍'), (250, 290, '藍/紫'),
             (290, 330, '紫/洋紅'), (330, 360, '洋紅/紅')]
    out = []
    for lo, hi, nm in names:
        out.append((nm, '%d-%d' % (lo, hi), int(((h >= lo) & (h < hi)).sum())))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--acc-min', type=float, default=9.0)
    ap.add_argument('--step', type=int, default=1)
    ap.add_argument('--no-verify', action='store_true')
    ap.add_argument('--hist', action='store_true')
    ap.add_argument('--dump', default='')
    a = ap.parse_args()

    if not a.no_verify:
        if not verify():
            print('尺不一致，不繼續。')
            return 2
    w = World(ROOT)
    keep = scan(w, acc_min=a.acc_min, step=a.step)
    if a.hist:
        for nm, rng, n in hue_hist(keep):
            print('   %-10s h %-8s %8d' % (nm, rng, n))
    if a.dump:
        np.save(a.dump, keep)
        print('存到 %s' % a.dump)
    return 0


if __name__ == '__main__':
    sys.exit(main())
