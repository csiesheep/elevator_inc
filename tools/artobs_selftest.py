# -*- coding: utf-8 -*-
"""儀器自檢：`tools/artobs.py`（我寫的）對上 `tools/artlib.py`（前一趟的）
與 Sharma 論文的 15 組校準測資。**兩支不同意就代表有一支錯了。**

    python tools/artobs_selftest.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artobs as O
import artlib as A


def main():
    bad = []

    # ---- 1 Sharma 校準（外部測資；對稱與自距離為零兩條自檢擋不住校準錯誤）
    worst = 0.0
    for l1, l2, want in O.SHARMA:
        got = O.de2000_lab(l1, l2)
        worst = max(worst, abs(got - want))
    print('1 · Sharma 15 組校準：最大偏差 %.6f' % worst)
    if worst > 0.005:
        bad.append('Sharma 校準偏差 %.6f 太大' % worst)

    # ---- 2 自距離為零 + 對稱
    cols = sorted({s['acc'] for s in O.people().values()}) + [c for _, c in O.backgrounds()] \
         + [c for _, c in O.pal_body()]
    mx_self = max(abs(O.de2000(c, c)) for c in cols)
    mx_asym = 0.0
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            mx_asym = max(mx_asym, abs(O.de2000(cols[i], cols[j]) - O.de2000(cols[j], cols[i])))
    print('2 · %d 個顏色：自距離最大 %.12f、不對稱最大 %.12f' % (len(cols), mx_self, mx_asym))
    if mx_self > 1e-9 or mx_asym > 1e-9:
        bad.append('自距離或對稱壞了')

    # ---- 3 度量不是常數（母體非空 + 看得到大值）
    bw = O.de2000('#000000', '#ffffff')
    print('3 · 黑對白 = %.4f（必須 > 90）' % bw)
    if not bw > 90:
        bad.append('黑對白 %.4f 不到 90' % bw)

    # ---- 4 對上 artlib（另一個獨立實作，向量化 numpy）
    mx = 0.0
    arg = None
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            d = abs(O.de2000(cols[i], cols[j]) - A.de_hex(cols[i], cols[j]))
            if d > mx:
                mx, arg = d, (cols[i], cols[j])
    print('4 · 對 artlib.py：%d 對，最大分歧 %.6f  %s' % (len(cols) * (len(cols) - 1) // 2, mx, arg))
    if mx > 0.01:
        bad.append('跟 artlib 分歧 %.6f' % mx)

    # ---- 5 產品資料的解析要對得起來（**這是 #105 那個 pal.money 陷阱的位置**）
    mine = O.pal_body()
    theirs = A.body_colors()
    print('5 · 身體色（逐鍵解析）：' + '、'.join('%s %s' % t for t in mine))
    print('    artlib（正則）    ：' + '、'.join('%s %s' % t for t in theirs))
    ms = sorted(c for _, c in mine)
    ts = sorted(c for _, c in theirs)
    if ms != ts:
        bad.append('兩支解析出來的身體色不同：%s vs %s' % (ms, ts))
    # 而且要真的是 theme.js 檔案裡那三個字面值
    for want in ('#eaf0fb', '#12161f', '#e2645a'):
        if want not in ms:
            bad.append('身體色少了 %s' % want)
    # money 絕對不可以混進來
    objs = O.theme_objects()
    money = objs['NIGHT']['money'].lower()
    print('    pal.money = %s（**不可以出現在上面那一行**）' % money)
    if money in ms:
        bad.append('抓到了 pal.money，這正是 #105 那個陷阱')

    # ---- 6 背景色母體
    bgs = O.backgrounds()
    print('6 · 背景色 %d 種（28 樓層 + 轎廂 %s）；floor k = %s'
          % (len(bgs), O.pal_car(), O.floor_ks()))
    if len(bgs) != 29:
        bad.append('背景色不是 29 種而是 %d' % len(bgs))
    if sorted(c for _, c in bgs) != sorted(c for _, c in (A.floor_shades() + [('car', '#e6ecf7')])):
        bad.append('背景色集合跟 artlib 對不上')

    # ---- 7 shadeHex 抄本沒有漂移
    print('7 · render.js 的 shadeHex 抄本：%s' % ('逐字相同' if O.shade_src_ok() else '**對不上**'))
    if not O.shade_src_ok():
        bad.append('shadeHex 抄本漂移，地板色不可信')
    for h, k in [('#3a4a63', 0.78), ('#4a3f5c', 0.62), ('#ffffff', 1.95), ('#010101', 0.5)]:
        if O.shade_hex(h, k) != A.shade_hex(h, k):
            bad.append('shade_hex 分歧 %s @%s' % (h, k))

    # ---- 8 形狀度量活著
    P = O.people()
    ids = sorted(P)
    print('8 · 形狀：office 對自己 %d（必須 0）、office 對 resident %d（必須 > 0）'
          % (O.shape_dist(P['office'], P['office']), O.shape_dist(P['office'], P['resident'])))
    if O.shape_dist(P['office'], P['office']) != 0:
        bad.append('形狀自距離不是 0')
    mx = 0.0
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if O.shape_dist(P[ids[i]], P[ids[j]]) != A.shape_dist(P[ids[i]], P[ids[j]]):
                bad.append('形狀距離跟 artlib 分歧 %s|%s' % (ids[i], ids[j]))
    print('    %d 張圖、%d 組配對跟 artlib 逐格相同' % (len(ids), len(ids) * (len(ids) - 1) // 2))

    print()
    if bad:
        print('結論：儀器自檢 %d 項不過 —— %s' % (len(bad), '；'.join(bad)))
    else:
        print('結論：儀器自檢全部通過（%d 個顏色、%d 張圖）。' % (len(cols), len(ids)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
