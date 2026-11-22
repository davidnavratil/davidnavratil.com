"""Dodělávky anglických fragmentů po preloz.py.
Použití: python3 en_post.py <adresář s výstupy>
- pro-poradatele: karty s českým bio dostanou lang="cs" jen na samotném textu bio,
- megatrendy: v datech mapy přeloží typ síly (nejistota) a zdroje."""
import json, re, sys

ZDROJE = {
"ACER, rozhodnutí 06/2026 k evropskému hodnocení zdrojové přiměřenosti (ERAA 2025)": "ACER, decision 06/2026 on the European Resource Adequacy Assessment (ERAA 2025)",
"ECB Blog, The European economy is not drought-proof": "ECB Blog, The European economy is not drought-proof",
"ECB, konvergenční zpráva, 24. 6. 2026": "ECB, Convergence Report, 24 Jun 2026",
"ECB, tisková zpráva o další fázi projektu digitálního eura, 30. 10. 2025": "ECB, press release on the next phase of the digital euro project, 30 Oct 2025",
"ESRB, tisková zpráva 7. 7. 2026": "ESRB, press release, 7 Jul 2026",
"Eurostat, EU-SILC 2025": "Eurostat, EU-SILC 2025",
"Eurostat, naděje dožití a roky života ve zdraví": "Eurostat, life expectancy and healthy life years",
"Eurostat, notifikace deficitu a dluhu za rok 2025; Národní rozpočtová rada, Zpráva o dlouhodobé udržitelnosti veřejných financí 2026": "Eurostat, deficit and debt notification for 2025; Czech Fiscal Council, Report on the Long-term Sustainability of Public Finances 2026",
"Eurostat, používání internetového bankovnictví": "Eurostat, use of internet banking",
"Eurostat, regionální HDP v paritě kupní síly": "Eurostat, regional GDP in purchasing power parity",
"Eurostat, zaměstnanost podle odvětví, 2025": "Eurostat, employment by sector, 2025",
"Evropská komise, 23. 6. 2025": "European Commission, 23 Jun 2025",
"Evropská komise, stránka ETS2; směrnice (EU) 2023/959": "European Commission, ETS2 page; Directive (EU) 2023/959",
"MF ČR, Zpráva o vývoji finančního trhu v roce 2025": "Czech Ministry of Finance, Report on Financial Market Developments in 2025",
"NATO, Haagská deklarace, 25. 6. 2025": "NATO, The Hague Summit Declaration, 25 Jun 2025",
"Nařízení (EU) 2023/606": "Regulation (EU) 2023/606",
"Národní rozpočtová rada, stanovisko č. 5/2026": "Czech Fiscal Council, Opinion No. 5/2026",
"Policie ČR, Vývoj registrované kriminality v roce 2025": "Police of the Czech Republic, Registered Crime in 2025",
"SFŽP, Nová zelená úsporám, pokyny z 27. 5. 2026": "State Environmental Fund, New Green Savings programme, guidelines of 27 May 2026",
"ČHMÚ, Ročenka klimatologie 2024": "Czech Hydrometeorological Institute, Climatology Yearbook 2024",
"ČSSZ, Statistická ročenka 2024; do roku 2017 všechny důvody zániku, od roku 2018 jen úmrtí": "Czech Social Security Administration, Statistical Yearbook 2024; up to 2017 all reasons for ending, from 2018 deaths only",
"ČSÚ, 31. 3. 2026": "Czech Statistical Office, 31 Mar 2026",
"ČSÚ, 31. 3. 2026; Eurostat, projekce obyvatelstva": "Czech Statistical Office, 31 Mar 2026; Eurostat, population projections",
}
TYP = {"trend": "trend", "nejistota": "uncertainty"}

d = sys.argv[1]
p = d + '/pro-poradatele.html'
h = open(p, encoding='utf8').read()
n = h.count('<article class="bio" lang="en">')
h = h.replace('<article class="bio" lang="en">', '<article class="bio">')
for i in ('3', '4'):
    h = h.replace('<p id="bio-' + i + '">', '<p id="bio-' + i + '" lang="cs">')
assert n == 2 and h.count('lang="cs"') == 2, 'pro-poradatele: nečekaná struktura karet'
open(p, 'w', encoding='utf8').write(h)

p = d + '/megatrendy.html'
h = open(p, encoding='utf8').read()
m = re.search(r'(<script[^>]*id="mapa-data"[^>]*>)(.*?)(</script>)', h, re.S)
D = json.loads(m.group(2)); chybi = set()
for f in D['f'].values():
    f['t'] = TYP[f['t']]
    if f.get('z'):
        if f['z'] in ZDROJE: f['z'] = ZDROJE[f['z']]
        else: chybi.add(f['z'])
if chybi:
    print('Chybí překlad zdroje:', *chybi, sep='\n  '); sys.exit(2)
js = json.dumps(D, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
open(p, 'w', encoding='utf8').write(h[:m.start(2)] + js + h[m.end(2):])
print('en_post ok')
