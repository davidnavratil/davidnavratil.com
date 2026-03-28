# davidnavratil.com — Dokumentace projektu

## Přehled

Profesionální platforma hlavního ekonoma České spořitelny. Interaktivní analýzy jako produkty, veřejné analýzy jako discovery engine pro B2B monetizaci.

- **URL:** https://davidnavratil.com
- **Framework:** Astro 6.1.1 (statický export)
- **Server:** Mozek (77.42.84.152), nginx 1.24, Ubuntu
- **GitHub:** `davidnavratil/davidnavratil.com`
- **Deploy:** `scripts/deploy.sh` (astro build + rsync)

---

## Chronologie vývoje

### Fáze 0 — Základ (27. 3. 2026)

**Cíl:** Postavit Astro site, landing page v češtině, SSL, nginx, deploy pipeline.

**Co se udělalo:**
- Inicializace Astro 6.1.1 projektu s TypeScript
- Základní landing page (`src/pages/index.astro`) s jednosloupcovým layoutem
- Dark/light mode přes CSS custom properties (`data-theme`) s localStorage persistencí a flash prevention
- SSL certifikát přes Let's Encrypt + certbot
- Nginx konfigurace se security headers, gzip kompresí a cache pro `/_astro/`
- Deploy script (`scripts/deploy.sh`) — build + rsync na server
- DNS migrace z Websupport NS na Cloudflare (gene/todd), DNS only režim

**Klíčové rozhodnutí:** Uživatel po první verzi řekl "Současný vizuál nemá žádný wow efekt, tohle není, co dokáže škálovat" — následoval kompletní redesign.

### Redesign landing page (27.–28. 3. 2026)

**Cíl:** "Top wow landing page" s osobními fotografiemi a profesionálním vizuálem.

**Research:** Analýza best practices moderních landing pages — asymetrické gridy, trust bary, gradient efekty, scroll animace.

**Co se udělalo:**
- Kompletní přepis `HomePage.astro` (1050+ řádků) s 8 sekcemi:
  1. **Hero** — dvousloupcový grid (text + foto), role badge se zeleným dotem, gradient text, dva CTA buttony, grid pattern pozadí, mouse-tracking glow efekt
  2. **Trust bar** — textová loga médií (Bloomberg, FT, Reuters, ČT24, ČRo, HN, Seznam Zprávy, CzechCrunch, Euromoney) s tečkovými separátory
  3. **Metriky** — 15+ let / 6 analýz / 700+ článků v kartě s dividers
  4. **Analýzy** — featured karta Hormuz (dvousloupcová s preview obrázkem) + 2-sloupcový grid pro REE a Úzká Hrdla se screenshoty
  5. **Speaking & Media** — dvousloupcový layout (statistiky + CTA vlevo, asymetrická foto galerie vpravo)
  6. **Newsletter CTA** — karta s glow efektem, ikona, popis, Substack odkaz
  7. **About** — dvousloupcový (foto vlevo, 3 pilíře vpravo: analýzy, newsletter, speaking)
  8. **Kontakt** — tmavá gradient karta s Formspree formulářem + kontaktní odkazy

- Mobilní hamburger menu v `Header.astro` s CSS transition (max-height + visibility)
- Scroll reveal animace přes IntersectionObserver (`.reveal` → `.in-view`)
- Hero entrance animace (staggered fadeUp)
- Kompletní responsive breakpoints (900px, 640px)
- 8 fotografií zpracováno a umístěno do `public/images/`

**Fotografie (5× osobní + 3× preview analýz):**
- `david-portrait.jpg` — headshot pro hero
- `david-keynote.jpg` — stage s publikem pro galerii (velká)
- `david-data.jpg` — prezentace v Parlamentu pro galerii (malá)
- `david-speaking.jpg` — panel diskuze pro galerii (malá)
- `david-panel.jpg` — panel pro about sekci
- `preview-hormuz.png/.jpg` — screenshot Hormuz analýzy
- `preview-ree.png/.jpg` — screenshot REE dashboardu
- `preview-chokepoints.png/.jpg` — screenshot Úzkých hrdel

### Fáze 1 — Migrace analýz & i18n (28. 3. 2026)

**Cíl:** Přenést 3 analýzy pod doménu, přidat CZ/EN, SEO základ.

**Co se udělalo:**

**i18n systém:**
- Astro native i18n: `defaultLocale: 'cs'`, `prefixDefaultLocale: false` (CZ na `/`, EN na `/en/`)
- `src/i18n/translations.ts` — ~100 klíčů v CZ+EN, typovaný (`Locale`, `TranslationKey`)
- `src/i18n/utils.ts` — `useTranslations(locale)`, `getAlternatePath()`
- `src/pages/en/index.astro` — anglická verze

**Migrace analýz:**
- Hormuz (vanilla JS) → `/var/www/davidnavratil.com/analyses/hormuz/`
- REE Dashboard (Next.js 16, static export) → `/analyses/ree-dashboard/`
- Úzká Hrdla (Next.js 15, static export) → `/analyses/uzka-hrdla/`
- Každá analýza má vlastní deploy script, basePath nakonfigurovaný
- Back-to-landing linky na všech analýzách (`← davidnavratil.com`)

**SEO:**
- `@astrojs/sitemap` s customPages pro 3 analýzy
- hreflang tagy (cs, en, x-default) v `Base.astro`
- JSON-LD structured data (WebSite + Person schema)
- `robots.txt` s odkazem na sitemap
- OG image (1200×630 PNG) pro landing page

**Překlad analýz:**
- Hormuz: kompletní CZ+EN přes `translations.js`, URL-based detection (`/en/`)
- REE Dashboard: kompletní CZ+EN přes `[lang]` segment, 725+ řádků dictionary
- Úzká Hrdla: CZ only (EN překlad dosud neproveden)

### Fáze 2 — Konverze & Discovery (28. 3. 2026)

**Cíl:** Plausible analytics, newsletter CTA, OG images, kontaktní formulář.

**Co se udělalo:**

- **Plausible analytics** na landing page (`pa-MLceY4sQroqGo9vckgP7U`) — původně plánovaný GoatCounter nahrazen Plausible na žádost uživatele
- **Newsletter CTA** — `NewsletterCTA.astro` komponenta s glow efektem, odkaz na Substack subscribe
- **Newsletter CTA na analýzách** — banner nad footer v Hormuz, REE, Uzka-Hrdla
- **OG images** PNG pro REE Dashboard a Úzká Hrdla (1200×630, generovány přes sharp)
- **Formspree kontaktní formulář** (endpoint `xwvwvrqy`) — jméno, email, firma (volitelné), zpráva
- **About sekce** rozšířena o 3 pilíře s ikonami

### Fáze 3 — Visual Refresh (28. 3. 2026)

**Cíl:** Profesionálnější vizuál, lepší barevná paleta, opravy bugů.

**Co se udělalo:**

- **Slate paleta (Variant B)** — dark mode migrován ze stone na slate tóny pro "finance authority" look
- **Navy metrics karta** — gradient `#0F172A → #1E293B` s amber hodnotami (`#F59E0B`) a slate popisky
- **Střídající se band pozadí** — sekce trust+metrics, speaking, about mají `--color-band` (#F1F5F9 light / #1E293B dark)
- **Section tagy v navy** — `--color-section-tag: #1E3A5F` (light) / `#F59E0B` (dark)
- **Animace counterů** — scroll-triggered postupné napočítání (15+, 6, 700+), cubic ease-out, 1200ms
- **Hero role badge** — změna na "Hlavní ekonom · Analytik · Speaker"
- **Metrics label** — změna z "komentářů" na "článků a analýz"
- **Fix theme toggle** — bug s duplicitním `is:inline` scriptem (komponenta renderována 2× v desktop+mobile nav). Oprava: class selector + `window.__themeToggleInit` guard
- **Fix preview screenshotů** — `object-position: top left` pro lepší crop analýzových obrázků
- **Zmenšení mezer** — `--space-2xl: 4.5rem`, `--space-3xl: 5.5rem` (z původních 6rem/8rem)

---

## Architektura

### Adresářová struktura

```
davidnavratil.com/
├── astro.config.mjs      # Astro config, i18n, sitemap
├── package.json           # Astro 6.1.1 + @astrojs/sitemap
├── scripts/deploy.sh      # Build + rsync na server
├── public/
│   ├── images/            # Fotografie a preview screenshoty
│   ├── og-image.png       # OG image 1200×630
│   ├── favicon.svg/.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Header.astro   # Fixed header, nav, language switch, hamburger
│   │   ├── Footer.astro   # Copyright, Substack, LinkedIn
│   │   ├── HomePage.astro # Hlavní obsah (8 sekcí, 1050+ řádků)
│   │   └── NewsletterCTA.astro
│   ├── i18n/
│   │   ├── translations.ts # ~100 klíčů CZ+EN
│   │   └── utils.ts        # useTranslations(), getAlternatePath()
│   ├── layouts/
│   │   └── Base.astro      # HTML shell, SEO, Plausible, theme, JSON-LD
│   ├── pages/
│   │   ├── index.astro     # CZ landing (importuje HomePage)
│   │   └── en/index.astro  # EN landing
│   └── styles/
│       └── global.css      # Design system, theme tokens, animace
└── fotky/                  # Zdrojové fotografie (gitignored)
```

### Design systém

- **Světlý režim:** teplé neutrály (#FAFAF9 bg, #1C1917 text, #B45309 accent)
- **Tmavý režim:** studené šedé (#0C0A09 bg, #E7E5E4 text, #F59E0B accent)
- **Typografie:** Georgia/Cambria (nadpisy), system-ui (tělo), SF Mono (kód)
- **Spacing:** xs (0.5rem) → 3xl (8rem), max-width 1080px
- **Border radius:** 12px (standard), 20px (velké karty)
- **Animace:** fadeUp, fadeIn, shimmer, pulse-glow, float + scroll reveal (IntersectionObserver)

### Deploy pipeline

```bash
# Automatický deploy: push na main → GitHub Actions build + rsync
# Manuální deploy landing page:
bash scripts/deploy.sh

# Deploy všeho (landing + analýzy):
bash scripts/deploy-all.sh

# Deploy konkrétní části:
bash scripts/deploy-all.sh --landing
bash scripts/deploy-all.sh --hormuz
bash scripts/deploy-all.sh --ree
bash scripts/deploy-all.sh --uzka-hrdla

# Analýzy na serveru:
# /var/www/davidnavratil.com/analyses/hormuz/
# /var/www/davidnavratil.com/analyses/ree-dashboard/
# /var/www/davidnavratil.com/analyses/uzka-hrdla/
```

### SSL

- Let's Encrypt certifikát pro `davidnavratil.com` + `www.davidnavratil.com`
- Certbot auto-renewal: systemd timer (`certbot.timer`) aktivní, kontrola 2× denně
- Expirace: ověřit přes `ssh root@77.42.84.152 'certbot certificates'`

### Služby třetích stran

| Služba | Účel | Identifikátor |
|--------|------|----------------|
| Plausible | Analytics | `pa-MLceY4sQroqGo9vckgP7U` |
| Formspree | Kontaktní formulář | `xwvwvrqy` |
| Substack | Newsletter | `davidnavratil.substack.com` |
| Cloudflare | DNS | NS: gene/todd, DNS only |
| Let's Encrypt | SSL | certbot auto-renewal |

---

## Co je hotové vs. co zbývá

### Hotové (deployed na produkci)

- [x] Astro site s kompletním redesignem (wow faktor)
- [x] CZ/EN i18n s URL routingem
- [x] 3 analýzy migrované pod doménu s back-linky
- [x] Dark/light mode s persisted preferencí
- [x] Responsive layout (desktop, tablet, mobil)
- [x] Scroll reveal animace
- [x] Mouse-tracking glow na hero
- [x] Hero entrance staggered animace
- [x] Trust bar s logy médií
- [x] Speaking & media sekce s foto galerií
- [x] Newsletter CTA (landing + analýzy)
- [x] Kontaktní formulář (Formspree)
- [x] Plausible analytics
- [x] SEO (sitemap, hreflang, JSON-LD, OG images)
- [x] SSL + nginx security headers
- [x] Deploy pipeline
- [x] Hormuz: kompletní CZ+EN překlad
- [x] REE Dashboard: kompletní CZ+EN překlad

### Zbývá dokončit

**Analýzy:**
- [ ] **REE Dashboard — zbytková čeština** — `cost_breakdown.json` (názvy fází), `cost_passthrough` (produkty), aplikace prvků stále obsahují české texty
- [ ] **Úzká Hrdla — EN překlad** — celá analýza je jen česky
- [ ] **Rebuild a redeploy** všech 3 analýz po opravách

**Budoucí fáze (navrhované):**
- [ ] Migrace dalších analýz (sector-intelligence, cnb-taylor-rule, hypoteka, czech-macro-model)
- [ ] Blog / propojení se Substackem
- [ ] Performance optimalizace (image formats, lazy loading audit)
