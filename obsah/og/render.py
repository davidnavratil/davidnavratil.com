import asyncio, base64, pathlib
from playwright.async_api import async_playwright

# Náhledové obrázky pro sdílení (1200 × 630): python3 obsah/og/render.py  (potřebuje: pip install playwright; playwright install chromium)
# Vstupy: fonty z node_modules/@fontsource, mapa src/data/mapa-hero.svg a fotky z public/images. Výstup: public/images/og/.
R = pathlib.Path(__file__).resolve().parents[2]
A = pathlib.Path('/tmp/og-vstupy'); A.mkdir(exist_ok=True)
import shutil
for src in list((R/'node_modules/@fontsource/fraunces/files').glob('fraunces-latin*-400-*.woff2'))+list((R/'node_modules/@fontsource/inter/files').glob('inter-latin*-[46]00-normal.woff2'))+[R/'src/data/mapa-hero.svg',R/'public/images/prednasky/foto-gesto.jpg',R/'public/images/pro-poradatele/david-navratil-praha.jpg']: shutil.copy(src,A)
def b64(name, mime): return f"data:{mime};base64," + base64.b64encode((A / name).read_bytes()).decode()

FONTS = ''.join(
    f"@font-face{{font-family:'{fam}';src:url({b64(f, 'font/woff2')}) format('woff2');font-weight:{w};font-style:{st};unicode-range:{ur}}}"
    for fam, f, w, st, ur in [
        ('Fraunces', 'fraunces-latin-400-normal.woff2', 400, 'normal', 'U+0000-00FF'),
        ('Fraunces', 'fraunces-latin-ext-400-normal.woff2', 400, 'normal', 'U+0100-024F'),
        ('Fraunces', 'fraunces-latin-400-italic.woff2', 400, 'italic', 'U+0000-00FF'),
        ('Fraunces', 'fraunces-latin-ext-400-italic.woff2', 400, 'italic', 'U+0100-024F'),
        ('Inter', 'inter-latin-400-normal.woff2', 400, 'normal', 'U+0000-00FF,U+2000-206F'),
        ('Inter', 'inter-latin-ext-400-normal.woff2', 400, 'normal', 'U+0100-024F'),
        ('Inter', 'inter-latin-600-normal.woff2', 600, 'normal', 'U+0000-00FF,U+2000-206F'),
        ('Inter', 'inter-latin-ext-600-normal.woff2', 600, 'normal', 'U+0100-024F'),
    ])

CSS = FONTS + """
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#102d47;color:#fffdf8;font-family:Inter,sans-serif;overflow:hidden;position:relative}
.eyebrow{font-size:17px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#8dd4cb}
h1{font-family:Fraunces,serif;font-weight:400;letter-spacing:-.03em;line-height:1.04;margin-top:22px}
h1 em{font-style:italic;color:#8dd4cb}
p{font-size:26px;line-height:1.4;color:#c4d0d8;margin-top:24px}
.url{position:absolute;font-size:22px;font-weight:600;color:#fffdf8}
.who{font-size:20px;color:#c4d0d8;font-weight:400}
"""

def page(body): return f"<!doctype html><html lang=cs><head><meta charset=utf-8><style>{CSS}</style></head><body>{body}</body></html>"

svg = (A / 'mapa-hero.svg').read_text(encoding='utf8').replace('<svg ', '<svg width="560" height="560" ', 1)

STRANKY = {
 'og-uvod': page(f"""
  <div style="position:absolute;left:640px;top:35px">{svg}</div>
  <div style="position:absolute;left:72px;top:92px;width:560px">
    <div class=eyebrow>Megatrendy · přednášky · analýzy</div>
    <h1 style="font-size:66px">Mapa světa, <em>který přestal být přehledný</em></h1>
    <p>76&nbsp;sil do roku 2031. Každé číslo se zdrojem, u&nbsp;každé nejistoty předem dané ukazatele.</p>
  </div>
  <div class=url style="left:72px;bottom:58px">David Navrátil <span class=who>· davidnavratil.com</span></div>"""),
 'og-prednasky': page(f"""
  <div style="position:absolute;left:0;top:0;width:560px;height:630px;background:url({b64('foto-gesto.jpg','image/jpeg')}) 46% 50%/auto 100% no-repeat"></div>
  <div style="position:absolute;left:440px;top:0;width:121px;height:630px;background:linear-gradient(90deg,rgba(16,45,71,0),#102d47)"></div>
  <div style="position:absolute;left:640px;top:84px;width:500px">
    <div class=eyebrow>Přednášky a strategické debaty</div>
    <h1 style="font-size:60px">Nevíme, co přijde. <em>Víme, podle čeho to poznáme.</em></h1>
    <p>Scénáře do roku 2031 pro konference a&nbsp;vedení firem. Česky i&nbsp;anglicky.</p>
  </div>
  <div class=url style="left:640px;bottom:58px">davidnavratil.com/prednasky</div>"""),
 'og-pro-poradatele': page(f"""
  <div style="position:absolute;left:0;top:0;width:560px;height:630px;background:url({b64('david-navratil-praha.jpg','image/jpeg')}) 50% 30%/auto 100% no-repeat"></div>
  <div style="position:absolute;left:440px;top:0;width:121px;height:630px;background:linear-gradient(90deg,rgba(16,45,71,0),#102d47)"></div>
  <div style="position:absolute;left:640px;top:96px;width:500px">
    <div class=eyebrow>Pro pořadatele a média</div>
    <h1 style="font-size:60px">Všechno pro vaši akci <em>na jedné stránce</em></h1>
    <p>Bio ve třech délkách, úvod pro moderátora, fotky ke stažení a&nbsp;technika.</p>
  </div>
  <div class=url style="left:640px;bottom:58px">davidnavratil.com/pro-poradatele</div>"""),
}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        for name, html in STRANKY.items():
            await pg.set_content(html, wait_until='load')
            await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(R/'public/images/og'/(name.replace('og-','')+'.jpg')), type='jpeg', quality=88)
            print(name, await pg.evaluate('document.fonts.check("28px Fraunces")'))
        await b.close()
asyncio.run(main())
