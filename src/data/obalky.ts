/**
 * Obálky karet analýz (úvodní stránka i archiv /analyses).
 * Číslo a věta vycházejí z názvu a perexu analýzy, žádný nový údaj.
 * Fotka leží v public/images/obalky/<key>.jpg; analýza bez obálky dostane tmavý panel s náhledem.
 */
export interface Obalka {
  n: string;
  t: string;
  /** Slovo místo čísla: menší písmo. */
  slovo?: boolean;
}

const cs: Record<string, Obalka> = {
  'potravinovy-sok': { n: '6 bran', t: 'mezi cenou močoviny a nákupním košíkem' },
  'rhine-kaub': { n: '8 cm', t: 'nejcitovanější číslo léta 2026 na Rýně' },
  'opportunity-threat': { n: 'Výzva, nebo ohrožení?', t: 'jak mozek přepíná pod tlakem', slovo: true },
  'index-regionu': { n: '206 obvodů', t: '49 ukazatelů kvality života v českých městech' },
};

const en: Record<string, Obalka> = {
  'potravinovy-sok': { n: '6 gates', t: 'between the price of urea and the shopping basket' },
  'rhine-kaub': { n: '8 cm', t: 'the most quoted number of summer 2026 on the Rhine' },
  'opportunity-threat': { n: 'Opportunity or threat?', t: 'how the brain switches under pressure', slovo: true },
  'index-regionu': { n: '206 regions', t: '49 quality-of-life indicators in Czech towns' },
};

export function getObalky(locale: string | undefined): Record<string, Obalka> {
  return locale === 'en' ? en : cs;
}

/** Pozadí obálky: ztmavený tematický záběr, stejný přechod na úvodní stránce i v archivu. */
export function obalkaBg(key: string): string {
  return `background-image: linear-gradient(180deg, rgba(13,37,61,.28) 0%, rgba(13,37,61,.5) 42%, rgba(13,37,61,.92) 82%), url(/images/obalky/${key}.jpg)`;
}
