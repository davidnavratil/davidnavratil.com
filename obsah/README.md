# Obsah stránek /prednasky, /megatrendy a /pro-poradatele

Texty, čísla a mapa na těchto třech stránkách se nepíšou přímo v `src/data/`, ale vyrábějí se z této složky.
Soubory v `src/data/` jsou výstup: když je upravíš ručně, další běh `vyrob.sh` úpravu přepíše.

## Jak upravit text

1. Uprav zdroj (viz tabulka níže), nejčastěji `navrh.html`.
2. Spusť `bash obsah/vyrob.sh`. Vypíše, které soubory v `src/data/` se změnily.
3. `npm run build`, pak náhled `npm run preview` (http://localhost:4321/prednasky/ a další).
4. Commit. **Push do `main` web nasadí** (GitHub Actions, zhruba do minuty).

## Co je kde

| Soubor | Co v něm je | Kam se propíše |
|---|---|---|
| `navrh.html` | celý návrh stránky přednášek: hero, čísla, témata, formáty, poptávka, metoda | `/prednasky`, z části i `/megatrendy` a `/pro-poradatele` |
| `gen_astro.py` | vyřízne obsah z návrhu a přizpůsobí ho webu (barvy, nadpisy) | `src/data/prednasky.html` |
| `trim_prednasky.py` | zkrátí /prednasky (2 karty místo 8, krátký blok o katalogu, tlačítko na mobilu) | `src/data/prednasky.html` |
| `doplnky.py` | pozdější ruční doplňky (odkaz na /pro-poradatele) | `src/data/prednasky.html` |
| `mega/gen_mega.py` | stránka /megatrendy: hero, mapa, čísla, metoda | `src/data/megatrendy.html`, `megatrendy-uvod.html` |
| `mega/gen_mapa.py`, `mega/mapa.json` | kruhová mapa 76 sil a 276 vazeb; veřejné názvy sil jsou přímo ve skriptu | mapa na /megatrendy |
| `mega/vety_verejne.json`, `vety_zdroje.json` | jednověté popisy sil a jejich zdroje v detailu mapy | mapa na /megatrendy |
| `mega/gen_poradatele.py` | bio ve třech délkách, úvod pro moderátora, technika | `src/data/pro-poradatele.html` |
| `video/scenar.json`, `gen_film_data.py` | čísla z filmu a jejich zdroje pod přehrávačem | `src/data/film-cisla.json` |
| `video/render.py`, `prekryvy.js` | výroba samotného filmu (jen pro dokumentaci, `vyrob.sh` ho nespouští) | `public/video/` |
| `astro/src/scripts_pr_animace.js`, `mega/mapa.js` | skripty animace a mapy, vkládají se do stránky | /megatrendy |
| `mega/pr_extra.css` | doplňkové styly; jsou už ručně sloučené do `src/styles/pr.css` | jen pro dokumentaci |

Ručně (mimo generátor) se upravují: obálky stránek `src/pages/prednasky.astro`, `megatrendy.astro`,
`pro-poradatele.astro`, styly `src/styles/pr.css`, menu a patička v `src/components/`.

## Na co pozor

- **Čísla jsou z katalogu Megatrendy a nejistoty, stav 21. 11. 2026** (karta 41,9 °C: říjnová data ČSÚ, tvrzení expiruje 31. 1. 2027).
  Katalog je v `~/pracovni/megatrends`. Když se tam změní číslo, které je na webu, je potřeba ho přepsat i tady.
- **`mega/mapa.json` je výtah z `megatrends/02_katalog/db/katalog.json` k 21. 11. 2026** (jen aktivní faktory).
  Skript, který výtah dělal, se nedochoval; při změně katalogu (nový faktor, nová vazba) je potřeba ho napsat znovu.
- Pravidla textů: bez dlouhých pomlček, nezlomitelné mezery dělá `final_nbsp.py`, zdroj na webu nejmenuje banku
  jako autora katalogu, interní názvy sil zůstávají jen v katalogu.
- Skripty běží v dočasné kopii této složky, takže `obsah/` zůstává čistá.

Složeno 22. 11. 2026 z dílčích archivů `megatrends/04_vystupy/web_navrh_final/v14/generatory_*.tgz`
(původně běžely v cloudovém prostoru konverzace). Ověřeno: `vyrob.sh` vyrobí přesně stejné soubory, jaké byly
nasazené v commitu 7db4ba5.
