# -*- coding: utf-8 -*-
"""接觸表：60 張**併成一組**，日 / 夜各一張。
背景用遊戲真正的樓層底色 `shade(band.color, pal.floorA)`（第 16 組量到最糟一律落在
@0.78，也就是**白天**那一格，所以日的那張就是最壞情況），加上轎廂底色那一格。
每一格：normal @樓層 | urgent @樓層 | normal @轎廂。
用法：python tools/artsheet.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artlib as A
from PIL import Image, ImageDraw

P = A.parse_people()
BAND = A.parse_passengers()
BANDS = dict(A.parse_bands())
BORDER = ['retail', 'office', 'hotel', 'resid', 'obs', 'exp', 'roof', 'any', 'floor13']
# ghost 的 band 是 'floor13'（13 樓專屬），不在七個帶的表裡——排在最後，
# 它的底色用住宅帶的（13 樓在 office 帶，但 BANDS 沒有 'floor13' 這個 key）。
MINE = {'dogwalker', 'fooddeliv', 'latehome', 'renovator', 'commuter',
        'homecomer', 'waterhauler', 'neighbor', 'blackouter'}

INK = '#eaf0fb'
INKCAR = '#12161f'
BAD = '#e2645a'
CAR = '#e6ecf7'
Z = 7                      # 印樣倍率
SW, SH = 7, 9
PW, PH = SW * Z, SH * Z    # 49 x 63
PAD = 6
TILE_W = PW * 3 + PAD * 4
TILE_H = PH + PAD * 2 + 13
COLS = 8


def hx(h):
    n = int(h[1:], 16)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


def draw_sprite(d, x, y, rows, ink, acc):
    for r in range(SH):
        for c in range(SW):
            ch = rows[r][c]
            if ch == '.':
                continue
            col = ink if ch == '#' else acc
            d.rectangle([x + c * Z, y + r * Z, x + c * Z + Z - 1, y + r * Z + Z - 1], fill=col)


def build(night):
    fa = 0.62 if night else 0.78
    ids = sorted(P, key=lambda k: (BORDER.index(BAND.get(k, 'any')), k))
    rows = (len(ids) + COLS - 1) // COLS
    W = COLS * TILE_W + 24
    HDR = 34
    H = HDR + rows * TILE_H + 20
    img = Image.new('RGB', (W, H), (15, 17, 22))
    d = ImageDraw.Draw(img)
    d.text((12, 10), ('NIGHT  floorA=0.62' if night else 'DAY  floorA=0.78')
           + '   %d sprites, 7x   normal @floor | urgent @floor | normal @car'
           ' | boxed = the nine new (#88)' % len(ids), fill=(255, 210, 63))
    for i, k in enumerate(ids):
        cx = 12 + (i % COLS) * TILE_W
        cy = HDR + (i // COLS) * TILE_H
        band = BAND.get(k, 'any')
        floor = A.shade_hex(BANDS.get(band, BANDS['office']), fa)   # floor13 -> 13 樓在辦公帶
        sp = P[k]
        acc = hx(sp['acc'])
        # 三格背景
        d.rectangle([cx + PAD, cy + PAD, cx + PAD + PW - 1, cy + PAD + PH - 1], fill=hx(floor))
        d.rectangle([cx + PAD * 2 + PW, cy + PAD, cx + PAD * 2 + PW * 2 - 1, cy + PAD + PH - 1],
                    fill=hx(floor))
        d.rectangle([cx + PAD * 3 + PW * 2, cy + PAD, cx + PAD * 3 + PW * 3 - 1, cy + PAD + PH - 1],
                    fill=hx(CAR))
        draw_sprite(d, cx + PAD, cy + PAD, sp['normal'], hx(INK), acc)
        draw_sprite(d, cx + PAD * 2 + PW, cy + PAD, sp['urgent'], hx(BAD), acc)
        draw_sprite(d, cx + PAD * 3 + PW * 2, cy + PAD, sp['normal'], hx(INKCAR), acc)
        if k in MINE:
            d.rectangle([cx + 1, cy + 1, cx + TILE_W - 3, cy + TILE_H - 3],
                        outline=(255, 210, 63))
        d.text((cx + PAD, cy + PAD + PH + 2), '%s  %s' % (k, band),
               fill=(233, 234, 240) if k in MINE else (150, 156, 190))
    return img


def diff(a, b):
    """**日夜要用程式比，不能用眼睛比。**"""
    pa, pb = a.load(), b.load()
    assert a.size == b.size
    w, h = a.size
    n = 0
    for y in range(h):
        for x in range(w):
            if pa[x, y] != pb[x, y]:
                n += 1
    return n, w * h


if __name__ == '__main__':
    day = build(False)
    night = build(True)
    dp = os.path.join(A.ROOT, 'design', 'resid-sprites-day.png')
    np_ = os.path.join(A.ROOT, 'design', 'resid-sprites-night.png')
    day.save(dp)
    night.save(np_)
    n, tot = diff(day, night)
    print('day   -> %s  %dx%d' % (dp, *day.size))
    print('night -> %s  %dx%d' % (np_, *night.size))
    print('日夜逐像素比對：%d / %d 不同（%.2f%%）' % (n, tot, 100.0 * n / tot))
