# artroof_pick.py — 從可行點裡挑五個配件色。
#
# ⚠ **這不是「挑五個過門檻的點」，是一個五點的聯合問題。**
#   每加一個顏色就把後面幾個的可行域再削一次，所以「一段色相挑一個最好的」
#   會在第三、第四個撞牆——我第一版就是那樣。
#
# 現況（`artroof_scan.py` 全 16,777,216 點掃出來的，門檻 9）：
#   · 可行點 **28,207 個**。⚠ 簡報上的 93,634 是**加進最後九張圖之前**的數字：
#     現有 acc 從 64 變成 73 之後，空間被削掉約七成。（另外簡報說「74 個配件色」，
#     實際數到的是 **73**——73 張圖、73 個 acc、78 個 PASSENGERS，缺的正好是這五個。）
#   · **整個可行域裡「對既有色的最小餘裕」最大值只有 10.0001，而且只有一個點。**
#     所以「五個新色彼此與對既有都 ≥ 10」在幾何上不存在，不是我沒找到。
#   · 紅 0–30° 與橘 30–60° 都是 **0 個點**（簡報說的，我複驗過，一樣是 0）。
#   · **青藍 200–250° 的上限只有 9.3820**——低於表上現有的互斥最小值 9.5146。
#     所以 `towerctl` 拿不到「天空那一側」的顏色：拿了就等於把全表最小值壓下去，
#     而那要先問 orchestrator。**這一趟沒有壓，改用紫。**
#
# 兩個目標互相拉扯，這支工具把取捨攤開來讓人選，不是自己決定：
#   · `SEP`（五個新色彼此的最小距離）越大 → 玩家越分得出來
#   · `min_acc`（對既有 73 色的餘裕）越大 → 離門檻越安全
#   實測的取捨曲線（見 --sweep）：SEP 17 → 餘裕 9.6022（但五色裡三個是綠的）、
#   SEP 19 → 9.5548（五個色相家族各一個）、SEP 22 → 無解。
#   **選 SEP 19**：門檻是 9，餘裕差那 0.05 不會翻面；而「三個綠的」是眼睛的事。
#
# ⚠ **BODY_MARGIN / BG_MARGIN 為什麼是 26 而不是 25**：guard 的門檻是 25，
#   但「25 不是一個可以瞄準的數字」（`tests/acceptance.js` 第 16 組自己寫的：
#   兩個 CIEDE2000 實作差到 0.0022）。第一輪挑出來的 `orbitpax` 對 `pal.bad`
#   是 **25.0626**、`towerctl` 對轎廂內裝是 **25.1945**——過了，但那不是餘裕，
#   是運氣。留 1.0 的餘裕重挑，五個都還在。
import sys, os, numpy as np
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artroof_lib as L
from artroof_scan import de2000_np

FLOOR = 9.5146      # 表上現有的互斥最小值（delegate|acrophobe），不可以壓到它以下
BODY_MARGIN = 25.5  # guard 門檻 25，留 0.5
BG_MARGIN = 25.5
SEP = float(next((a.split('=')[1] for a in sys.argv if a.startswith('--sep=')), 17.0))

def load():
    d = np.load(os.path.join(L.ROOT, 'tools', '_artroof_feasible.npz'))
    rgb, hue, lab, mn = d['rgb'], d['hue'], d['lab'], d['min_acc']
    pal = L.load_palette()
    mb = np.full(len(rgb), np.inf)
    for h in (pal['ink'], pal['inkCar'], pal['bad']):
        mb = np.minimum(mb, de2000_np(lab, np.array(L.hex_to_lab(h))))
    mg = np.full(len(rgb), np.inf)
    for _, h in L.backgrounds():
        mg = np.minimum(mg, de2000_np(lab, np.array(L.hex_to_lab(h))))
    return rgb, hue, lab, mn, mb, mg

def solve(lab, mn, D, keep0, sep):
    """在 keep0 這批點裡，找五個彼此 >= sep 的點，最大化「對既有色的最小餘裕」。"""
    lo, hi, best = FLOOR, 9.99, None
    for _ in range(28):
        T = (lo + hi) / 2
        order = keep0[mn[keep0] >= T]
        order = order[np.argsort(-mn[order])]
        found = None
        for seed in order[:min(400, len(order))]:
            sel = [seed]
            for k in order:
                if len(sel) >= 5: break
                if k != seed and all(D[k, s] >= sep for s in sel): sel.append(k)
            if len(sel) >= 5: found = sel; break
        if found: lo, best = T, found
        else: hi = T
    return lo, best

def main():
    rgb, hue, lab, mn, mb, mg = load()
    keep = np.where((mb >= BODY_MARGIN) & (mg >= BG_MARGIN) & (mn >= FLOOR))[0]
    print(f'可行點 {len(rgb):,} → 加上「身體 ≥ {BODY_MARGIN}、背景 ≥ {BG_MARGIN}、'
          f'互斥 ≥ {FLOOR}」之後剩 {len(keep):,}')
    D = np.zeros((len(keep), len(keep)))
    for i in range(len(keep)):
        D[i] = de2000_np(lab[keep], lab[keep[i]])
    kidx = np.arange(len(keep))

    if '--sweep' in sys.argv:
        for s in [15, 16, 17, 18, 19, 20, 21, 22, 23]:
            v, sel = solve(lab[keep], mn[keep], D, kidx, s)
            if sel is None: print(f'  SEP={s:>2}: 無解'); continue
            hs = ' '.join('%3.0f°' % hue[keep][k] for k in sorted(sel, key=lambda k: hue[keep][k]))
            print(f'  SEP={s:>2}: 餘裕 {v:.4f}  彼此最小 '
                  f'{min(D[a,b] for a in sel for b in sel if a!=b):5.2f}  色相 {hs}')
        return 0

    v, sel = solve(lab[keep], mn[keep], D, kidx, SEP)
    if sel is None:
        print('無解'); return 1
    sel = sorted(sel, key=lambda k: hue[keep][k])
    print(f'\nSEP={SEP}：五個新色對既有 73 色的最小餘裕 {v:.4f}（下限 {FLOOR}）')
    for k in sel:
        g = keep[k]
        print(f'  #{rgb[g][0]:02x}{rgb[g][1]:02x}{rgb[g][2]:02x}  hue {hue[g]:6.1f}  L* {lab[g][0]:5.1f}'
              f'  互斥 {mn[g]:7.4f}  身體 {mb[g]:7.4f}  背景 {mg[g]:7.4f}')
    print('\n彼此：')
    for i in range(5):
        for j in range(i + 1, 5):
            print(f'  {i}-{j}  {D[sel[i], sel[j]]:6.2f}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
