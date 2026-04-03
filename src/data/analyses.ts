/**
 * Single source of truth for all analyses.
 * Used by AnalysesSection (landing page), CZ archive, and EN archive.
 *
 * To add a new analysis:
 * 1. Add an entry here
 * 2. Add translation keys in src/i18n/translations.ts (title, desc, why, cta)
 * 3. Add rsync --exclude in .github/workflows/deploy.yml
 */

export interface Analysis {
  /** Translation key — must match analyses.${key}.title etc. in translations */
  key: string;
  /** URL path. Use object for locale-specific hrefs. */
  href: string | { cs: string; en: string };
  /** Preview image path (relative to public/) */
  image: string;
  /** Translation keys for tag badges */
  tags: readonly string[];
  /** Whether the analysis is deployed and accessible */
  live: boolean;
  /** Year-month for archive display */
  date: string;
}

export const analyses: Analysis[] = [
  {
    key: 'hormuz-simulator',
    href: '/analyses/hormuz-energy-simulator/',
    image: '/images/preview-hormuz-simulator.webp',
    tags: ['tag.energy', 'tag.geopolitics', 'tag.supply'],
    live: true,
    date: '2026-04',
  },
  {
    key: 'qatar',
    href: '/analyses/qatar-infrastructure/',
    image: '/images/preview-qatar.webp',
    tags: ['tag.geopolitics', 'tag.energy', 'tag.tech'],
    live: true,
    date: '2026-03',
  },
  {
    key: 'hormuz',
    href: { cs: '/analyses/hormuz/', en: '/analyses/hormuz/en/' },
    image: '/images/preview-hormuz.webp',
    tags: ['tag.geopolitics', 'tag.energy', 'tag.supply'],
    live: true,
    date: '2026-03',
  },
  {
    key: 'ree',
    href: { cs: '/analyses/ree-dashboard/', en: '/analyses/ree-dashboard/en/' },
    image: '/images/preview-ree.webp',
    tags: ['tag.minerals', 'tag.china', 'tag.tech'],
    live: false,
    date: '2026-03',
  },
  {
    key: 'chokepoints',
    href: { cs: '/analyses/uzka-hrdla/', en: '/analyses/uzka-hrdla/?lang=en' },
    image: '/images/preview-chokepoints.webp',
    tags: ['tag.maps', 'tag.trade', 'tag.risks'],
    live: false,
    date: '2026-03',
  },
];

/** Resolve href for a given locale */
export function getHref(analysis: Analysis, locale: string): string {
  if (typeof analysis.href === 'string') return analysis.href;
  return locale === 'en' ? analysis.href.en : analysis.href.cs;
}
