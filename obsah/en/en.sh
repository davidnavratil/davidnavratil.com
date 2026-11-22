#!/bin/bash
# Anglická verze stránek /en/prednasky, /en/megatrendy a /en/pro-poradatele.
# Překládá hotové české fragmenty v src/data/ podle slovníků sl_*.json v této složce,
# výsledek zapisuje do src/data/en/ a obálky do src/pages/en/ (gen_stranky.py).
# Když v češtině přibude nebo se změní text, preloz.py vypíše úseky bez překladu a skončí chybou;
# anglické soubory pak zůstanou v předchozí podobě. Doplňte překlad do sl_<stránka>.json a spusťte znovu.
# Použití: bash obsah/en/en.sh   (volá ho i obsah/vyrob.sh)
set -euo pipefail
E="$(cd "$(dirname "$0")" && pwd)"; REPO="$(dirname "$(dirname "$E")")"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
for f in prednasky pro-poradatele megatrendy-uvod megatrendy; do
  python3 "$E/preloz.py" preloz "$REPO/src/data/$f.html" "$E/sl_$f.json" "$T/$f.html"
done
python3 "$E/en_post.py" "$T" >/dev/null
python3 "$E/gen_stranky.py" "$REPO" >/dev/null
mkdir -p "$REPO/src/data/en"
for f in prednasky pro-poradatele megatrendy-uvod megatrendy; do cp "$T/$f.html" "$REPO/src/data/en/$f.html"; done
echo "Anglická verze: hotovo."
