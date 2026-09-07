# artroof_opt.py — 形狀的爬山搜尋。
#
# **為什麼需要這個**：`.#####.` ×3 ＋ `..#.#..` 的「普通人」骨架已經被十幾張圖佔滿，
# 任何用那個骨架的新圖一開始就離 `office`／`observer`／`closing` 只有 6–10 格。
# 而門檻是 12，`tests/acceptance.js` 第 15 組自己寫著：
#   「要跨過 12 需要**大約六格以上的結構改變**——換配件顏色對這個距離的貢獻是 0」。
#
# 這支工具做的事：**固定我的設計意圖（哪幾格是配件），讓身體格去找那六格
# 結構改變該放在哪裡**。它不發明造型，它是在我畫完之後告訴我還差幾格。
#
# ⚠ **它的目標函數裡沒有「好不好看」。** 上一趟的 `laureate` 與 `runner`
#   五條判準全過還是被接觸表退回——所以這支的輸出一律要再進接觸表，
#   不可以直接抄進 sprites.js。
#
# 內部一律用 0/1/2 的整數格（`.`/`#`/`o`），不用字串——第一版用字串，
# 在爬山迴圈裡踩到一個我沒查清楚的型別錯誤，重寫成整數之後就沒有了。
import sys, os, random
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artroof_lib as L

CH = '.#o'
def to_grid(rows):  return [[CH.index(c) for c in r] for r in rows]
def to_rows(grid):  return [''.join(CH[v] for v in r) for r in grid]

def tri_d(a, b):
    return sum(1 for r in range(9) for c in range(7) if a[r][c] != b[r][c])
def sil_d(a, b):
    return sum(1 for r in range(9) for c in range(7) if (a[r][c] != 0) != (b[r][c] != 0))

def make_pool(exclude, extra):
    """exclude: 不放進池子的 id；extra: {id: (normal_rows, urgent_rows)}"""
    P = L.load_people()
    pas = set(L.load_passengers())
    pool = {k: (to_grid(v['normal']), to_grid(v['urgent']))
            for k, v in P.items() if k in pas and k not in exclude}
    for k, (n, u) in extra.items():
        pool[k] = (to_grid(n), to_grid(u))
    return pool

def nearest(gn, gu, pool):
    dm, sm, who = 999, 999, ''
    for k, (pn, pu) in pool.items():
        d = min(tri_d(gn, pn), tri_d(gu, pu))
        s = min(sil_d(gn, pn), sil_d(gu, pu))
        if d < dm: dm, who = d, k
        if s < sm: sm = s
    return dm, sm, who

def climb(seed_n, seed_u, pool, target=14, iters=120000, seed=7):
    """只動「非配件」的格（配件位置是設計意圖，凍結）。
    目標：三態距離 >= target、剪影 != 0，在那之上**離種子越近越好**。"""
    rng = random.Random(seed)
    sn, su = to_grid(seed_n), to_grid(seed_u)
    cur = [[r[:] for r in sn], [r[:] for r in su]]
    frozen = {(p, r, c) for p, g in ((0, sn), (1, su))
              for r in range(9) for c in range(7) if g[r][c] == 2}
    def score():
        d, s, _ = nearest(cur[0], cur[1], pool)
        drift = tri_d(cur[0], sn) + tri_d(cur[1], su)
        return min(d, target) * 1000 + (0 if s > 0 else -5000) - drift
    best = score()
    for _ in range(iters):
        p = rng.randrange(2); r = rng.randrange(9); c = rng.randrange(7)
        if (p, r, c) in frozen: continue
        old = cur[p][r][c]
        cur[p][r][c] = 1 - old if old in (0, 1) else old      # 只在 . 與 # 之間翻
        if cur[p][r][c] == old: continue
        s2 = score()
        if s2 >= best: best = s2
        else: cur[p][r][c] = old
    return to_rows(cur[0]), to_rows(cur[1])

if __name__ == '__main__':
    import importlib.util
    spec = importlib.util.spec_from_file_location('c', sys.argv[1])
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    want = sys.argv[2:] or list(m.CANDS)
    done = {}
    for name in want:
        n, u = m.CANDS[name]
        extra = {k: v for k, v in m.CANDS.items() if k != name}
        extra.update(done)
        pool = make_pool(set(m.CANDS), extra)
        d0, s0, w0 = nearest(to_grid(n), to_grid(u), pool)
        rn, ru = climb(n, u, pool)
        d1, s1, w1 = nearest(to_grid(rn), to_grid(ru), pool)
        done[name] = (rn, ru)
        print(f'--- {name}：形狀 {d0}（{w0}）→ {d1}（{w1}）  剪影 {s0} → {s1} ---')
        print('    normal                    urgent')
        for i in range(9):
            a, b = n[i], rn[i]
            c_, dd = u[i], ru[i]
            print(f"    '{b}',{'  *' if a != b else '   '}   '{dd}',{'  *' if c_ != dd else ''}")
