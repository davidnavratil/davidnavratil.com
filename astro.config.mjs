// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://davidnavratil.com',
  output: 'static',
  integrations: [
    sitemap({
      customPages: [
        'https://davidnavratil.com/analyses/hormuz/',
        'https://davidnavratil.com/analyses/ree-dashboard/',
        'https://davidnavratil.com/analyses/uzka-hrdla/',
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
