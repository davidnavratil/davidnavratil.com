import re,sys
p=sys.argv[1]; h=open(p,encoding='utf8').read()
# nezlomitelné mezery jen v textu mimo style/script
a=h.index('</style>'); b=h.index('<script>',a)
body=h[a:b]
def fix(t):
    t=re.sub(r'(?<![^\s(„])([kvszaiouKVSZAIOU]) ',r'\1&nbsp;',t)
    t=re.sub(r'(\d) (%|°C|mld\.|Kč|let\b|tisíce|milionů|milionu|bodu)',r'\1&nbsp;\2',t)
    t=re.sub(r'(\d) (\d{3})\b',r'\1&nbsp;\2',t)
    t=re.sub(r'(\d{1,2}\.) (\d{1,2}\.) (\d{4})',r'\1&nbsp;\2&nbsp;\3',t)
    t=re.sub(r'(\d) ([a-záčďéěíňóřšťúůýž])',r'\1&nbsp;\2',t)
    t=re.sub(r'(\d\.) ([a-záčďéěíňóřšťúůýž])',r'\1&nbsp;\2',t)
    t=re.sub(r'(?<![\wÁ-ž])([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]\.) (?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])',r'\1&nbsp;',t)
    return t
parts=re.split(r'(<[^>]+>)',body)
parts=[p if p.startswith('<') else fix(p) for p in parts]
h=h[:a]+''.join(parts)+h[b:]
open(p,'w',encoding='utf8').write(h); print('ok',len(h))
