# Vygeneruje stránku /pro-poradatele: bio ve třech délkách, úvod pro moderátora, fotky ke stažení, video,
# témata a formáty, technika, kontakt. Fakta jen z toho, co už je na webu (stránka /prednasky, úvodní stránka).
import re
import os; S = os.environ['GEN'].rstrip('/') + '/'  # kořen generátoru, nastavuje vyrob.sh
pr = open(S + 'astro/src/data/prednasky.html', encoding='utf8').read()


def nbsp(t):
    t = re.sub(r'(^|[\s(„])([ksvzouaiKSVZOUAI]) ', '\\1\\2\u00a0', t)
    t = re.sub(r'(\d) (?=[%\w])', '\\1\u00a0', t)
    return t.replace(' až ', ' až\u00a0')


vbig = pr[pr.index('<a class="vbig"'):pr.index('</a>', pr.index('<a class="vbig"')) + 4]
t = pr[pr.index('id="temata"'):pr.index('id="formaty"')]
temata = re.findall(r'<h3[^>]*>(.*?)</h3>', t)
assert len(temata) == 7

BIO = [
    ('Krátké', 'do programu, na pozvánku',
     'David Navrátil je hlavní ekonom České spořitelny. Sestavuje katalog Megatrendy a nejistoty, který sleduje 76 sil s výhledem do roku 2031, píše newsletter Peníze, procenta a prosperita a ročně má přes 50 přednášek.'),
    ('Střední', 'na web akce, do tiskové zprávy',
     'David Navrátil je hlavní ekonom České spořitelny (Erste Group). Začínal v České národní bance, od roku 2008 vede tým Ekonomické a strategické analýzy. Sestavuje katalog Megatrendy a nejistoty, který sleduje 76 sil s výhledem do roku 2031. Má přes 50 přednášek ročně, pravidelně komentuje ekonomiku v ČT, CNN Prima News a Hospodářských novinách a píše newsletter Peníze, procenta a prosperita.'),
    ('Dlouhé', 'do sborníku, pro moderátora',
     'David Navrátil je hlavní ekonom České spořitelny (Erste Group). Začínal v České národní bance a od roku 2008 vede tým Ekonomické a strategické analýzy. Zabývá se tím, jak ekonomiku mění technologie, geopolitika, demografie a instituce. Sestavuje katalog Megatrendy a nejistoty: 40 trendů, u kterých je směr jasný, a 36 nejistot, u nichž předem určuje ukazatele a prahy, které ukážou, kam se věci hýbou. Na konferencích a ve strategických debatách s vedením firem ukazuje několik možných budoucností a kroky, které se vyplatí ve většině z nich. Má přes 50 přednášek ročně, víc než 15 let komentuje ekonomiku v médiích, píše newsletter Peníze, procenta a prosperita a staví interaktivní analýzy na davidnavratil.com.'),
]
UVOD = 'Možná ho znáte z ČT nebo z CNN Prima News jako hlavního ekonoma České spořitelny. Říká se, že ekonomové předpověděli devět z posledních pěti recesí. Náš host proto dnes žádnou předpověď nepřinese. Ukáže několik budoucností, které do roku 2031 připadají v úvahu, a podle čeho poznáme, která se blíží. Přivítejte Davida Navrátila.'
FOTO = [
    ('david-navratil-portret.jpg', 'Portrét', 960, 540, ''),
    ('david-navratil-praha.jpg', 'Portrét s Prahou', 1600, 1120, ' class="tall"'),
    ('david-navratil-podium-regiony.jpg', 'Na pódiu: regiony', 1086, 724, ''),
    ('david-navratil-podium-gesto.jpg', 'Na pódiu: výklad', 1086, 724, ''),
    ('david-navratil-podium-sal.jpg', 'Zaplněný sál', 1086, 724, ''),
    ('david-navratil-podium-scena.jpg', 'Velká scéna', 1000, 667, ''),
]
words = lambda s: len(s.split())

bio_html = '\n'.join(
    f'<article class="bio"><h3>{n}</h3><p class="meta">{nbsp(k)} · {words(b)} slov</p><p id="bio-{i}">{nbsp(b)}</p><button type="button" class="copy" data-copy="bio-{i}">Zkopírovat</button></article>'
    for i, (n, k, b) in enumerate(BIO))
foto_html = '\n'.join(
    f'<figure{c}><img src="/images/pro-poradatele/{f}" width="{w}" height="{h}" loading="lazy" alt="David Navrátil: {nbsp(a.lower())}"><figcaption><span>{nbsp(a)} · {w}×{h}&nbsp;px</span><a href="/images/pro-poradatele/{f}" download>Stáhnout</a></figcaption></figure>'
    for f, a, w, h, c in FOTO)
temata_html = '\n'.join(f'<li>{x}</li>' for x in temata)

markup = f'''<div class="pr">
    <section class="hero org-hero" aria-labelledby="org-title">
      <div class="wrap">
        <p class="eyebrow">Pro pořadatele a&nbsp;novináře</p>
        <h1 id="org-title">Všechno k&nbsp;přípravě <em>vystoupení</em></h1>
        <p class="hero-copy">Bio, úvod pro moderátora, fotky, video a&nbsp;témata na jednom místě. Techniku doladíme e-mailem. Kdyby něco chybělo, stačí napsat na <a href="mailto:davidxnavratil@gmail.com">davidxnavratil@gmail.com</a>.</p>
        <nav class="org-nav" aria-label="Obsah stránky"><a href="#bio">Bio</a><a href="#uvod">Úvod pro moderátora</a><a href="#fotky">Fotky</a><a href="#video">Video</a><a href="#temata">Témata a&nbsp;formáty</a><a href="#technika">Technika</a><a href="#novinari">Pro novináře</a><a href="#kontakt">Kontakt</a></nav>
      </div>
    </section>

    <section class="org-sec" id="bio" aria-labelledby="bio-title">
      <div class="wrap">
        <p class="eyebrow">Bio</p>
        <h2 id="bio-title">Ve třech délkách, <em>stačí zkopírovat</em></h2>
        <div class="bio-grid">
{bio_html}
        </div>
      </div>
    </section>

    <section class="org-sec" id="uvod" aria-labelledby="uvod-title">
      <div class="wrap">
        <p class="eyebrow">Úvod pro moderátora</p>
        <h2 id="uvod-title">Dvacet vteřin <em>před prvním slovem</em></h2>
        <div class="intro-box"><p id="uvod-text">{nbsp(UVOD)}</p><button type="button" class="copy" data-copy="uvod-text">Zkopírovat</button></div>
      </div>
    </section>

    <section class="org-sec" id="fotky" aria-labelledby="fotky-title">
      <div class="wrap">
        <p class="eyebrow">Fotky</p>
        <h2 id="fotky-title">Ke stažení <em>k akci i k článku</em></h2>
        <p class="lead">Fotky můžete použít k&nbsp;propagaci akce, na které David vystoupí, a&nbsp;k&nbsp;článku, ve kterém je citován. Pro tisk ve větším formátu napište o&nbsp;originál.</p>
        <div class="photo-grid">
{foto_html}
        </div>
      </div>
    </section>

    <section class="org-sec" id="video" aria-labelledby="video-title">
      <div class="wrap">
        <p class="eyebrow">Video</p>
        <h2 id="video-title">Jak to vypadá <em>naživo</em></h2>
        {vbig}
      </div>
    </section>

    <section class="org-sec" id="temata" aria-labelledby="temata-title">
      <div class="wrap">
        <p class="eyebrow">Témata a&nbsp;formáty</p>
        <h2 id="temata-title">O&nbsp;čem a&nbsp;<em>jak dlouho</em></h2>
        <ol class="org-topics">
{temata_html}
        </ol>
        <div class="facts">
          <div><h3>Přednáška</h3><p>Konference a&nbsp;firemní akce, 40&nbsp;až 60&nbsp;minut včetně prostoru pro otázky.</p></div>
          <div><h3>Strategická debata</h3><p>S&nbsp;vedením firmy u&nbsp;jednoho stolu, 2&nbsp;až 3&nbsp;hodiny.</p></div>
          <div><h3>Publikum</h3><p>Od jednoho stolu v&nbsp;zasedačce po zaplněný sál; formát se přizpůsobí počtu židlí.</p></div>
        </div>
        <p class="org-cta"><a class="text-link" href="/prednasky/#temata">Témata podrobně <span aria-hidden="true">→</span></a></p>
      </div>
    </section>

    <section class="org-sec" id="technika" aria-labelledby="technika-title">
      <div class="wrap">
        <p class="eyebrow">Technika</p>
        <h2 id="technika-title">Co je potřeba <em>na místě</em></h2>
        <div class="facts">
          <div><h3>Obraz</h3><p>Plátno nebo obrazovka ve formátu 16:9. Snímky stojí na velkých grafech a&nbsp;číslech, aby byly čitelné i&nbsp;ze zadních řad.</p></div>
          <div><h3>Jazyk</h3><p>Česky nebo anglicky, přednáška i&nbsp;debata s&nbsp;vedením.</p></div>
          <div><h3>Zvuk a&nbsp;ovládání</h3><p>Mikrofon, ovladač a&nbsp;připojení domluvíme s&nbsp;vaším technikem pár dní předem.</p></div>
        </div>
      </div>
    </section>

    <section class="org-sec" id="novinari" aria-labelledby="novinari-title">
      <div class="wrap">
        <p class="eyebrow">Pro novináře</p>
        <h2 id="novinari-title">Dotaz z&nbsp;redakce? <em>Napište téma a&nbsp;uzávěrku</em></h2>
        <p class="lead">K&nbsp;tématům katalogu Megatrendy a&nbsp;nejistoty a&nbsp;k&nbsp;analýzám na tomto webu pište přímo na <a href="mailto:davidxnavratil@gmail.com">davidxnavratil@gmail.com</a>. David komentuje českou a&nbsp;evropskou ekonomiku, stárnutí, regiony, dopady AI na práci a&nbsp;firmy a&nbsp;úzká hrdla světového obchodu.</p>
      </div>
    </section>

    <section class="org-sec" id="kontakt" aria-labelledby="kontakt-title">
      <div class="wrap">
        <p class="eyebrow">Kontakt</p>
        <h2 id="kontakt-title">Termín, téma, <em>podrobnosti</em></h2>
        <p class="lead">Nejrychlejší je krátká poptávka: pro koho akce bude a&nbsp;s&nbsp;čím mají lidé odejít. Odpověď přijde e-mailem.</p>
        <div class="org-cta"><a class="button" href="/prednasky/#poptavka">Poslat poptávku <span aria-hidden="true">→</span></a><span>nebo e-mail <a href="mailto:davidxnavratil@gmail.com">davidxnavratil@gmail.com</a></span></div>
      </div>
    </section>
</div>
'''
assert '—' not in markup and '–' not in markup
open(S + 'astro/src/data/pro-poradatele.html', 'w', encoding='utf8').write(markup)

title = 'Pro pořadatele: bio, fotky a podklady | David Navrátil'
desc = 'Podklady pro pořadatele akcí s Davidem Navrátilem: bio ve třech délkách, úvod pro moderátora, fotky ke stažení, video, témata, formáty a technické potřeby.'
astro = f'''---
// Stránka pro pořadatele a média. Obsah je v src/data/pro-poradatele.html (generuje gen_poradatele.py).
// Fotky v public/images/pro-poradatele/ jsou bez metadat EXIF (poloha, zařízení).
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/500.css';
import '../styles/pr.css';
import Base from '../layouts/Base.astro';
import NewsletterCTA from '../components/NewsletterCTA.astro';
import obsah from '../data/pro-poradatele.html?raw';
---

<Base title="{title}" description="{desc}" image="/images/pro-poradatele/david-navratil-podium-regiony.jpg">
  <Fragment set:html={{obsah}} />
  <div class="pr-after"><NewsletterCTA /></div>
</Base>

<script is:inline>
  // Tlačítka „Zkopírovat“: text do schránky, při neúspěchu aspoň označit text k ručnímu zkopírování
  document.querySelectorAll('.pr [data-copy]').forEach(b => b.addEventListener('click', async () => {{
    const el = document.getElementById(b.dataset.copy), txt = el.textContent.replace(/\\u00a0/g, ' ').trim(), puv = b.textContent;
    try {{ await navigator.clipboard.writeText(txt); b.textContent = 'Zkopírováno'; }}
    catch (e) {{ const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Označeno, zkopírujte Ctrl+C'; }}
    setTimeout(() => {{ b.textContent = puv; }}, 2200);
  }}));
</script>
'''
open(S + 'astro/src/pages/pro-poradatele.astro', 'w', encoding='utf8').write(astro)
print(len(markup), [words(b) for _, _, b in BIO], words(UVOD))
