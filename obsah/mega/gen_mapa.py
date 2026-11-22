# Mapa 76 sil pro davidnavratil.com/megatrendy: kruhová mapa podle svazků (port mapSvg z prohlížeče katalogu).
# Vstup: mapa.json (výtah z 02_katalog/db/katalog.json, jen aktivní faktory). Výstup: mapa_fragment.html
# (SVG + legenda + data pro interakci). Barvy jsou pevné (tmavý pás funguje ve světlém i tmavém motivu).
import json, math, html, re, sys, os, collections

SRC = sys.argv[1] if len(sys.argv) > 1 else 'mapa.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'mapa_fragment.html'
d = json.load(open(SRC, encoding='utf8'))
F = {f['id']: f for f in d['faktory']}
SV = d['svazky']

# Veřejná verze názvů: katalog vznikal i pro finanční strategii, web mluví k široké veřejnosti.
# Interní názvy v katalogu zůstávají; tady se přepisují jen pro mapu na webu (rozhodnutí Davida 21. 11. 2026).
VEREJNE_SVAZKY = {
    'Kdo stojí mezi klientem a penězi': ('Kdo stojí mezi lidmi a jejich penězi', 'Komu budou lidé svěřovat rozhodnutí o penězích: bance, platformě, AI asistentovi, nebo influencerovi?'),
    'Hodnota a cena rady': ('Kolik stojí dobrá rada o penězích', None),
    'Vklady a peníze': ('Kam se stěhují úspory', None),
    'Kdo nese škodu': ('Kdo zaplatí škodu', None),
    'Makro režim, sazby a veřejné finance': ('Růst, úroky a veřejné finance', None),
}
VEREJNE_SILY = {
    'Úzká hrdla elektroenergetiky: místo v síti chybí dnes, zimní výkon od roku 2028': 'Úzká hrdla elektroenergetiky: místo v síti chybí dnes, zimní výkon možná od roku 2028',
    'Stát začíná regulovat pozornost dětí': 'Stát se chystá regulovat pozornost dětí',
    'Důchod už trvá čtvrt století': 'Důchod už trvá skoro čtvrt století',
    'AI zužuje vstupní příčky kariéry: v Americe už měřitelně, v Česku zatím jen náznakem': 'AI zužuje vstupní příčky kariéry: v Americe podle prvních studií, v Česku zatím jen náznakem',
    'Péči platí stát, dělají ji dcery': 'Péči platí stát, dělají ji blízcí',
    'Kde se usadí rada v penzích: v přechodech a výplatní fázi, nebo nikde?': 'Kdo poradí s penzí při změně spoření a při výplatě?',
    'Migrace bohatých: rekordní stěhování majetku': 'Stěhování bohatých za nižšími daněmi',
    'Makro režim do roku 2031: měkký růst, nebo období opakovaných šoků a stagflace?': 'Ekonomika do roku 2031: klidný růst, nebo opakované šoky a stagflace?',
    'Zaplatí lidé rozdíl mezi radou a odpovědnou navigací?': 'Zaplatí lidé za radu, za kterou někdo ručí?',
    'Datová mobilita: papír, nebo skutečnost?': 'Přenos dat mezi bankami: na papíře, nebo doopravdy?',
    'Přechodové klimatické riziko: postupný přechod, nebo skokové zdražení uhlíku?': 'Cena uhlíku: postupný růst, nebo skok?',
    'Kritéria plníme, euro nechceme': 'Většinu kritérií plníme, euro nechceme',
    'Vestavěné finance: distribuce se stěhuje tam, kde klient už je': 'Vestavěné finance: půjčka i pojistka se nabízejí tam, kde člověk zrovna nakupuje',
    'Kanál finance vyhrály. Vysvětlování peněz prohrávají': 'Banku má v telefonu skoro každý. Peníze lidem ale vysvětluje někdo jiný',
    'AI rámuje rozhodnutí dřív, než klient přijde': 'AI ovlivní rozhodnutí o penězích dřív, než člověk dojde do banky',
    'Bankovní trh: konsolidace, nebo AI fragmentace?': 'Finanční trh: pár velkých hráčů, nebo spousta malých s AI?',
    'Kdo vlastní kontext klienta?': 'Kdo o nás ví víc: banka, nebo telefon a vyhledávač?',
    'Pobočky ubývají, bankéři zatím ne: kdo bude klientovi radit?': 'Pobočky ubývají: kdo bude lidem radit?',
    'Finanční zdraví: péče, rezignace, nebo DIY?': 'Finanční zdraví: péče, rezignace, nebo svépomoc?',
    'Digitální euro se blíží (~2029)': 'Digitální euro se blíží (nejdřív 2029)',
    'Digitalizace už rentu ze setrvačnosti měřitelně snižuje, agenti mohou proces zrychlit': 'Věrnost z pohodlnosti slábne: změnit banku je čím dál snazší a AI agenti to mohou urychlit',
    'Depozita: lepivá, nebo prchavá?': 'Vklady: zůstanou, nebo utečou?',
    'Tokenizace peněz: eroze depozit, nebo nová vrstva?': 'Tokenizace peněz: odliv vkladů, nebo nová vrstva?',
    'Private markets pro retail: demokratizace, nebo past?': 'Soukromé trhy pro drobné investory: demokratizace, nebo past?',
    'Vznikne evropský frontier model?': 'Vznikne evropská špičková AI?',
    'Sektorová daň: banky ušetří, nebo zaplatí konsolidaci 2028?': 'Kdo zaplatí konsolidaci rozpočtu v roce 2028?',
    'Bez migrace se Česko zmenšuje: cizinci jako milionový segment': 'Bez migrace se Česko zmenšuje: cizinci jako velká skupina obyvatel',
    'Nevěříme všem stejně: banky zatím patří k nejdůvěryhodnějším': 'Nevěříme všem stejně: komu Češi věří a komu ne',
    'Protection gap: co nejde pojistit, nejde financovat': 'Nepojištěná rizika: co nejde pojistit, nejde ani financovat',
    'Voda je nová zástava. Banky ji zatím neoceňují.': 'Voda jako nová zástava: kdo ocení riziko sucha?',
    'Polykrize: některé šoky známe předem, připravenost ale často chybí': 'Krize se vrství: některé šoky známe předem, připravenost ale často chybí',
}
_pouzito = set()
for f in F.values():
    k = re.sub(r'^SYNTÉZA:\s*', '', str(f['nazev'])).strip()
    if k in VEREJNE_SILY:
        f['nazev'] = VEREJNE_SILY[k]; _pouzito.add(k)
for sv in SV:
    if sv['nazev'] in VEREJNE_SVAZKY:
        _pouzito.add(sv['nazev']); n, o = VEREJNE_SVAZKY[sv['nazev']]
        sv['nazev'] = n
        if o: sv['otazka'] = o
_chybi = (set(VEREJNE_SILY) | set(VEREJNE_SVAZKY)) - _pouzito
assert not _chybi, 'přejmenování bez protějšku v katalogu: %s' % _chybi
MAPCOL = ['#67e8f9', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#f472b6', '#60a5fa', '#fb923c', '#a3e635', '#2dd4bf', '#e879f9', '#facc15']
BG = '#102d47'  # var(--night) pásu .method
esc = lambda t: html.escape(str(t), quote=True)


def cisty_nazev(t):
    return re.sub(r'(?<![.?!])\.$', '', re.sub(r'^SYNTÉZA:\s*', '', str(t or '')).strip())


def short(t, n):
    """Krátký popisek: první část názvu (do dvojtečky, otazníku nebo tečky), dlouhé se zkrátí na celé slovo."""
    s = re.split(r':\s|\?\s|\.\s', cisty_nazev(t))[0].strip().rstrip('.?,;')
    if len(s) <= n + 4:
        return s
    w = s[:n + 1].rsplit(' ', 1)[0].rstrip(',;:').split(' ')
    while len(w) > 2 and w[-1].lower() in KRATKA:
        w.pop()
    return ' '.join(w).rstrip(',;:') + '…'


KRATKA = {'a', 'i', 'v', 've', 'z', 'ze', 's', 'se', 'k', 'ke', 'o', 'u', 'na', 'do', 'po', 'pro', 'nebo', 'ale', 'mezi', 'za', 'ji', 'je', 'jako', 'dřív', 'ze'}


def nbsp(t):
    t = re.sub(r'(^|[\s(])([ksvzouaiKSVZOUAI]) ', '\\1\\2\u00a0', t)
    return re.sub(r'(\d) (?=[%\w])', '\\1\u00a0', t)


# domovský svazek = první svazek, kde je faktor členem (stejně jako v katalogu)
home = {}
for i, s in enumerate(SV):
    for c in s['clenove']:
        if c in F and c not in home:
            home[c] = i
groups = []
for i, s in enumerate(SV):
    ids = sorted([x for x in F if home.get(x) == i], key=lambda x: (0 if F[x]['typ'] == 'trend' else 1, x))
    if ids:
        groups.append({'i': i, 'nazev': s['nazev'], 'otazka': s.get('otazka') or '', 'col': MAPCOL[i % len(MAPCOL)], 'ids': ids})
rest = [x for x in F if x not in home]
if rest:
    groups.append({'i': 99, 'nazev': 'Bez svazku', 'otazka': '', 'col': '#94a3b8', 'ids': sorted(rest)})

GAP = 1.6
slots = len(F) + GAP * len(groups)
k = GAP / 2
pos = {}
for g in groups:
    a0 = k
    for x in g['ids']:
        pos[x] = {'a': (k + .5) / slots * 2 * math.pi - math.pi / 2, 'g': g}
        k += 1
    a1 = k
    k += GAP
    g['a0'] = a0 / slots * 2 * math.pi - math.pi / 2
    g['a1'] = a1 / slots * 2 * math.pi - math.pi / 2

E, seen, deg = [], set(), collections.Counter()
nb = collections.defaultdict(list)
for a, f in F.items():
    for v in f['vazby']:
        b = v['id']
        if b not in F or a == b:
            continue
        key = tuple(sorted((a, b)))
        if key in seen:
            continue
        seen.add(key)
        t = v.get('typ') or 'souvisi'
        E.append((a, b, t))
        deg[a] += 1
        deg[b] += 1
        nb[a].append(b)
        nb[b].append(a)

W = H = 1060
cx = cy = 530
R = 250
FS = 15
f1 = lambda n: f'{n:.1f}'


def P(x):
    a = pos[x]['a']
    return cx + math.cos(a) * R, cy + math.sin(a) * R


cr = R + 24
s = [f'<svg viewBox="0 0 {W} {H}" data-crop="{cx - cr} {cy - cr} {2 * cr} {2 * cr}" role="img" aria-labelledby="mapa-svg-title" class="mapa-svg" font-family="Inter, Arial, sans-serif">',
     f'<title id="mapa-svg-title">Mapa vazeb mezi {len(F)} silami katalogu Megatrendy a nejistoty</title>']
for g in groups:
    r = R - 16
    x0, y0 = cx + math.cos(g['a0']) * r, cy + math.sin(g['a0']) * r
    x1, y1 = cx + math.cos(g['a1']) * r, cy + math.sin(g['a1']) * r
    big = 1 if g['a1'] - g['a0'] > math.pi else 0
    s.append(f'<path class="ma" data-g="{g["i"]}" d="M{f1(x0)} {f1(y0)} A{r} {r} 0 {big} 1 {f1(x1)} {f1(y1)}" fill="none" stroke="{g["col"]}" stroke-width="7" stroke-linecap="round"/>')
s.append('<g class="medges">')
for a, b, t in E:
    (x0, y0), (x1, y1) = P(a), P(b)
    qx, qy = cx + ((x0 + x1) / 2 - cx) * .25, cy + ((y0 + y1) / 2 - cy) * .25
    strong = t in ('posiluje', 'podminka', 'oslabuje')
    col = pos[a]['g']['col']
    dash = ' stroke-dasharray="5 4"' if t == 'oslabuje' else ''
    s.append(f'<path class="me{" ms" if strong else ""}" data-a="{a}" data-b="{b}" d="M{f1(x0)} {f1(y0)} Q{f1(qx)} {f1(qy)} {f1(x1)} {f1(y1)}" stroke="{col}"{dash}/>')
s.append('</g>')
for x in F:
    p = pos[x]
    X, Y = P(x)
    r = 4.5 + math.sqrt(deg[x]) * 1.8
    col = p['g']['col']
    a = p['a']
    left = math.cos(a) < 0
    ang = a * 180 / math.pi + (180 if left else 0)
    tx, ty = cx + math.cos(a) * (R + 14 + r), cy + math.sin(a) * (R + 14 + r)
    shape = (f'<circle r="{f1(r)}" fill="{col}"/>' if F[x]['typ'] == 'trend' else
             f'<rect x="{f1(-r * .9)}" y="{f1(-r * .9)}" width="{f1(r * 1.8)}" height="{f1(r * 1.8)}" transform="rotate(45)" fill="{BG}" stroke="{col}" stroke-width="2.6"/>')
    nm = cisty_nazev(F[x]['nazev'])
    s.append(f'<g class="mn" data-id="{x}" tabindex="0" role="button" aria-label="{esc(nm)}">'
             f'<g transform="translate({f1(X)},{f1(Y)})"><circle class="mhit" r="16" fill="transparent"/>{shape}</g>'
             f'<text class="ml" x="{f1(tx)}" y="{f1(ty)}" transform="rotate({f1(ang)} {f1(tx)} {f1(ty)})" text-anchor="{"end" if left else "start"}" dominant-baseline="middle" font-size="{FS}">{esc(short(nm, 26))}</text></g>')
s.append('</svg>')
svg = '\n'.join(s)

# Varianta pro úvodní stránku: jen kruh, bez popisků, vazby se postupně vykreslí (CSS v HeroSection.astro)
h = [f'<svg viewBox="{cx - cr} {cy - cr} {2 * cr} {2 * cr}" class="hm-svg" role="img" aria-label="Mapa vazeb mezi {len(F)} silami katalogu Megatrendy a nejistoty">']
for g in groups:
    r = R - 16
    x0, y0 = cx + math.cos(g['a0']) * r, cy + math.sin(g['a0']) * r
    x1, y1 = cx + math.cos(g['a1']) * r, cy + math.sin(g['a1']) * r
    big = 1 if g['a1'] - g['a0'] > math.pi else 0
    h.append(f'<path class="hm-a" d="M{f1(x0)} {f1(y0)} A{r} {r} 0 {big} 1 {f1(x1)} {f1(y1)}" fill="none" stroke="{g["col"]}" stroke-width="7" stroke-linecap="round"/>')
for i, (a, b, t) in enumerate(E):
    (x0, y0), (x1, y1) = P(a), P(b)
    qx, qy = cx + ((x0 + x1) / 2 - cx) * .25, cy + ((y0 + y1) / 2 - cy) * .25
    strong = t in ('posiluje', 'podminka', 'oslabuje')
    h.append(f'<path class="hm-e{" hm-s" if strong else ""}" pathLength="1" style="--i:{i % 92}" d="M{f1(x0)} {f1(y0)} Q{f1(qx)} {f1(qy)} {f1(x1)} {f1(y1)}" stroke="{pos[a]["g"]["col"]}" fill="none"/>')
for j, x in enumerate(F):
    X, Y = P(x)
    r = 4.5 + math.sqrt(deg[x]) * 1.8
    col = pos[x]['g']['col']
    shape = (f'<circle r="{f1(r)}" fill="{col}"/>' if F[x]['typ'] == 'trend' else
             f'<rect x="{f1(-r * .9)}" y="{f1(-r * .9)}" width="{f1(r * 1.8)}" height="{f1(r * 1.8)}" transform="rotate(45)" fill="#0d2436" stroke="{col}" stroke-width="2.6"/>')
    h.append(f'<g class="hm-n" style="--j:{j}" transform="translate({f1(X)},{f1(Y)})">{shape}</g>')
h.append('</svg>')
svg_hero = '\n'.join(h)

# legenda svazků (HTML) a seznam všech sil (pro telefon, čtečky obrazovky a vyhledávače)
leg = ['<ul class="mapa-leg">']
for g in groups:
    leg.append(f'<li><button type="button" data-g="{g["i"]}" title="{esc(g["otazka"])}"><i style="background:{g["col"]}"></i>{esc(nbsp(g["nazev"]))} <span>{len(g["ids"])}</span></button></li>')
leg.append('</ul>')
seznam = ['<div class="mapa-seznam">']
for g in groups:
    tr = [x for x in g['ids'] if F[x]['typ'] == 'trend']
    nj = [x for x in g['ids'] if F[x]['typ'] != 'trend']
    seznam.append(f'<div><h4><i style="background:{g["col"]}"></i>{esc(nbsp(g["nazev"]))}</h4>')
    if g['otazka']:
        seznam.append(f'<p class="mq">{esc(nbsp(g["otazka"]))}</p>')
    seznam.append('<ul>' + ''.join(f'<li class="{"t" if F[x]["typ"] == "trend" else "n"}">{esc(nbsp(cisty_nazev(F[x]["nazev"])))}</li>' for x in tr + nj) + '</ul></div>')
seznam.append('</div>')

VETY = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vety_verejne.json'), encoding='utf8'))
assert set(VETY) == set(F), set(F) ^ set(VETY)
ZDR = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vety_zdroje.json'), encoding='utf8'))
data = {x: {'n': nbsp(cisty_nazev(F[x]['nazev'])), 'v': nbsp(VETY[x]), 'z': nbsp(ZDR.get(x, '')), 't': 'trend' if F[x]['typ'] == 'trend' else 'nejistota',
            'g': pos[x]['g']['i'], 'nb': sorted(nb[x], key=lambda y: (pos[y]['g']['i'], y))} for x in F}
gdata = {g['i']: {'n': nbsp(g['nazev']), 'c': g['col']} for g in groups}
frag = {'svg': svg, 'svg_hero': svg_hero, 'legenda': '\n'.join(leg), 'seznam': '\n'.join(seznam),
        'data': json.dumps({'f': data, 'g': gdata}, ensure_ascii=False, separators=(',', ':')),
        'pocty': {'sily': len(F), 'trendy': sum(1 for f in F.values() if f['typ'] == 'trend'), 'nejistoty': sum(1 for f in F.values() if f['typ'] != 'trend'), 'vazby': len(E), 'svazky': len(groups)}}
json.dump(frag, open(OUT, 'w', encoding='utf8'), ensure_ascii=False)
print(frag['pocty'], len(svg), 'B svg')
