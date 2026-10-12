"""Swap the AEGIS mark in brand/x SVGs for the exact approved logo (brand/logo/aegis-mark.svg).
Run from brand/x. Only the blade group and its gradient change; layout and type stay as they were."""
import re, sys, glob
MARK_SRC = open('../logo/aegis-mark.svg').read()
GRAD = re.search(r'<linearGradient id="aegis-grad".*?</linearGradient>', MARK_SRC, re.S).group(0)
POLYS = re.findall(r'<polygon points="([^"]+)" fill="url\(#aegis-grad\)"/>', MARK_SRC)
def group(transform):
    body = ''.join(f'<polygon points="{p}" fill="url(#aegis-grad)"/>' for p in POLYS)
    return f'<defs>{GRAD}</defs><g transform="{transform}">{body}</g>'
# transform per canvas: mark is 131x128 in its own units
TRANSFORM = {
    'square': 'translate(211.8 218.4) scale(4.4)',          # 1000x1000 avatar, centred
    'banner': 'translate(1010 50) scale(3.1)',              # 1500x500 header, right side
}
def canvas(text):
    return 'banner' if 'viewBox="0 0 1500 500"' in text else 'square'
for f in sys.argv[1:]:
    t = open(f).read()
    # remove old mark group (three blade paths, optional filter) and old blade gradient
    t2, n = re.subn(r'<g[^>]*>\s*<path d="M4 34[^"]*"[^>]*/>\s*<path d="M14 34[^"]*"[^>]*/>\s*<path d="M23 34[^"]*"[^>]*/>\s*</g>',
                    lambda m: group(TRANSFORM[canvas(t)]), t)
    t2 = re.sub(r'<linearGradient id="blade".*?</linearGradient>', '', t2, flags=re.S)
    t2 = re.sub(r'<filter id="soft".*?</filter>', '', t2, flags=re.S)
    if n != 1:
        print('SKIP', f, 'mark groups found:', n); continue
    open(f, 'w').write(t2)
    print('updated', f)
