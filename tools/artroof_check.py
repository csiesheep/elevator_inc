# artroof_check.py — 五條判準各算一次，判定句用算的。
#
# ⚠ **每一句「過」都是比較出來的，沒有一個門檻是印死的字串。**
#   門檻本身也從 `tests/acceptance.js` 讀，不從簡報抄——簡報會過期
#   （它說 74 個配件色，實際是 73；說可行點 93,634，實際是 28,207）。
#
# 用法：
#   python tools/artroof_check.py              五條判準全跑
#   python tools/artroof_check.py --defect X   注入一個缺陷，確認**只有該紅的那條紅**
#
# 缺陷清單（`--defect` 的參數）：
#   acc      把 towerctl 的配件色改成離 janitor 只有 ~5 的綠 → 只有「互斥」該紅
#   body     把 orbitpax 的配件色改成貼著 pal.bad 的紅        → 只有「對身體色」該紅
#   bg       把 presspack 的配件色改成 office 白天的地板色     → 「對背景」該紅
#                                                              （⚠ 它一定會連「對身體色」一起紅，
#                                                               那是簡報寫的幾何事實，不是我的 bug）
#   shape    把 cableeng 的圖換成 office 挪一格               → 只有「形狀」該紅
#   sil      把 astronaut 的 normal 換成跟 hazmat 逐格同剪影   → 只有「剪影」該紅
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artroof_lib as L
import re

NEW = ['astronaut', 'cableeng', 'orbitpax', 'presspack', 'towerctl']

def thresholds():
    """門檻從 tests/acceptance.js 讀。對不上就講出來，不假裝驗過。"""
    s = open(os.path.join(L.ROOT, 'tests', 'acceptance.js'), encoding='utf-8').read()
    g = lambda pat: float(re.search(pat, s).group(1))
    return {'acc': g(r'const ACC_MIN = ([\d.]+)'),
            'shape': g(r'const SHAPE_MIN = ([\d.]+)'),
            'floor': g(r'const FLOOR_MIN = ([\d.]+)'),
            'body': g(r'const BODY_MIN = ([\d.]+)')}

def debts():
    """既有的背債名單也從 harness 讀——我不可以把自己加進去。"""
    s = open(os.path.join(L.ROOT, 'tests', 'acceptance.js'), encoding='utf-8').read()
    shape = set(re.findall(r"'(\w+\|\w+)'", s[s.index('const SHAPE_DEBT'):s.index('const shapeCell')]))
    fl = set(re.findall(r"^  (\w+):", s[s.index('const FLOOR_DEBT'):s.index("check('新加的圖，配件色對每一種樓層底色")], re.M))
    bd = set(re.findall(r"^  (\w+):", s[s.index('const BODY_DEBT'):s.index("check('配件色對它自己那個姿勢的身體色")], re.M))
    sil = set(re.findall(r"'(\w+\|\w+)'", s[s.index('const SIL_DEBT'):s.index("check('沒有兩張圖的剪影完全相同")]))
    return shape, fl, bd, sil

def apply_defect(P, which):
    if which == 'acc':      P['towerctl']['acc'] = '#5fd25a'      # 貼著 janitor #60d25a
    elif which == 'body':   P['orbitpax']['acc'] = '#e0665c'      # 貼著 pal.bad #e2645a
    elif which == 'bg':     P['presspack']['acc'] = L.shade_hex('#3f5a52', 0.78)  # = office 白天地板
    elif which == 'shape':  P['cableeng']['normal'] = list(P['office']['normal']); \
                            P['cableeng']['urgent'] = list(P['office']['urgent'])
    elif which == 'sil':    P['astronaut']['normal'] = [r.replace('#', 'o') if False else r
                                                        for r in P['hazmat']['normal']]
    else: raise SystemExit('不認得的缺陷：' + which)

def main():
    P = L.load_people()
    T = thresholds()
    SHAPE_DEBT, FLOOR_DEBT, BODY_DEBT, SIL_DEBT = debts()
    pas = L.load_passengers()
    banded = set(pas)

    defect = None
    if '--defect' in sys.argv:
        defect = sys.argv[sys.argv.index('--defect') + 1]
        apply_defect(P, defect)
        print(f'⚠⚠ 注入缺陷「{defect}」——期望**只有對應的那一條**紅 ⚠⚠\n')

    missing = [i for i in NEW if i not in P]
    if missing:
        print('這五張還沒進 sprites.js：', missing); return 2

    pal = L.load_palette()
    bgs = L.backgrounds()
    if not L.shade_src_ok():
        print('⚠ render.js 的 shadeHex 跟抄本對不上，地板色不可信'); return 2

    verdicts = {}

    # ---- 1 配件色互斥 -----------------------------------------------------
    ids = sorted(P)
    bad, worst = [], (1e9, '')
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            d = L.de(P[ids[i]]['acc'], P[ids[j]]['acc'])
            key = ids[i] + '|' + ids[j]
            if d < worst[0]: worst = (d, key)
            if d < T['acc']: bad.append((key, d))
    verdicts['互斥'] = not bad
    print(f"【1 配件色互斥】門檻 {T['acc']}｜{len(ids)} 色、{len(ids)*(len(ids)-1)//2} 對")
    print(f"   低於門檻 {len(bad)} 對" + ('：' + '、'.join(f'{k} {d:.4f}' for k, d in bad[:6]) if bad else ''))
    print(f"   全表最小 {worst[0]:.4f}（{worst[1]}）｜下限 9.5146（不可以壓過去）"
          f" → {'仍是既有的那一對' if worst[1]=='acrophobe|delegate' else '**換人了**'}")
    for n in NEW:
        m = min((L.de(P[n]['acc'], P[k]['acc']), k) for k in ids if k != n)
        print(f'     {n:<10} {P[n]["acc"]}  最小 {m[0]:7.4f}（{m[1]}）')
    print(f"   → {'PASS' if verdicts['互斥'] else 'FAIL'}\n")

    # ---- 2 配件對身體色（分姿勢）------------------------------------------
    cnt = lambda rows, ch: ''.join(rows).count(ch)
    bad = []
    print(f"【2 配件色對身體色】門檻 {T['body']}｜**分姿勢**：normal 的 # 對 ink/inkCar、urgent 的 # 對 bad")
    for n in NEW:
        sp = P[n]
        cands = []
        if cnt(sp['normal'], '#') and cnt(sp['normal'], 'o'):
            cands += [(L.de(sp['acc'], pal['ink']), 'normal 對 pal.ink'),
                      (L.de(sp['acc'], pal['inkCar']), 'normal 對 pal.inkCar')]
        if cnt(sp['urgent'], '#') and cnt(sp['urgent'], 'o'):
            cands += [(L.de(sp['acc'], pal['bad']), 'urgent 對 pal.bad')]
        m = min(cands)
        if m[0] < T['body']: bad.append((n, m))
        print(f'     {n:<10} 最小 {m[0]:7.4f}（{m[1]}）'
              f'  ink {L.de(sp["acc"], pal["ink"]):.2f} / inkCar {L.de(sp["acc"], pal["inkCar"]):.2f}'
              f' / bad {L.de(sp["acc"], pal["bad"]):.2f}')
    verdicts['對身體色'] = not bad
    print(f"   低於門檻 {len(bad)} 張 → {'PASS' if verdicts['對身體色'] else 'FAIL'}\n")

    # ---- 3 配件對背景 -----------------------------------------------------
    bad = []
    print(f"【3 配件色對背景】門檻 {T['floor']}｜{len(bgs)} 種（7 帶 × 4 明暗 + 轎廂內裝）")
    for n in NEW:
        m = min((L.de(P[n]['acc'], c), lbl) for lbl, c in bgs)
        if m[0] < T['floor']: bad.append((n, m))
        print(f'     {n:<10} 最小 {m[0]:7.4f} @ {m[1]}')
    verdicts['對背景'] = not bad
    print(f"   低於門檻 {len(bad)} 張 → {'PASS' if verdicts['對背景'] else 'FAIL'}\n")

    # ---- 4 形狀（三態 Hamming）-------------------------------------------
    pool = sorted(i for i in P if i in banded)
    bad = []
    print(f"【4 形狀】門檻 {T['shape']}｜三態 Hamming，兩個姿勢取 min｜"
          f"對 {len(pool)} 張（只算 PASSENGERS 裡有的，跟 harness 一樣）")
    for n in NEW:
        rows = sorted(((L.shape_dist(P, n, k), k) for k in pool if k != n))
        for d, k in rows:
            key = '|'.join(sorted([n, k]))
            if d < T['shape'] and key not in SHAPE_DEBT: bad.append((key, d))
        print(f'     {n:<10} 最近 5 張：' + '、'.join(f'{k} {d}' for d, k in rows[:5]))
    verdicts['形狀'] = not bad
    print(f"   低於門檻 {len(bad)} 對" + ('：' + '、'.join(f'{k} d={d}' for k, d in bad[:8]) if bad else '')
          + f" → {'PASS' if verdicts['形狀'] else 'FAIL'}\n")

    # ---- 5 剪影（二態，絕對條件）------------------------------------------
    bad = []
    print('【5 剪影】二態 Hamming **不可以是 0**（絕對條件，不是門檻）')
    for n in NEW:
        rows = sorted(((L.sil_dist(P, n, k), k) for k in pool if k != n))
        for d, k in rows:
            key = '|'.join(sorted([n, k]))
            if d == 0 and key not in SIL_DEBT: bad.append(key)
        print(f'     {n:<10} 最近 3 張：' + '、'.join(f'{k} {d}' for d, k in rows[:3]))
    verdicts['剪影'] = not bad
    print(f"   完全相同 {len(bad)} 對" + ('：' + '、'.join(bad) if bad else '')
          + f" → {'PASS' if verdicts['剪影'] else 'FAIL'}\n")

    print('=' * 70)
    for k, v in verdicts.items():
        print(f'  {k:<8} {"PASS" if v else "**FAIL**"}')
    if defect:
        red = [k for k, v in verdicts.items() if not v]
        print(f'\n注入「{defect}」之後紅的是：{red or "（沒有人紅——**那就是 guard 有洞**）"}')
    return 0 if all(verdicts.values()) else 1

if __name__ == '__main__':
    sys.exit(main())
