# Anglické obálky stránek: src/pages/en/{prednasky,megatrendy,pro-poradatele}.astro
# vzniknou z českých obálek nahrazením textů podle tabulek níže. Skripty v obálkách tak zůstávají
# stejné v obou jazycích; když se český text v obálce změní a tabulka ho nenajde, skript skončí chybou.
# Použití: python3 gen_stranky.py <kořen repozitáře>
import sys, io, os

REPO = sys.argv[1]

SPOLECNE = [
    ("import '../styles/pr.css';", "import '../../styles/pr.css';"),
    ("import Base from '../layouts/Base.astro';", "import Base from '../../layouts/Base.astro';"),
    ("<b>Peníze, procenta a&nbsp;prosperita:</b> newsletter o&nbsp;ekonomice, technologiích a&nbsp;státu. "
     "<a href=\"https://davidnavratil.substack.com/subscribe\" target=\"_blank\" rel=\"noopener\">Odebírat zdarma&nbsp;<span aria-hidden=\"true\">→</span></a>",
     "<b>Peníze, procenta a&nbsp;prosperita</b> (Money, Percentages and Prosperity): my newsletter on the economy, technology and the state, in Czech. "
     "<a href=\"https://davidnavratil.substack.com/subscribe\" target=\"_blank\" rel=\"noopener\">Subscribe free&nbsp;<span aria-hidden=\"true\">→</span></a>"),
]

POLE = [  # animace „pole karet“ na /prednasky i /megatrendy
    ("[['Společnost', 13, 9], ['Ekonomika', 8, 9], ['Technologie', 10, 7], ['Regulace a politika', 3, 9], ['Klima a zdroje', 6, 2]]",
     "[['Society', 13, 9], ['Economy', 8, 9], ['Technology', 10, 7], ['Regulation and politics', 3, 9], ['Climate and resources', 6, 2]]"),
    ("'rozcestí: data rozhodnou'", "'crossroads: the data decide'"),
    ("'budoucnost A'", "'future A'"),
    ("'budoucnost B'", "'future B'"),
]

STRANKY = {
'prednasky': SPOLECNE + POLE + [
    ("import obsah from '../data/prednasky.html?raw';", "import obsah from '../../data/en/prednasky.html?raw';"),
    ('<Base title="David Navrátil: scénáře budoucnosti pro konference a vedení firem" description="Přednášky a strategické debaty Davida Navrátila o megatrendech, scénářích a odolnosti firem do roku 2031. Více možných budoucností a čísla, podle kterých poznáte, která přichází." image="/images/og/prednasky.jpg">',
     '<Base title="David Navrátil: future scenarios for conferences and leadership teams" description="Keynotes and strategy sessions by David Navrátil, Chief Economist of Česká spořitelna, on megatrends, scenarios and corporate resilience to 2031. Several possible futures and the numbers that tell you which one is coming." image="/images/og/prednasky.jpg">'),
    ("'Zajímá mě téma „' + a.dataset.topic + '“'", "'I am interested in the topic “' + a.dataset.topic + '”'"),
    ("'Vyplňte prosím tento údaj.'", "'Please fill in this field.'"),
    ("zprava('Odesílá se…');", "zprava('Sending…');"),
    ("'Zkontrolujte prosím jméno, e-mail a firmu. Něco z toho chybí nebo nesedí.'",
     "'Please check your name, e-mail and company. Something is missing or does not look right.'"),
    ("'Díky, poptávka dorazila. Odpověď přijde na e-mail, který jste uvedli.'",
     "'Thank you, your enquiry has arrived. The reply will come to the e-mail address you gave.'"),
    ("'Jméno: '", "'Name: '"),
    ("'Firma nebo akce: '", "'Company or event: '"),
    ("'Termín: '", "'Date: '"),
    ("'k domluvě'", "'to be agreed'"),
    ("'Formát: '", "'Format: '"),
    ("'Poptávka vystoupení: '", "'Speaking enquiry: '"),
    ("'Přijetí poptávky se nepodařilo potvrdit. Údaje zůstaly ve formuláři a otevřel se vám e-mail s připravenou zprávou; pokud se nic neotevřelo, napište prosím na davidxnavratil@gmail.com.'",
     "'We could not confirm that your enquiry arrived. Your details are still in the form and an e-mail with a prepared message has opened; if nothing opened, please write to davidxnavratil@gmail.com.'"),
],
'pro-poradatele': SPOLECNE + [
    ("import obsah from '../data/pro-poradatele.html?raw';", "import obsah from '../../data/en/pro-poradatele.html?raw';"),
    ('<Base title="Pro pořadatele: bio, fotky a podklady | David Navrátil" description="Podklady pro pořadatele akcí s Davidem Navrátilem: bio ve třech délkách, úvod pro moderátora, fotky ke stažení, video, témata, formáty a technické potřeby." image="/images/og/pro-poradatele.jpg">',
     '<Base title="For organisers: bio, photos and materials | David Navrátil" description="Materials for event organisers working with David Navrátil: bio in several lengths, an introduction for the host, photos to download, video, topics, formats and technical needs." image="/images/og/pro-poradatele.jpg">'),
    ("b.textContent = 'Zkopírováno';", "b.textContent = 'Copied';"),
    ("b.textContent = 'Označeno, zkopírujte Ctrl+C';", "b.textContent = 'Selected, copy with Ctrl+C';"),
],
'megatrendy': SPOLECNE + POLE + [
    ("import AnalysesSection from '../components/AnalysesSection.astro';", "import AnalysesSection from '../../components/AnalysesSection.astro';"),
    ("import FilmSection from '../components/FilmSection.astro';\n", ""),
    ("import uvod from '../data/megatrendy-uvod.html?raw';", "import uvod from '../../data/en/megatrendy-uvod.html?raw';"),
    ("import obsah from '../data/megatrendy.html?raw';", "import obsah from '../../data/en/megatrendy.html?raw';"),
    ('<Base title="Megatrendy a nejistoty: mapa 76 sil do roku 2031 | David Navrátil" description="Katalog 40 trendů a 36 nejistot s výhledem do roku 2031: co se děje s penězi, prací, technologiemi a státem a podle čeho poznáme, že se mýlíme. Každé číslo má zdroj." image="/images/megatrendy/megatrendy-og.jpg">',
     '<Base title="Megatrends and uncertainties: a map of 76 forces to 2031 | David Navrátil" description="A catalogue of 40 trends and 36 uncertainties looking ahead to 2031: what is happening to money, work, technology and the state, and how we will know we are wrong. Every number has a source." image="/images/megatrendy/megatrendy-og.jpg">'),
    ('  <FilmSection verze="plna" />\n', ''),  # film je česky
    ("det.setAttribute('aria-label', 'Detail síly');", "det.setAttribute('aria-label', 'Force detail');"),
    ('aria-label="Zavřít detail"', 'aria-label="Close detail"'),
    ("`<p class=\"md-z\">Zdroj: ${esc(f.z)}</p>`", "`<p class=\"md-z\">Source: ${esc(f.z)}</p>`"),
    ("`<p class=\"md-q\">Souvisí s&nbsp;${f.nb.length} ${f.nb.length === 1 ? 'silou' : 'silami'}:</p><ul>${li}</ul>`",
     "`<p class=\"md-q\">Linked to ${f.nb.length} ${f.nb.length === 1 ? 'force' : 'forces'}:</p><ul>${li}</ul>`"),
    ("`<p class=\"mi-q\">Souvisí s&nbsp;${f.nb.length} ${f.nb.length === 1 ? 'silou' : 'silami'}:</p><ul>${li}</ul>`",
     "`<p class=\"mi-q\">Linked to ${f.nb.length} ${f.nb.length === 1 ? 'force' : 'forces'}:</p><ul>${li}</ul>`"),
    ("'<p class=\"mi-q\">Karta zatím nemá vazby na jiné síly.</p>'", "'<p class=\"mi-q\">This card has no links to other forces yet.</p>'"),
    ("'<button type=\"button\" class=\"mi-x\">Zrušit výběr</button>'", "'<button type=\"button\" class=\"mi-x\">Clear selection</button>'"),
    ("<span class=\"mi-m\">svazek · ${ids.length} sil</span>", "<span class=\"mi-m\">cluster · ${ids.length} forces</span>"),
],
}

HLAVICKA = ('// VYGENEROVÁNO z ../{0}.astro skriptem obsah/en/gen_stranky.py: needitovat ručně,\n'
            '// změny dělat v české obálce a v tabulce ve skriptu.\n')

os.makedirs(os.path.join(REPO, 'src/pages/en'), exist_ok=True)
chyby, vystup = [], {}
for jm, tab in STRANKY.items():
    s = io.open(os.path.join(REPO, 'src/pages', jm + '.astro'), encoding='utf8').read()
    for a, b in tab:
        if a not in s:
            chyby.append('%s: nenalezeno %r' % (jm, a[:90]))
            continue
        s = s.replace(a, b)
    assert s.startswith('---\n')
    vystup[jm] = '---\n' + HLAVICKA.format(jm) + s[4:]
if not chyby:  # zapisuje se jen celá sada, jinak zůstanou předchozí anglické obálky
    for jm, s in vystup.items():
        io.open(os.path.join(REPO, 'src/pages/en', jm + '.astro'), 'w', encoding='utf8').write(s)
if chyby:
    sys.stderr.write('Anglické obálky: v české obálce se změnil text, doplňte tabulku v gen_stranky.py\n  ' + '\n  '.join(chyby) + '\n')
    sys.exit(2)
print('gen_stranky ok')
