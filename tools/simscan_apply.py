#!/usr/bin/env python
# tools/simscan_apply.py — 把 #146 網格的一格**寫進 js/content.js**。
#
# 為什麼需要它：`tools/simscan_grid.js` 是在 runtime 改 module 物件，
# 而 `tests/index.html` 會載入自己的一份 module graph——**驗收 suite 看不到 runtime 的改動**。
# 要回答 #146「前三名的格子跑一次完整 acceptance suite」，只能真的改檔案。
#
#   python tools/simscan_apply.py 0.70 1.5     # 套用一格
#   python tools/simscan_apply.py --restore     # git checkout -- js/content.js
#
# **這支是量測用的，改完一定要 --restore。** 收工前 `git status` 必須乾淨。
# 套用之後要換一個 port 再載入（ES module 有快取，query string 破不了它）。
import re, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
F = ROOT / 'js' / 'content.js'
# 基準值抄自 73d0ae6 的 content.js（BANDS 的順序就是 #146 的 i = 0..6）
BASE = [('retail', 1.15), ('office', 1.00), ('hotel', 0.75), ('resid', 0.90),
        ('obs', 0.55), ('exp', 0.45), ('roof', 0.30)]


def restore():
    subprocess.check_call(['git', '-C', str(ROOT), 'checkout', '--', 'js/content.js'])
    print('restored js/content.js')


def apply(exp, k):
    src = F.read_text(encoding='utf-8')
    out, n = re.subn(r'(RATE_EXP:\s+)[0-9.]+,', lambda m: '%s%s,' % (m.group(1), exp), src, count=1)
    if n != 1:
        sys.exit('RATE_EXP 沒有命中一次（命中 %d 次）' % n)
    for i, (key, base) in enumerate(BASE):
        want = base * (1 + k * i / 6)
        # 只改 `key:'<key>'` 那一列所屬的區塊裡的 pop——逐帶各改一次，命中數必須是 1
        pat = r"(\{ key:'%s',(?:.|\n)*?pop:)[0-9.]+," % key
        out, n = re.subn(pat, lambda m: '%s%.6g,' % (m.group(1), want), out, count=1)
        if n != 1:
            sys.exit('%s 的 pop 沒有命中一次（命中 %d 次）' % (key, n))
    if out == src:
        sys.exit('什麼都沒改到')
    F.write_text(out, encoding='utf-8', newline='')
    print('RATE_EXP=%s  k=%s' % (exp, k))
    for i, (key, base) in enumerate(BASE):
        print('  %-7s %.4f -> %.6g' % (key, base, base * (1 + k * i / 6)))
    subprocess.check_call(['git', '-C', str(ROOT), '--no-pager', 'diff', '-U0', '--', 'js/content.js'])


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] == '--restore':
        restore()
    else:
        apply(float(a[0]), float(a[1]))
