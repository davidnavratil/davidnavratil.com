# Index silnejsich regionu -- Dokumentace

## Prehled projektu

**Co to je:** Interaktivni scrollytelling analyza kvality zivota ve 206 obcich s rozsirenou pusobnosti (ORP) Ceske republiky. Analyza vychazi ze 49 ukazatelu projektu Index silnejsich regionu, spolecneho projektu Ceske sporitelny a Evropy v datech (silnejsiregiony.cz). Puvodni data obohacuje o faktorovou analyzu, clustering a propojeni s volebnimi vysledky.

**Pro koho:** Sirokou verejnost, novinare, analytiky regionalni politiky. Formatem je datova esej, ne akademicky paper. Ctenar nepotrebuje statisticke znalosti.

**Odkud data pochazeji:**

- 49 indikatoru kvality zivota: CSU, MPSV, MZ CR, CUZK, CTU a dalsi resortni zdroje (2023--2025), agregovane na uroven ORP projektem Evropa v datech
- Volebni data: CSU / volby.cz, parlamentni volby 2021 a 2025, 14 711 okrsku, 6 389 obci, agregovane na 206 ORP
- Geodata: souradnice ORP, mapove dlazdice OpenStreetMap

**URL:** `davidnavratil.com/analyses/index-silnejsich-regionu/`

**Stav nasazeni:** V `src/data/analyses.ts` je polozka `live: false` (radek 32). Pro zverejneni na homepage prepnout na `live: true`.


## Architektura

### Technologie

- Vanilla JS (IIFE, strict mode), zadny framework
- Plotly.js 2.35.2 (CDN, plny bundle ~3,5 MB) pro vsechny grafy a mapy
- Sdileny brand layer: `brand.css` + `brand-header` + `brand-footer` z `davidnavratil.com/shared/`
- Fonty: Fraunces (serif, nadpisy) + Inter (sans, telo textu)
- Analytics: Plausible

### Scrollytelling pattern

Scroll observer pouziva `requestAnimationFrame` throttling a hledani kroku nejblize stredu viewportu:

1. Na kazdy `scroll` event se spusti RAF callback
2. Projde vsechny `.step` elementy, spocita vzdalenost jejich stredu od stredu viewportu
3. Nejblizsi krok dostane tridu `.active` (opacity 1, ostatni 0.2)
4. Z `data-viz` atributu aktivniho kroku se vybere vizualizacni funkce z `VIZ_MAP`
5. Pred vykreslenim se provede fade-out (`opacity: 0`), po vykresleni fade-in

### Struktura stranky

- **Hook** (Orlova x Frydlant nad Ostravici): uvodní kontrast, fullscreen
- **Hero**: 206 regionu, 49 ukazatelu, 7 piliru, animovane citace
- **7 scroll sekci**, kazda s `<div class="steps">` (levy sloupec) a `<div class="viz-sticky">` (pravy sloupec, sticky)
- **Interludes**: plnosirkove textove bannery mezi sekcemi
- **Search**: vyhledavani ORP s autocomplete a kartou profilu
- **Conclusion**: 5 takeaway bodu
- **Metodologie**: popis EFA, clusteringu, korelaci, limitu
- **Footer**: brand footer s navigaci mezi analyzami

### Pocet kroku

| Sekce | ID | Kroky | Viz kontejner |
|---|---|---|---|
| Data (49 -> 7 piliru) | sec-data | 4 | viz-data |
| Ctyri pohledy (EFA) | sec-indexes | 3 | viz-indexes |
| Prekvapive korelace | sec-correlations | 4 | viz-correlations |
| Mapa clusteru | sec-clusters | 3 | viz-clusters |
| Paradoxy sousedu | sec-pairs | 4 | viz-pairs |
| Dynamika | sec-momentum | 3 | viz-momentum |
| Volby x Prosperita | sec-elections | 4 | viz-elections |
| **Celkem** | | **25** | **7** |

### Responsivita

- Nad 900px: dvousloupcovy grid (text vlevo, vizualizace vpravo, sticky)
- Pod 900px: jednosloupcovy layout, vizualizace relativni s vyskou 50vh
- Pod 600px: hook contrast grid se prepne na jednosloupcovy

### Dark mode

Plna podpora pres `prefers-color-scheme: dark`. Vsechny tokeny (`--color-bg`, `--color-surface`, `--color-text` atd.) maji dark variantu. Cluster barvy jsou svetlejsi pro kontrast na tmavem pozadi.


## Datovy model

### Dva paralelni systemy

1. **Originalní 7-pilirovy index** (ranking.json): 7 tematickych piliru (demografie, ekonomika, vzdelavani, dostupnost pece, prostredi, obcanska vybavenost, cas), kazdy 0--100, celkove skore jako prumer, rank 1--206
2. **4-faktorovy EFA model** (indexes.json): faktory odhalene statisticky z dat, kazdy 0--100, celkove skore jako vazeny prumer

### JSON soubory (celkem 197 KB, 7 souboru)

#### ranking.json (8,4 KB)

- Struktura: `{ top: [...], bottom: [...] }`
- Top 15 a bottom 15 ORP podle celkoveho skore 7 piliru
- Klicova pole: `ORP+Praha`, `Kraj`, `celkem`, `rank`, `obyvatel`, `demografie`, `ekonomika`, `vzdelavani`, `pece`, `prostredi`, `obcanvyb`, `cas`
- Pouziti: horizontalni bar charty v sekci "Kdo je nahore / dole"

#### indexes.json (26,3 KB)

- Struktura: `{ orp: [...], correlations: {...} }`
- 206 zaznamu, kazdy s 4 faktorovymi skory
- Klicova pole: `name`, `kraj`, `pop`, `skore` (celkove), `i1` (infrastruktura), `i2` (socialni odolnost), `i3` (atraktivita), `i4` (demografie)
- Pouziti: scatter ploty infrastruktura vs. atraktivita, prosperita vs. socialni odolnost, vyhledavani ORP

#### clusters.json (32,3 KB)

- Struktura: `{ orp: [...] }`
- 206 ORP s K-means clustery a geo souradnicemi
- Klicova pole: `name`, `kraj`, `pop`, `cluster`, `lat`, `lon`, `i0`, `i3`
- Cluster hodnoty: "Prosperujici regiony", "Mesta v socialnim napeti", "Vnitrni periferie"
- Pouziti: mapove vizualizace (scattermap pres OpenStreetMap), zvyraznovani kraju

#### pairs.json (1,9 KB)

- Struktura: pole 4 objektu, kazdy s `pair: { a: {...}, b: {...} }` a `story`
- 4 kontrastni pary ORP: Olomouc/Vitkov, Hradec Kralove/Novy Bydzov, Ceske Budejovice/Cesky Krumlov, Praha/Cesky Brod
- Klicova pole: `name`, `lat`, `lon`, `pop`, `rank`, `skore`, `i1`, `i2`, `i3`, `i4`
- Pouziti: mini mapy + dumbbell charty srovnavajici profily dvou ORP

#### momentum.json (19,7 KB)

- Struktura: `{ orp: [...] }`
- 206 zaznamu s dynamikou v case
- Klicova pole: `name`, `kraj`, `pop`, `i0` (celkove skore), `momentum` (anualizovana zmena)
- Pouziti: scatter plot se ctyrmi kvadranty (lidri, dohanejici, stagnujici, propadajici)

#### elections.json (69,7 KB, nejvetsi soubor)

- Struktura: `{ meta: {...}, clusters: {...}, orp: [...] }`
- 206 ORP s volebnimi daty 2021 a 2025
- Klicova pole: `name`, `pop`, `skore`, `ano25`, `spolu25`, `stan25`, `pirati25`, `spd25`, `motor25`, `stacilo25`, `populist25`, `i3` (socialni odolnost), `i2`, `cluster`, `ucast25`, `ucast21`, `d_ucast`, `d_ano`
- Pouziti: 4 volebni vizualizace (ucast, bloky, mobilizace, periferie)

#### correlations.json (38,8 KB)

- Struktura: pole 4 objektu, kazdy s metadaty a polem `orp` (206 zaznamu)
- 4 prekvapive korelace: vzdelani vs. bydleni (r = -0,64), knihovny vs. cerpacky (r = -0,60), finance na zaka vs. vysokoskolaci (r = -0,49), nadeje doziti vs. podnikatele (r = +0,45)
- Klicova pole: `id`, `x_label`, `y_label`, `x_factor`, `y_factor`, `r`, `orp[].name`, `orp[].x`, `orp[].y`
- Pouziti: scatter ploty s trendline pro kazdou korelaci


## Metodologie

### Exploratorni faktorova analyza (EFA)

- Vstup: 49 indikatoru, 206 ORP, rankove transformace
- Extrakce: Principal Axis Factoring (PAF)
- Rotace: Varimax (ortogonalni, faktory nekorelované)
- KMO = 0,80 (meritorious), Bartlettuv test p < 0,001
- Paralelni analyza doporucuje 5 faktoru, zvolen 4-faktorovy model jako kompromis
- Adjusted R2 = 0,91 (vysvetlena variance 90,9 %)
- Cronbach alpha: F1 = 0,854, F2 = 0,883, F3 = 0,837, F4 = 0,688
- 42 z 49 indikatoru prirazeno k faktorum (7 vylouceno, nesystematicke)

### Bootstrap stabilita

- 1 000 replikaci, 95% CI pro faktorove zateze
- 41 z 42 prirazenych indikatoru stabilnich (jediny nestabilni: Ordinace praktiku, CI krizujici nulu)
- 46 z 49 celkove stabilnich na dominantni/prirazene zatezi

### Promax validace

- Promax rotace (sikma) testovana jako alternativa k Varimax
- Faktorove korelace nizke (max |r| = 0,16 pro 4F), potvrzuje opravnenost ortogonalni rotace
- Jediny presun: Prijmy obci (varimax = F3, promax = EXCLUDE)

### Clustering

- K-means, k = 3, nad 4 standardizovanymi faktorovymi skory
- Volba k podlozena silhouette analyzou
- 3 typy: Prosperujici regiony (58 % populace), Mesta v socialnim napeti (21 %), Vnitrni periferie (21 %)

### Volebni data

- 14 711 okrsku z CSU / volby.cz
- Agregace: okrsek -> obec (6 389) -> ORP (206)
- Roky: parlamentni volby 2021 a 2025
- Stranicky index: ANO, SPOLU, STAN, Pirati, SPD, Motoriste, Stacilo!
- Populisticky blok: ANO + SPD + Motoriste + Stacilo! (korelace se soc. odolnosti r = -0,73)

### Klicove korelace

| Vztah | r | Poznamka |
|---|---|---|
| Socialni odolnost vs. volebni ucast | +0,88 | Nejsilnejsi v datasetu |
| ANO vs. celkova prosperita | -0,68 | |
| SPOLU vs. celkova prosperita | +0,65 | |
| Socialni odolnost vs. celkova prosperita | +0,65 | |
| Populisticky blok vs. soc. odolnost | -0,73 | |
| Vzdelani vs. dostupnost bydleni | -0,64 | Stejny faktor, proti sobe |
| Knihovny vs. cerpacky | -0,60 | Stejny faktor, dva modely infrastruktury |


## Struktura kodu

Veskerý kod je v jednom souboru `index.html` (2 081 radku): HTML, CSS a JS dohromady.

### Hlavni JS funkce

| Funkce | Co dela |
|---|---|
| `loadData()` | Nacte 7 JSON souboru paralelne pres `Promise.all` |
| `setupObservers()` | RAF scroll listener, aktivace kroku, dispatch vizualizaci |
| `setupSearch()` | Autocomplete vyhledavani ORP s diakritikou-ignorujicim matchem |
| `setupProgress()` | Progress bar nahore stranky |
| `setupHero()` | IntersectionObserver pro animaci cisel v hero sekci |
| `setupScrollHints()` | Schovani "Scrollujte dolu" po prvnim scrollu |
| `animateCounters()` | Animace cisel 0 -> 206, 0 -> 49, 0 -> 7 s easing |

### Render funkce

| Funkce | Vizualizace |
|---|---|
| `renderDataWall()` | 49 tagu s CSS animaci vstupu |
| `renderDataPillars()` | 7 piliru jako skupiny tagu |
| `renderDataViews()` | 4 faktorove pohledy + 7 nezarazenych tagu |
| `renderRanking(which)` | Horizontalni bar chart, top/bottom 15 |
| `renderScatter(which)` | Scatter plot: i1 vs. i3 nebo i0 vs. i2 |
| `renderCorrelation(corrId)` | Scatter + trendline pro 4 prekvapive korelace |
| `renderClusters(highlight)` | Scattermap (OSM), moznost zvyrazneni kraje |
| `renderPairs(idx)` | Mini mapa + dumbbell chart pro par ORP |
| `renderMomentum(highlight)` | Scatter se 4 kvadranty, zvyrazneni Vysociny/lidru |
| `renderElectionsTurnout()` | Soc. odolnost vs. volebni ucast, barva = cluster |
| `renderElectionsBlocs()` | Prosperita vs. ANO, barva = soc. odolnost |
| `renderElectionsPopulism()` | Soc. odolnost vs. zmena ucasti 2021-2025 |
| `renderElectionsPeriphery()` | Soc. odolnost vs. populisticky blok |

### VIZ_MAP dispatch

Objekt `VIZ_MAP` mapuje 25 hodnot `data-viz` na render funkce. Scroll observer volá `VIZ_MAP[vizKey]()` pri zmene aktivniho kroku. Kazda sekce ma jeden sdileny `viz-container`, ktery se prepise.

### Jak pridat novou sekci

1. Pridat HTML: novy `<section class="scroll-section">` s kroky (`.step[data-viz="..."]`) a vizualizacnim kontejnerem
2. Pridat render funkci (`renderNovaSekce()`)
3. Pridat zaznam do `VIZ_MAP`
4. Pripravit JSON data a pridat do `loadData()`


## Udrzba a aktualizace

### Aktualizace dat (novy rocnik)

1. Ziskat novy xlsx z silnejsiregiony.cz
2. Spustit Python skripty v poradi:
   - `01_dq.py` -- data quality check
   - `02_ranking.py` -- celkovy zebricek
   - `04_pca.py` + `ranked_factor_analysis.py` -- EFA
   - `05_clustering.py` -- K-means
   - `07_dynamika.py` -- momentum
   - `09_volby_ps2025.py` -- volebni data (pri novych volbach)
   - `export_scrollytelling.py` -- export do JSON
3. Nahradit JSON soubory v `public/analyses/index-silnejsich-regionu/data/`
4. Overit, ze se stranka spravne renderuje

### Zdrojove skripty

Cesta: `/Users/davidnavratil/pracovni/index-silnejsich-regionu/scripts/`

Vsechny Python skripty (18 souboru):

- `01_dq.py`, `01b_inspect.py` -- data quality, inspekce
- `02_ranking.py`, `02_geo_setup.py` -- zebricek, geospatial setup
- `03_kraje.py` -- krajske agregovani
- `04_pca.py`, `04b_alt_indexes.py` -- PCA, alternativni indexy
- `05_clustering.py` -- K-means
- `06_blizke_orp.py` -- blizke ORP pary
- `07_dynamika.py` -- casova dynamika
- `08_opravy_oponentura.py` -- opravy po oponenture
- `09_volby_ps2025.py`, `09b_volby_zmena.py`, `09c_volby_robustnost.py` -- volebni analyza
- `ranked_factor_analysis.py` -- hlavni EFA
- `codex_verify_efa.py`, `codex_alt_ranking.py` -- nezavisla verifikace (Codex)
- `export_scrollytelling.py`, `export_volby_json.py` -- export do JSON pro web

### Prepnuti na live

V souboru `src/data/analyses.ts`, radek 32: zmenit `live: false` na `live: true`.


## Zname limitace

### Technicke

- **Plotly.js plny bundle**: ~3,5 MB. Pro produkcni nasazeni zvazit partial bundle (jen scatter + scattermap) nebo precompiled Plotly
- **Map tiles z OSM**: externi zavislost, bez cachovani. Pri vytizeni OSM serveru se mapy nezobrazí
- **Headless browser testing**: nespolehlivy pro scrollytelling (IntersectionObserver, scroll events). Vizualni testovani nutne manualne
- **Jednosouborova architektura**: vsechno v jednom index.html (2 081 radku). Pri dalsi iteraci zvazit separaci CSS a JS

### Metodologicke

- **Ekologicky klam**: korelace na urovni regionu (napr. volebni) nelze prenest na jednotlivce. Explicitne zmineno v metodologii na strance
- **Rankova transformace**: faktorova analyza pracuje s poradi, ne absolutnimi hodnotami. Ztrata informace o rozptylech
- **Stabilita zebricku**: prehazeni 2 ukazatelu meni top-10 z tretiny (zmineno v zaveru)
- **Momentum**: anualizovana zmena z dvou bodu v case, citliva na sum v datech. Potvrzeni vyzaduje dalsi rocniky
- **Cronbach alpha F4**: 0,688, pod obvyklym prahem 0,70. Faktor "Demografie a pece" je nejslabsi
- **5. faktor vynechan**: alpha = 0,546, prilis slaby pro spolehlivou interpretaci

### Datove

- Většina indikatoru z let 2023--2025, nektera data mohou byt starsi
- Volebni data pokryvaji jen parlamentni volby, ne komunalni nebo prezidentske
- 7 z 49 indikatoru nerozlisuje regiony systematicky (pediatri, socialni sluzby, sebevrazdy, zive narozeni, kina, produkce odpadu, digitalni kompetence)


## Nezavisla verifikace

EFA model byl nezavisle verifikovan skriptem `codex_verify_efa.py`. Vsechny klicove metriky potvrzeny:

- KMO: 0,8024 (CONFIRMED)
- Bartlettuv chi2: 5692,4 (CONFIRMED)
- Faktorove zateze: max absolutni odchylka 0,0000
- Prirazeni indikatoru: 49/49 presnych shod
- Cronbach alpha: vsechny 4 faktory CONFIRMED
- Adjusted R2: 0,9097 (CONFIRMED)
- Bootstrap: 41/42 retainovanych indikatoru stabilnich
