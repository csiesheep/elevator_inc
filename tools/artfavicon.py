# -*- coding: utf-8 -*-
"""#149 的 favicon 候選：**實際 16×16 的 PNG**（不是放大圖——放大圖看起來都好看）。

排版方案（理由寫在 #149 的留言）：
  16×16 = 一塊實心底色磚 `#16183a`（首頁大樓的外殼色）
    └ 小人 2×，先取自己的佔用範圍（bbox），再置中
        · 佔用列 ≤ 8 → 零裁切
        · 佔用列 = 9 且最後一列跟前一列逐字相同（或全空）→ 砍掉它，仍是無損
        · 其他 → 不列入候選

**這支不從 js/spritedom.js 讀任何邏輯**，排版在這裡自己再寫一次；
兩邊對不上就是有一邊錯了（跟 artlib 對 CIEDE2000 的做法同一條規矩）。

用法：python tools/artfavicon.py            → design/favicon/*.png
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artlib import parse_people, de_hex, hex_to_rgb
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'design', 'favicon')

BG = '#16183a'    # index.html 的 tower 外殼
INK = '#f2f4fb'   # theme.js CSS_DAY.text —— 深藍磚上最亮的那一階

CANDIDATES = ['office', 'cat', 'ghost', 'guard', 'mover']


def plan(rows):
    """回 (top, bot, left, right, crop) 或 None（裝不進 16×16）。"""
    rs = [i for i, x in enumerate(rows) if x.strip('.')]
    cs = [c for c in range(7) if any(x[c] != '.' for x in rows)]
    if not rs:
        return None
    t, b, l, r = rs[0], rs[-1], cs[0], cs[-1]
    if b - t + 1 <= 8:
        return t, b, l, r, 'none'
    last, prev = rows[8], rows[7]
    if last.strip('.') == '' or last == prev:
        return t, 7, l, r, 'redundant-last-row'
    return None


def render16(rows, acc, bg=BG, ink=INK):
    p = plan(rows)
    if p is None:
        return None, None
    t, b, l, r, crop = p
    w, h = (r - l + 1) * 2, (b - t + 1) * 2
    ox, oy = (16 - w) // 2, (16 - h) // 2
    img = Image.new('RGB', (16, 16), hex_to_rgb(bg))
    px = img.load()
    for rr in range(t, b + 1):
        for cc in range(l, r + 1):
            ch = rows[rr][cc]
            if ch == '.':
                continue
            col = hex_to_rgb(ink if ch == '#' else acc)
            for dy in range(2):
                for dx in range(2):
                    px[ox + (cc - l) * 2 + dx, oy + (rr - t) * 2 + dy] = col
    return img, dict(crop=crop, w=w, h=h, ox=ox, oy=oy)


def svg16(rows, acc, bg=BG, ink=INK):
    """跟 js/spritedom.js 的 faviconSVG() **逐字元相同**的輸出。
    對不上就是有一邊改了而另一邊沒有——瀏覽器裡的探針會比這兩個字串。"""
    p = plan(rows)
    if p is None:
        return None
    t, b, l, r, _ = p
    ox, oy = (16 - (r - l + 1) * 2) // 2, (16 - (b - t + 1) * 2) // 2

    def path(sym):
        d = ''
        for rr in range(t, b + 1):
            row, c = rows[rr], 0
            while c < 7:
                if row[c] != sym:
                    c += 1
                    continue
                n = 1
                while c + n < 7 and row[c + n] == sym:
                    n += 1
                d += 'M%d %dh%dv1h-%dz' % (c - l, rr - t, n, n)
                c += n
        return d

    g = ''
    di, da = path('#'), path('o')
    if di:
        g += '<path fill="%s" d="%s"/>' % (ink, di)
    if da:
        g += '<path fill="%s" d="%s"/>' % (acc, da)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'
            '<rect width="16" height="16" fill="%s"/>'
            '<g transform="translate(%d %d) scale(2)">%s</g></svg>' % (bg, ox, oy, g))


def main():
    P = parse_people()
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new('RGB', (16 * len(CANDIDATES) + 4 * (len(CANDIDATES) + 1), 24),
                      hex_to_rgb('#0f1116'))
    x = 4
    for k in CANDIDATES:
        v = P[k]
        img, meta = render16(v['normal'], v['acc'])
        assert img is not None, k
        img.save(os.path.join(OUT, 'fav-%s.png' % k))
        # 8× 的放大圖：只是給人在留言裡看得清楚格子，**不是判準**
        img.resize((128, 128), Image.NEAREST).save(os.path.join(OUT, 'fav-%s-8x.png' % k))
        open(os.path.join(OUT, 'fav-%s.svg' % k), 'w', encoding='utf-8').write(svg16(v['normal'], v['acc']))
        sheet.paste(img, (x, 4))
        x += 20
        print('%-8s %s crop=%-18s %dx%d at (%d,%d)  dE(acc,bg) %7.4f  dE(acc,ink) %7.4f'
              % (k, v['acc'], meta['crop'], meta['w'], meta['h'], meta['ox'], meta['oy'],
                 de_hex(v['acc'], BG), de_hex(v['acc'], INK)))
    sheet.save(os.path.join(OUT, 'fav-row.png'))
    sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save(
        os.path.join(OUT, 'fav-row-6x.png'))

    # ---- 出貨用的兩個檔（root，index.html／game.html 的兄弟）。
    # SVG 一個檔覆蓋所有尺寸；180 的 PNG 是 apple-touch-icon（iOS 加到主畫面時
    # 不吃 SVG）。**NEAREST 放大**，16 的整數格放大 ×11 之後仍然對齊。
    ship = os.environ.get('FAVICON', CANDIDATES[0])
    v = P[ship]
    open(os.path.join(ROOT, 'icon.svg'), 'w', encoding='utf-8').write(svg16(v['normal'], v['acc']))
    img, _ = render16(v['normal'], v['acc'])
    img.resize((180, 180), Image.NEAREST).save(os.path.join(ROOT, 'icon-180.png'))
    print('\n出貨：icon.svg + icon-180.png ← %s（暫定值，owner 裁決後改 FAVICON= 重跑）' % ship)

    # 全表掃一次：多少張裝得進、有沒有配件色撞到新底色（第 30 種背景，沒有 guard）
    fit, worst = 0, (1e9, None)
    for k, v in P.items():
        if plan(v['normal']) is None:
            continue
        fit += 1
        d = de_hex(v['acc'], BG)
        if d < worst[0]:
            worst = (d, k)
    print('\n裝得進 16×16 的：%d / %d' % (fit, len(P)))
    print('這 %d 張對新底色 %s 的最小 ΔE：%.4f（%s）——門檻 25' % (fit, BG, worst[0], worst[1]))


if __name__ == '__main__':
    main()
