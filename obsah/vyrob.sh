#!/bin/bash
# Vyrobí obsah stránek /prednasky, /megatrendy a /pro-poradatele z navrh.html a podkladů v této složce
# a zapíše ho do src/data/. Obálky stránek (src/pages/*.astro) a styly (src/styles/pr.css) se upravují ručně.
# Použití: bash obsah/vyrob.sh   (z kořene repozitáře nebo odkudkoli)
set -euo pipefail
O="$(cd "$(dirname "$0")" && pwd)"; REPO="$(dirname "$O")"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
cp -R "$O/." "$T/"; mkdir -p "$T/final" "$T/astro/src/data" "$T/astro/src/pages"
export GEN="$T"; cd "$T"
cp navrh.html final/index.html
python3 final_nbsp.py final/index.html >/dev/null
python3 gen_astro.py >/dev/null
(cd mega && python3 gen_mapa.py mapa.json mapa_frag.json >/dev/null)
python3 mega/gen_mega.py >/dev/null
python3 mega/gen_poradatele.py >/dev/null
python3 trim_prednasky.py >/dev/null
python3 doplnky.py >/dev/null
python3 video/gen_film_data.py astro/src/data/film-cisla.json
for f in prednasky.html megatrendy.html megatrendy-uvod.html pro-poradatele.html film-cisla.json; do
  cp "astro/src/data/$f" "$REPO/src/data/$f"
done
cd "$REPO"
V="src/data/prednasky.html src/data/megatrendy.html src/data/megatrendy-uvod.html src/data/pro-poradatele.html src/data/film-cisla.json"
if git diff --quiet -- $V; then echo "Hotovo: obsah se nezměnil."; else echo "Hotovo, změněné soubory:"; git diff --stat -- $V; fi
echo "Dál: npm run build, kontrola náhledu (npm run preview), commit; push do main web nasadí."
