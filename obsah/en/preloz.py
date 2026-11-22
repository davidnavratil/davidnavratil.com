# Anglická verze stránek z české: vytáhne textové úseky a nahradí je podle slovníku.
# Použití:
#   python3 preloz.py vytahni <cesky.html> <vystup.json>     seznam úseků k překladu
#   python3 preloz.py preloz <cesky.html> <slovnik.json> <anglicky.html>
# Úsek = vnitřek blokového prvku (odstavec, nadpis, položka, tlačítko...) včetně vložených značek,
# nebo samostatný text mimo bloky; k tomu popisky v atributech a pole "n" a "v" v datech mapy.
# Chybějící překlad: skript vypíše úseky a skončí s kódem 2 (česká verze se tak nedostane do EN potichu).
import sys, re, json, html
from html.parser import HTMLParser

BLOK = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'figcaption', 'summary', 'button', 'label', 'option',
        'dt', 'dd', 'td', 'th', 'caption', 'legend', 'title', 'text', 'blockquote', 'small'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
ATR = ('alt', 'aria-label', 'title', 'placeholder', 'data-topic')
PISMENO = re.compile(r'[A-Za-zÀ-ž]')


class Parser(HTMLParser):
    def __init__(self, raw):
        super().__init__(convert_charrefs=False)
        self.raw = raw
        self.radky = [0]
        for m in re.finditer('\n', raw):
            self.radky.append(m.end())
        self.stack = []       # [tag, inner_start, ma_blok_potomka, je_v_bloku]
        self.useky = []       # (start, end, text)
        self.atributy = []    # (start, end, hodnota)  pozice hodnoty atributu v raw
        self.skripty = []     # (start, end)
        self.volne = []

    def pos(self):
        r, c = self.getpos()
        return self.radky[r - 1] + c

    def v_bloku(self):
        return any(s[0] in BLOK for s in self.stack)

    def _atributy(self, start, text):
        for k in ATR:
            for m in re.finditer(r'\s' + k + r'="([^"]*)"', text):
                if PISMENO.search(m.group(1)):
                    self.atributy.append((start + m.start(1), start + m.end(1), m.group(1)))

    def handle_starttag(self, tag, attrs):
        start = self.pos(); text = self.get_starttag_text()
        self._atributy(start, text)
        if tag in VOID:
            return
        for s in self.stack:
            if tag in BLOK:
                s[2] = True
        self.stack.append([tag, start + len(text), False, start, False])

    def handle_startendtag(self, tag, attrs):
        start = self.pos(); self._atributy(start, self.get_starttag_text())

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        end = self.pos()
        while self.stack:
            s = self.stack.pop()
            if s[0] == tag:
                break
        else:
            return
        if tag == 'script' or tag == 'style':
            if tag == 'script':
                self.skripty.append((s[1], end))
            return
        jednotka = (tag in BLOK and not s[2]) or (tag not in BLOK and s[4] and not s[2])
        if jednotka:
            inner = self.raw[s[1]:end]
            if PISMENO.search(re.sub(r'<[^>]+>', '', inner)):
                a = s[1] + (len(inner) - len(inner.lstrip()))
                b = end - (len(inner) - len(inner.rstrip()))
                self.useky.append((a, b, self.raw[a:b]))

    def handle_data(self, d):
        if self.stack and self.stack[-1][0] in ('script', 'style'):
            return
        if PISMENO.search(d) and self.stack:
            self.stack[-1][4] = True


def rozbor(raw):
    p = Parser(raw); p.feed(raw); p.close()
    u = sorted(set(p.useky), key=lambda x: (x[0], -x[1]))
    keep = []
    for x in u:
        if keep and x[0] >= keep[-1][0] and x[1] <= keep[-1][1]:
            continue
        keep.append(x)
    p.useky = keep; p.volne = []
    return p


def mapa_data(raw, p):
    out = []
    for a, b in p.skripty:
        s = raw[a:b].strip()
        if s.startswith('{') and '"f"' in s[:10]:
            out.append((a, b, json.loads(s)))
    return out


def skupiny(d):
    g = d.get('g')
    if isinstance(g, dict):
        return [x for x in g.values() if isinstance(x, dict)]
    if isinstance(g, list):
        return [x for x in g if isinstance(x, dict)]
    return []


def klic(t):
    return re.sub(r'\s+', ' ', t).strip()


def vytahni(raw):
    p = rozbor(raw); k = []
    for a, b, t in sorted(p.useky + p.volne + p.atributy):
        k.append(klic(t))
    for a, b, d in mapa_data(raw, p):
        for fid, f in d['f'].items():
            for pole in ('n', 'v'):
                if f.get(pole):
                    k.append(klic(f[pole]))
        for g in skupiny(d):
            if g.get('n'):
                k.append(klic(g['n']))
    seen = []; [seen.append(x) for x in k if x not in seen]
    return seen


def preloz(raw, sl):
    p = rozbor(raw); chybi = []; zmeny = []
    def tr(t):
        kk = klic(t)
        if kk in sl and sl[kk]:
            return sl[kk]
        chybi.append(kk); return t
    for a, b, t in p.useky + p.volne:
        zmeny.append((a, b, tr(t)))
    for a, b, t in p.atributy:
        en = tr(html.unescape(t))
        zmeny.append((a, b, html.escape(html.unescape(en), quote=True) if en != t else t))
    for a, b, d in mapa_data(raw, p):
        for f in d['f'].values():
            for pole in ('n', 'v'):
                if f.get(pole):
                    f[pole] = tr(f[pole])
        for g in skupiny(d):
            if g.get('n'):
                g['n'] = tr(g['n'])
        zmeny.append((a, b, json.dumps(d, ensure_ascii=False, separators=(',', ':'))))
    zmeny.sort(key=lambda x: x[0], reverse=True)
    last = len(raw) + 1
    for a, b, t in zmeny:
        assert b <= last, 'překryv úseků'
        raw = raw[:a] + t + raw[b:]; last = a
    # interní odkazy na anglické stránky
    for cs in ('/prednasky/', '/megatrendy/', '/pro-poradatele/'):
        raw = raw.replace('href="' + cs, 'href="/en' + cs)
    raw = raw.replace('href="/analyses/"', 'href="/en/analyses/"')
    raw = raw.replace('href="/#', 'href="/en/#').replace('href="/"', 'href="/en/"')
    return raw, sorted(set(chybi))


if __name__ == '__main__':
    if sys.argv[1] == 'vytahni':
        raw = open(sys.argv[2], encoding='utf8').read()
        json.dump(vytahni(raw), open(sys.argv[3], 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    elif sys.argv[1] == 'preloz':
        raw = open(sys.argv[2], encoding='utf8').read()
        sl = json.load(open(sys.argv[3], encoding='utf8'))
        out, chybi = preloz(raw, sl)
        open(sys.argv[4], 'w', encoding='utf8').write(out)
        if chybi:
            sys.stderr.write('Chybí překlad (%d úseků) pro %s:\n' % (len(chybi), sys.argv[2]))
            for c in chybi[:40]:
                sys.stderr.write('  ' + c[:140] + '\n')
            sys.exit(2)
