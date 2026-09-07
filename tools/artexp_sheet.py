# -*- coding: utf-8 -*-
"""artexp_sheet.py — 把全部 73 張併成一張 PNG，日夜各一張，然後用眼睛看整組。

**沒有任何數字看得到「這張圖讀起來像什麼」。** 上一趟就是靠接觸表抓到兩件事：
`proposer` 的跪姿讀起來像無頭柱子、`acrophobe` 的綠臉讀起來像頭帶——
兩張都通過了全部五條判準。所以這一步不是裝飾，是判準看不到的那一半。

每一格畫四種尺寸／背景，因為它們是四個不同的問題：
  · cs=6 在自己那一帶的**樓層底色**上：normal 與 urgent 並排（形狀讀不讀得出來）
  · cs=3 在**轎廂內裝**上：進了電梯是什麼樣子（身體色從 ink 翻成 inkCar）
  · cs=1：**17 層以上手機上的真實大小**，整張圖只有 63 個實體像素。
    形狀判準在這個尺寸幾乎失效，顏色接手——所以這一格是「顏色到底夠不夠開」的現場。

日夜兩張的差別只有樓層底色（floorA/B 0.78/0.66 對 0.62/0.52）；
ink / inkCar / bad / car 在 NIGHT 與 DAY 兩張表裡逐字相同。

⚠ **兩張圖要用像素差比，不要用眼睛。** --diff 會算兩張的不同像素比例；
  「看起來一模一樣」是一個會騙人的判斷。
"""
import sys, os, argparse
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artexp import World, ROOT, shade_hex                        # noqa: E402


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def blit(img, rows, x, y, cs, ink, acc):
    d = ImageDraw.Draw(img)
    for r in range(9):
        for c in range(7):
            ch = rows[r][c]
            if ch == '.':
                continue
            col = ink if ch == '#' else acc
            d.rectangle([x + c * cs, y + r * cs, x + c * cs + cs - 1, y + r * cs + cs - 1], fill=col)


def sheet(w, k_a, k_b, title, out):
    CS = 6
    CELL_W, CELL_H = 236, 78
    COLS = 5
    # ⚠ **七個型別的 band 不是 BANDS 裡的鍵**：office/tourist/courier/guard/cat/evacuee
    #   是 `any`（哪一帶都會出現）、ghost 是 `floor13`。第一版我用
    #   `band_of[pid] == b.key` 過濾，**它們七個安靜地從接觸表上消失了**
    #   ——而 `office` 正是全遊戲最常出現的那一張。母體少了 7 張的接觸表
    #   會讓人以為看過了整組。
    #   它們沒有固定的樓層帶，所以畫在**對它最糟的那一帶**上（ΔE 最小的那個底色）。
    byband = {}
    for pid in sorted(w.people):
        key = w.band_of.get(pid)
        b = next((x for x in w.bands if x['key'] == key), None)
        if b is None:
            _, at = w.bg_min(pid)
            b = next((x for x in w.bands if at.startswith(x['key'] + '@')), w.bands[0])
        byband.setdefault(b['key'], []).append((b, pid))
    order = []
    for b in w.bands:
        order += byband.get(b['key'], [])
    assert len(order) == len(w.people), '接觸表漏了 %d 張' % (len(w.people) - len(order))
    rows_n = (len(order) + COLS - 1) // COLS
    W, H = COLS * CELL_W + 12, rows_n * CELL_H + 40
    img = Image.new('RGB', (W, H), rgb('#0f1116'))
    d = ImageDraw.Draw(img)
    d.text((8, 8), title, fill=rgb('#ffd23f'))

    ink = rgb(w.pal['ink'])
    inkcar = rgb(w.pal['inkCar'])
    bad = rgb(w.pal['bad'])
    car = rgb(w.pal['car'])

    for i, (band, pid) in enumerate(order):
        sp = w.people[pid]
        acc = rgb(sp['acc'])
        cx = 6 + (i % COLS) * CELL_W
        cy = 32 + (i // COLS) * CELL_H
        fa, fb = rgb(shade_hex(band['color'], k_a)), rgb(shade_hex(band['color'], k_b))
        # 樓層底色：兩種明暗（奇偶層交錯）
        d.rectangle([cx, cy, cx + 2 * (7 * CS + 6) + 4, cy + 9 * CS + 4], fill=fa)
        d.rectangle([cx + 7 * CS + 8, cy, cx + 2 * (7 * CS + 6) + 4, cy + 9 * CS + 4], fill=fb)
        blit(img, sp['normal'], cx + 2, cy + 2, CS, ink, acc)
        blit(img, sp['urgent'], cx + 7 * CS + 10, cy + 2, CS, bad, acc)
        # 轎廂內裝，cs=3
        bx = cx + 2 * (7 * CS + 6) + 10
        d.rectangle([bx, cy, bx + 2 * 7 * 3 + 8, cy + 9 * 3 + 4], fill=car)
        blit(img, sp['normal'], bx + 2, cy + 2, 3, inkcar, acc)
        blit(img, sp['urgent'], bx + 7 * 3 + 6, cy + 2, 3, bad, acc)
        # cs=1：17 層以上的真實大小，樓層底色 + 轎廂各一
        ex = bx + 2 * 7 * 3 + 14
        d.rectangle([ex, cy, ex + 9, cy + 11], fill=fa)
        blit(img, sp['normal'], ex + 1, cy + 1, 1, ink, acc)
        d.rectangle([ex + 12, cy, ex + 21, cy + 11], fill=car)
        blit(img, sp['normal'], ex + 13, cy + 1, 1, inkcar, acc)
        d.text((cx + 2, cy + 9 * CS + 6), '%s · %s %s' % (pid, band['key'], sp['acc']),
               fill=rgb('#b9bfd8'))
    img.save(out)
    return img, len(order)


def diff(a, b):
    pa, pb = a.load(), b.load()
    n = 0
    tot = a.size[0] * a.size[1]
    for y in range(a.size[1]):
        for x in range(a.size[0]):
            if pa[x, y] != pb[x, y]:
                n += 1
    return n, tot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--overlay', default=None)
    ap.add_argument('--out', default=os.path.join(ROOT, 'design'))
    a = ap.parse_args()
    w = World(ROOT, overlay=a.overlay)
    day, n = sheet(w, 0.78, 0.66, 'Elevator Inc. — 73 passengers · DAY (floor k=0.78/0.66)',
                   os.path.join(a.out, 'exp-contact-day.png'))
    night, _ = sheet(w, 0.62, 0.52, 'Elevator Inc. — 73 passengers · NIGHT (floor k=0.62/0.52)',
                     os.path.join(a.out, 'exp-contact-night.png'))
    print('畫了 %d 張圖 x 2（日/夜），尺寸 %dx%d' % (n, day.size[0], day.size[1]))
    nd, tot = diff(day, night)
    print('日夜兩張的像素差：%d / %d = %.2f%%  —— **用算的，不是用看的**'
          % (nd, tot, 100.0 * nd / tot))
    if nd == 0:
        print('**兩張逐像素相同，那表示日夜的樓層底色沒有進到這張表，接觸表是假的**')
    return 0


if __name__ == '__main__':
    sys.exit(main())
