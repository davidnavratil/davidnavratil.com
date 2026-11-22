# Vygeneruje stránku /megatrendy (vlajková loď webu) z hotových dílů:
#  - mapa vazeb z katalogu (gen_mapa.py -> mapa_frag.json),
#  - sekce „Čísla“ a „Metoda“ (animace, tři pravidla, ukázka rozcestí) z vygenerované /prednasky,
#  - komponenty webu AnalysesSection a NewsletterCTA.
import json, re
import os; S = os.environ['GEN'].rstrip('/') + '/'  # kořen generátoru, nastavuje vyrob.sh
pr = open(S + 'astro/src/data/prednasky.html', encoding='utf8').read()
M = json.load(open(S + 'mega/mapa_frag.json', encoding='utf8'))
anim = open(S + 'astro/src/scripts_pr_animace.js', encoding='utf8').read()
mapjs = open(S + 'mega/mapa.js', encoding='utf8').read()


def sekce(sid):
    i = pr.index(f'<section class="section' + ('' if sid == 'cisla' else ' method') + f'" id="{sid}"')
    return pr[i:pr.index('</section>', i) + len('</section>')]


def nahrad(s, a, b):
    assert s.count(a) == 1, a[:70]
    return s.replace(a, b)


N = ' '
P = M['pocty']

cisla = sekce('cisla')
cisla = nahrad(cisla, '<a class="button" href="#poptavka">', '<a class="button" href="/prednasky/#poptavka">')
cisla = cisla.replace('čím David chodí na pódium', 'čím chodím na pódium')
assert 'čím chodím na pódium' in cisla
assert '#poptavka' not in cisla.replace('/prednasky/#poptavka', '')

metoda = sekce('metoda')
metoda = nahrad(metoda, '<p class="eyebrow">Co stojí za každým vystoupením</p>', '<p class="eyebrow">Jak katalog funguje</p>')
metoda = nahrad(metoda, f'<h2 id="metoda-title">Mapa 76&nbsp;sil <em>s&nbsp;výhledem do roku 2031</em></h2>',
                f'<h2 id="metoda-title">Podle čeho poznáme, <em>která budoucnost přichází</em></h2>')
metoda = nahrad(metoda, '<p>O&nbsp;stárnutí, AI, klimatu i&nbsp;geopolitice se píšou samostatné knihy a&nbsp;pořádají samostatné konference. Katalog Megatrendy a&nbsp;nejistoty je dává na jednu mapu, protože firma je potkává všechny najednou.</p>',
                '<p>Každá ze 76&nbsp;sil má v&nbsp;katalogu vlastní kartu s&nbsp;ověřenými čísly, hypotézami a&nbsp;ukazateli. Karty vznikají podle tří pravidel.</p>')

hero = f'''<section class="hero mega-hero" aria-labelledby="mega-title">
      <div class="wrap">
        <div class="mega-top">
          <div>
        <p class="eyebrow">Katalog · horizont 2031 · stav 21.&nbsp;11.&nbsp;2026</p>
        <h1 id="mega-title">Megatrendy <em>a&nbsp;nejistoty</em></h1>
        <div class="mega-lead one">
          <p>Katalog sleduje, co se do roku 2031 stane s&nbsp;penězi, prací, technologiemi a&nbsp;státem, a&nbsp;předem říká, podle čeho poznáme, že se mýlí. Každé číslo má zdroj, každá teze podmínku, za které neplatí.</p>
          <p>O&nbsp;stárnutí, AI, klimatu i&nbsp;geopolitice se píšou samostatné knihy a&nbsp;pořádají samostatné konference. Katalog je dává na jednu mapu, protože firma je potkává všechny najednou.</p>
        </div>
          </div>
          <a class="mega-map" href="#mapa" aria-label="Celá mapa 76 sil a 276 vazeb">{M['svg_hero']}</a>
        </div>
        <dl class="mega-stats">
          <div><dt>{P['sily']}</dt><dd>sil s&nbsp;výhledem do roku 2031</dd></div>
          <div><dt>{P['trendy']}</dt><dd>trendů: směr známe</dd></div>
          <div><dt>{P['nejistoty']}</dt><dd>nejistot: rozhodnou data</dd></div>
          <div><dt>1&nbsp;902</dt><dd>tvrzení se zdrojem a&nbsp;stupněm spolehlivosti</dd></div>
        </dl>
        <div class="hero-actions"><a class="button" href="#mapa">Prohlédnout mapu <span aria-hidden="true">↓</span></a><a class="text-link" href="/prednasky/">Přednášky a&nbsp;debaty nad katalogem <span aria-hidden="true">→</span></a></div>
        <div class="hero-person"><img src="/images/prednasky/foto-gesto.jpg" width="46" height="46" alt=""><div><strong>David Navrátil</strong><span>Hlavní ekonom České spořitelny · katalog sestavuje a&nbsp;pravidelně aktualizuje</span></div></div>
      </div>
    </section>'''

mapa = f'''<section class="section method mapa" id="mapa" aria-labelledby="mapa-title">
      <div class="wrap">
        <div class="section-top"><div><p class="eyebrow">Celá mapa · {P['sily']}&nbsp;sil · {P['vazby']}&nbsp;vazeb</p><h2 id="mapa-title">Nic nestojí <em>samo.</em></h2></div><p>Barva ukazuje tematický svazek, tvar druh síly: plné kolečko je trend, kosočtverec nejistota. Čáry jsou vazby z&nbsp;karet katalogu. Plná čára znamená, že jedna síla druhou posiluje nebo podmiňuje, přerušovaná, že ji oslabuje. Jak silný ten vliv je, čáry neříkají.</p></div>
        <div class="mapa-grid">
          <div class="mapa-box" id="mapa-box">
{M['svg']}
          </div>
          <div class="mapa-side">
            <p class="mapa-keys"><span><i class="kt"></i>trend</span><span><i class="kn"></i>nejistota</span><span><i class="ks"></i>posiluje, podmiňuje</span><span><i class="ko"></i>oslabuje</span></p>
            {M['legenda']}
            <div class="mapa-info" id="mapa-info" aria-live="polite"><p class="mapa-hint">Najeďte myší na bod nebo na svazek a&nbsp;uvidíte, s&nbsp;čím souvisí. Kliknutím na bod otevřete jeho detail. Na telefonu klepněte na svazek a&nbsp;pak na sílu v&nbsp;seznamu. Katalog vznikal s&nbsp;důrazem na peníze a&nbsp;rozhodování firem, proto je financím věnována velká část mapy.</p></div>
          </div>
        </div>
        <details class="mapa-vse"><summary>Všech {P['sily']}&nbsp;sil podle svazků</summary>
{M['seznam']}
        </details>
        <p class="source">Vazby mezi silami podle karet katalogu Megatrendy a&nbsp;nejistoty, stav 21.&nbsp;11.&nbsp;2026. Síla, která patří do víc svazků, je v&nbsp;mapě u&nbsp;prvního z&nbsp;nich. Velikost bodu odpovídá počtu vazeb.</p>
      </div>
      <script type="application/json" id="mapa-data">{M['data']}</script>
    </section>'''

markup_hero = '<div class="pr">\n    ' + hero + '\n</div>\n'
markup = '<div class="pr">\n    ' + '\n\n    '.join([mapa, cisla, metoda]) + '\n</div>\n'
open(S + 'astro/src/data/megatrendy-uvod.html', 'w', encoding='utf8').write(markup_hero)
assert '—' not in markup + markup_hero and '–' not in markup + markup_hero, 'pomlčka'
open(S + 'astro/src/data/megatrendy.html', 'w', encoding='utf8').write(markup)

title = 'Megatrendy a nejistoty: mapa 76 sil do roku 2031 | David Navrátil'
desc = 'Katalog 40 trendů a 36 nejistot s výhledem do roku 2031: co se děje s penězi, prací, technologiemi a státem a podle čeho poznáme, že se mýlíme. Každé číslo má zdroj.'
astro = f'''---
// Vlajková loď webu: katalog „Megatrendy a nejistoty“ (celá mapa vazeb, animace, wow čísla, ukázka rozcestí)
// a pod ním webové analýzy a newsletter. Obsah je v src/data/megatrendy.html (generuje ho gen_mega.py
// z katalogu a ze stránky /prednasky); mapa se vytváří z 02_katalog/db/katalog.json (gen_mapa.py).
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/500.css';
import '../styles/pr.css';
import Base from '../layouts/Base.astro';
import AnalysesSection from '../components/AnalysesSection.astro';
import NewsletterCTA from '../components/NewsletterCTA.astro';
import FilmSection from '../components/FilmSection.astro';
import uvod from '../data/megatrendy-uvod.html?raw';
import obsah from '../data/megatrendy.html?raw';
---

<Base title="{title}" description="{desc}" image="/images/megatrendy/megatrendy-og.jpg">
  <Fragment set:html={{uvod}} />
  <Fragment set:html={{obsah}} />
  <FilmSection verze="plna" />
  <div class="pr-after"><AnalysesSection /></div>
  <NewsletterCTA />
</Base>

<script is:inline>
{anim}
{mapjs}
</script>
'''
open(S + 'astro/src/pages/megatrendy.astro', 'w', encoding='utf8').write(astro)
print(len(markup), 'B obsah')
