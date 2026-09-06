# -*- coding: utf-8 -*-
"""五條判準 + 兩條額外的自我要求，**直接讀產品**（js/sprites.js、js/content.js、
js/theme.js、js/render.js），用 `tools/artobs.py`（第二個獨立實作）算。

    python tools/artobs_check.py            # 這一趟的四張
    python tools/artobs_check.py all        # 全部
    python tools/artobs_check.py show <id>  # 印一張圖
    python tools/artobs_check.py inject <what>   # **證偽**：種一個缺陷進去，看結論句會不會翻

⚠ **比較之前不做任何格式化。** 只有印出來那一步才 %.4f。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artobs as O

MINE = ['proposer', 'photocrew', 'acrophobe', 'deckguide']

BG_MIN = 25.0        # 第 16 組（29 種背景色）
BODY_MIN = 25.0      # 判準 2/3（三種身體色）—— **沒有 guard**
ACC_MIN = 9.0        # 第 19 組（orchestrator 裁決 #105）
SHAPE_MIN = 12       # 第 15 組（三態 Hamming，全表比對）


def load(inject=None):
    P = O.people()
    if inject == 'color':
        # 種一個違反判準的顏色：拿 pal.bad 本身當配件色（對身體色 ΔE = 0）
        P['acrophobe'] = dict(P['acrophobe'], acc=dict(O.pal_body())['pal.bad'])
    elif inject == 'acc':
        # 種一個跟既有配件色幾乎相同的顏色（第 19 組那一條）
        P['deckguide'] = dict(P['deckguide'], acc=P['reporter']['acc'])
    elif inject == 'bg':
        # 種一個撞**樓層底色**的顏色。
        # ⚠ **這一條種不出「只紅一條」的缺陷，而那是量出來的結構事實，不是我沒挑好**：
        #   29 種背景色沒有一種同時離三個身體色 >= 25 —— 28 種樓層底色全部是深色，
        #   離 `pal.inkCar #12161f` 只有 5.33（retail@0.52）到 19.58（office@0.78）；
        #   而第 29 種（轎廂內裝 #e6ecf7）離 `pal.ink #eaf0fb` 只有 **0.84**。
        #   所以「撞背景」必然同時「撞身體色」。這裡取全表collateral 最小的
        #   office@0.78（離 inkCar 19.58），第二條會跟著紅，理由要照這一段讀。
        P['photocrew'] = dict(P['photocrew'],
                              acc=O.shade_hex(dict(O.bands())['office'], 0.78))
    elif inject == 'shape':
        # 種一個跟既有圖幾乎相同的形狀（**只差一格**）。
        # 兩個姿勢都要動：只抄 normal 的話 urgent 會逐格相同，第 17 組（剪影）
        # 也會跟著紅——那就變成一次種了兩個缺陷。
        src = P['observer']
        n = list(src['normal']); n[8] = '..#.#.o'
        u = list(src['urgent']); u[8] = '.#...#o'
        P['deckguide'] = dict(P['deckguide'], normal=n, urgent=u)
    elif inject == 'silhouette':
        # 種一個剪影逐格相同的形狀（第 17 組）——只換配件色的位置，剪影不動
        src = P['observer']
        P['acrophobe'] = dict(P['acrophobe'],
                              normal=[r.replace('o', '#') for r in src['normal']],
                              urgent=[r.replace('o', '#') for r in src['urgent']])
    return P


def run(which, inject=None):
    P = load(inject)
    BAND = {k: v['band'] for k, v in O.passengers().items()}
    BG = O.backgrounds()
    BODY = O.pal_body()

    print('== 儀器 ==')
    print('  同色 ΔE = %.4f（必須 0）  黑對白 = %.4f（必須 > 90）'
          % (O.de2000('#4a3f5c', '#4a3f5c'), O.de2000('#000000', '#ffffff')))
    print('  office 對自己 d=%d（必須 0）  office 對 resident d=%d（必須 > 0）'
          % (O.shape_dist(P['office'], P['office']), O.shape_dist(P['office'], P['resident'])))
    print('  母體：%d 張圖 / %d 種背景色 / %d 種身體色' % (len(P), len(BG), len(BODY)))
    print('  render.js 的 shadeHex 抄本：%s'
          % ('逐字相同' if O.shade_src_ok() else '**對不上，地板色不可信**'))
    print('  三種身體色：' + '、'.join('%s %s' % t for t in BODY))
    if inject:
        print('  ⚠⚠ 這一次**種了一個缺陷**：%s' % inject)

    ids = MINE if which == 'mine' else sorted(P)
    fails = []
    print('\n== %d 張 ==' % len(ids))
    print('  %-11s %-9s %-25s %-24s %-22s %s'
          % ('id', 'acc', '16 背景 (>=25)', '2/3 身體色 (>=25)', '19 互斥 (>=9)', '15 形狀 (>=12)'))
    for k in ids:
        sp = P[k]
        f = min((O.de2000(sp['acc'], c), nm) for nm, c in BG)
        b = min((O.de2000(sp['acc'], c), nm) for nm, c in BODY)
        a = min((O.de2000(sp['acc'], P[o]['acc']), o) for o in P if o != k)
        # 第 15 組：**全表比對**（不是同框），排除背債表上的既有配對
        s = (10 ** 9, '-')
        for o in P:
            if o == k or not BAND.get(o) or not BAND.get(k):
                continue
            key = k + '|' + o if k < o else o + '|' + k
            if key in SHAPE_DEBT:
                continue
            d = O.shape_dist(sp, P[o])
            if d < s[0]:
                s = (d, o)
        print('  %-11s %-9s %9.4f @%-12s %9.4f %-12s %9.4f %-11s %3s %s'
              % (k, sp['acc'], f[0], f[1][:12], b[0], b[1], a[0], a[1],
                 s[0] if s[0] < 10 ** 9 else '-', s[1]))
        if f[0] < BG_MIN and k not in FLOOR_DEBT: fails.append('背景 %s %.4f @%s' % (k, f[0], f[1]))
        if b[0] < BODY_MIN and k not in BODY_DEBT: fails.append('身體色 %s %.4f（%s）' % (k, b[0], b[1]))
        if a[0] < ACC_MIN: fails.append('互斥 %s|%s %.4f' % (k, a[1], a[0]))
        if s[0] < SHAPE_MIN: fails.append('形狀 %s|%s d=%d' % (k, s[1], s[0]))

    # 第 17 組：剪影不可以完全相同（絕對條件，不是門檻）
    sil = []
    allids = sorted(i for i in P if BAND.get(i))
    for i in range(len(allids)):
        for j in range(i + 1, len(allids)):
            x, y = allids[i], allids[j]
            if O.sil_dist(P[x], P[y]) == 0 and (x + '|' + y) not in SIL_DEBT:
                sil.append(x + '|' + y)
    for key in sil:
        fails.append('剪影完全相同 ' + key)

    print()
    if not fails:
        print('結論：五條判準全部過關（%d 張新圖，全表 %d 張）。' % (len(ids), len(P)))
    else:
        print('結論：%d 項不過。' % len(fails))
        for x in fails:
            print('  · ' + x)
    return fails


# 既有背債，逐字抄自 tests/acceptance.js（抄本會漂移，下面有一條檢查）
FLOOR_DEBT = {'tourist', 'office', 'queuer', 'ceo', 'child', 'ghost',
              'stroller', 'lateguest', 'scientist'}
# 判準 2/3 在 harness 裡沒有 guard，所以背債只寫在 #105 裡。逐字抄兩筆：
#   influencer 對 pal.bad 24.1689（有 28 個身體格，構得到）
#   ghost 對 pal.ink 11.8594（**0 個身體格**，那條路徑走不到；列出來是為了不要有人再算一次）
BODY_DEBT = {'influencer', 'ghost'}
SIL_DEBT = {'closing|sampler'}
SHAPE_DEBT = set('''guest|office ceo|coffeegoer ceo|interviewee office|scientist courier|diner
courier|movie attendee|ceo attendee|coffeegoer ceo|remote ceo|tourist closing|sampler
interviewee|office interviewee|tourist office|waxer ceo|office coffeegoer|interviewee
coffeegoer|remote guard|tourist observer|office observer|tourist office|stroller
office|tourist scientist|tourist attendee|nightowl child|guard courier|office dolly|office
guard|interviewee stroller|waxer attendee|scientist blackouter|waxer ceo|diner ceo|observer
ceo|scientist child|observer coffeegoer|guest coffeegoer|scientist diner|newhire
dolly|guest guest|scientist guest|stroller guest|waxer homecomer|loaded
interviewee|observer interviewee|scientist laidoff|sampler laidoff|waxer loaded|repairman
movie|outager nightowl|scientist observer|remote observer|scientist remote|scientist
remote|waxer'''.split())


def transcripts_ok():
    """抄本沒有漂移：三張背債表要跟 tests/acceptance.js 逐字相同。"""
    import re
    src = open(os.path.join(O.ROOT, 'tests', 'acceptance.js'), encoding='utf-8').read()
    seg = src[src.index('const SHAPE_DEBT'):src.index('const shapeCell')]
    live = set(re.findall(r"'([a-z]+\|[a-z]+)'", seg))
    seg2 = src[src.index('const FLOOR_DEBT'):src.index("check('新加的圖，配件色對每一種樓層底色")]
    liveF = set(re.findall(r"^  (\w+):", seg2, re.M))
    seg3 = src[src.index('const SIL_DEBT'):src.index("check('沒有兩張圖的剪影完全相同")]
    liveS = set(re.findall(r"'([a-z]+\|[a-z]+)'", seg3))
    out = []
    if live != SHAPE_DEBT:
        out.append('SHAPE_DEBT 對不上：' + str(live ^ SHAPE_DEBT))
    if liveF != FLOOR_DEBT:
        out.append('FLOOR_DEBT 對不上：' + str(liveF ^ FLOOR_DEBT))
    if liveS != SIL_DEBT:
        out.append('SIL_DEBT 對不上：' + str(liveS ^ SIL_DEBT))
    return out


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else 'mine'
    if arg == 'show':
        P = O.people()
        for k in sys.argv[2:]:
            print(k, P[k]['acc'])
            for i in range(9):
                print('   ', P[k]['normal'][i], '  ', P[k]['urgent'][i])
        sys.exit()
    drift = transcripts_ok()
    for d in drift:
        print('⚠ 抄本漂移：' + d)
    if arg == 'inject':
        sys.exit(0 if run('mine', sys.argv[2]) else 1)     # 種了缺陷還全綠 = 儀器壞了
    sys.exit(1 if run('all' if arg == 'all' else 'mine') else 0)
