/**
 * Client-seitige BeerXML v1 + BeerJSON v2 Exporter
 * Konvertiert BotlLab brew.data → Standardformate für externe Brau-Software.
 */

function safeNum(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? fallback : n;
}

function ebcToLovibond(ebc: number): number {
  return (ebc + 0.6) / 1.97;
}

function escapeXml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── BeerXML ──────────────────────────────────────────────────────────────────

export function generateBeerXML(brew: any): string {
  const data = brew.data ?? {};
  const malts: any[]  = data.malts  ?? [];
  const hops:  any[]  = data.hops   ?? [];
  const yeasts: any[] = data.yeast  ?? [];
  const mashSteps: any[] = data.mash_steps ?? [];

  const batchL    = safeNum(data.batch_size_liters, 20);
  const boilTime  = safeNum(data.boil_time, 60);
  const efficiency = safeNum(data.efficiency, 75);

  const HOP_USE: Record<string, string> = {
    boil: 'Boil', dry_hop: 'Dry Hop', whirlpool: 'Aroma', mash: 'First Wort',
  };

  const fermentables = malts.map(m => {
    const kg = m.unit === 'g' ? safeNum(m.amount) / 1000 : safeNum(m.amount);
    const ebc = safeNum(m.color_ebc, 4);
    return `    <FERMENTABLE>
      <NAME>${escapeXml(m.name)}</NAME>
      <VERSION>1</VERSION>
      <TYPE>Grain</TYPE>
      <AMOUNT>${kg.toFixed(3)}</AMOUNT>
      <YIELD>${efficiency.toFixed(1)}</YIELD>
      <COLOR>${ebcToLovibond(ebc).toFixed(1)}</COLOR>
    </FERMENTABLE>`;
  }).join('\n');

  const hopEntries = hops.map(h => {
    const kg = h.unit === 'kg' ? safeNum(h.amount) : safeNum(h.amount) / 1000;
    return `    <HOP>
      <NAME>${escapeXml(h.name)}</NAME>
      <VERSION>1</VERSION>
      <ALPHA>${safeNum(h.alpha, 5).toFixed(1)}</ALPHA>
      <AMOUNT>${kg.toFixed(4)}</AMOUNT>
      <USE>${HOP_USE[h.usage] ?? 'Boil'}</USE>
      <TIME>${safeNum(h.time, 0).toFixed(0)}</TIME>
    </HOP>`;
  }).join('\n');

  const yeastEntries = yeasts.map(y => {
    const attenLine = y.attenuation
      ? `\n      <ATTENUATION>${safeNum(y.attenuation).toFixed(1)}</ATTENUATION>`
      : '';
    return `    <YEAST>
      <NAME>${escapeXml(y.name)}</NAME>
      <VERSION>1</VERSION>
      <TYPE>Ale</TYPE>
      <FORM>Dry</FORM>
      <AMOUNT>${safeNum(y.amount, 1).toFixed(2)}</AMOUNT>${attenLine}
    </YEAST>`;
  }).join('\n');

  const STEP_TYPE: Record<string, string> = {
    rest: 'Infusion', decoction: 'Decoction', mashout: 'Temperature', strike: 'Infusion',
  };

  const steps = mashSteps.length > 0
    ? mashSteps.map((s: any) => `      <MASH_STEP>
        <NAME>${escapeXml(s.name ?? 'Rast')}</NAME>
        <VERSION>1</VERSION>
        <TYPE>${STEP_TYPE[s.step_type] ?? 'Infusion'}</TYPE>
        <STEP_TEMP>${safeNum(s.temperature, 66).toFixed(1)}</STEP_TEMP>
        <STEP_TIME>${safeNum(s.duration, 60).toFixed(0)}</STEP_TIME>
      </MASH_STEP>`).join('\n')
    : `      <MASH_STEP>
        <NAME>Einmaischen</NAME>
        <VERSION>1</VERSION>
        <TYPE>Infusion</TYPE>
        <STEP_TEMP>66.0</STEP_TEMP>
        <STEP_TIME>60</STEP_TIME>
      </MASH_STEP>`;

  const styleBlock = brew.style ? `
    <STYLE>
      <NAME>${escapeXml(brew.style)}</NAME>
      <VERSION>1</VERSION>
      <CATEGORY>${escapeXml(brew.style)}</CATEGORY>
      <CATEGORY_NUMBER>1</CATEGORY_NUMBER>
      <STYLE_LETTER>A</STYLE_LETTER>
      <STYLE_GUIDE>BJCP</STYLE_GUIDE>
      <TYPE>Ale</TYPE>
    </STYLE>` : '';

  const notesLine = data.notes
    ? `\n    <NOTES>${escapeXml(data.notes)}</NOTES>` : '';
  const descLine = brew.description
    ? `\n    <TASTE_NOTES>${escapeXml(brew.description)}</TASTE_NOTES>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<RECIPES>
  <RECIPE>
    <NAME>${escapeXml(brew.name)}</NAME>
    <VERSION>1</VERSION>
    <TYPE>All Grain</TYPE>
    <BREWER>BotlLab Export</BREWER>
    <BATCH_SIZE>${batchL.toFixed(1)}</BATCH_SIZE>
    <BOIL_SIZE>${(batchL * 1.15).toFixed(1)}</BOIL_SIZE>
    <BOIL_TIME>${boilTime.toFixed(0)}</BOIL_TIME>
    <EFFICIENCY>${efficiency.toFixed(1)}</EFFICIENCY>${styleBlock}
    <FERMENTABLES>
${fermentables}
    </FERMENTABLES>
    <HOPS>
${hopEntries}
    </HOPS>
    <YEASTS>
${yeastEntries}
    </YEASTS>
    <MASH>
      <NAME>Maische</NAME>
      <VERSION>1</VERSION>
      <MASH_STEPS>
${steps}
      </MASH_STEPS>
    </MASH>${notesLine}${descLine}
  </RECIPE>
</RECIPES>`;
}

// ── BeerJSON ─────────────────────────────────────────────────────────────────

export function generateBeerJSON(brew: any): string {
  const data = brew.data ?? {};
  const malts: any[]  = data.malts  ?? [];
  const hops:  any[]  = data.hops   ?? [];
  const yeasts: any[] = data.yeast  ?? [];
  const mashSteps: any[] = data.mash_steps ?? [];

  const batchL     = safeNum(data.batch_size_liters, 20);
  const boilTime   = safeNum(data.boil_time, 60);
  const efficiency = safeNum(data.efficiency, 75);

  const HOP_USE: Record<string, string> = {
    boil: 'boil', dry_hop: 'dry hop', whirlpool: 'whirlpool', mash: 'mash',
  };

  const fermentable_additions = malts.map(m => ({
    name: m.name,
    type: 'grain',
    amount: {
      value: m.unit === 'g' ? safeNum(m.amount) / 1000 : safeNum(m.amount),
      unit: 'kg',
    },
    color: { value: safeNum(m.color_ebc, 4), unit: 'EBC' },
  }));

  const hop_additions = hops.map(h => ({
    name: h.name,
    alpha_acid: { value: safeNum(h.alpha, 5), unit: '%' },
    amount: {
      value: h.unit === 'kg' ? safeNum(h.amount) * 1000 : safeNum(h.amount),
      unit: 'g',
    },
    timing: {
      use: HOP_USE[h.usage] ?? 'boil',
      time: { value: safeNum(h.time, 0), unit: 'min' },
    },
  }));

  const culture_additions = yeasts.map(y => ({
    name: y.name,
    type: 'dry',
    amount: { value: safeNum(y.amount, 1), unit: y.unit ?? 'pkg' },
    ...(y.attenuation && {
      attenuation: { value: safeNum(y.attenuation), unit: '%' },
    }),
  }));

  const STEP_TYPE: Record<string, string> = {
    rest: 'infusion', decoction: 'decoction', mashout: 'temperature', strike: 'infusion',
  };

  const mash_steps = mashSteps.length > 0
    ? mashSteps.map((s: any) => ({
        name: s.name ?? 'Rast',
        type: STEP_TYPE[s.step_type] ?? 'infusion',
        step_temperature: { value: safeNum(s.temperature, 66), unit: 'C' },
        step_time: { value: safeNum(s.duration, 60), unit: 'min' },
      }))
    : [{ name: 'Einmaischen', type: 'infusion', step_temperature: { value: 66, unit: 'C' }, step_time: { value: 60, unit: 'min' } }];

  const recipe: Record<string, unknown> = {
    name: brew.name,
    type: 'all grain',
    author: 'BotlLab Export',
    batch_size: { value: batchL, unit: 'l' },
    boil_time: { value: boilTime, unit: 'min' },
    efficiency: { brewhouse: { value: efficiency, unit: '%' } },
    ingredients: { fermentable_additions, hop_additions, culture_additions },
    mash: { name: 'Maische', mash_steps },
  };

  if (brew.style) recipe.style = { name: brew.style, style_guide: 'BJCP' };
  if (data.notes || brew.description) recipe.notes = data.notes || brew.description;

  return JSON.stringify({ beerjson: { version: 2.0, recipes: [recipe] } }, null, 2);
}

// ── Download-Helper ───────────────────────────────────────────────────────────

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportBrew(brew: any, format: 'beerxml' | 'beerjson'): void {
  const base = slugify(brew.name || 'rezept');
  if (format === 'beerxml') {
    downloadFile(`${base}.xml`, generateBeerXML(brew), 'application/xml');
  } else {
    downloadFile(`${base}.json`, generateBeerJSON(brew), 'application/json');
  }
}
