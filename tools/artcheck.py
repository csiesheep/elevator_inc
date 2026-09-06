# -*- coding: utf-8 -*-
"""四條色距判準 + 形狀距離，**直接讀產品**（js/sprites.js、js/content.js、js/theme.js、
js/render.js），不吃任何中間檔。這是 design/ResidSprites.dc.html 的命令列版本，
兩支是**各自寫的實作**——對不上就代表有一支錯了（實測對到 3e-14）。

    python tools/artcheck.py              # 這一趟的九張
    python tools/artcheck.py all          # 全部 60 張
    python tools/artcheck.py show <id>    # 印一張圖

⚠ **比較之前不做任何格式化。** 全部用 float 比，只有印出來那一步才 %.4f。
   `.toFixed(2)` 會把 24.998969 印成 25.00，於是在物理上分不出「剛好 25」和
   「差一點不到 25」——第 16 組的註解與 ResidSprites.dc.html 第 6 節的③ 都在講這件事。
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artlib as A

MINE = ['dogwalker', 'fooddeliv', 'latehome', 'renovator', 'commuter',
        'homecomer', 'waterhauler', 'neighbor', 'blackouter']

FLOOR_MIN, BODY_MIN, ACC_MIN, SHAPE_MIN = 25.0, 25.0, 12.0, 12

# 第 15 組的形狀背債表，逐字抄自 tests/acceptance.js（抄本會漂移，所以下面有一條檢查）
SHAPE_DEBT = set('''guest|office ceo|coffeegoer ceo|interviewee office|scientist courier|diner
courier|movie attendee|ceo attendee|coffeegoer ceo|remote ceo|tourist closing|sampler
interviewee|office interviewee|tourist office|waxer ceo|office coffeegoer|interviewee
coffeegoer|remote guard|tourist observer|office observer|tourist office|stroller
office|tourist scientist|tourist attendee|nightowl child|guard courier|office dolly|office
guard|interviewee stroller|waxer'''.split())


def debt_transcript_ok():
    src = open(os.path.join(A.ROOT, 'tests', 'acceptance.js'), encoding='utf-8').read()
    seg = src[src.index('const SHAPE_DEBT'):src.index('const shapeCell')]
    live = set(x for x in __import__('re').findall(r"'([a-z]+\|[a-z]+)'", seg))
    return live == SHAPE_DEBT, live


def run(which):
    P = A.parse_people()
    BAND = A.parse_passengers()
    SH = A.floor_shades()
    BODY = A.body_colors()

    # ---- 儀器活著嗎（母體非空 + 度量不是常數）
    print('== 儀器 ==')
    print('  同色 ΔE = %.4f（必須是 0）' % A.de_hex('#4a3f5c', '#4a3f5c'))
    print('  黑對白 ΔE = %.4f（必須 > 90）' % A.de_hex('#000000', '#ffffff'))
    print('  office 跟自己的形狀距離 = %d（必須是 0）' % A.shape_dist(P['office'], P['office']))
    print('  office 對 resident = %d（必須 > 0）' % A.shape_dist(P['office'], P['resident']))
    print('  母體：%d 張圖 / %d 種樓層底色 / %d 種身體色'
          % (len(P), len(SH), len(BODY)))
    print('  render.js 的 shadeHex 抄本：%s' % ('逐字相同' if A.shade_src_ok() else '**對不上，地板色不可信**'))
    ok, live = debt_transcript_ok()
    print('  acceptance.js 的 SHAPE_DEBT 抄本：%s（%d 筆）'
          % ('逐字相同' if ok else '**對不上**：' + str(live ^ SHAPE_DEBT), len(live)))
    print('  三種身體色：' + '、'.join('%s %s' % (n, c) for n, c in BODY))
    assert len(BODY) == 3 and len(set(c for _, c in BODY)) == 3, '身體色抓錯了'

    ids = MINE if which == 'mine' else sorted(P)
    fails = []
    print('\n== %d 張 ==' % len(ids))
    print('  %-12s %-9s %-24s %-22s %-20s %s'
          % ('id', 'acc', '4 地板 (>=25)', '2/3 身體色 (>=25)', '1 互斥 (>=12)', '形狀 (>=12)'))
    for k in ids:
        sp = P[k]
        f = min((A.de_hex(sp['acc'], s), nm) for nm, s in SH)
        b = min((A.de_hex(sp['acc'], c), nm) for nm, c in BODY)
        a = min((A.de_hex(sp['acc'], P[o]['acc']), o) for o in P if o != k)
        s = (10 ** 9, '-')
        for o in P:
            if o == k or not BAND.get(o) or not BAND.get(k):
                continue
            if not (BAND[k] == 'any' or BAND[o] == 'any' or BAND[k] == BAND[o]):
                continue
            key = k + '|' + o if k < o else o + '|' + k
            if key in SHAPE_DEBT:
                continue
            d = A.shape_dist(sp, P[o])
            if d < s[0]:
                s = (d, o)
        mark = lambda cond: '' if cond else ' <'
        print('  %-12s %-9s %9.4f @%-11s %9.4f %-11s %9.4f %-9s %3s %s%s'
              % (k, sp['acc'], f[0], f[1], b[0], b[1], a[0], a[1],
                 (s[0] if s[0] < 10 ** 9 else '-'), s[1],
                 mark(f[0] >= FLOOR_MIN and b[0] >= BODY_MIN
                      and a[0] >= ACC_MIN and s[0] >= SHAPE_MIN)))
        if f[0] < FLOOR_MIN: fails.append('地板 %s %.4f' % (k, f[0]))
        if b[0] < BODY_MIN: fails.append('身體色 %s %.4f（%s）' % (k, b[0], b[1]))
        if a[0] < ACC_MIN: fails.append('互斥 %s|%s %.4f' % (k, a[1], a[0]))
        if s[0] < SHAPE_MIN: fails.append('形狀 %s|%s d=%d' % (k, s[1], s[0]))

    # **結論由上面的數字推出來，不是寫死的**
    print()
    if not fails:
        print('結論：四條判準與形狀距離全部過關（%d 張）。' % len(ids))
    else:
        by = {}
        for x in fails:
            by.setdefault(x.split()[0], []).append(x)
        print('結論：%d 項不過。' % len(fails))
        for k2, v in by.items():
            print('  %s（%d）：%s' % (k2, len(v), '、'.join(v)))
    return fails


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else 'mine'
    if arg == 'show':
        P = A.parse_people()
        for k in sys.argv[2:]:
            print(k, P[k]['acc'])
            for i in range(9):
                print('   ', P[k]['normal'][i], '  ', P[k]['urgent'][i])
        sys.exit()
    sys.exit(1 if run('all' if arg == 'all' else 'mine') else 0)
