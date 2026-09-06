# -*- coding: utf-8 -*-
"""接觸表：**64 張併成一組**，日 / 夜各一張。

背景用遊戲真正的樓層底色 `shadeHex(band.color, pal.floorA)`（第 16 組量到最糟一律
落在 @0.78，也就是**白天**那一格，所以日的那張就是最壞情況），第三格是轎廂內裝。
每一格：normal @樓層 | urgent @樓層 | normal @轎廂。

⚠ **日夜差異用程式比不用眼睛。** 最後會印逐像素比對的結果。

    python tools/artobs_sheet.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artobs as O
from PIL import Image, ImageDraw

P = O.people()
PASS = O.passengers()
BANDS = dict(O.bands())
BORDER = ['retail', 'office', 'hotel', 'resid', 'obs', 'exp', 'roof', 'any', 'floor13']
MINE = {'proposer', 'photocrew', 'acrophobe', 'deckguide'}
NEIGHBOUR = {'observer', 'newlywed', 'dogwalker', 'tourist'}   # 這一趟要盯著比的舊圖

BODY = dict(O.pal_body())
INK, INKCAR, BAD = BODY['pal.ink'], BODY['pal.inkCar'], BODY['pal.bad']
CAR = O.pal_car()

Z = 7
SW, SH = 7, 9
PW, PH = SW * Z, SH * Z
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
    ids = sorted(P, key=lambda k: (BORDER.index(PASS.get(k, {}).get('band') or 'any'), k))
    rows = (len(ids) + COLS - 1) // COLS
    W = COLS * TILE_W + 24
    HDR = 34
    H = HDR + rows * TILE_H + 20
    img = Image.new('RGB', (W, H), (15, 17, 22))
    d = ImageDraw.Draw(img)
    d.text((12, 10),
           ('NIGHT  floorA=0.62' if night else 'DAY  floorA=0.78')
           + '   %d sprites, 7x   normal @floor | urgent @floor | normal @car'
             '   gold box = the four new (#135), teal box = the ones they sit next to' % len(ids),
           fill=(255, 210, 63))
    for i, k in enumerate(ids):
        cx = 12 + (i % COLS) * TILE_W
        cy = HDR + (i // COLS) * TILE_H
        band = PASS.get(k, {}).get('band') or 'any'
        floor = O.shade_hex(BANDS.get(band, BANDS['office']), fa)
        sp = P[k]
        acc = hx(sp['acc'])
        d.rectangle([cx + PAD, cy + PAD, cx + PAD + PW - 1, cy + PAD + PH - 1], fill=hx(floor))
        d.rectangle([cx + PAD * 2 + PW, cy + PAD, cx + PAD * 2 + PW * 2 - 1, cy + PAD + PH - 1],
                    fill=hx(floor))
        d.rectangle([cx + PAD * 3 + PW * 2, cy + PAD, cx + PAD * 3 + PW * 3 - 1, cy + PAD + PH - 1],
                    fill=hx(CAR))
        draw_sprite(d, cx + PAD, cy + PAD, sp['normal'], hx(INK), acc)
        draw_sprite(d, cx + PAD * 2 + PW, cy + PAD, sp['urgent'], hx(BAD), acc)
        draw_sprite(d, cx + PAD * 3 + PW * 2, cy + PAD, sp['normal'], hx(INKCAR), acc)
        if k in MINE:
            d.rectangle([cx + 1, cy + 1, cx + TILE_W - 3, cy + TILE_H - 3], outline=(255, 210, 63))
        elif k in NEIGHBOUR:
            d.rectangle([cx + 1, cy + 1, cx + TILE_W - 3, cy + TILE_H - 3], outline=(45, 190, 190))
        d.text((cx + PAD, cy + PAD + PH + 2), '%s  %s' % (k, band),
               fill=(233, 234, 240) if k in MINE else (150, 156, 190))
    return img


def diff(a, b):
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
    day, night = build(False), build(True)
    dp = os.path.join(O.ROOT, 'design', 'obs-sprites-day.png')
    npth = os.path.join(O.ROOT, 'design', 'obs-sprites-night.png')
    day.save(dp)
    night.save(npth)
    n, tot = diff(day, night)
    print('day   -> %s  %dx%d' % (dp, *day.size))
    print('night -> %s  %dx%d' % (npth, *night.size))
    print('日夜逐像素比對：%d / %d 不同（%.2f%%）——**用程式比，不用眼睛**' % (n, tot, 100.0 * n / tot))
