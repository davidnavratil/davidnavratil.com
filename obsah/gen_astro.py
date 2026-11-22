# Vygeneruje Astro stránku /prednasky z hotového návrhu (final/src14.html):
# CSS se omezí na obal .pr, barvy se napojí na tokeny webu (světlý i tmavý režim),
# obsah jde do samostatného HTML souboru, skript zůstane inline.
import re, os
import os; S = os.environ['GEN'].rstrip('/') + '/'  # kořen generátoru, nastavuje vyrob.sh
h=open(S+'final/index.html',encoding='utf8').read()   # verze s nezlomitelnými mezerami
css=h[h.index('<style>')+7:h.index('</style>')]
body=h[h.index('<main id="obsah">')+len('<main id="obsah">'):h.index('</main>')]
dialog=h[h.index('<dialog'):h.index('</dialog>')+9]
script=h[h.index('<script>')+8:h.rindex('</script>')]

KF={'pole':'pr-pole','colA':'pr-colA','colB':'pr-colB','fB':'pr-fB','fC':'pr-fC','draw':'pr-draw'}
def ren_kf(s):
    def anim(m):
        v=m.group(0)
        for a,b in KF.items(): v=re.sub(r'(?<![-\w.])'+a+r'(?![-\w])',b,v)
        return v
    s=re.sub(r'animation:[^;}]*',anim,s)
    for a,b in KF.items(): s=re.sub(r'@keyframes\s+'+a+r'(?![-\w])','@keyframes '+b,s)
    return s
css=ren_kf(css)

def prefix_sel(sel):
    out=[]
    for s in sel.split(','):
        s=s.strip()
        if not s: continue
        if s in (':root','body','html'): out.append('.pr'); continue
        if s.startswith('html'): out.append('.pr'+s[4:]); continue
        if s.startswith('*'): out.append('.pr '+s); continue
        if s.startswith('dialog'): out.append('.pr '+s); continue
        out.append('.pr '+s)
    return ','.join(out)

def process(block):
    res=[]; i=0; n=len(block)
    while i<n:
        j=block.find('{',i)
        if j<0: break
        head=block[i:j].strip()
        # najít párovou závorku
        d=0; k=j
        while k<n:
            if block[k]=='{': d+=1
            elif block[k]=='}':
                d-=1
                if d==0: break
            k+=1
        inner=block[j+1:k]
        if head.startswith('@media'):
            res.append(head+'{'+process(inner)+'}')
        elif head.startswith('@keyframes'):
            res.append(head+'{'+inner+'}')
        else:
            res.append(prefix_sel(head)+'{'+inner+'}')
        i=k+1
    return '\n'.join(res)
pcss=process(css)
# napojení na tokeny webu
pcss=pcss.replace('.pr{--paper:#f5f1e8;--ink:#163a5f;--teal:#1b7d8a;--muted:#556675;--line:#cfd2cb;','.pr{--paper:#f5f1e8;--ink:var(--color-navy);--teal:var(--color-accent);--muted:var(--color-text-secondary);--line:var(--color-border);',1)
assert '--ink:var(--color-navy)' in pcss, 'tokeny'
pcss=re.sub(r'--white:#fffdf8',r'--white:var(--color-surface)',pcss,count=1)
pcss=pcss.replace('color:var(--white)','color:#fffdf8')
pcss=re.sub(r'\.pr\{margin:0;background:var\(--paper\);color:var\(--ink\);','.pr{color:var(--ink);',pcss)
pcss=pcss.replace('dialog{width:min(1240px,94vw);max-height:90vh;padding:15px;border:1px solid var(--line);background:var(--paper);color:var(--ink)}','dialog{width:min(1240px,94vw);max-height:90vh;padding:15px;border:1px solid var(--line);background:var(--color-bg);color:var(--color-text)}')
pcss=pcss.replace('border:1px solid var(--line);background:var(--paper);color:var(--ink);font-size:20px','border:1px solid var(--line);background:var(--color-bg);color:var(--color-text);font-size:20px')
pcss=pcss.replace('.pr .card p.txt{font-size:15px;line-height:1.5;color:#26405a;','.pr .card p.txt{font-size:15px;line-height:1.5;color:var(--color-text);')
pcss=pcss.replace('.pr .eyebrow{font-size:11px;font-weight:650;text-transform:uppercase;letter-spacing:.16em;line-height:1.6;color:#156872}','.pr .eyebrow{font-size:11px;font-weight:650;text-transform:uppercase;letter-spacing:.16em;line-height:1.6;color:var(--color-accent-hover)}')
# text na tlačítkách v barvě --ink: v tmavém motivu je --color-navy světle modrá, bílé písmo by mělo kontrast jen 3,6:1
pcss=pcss.replace('--ink:var(--color-navy);','--ink:var(--color-navy);--on-ink:#fffdf8;',1)
for old in ('.pr .button{min-height:50px;display:inline-flex;align-items:center;gap:22px;padding:14px 22px;background:var(--ink);color:#fffdf8;',
            '.pr .tabs button[aria-selected=true]{background:var(--ink);border-color:var(--ink);color:#fffdf8}'):
    assert pcss.count(old)==1, old
    pcss=pcss.replace(old, old.replace('color:#fffdf8','color:var(--on-ink)'))
pcss+='\n[data-theme="dark"] .pr{--on-ink:#14130f;--orange:#e0714f}'  # oranžová čísla: na tmavé kartě #ad4b30 jen 2,7:1, #e0714f 4,7:1
# šířka obsahu stejná jako hlavička a zbytek webu (.container: --max-width a --space-md/--space-sm)
for old,new in (('.pr .wrap{width:min(1240px,calc(100% - 96px));margin:auto}','.pr .wrap{max-width:var(--max-width,1080px);margin-inline:auto;padding-inline:var(--space-md,1.5rem)}'),
                ('.pr .wrap{width:calc(100% - 64px)}','.pr .wrap{padding-inline:var(--space-md,1.5rem)}'),
                ('.pr .wrap{width:calc(100% - 40px)}','.pr .wrap{padding-inline:var(--space-sm,1rem)}')):
    assert pcss.count(old)==1, old
    pcss=pcss.replace(old,new)
# užší sloupec obsahu (šířka webu): úvodní nadpis menší a textový sloupec o něco širší, aby „Nevíme, co přijde.“ zůstalo na jednom řádku
pcss+='\n@media(min-width:781px){.pr .hero-grid{grid-template-columns:1.1fr .95fr}.pr .hero h1{font-size:clamp(46px,4.6vw,64px)}}'
# global.css webu barví h1 až h4 na --color-text; v tmavých pásech (metoda, poptávka, panel s grafem, video) musí nadpisy dědit světlou barvu pásu
pcss+='\n.pr :is(.panel,.method,.contact,.vbig) :is(h1,h2,h3,h4){color:inherit}'
# tlačítko v pruhu pod čísly dědilo patkové písmo z .wow-cta; všechna tlačítka stejně
pcss+='\n.pr .button{font-family:var(--sans)}'
# hlavička webu je fixní: odsadit úvod
pcss+='\n.pr .hero{padding-top:calc(var(--header-h,72px) + 40px)}\n@media(max-width:780px){.pr .hero{padding-top:calc(var(--header-h,64px) + 24px)}}'
# obrázky a odkazy
body=body.replace('src="img/','src="/images/prednasky/').replace('https://davidnavratil.com/','/')
dialog=dialog.replace('src="img/','src="/images/prednasky/')
markup='<div class="pr">\n'+body+'\n'+dialog+'\n</div>\n'
for a,b in KF.items(): script=script.replace("'"+a+"'","'"+b+"'")
os.makedirs(S+'astro/src/data',exist_ok=True); os.makedirs(S+'astro/src/pages',exist_ok=True)
open(S+'astro/src/data/prednasky.html','w',encoding='utf8').write(markup)
title='David Navrátil: scénáře budoucnosti pro konference a vedení firem'
desc='Přednášky a strategické debaty Davida Navrátila o megatrendech, scénářích a odolnosti firem do roku 2031. Více možných budoucností a čísla, podle kterých poznáte, která přichází.'
astro=f'''---
// Prodejní stránka přednášek a strategických debat (scénářové plánování).
// Obsah je v src/data/prednasky.html, aby se text dal upravovat bez zásahu do kódu.
// Čísla na stránce pocházejí z ověřeného katalogu „Megatrendy a nejistoty“ (stav 21. 11. 2026).
// Formulář posílá na /api/poptavka (služba poptavky na serveru, viz server/poptavky/).
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/500.css';
import Base from '../layouts/Base.astro';
import obsah from '../data/prednasky.html?raw';
---

<Base title="{title}" description="{desc}" image="/images/og/prednasky.jpg">
  <Fragment set:html={{obsah}} />
</Base>

<style is:global>
{pcss}
</style>

<script is:inline>
{script}
</script>
'''
open(S+'astro/src/pages/prednasky.astro','w',encoding='utf8').write(astro)
print(len(markup),len(pcss),len(script))
