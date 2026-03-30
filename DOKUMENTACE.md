# davidnavratil.com — Dokumentace projektu

## Přehled

Editorská analytická platforma hlavního ekonoma České spořitelny. Interaktivní analýzy jako produkty, Substack newsletter jako discovery engine, veřejné analýzy pro B2B monetizaci.

- **URL:** https://davidnavratil.com
- **Framework:** Astro 6.1.1 (statický export)
- **Server:** Mozek (77.42.84.152), nginx 1.24, Ubuntu
- **GitHub:** `davidnavratil/davidnavratil.com`
- **Deploy:** GitHub Actions (push na main) + manuální `scripts/deploy.sh`
- **Auto-rebuild:** denně v 6:00 UTC (8:00 CET) — GitHub Actions cron pro aktualizaci Substack článků

---

## Architektura

### Adresářová struktura

```
davidnavratil.com/
├── astro.config.mjs          # Astro config, i18n, sitemap (26 URL)
├── package.json               # Astro 6.1.1, @astrojs/sitemap, @fontsource/*
├── scripts/deploy.sh          # Manuální build + rsync na server
├── .github/workflows/
│   └── deploy.yml             # GitHub Actions: push deploy + daily cron rebuild
├── public/
│   ├── images/                # Fotografie, preview screenshoty analýz (WebP)
│   ├── shared/brand.css       # Sdílený brand layer pro všechny analýzy
│   ├── og-image.png           # OG image 1200×630
│   ├── favicon.svg/.ico
│   ├── robots.txt
│   ├── googleb937edf397b551b4.html     # Google Search Console verifikace
│   └── seznam-wmt-*.txt                # Seznam Webmaster verifikace
├── src/
│   ├── components/            # 10 dekomponovaných sekcí
│   │   ├── HomePage.astro     # Orchestrátor — importuje všechny sekce
│   │   ├── HeroSection.astro  # Hero: split layout, gradient bg, screenshot
│   │   ├── TrustBar.astro     # Mediální loga (Bloomberg, FT, Reuters…)
│   │   ├── AnalysesSection.astro  # 3 karty analýz
│   │   ├── WhyPeopleReturn.astro  # 3 hodnotové propozice
│   │   ├── NewsletterCTA.astro    # Newsletter konverze s 5 value points
│   │   ├── LatestArticles.astro   # RSS feed ze Substacku (6 článků)
│   │   ├── AboutSection.astro     # O autorovi s editoriální fotkou
│   │   ├── SpeakingSection.astro  # Přednášky, mini-cases, galerie
│   │   ├── ContactSection.astro   # Formspree formulář
│   │   ├── Header.astro           # Fixed nav, 5 položek, newsletter CTA
│   │   └── Footer.astro           # Copyright footer
│   ├── i18n/
│   │   ├── translations.ts    # ~150 klíčů v CZ+EN
│   │   └── utils.ts           # useTranslations(), getAlternatePath()
│   ├── layouts/
│   │   └── Base.astro         # HTML shell, SEO, fonty, Plausible, JSON-LD
│   ├── pages/
│   │   ├── index.astro        # CZ landing
│   │   ├── en/index.astro     # EN landing
│   │   ├── analyses/index.astro     # CZ archív analýz
│   │   └── en/analyses/index.astro  # EN archív analýz
│   └── styles/
│       └── global.css         # Design system, theme tokens
├── fotky/                     # Zdrojové fotografie (gitignored)
└── DOKUMENTACE.md
```

### Komponentová architektura

HomePage.astro je tenký orchestrátor, který importuje 10 sekcí v pořadí:

1. **HeroSection** — dvousloupcový split (55% text + 45% screenshot Hormuz analýzy), tmavý gradient pozadí, eyebrow, serif H1, polycrisis subheadline, dva CTA (Analýzy + Newsletter), mouse-tracking glow
2. **TrustBar** — horizontální pás mediálních wordmarků (serif font, nízká opacity 0.3 → 0.65 hover)
3. **AnalysesSection** — 3 horizontální karty (screenshot vlevo, obsah vpravo: tagy, titulek, popis, "proč je to důležité", specifické CTA)
4. **WhyPeopleReturn** — 3-sloupcový grid hodnotových propozic s SVG ikonami, band pozadí
5. **NewsletterCTA** — konverzní karta s 5 hodnotovými body (✓ check SVG), accent pozadí
6. **LatestArticles** — build-time RSS fetch ze Substacku (6 článků, 2×3 grid), cover obrázky z CDN
7. **AboutSection** — editoriální foto + 3 odstavce o autorovi, credentials footer
8. **SpeakingSection** — nadpis, popis, 3 mini-case příklady, foto galerie
9. **ContactSection** — Formspree formulář v tmavé kartě

### Design systém

**Petrolejová editoriální paleta (Teal Editorial):**

| Token | Light | Dark |
|-------|-------|------|
| `--color-bg` | #F5F1E8 (paper) | #1C1B18 (warm charcoal) |
| `--color-surface` | #FFFFFF | #2A2824 |
| `--color-text` | #111111 | #F0EDE6 |
| `--color-accent` | #1B7D8A (teal) | #5B9EAD (muted teal) |
| `--color-accent-hover` | #156A75 | #7AB4C0 |
| `--color-muted` | #736D64 | #A09C94 |
| `--color-navy` | #163A5F | #4A8BC2 |
| `--color-band` | #EDE9E0 | #2A2824 |

**Brand barvy analýz (identitní):**
| Analýza | Barva | Hex |
|---------|-------|-----|
| Hormuz | oranžová | #B45309 |
| REE Dashboard | teal | #0E7490 |
| Úzká Hrdla | navy | #1B2A4A |

**Typografie:**
- **Nadpisy:** Fraunces (serif) — self-hosted přes @fontsource (400, 600, 700)
- **Tělo:** Inter (sans) — self-hosted přes @fontsource (400, 500, 600)
- **Čísla/kód:** JetBrains Mono (mono) — v analýzách
- **Fallback:** Georgia → Times New Roman (serif), system-ui → -apple-system (sans)

**WCAG AA compliance:**
- `--color-muted` light #736D64 splňuje 4.5:1 na #F5F1E8
- `--color-muted` dark #A09C94 splňuje 4.5:1 na #1C1B18
- `--color-accent` dark #5B9EAD splňuje 6.2:1 na #1C1B18 (WCAG AAA)

**Spacing:** xs (0.5rem) → 3xl (5.5rem), container max-width 1080px
**Border radius:** 12px (standard), 20px (velké karty)
**Animace:** scroll reveal (IntersectionObserver, `.reveal` → `.in-view`), staggered delays (0.1s, 0.2s)
**Mobile:** breakpoints 900px, 640px, 400px; min touch targets 44px

### LatestArticles — RSS integrace

- Build-time fetch z `https://davidnavratil.substack.com/feed`
- Parsování XML bez externích závislostí (regex split na `<item>`)
- Extrakce: title, link, pubDate, description (strip HTML, 160 znaků), cover image (enclosure URL)
- Cover obrázky zmenšeny přes Substack CDN parametry (`w_400,h_220,c_fill`)
- Graceful degradation — pokud feed není dostupný, sekce se nevyrenderuje
- **Auto-refresh:** GitHub Actions cron `0 6 * * *` spouští denní rebuild

### Deploy pipeline

```bash
# Automatický deploy: push na main → GitHub Actions build + rsync
# Denní auto-rebuild: cron 6:00 UTC pro aktualizaci Substack článků

# Manuální deploy landing page:
bash scripts/deploy.sh

# Analýzy mají vlastní deploy scripty:
cd ree-dashboard && bash scripts/deploy.sh
cd uzka-hrdla/uzka-hrdla && bash scripts/deploy.sh
cd hormuz && bash scripts/deploy.sh

# Analýzy na serveru (MIMO rsync landing page):
# /var/www/davidnavratil.com/analyses/hormuz/
# /var/www/davidnavratil.com/analyses/ree-dashboard/
# /var/www/davidnavratil.com/analyses/uzka-hrdla/
```

**Důležité:** rsync deploy.yml obsahuje per-analysis excludes (`--exclude='analyses/hormuz/'` atd.) — analýzy se deployují separátně a landing page deploy je nepřepisuje.

### i18n

**Landing page:**
- **Strategie:** Astro native i18n — CZ na `/`, EN na `/en/`
- **Config:** `defaultLocale: 'cs'`, `prefixDefaultLocale: false`
- **Klíče:** ~150 v každém jazyce (translations.ts)
- **Utility:** `useTranslations(locale)` vrací typovanou `t()` funkci
- **Alternáty:** `getAlternatePath()` pro language switcher + hreflang tagy

**Analýzy — i18n strategie:**
| Analýza | Strategie | EN URL |
|---------|-----------|--------|
| Hormuz | Duplicitní HTML + translations.js | `/analyses/hormuz/en/` |
| REE Dashboard | Next.js `[lang]` segment | `/analyses/ree-dashboard/en/` |
| Úzká Hrdla | Client-side context + `?lang=en` | `/analyses/uzka-hrdla/?lang=en` |

### SEO

- **Google Search Console:** ověřeno (googleb937edf397b551b4.html)
- **Seznam Webmaster:** ověřeno (seznam-wmt-*.txt)
- **Sitemap:** 26 URL (4 landing pages + 22 analysis pages) — `sitemap-index.xml`
- **Hreflang:** všechny stránky (Astro native + Next.js alternates)
- **JSON-LD:** WebSite + Person schema na landing page, WebApplication na REE Dashboard, WebSite na Úzká Hrdla + Hormuz
- **Canonical URL:** na všech stránkách
- **OG + Twitter Cards:** na všech stránkách s obrázky 1200×630
- **robots.txt:** Allow all, odkaz na sitemap

### SSL & Server

- Let's Encrypt certifikát pro `davidnavratil.com` + `www.davidnavratil.com`
- Certbot auto-renewal: systemd timer (`certbot.timer`), kontrola 2× denně
- Nginx s security headers, gzip kompresí a cache pro `/_astro/`
- DNS: Cloudflare (NS: gene/todd), DNS only režim

### Služby třetích stran

| Služba | Účel | Identifikátor |
|--------|------|----------------|
| Plausible | Analytics | `pa-MLceY4sQroqGo9vckgP7U` |
| Formspree | Kontaktní formulář | `xwvwvrqy` |
| Substack | Newsletter + RSS feed | `davidnavratil.substack.com` |
| Cloudflare | DNS | NS: gene/todd, DNS only |
| Let's Encrypt | SSL | certbot auto-renewal |
| GitHub Actions | CI/CD + daily cron | `.github/workflows/deploy.yml` |
| Google Search Console | SEO monitoring | ověřeno |
| Seznam Webmaster | SEO monitoring (CZ) | ověřeno |

### Sdílený brand layer

`/public/shared/brand.css` — jeden CSS soubor načítaný všemi analýzami:
- Brand tokeny (barvy, fonty, border-radius, max-width)
- Sticky header se zpětným odkazem na davidnavratil.com
- Footer s newsletter CTA, cross-navigation mezi analýzami
- Accent barva `#1B7D8A` (petrolejová) — sjednocená napříč platformou

### Starter template

`/Users/davidnavratil/pracovni/analysis-starter-template/` — šablona pro nové analýzy:
- `CONFIG.ts` jako single source of truth (slug, titulky, barvy, autor)
- Next.js 15 + React 19 + Tailwind 4
- Brand fonty (Fraunces + Inter), BrandFooter, Header
- CZ/EN i18n (client-side context)
- Deploy script čte slug z CONFIG.ts
- **Slash příkaz:** `/new-analysis` v Claude Code automatizuje scaffolding

---

## Chronologie vývoje

### Fáze 0 — Základ (27. 3. 2026)

Inicializace Astro projektu, SSL, nginx, deploy pipeline, první verze landing page.

### Fáze 1 — Migrace analýz & i18n (28. 3. 2026)

- i18n systém (CZ/EN)
- Migrace 3 analýz pod doménu (Hormuz, REE Dashboard, Úzká Hrdla)
- SEO základ (sitemap, hreflang, JSON-LD, OG images)
- Překlad Hormuz (CZ+EN) a REE Dashboard (CZ+EN)

### Fáze 2 — Konverze & Discovery (28. 3. 2026)

- Plausible analytics
- Newsletter CTA komponenta + CTA na analýzách
- Formspree kontaktní formulář
- OG images pro analýzy

### Fáze 3 — Visual Refresh (28. 3. 2026)

- Slate paleta, navy metriky, band pozadí
- Counter animace, hero entrance animace

### Fáze 4 — Editorial Redesign (28. 3. 2026)

**Kompletní přestavba landing page z "osobního profilu" na "editorský analytický magazín":**

- Dekompozice monolitického HomePage.astro (1050+ řádků) do 10 samostatných komponent
- Nová teplá editoriální paleta (paper #F5F1E8 / warm charcoal #1C1B18)
- Self-hosted fonty Fraunces (serif) + Inter (sans) přes @fontsource
- Redesign hero: split layout s screenshot Hormuz analýzy, polycrisis subheadline
- Nové sekce: WhyPeopleReturn, LatestArticles (RSS ze Substacku)
- Newsletter konverze: 5 hodnotových bodů (footer funnel CTA odstraněn — duplicitní)
- Výměna fotografií za editoriální (panel, parlament, stage, lecture)
- Vylepšená angličtina ("Not opinions. Orientation.", "to think with", "arguments you can see")
- WCAG AA contrast compliance
- 44px min touch targets pro mobile
- GitHub Actions daily cron pro auto-refresh Substack článků
- ~150 i18n klíčů na jazyk (z původních ~100)

### Fáze 5 — Brand Unification & Archive (28. 3. 2026)

**Sladění vizuální identity napříč analýzami + archívní stránka:**

- **Sdílený brand layer** (`/shared/brand.css`) — společné design tokeny, header/footer styly
- **Hormuz:** brand header/footer (CZ+EN), Fraunces+Inter (Google Fonts CDN), warm paper pozadí
- **REE Dashboard:** Fraunces místo Playfair Display, warm paleta, brand footer, navbar sladění, JSON-LD schema
- **Úzká Hrdla:** Fraunces headings, warm paper pozadí, brand footer, header sladění, hreflang
- **Archívní stránka** `/analyses/` (CZ) + `/en/analyses/` (EN) — grid karet s tag filtrováním
- **Deploy workflow fix** — rsync exclude per-analysis subdirectories
- **PNG → WebP konverze** — všechny obrázky (~67% úspora)

### Fáze 6 — Překlady, SEO & Color Refresh (29. 3. 2026)

**Kompletní EN překlad Úzká Hrdla + SEO hardening + změna accent barvy:**

- **Úzká Hrdla EN překlad** — 34 UI komponent přeloženo do EN, `localizedField()` helper pro data, client-side `?lang=en` URL parametr
- **JSON data překlad** — všech 36 chokepoints, cz-exposure (14 expozic), stats (8 kategorií), timeline-and-cases (32 událostí + 20 case studies), connections (40 uzlů + 50 hran), diversification (20 iniciativ), scenarios (7 scénářů) — přidány `*En` sibling pole
- **REE Dashboard EN cleanup** — opraveny zbylé hardcoded české stringy
- **Hormuz EN** — doplněn chybějící brand header/footer, fonty, warm paleta
- **Code audit** — opraveny hardcoded ternáry (`'GDP'/'HDP'`, `'to'/'až'`) → `t()` klíče, odstraněny `as any` z localizedField callů, opravena LatestArticles hardcoded čeština v EN
- **BrandFooter** — language-aware navigation linky (EN → `/en/`, `?lang=en`)
- **SEO:**
  - Google Search Console + Seznam Webmaster ověřeno
  - Sitemap rozšířen ze 7 na 26 URL (všechny subpages + EN verze)
  - JSON-LD WebApplication schema přidáno do REE Dashboard
  - Hreflang přidán do Úzká Hrdla (cs + en alternates)
- **Color refresh:** accent barva změněna z karamelové `#A05A2C` na petrolejovou `#1B7D8A`
  - Light mode: `#1B7D8A` (accent), `#156A75` (hover)
  - Dark mode: `#5B9EAD` (tlumená), `#7AB4C0` (hover)
  - Aktualizováno v: global.css, brand.css, BrandFooter (3 analýzy + starter template)

---

## Fotografie

Všechny obrázky ve formátu WebP (konvertováno z PNG/JPG, ~67% úspora). Originální PNG/JPG zachovány jako fallback.

| Soubor | Popis | Použití |
|--------|-------|---------|
| `david-portrait.webp` | Headshot | Hero sekce |
| `david-about.webp` | Panel s mikrofonem (editoriální) | About sekce |
| `david-keynote.webp` | Parlament s GDP grafem | Speaking galerie |
| `david-data.webp` | Přednáška s publikem | Speaking galerie |
| `david-speaking.webp` | Close-up na pódiu | Speaking galerie |
| `preview-hormuz.webp` | Screenshot Hormuz analýzy | Hero + karta analýzy |
| `preview-ree.webp` | Screenshot REE dashboardu | Karta analýzy |
| `preview-chokepoints.webp` | Screenshot Úzkých hrdel | Karta analýzy |

---

## Co je hotové vs. co zbývá

### Hotové (deployed na produkci)

- [x] Kompletní editorial redesign landing page (10 komponent)
- [x] Petrolejová editoriální paleta s WCAG AA/AAA compliance
- [x] Self-hosted Fraunces + Inter fonty
- [x] CZ/EN i18n (~150 klíčů)
- [x] 3 analýzy migrované pod doménu
- [x] Dark/light mode s persisted preferencí
- [x] Responsive layout (900px, 640px, 400px breakpoints)
- [x] 44px min touch targets mobile
- [x] Scroll reveal animace + mouse-tracking glow
- [x] Trust bar s mediálními wordmarky
- [x] 3 karty analýz s preview screenshoty (WebP)
- [x] WhyPeopleReturn hodnotové propozice
- [x] Newsletter CTA s 5 value points
- [x] LatestArticles — 6 článků ze Substack RSS (2×3 grid, cover obrázky)
- [x] About sekce (editoriální foto, 3 odstavce)
- [x] Speaking sekce (mini-cases, foto galerie)
- [x] Kontaktní formulář (Formspree)
- [x] Plausible analytics
- [x] SEO (sitemap 26 URL, hreflang, JSON-LD, OG images, Google SC, Seznam WM)
- [x] SSL + nginx security headers
- [x] GitHub Actions deploy + daily cron rebuild
- [x] Hormuz: kompletní CZ+EN překlad + brand
- [x] REE Dashboard: kompletní CZ+EN překlad + brand + JSON-LD
- [x] Úzká Hrdla: kompletní CZ+EN překlad (UI + JSON data) + brand + hreflang
- [x] Brand unification — sdílený header/footer/fonty/paleta na všech analýzách
- [x] Archívní stránka `/analyses/` (CZ+EN) s tag filtrováním
- [x] PNG → WebP konverze (~67% úspora)
- [x] Deploy workflow — per-analysis excludes (archív se deployuje)
- [x] Starter template + `/new-analysis` slash příkaz
- [x] Color refresh — petrolejová paleta (#1B7D8A)

### Zbývá dokončit

**Optimalizace (navrhované):**
- [ ] Preconnect hints pro Substack CDN (`substackcdn.com`)
- [ ] Performance monitoring (Core Web Vitals)

**Budoucí fáze:**
- [ ] Shared component library — extrakce sdílených komponent (npm balíček)
- [ ] Migrace dalších analýz (sector-intelligence, cnb-taylor-rule, hypoteka, czech-macro-model)
- [ ] Embedded newsletter formulář (custom form + Substack proxy)
