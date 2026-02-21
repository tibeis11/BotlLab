/**
 * brew-type-lookup.ts
 *
 * Lookup-Tabellen zur automatischen Ableitung von:
 *  - fermentation_type  (aus Hefename + Bierstil)
 *  - mash_method        (aus Maischeschritten + Zutaten)
 *  - mash_process       (aus Maischeschritt-Namen + Anzahl)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktionen
// ─────────────────────────────────────────────────────────────────────────────

/** Normalisiert einen String: Kleinbuchstaben, Leerzeichen/Bindestriche/Punkte entfernt */
function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_.\/]/g, '');
}

/** Prüft ob `haystack` (normalisiert) einen der `needles` enthält */
function matchesAny(haystack: string, needles: string[]): boolean {
  const h = norm(haystack);
  return needles.some(n => h.includes(norm(n)));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FERMENTATION TYPE – Hefe → Gärungstyp
// ─────────────────────────────────────────────────────────────────────────────

type FermentationType = 'top' | 'bottom' | 'spontaneous' | 'mixed';

interface YeastEntry {
  keywords: string[];
  type: FermentationType;
}

/**
 * Umfangreiche Datenbank bekannter Hefen.
 * Matching erfolgt gegen den normalisierten Hefenamen (case-insensitive, ohne Sonderzeichen).
 * Reihenfolge: spezifischere Einträge zuerst (z.B. Produktnummern vor Gattungsnamen).
 */
const YEAST_DB: YeastEntry[] = [

  // ── Fermentis Saflager (untergärig) ──────────────────────────────────────
  { keywords: ['w3470', 'w34/70', 'w 34/70', 'saflager w', 'saflager-w'], type: 'bottom' },
  { keywords: ['s23', 's-23', 'saflager s'], type: 'bottom' },

  // ── Fermentis Safale (obergärig) ─────────────────────────────────────────
  { keywords: ['us05', 'us-05', 'safale us'], type: 'top' },
  { keywords: ['s04', 's-04', 'safale s-04', 'safale s04', 'safale english'], type: 'top' },
  { keywords: ['s33', 's-33', 'safale s-33', 'safale s33'], type: 'top' },
  { keywords: ['wb06', 'wb-06', 'safale wb', 'safewit'], type: 'top' },
  { keywords: ['be134', 'be-134', 'safbrew be-134', 'safbrew be134', 'saison fermentis'], type: 'top' },
  { keywords: ['be256', 'be-256', 'safbrew be-256', 'safbrew be256', 'abbey fermentis'], type: 'top' },
  { keywords: ['t58', 't-58', 'safbrew t-58', 'safbrew t58'], type: 'top' },
  { keywords: ['k97', 'k-97', 'safale k-97', 'safale k97', 'kölsch fermentis'], type: 'top' },
  { keywords: ['f2', 'safbrew f-2'], type: 'top' },
  { keywords: ['lc-172', 'lc172', 'saflager lc'], type: 'bottom' },

  // ── Fermentis Safcider / Safspirit ───────────────────────────────────────
  { keywords: ['safcider', 'ab-1', 'cider fermentis'], type: 'top' },
  { keywords: ['safspirit', 'safspirit'], type: 'top' },

  // ── Lallemand / LalBrew ───────────────────────────────────────────────────
  { keywords: ['nottingham', 'lalbrew nottingham'], type: 'top' },
  { keywords: ['windsor', 'lalbrew windsor'], type: 'top' },
  { keywords: ['bry97', 'bry-97', 'lalbrew bry', 'west coast lalbrew'], type: 'top' },
  { keywords: ['cbc1', 'cbc-1', 'lalbrew cbc'], type: 'top' },
  { keywords: ['abbaye', 'lalbrew abbaye'], type: 'top' },
  { keywords: ['new england', 'lalbrew new england', 'neipa lalbrew'], type: 'top' },
  { keywords: ['verdant', 'lalbrew verdant'], type: 'top' },
  { keywords: ['farmhouse', 'lalbrew farmhouse'], type: 'top' },
  { keywords: ['philly sour', 'lalbrew philly'], type: 'top' },
  { keywords: ['lalbrew münchen', 'lalbrew munchen', 'lalbrew munich', 'lalbrew koln', 'lalbrew köln'], type: 'top' },
  { keywords: ['lalbrew voss', 'voss kveik', 'voss'], type: 'top' },
  { keywords: ['lalbrew oslo', 'oslo kveik'], type: 'top' },
  { keywords: ['lalbrew diamond', 'diamond lager', 'diamond lallemand'], type: 'bottom' },
  { keywords: ['lalbrew krispy', 'krispy lager'], type: 'bottom' },
  { keywords: ['lalbrew l17', 'l17 lager'], type: 'bottom' },

  // ── Mangrove Jack's ──────────────────────────────────────────────────────
  { keywords: ['mangrove m07', 'mj m07', 'm07 british ale'], type: 'top' },
  { keywords: ['mangrove m02', 'mj m02', 'm02 premium'], type: 'top' },
  { keywords: ['mangrove m10', 'mj m10', 'm10 workhorse'], type: 'top' },
  { keywords: ['mangrove m15', 'mj m15', 'm15 empire'], type: 'top' },
  { keywords: ['mangrove m20', 'mj m20', 'm20 bavarian wheat', 'm20 weizen'], type: 'top' },
  { keywords: ['mangrove m21', 'mj m21', 'm21 cider'], type: 'top' },
  { keywords: ['mangrove m27', 'mj m27', 'm27 belgian ale'], type: 'top' },
  { keywords: ['mangrove m31', 'mj m31', 'm31 bavarian lager'], type: 'bottom' },
  { keywords: ['mangrove m36', 'mj m36', 'm36 liberty bell'], type: 'top' },
  { keywords: ['mangrove m41', 'mj m41', 'm41 belgian'], type: 'top' },
  { keywords: ['mangrove m44', 'mj m44', 'm44 us west coast'], type: 'top' },
  { keywords: ['mangrove m47', 'mj m47', 'm47 belgian abbey'], type: 'top' },
  { keywords: ['mangrove m54', 'mj m54', 'm54 california lager'], type: 'bottom' },
  { keywords: ['mangrove m66', 'mj m66', 'm66 hop goblin'], type: 'top' },
  { keywords: ['mangrove m76', 'mj m76', 'm76 bavarian lager'], type: 'bottom' },
  { keywords: ['mangrove m79', 'mj m79', 'm79 burton union'], type: 'top' },
  { keywords: ['mangrove m84', 'mj m84', 'm84 bohemian lager'], type: 'bottom' },

  // ── Wyeast (Aktivator) ────────────────────────────────────────────────────
  // Top-gärig (Ale)
  { keywords: ['wy1056', 'wyeast 1056', 'american ale wyeast'], type: 'top' },
  { keywords: ['wy1084', 'wyeast 1084', 'irish ale wyeast'], type: 'top' },
  { keywords: ['wy1098', 'wyeast 1098', 'british ale wyeast'], type: 'top' },
  { keywords: ['wy1099', 'wyeast 1099', 'whitbread ale'], type: 'top' },
  { keywords: ['wy1187', 'wyeast 1187', 'ringwood ale'], type: 'top' },
  { keywords: ['wy1272', 'wyeast 1272', 'american ale ii'], type: 'top' },
  { keywords: ['wy1335', 'wyeast 1335', 'british ale ii'], type: 'top' },
  { keywords: ['wy1450', 'wyeast 1450', "denny's favorite"], type: 'top' },
  { keywords: ['wy1469', 'wyeast 1469', 'west yorkshire'], type: 'top' },
  { keywords: ['wy1728', 'wyeast 1728', 'scottish ale'], type: 'top' },
  { keywords: ['wy1762', 'wyeast 1762', 'belgian abbey ii'], type: 'top' },
  { keywords: ['wy1968', 'wyeast 1968', 'london esb'], type: 'top' },
  { keywords: ['wy3056', 'wyeast 3056', 'bavarian weizen blend'], type: 'top' },
  { keywords: ['wy3068', 'wyeast 3068', 'weihenstephan weizen'], type: 'top' },
  { keywords: ['wy3333', 'wyeast 3333', 'german wheat'], type: 'top' },
  { keywords: ['wy3463', 'wyeast 3463', 'forbidden fruit'], type: 'top' },
  { keywords: ['wy3522', 'wyeast 3522', 'belgian ardennes'], type: 'top' },
  { keywords: ['wy3638', 'wyeast 3638', 'bavarian wheat'], type: 'top' },
  { keywords: ['wy3711', 'wyeast 3711', 'french saison'], type: 'top' },
  { keywords: ['wy3724', 'wyeast 3724', 'belgian saison'], type: 'top' },
  { keywords: ['wy3787', 'wyeast 3787', 'trappist high gravity'], type: 'top' },
  { keywords: ['wy3864', 'wyeast 3864', 'canadian/belgian'], type: 'top' },
  { keywords: ['wy3944', 'wyeast 3944', 'belgian witbier'], type: 'top' },
  // Untergärig (Lager)
  { keywords: ['wy2035', 'wyeast 2035', 'american lager wyeast'], type: 'bottom' },
  { keywords: ['wy2042', 'wyeast 2042', 'danish lager'], type: 'bottom' },
  { keywords: ['wy2112', 'wyeast 2112', 'california lager'], type: 'bottom' },
  { keywords: ['wy2124', 'wyeast 2124', 'bohemian lager'], type: 'bottom' },
  { keywords: ['wy2178', 'wyeast 2178', 'pilsen lager'], type: 'bottom' },
  { keywords: ['wy2206', 'wyeast 2206', 'bavarian lager'], type: 'bottom' },
  { keywords: ['wy2247', 'wyeast 2247', 'european lager'], type: 'bottom' },
  { keywords: ['wy2278', 'wyeast 2278', 'czech pils'], type: 'bottom' },
  { keywords: ['wy2308', 'wyeast 2308', 'munich lager'], type: 'bottom' },
  { keywords: ['wy2352', 'wyeast 2352', 'munich lager ii'], type: 'bottom' },
  { keywords: ['wy2487', 'wyeast 2487', 'hella bock'], type: 'bottom' },
  { keywords: ['wy2633', 'wyeast 2633', 'oktoberfest lager'], type: 'bottom' },
  // Spontan
  { keywords: ['wy3278', 'wyeast 3278', 'belgian lambic blend'], type: 'spontaneous' },
  { keywords: ['wy3763', 'wyeast 3763', 'roeselare'], type: 'spontaneous' },
  { keywords: ['wy3191', 'wyeast 3191', 'berliner weisse'], type: 'spontaneous' },

  // ── White Labs ────────────────────────────────────────────────────────────
  // Top-gärig
  { keywords: ['wlp001', 'white labs 001', 'california ale wlp', 'wlp 001'], type: 'top' },
  { keywords: ['wlp002', 'white labs 002', 'english ale wlp', 'wlp 002'], type: 'top' },
  { keywords: ['wlp004', 'white labs 004', 'irish ale wlp', 'wlp 004'], type: 'top' },
  { keywords: ['wlp007', 'white labs 007', 'dry english ale', 'wlp 007'], type: 'top' },
  { keywords: ['wlp013', 'white labs 013', 'london ale wlp', 'wlp 013'], type: 'top' },
  { keywords: ['wlp023', 'white labs 023', 'burton ale wlp', 'wlp 023'], type: 'top' },
  { keywords: ['wlp028', 'white labs 028', 'edinburgh scottish', 'wlp 028'], type: 'top' },
  { keywords: ['wlp041', 'white labs 041', 'pacific ale wlp', 'wlp 041'], type: 'top' },
  { keywords: ['wlp051', 'white labs 051', 'california v ale', 'wlp 051'], type: 'top' },
  { keywords: ['wlp090', 'white labs 090', 'san diego super', 'wlp 090'], type: 'top' },
  { keywords: ['wlp300', 'white labs 300', 'hefeweizen wlp', 'wlp 300'], type: 'top' },
  { keywords: ['wlp320', 'white labs 320', 'american hefeweizen', 'wlp 320'], type: 'top' },
  { keywords: ['wlp351', 'white labs 351', 'bavarian weizen', 'wlp 351'], type: 'top' },
  { keywords: ['wlp380', 'white labs 380', 'hefeweizen iv', 'wlp 380'], type: 'top' },
  { keywords: ['wlp400', 'white labs 400', 'belgian wit', 'wlp 400'], type: 'top' },
  { keywords: ['wlp410', 'white labs 410', 'belgian wit ii', 'wlp 410'], type: 'top' },
  { keywords: ['wlp500', 'white labs 500', 'trappist ale wlp', 'wlp 500'], type: 'top' },
  { keywords: ['wlp510', 'white labs 510', 'bastogne belgian', 'wlp 510'], type: 'top' },
  { keywords: ['wlp530', 'white labs 530', 'abbey ale wlp', 'wlp 530'], type: 'top' },
  { keywords: ['wlp545', 'white labs 545', 'belgian strong ale', 'wlp 545'], type: 'top' },
  { keywords: ['wlp550', 'white labs 550', 'belgian ale wlp', 'wlp 550'], type: 'top' },
  { keywords: ['wlp565', 'white labs 565', 'belgian saison wlp', 'wlp 565'], type: 'top' },
  { keywords: ['wlp568', 'white labs 568', 'belgian style saison', 'wlp 568'], type: 'top' },
  { keywords: ['wlp570', 'white labs 570', 'belgian golden', 'wlp 570'], type: 'top' },
  { keywords: ['wlp630', 'white labs 630', 'berliner weisse', 'wlp 630'], type: 'top' },
  // Untergärig
  { keywords: ['wlp800', 'white labs 800', 'pilsner lager wlp', 'wlp 800'], type: 'bottom' },
  { keywords: ['wlp802', 'white labs 802', 'czech budejovice', 'wlp 802'], type: 'bottom' },
  { keywords: ['wlp820', 'white labs 820', 'oktoberfest wlp', 'wlp 820'], type: 'bottom' },
  { keywords: ['wlp830', 'white labs 830', 'german lager wlp', 'wlp 830'], type: 'bottom' },
  { keywords: ['wlp833', 'white labs 833', 'german bock wlp', 'wlp 833'], type: 'bottom' },
  { keywords: ['wlp835', 'white labs 835', 'german x lager', 'wlp 835'], type: 'bottom' },
  { keywords: ['wlp838', 'white labs 838', 'southern german lager', 'wlp 838'], type: 'bottom' },
  { keywords: ['wlp840', 'white labs 840', 'american lager wlp', 'wlp 840'], type: 'bottom' },
  { keywords: ['wlp862', 'white labs 862', 'cry havoc', 'wlp 862'], type: 'bottom' },
  { keywords: ['wlp885', 'white labs 885', 'zurich lager', 'wlp 885'], type: 'bottom' },
  // Spontan / Sour
  { keywords: ['wlp644', 'white labs 644', 'saccharomyces bruxellensis'], type: 'spontaneous' },
  { keywords: ['wlp645', 'white labs 645', 'brettanomyces claussenii'], type: 'spontaneous' },
  { keywords: ['wlp648', 'white labs 648', 'brettanomyces bruxellensis tres'], type: 'spontaneous' },
  { keywords: ['wlp650', 'white labs 650', 'brettanomyces bruxellensis'], type: 'spontaneous' },
  { keywords: ['wlp653', 'white labs 653', 'brettanomyces lambicus'], type: 'spontaneous' },
  { keywords: ['wlp655', 'white labs 655', 'belgian sour mix'], type: 'spontaneous' },
  { keywords: ['wlp665', 'white labs 665', 'flemish ale blend'], type: 'spontaneous' },
  { keywords: ['wlp672', 'white labs 672', 'lactobacillus brevis'], type: 'spontaneous' },

  // ── Omega Yeast Labs ──────────────────────────────────────────────────────
  { keywords: ['omega oly001', 'old faithfull omega'], type: 'top' },
  { keywords: ['omega oly004', 'british omega'], type: 'top' },
  { keywords: ['omega oly010', 'cosmic punch omega', 'thiolized omega'], type: 'top' },
  { keywords: ['omega oly011', 'tropical iipa omega'], type: 'top' },
  { keywords: ['omega oly061', 'voss omega', 'voss kveik omega'], type: 'top' },
  { keywords: ['omega oly071', 'lutra omega', 'lutra kveik'], type: 'bottom' },

  // ── Kveik / Norweg. Hefen ────────────────────────────────────────────────
  { keywords: ['kveik', 'hornindal', 'stranda', 'ebbegarden', 'sigmund'], type: 'top' },
  { keywords: ['lutra kveik', 'lutra lager'], type: 'bottom' },

  // ── Generische Gattungsnamen (niedrigste Priorität) ───────────────────────
  { keywords: ['brett', 'brettanomyces'], type: 'spontaneous' },
  { keywords: ['lambic', 'lambik', 'gueuze', 'geuze', 'kriek', 'faro'], type: 'spontaneous' },
  { keywords: ['lactobacillus', 'lacto', 'pediococcus'], type: 'spontaneous' },
  { keywords: ['saflager', 'lager hefe', 'lagerhefe', 'untergärig', 'untergaerig'], type: 'bottom' },
  { keywords: ['safale', 'ale hefe', 'alehefe', 'obergärig', 'obergaerig'], type: 'top' },
];

/**
 * Ermittelt den Gärungstyp aus einem Hefenamen (+ optionaler Bierstil als Fallback).
 * Gibt `null` zurück wenn keine Zuordnung möglich.
 */
export function inferFermentationType(yeastNames: string[], style: string): FermentationType | null {
  const combined = yeastNames.join(' ');

  // 1. Versuch: Hefename gegen Datenbank
  for (const entry of YEAST_DB) {
    if (matchesAny(combined, entry.keywords)) return entry.type;
  }

  // 2. Fallback: Bierstil (weniger zuverlässig)
  const s = style.toLowerCase();
  if (/\b(lager|märzen|maerzen|helles|dunkel|bock|doppelbock|eisbock|rauchbier|pils|pilsner|pilsener|schwarz|schwarzbier|zwickel|kellerbier|steam beer)\b/.test(s)) return 'bottom';
  if (/\b(ipa|ale|pale ale|stout|porter|weizen|weisse|wit|witbier|saison|farmhouse|dubbel|tripel|quad|golden strong|bitter|epa|neipa|dipa|barleywine|old ale|scotch ale|kolsch|kölsch|cream ale|brown ale|amber ale|red ale|rye ale|berliner|gose|hefeweizen|dunkelweizen)\b/.test(s)) return 'top';
  if (/\b(lambic|gueuze|kriek|faro|flanders|oud bruin|geuze|spontan|wild ale)\b/.test(s)) return 'spontaneous';

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MASH METHOD – Maischeschritte + Zutaten → Braumethode
// ─────────────────────────────────────────────────────────────────────────────

type MashMethod = 'all_grain' | 'extract' | 'partial_mash';

/** Zutaten-Keywords die auf Malzextrakt hindeuten */
const EXTRACT_INGREDIENT_KEYWORDS = [
  // Deutsch
  'malzextrakt', 'flüssigmalzextrakt', 'trockenmalzextrakt', 'flüssig malzextrakt',
  'trockener malzextrakt', 'malzsirup',
  // Englisch / Abkürzungen
  'liquid malt extract', 'dry malt extract', 'lme', 'dme',
  'malt extract', 'malt syrup',
  // Marken/Produkte
  'briess cbe', 'briess pilsen', 'briess wheat', 'muntons extra light',
  'muntons light', 'muntons amber', 'muntons dark',
  'alexanders', 'coopers lme', 'coopers dme',
  'pilsner lme', 'pilsner dme', 'extra light dme', 'extra light lme',
  'wheat lme', 'wheat dme', 'amber lme', 'amber dme',
  'dark lme', 'dark dme', 'munich lme', 'munich dme',
];

/**
 * Ermittelt die Braumethode.
 * - Maischeschritte vorhanden + Extrakt-Zutat → partial_mash
 * - Nur Maischeschritte → all_grain
 * - Keine Maischeschritte + Extrakt → extract
 * - Keine Maischeschritte + kein Extrakt → extract (Standardannahme ohne Daten)
 */
export function inferMashMethod(
  mashSteps: unknown[],
  malts: { name?: string }[]
): MashMethod {
  const hasSteps = Array.isArray(mashSteps) && mashSteps.length > 0;
  const maltText = (malts || []).map(m => m?.name || '').join(' ');
  const hasExtract = EXTRACT_INGREDIENT_KEYWORDS.some(kw =>
    maltText.toLowerCase().includes(kw.toLowerCase())
  );

  if (hasSteps && hasExtract) return 'partial_mash';
  if (hasSteps) return 'all_grain';
  if (hasExtract) return 'extract';
  return 'extract'; // Standardannahme: kein Schritt, kein Extrakt = Extrakt-Brauer
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MASH PROCESS – Maischeschritte → Maischeverfahren
// ─────────────────────────────────────────────────────────────────────────────

type MashProcess = 'infusion' | 'step_mash' | 'decoction' | 'biab' | 'no_sparge';

/** Keywords die auf Dekoktion hindeuten (in Schrittnamen) */
const DECOCTION_KEYWORDS = [
  'dekoktion', 'decoction', 'abmaischen', 'maischeabzug',
  'kochmaische', 'kochung',
];

/** Keywords die auf BIAB hindeuten */
const BIAB_KEYWORDS = [
  'biab', 'brew in a bag', 'brew-in-a-bag', 'tütenbrauen',
];

/** Keywords die auf No-Sparge hindeuten */
const NO_SPARGE_KEYWORDS = [
  'no sparge', 'no-sparge', 'kein abläutern', 'parti-gyle',
];

/**
 * Ermittelt das Maischeverfahren aus den Maischeschritten.
 * - BIAB / No-Sparge Keywords → biab / no_sparge
 * - Schrittnamen mit "Dekoktion" → decoction
 * - 1 Schritt → infusion
 * - Mehrere Schritte → step_mash
 * - Keine Schritte → null
 */
export function inferMashProcess(mashSteps: { name?: string; type?: string }[]): MashProcess | null {
  if (!Array.isArray(mashSteps) || mashSteps.length === 0) return null;

  const allNames = mashSteps.map(s => (s?.name || s?.type || '')).join(' ');

  // BIAB hat Vorrang
  if (BIAB_KEYWORDS.some(kw => allNames.toLowerCase().includes(kw.toLowerCase()))) return 'biab';

  // No-Sparge
  if (NO_SPARGE_KEYWORDS.some(kw => allNames.toLowerCase().includes(kw.toLowerCase()))) return 'no_sparge';

  // Dekoktion
  if (DECOCTION_KEYWORDS.some(kw => allNames.toLowerCase().includes(kw.toLowerCase()))) return 'decoction';

  // Anzahl-basiert
  if (mashSteps.length === 1) return 'infusion';
  return 'step_mash';
}
