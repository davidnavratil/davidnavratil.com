# Výtah dat pro mapu sil (mapa.json) z katalogu Megatrendy a nejistoty.
# Bere jen aktivní faktory a jen pole, která mapa na webu potřebuje. Veřejné přepisy názvů
# a vět dělá až gen_mapa.py, katalog zůstává beze změny.
# Použití: python3 vytah_mapa.py [cesta/ke/katalog.json] [mapa.json]
#   výchozí katalog: ../../../megatrends/02_katalog/db/katalog.json (vedle repozitáře webu)
# Po výtahu: git diff obsah/mega/mapa.json ukáže, co se v katalogu změnilo; pak bash obsah/vyrob.sh.
import json, os, sys

TU = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(TU, '..', '..', '..', 'megatrends', '02_katalog', 'db', 'katalog.json')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(TU, 'mapa.json')

k = json.load(open(SRC, encoding='utf8'))
aktivni = [f for f in k['faktory'] if f.get('stav') == 'aktivni']
faktory = [{
    'id': f['id'], 'nazev': f['nazev'], 'typ': f['typ'], 'oblast': f['oblast'],
    'svazky': f.get('svazky', []), 'jedna_veta': f.get('jedna_veta', ''),
    'vazby': [{'id': v['id'], 'typ': v['typ']} for v in f.get('vazby', [])],
} for f in aktivni]
svazky = [{'kod': s['kod'], 'nazev': s['nazev'], 'otazka': s.get('zastresujici_otazka', ''), 'clenove': s['clenove']}
          for s in k['svazky']]
out = {'verze': k.get('verze', ''), 'pocty': {'faktory_aktivni': len(faktory)}, 'svazky': svazky, 'faktory': faktory}
open(OUT, 'w', encoding='utf8').write(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
print('mapa.json: %d aktivních sil, %d svazků, katalog verze %s' % (len(faktory), len(svazky), out['verze']))
