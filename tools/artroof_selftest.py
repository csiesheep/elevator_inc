# artroof_selftest.py — 先證明量尺是對的，再拿它去量圖。
#
# 三層，由弱到強：
#   A. 自洽（對稱、自距離為零）—— **這一層不驗證校準**。一個對稱且自距離為零的
#      錯誤實作是存在的；上一趟四支實作彼此差 0.000000 就是這個形狀。
#   B. **Sharma 等人 34 組校驗資料**（Lab 直接進，繞開 sRGB→XYZ 矩陣）——這一層才是校準。
#   C. **把量尺弄壞，確認 A 與 B 會叫**。一支永遠說「過」的自測等於沒有自測。
import sys, os, math
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import artroof_lib as L

def layer_a(fn):
    """自洽：對稱 + 自距離為零。用產品裡真的會比到的顏色。"""
    P = L.load_people()
    cols = sorted({s['acc'] for s in P.values()})
    cols += [h for _, h in L.backgrounds()]
    pal = L.load_palette()
    cols += [pal['ink'], pal['inkCar'], pal['bad']]
    cols = sorted(set(cols))
    labs = {c: L.hex_to_lab(c) for c in cols}
    worst_self, worst_asym, wa = 0.0, 0.0, ''
    for i, x in enumerate(cols):
        worst_self = max(worst_self, abs(fn(labs[x], labs[x])))
        for y in cols[i + 1:]:
            d = abs(fn(labs[x], labs[y]) - fn(labs[y], labs[x]))
            if d > worst_asym: worst_asym, wa = d, x + ' / ' + y
    return worst_self, worst_asym, wa, len(cols)

def layer_b(fn):
    """Sharma 34 組。門檻 1e-4（論文自己印到小數第四位）。"""
    rows, worst, ww = [], 0.0, None
    for i, (l1, l2, want) in enumerate(L.SHARMA, 1):
        got = fn(l1, l2)
        err = abs(got - want)
        rows.append((i, want, got, err))
        if err > worst: worst, ww = err, i
    return rows, worst, ww

# ---- C 層用的三支壞掉的量尺 ------------------------------------------------
def broken_hb_far(lab1, lab2):
    """**上一趟 artist 踩到的那一個**：平均色相在 |Δh| > 180 時位移的方向，
    用參數順序去決定（`hp1+hp2` 換成 `raw` 的正負）。這會讓 a→b 與 b→a 落在
    不同側 —— A 層的對稱性應該要叫。"""
    L1, a1, b1 = lab1; L2, a2, b2 = lab2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2); Cbar = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cbar**7 / (Cbar**7 + 25.0**7))) if Cbar > 0 else 0.5
    ap1, ap2 = (1+G)*a1, (1+G)*a2
    Cp1, Cp2 = math.hypot(ap1, b1), math.hypot(ap2, b2)
    def hp(a, b):
        if a == 0 and b == 0: return 0.0
        d = math.degrees(math.atan2(b, a)); return d + 360 if d < 0 else d
    hp1, hp2 = hp(ap1, b1), hp(ap2, b2)
    dLp, dCp = L2 - L1, Cp2 - Cp1
    if Cp1 * Cp2 == 0: dhp = 0.0
    else:
        dhp = hp2 - hp1
        if dhp > 180: dhp -= 360
        elif dhp < -180: dhp += 360
    dHp = 2 * math.sqrt(Cp1 * Cp2) * math.sin(math.radians(dhp / 2))
    Lbp, Cbp = (L1 + L2) / 2, (Cp1 + Cp2) / 2
    if Cp1 * Cp2 == 0: hbp = hp1 + hp2
    elif abs(hp1 - hp2) <= 180: hbp = (hp1 + hp2) / 2
    else: hbp = (hp1 + hp2 + (360 if (hp2 - hp1) < 0 else -360)) / 2   # ← 這裡是壞的
    T = (1 - 0.17*math.cos(math.radians(hbp-30)) + 0.24*math.cos(math.radians(2*hbp))
           + 0.32*math.cos(math.radians(3*hbp+6)) - 0.20*math.cos(math.radians(4*hbp-63)))
    dth = 30 * math.exp(-(((hbp-275)/25)**2))
    Rc = 2*math.sqrt(Cbp**7/(Cbp**7+25.0**7)) if Cbp > 0 else 0.0
    Sl = 1 + (0.015*(Lbp-50)**2)/math.sqrt(20+(Lbp-50)**2)
    Sc, Sh = 1 + 0.045*Cbp, 1 + 0.015*Cbp*T
    Rt = -math.sin(math.radians(2*dth))*Rc
    return math.sqrt((dLp/Sl)**2 + (dCp/Sc)**2 + (dHp/Sh)**2 + Rt*(dCp/Sc)*(dHp/Sh))

def broken_no_rt(lab1, lab2):
    """拿掉 Rt 交叉項。**對稱、自距離為零，A 層完全看不到**——只有 Sharma 會叫。
    這正是「一致不等於對」的示範。"""
    import copy
    L1,a1,b1 = lab1; L2,a2,b2 = lab2
    C1,C2 = math.hypot(a1,b1), math.hypot(a2,b2); Cbar=(C1+C2)/2
    G = 0.5*(1-math.sqrt(Cbar**7/(Cbar**7+25.0**7))) if Cbar>0 else 0.5
    ap1,ap2 = (1+G)*a1,(1+G)*a2
    Cp1,Cp2 = math.hypot(ap1,b1), math.hypot(ap2,b2)
    def hp(a,b):
        if a==0 and b==0: return 0.0
        d=math.degrees(math.atan2(b,a)); return d+360 if d<0 else d
    hp1,hp2 = hp(ap1,b1),hp(ap2,b2)
    dLp,dCp = L2-L1, Cp2-Cp1
    if Cp1*Cp2==0: dhp=0.0
    else:
        dhp=hp2-hp1
        if dhp>180: dhp-=360
        elif dhp<-180: dhp+=360
    dHp = 2*math.sqrt(Cp1*Cp2)*math.sin(math.radians(dhp/2))
    Lbp,Cbp=(L1+L2)/2,(Cp1+Cp2)/2
    if Cp1*Cp2==0: hbp=hp1+hp2
    elif abs(hp1-hp2)<=180: hbp=(hp1+hp2)/2
    else: hbp=(hp1+hp2+360)/2 if (hp1+hp2)<360 else (hp1+hp2-360)/2
    T=(1-0.17*math.cos(math.radians(hbp-30))+0.24*math.cos(math.radians(2*hbp))
        +0.32*math.cos(math.radians(3*hbp+6))-0.20*math.cos(math.radians(4*hbp-63)))
    Cbp7=Cbp**7
    Sl=1+(0.015*(Lbp-50)**2)/math.sqrt(20+(Lbp-50)**2)
    Sc,Sh=1+0.045*Cbp,1+0.015*Cbp*T
    return math.sqrt((dLp/Sl)**2+(dCp/Sc)**2+(dHp/Sh)**2)     # ← Rt 不見了

def broken_selfnonzero(lab1, lab2):
    """自距離不是零（加一個常數）。A 層第一條應該要叫。"""
    return L.de2000_lab(lab1, lab2) + 0.5

# ---------------------------------------------------------------------------
def main():
    fail = 0
    print('=' * 74)
    print('A 層 · 自洽（對稱、自距離為零）—— **這一層不驗證校準**')
    s, asym, wa, n = layer_a(L.de2000_lab)
    okA = s < 1e-9 and asym < 1e-9
    print(f'  {n} 個顏色：最大自距離 {s:.3e}，最大不對稱 {asym:.3e}'
          + (f'（{wa}）' if asym > 1e-9 else ''))
    print('  →', 'PASS' if okA else 'FAIL'); fail += 0 if okA else 1

    print()
    print('B 層 · Sharma/Wu/Dalal (2005) 34 組校驗資料（Lab 直接進，繞開 sRGB 矩陣）')
    rows, worst, ww = layer_b(L.de2000_lab)
    bad = [r for r in rows if r[3] > 1e-4]
    for i, want, got, err in rows:
        flag = '  ' if err <= 1e-4 else '←'
        if err > 1e-4 or i in (9, 10, 11, 12, 13, 14, 15):
            print(f'   #{i:2d} 期望 {want:8.4f}  實得 {got:8.4f}  差 {err:.6f} {flag}')
    print(f'  34 組，{len(rows)-len(bad)} 組在 1e-4 以內，最差 #{ww} 差 {worst:.6f}')
    okB = not bad
    print('  →', 'PASS' if okB else 'FAIL'); fail += 0 if okB else 1
    print('  ⚠ #9–#15 是**平均色相 180° 分支**那一段——量尺會在那裡壞掉，'
          '所以它們印出來給人看。')

    print()
    print('C 層 · 把量尺弄壞，確認 A 與 B 真的會叫（一支永遠說「過」的自測等於沒有）')
    cases = [
        ('far 側的 hb 位移用參數順序決定（上一趟踩到的那一個）', broken_hb_far, 'A'),
        ('拿掉 Rt 交叉項——**對稱、自距離為零，A 層看不到**',    broken_no_rt,  'B'),
        ('自距離 +0.5',                                          broken_selfnonzero, 'A'),
    ]
    for name, fn, expect in cases:
        s2, asym2, wa2, _ = layer_a(fn)
        aFires = s2 > 1e-9 or asym2 > 1e-9
        _, worst2, _ = layer_b(fn)
        bFires = worst2 > 1e-4
        got = ('A' if aFires else '') + ('B' if bFires else '') or '（沒有人叫）'
        good = (expect in got)
        print(f'  · {name}')
        print(f'      A 層：自距離 {s2:.4f}／不對稱 {asym2:.4f} → {"叫了" if aFires else "沒叫"}'
              + (f'（{wa2}）' if asym2 > 1e-9 else ''))
        print(f'      B 層：最差 {worst2:.4f} → {"叫了" if bFires else "沒叫"}')
        print(f'      期望 {expect} 層叫，實際 {got} → ' + ('PASS' if good else 'FAIL'))
        fail += 0 if good else 1

    print()
    print('=' * 74)
    print('自測' + ('全過，量尺可以用了' if fail == 0 else f'有 {fail} 條沒過，**不要用這支量尺的數字**'))
    return 1 if fail else 0

if __name__ == '__main__':
    sys.exit(main())
