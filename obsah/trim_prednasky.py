# Na /prednasky zůstávají tři karty čísel a odkaz na zbytek (celá sada je na /megatrendy). Spouštět až po gen_mega.py.
import re
import os; S = os.environ['GEN'].rstrip('/') + '/'  # kořen generátoru, nastavuje vyrob.sh
p=S+'astro/src/data/prednasky.html'; h=open(p,encoding='utf8').read()
n0=h.count('<article class="card">')
def keep(m):
    return m.group(0) if re.search(r'AI ve firmách|Regiony · obyvatelé', m.group(0)) else ''
h=re.sub(r'\s*<article class="card">.*?</article>', keep, h, flags=re.S)
a='<p class="wow-cta">'; assert h.count(a)==1
h=h.replace(a,'<p class="wow-cta wow-row"><a class="wow-more" href="/megatrendy/#cisla">Dalších šest čísel a&nbsp;celá mapa&nbsp;<span aria-hidden="true">→</span></a>')
assert h.count('<div class="wow-grid">')==1; h=h.replace('<div class="wow-grid">','<div class="wow-grid three">')
open(p,'w',encoding='utf8').write(h); print('karty',n0,'->',h.count('<article class="card">'))

# Blok o katalogu je na /prednasky jen krátký (tři pravidla a odkaz); animace a příklad rozcestí jsou na /megatrendy.
h=open(p,encoding='utf8').read()
a=h.index('<div class="method-layout">'); b=h.index('</section>',a)
m=re.search(r'<ol class="principles">.*?</ol>',h[a:b],re.S); assert m
kratky=('<div class="method-short">\n          '+m.group(0)+'\n        </div>\n        '
 '<p class="method-more"><a href="/megatrendy/">Celá mapa 76&nbsp;sil a&nbsp;příklad jednoho rozcestí <span aria-hidden="true">→</span></a></p>\n      </div>\n    ')
h=h[:a]+kratky+h[b:]
assert 'pole-panel' not in h and 'fork-ex' not in h
# Na mobilu zůstává po opuštění úvodu dole tlačítko k poptávce (schová se u formuláře).
a='<section class="section contact" id="poptavka"'; assert h.count(a)==1
h=h.replace(a,'<a class="cta-dock" href="#poptavka" id="cta-dock" hidden>Domluvit vystoupení <span aria-hidden="true">→</span></a>\n    '+a)
open(p,'w',encoding='utf8').write(h); print('prednasky: kratky blok katalogu, cta-dock')
h=open(p,encoding='utf8').read()
h+='''
<script>
(function(){var d=document.getElementById('cta-dock'),hero=document.querySelector('.pr .hero'),f=document.getElementById('poptavka');
if(!d||!hero||!f||!('IntersectionObserver' in window))return;var pastHero=false,atForm=false,vis=new Set();
function s(){d.hidden=!(pastHero&&!atForm&&vis.size===0);}
new IntersectionObserver(function(e){pastHero=!e[0].isIntersecting;s();}).observe(hero);
new IntersectionObserver(function(e){atForm=e[0].isIntersecting||e[0].boundingClientRect.top<0;s();},{rootMargin:'0px 0px -20% 0px'}).observe(f);
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)vis.add(e.target);else vis.delete(e.target);});s();});
document.querySelectorAll('.pr a[href="#poptavka"]:not(.cta-dock)').forEach(function(x){io.observe(x);});})();
</script>
'''
open(p,'w',encoding='utf8').write(h)

# Skript stránky: animace katalogu na /prednasky už není, tři řádky kolem ní se proto spouštějí jen tam, kde panel je.
pa=S+'astro/src/pages/prednasky.astro'; a=open(pa,encoding='utf8').read()
x="    const upd = () => { mb.hidden = mq.matches; }; mq.addEventListener('change', upd); upd();"; assert a.count(x)==1
a=a.replace(x,"    if (mb && panel) {\n"+x)
y="io2.observe(panel); } else panel.classList.remove('wait');"; assert a.count(y)==1
a=a.replace(y,y+"\n    }")
open(pa,'w',encoding='utf8').write(a); print('prednasky.astro: skript bez panelu')
