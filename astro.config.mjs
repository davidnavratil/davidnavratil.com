// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://davidnavratil.com',
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
  integrations: [
    sitemap({
      customPages: [
        // Hormuz
        'https://davidnavratil.com/analyses/hormuz/',
        'https://davidnavratil.com/analyses/hormuz/en/',
        // REE Dashboard
        'https://davidnavratil.com/analyses/ree-dashboard/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/prices/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/supply-chain/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/demand/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/geopolitics/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/czech/',
        'https://davidnavratil.com/analyses/ree-dashboard/cs/about/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/prices/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/supply-chain/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/demand/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/geopolitics/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/czech/',
        'https://davidnavratil.com/analyses/ree-dashboard/en/about/',
        // Úzká Hrdla
        'https://davidnavratil.com/analyses/uzka-hrdla/',
        'https://davidnavratil.com/analyses/uzka-hrdla/sit/',
        'https://davidnavratil.com/analyses/uzka-hrdla/simulator/',
        'https://davidnavratil.com/analyses/uzka-hrdla/cesko/',
        'https://davidnavratil.com/analyses/uzka-hrdla/historie/',
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
