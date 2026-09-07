# -*- coding: utf-8 -*-
"""artexp_redteam.py — 把圖弄壞，看 artexp.py 會不會紅。

**「跑過測試」不算。** 一支永遠回綠的檢查跟一支沒寫的檢查在交付訊息裡長得一樣，
而且前者更糟——它會讓人以為驗過了。所以每一條判準都要**在它應該紅的時候紅過**，
而且**一次只弄壞一個東西**：一次弄壞兩個的話，看到紅也不知道是哪一條抓到的。

每一組注入都斷言兩件事：
  · 該紅的那一條紅了（而且**訊息裡要出現我注入的那個值**——只看到「不通過」
    不足以證明它量到的是我弄壞的那一格）
  · **其他每一條都還是綠的**（否則這條紅可能是別的東西溢出來的）
"""
import sys, os, json, copy, io, contextlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artexp                                                     # noqa: E402
from artexp import World, ROOT, shade_hex                         # noqa: E402

NEW = ['student', 'runner', 'crate', 'hazmat', 'keeper', 'leaker',
       'nightlab', 'rackman', 'laureate']


def run(overlay_obj):
    """把一份 overlay 寫成暫存檔、跑一次 report()，回 (fails, 全文)。"""
    tmp = os.path.join(ROOT, 'design', '.redteam-tmp.json')
    with io.open(tmp, 'w', encoding='utf-8') as f:
        json.dump(overlay_obj, f, ensure_ascii=False)
    try:
        w = World(ROOT, overlay=tmp)
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            fails = artexp.report(w)
        return fails, buf.getvalue()
    finally:
        os.remove(tmp)


def base():
    """基準**直接從 js/sprites.js 讀**，不從中間檔讀。

    第一版我把九張圖也存了一份 JSON 當基準，於是同一份圖有兩個來源——
    改了產品檔而忘了改 JSON 的話，紅隊測的是一份已經不存在的圖，而它會全綠。
    """
    w = World(ROOT)
    return {k: copy.deepcopy(w.people[k]) for k in NEW}


def axis(fails, key):
    return [f for f in fails if f.startswith(key)]


CASES = []


def case(name, want, needle):
    def deco(fn):
        CASES.append((name, want, needle, fn))
        return fn
    return deco


# ---- 1 互斥：把一個新色設成跟既有的 acc 逐字相同 -> ΔE 0
# ⚠ **要挑一個「離背景與身體色都很遠」的既有 acc**（fooddeliv：背景 41.70、身體 42.60）。
#   第一版我用 office #8a5a2b，結果**判準 3 也一起紅了**——office 自己就是背景背債之一，
#   借它的顏色就連它的債一起借過來。那不是儀器壞了，是我的注入不乾淨。
@case('互斥 = 0', '判準1', 'crate|fooddeliv 0.0000')
def c1(o):
    o['crate']['acc'] = '#00ae03'          # = fooddeliv
    return o


# ---- 2 身體色：把一個新色設成 pal.bad -> urgent 的配件溶進身體
@case('身體色 = 0', '判準2', 'runner 0.0000（urgent 對 pal.bad）')
def c2(o):
    o['runner']['acc'] = '#e2645a'         # = pal.bad
    return o


# ---- 3 背景：把一個新色推到樓層底色旁邊 -> 配件溶進地板
# ⚠ **不能直接設成某一種樓層底色。** 我先試了 `shadeHex('#5c3a4a', 0.78)`，判準 2 跟著紅。
#   查了原因：**29 種背景色沒有任何一種離三個身體色都 >= 25**（最遠的是
#   office@0.78 的 19.58），所以「配件 = 背景」在這個調色盤裡**必然**同時違反兩條。
#   那是這個調色盤的性質，不是儀器的毛病——所以改成掃出一個
#   「背景 < 25 但身體 >= 25、互斥 >= 9.5146」的點（全域有 67,703 個），
#   用它才問得出「判準 3 單獨會不會紅」。
@case('背景 = 0', '判準3', 'hazmat 5.7223')
def c3(o):
    o['hazmat']['acc'] = '#365448'         # 背景 5.7223 / 身體 25.0615 / 互斥 10.5481
    return o


# ---- 4 形狀：把一張新圖抄成既有的圖、只改一格 -> d = 1
# ⚠ **兩個姿勢都要改**：shapeDist 是 min(normal, urgent)，只改一個的話 min 會是 0。
#   而且改的方向要是「**加**一格」不是「換一格的顏色」——把 '#' 換成 'o' 會讓
#   剪影變成逐格相同，判準 5 跟著紅。加一格 '.'->'#' 才只動三態、不動剪影為零。
@case('形狀 d=1', '判準4', 'evacuee|nightlab d=1')
def c4(o):
    w = World(ROOT)
    src = copy.deepcopy(w.people['evacuee'])
    n = list(src['normal']); u = list(src['urgent'])
    n[0] = '.####..'                         # evacuee 是 '..###..'，多一格
    u[5] = '######.'                         # evacuee 是 '.#####.'，多一格
    o['nightlab']['normal'] = n
    o['nightlab']['urgent'] = u
    return o


# ---- 5 剪影：抄一張既有的圖，只把身體格換成配件格 -> 剪影逐格相同，但三態距離仍 >= 12
#      **這一組是為了證明兩個度量是分開的**：三態看不到「同一個剪影」。
@case('剪影相同（三態仍過關）', '判準5', 'evacuee|laureate')
def c5(o):
    w = World(ROOT)
    src = copy.deepcopy(w.people['evacuee'])

    def swap(rows):
        out = []
        n = 0
        for r in rows:
            s = ''
            for ch in r:
                if ch == '#' and n < 14:      # 換掉 14 格 -> 三態距離 14 >= 12
                    s += 'o'
                    n += 1
                else:
                    s += ch
            out.append(s)
        return out
    o['laureate']['normal'] = swap(src['normal'])
    o['laureate']['urgent'] = swap(src['urgent'])
    return o


# ---- 6 色距函式自己：**把分支只翻一半**，看自洽檢查會不會抓到。
# 這一組弄壞的不是圖，是**尺**。harness 的作者自己踩過這個 bug（far 側的 hb
# 拿 raw 的正負去位移，於是 a→b 與 b→a 落在不同側），而抓到它的正是「對稱性」這條
# 不需要任何外部測資的必要條件。我的 far 側也要證明得了同一件事。
def redteam_metric():
    import artexp as A
    orig = A.de2000_side

    def broken(lab1, lab2, side):
        # far 側的 hb 拿 raw 的正負去位移 —— 交換兩色時 raw 變號，hb 跟著跳到
        # 另一邊，於是 a->b 與 b->a 落在不同側，對稱性破掉。
        if side != 'far':
            return orig(lab1, lab2, side)
        import math
        L1, a1, b1 = lab1
        L2, a2, b2 = lab2
        rad, deg = math.pi / 180.0, 180.0 / math.pi
        C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
        Cb = (C1 + C2) / 2.0
        G = 0.5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25.0 ** 7)))
        ap1, ap2 = (1 + G) * a1, (1 + G) * a2
        Cp1, Cp2 = math.hypot(ap1, b1), math.hypot(ap2, b2)

        def hp(a, b):
            if a == 0 and b == 0:
                return 0.0
            t = math.atan2(b, a) * deg
            return t + 360.0 if t < 0 else t
        hp1, hp2 = hp(ap1, b1), hp(ap2, b2)
        dLp, dCp = L2 - L1, Cp2 - Cp1
        Lbp, Cbp = (L1 + L2) / 2.0, (Cp1 + Cp2) / 2.0
        raw = hp2 - hp1
        hs = hp1 + hp2
        if Cp1 * Cp2 == 0:
            dhp, hbp = 0.0, hs
        else:
            # **兩個都翻了，但 hb 是拿 `raw` 的正負去決定位移的。**
            # dh 那樣是對的（交換兩色時 dh 本來就該變號，而 dH 進到平方項與
            # 「dC×dH」交叉項，dC 也變號，所以交叉項不變），**hb 那樣是錯的**：
            # 平均色相不該隨參數順序改變。這正是 harness 作者踩過的形狀。
            dhp = raw + (360 if raw < 0 else -360)
            hbp = (hs + (360 if raw < 0 else -360)) / 2.0
        dHp = 2.0 * math.sqrt(Cp1 * Cp2) * math.sin(dhp / 2.0 * rad)
        T = (1 - 0.17 * math.cos((hbp - 30) * rad) + 0.24 * math.cos(2 * hbp * rad)
             + 0.32 * math.cos((3 * hbp + 6) * rad) - 0.20 * math.cos((4 * hbp - 63) * rad))
        dth = 30.0 * math.exp(-(((hbp - 275.0) / 25.0) ** 2))
        Rc = 2.0 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7))
        Sl = 1 + (0.015 * (Lbp - 50) ** 2) / math.sqrt(20 + (Lbp - 50) ** 2)
        Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
        Rt = -math.sin(2 * dth * rad) * Rc
        return (math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2
                          + Rt * (dCp / Sc) * (dHp / Sh)), abs(hp1 - hp2))

    A.de2000_side = broken
    A._LAB_CACHE.clear()
    try:
        fails, text = run(base())
    finally:
        A.de2000_side = orig
    hit = [f for f in fails if f.startswith('色距函式不自洽')]
    others = [f for f in fails if not f.startswith('色距函式不自洽')]
    print('\n== 注入：ΔE 的 far 側只翻一半（弄壞的是尺，不是圖）==')
    print('   自洽檢查紅了嗎：%s' % (('是 -> ' + '；'.join(hit)) if hit else '**沒有**'))
    print('   其他判準有沒有被連累：%s' % ('沒有' if not others else '**有：%r**' % (others,)))
    for ln in text.split('\n'):
        if '不對稱' in ln and 'far' in ln:
            print('   它說了什麼：' + ln.strip()[:200])
    ok = bool(hit) and not others
    print('   => %s' % ('這條自洽檢查確實會紅' if ok else '**這一組沒有達成目的**'))
    return ok


def main():
    print('== 基準：沒有注入任何缺陷 ==')
    fails, _ = run(base())
    print('   fails = %r' % (fails,))
    if fails:
        print('   **基準就不是綠的，紅隊測試沒有意義**')
        return 2

    bad = 0
    for name, want, needle, fn in CASES:
        o = fn(base())
        fails, text = run(o)
        hit = axis(fails, want)
        others = [f for f in fails if not f.startswith(want)]
        found = needle in text
        ok = bool(hit) and found and not others
        print('\n== 注入：%s ==' % name)
        print('   %s 紅了嗎：%s' % (want, ('是 -> ' + '；'.join(hit)) if hit else '**沒有**'))
        print('   訊息裡有 %r 嗎：%s' % (needle, '有' if found else '**沒有**'))
        print('   其他判準有沒有被連累：%s' % ('沒有' if not others else '**有：%r**' % (others,)))
        # 把 report 印出來的那一行證據帶出來
        for ln in text.split('\n'):
            if needle in ln:
                print('   它說了什麼：' + ln.strip()[:220])
                break
        if not ok:
            bad += 1
            print('   => **這一組沒有達成目的**')
        else:
            print('   => 這一條判準確實會紅')
    if not redteam_metric():
        bad += 1
    print('\n%d/%d 組達成目的' % (len(CASES) + 1 - bad, len(CASES) + 1))
    return 0 if bad == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
