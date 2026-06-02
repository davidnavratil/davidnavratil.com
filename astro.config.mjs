// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Sitemap notes:
 *  - Root paths (`/analyses/<slug>/`) keep their trailing slash — both static
 *    (Astro/index.html) and Next.js exports serve them as 200.
 *  - Sub-routes from Next.js exports (uzka-hrdla, ree-dashboard) are written
 *    WITHOUT trailing slash. Next.js exports them as `<route>.html`, so the
 *    slashed variant returns 404/403. Keeping the canonical (no-slash) form
 *    in the sitemap is what Google actually fetches at 200.
 *  - All live analyses (live:true in src/data/analyses.ts) MUST be listed
 *    below — Astro only auto-discovers its own routes, not the Next.js apps
 *    rsynced into /var/www/davidnavratil.com/analyses/<slug>/.
 *  - The weekly audit (scripts/audit/run.ts) verifies both directions:
 *      a) every URL listed here returns 200
 *      b) every live:true analysis is listed here
 */
export default defineConfig({
  site: 'https://davidnavratil.com',
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
  integrations: [
    sitemap({
      customPages: [
        // Hormuz (static)
        'https://davidnavratil.com/analyses/hormuz/',
        'https://davidnavratil.com/analyses/hormuz/en/',
        // Cesta nafty (Next.js, root only)
        'https://davidnavratil.com/analyses/cesta-nafty/',
        // Qatar infrastructure (Next.js, root only)
        'https://davidnavratil.com/analyses/qatar-infrastructure/',
        // Hormuz Energy Simulator (Next.js, root only)
        'https://davidnavratil.com/analyses/hormuz-energy-simulator/',
        // Opportunity vs Threat (Next.js, root only)
        'https://davidnavratil.com/analyses/opportunity-vs-threat/',
        // Index silnějších regionů (Python+web, root only)
        'https://davidnavratil.com/analyses/index-silnejsich-regionu/',
        // Fertilizer crisis (Next.js, root only — live:false but deployed)
        'https://davidnavratil.com/analyses/fertilizer-crisis/',
        // REE Dashboard (Next.js export — root paths keep slash, sub-routes drop it)
        'https://davidnavratil.com/analyses/ree-dashboard/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/prices',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/supply-chain',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/demand',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/geopolitics',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/czech',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/about',
        'https://davidnavratil.com/analyses/ree-dashboard/en/prices',
        'https://davidnavratil.com/analyses/ree-dashboard/en/supply-chain',
        'https://davidnavratil.com/analyses/ree-dashboard/en/demand',
        'https://davidnavratil.com/analyses/ree-dashboard/en/geopolitics',
        'https://davidnavratil.com/analyses/ree-dashboard/en/czech',
        'https://davidnavratil.com/analyses/ree-dashboard/en/about',
        // Úzká Hrdla (Next.js export — root keeps slash, sub-routes drop it)
        'https://davidnavratil.com/analyses/uzka-hrdla/',
        'https://davidnavratil.com/analyses/uzka-hrdla/sit',
        'https://davidnavratil.com/analyses/uzka-hrdla/simulator',
        'https://davidnavratil.com/analyses/uzka-hrdla/cesko',
        'https://davidnavratil.com/analyses/uzka-hrdla/historie',
        'https://davidnavratil.com/analyses/uzka-hrdla/historie/ever-given-2021',
        'https://davidnavratil.com/analyses/uzka-hrdla/historie/houthi-crisis-2023',
        'https://davidnavratil.com/analyses/uzka-hrdla/historie/panama-drought-2023',
      ],
    }),
  ],
  i18n: {
    defaultLocale: 'cs',
    locales: ['cs', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
