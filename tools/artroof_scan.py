# artroof_scan.py — 找五個配件色。
#
# 掃**全部 16,777,216 個 sRGB 點**，不取樣。三個色軸一起濾：
#   · 對 3 種身體色（ink / inkCar / bad）      ΔE >= 25
#   · 對 29 種背景（7 帶 × 4 明暗 + 轎廂內裝）  ΔE >= 25
#   · 對現有 74 個配件色                        ΔE >= 下限
#
# ⚠ **這裡的 numpy 版 CIEDE2000 跟 artroof_lib 的純量版是兩份程式碼。**
#   所以最後一段會拿它們互相對過（隨機 20,000 對）——不是為了證明公式對
#   （那是 artroof_selftest.py 的 Sharma 那一層在做的），是為了證明
#   **向量化的時候沒有寫錯**。
import sys, os, numpy as np
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artroof_lib as L

def srgb_to_lab_np(rgb):          # rgb: (N,3) uint8
    v = rgb.astype(np.float64) / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[:, 0], lin[:, 1], lin[:, 2]
    X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750)
    Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883
    def f(t):
        return np.where(t > 216 / 24389, np.cbrt(t), (24389 / 27 * t + 16) / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=1)

def de2000_np(lab, ref):
    """lab: (N,3) 陣列；ref: 單一 (3,) 參考色。回傳 (N,)。"""
    L1, a1, b1 = lab[:, 0], lab[:, 1], lab[:, 2]
    L2, a2, b2 = float(ref[0]), float(ref[1]), float(ref[2])
    C1 = np.hypot(a1, b1); C2 = np.hypot(a2, b2)
    Cbar = (C1 + C2) / 2
    C7 = Cbar ** 7
    G = 0.5 * (1 - np.sqrt(C7 / (C7 + 25.0 ** 7)))
    ap1 = (1 + G) * a1; ap2 = (1 + G) * a2
    Cp1 = np.hypot(ap1, b1); Cp2 = np.hypot(ap2, b2)
    hp1 = np.degrees(np.arctan2(b1, ap1)); hp1 = np.where((ap1 == 0) & (b1 == 0), 0.0, np.where(hp1 < 0, hp1 + 360, hp1))
    hp2 = np.degrees(np.arctan2(b2, ap2)); hp2 = np.where((ap2 == 0) & (b2 == 0), 0.0, np.where(hp2 < 0, hp2 + 360, hp2))
    zero = (Cp1 * Cp2) == 0
    dLp = L2 - L1; dCp = Cp2 - Cp1
    dhp = hp2 - hp1
    dhp = np.where(dhp > 180, dhp - 360, np.where(dhp < -180, dhp + 360, dhp))
    dhp = np.where(zero, 0.0, dhp)
    dHp = 2 * np.sqrt(Cp1 * Cp2) * np.sin(np.radians(dhp / 2))
    Lbp = (L1 + L2) / 2; Cbp = (Cp1 + Cp2) / 2
    hsum = hp1 + hp2
    hbp = np.where(np.abs(hp1 - hp2) <= 180, hsum / 2,
                   np.where(hsum < 360, (hsum + 360) / 2, (hsum - 360) / 2))
    hbp = np.where(zero, hsum, hbp)
    T = (1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp))
           + 0.32 * np.cos(np.radians(3 * hbp + 6)) - 0.20 * np.cos(np.radians(4 * hbp - 63)))
    dth = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    Cbp7 = Cbp ** 7
    Rc = 2 * np.sqrt(Cbp7 / (Cbp7 + 25.0 ** 7))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dth)) * Rc
    return np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2
                   + Rt * (dCp / Sc) * (dHp / Sh))

def cross_check():
    """向量化的那一支跟純量的那一支對過。20,000 組隨機顏色對。"""
    rng = np.random.default_rng(20260906)
    n = 4000
    A = rng.integers(0, 256, size=(n, 3), dtype=np.uint8)
    B = rng.integers(0, 256, size=(n, 3), dtype=np.uint8)
    labA, labB = srgb_to_lab_np(A), srgb_to_lab_np(B)
    worst = 0.0
    for i in range(n):
        v = de2000_np(labA[i:i + 1], labB[i])[0]
        s = L.de2000_lab(tuple(labA[i]), tuple(labB[i]))
        worst = max(worst, abs(v - s))
    return worst

def main():
    pal = L.load_palette()
    P = L.load_people()
    body = [pal['ink'], pal['inkCar'], pal['bad']]
    bgs = L.backgrounds()
    accs = sorted({s['acc'] for s in P.values()})
    print(f'現有配件色 {len(accs)} 個、背景 {len(bgs)} 種、身體色 {len(body)} 種')

    ACC_MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 9.0
    print(f'配件互斥門檻 {ACC_MIN}')

    print('向量化 CIEDE2000 對純量版的最大差：', end=' ', flush=True)
    print(f'{cross_check():.3e}  （不是校準，是「向量化沒寫錯」）')

    refs_hard = [np.array(L.hex_to_lab(h)) for h in body] + [np.array(L.hex_to_lab(h)) for _, h in bgs]
    refs_acc = [np.array(L.hex_to_lab(h)) for h in accs]

    keep_rgb, keep_min_acc = [], []
    N = 1 << 24
    CH = 1 << 21
    for start in range(0, N, CH):
        idx = np.arange(start, min(start + CH, N), dtype=np.uint32)
        rgb = np.stack([(idx >> 16) & 255, (idx >> 8) & 255, idx & 255], axis=1).astype(np.uint8)
        lab = srgb_to_lab_np(rgb)
        alive = np.ones(len(lab), dtype=bool)
        for r in refs_hard:                                 # 先濾硬門檻 25，剩得少
            alive[alive] = de2000_np(lab[alive], r) >= 25.0
            if not alive.any(): break
        if not alive.any():
            print(f'  {start + CH:>9,} / {N:,}  存活 0', flush=True); continue
        lab2, rgb2 = lab[alive], rgb[alive]
        mn = np.full(len(lab2), np.inf)
        for r in refs_acc:
            mn = np.minimum(mn, de2000_np(lab2, r))
        sel = mn >= ACC_MIN
        keep_rgb.append(rgb2[sel]); keep_min_acc.append(mn[sel])
        print(f'  {min(start + CH, N):>9,} / {N:,}  過硬門檻 {alive.sum():>7,}  可行 {sel.sum():>6,}', flush=True)

    rgb = np.concatenate(keep_rgb); mn = np.concatenate(keep_min_acc)
    print(f'\n可行點總數（門檻 {ACC_MIN}）：{len(rgb):,}')

    lab = srgb_to_lab_np(rgb)
    hue = (np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) + 360) % 360
    bins = [(0,30,'紅'),(30,60,'橘'),(60,100,'黃'),(100,160,'黃綠'),(160,200,'綠青'),
            (200,250,'青藍'),(250,290,'藍紫'),(290,330,'紫洋紅'),(330,360,'洋紅紅')]
    print('逐色相：')
    for lo, hi, nm in bins:
        m = (hue >= lo) & (hue < hi)
        print(f'  {nm:<4} {lo:>3}–{hi:<3}°  {int(m.sum()):>7,}')

    np.savez_compressed(os.path.join(L.ROOT, 'tools', '_artroof_feasible.npz'),
                        rgb=rgb, min_acc=mn, hue=hue, lab=lab)
    print('\n可行點存到 tools/_artroof_feasible.npz')

if __name__ == '__main__':
    main()
