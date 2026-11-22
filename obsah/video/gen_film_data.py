# Z scenar.json vyrobí data pro seznam „Čísla z filmu a jejich zdroje“ pod přehrávačem (src/data/film-cisla.json).
import json, re, sys, os
V = os.path.dirname(os.path.abspath(__file__)) + '/'
D = json.load(open(V + 'scenar.json', encoding='utf8'))
NB = ' '
def nb(s):
    s = re.sub(r'(?<![\w])([kKsSvVzZoOuUaAiI]) ', r'\1' + NB, s)
    s = re.sub(r'(\d) (%|mld\.|mil\.|tisíc|let|Kč|°C|USD|m³|p\. b\.|nm|roku)', r'\1' + NB + r'\2', s)
    s = re.sub(r'(\d{1,2}\.) (\d{1,2}\.) (\d{4})', r'\1' + NB + r'\2' + NB + r'\3', s)
    s = re.sub(r'(\d) (\d{3})(?!\d)', r'\1' + NB + r'\2', s)
    return s
out = []
for s in D['sceny']:
    if not s.get('cislo'): continue
    out.append({'cislo': nb(s['cislo']), 'titulek': nb(s['text']), 'popis': nb(s['popis']), 'zdroj': nb(s['zdroj_plny']), 'kratka': bool(s.get('kratka'))})
json.dump(out, open(sys.argv[1], 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(out), 'čísel,', sum(o['kratka'] for o in out), 've krátké verzi')
