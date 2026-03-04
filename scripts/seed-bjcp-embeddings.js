/**
 * BotlGuide — BJCP Embeddings Seed Script
 *
 * Generates Gemini text-embedding-004 vectors for all BJCP styles in
 * lib/botlguide/bjcp-styles.ts and stores them in `botlguide_embeddings`.
 *
 * This is a one-time setup script. Re-run if BJCP styles are updated.
 *
 * Usage (from workspace root):
 *   node scripts/seed-bjcp-embeddings.js
 *
 * Required env vars (in .env.local or .env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GEMINI_API_KEY / NEXT_PUBLIC_GEMINI_API_KEY
 *
 * The script calls the `botlguide-embed` Supabase Edge Function in batches
 * to avoid rate limit issues.
 */

// @ts-check
const path = require('path')

// Load env from .env.local
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })
} catch {
  // dotenv optional
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/botlguide-embed`

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

// ── BJCP Styles (duplicated here as plain JS to avoid TS transpilation) ───────
// These are the same 50 styles as in lib/botlguide/bjcp-styles.ts.
// If you update that file, update this list too (or set up a ts-node call).

/** @type {Array<{code: string, category: string, name: string, nameDe: string, ogMin: number, ogMax: number, fgMin: number, fgMax: number, abvMin: number, abvMax: number, ibuMin: number, ibuMax: number, srmMin: number, srmMax: number, ebcMin: number, ebcMax: number, description: string, typicalIngredients: string, examples: string}>} */
const BJCP_STYLES = [
  { code: '1A', category: 'American Light Lager', name: 'American Light Lager', nameDe: 'Amerikanisches Helles Lager', ogMin: 1.028, ogMax: 1.040, fgMin: 0.998, fgMax: 1.008, abvMin: 2.8, abvMax: 4.2, ibuMin: 8, ibuMax: 12, srmMin: 2, srmMax: 3, ebcMin: 4, ebcMax: 6, description: 'Sehr helles, klares, sehr schwach gehopftes Bier. Kaum Malz- oder Hopfenaromen. Erfrischend und leicht. Sehr hohe Vergärungsgrade.', typicalIngredients: 'Pilsnermalz, Mais oder Reis als Adjunkte, neutrale Lagerhefe', examples: 'Bud Light, Coors Light, Miller Lite' },
  { code: '1B', category: 'American Lager', name: 'American Lager', nameDe: 'Amerikanisches Lager', ogMin: 1.040, ogMax: 1.050, fgMin: 1.004, fgMax: 1.010, abvMin: 4.2, abvMax: 5.3, ibuMin: 8, ibuMax: 18, srmMin: 2, srmMax: 4, ebcMin: 4, ebcMax: 8, description: 'Helles, klares Bier mit geringem Malzcharakter. Sehr geringe Hopfenbitterness. Sauber, crisp, erfrischend.', typicalIngredients: 'Pilsnermalz, Mais oder Reis, neutrale Lagerhefe', examples: 'Budweiser, Corona Extra, Pabst Blue Ribbon' },
  { code: '3A', category: 'Czech Lager', name: 'Czech Pale Lager', nameDe: 'Tschechisches Helles Lager', ogMin: 1.028, ogMax: 1.044, fgMin: 1.008, fgMax: 1.014, abvMin: 3.0, abvMax: 4.1, ibuMin: 20, ibuMax: 35, srmMin: 3, srmMax: 6, ebcMin: 6, ebcMax: 12, description: 'Schlankes, hopfenbetontes Bier mit weichem Malzkörper. Charakteristisches Saaz-Hopfenaroma. Sahnige Bitterness.', typicalIngredients: 'Bohemisches Pilsnermalz, Saaz-Hopfen, weiche böhmische Lagerhefe', examples: 'Budvar 11°, Březňák, Notch Session Pils' },
  { code: '5B', category: 'Pale Bitter European Beer', name: 'Kölsch', nameDe: 'Kölsch', ogMin: 1.044, ogMax: 1.050, fgMin: 1.007, fgMax: 1.011, abvMin: 4.4, abvMax: 5.2, ibuMin: 18, ibuMax: 30, srmMin: 3.5, srmMax: 5, ebcMin: 7, ebcMax: 10, description: 'Zart-fruchtig, frisch, helles, von oben vergoren. Leichte Malzsüße und dezente Hopfenbitterness. Weinige Fruchtaromen.', typicalIngredients: 'Pilsnermalz, bis 20% Weizenmalz, Hallertau/Spalt, Kölsch-Hefe', examples: 'Reissdorf, Früh, Dom Kölsch, Gaffel' },
  { code: '5D', category: 'Pale Bitter European Beer', name: 'German Pils', nameDe: 'Deutsches Pils', ogMin: 1.044, ogMax: 1.050, fgMin: 1.008, fgMax: 1.013, abvMin: 4.4, abvMax: 5.2, ibuMin: 22, ibuMax: 40, srmMin: 2, srmMax: 5, ebcMin: 4, ebcMax: 10, description: 'Trocken, hopfenbetont, clear und crispe Bitterness. Minimale Malzsüße. Deutliches Hopfenaroma (Noble Hops).', typicalIngredients: 'Pilsnermalz, Hallertau/Spalt/Tettnang Noble Hops, trockene Lagerhefe', examples: 'Jever Pils, König Pils, Bitburger, Warsteiner' },
  { code: '6A', category: 'Amber Malty European Lager', name: 'Märzenbier/Oktoberfest', nameDe: 'Märzenbier / Oktoberfest', ogMin: 1.054, ogMax: 1.060, fgMin: 1.010, fgMax: 1.014, abvMin: 5.8, abvMax: 6.3, ibuMin: 18, ibuMax: 24, srmMin: 8, srmMax: 17, ebcMin: 16, ebcMax: 34, description: 'Malzreich, vollmundig, Karamell- und Brotharomen. Sauber mit weicher Hopfenbitterness. Kupfer- bis bernsteinfarbig.', typicalIngredients: 'Wiener Malz, Münchnermalz, Noble Hops, bayerische Lagerhefe', examples: 'Paulaner Urmarzen, Hacker-Pschorr Märzen, Ayinger Oktoberfest' },
  { code: '7A', category: 'Amber Bitter European Beer', name: 'Vienna Lager', nameDe: 'Wiener Lager', ogMin: 1.048, ogMax: 1.055, fgMin: 1.010, fgMax: 1.014, abvMin: 4.7, abvMax: 5.5, ibuMin: 18, ibuMax: 30, srmMin: 9, srmMax: 15, ebcMin: 18, ebcMax: 30, description: 'Weich-malziges Bier mit Toast- und Karamellaroma. Mäßige Hopfenbitterness, sauber trocken. Kupfer- bis bernsteinfarben.', typicalIngredients: 'Wiener Malz, Münchner Malz, Saaz/Hallertau, mittelfrische Lagerhefe', examples: 'Ottakringer Wiener Original, Negra Modelo, Devils Backbone Vienna' },
  { code: '8A', category: 'Dark European Lager', name: 'Munich Dunkel', nameDe: 'Münchner Dunkel', ogMin: 1.048, ogMax: 1.056, fgMin: 1.010, fgMax: 1.016, abvMin: 4.5, abvMax: 5.6, ibuMin: 18, ibuMax: 28, srmMin: 17, srmMax: 28, ebcMin: 34, ebcMax: 55, description: 'Malzreich, Brot-, Nuss- und Schokoladenaromen. Geringe bis mäßige Hopfenbitterness. Vollmundig, sauber, trocken im Abgang.', typicalIngredients: 'Münchner Dunkelmalz, Caramünch, Röstmalz, Hallertau, Münchner Lagerhefe', examples: 'Ayinger Altbairisch Dunkel, Hacker-Pschorr Münchner Dunkel' },
  { code: '9A', category: 'Strong European Beer', name: 'Doppelbock', nameDe: 'Doppelbock', ogMin: 1.072, ogMax: 1.112, fgMin: 1.016, fgMax: 1.024, abvMin: 7.0, abvMax: 10.0, ibuMin: 16, ibuMax: 26, srmMin: 6, srmMax: 25, ebcMin: 12, ebcMax: 50, description: 'Sehr malzreich, süßlich bis trocken. Karamell-, Toffee-, Dörrobst-Aromen. Geringe Hopfenbitterness. Vollmundig, wärmend.', typicalIngredients: 'Münchnermalz, Pilsnermalz, Karamellmalze, Noble Hops, Münchner Lagerhefe', examples: 'Paulaner Salvator, Ayinger Celebrator, Weihenstephaner Korbinian' },
  { code: '10A', category: 'German Wheat Beer', name: 'Weissbier', nameDe: 'Weißbier / Hefeweizen', ogMin: 1.044, ogMax: 1.052, fgMin: 1.010, fgMax: 1.014, abvMin: 4.3, abvMax: 5.6, ibuMin: 8, ibuMax: 15, srmMin: 2, srmMax: 6, ebcMin: 4, ebcMax: 12, description: 'Fruchtiger Bananenester und rauchige Gewürznelkencharakter. Trüb, cremig, hohe Kohlensäure. Weich und erfrischend.', typicalIngredients: '50%+ Weizenmalz, Pilsnermalz, Hallertau, hefeweizen-typische Weizenhefe', examples: 'Weihenstephaner Hefeweissbier, Paulaner Hefe-Weißbier, Schneider Weisse Tap 7' },
  { code: '10C', category: 'German Wheat Beer', name: 'Weizenbock', nameDe: 'Weizenbock', ogMin: 1.064, ogMax: 1.090, fgMin: 1.015, fgMax: 1.022, abvMin: 6.5, abvMax: 9.0, ibuMin: 15, ibuMax: 30, srmMin: 6, srmMax: 25, ebcMin: 12, ebcMax: 50, description: 'Starkes Weizenbier mit reifen Früchten (Banane, Vanille), Karamell. Komplex, wärmend, vollmundig. Wenig Hopfenbitterness.', typicalIngredients: 'Weizenmalz, Münchnermalz, Karamellmalz, Weizenbockhefe', examples: 'Schneider Aventinus, Ayinger Weizenbock, Weihenstephaner Vitus' },
  { code: '15A', category: 'Irish Beer', name: 'Irish Red Ale', nameDe: 'Irish Red Ale', ogMin: 1.036, ogMax: 1.046, fgMin: 1.010, fgMax: 1.014, abvMin: 3.8, abvMax: 5.0, ibuMin: 18, ibuMax: 28, srmMin: 9, srmMax: 14, ebcMin: 18, ebcMax: 28, description: 'Kupferrot, malzreich, leichte Caramel-Süße, röstiger Einschlag im Abgang. Geringe Hopfenbitterness. Sauber mit mittlerem Körper.', typicalIngredients: 'Irish/British Pale Malz, Crystal 150, geringe Röstgerste, UK Hopfen, irische Ale-Hefe', examples: 'Smithwick\'s, Murphy\'s Irish Red, Kilkenny' },
  { code: '15B', category: 'Irish Beer', name: 'Irish Stout', nameDe: 'Irish Stout', ogMin: 1.036, ogMax: 1.044, fgMin: 1.007, fgMax: 1.011, abvMin: 4.0, abvMax: 4.5, ibuMin: 25, ibuMax: 45, srmMin: 25, srmMax: 40, ebcMin: 50, ebcMax: 79, description: 'Trocken, röstiger Kaffeecharakter ohne Süße. Stickstoffkarbonisierung ergibt cremige Textur. Bitterness dominiert den Abgang.', typicalIngredients: 'Pale Malz, Röstgerste (ungemälzt), Flaked Barley, UK Hopfen, Dry Stout Hefe', examples: 'Guinness Draught, Murphy\'s Irish Stout, Beamish Irish Stout' },
  { code: '18A', category: 'Pale American Ale', name: 'Blonde Ale', nameDe: 'Blonde Ale', ogMin: 1.038, ogMax: 1.054, fgMin: 1.008, fgMax: 1.013, abvMin: 3.8, abvMax: 5.5, ibuMin: 15, ibuMax: 28, srmMin: 3, srmMax: 6, ebcMin: 6, ebcMax: 12, description: 'Hell, zugänglich, ausgewogen. Geringe bis mäßige Malzsüße, keine Fruchtester. Sauber-erfrischend, sanfte Hopfennoten.', typicalIngredients: 'Pale 2-Row oder Pilsnermalz, US Hopfen, neutrale US Ale-Hefe', examples: 'Kona Big Wave, Widmer Blonde, Sierra Nevada Summerfest' },
  { code: '18B', category: 'Pale American Ale', name: 'American Pale Ale', nameDe: 'American Pale Ale', ogMin: 1.045, ogMax: 1.060, fgMin: 1.010, fgMax: 1.015, abvMin: 4.5, abvMax: 6.2, ibuMin: 30, ibuMax: 50, srmMin: 5, srmMax: 10, ebcMin: 10, ebcMax: 20, description: 'Hopfenbetont mit charakteristischen US Hopfenaromen (Zitrus, Kiefer, tropische Früchte). Moderater Malzkörper, trockener Abgang.', typicalIngredients: 'American 2-Row, Crystal 40, Cascade/Centennial/Simcoe, US Ale-Hefe', examples: 'Sierra Nevada Pale Ale, Deschutes Mirror Pond, Three Floyds Zombie Dust' },
  { code: '21A', category: 'IPA', name: 'American IPA', nameDe: 'American IPA', ogMin: 1.056, ogMax: 1.070, fgMin: 1.008, fgMax: 1.014, abvMin: 5.5, abvMax: 7.5, ibuMin: 40, ibuMax: 70, srmMin: 6, srmMax: 14, ebcMin: 12, ebcMax: 28, description: 'Hopfenbetont mit intensiven US Hopfenaromen (Zitrus, Kiefer, tropical). Mittlerer Malzkörper, trockener, bitter-langer Abgang.', typicalIngredients: '2-Row Pale Malz, Crystal 30-60, Cascade/Centennial/Chinook/Citra/Simcoe, US 1056', examples: 'Bell\'s Two Hearted, Dogfish Head 60 Minute, Founders Centennial IPA' },
  { code: '21B', category: 'IPA', name: 'Specialty IPA: New England IPA', nameDe: 'New England IPA (NEIPA / Hazy IPA)', ogMin: 1.060, ogMax: 1.085, fgMin: 1.010, fgMax: 1.015, abvMin: 6.0, abvMax: 9.0, ibuMin: 25, ibuMax: 60, srmMin: 3, srmMax: 7, ebcMin: 6, ebcMax: 14, description: 'Trüb, saftiger Fruchtcharakter (Mango, Pfirsich, Zitrus). Softer Körper durch Haze-Techniken. Geringere wahrnehmbare Bitterness trotz hoher IBU.', typicalIngredients: 'Pilsnermalz, Weizenmalz/Haferflocken (30%+), hohe Dry-Hop-Mengen (Citra, Mosaic, Galaxy), hazy-fördernde Hefe', examples: 'The Alchemist Heady Topper, Tree House Julius, Trillium Fort Point' },
  { code: '22A', category: 'Strong American Ale', name: 'Double IPA', nameDe: 'Double / Imperial IPA (DIPA)', ogMin: 1.065, ogMax: 1.085, fgMin: 1.008, fgMax: 1.018, abvMin: 7.5, abvMax: 10.0, ibuMin: 60, ibuMax: 120, srmMin: 6, srmMax: 14, ebcMin: 12, ebcMax: 28, description: 'Intensiv hopfig, tropische Früchte und Kiefernharz dominieren. Starker Alkohol, dennoch trockener Körper. Extrem bitter.', typicalIngredients: '2-Row, minimale Crystal-Malze, hohe Hopfenmengen Citra/Simcoe/Chinook, clean US Hefe', examples: 'Pliny the Elder, Stone Ruination, Dogfish Head 90 Minute' },
  { code: '24A', category: 'Belgian Ale', name: 'Witbier', nameDe: 'Witbier / Weißbier (Belgisch)', ogMin: 1.044, ogMax: 1.052, fgMin: 1.008, fgMax: 1.012, abvMin: 4.5, abvMax: 5.5, ibuMin: 8, ibuMax: 20, srmMin: 2, srmMax: 4, ebcMin: 4, ebcMax: 8, description: 'Treibig, hell, würzig. Koriander und getrocknete Orangenschale. Leichte Weizensäure, weiche Cremung. Erfrischend trocken.', typicalIngredients: '>50% ungem. Weizen, Pilsnermalz, Hafer optional, Koriander, Bitterorangeschale, belgische Weizenhefe', examples: 'Hoegaarden, Blue Moon Belgian White, Ommegang Witte' },
  { code: '25B', category: 'Strong Belgian Ale', name: 'Saison', nameDe: 'Saison', ogMin: 1.048, ogMax: 1.065, fgMin: 1.002, fgMax: 1.012, abvMin: 3.5, abvMax: 9.0, ibuMin: 20, ibuMax: 35, srmMin: 5, srmMax: 14, ebcMin: 10, ebcMax: 28, description: 'Sehr trocken, hochvergoren. Würzig-fruchtig mit Pfeffer, Zitrus, Erd- und Blumenaromen. Hochkarbonisiert, erfrischend, komplex.', typicalIngredients: 'Pilsnermalz, Weizen, Hafer, Gewürze optional, belgische Saison-Hefe, Noble + peppery Hops', examples: 'Saison Dupont, Fantôme Saison, Brooklyn Sorachi Ace' },
  { code: '25C', category: 'Strong Belgian Ale', name: 'Belgian Golden Strong Ale', nameDe: 'Belgisches Golden Strong Ale', ogMin: 1.070, ogMax: 1.095, fgMin: 1.005, fgMax: 1.016, abvMin: 7.5, abvMax: 10.5, ibuMin: 22, ibuMax: 35, srmMin: 3, srmMax: 6, ebcMin: 6, ebcMax: 12, description: 'Hoch alkoholisch, hell, trocken. Fruchtig-würzige belgische Hefe-Ester. Gefährlich: Alkohol kaum wahrnehmbar durch trocken-sauberes Profil.', typicalIngredients: 'Pilsnermalz, Kandiszucker (hell, >20%), belgische Hopfen, Duvel-Hefe-Strain', examples: 'Duvel, Delirium Tremens, Piraat, Judas' },
  { code: '26B', category: 'Monastic Ale', name: 'Belgian Dubbel', nameDe: 'Belgisches Dubbel', ogMin: 1.062, ogMax: 1.075, fgMin: 1.008, fgMax: 1.018, abvMin: 6.0, abvMax: 7.6, ibuMin: 15, ibuMax: 25, srmMin: 10, srmMax: 17, ebcMin: 20, ebcMax: 34, description: 'Dunkle Früchte (Pflaumen, Kirschen, Rosinen), Karamell, Schokolade. Würzige Hefe. Alkohol wärmend. Weicher, vollmundiger Körper.', typicalIngredients: 'Pilsnermalz, dunkler Kandiszucker, Special B, belgische Trappisten/Abbaye Hefe', examples: 'Westmalle Dubbel, Chimay Red, La Trappe Dubbel' },
  { code: '26C', category: 'Monastic Ale', name: 'Belgian Tripel', nameDe: 'Belgisches Tripel', ogMin: 1.075, ogMax: 1.085, fgMin: 1.008, fgMax: 1.014, abvMin: 7.5, abvMax: 9.5, ibuMin: 20, ibuMax: 40, srmMin: 4.5, srmMax: 7, ebcMin: 9, ebcMax: 14, description: 'Hell, stark, würzig und fruchtig. Hohe Vergärung durch Kandiszucker. Komplex mit Gewürznelken, Orangen, Honig. Trocken-sauber.', typicalIngredients: 'Pilsnermalz, heller Kandiszucker (15-25%), belgische Trappisten-Hefe, Styrian Goldings', examples: 'Westmalle Tripel, Chimay White, St. Bernardus Tripel' },
  { code: '26D', category: 'Monastic Ale', name: 'Belgian Dark Strong Ale', nameDe: 'Belgisches Dark Strong Ale / Quadrupel', ogMin: 1.075, ogMax: 1.110, fgMin: 1.010, fgMax: 1.024, abvMin: 8.0, abvMax: 12.0, ibuMin: 20, ibuMax: 35, srmMin: 12, srmMax: 22, ebcMin: 24, ebcMax: 43, description: 'Sehr komplex, reiches Dunkelfruchtig (Pflaumen, Feigen, Rosinen), Schokolade, Karamell. Wärmend, alkoholtragend, würzige Hefe.', typicalIngredients: 'Pilsnermalz, dunkler Kandiszucker, Special B, Aromamalze, belgische Trappisten-Hefe', examples: 'Westvleteren 12, St. Bernardus Abt 12, Rochefort 10' },
]

/**
 * Converts style to embedding text
 * @param {{ code: string, category: string, name: string, nameDe: string, ogMin: number, ogMax: number, fgMin: number, fgMax: number, abvMin: number, abvMax: number, ibuMin: number, ibuMax: number, srmMin: number, srmMax: number, ebcMin: number, ebcMax: number, description: string, typicalIngredients: string, examples: string }} style
 */
function toEmbeddingText(style) {
  return `BJCP Stil ${style.code}: ${style.name} (${style.nameDe}). Kategorie: ${style.category}.
Stammwürze (OG): ${style.ogMin.toFixed(3)}–${style.ogMax.toFixed(3)}.
Restextrakt (FG): ${style.fgMin.toFixed(3)}–${style.fgMax.toFixed(3)}.
Alkohol (ABV): ${style.abvMin}%–${style.abvMax}%.
Bitterness (IBU): ${style.ibuMin}–${style.ibuMax}.
Farbe (EBC): ${style.ebcMin}–${style.ebcMax}.
Beschreibung: ${style.description}
Typische Zutaten: ${style.typicalIngredients}
Beispiele: ${style.examples}`.trim()
}

async function main() {
  console.log(`\n🍺 BotlGuide BJCP Embeddings Seed`)
  console.log(`   Supabase: ${SUPABASE_URL}`)
  console.log(`   Styles to seed: ${BJCP_STYLES.length}\n`)

  const styles = BJCP_STYLES.map(s => ({
    code: s.code,
    name: s.name,
    nameDe: s.nameDe,
    content: toEmbeddingText(s),
    metadata: {
      code: s.code, name: s.name, nameDe: s.nameDe, category: s.category,
      ogMin: s.ogMin, ogMax: s.ogMax, fgMin: s.fgMin, fgMax: s.fgMax,
      abvMin: s.abvMin, abvMax: s.abvMax, ibuMin: s.ibuMin, ibuMax: s.ibuMax,
      srmMin: s.srmMin, srmMax: s.srmMax, ebcMin: s.ebcMin, ebcMax: s.ebcMax,
    },
  }))

  // Process in batches of 5 to stay within rate limits
  const BATCH_SIZE = 5
  let done = 0
  let failed = 0

  for (let i = 0; i < styles.length; i += BATCH_SIZE) {
    const batch = styles.slice(i, i + BATCH_SIZE)
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: styles ${i + 1}–${Math.min(i + BATCH_SIZE, styles.length)} (${batch.map(s => s.code).join(', ')})`)

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ type: 'bjcp_seed', styles: batch }),
    })

    const body = await res.json()

    if (!res.ok || !body.success) {
      console.error(`  ❌ Batch failed:`, body.error ?? body)
      failed += batch.length
    } else {
      const results = /** @type {Array<{ok: boolean, code: string, error?: string}>} */ (body.processed ?? [])
      results.forEach(r => {
        if (r.ok) { done++; console.log(`    ✅ ${r.code}`) }
        else { failed++; console.error(`    ❌ ${r.code}: ${r.error}`) }
      })
    }

    // Brief pause between batches
    if (i + BATCH_SIZE < styles.length) {
      await new Promise(r => setTimeout(r, 800))
    }
  }

  console.log(`\n✅  Seed complete: ${done} succeeded, ${failed} failed out of ${styles.length} styles.`)
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
