// Průhledné PNG s texty scén (stejná písma jako web), přechod pro čitelnost a značka v rohu.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const S = '/tmp/claude-0/-home-claude/f20f79f6-9112-558b-9ede-1fc9785e9967/scratchpad/';
const V = S + 'video/', A = S + 'astroprev/dist/_astro/';
const D = JSON.parse(fs.readFileSync(V + 'scenar.json', 'utf8'));
const ff = (re) => 'file://' + A + fs.readdirSync(A).find((f) => !f.startsWith('.') && re.test(f));
const fonts = ['400-normal', '400-italic', '500-normal', '600-normal'].map((v) => {
  const [w, st] = v.split('-');
  return `@font-face{font-family:F;font-weight:${w};font-style:${st};src:url(${ff(new RegExp('fraunces-latin-ext-' + v + '.*woff2$'))});unicode-range:U+0100-024F}@font-face{font-family:F;font-weight:${w};font-style:${st};src:url(${ff(new RegExp('fraunces-latin-' + v + '.*woff2$'))})}`;
}).join('') + ['400', '500', '600'].map((w) => `@font-face{font-family:I;font-weight:${w};src:url(${ff(new RegExp('inter-latin-ext-' + w + '-normal.*woff2$'))});unicode-range:U+0100-024F}@font-face{font-family:I;font-weight:${w};src:url(${ff(new RegExp('inter-latin-' + w + '-normal.*woff2$'))})}`).join('');
const nb = (t) => t.replace(/(\d{1,2}\.) (\d{1,2}\.) (\d{4})/g, '$1\u00a0$2\u00a0$3').replace(/(^|\s)([ksvzouaiKSVZOUAI]) /g, '$1$2 ').replace(/(\d) (?=[%°\wě])/g, '$1 ').replace(/ → /g, ' → ');
const base = `<meta charset=utf-8><style>${fonts}html,body{margin:0;width:1280px;height:720px;background:transparent;overflow:hidden}
  .b{position:absolute;left:86px;bottom:78px;width:1010px;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.45)}
  .n{font:400 118px/1 F;letter-spacing:-.035em}.t{font:500 31px/1.32 I;margin-top:18px;color:#f2f5f7;max-width:990px}
  .zv{font-size:24px !important;color:#fff !important}
  .z{font:400 22px/1.4 I;margin-top:16px;color:rgba(255,255,255,.9);letter-spacing:.01em}
  .u{position:absolute;left:86px;right:86px;top:50%;transform:translateY(-50%);color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.5)}
  .u1{font:400 74px/1.08 F;letter-spacing:-.03em}.u2{font:italic 400 74px/1.08 F;letter-spacing:-.03em;color:#8dd4cb}
  .k{position:absolute;left:86px;top:56px;font:600 13px I;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.82)}
  .e{position:absolute;right:56px;top:50%;transform:translateY(-50%);width:540px;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,.55)}
  .e1{font:400 54px/1.1 F;letter-spacing:-.03em}.e2{font:500 22px/1.4 I;margin-top:22px;color:#8dd4cb}.e3{font:600 20px I;margin-top:14px;color:#fff}
</style>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const shot = async (html, name) => { fs.writeFileSync(V + '_o.html', base + html); await p.goto('file://' + V + '_o.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(80); await p.screenshot({ path: V + name, omitBackground: true }); };
  for (const s of D.sceny) {
    if (s.typ === 'uvod') { await shot(`<div class="u"><div class="u1">${nb(s.radek1)}</div><div class="u2" style="visibility:hidden">${nb(s.radek2)}</div></div>`, `o_${s.id}_a.png`); await shot(`<div class="u"><div class="u1" style="visibility:hidden">${nb(s.radek1)}</div><div class="u2">${nb(s.radek2)}</div></div>`, `o_${s.id}_b.png`); }
    else if (s.typ === 'zaver') { await shot(`<div class="e"><div class="e1">${nb(s.radek1)}</div><div class="e2">${nb(s.radek2)}</div><div class="e3">${s.radek3}</div></div>`, `o_${s.id}.png`); }
    else await shot(`<div class="b"><div class="n">${nb(s.cislo)}</div><div class="t">${nb(s.text)}</div><div class="z${s.velky_zdroj ? ' zv' : ''}">${nb(s.zdroj)}</div></div>`, `o_${s.id}.png`);
  }
  await shot(`<div class="k">David Navrátil · Megatrendy a nejistoty</div>`, 'o_znacka.png');
  // přechod: tmavší dole vlevo kvůli čitelnosti textu
  await shot(`<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(4,12,20,.78) 0%,rgba(4,12,20,.45) 38%,rgba(4,12,20,0) 70%),linear-gradient(to right,rgba(4,12,20,.35),rgba(4,12,20,0) 60%)"></div>`, 'o_prechod.png');
  await shot(`<div style="position:absolute;inset:0;background:rgba(4,12,20,.42)"></div>`, 'o_ztmav.png');
  await b.close();
})();
