/**
 * BotlGuide — BJCP Style Catalogue
 *
 * 50 essential BJCP styles (2021 edition) used as RAG source for:
 *  - architect.check_bjcp  (style conformity check)
 *  - architect.optimize    (style-aware recipe optimization)
 *
 * Each entry is formatted as a structured text embedding-source.
 * The `toEmbeddingText()` helper concatenates all attributes into a
 * rich text passage optimal for semantic similarity search.
 *
 * Source: BJCP 2021 Style Guidelines (https://www.bjcp.org/style/2021/beer/)
 */

export interface BJCPStyle {
  /** BJCP style code (e.g. "10A") */
  code: string;
  /** Official category name */
  category: string;
  /** Full style name */
  name: string;
  /** German name used in BotlLab UI */
  nameDe: string;
  ogMin: number; ogMax: number;
  fgMin: number; fgMax: number;
  abvMin: number; abvMax: number;
  ibuMin: number; ibuMax: number;
  srmMin: number; srmMax: number;
  /** EBC = SRM × 1.97 */
  ebcMin: number; ebcMax: number;
  /** Free-text flavour/aroma description */
  description: string;
  /** Key ingredients typically used */
  typicalIngredients: string;
  /** Commercial examples */
  examples: string;
}

export const BJCP_STYLES: BJCPStyle[] = [
  {
    code: '1A', category: 'American Light Lager', name: 'American Light Lager', nameDe: 'Amerikanisches Helles Lager',
    ogMin: 1.028, ogMax: 1.040, fgMin: 0.998, fgMax: 1.008,
    abvMin: 2.8, abvMax: 4.2, ibuMin: 8, ibuMax: 12, srmMin: 2, srmMax: 3, ebcMin: 4, ebcMax: 6,
    description: 'Sehr helles, klares, sehr schwach gehopftes Bier. Kaum Malz- oder Hopfenaromen. Erfrischend und leicht. Sehr hohe Vergärungsgrade.',
    typicalIngredients: 'Pilsnermalz, Mais oder Reis als Adjunkte, neutrale Lagerhefe',
    examples: 'Bud Light, Coors Light, Miller Lite',
  },
  {
    code: '1B', category: 'American Lager', name: 'American Lager', nameDe: 'Amerikanisches Lager',
    ogMin: 1.040, ogMax: 1.050, fgMin: 1.004, fgMax: 1.010,
    abvMin: 4.2, abvMax: 5.3, ibuMin: 8, ibuMax: 18, srmMin: 2, srmMax: 4, ebcMin: 4, ebcMax: 8,
    description: 'Helles, klares Bier mit geringem Malzcharakter. Sehr geringe Hopfenbitterness. Sauber, crisp, erfrischend.',
    typicalIngredients: 'Pilsnermalz, Mais oder Reis, neutrale Lagerhefe',
    examples: 'Budweiser, Corona Extra, Pabst Blue Ribbon',
  },
  {
    code: '3A', category: 'Czech Lager', name: 'Czech Pale Lager', nameDe: 'Tschechisches Helles Lager',
    ogMin: 1.028, ogMax: 1.044, fgMin: 1.008, fgMax: 1.014,
    abvMin: 3.0, abvMax: 4.1, ibuMin: 20, ibuMax: 35, srmMin: 3, srmMax: 6, ebcMin: 6, ebcMax: 12,
    description: 'Schlankes, hopfenbetontes Bier mit weichem Malzkörper. Charakteristisches Saaz-Hopfenaroma. Sahnige Bitterness.',
    typicalIngredients: 'Bohemisches Pilsnermalz, Saaz-Hopfen, weiche böhmische Lagerhefe',
    examples: 'Budvar 11°, Březňák, Notch Session Pils',
  },
  {
    code: '3C', category: 'Czech Lager', name: 'Czech Amber Lager', nameDe: 'Tschechisches Amber Lager',
    ogMin: 1.044, ogMax: 1.060, fgMin: 1.013, fgMax: 1.017,
    abvMin: 4.4, abvMax: 5.8, ibuMin: 20, ibuMax: 35, srmMin: 10, srmMax: 16, ebcMin: 20, ebcMax: 32,
    description: 'Malzbetont mit Karamell- und Brötchenaromen. Deutliche Saaz-Hopfenbitterness. Vollmundig mit weichem Abgang.',
    typicalIngredients: 'Pilsnermalz, Karamellmalz, Saaz, weiche böhmische Lagerhefe',
    examples: 'Budvar 12° Dark, Bernard Amber 12°',
  },
  {
    code: '4C', category: 'Pale Malty European Lager', name: 'Helles Bock', nameDe: 'Helles Bock',
    ogMin: 1.064, ogMax: 1.072, fgMin: 1.013, fgMax: 1.019,
    abvMin: 6.3, abvMax: 7.4, ibuMin: 23, ibuMax: 35, srmMin: 6, srmMax: 9, ebcMin: 12, ebcMax: 18,
    description: 'Malzreich, süßlich mit Brot- und Toastaromen. Geringe Hopfenbitterness. Klar, goldfarben. Kein Karamell.',
    typicalIngredients: 'Pilsnermalz, helles Münchnermalz, Noble Hops, Lagerhefe',
    examples: 'Weihenstephaner Vitus, Paulaner Salvator (hell), Einbecker Maibock',
  },
  {
    code: '5A', category: 'Pale Bitter European Beer', name: 'German Leichtbier', nameDe: 'Deutsches Leichtbier',
    ogMin: 1.026, ogMax: 1.034, fgMin: 1.006, fgMax: 1.010,
    abvMin: 2.4, abvMax: 3.6, ibuMin: 15, ibuMax: 28, srmMin: 1.5, srmMax: 4, ebcMin: 3, ebcMax: 8,
    description: 'Leicht, schlank, trocken. Geringe Malzsüße. Mäßige bis geringere Hopfenbitterness. Clean, crisper Charakter.',
    typicalIngredients: 'Pilsnermalz, helles Karamalz, Magnum/Hallertau, neutrale deutsche Lagerhefe',
    examples: 'Bitburger Light, Jever Light, Beck\'s Light',
  },
  {
    code: '5B', category: 'Pale Bitter European Beer', name: 'Kölsch', nameDe: 'Kölsch',
    ogMin: 1.044, ogMax: 1.050, fgMin: 1.007, fgMax: 1.011,
    abvMin: 4.4, abvMax: 5.2, ibuMin: 18, ibuMax: 30, srmMin: 3.5, srmMax: 5, ebcMin: 7, ebcMax: 10,
    description: 'Zart-fruchtig, frisch, helles, von oben vergoren. Leichte Malzsüße und dezente Hopfenbitterness. Weinige Fruchtaromen.',
    typicalIngredients: 'Pilsnermalz, bis 20% Weizenmalz, Hallertau/Spalt, Kölsch-Hefe',
    examples: 'Reissdorf, Früh, Dom Kölsch, Gaffel',
  },
  {
    code: '5C', category: 'Pale Bitter European Beer', name: 'German Helles Exportbier', nameDe: 'Deutsches Helles Export',
    ogMin: 1.048, ogMax: 1.056, fgMin: 1.010, fgMax: 1.015,
    abvMin: 4.8, abvMax: 6.0, ibuMin: 20, ibuMax: 30, srmMin: 4, srmMax: 7, ebcMin: 8, ebcMax: 14,
    description: 'Ausgewogen, Malz und Hopfen gleichmäßig. Weiche Maltigkeit, mäßige Hopfenbitterness. Vollmundiger als Helles.',
    typicalIngredients: 'Pilsnermalz, Hallertauer Noble Hops, Lagerhefe Bayern',
    examples: 'Ayinger Export, Spaten Export',
  },
  {
    code: '5D', category: 'Pale Bitter European Beer', name: 'German Pils', nameDe: 'Deutsches Pils',
    ogMin: 1.044, ogMax: 1.050, fgMin: 1.008, fgMax: 1.013,
    abvMin: 4.4, abvMax: 5.2, ibuMin: 22, ibuMax: 40, srmMin: 2, srmMax: 5, ebcMin: 4, ebcMax: 10,
    description: 'Trocken, hopfenbetont, clear und crispe Bitterness. Minimale Malzsüße. Deutliches Hopfenaroma (Noble Hops).',
    typicalIngredients: 'Pilsnermalz, Hallertau/Spalt/Tettnang Noble Hops, trockene Lagerhefe',
    examples: 'Jever Pils, König Pils, Bitburger, Warsteiner',
  },
  {
    code: '6A', category: 'Amber Malty European Lager', name: 'Märzenbier/Oktoberfest', nameDe: 'Märzenbier / Oktoberfest',
    ogMin: 1.054, ogMax: 1.060, fgMin: 1.010, fgMax: 1.014,
    abvMin: 5.8, abvMax: 6.3, ibuMin: 18, ibuMax: 24, srmMin: 8, srmMax: 17, ebcMin: 16, ebcMax: 34,
    description: 'Malzreich, vollmundig, Karamell- und Brotharomen. Sauber mit weicher Hopfenbitterness. Kupfer- bis bernsteinfarbig.',
    typicalIngredients: 'Wiener Malz, Münchnermalz, Noble Hops, bayerische Lagerhefe',
    examples: 'Paulaner Urmarzen, Hacker-Pschorr Märzen, Ayinger Oktoberfest',
  },
  {
    code: '7A', category: 'Amber Bitter European Beer', name: 'Vienna Lager', nameDe: 'Wiener Lager',
    ogMin: 1.048, ogMax: 1.055, fgMin: 1.010, fgMax: 1.014,
    abvMin: 4.7, abvMax: 5.5, ibuMin: 18, ibuMax: 30, srmMin: 9, srmMax: 15, ebcMin: 18, ebcMax: 30,
    description: 'Weich-malziges Bier mit Toast- und Karamellaroma. Mäßige Hopfenbitterness, sauber trocken. Kupfer- bis bernsteinfarben.',
    typicalIngredients: 'Wiener Malz, Münchner Malz, Saaz/Hallertau, mittelfrische Lagerhefe',
    examples: 'Ottakringer Wiener Original, Negra Modelo, Devils Backbone Vienna',
  },
  {
    code: '8A', category: 'Dark European Lager', name: 'Munich Dunkel', nameDe: 'Münchner Dunkel',
    ogMin: 1.048, ogMax: 1.056, fgMin: 1.010, fgMax: 1.016,
    abvMin: 4.5, abvMax: 5.6, ibuMin: 18, ibuMax: 28, srmMin: 17, srmMax: 28, ebcMin: 34, ebcMax: 55,
    description: 'Malzreich, Brot-, Nuss- und Schokoladenaromen. Geringe bis mäßige Hopfenbitterness. Vollmundig, sauber, trocken im Abgang.',
    typicalIngredients: 'Münchner Dunkelmalz, Caramünch, Röstmalz, Hallertau, Münchner Lagerhefe',
    examples: 'Ayinger Altbairisch Dunkel, Hacker-Pschorr Münchner Dunkel, Weltenburger Kloster Asam Bock',
  },
  {
    code: '9A', category: 'Strong European Beer', name: 'Doppelbock', nameDe: 'Doppelbock',
    ogMin: 1.072, ogMax: 1.112, fgMin: 1.016, fgMax: 1.024,
    abvMin: 7.0, abvMax: 10.0, ibuMin: 16, ibuMax: 26, srmMin: 6, srmMax: 25, ebcMin: 12, ebcMax: 50,
    description: 'Sehr malzreich, süßlich bis trocken. Karamell-, Toffee-, Dörrobst-Aromen. Geringe Hopfenbitterness. Vollmundig, wärmend.',
    typicalIngredients: 'Münchnermalz, Pilsnermalz, Karamellmalze, Noble Hops, Münchner Lagerhefe',
    examples: 'Paulaner Salvator, Ayinger Celebrator, Weihenstephaner Korbinian',
  },
  {
    code: '9C', category: 'Strong European Beer', name: 'Baltic Porter', nameDe: 'Baltic Porter',
    ogMin: 1.060, ogMax: 1.090, fgMin: 1.016, fgMax: 1.024,
    abvMin: 6.5, abvMax: 9.5, ibuMin: 20, ibuMax: 40, srmMin: 17, srmMax: 30, ebcMin: 34, ebcMax: 60,
    description: 'Komplex, dunkles Fruchtaroma (Pflaumen, Kirschen), Schokolade, Karamell. Mild hopfig. Wärmend mit weichem Körper.',
    typicalIngredients: 'Pilsnermalz, Münchnermalz, Karamellmalze, Röstmalz, Noble Hops, Lagerhefe',
    examples: 'Sinebrychoff Porter, Okocim Porter, Carnegie Stark Porter',
  },
  {
    code: '10A', category: 'German Wheat Beer', name: 'Weissbier', nameDe: 'Weißbier / Hefeweizen',
    ogMin: 1.044, ogMax: 1.052, fgMin: 1.010, fgMax: 1.014,
    abvMin: 4.3, abvMax: 5.6, ibuMin: 8, ibuMax: 15, srmMin: 2, srmMax: 6, ebcMin: 4, ebcMax: 12,
    description: 'Fruchtiger Bananenester und rauchige Gewürznelkencharakter. Trüb, cremig, hohe Kohlensäure. Weich und erfrischend.',
    typicalIngredients: '50%+ Weizenmalz, Pilsnermalz, Hallertau, hefeweizen-typische Weizenhefe (WB-06 / W3068)',
    examples: 'Weihenstephaner Hefeweissbier, Paulaner Hefe-Weißbier, Schneider Weisse Tap 7',
  },
  {
    code: '10B', category: 'German Wheat Beer', name: 'Dunkles Weissbier', nameDe: 'Dunkles Weißbier',
    ogMin: 1.044, ogMax: 1.056, fgMin: 1.010, fgMax: 1.014,
    abvMin: 4.3, abvMax: 5.6, ibuMin: 10, ibuMax: 18, srmMin: 14, srmMax: 23, ebcMin: 28, ebcMax: 46,
    description: 'Dunkles Weizen mit Brot-, Karamell- und Bananennaromen. Vollmundiger als Hefeweizen. Charakteristische Weizenhefe-Ester.',
    typicalIngredients: '50%+ Weizenmalz, Münchnermalz, Röstmalz (gering), Weizenhefe',
    examples: 'Erdinger Dunkel, Schneider Weisse Tap 5, Franziskaner Dunkel',
  },
  {
    code: '10C', category: 'German Wheat Beer', name: 'Weizenbock', nameDe: 'Weizenbock',
    ogMin: 1.064, ogMax: 1.090, fgMin: 1.015, fgMax: 1.022,
    abvMin: 6.5, abvMax: 9.0, ibuMin: 15, ibuMax: 30, srmMin: 6, srmMax: 25, ebcMin: 12, ebcMax: 50,
    description: 'Starkes Weizenbier mit reifen Früchten (Banane, Vanille), Karamell. Komplex, wärmend, vollmundig. Wenig Hopfenbitterness.',
    typicalIngredients: 'Weizenmalz, Münchnermalz, Karamellmalz, Weizenbockhefe (W3333)',
    examples: 'Schneider Aventinus, Ayinger Weizenbock, Weihenstephaner Vitus',
  },
  {
    code: '11A', category: 'British Bitter', name: 'Ordinary Bitter', nameDe: 'Englisches Ordinary Bitter',
    ogMin: 1.030, ogMax: 1.039, fgMin: 1.007, fgMax: 1.011,
    abvMin: 3.2, abvMax: 3.8, ibuMin: 25, ibuMax: 35, srmMin: 8, srmMax: 14, ebcMin: 16, ebcMax: 28,
    description: 'Trocken hopfig, leicht bis mittlerer Körper. Erdige, blumige und zitrusartige Hopfenaromen. Cask-Charakter, keine starke Kohlensäure.',
    typicalIngredients: 'British Pale Ale Malz, Crystal 60, British Hopfen (Fuggles/EKG), britische Ale-Hefe',
    examples: 'Fuller\'s Chiswick Bitter, Adnams Southwold Bitter, Young\'s Bitter',
  },
  {
    code: '11B', category: 'British Bitter', name: 'Best Bitter', nameDe: 'Englisches Best Bitter',
    ogMin: 1.040, ogMax: 1.048, fgMin: 1.008, fgMax: 1.012,
    abvMin: 3.8, abvMax: 4.6, ibuMin: 25, ibuMax: 40, srmMin: 8, srmMax: 16, ebcMin: 16, ebcMax: 32,
    description: 'Ausgewogen mit mehr Körper und Hopfencharakter als Ordinary Bitter. Fruchtiger Ester-Charakter, trockener Abgang.',
    typicalIngredients: 'British Pale Ale Malz, Crystal Malz, British Hopfen, britische Ale-Hefe mit mittlerer Vergärung',
    examples: 'Fuller\'s London Pride, Adnams Broadside, Bass Ale',
  },
  {
    code: '12A', category: 'Pale Commonwealth Beer', name: 'British Golden Ale', nameDe: 'Britisches Golden Ale',
    ogMin: 1.038, ogMax: 1.053, fgMin: 1.006, fgMax: 1.012,
    abvMin: 3.8, abvMax: 5.0, ibuMin: 20, ibuMax: 45, srmMin: 1, srmMax: 6, ebcMin: 2, ebcMax: 12,
    description: 'Hell, fruchtig-hopfig, erfrischend. Moderne britische Hopfen (Cascade, Citra, Centennial möglich). Sauberer trockener Abgang.',
    typicalIngredients: 'Britisches Pale Malz, helles Crystal, verschiedene Hopfensorten, britische Ale-Hefe',
    examples: 'Exmoor Gold, Hop Back Summer Lightning, Crouch Vale Brewers Gold',
  },
  {
    code: '13A', category: 'Brown British Beer', name: 'Dark Mild', nameDe: 'Dark Mild',
    ogMin: 1.030, ogMax: 1.038, fgMin: 1.008, fgMax: 1.013,
    abvMin: 3.0, abvMax: 3.8, ibuMin: 10, ibuMax: 25, srmMin: 14, srmMax: 25, ebcMin: 28, ebcMax: 50,
    description: 'Dunkel, malzreich, Karamell-, Toffee- und Schokoladenaromen. Geringer Hopfencharakter. Süßlicher Abgang, leichter Körper.',
    typicalIngredients: 'British Pale Malz, Crystal 77, Röstgerste, britische Hopfen, englische Ale-Hefe',
    examples: 'Moorhouse\'s Black Cat, Theakston\'s Mild, Sarah Hughes Dark Ruby',
  },
  {
    code: '14A', category: 'Scottish Ale', name: 'Scottish Light', nameDe: 'Scottish Light 60/-',
    ogMin: 1.030, ogMax: 1.035, fgMin: 1.010, fgMax: 1.013,
    abvMin: 2.5, abvMax: 3.2, ibuMin: 10, ibuMax: 20, srmMin: 17, srmMax: 25, ebcMin: 34, ebcMax: 50,
    description: 'Malzreich, geringe Hopfenbitterness. Karamell und leichte Nuss-Noten. Kein Rauch. Vollmundig trotz geringen Alkohols.',
    typicalIngredients: 'Scottish Pale Malz, Crystal 80, geringe Röstmalze, britische Hopfen, Scottish Ale-Hefe',
    examples: 'McEwan\'s 60/-, Belhaven Scottish Ale',
  },
  {
    code: '15A', category: 'Irish Beer', name: 'Irish Red Ale', nameDe: 'Irish Red Ale',
    ogMin: 1.036, ogMax: 1.046, fgMin: 1.010, fgMax: 1.014,
    abvMin: 3.8, abvMax: 5.0, ibuMin: 18, ibuMax: 28, srmMin: 9, srmMax: 14, ebcMin: 18, ebcMax: 28,
    description: 'Kupferrot, malzreich, leichte Caramel-Süße, röstiger Einschlag im Abgang. Geringe Hopfenbitterness. Sauber mit mittlerem Körper.',
    typicalIngredients: 'Irish/British Pale Malz, Crystal 150, geringe Röstgerste, UK Hopfen, irische Ale-Hefe',
    examples: 'Smithwick\'s, Murphy\'s Irish Red, Kilkenny',
  },
  {
    code: '15B', category: 'Irish Beer', name: 'Irish Stout', nameDe: 'Irish Stout',
    ogMin: 1.036, ogMax: 1.044, fgMin: 1.007, fgMax: 1.011,
    abvMin: 4.0, abvMax: 4.5, ibuMin: 25, ibuMax: 45, srmMin: 25, srmMax: 40, ebcMin: 50, ebcMax: 79,
    description: 'Trocken, röstiger Kaffeecharakter ohne Süße. Stickstoffkarbonisierung ergibt cremige Textur. Bitterness dominiert den Abgang.',
    typicalIngredients: 'Pale Malz, Röstgerste (ungemälzt), Flaked Barley, UK Hopfen, Dry Stout Hefe',
    examples: 'Guinness Draught, Murphy\'s Irish Stout, Beamish Irish Stout',
  },
  {
    code: '16A', category: 'Dark British Beer', name: 'Sweet Stout', nameDe: 'Sweet Stout / Milk Stout',
    ogMin: 1.044, ogMax: 1.060, fgMin: 1.012, fgMax: 1.024,
    abvMin: 4.0, abvMax: 6.0, ibuMin: 20, ibuMax: 40, srmMin: 30, srmMax: 40, ebcMin: 59, ebcMax: 79,
    description: 'Süßlich, cremig, Schokolade, Kaffe, Lakritze. Laktose erhöht Restsüße und Körper. Ausgepragte Röstaromen ohne Schärfe.',
    typicalIngredients: 'Pale Malz, Laktose, Chocolate Malz, Röstgerste, UK Hopfen, englische Ale-Hefe',
    examples: 'Mackeson XXX Stout, Left Hand Milk Stout, Wells Bombardier (dark)',
  },
  {
    code: '16C', category: 'Dark British Beer', name: 'Oatmeal Stout', nameDe: 'Oatmeal Stout',
    ogMin: 1.045, ogMax: 1.065, fgMin: 1.010, fgMax: 1.018,
    abvMin: 4.2, abvMax: 5.9, ibuMin: 25, ibuMax: 40, srmMin: 22, srmMax: 40, ebcMin: 43, ebcMax: 79,
    description: 'Hafer verleiht seidigen, vollmundigen Körper. Kaffee, Schokolade, nussige Aromen. Mäßige Bitterness, milder Röstcharakter.',
    typicalIngredients: 'Pale Malz, Hafermalz/Haferflocken (5-15%), Chocolate Malz, Röstmalz, UK Hopfen',
    examples: 'Samuel Smith\'s Oatmeal Stout, Anderson Valley Barney Flats, McAuslan St-Ambroise Oatmeal',
  },
  {
    code: '17A', category: 'Strong British Ale', name: 'British Strong Ale', nameDe: 'Britisches Strong Ale',
    ogMin: 1.055, ogMax: 1.080, fgMin: 1.015, fgMax: 1.022,
    abvMin: 5.5, abvMax: 8.0, ibuMin: 30, ibuMax: 60, srmMin: 8, srmMax: 18, ebcMin: 16, ebcMax: 36,
    description: 'Komplex, reiche Malzaromen, Karamell, Trockenobst, Gewürze. Kräftige aber ausgewogene Hopfenbitterness. Wärmend.',
    typicalIngredients: 'British Pale Malz, Crystal, invert Zucker, UK Hopfen, fruchtbildende englische Hefe',
    examples: 'Fuller\'s ESB, Adnams Broadside 6%, Young\'s Special',
  },
  {
    code: '18A', category: 'Pale American Ale', name: 'Blonde Ale', nameDe: 'Blonde Ale',
    ogMin: 1.038, ogMax: 1.054, fgMin: 1.008, fgMax: 1.013,
    abvMin: 3.8, abvMax: 5.5, ibuMin: 15, ibuMax: 28, srmMin: 3, srmMax: 6, ebcMin: 6, ebcMax: 12,
    description: 'Hell, zugänglich, ausgewogen. Geringe bis mäßige Malzsüße, keine Fruchtester. Sauber-erfrischend, sanfte Hopfennoten.',
    typicalIngredients: 'Pale 2-Row oder Pilsnermalz, US Hopfen, neutrale US Ale-Hefe',
    examples: 'Kona Big Wave, Widmer Blonde, Sierra Nevada Summerfest',
  },
  {
    code: '18B', category: 'Pale American Ale', name: 'American Pale Ale', nameDe: 'American Pale Ale',
    ogMin: 1.045, ogMax: 1.060, fgMin: 1.010, fgMax: 1.015,
    abvMin: 4.5, abvMax: 6.2, ibuMin: 30, ibuMax: 50, srmMin: 5, srmMax: 10, ebcMin: 10, ebcMax: 20,
    description: 'Hopfenbetont mit charakteristischen US Hopfenaromen (Zitrus, Kiefer, tropische Früchte). Moderater Malzkörper, trockener Abgang.',
    typicalIngredients: 'American 2-Row, Crystal 40, Cascade/Centennial/Simcoe, US Ale-Hefe (1056, US-05)',
    examples: 'Sierra Nevada Pale Ale, Deschutes Mirror Pond, Three Floyds Zombie Dust (light)',
  },
  {
    code: '19A', category: 'Amber and Brown American Beer', name: 'American Amber Ale', nameDe: 'American Amber Ale',
    ogMin: 1.045, ogMax: 1.060, fgMin: 1.010, fgMax: 1.015,
    abvMin: 4.5, abvMax: 6.2, ibuMin: 25, ibuMax: 40, srmMin: 10, srmMax: 17, ebcMin: 20, ebcMax: 34,
    description: 'Ausgewogen zwischen Karamellmalz-Süße und US Hopfenaroma. Mittlerer Körper, Nuss und Toffee, angenehme Hopfenbitterness.',
    typicalIngredients: '2-Row, Crystal 40/80, US Hopfen (häufig Cascade/Centennial), US Ale-Hefe',
    examples: 'Bell\'s Amber Ale, Deschutes Mirror Pond Amber, Full Sail Amber',
  },
  {
    code: '19B', category: 'Amber and Brown American Beer', name: 'California Common', nameDe: 'California Common / Steam Beer',
    ogMin: 1.048, ogMax: 1.054, fgMin: 1.011, fgMax: 1.014,
    abvMin: 4.5, abvMax: 5.5, ibuMin: 30, ibuMax: 45, srmMin: 10, srmMax: 14, ebcMin: 20, ebcMax: 28,
    description: 'Bernsteinfarben, toastig-malzig, stark von Northern Brewer-Hopfen (würzig-minzig). Vergoren mit Lagerhefe bei Ale-Temperaturen.',
    typicalIngredients: 'American 2-Row oder Crystal, Northern Brewer Hopfen, California Lager Hefe (WLP810)',
    examples: 'Anchor Steam Beer, Flying Dog Old Scratch Amber',
  },
  {
    code: '21A', category: 'IPA', name: 'American IPA', nameDe: 'American IPA',
    ogMin: 1.056, ogMax: 1.070, fgMin: 1.008, fgMax: 1.014,
    abvMin: 5.5, abvMax: 7.5, ibuMin: 40, ibuMax: 70, srmMin: 6, srmMax: 14, ebcMin: 12, ebcMax: 28,
    description: 'Hopfenbetont mit intensiven US Hopfenaromen (Zitrus, Kiefer, tropical). Mittlerer Malzkörper, trockener, bitter-langer Abgang.',
    typicalIngredients: '2-Row Pale Malz, Crystal 30-60, Cascade/Centennial/Chinook/Citra/Simcoe, US 1056',
    examples: 'Bell\'s Two Hearted, Dogfish Head 60 Minute, Founders Centennial IPA',
  },
  {
    code: '21B', category: 'IPA', name: 'Specialty IPA: New England IPA', nameDe: 'New England IPA (NEIPA / Hazy IPA)',
    ogMin: 1.060, ogMax: 1.085, fgMin: 1.010, fgMax: 1.015,
    abvMin: 6.0, abvMax: 9.0, ibuMin: 25, ibuMax: 60, srmMin: 3, srmMax: 7, ebcMin: 6, ebcMax: 14,
    description: 'Trüb, saftiger Fruchtcharakter (Mango, Pfirsich, Zitrus). Softer Körper durch Haze-Techniken. Geringere wahrnehmbare Bitterness trotz hoher IBU.',
    typicalIngredients: 'Pilsnermalz, Weizenmalz/Haferflocken (30%+), hohe Dry-Hop-Mengen (Citra, Mosaic, Galaxy, Sabro), hazy-fördernde Hefe (London Ale III, Omega DIPA)',
    examples: 'The Alchemist Heady Topper, Tree House Julius, Trillium Fort Point',
  },
  {
    code: '21C', category: 'IPA', name: 'Specialty IPA: White IPA', nameDe: 'White IPA',
    ogMin: 1.056, ogMax: 1.065, fgMin: 1.010, fgMax: 1.016,
    abvMin: 5.5, abvMax: 7.0, ibuMin: 40, ibuMax: 70, srmMin: 2, srmMax: 4, ebcMin: 4, ebcMax: 8,
    description: 'Kombination von Weizen-Ale-Charakter und US IPA Hopfenaromen. Leicht treibig, fruchtig, würzig. Aromatische Kombi-Hefe typisch.',
    typicalIngredients: 'Weizenmalz > 50%, 2-Row, US Hopfen (Citra/Galaxy), belgische oder Weizenhefe',
    examples: 'Blue Moon Brewing White IPA, Deschutes Chainbreaker',
  },
  {
    code: '22A', category: 'Strong American Ale', name: 'Double IPA', nameDe: 'Double / Imperial IPA (DIPA)',
    ogMin: 1.065, ogMax: 1.085, fgMin: 1.008, fgMax: 1.018,
    abvMin: 7.5, abvMax: 10.0, ibuMin: 60, ibuMax: 120, srmMin: 6, srmMax: 14, ebcMin: 12, ebcMax: 28,
    description: 'Intensiv hopfig, tropische Früchte und Kiefernharz dominieren. Starker Alkohol, dennoch trockener Körper. Extrem bitter.',
    typicalIngredients: '2-Row, minimale Crystal-Malze, hohe Hopfenmengen Citra/Simcoe/Chinook, clean US Hefe',
    examples: 'Pliny the Elder, Stone Ruination, Dogfish Head 90 Minute',
  },
  {
    code: '22C', category: 'Strong American Ale', name: 'American Barleywine', nameDe: 'American Barleywine',
    ogMin: 1.080, ogMax: 1.120, fgMin: 1.016, fgMax: 1.030,
    abvMin: 8.0, abvMax: 12.0, ibuMin: 50, ibuMax: 100, srmMin: 10, srmMax: 19, ebcMin: 20, ebcMax: 38,
    description: 'Sehr komplex, reiche Malzaromen, Karamell, Trockenfrüchte plus starke US Hopfenaromen. Wärmend, dick, balanciert durch Bitterness.',
    typicalIngredients: 'American 2-Row, Crystal 60-120, hohe Hopfenaromasorten (Cascade/Centennial), US 1056',
    examples: 'Anchor Old Foghorn, Sierra Nevada Bigfoot, Bell\'s Third Coast',
  },
  {
    code: '24A', category: 'Belgian Ale', name: 'Witbier', nameDe: 'Witbier / Weißbier (Belgisch)',
    ogMin: 1.044, ogMax: 1.052, fgMin: 1.008, fgMax: 1.012,
    abvMin: 4.5, abvMax: 5.5, ibuMin: 8, ibuMax: 20, srmMin: 2, srmMax: 4, ebcMin: 4, ebcMax: 8,
    description: 'Treibig, hell, würzig. Koriander und getrocknete Orangenschale. Leichte Weizensäure, weiche Cremung. Erfrischend trocken.',
    typicalIngredients: '>50% ungem. Weizen, Pilsnermalz, Hafer optional, Koriander, Bitterorangeschale, belgische Weizenhefe (WY3944)',
    examples: 'Hoegaarden, Blue Moon Belgian White, Ommegang Witte',
  },
  {
    code: '24B', category: 'Belgian Ale', name: 'Belgian Pale Ale', nameDe: 'Belgisches Pale Ale',
    ogMin: 1.048, ogMax: 1.054, fgMin: 1.010, fgMax: 1.014,
    abvMin: 4.8, abvMax: 5.5, ibuMin: 20, ibuMax: 30, srmMin: 8, srmMax: 14, ebcMin: 16, ebcMax: 28,
    description: 'Malzig-fruchtig, würzige belgische Hefe-Ester. Ausgewogen mit moderater Hopfenbitterness und fruchtigen Karamell-Noten.',
    typicalIngredients: 'Belgian oder British Pale Malz, Crystal, belgische Hefe (Wyeast 3655), flämische Hopfen',
    examples: 'De Koninck, Palm Speciale, Leffe Blonde',
  },
  {
    code: '25A', category: 'Strong Belgian Ale', name: 'Belgian Blond Ale', nameDe: 'Belgisches Blond Ale',
    ogMin: 1.062, ogMax: 1.075, fgMin: 1.008, fgMax: 1.018,
    abvMin: 6.0, abvMax: 7.5, ibuMin: 15, ibuMax: 30, srmMin: 4, srmMax: 7, ebcMin: 8, ebcMax: 14,
    description: 'Hell, würzig-fruchtig, komplex. Pilzige/nussige Hefe-Ester, Honig und Vanilla. Trocken-süßes Finish. Wärmend.',
    typicalIngredients: 'Pilsnermalz, heller Rohrzucker (Kandis), belgische noble Hops, belgische Ale-Hefe (Leffe Strain)',
    examples: 'Leffe Blonde, Affligem Blonde, Grimbergen Blonde',
  },
  {
    code: '25B', category: 'Strong Belgian Ale', name: 'Saison', nameDe: 'Saison',
    ogMin: 1.048, ogMax: 1.065, fgMin: 1.002, fgMax: 1.012,
    abvMin: 3.5, abvMax: 9.0, ibuMin: 20, ibuMax: 35, srmMin: 5, srmMax: 14, ebcMin: 10, ebcMax: 28,
    description: 'Sehr trocken, hochvergoren. Würzig-fruchtig mit Pfeffer, Zitrus, Erd- und Blumenaromen. Hochkarbonisiert, erfrischend, komplex.',
    typicalIngredients: 'Pilsnermalz, Weizen, Hafer, Gewürze optional, belgische Saison-Hefe (3724/3711), Noble + peppery Hops',
    examples: 'Saison Dupont, Fantôme Saison, Brooklyn Sorachi Ace',
  },
  {
    code: '25C', category: 'Strong Belgian Ale', name: 'Belgian Golden Strong Ale', nameDe: 'Belgisches Golden Strong Ale',
    ogMin: 1.070, ogMax: 1.095, fgMin: 1.005, fgMax: 1.016,
    abvMin: 7.5, abvMax: 10.5, ibuMin: 22, ibuMax: 35, srmMin: 3, srmMax: 6, ebcMin: 6, ebcMax: 12,
    description: 'Hoch alkoholisch, hell, trocken. Fruchtig-würzige belgische Hefe-Ester. Gefährlich: Alkohol kaum wahrnehmbar durch trocken-sauberes Profil.',
    typicalIngredients: 'Pilsnermalz, Kandiszucker (hell, >20%), belgische Hopfen, Duvel-Hefe-Strain',
    examples: 'Duvel, Delirium Tremens, Piraat, Judas',
  },
  {
    code: '26A', category: 'Monastic Ale', name: 'Belgian Single', nameDe: 'Belgisches Single / Patersbier',
    ogMin: 1.044, ogMax: 1.054, fgMin: 1.004, fgMax: 1.010,
    abvMin: 4.8, abvMax: 6.0, ibuMin: 25, ibuMax: 45, srmMin: 3, srmMax: 7, ebcMin: 6, ebcMax: 14,
    description: 'Einzigartiger Hopfencharakter mit würzigen belgischen Ester-Aromen. Trocken, vergoren. Leichteres Klosterbier.',
    typicalIngredients: 'Pilsnermalz, sehr geringe Malzvielfalt, belgische Hopfen, belgische Trappisten-Hefe',
    examples: 'Westmalle Extra, Westvleteren Blonde',
  },
  {
    code: '26B', category: 'Monastic Ale', name: 'Belgian Dubbel', nameDe: 'Belgisches Dubbel',
    ogMin: 1.062, ogMax: 1.075, fgMin: 1.008, fgMax: 1.018,
    abvMin: 6.0, abvMax: 7.6, ibuMin: 15, ibuMax: 25, srmMin: 10, srmMax: 17, ebcMin: 20, ebcMax: 34,
    description: 'Dunkle Früchte (Pflaumen, Kirschen, Rosinen), Karamell, Schokolade. Würzige Hefe. Alkohol wärmend. Weicher, vollmundiger Körper.',
    typicalIngredients: 'Pilsnermalz, dunkler Kandiszucker, Special B, belgische Trappisten/Abbaye Hefe',
    examples: 'Westmalle Dubbel, Chimay Red, La Trappe Dubbel',
  },
  {
    code: '26C', category: 'Monastic Ale', name: 'Belgian Tripel', nameDe: 'Belgisches Tripel',
    ogMin: 1.075, ogMax: 1.085, fgMin: 1.008, fgMax: 1.014,
    abvMin: 7.5, abvMax: 9.5, ibuMin: 20, ibuMax: 40, srmMin: 4.5, srmMax: 7, ebcMin: 9, ebcMax: 14,
    description: 'Hell, stark, würzig und fruchtig. Hohe Vergärung durch Kandiszucker. Komplex mit Gewürznelken, Orangen, Honig. Trocken-sauber.',
    typicalIngredients: 'Pilsnermalz, heller Kandiszucker (15-25%), belgische Trappisten-Hefe (WY3787), Styrian Goldings',
    examples: 'Westmalle Tripel, Chimay White, St. Bernardus Tripel',
  },
  {
    code: '26D', category: 'Monastic Ale', name: 'Belgian Dark Strong Ale', nameDe: 'Belgisches Dark Strong Ale / Quadrupel',
    ogMin: 1.075, ogMax: 1.110, fgMin: 1.010, fgMax: 1.024,
    abvMin: 8.0, abvMax: 12.0, ibuMin: 20, ibuMax: 35, srmMin: 12, srmMax: 22, ebcMin: 24, ebcMax: 43,
    description: 'Sehr komplex, reiches Dunkelfruchtig (Pflaumen, Feigen, Rosinen), Schokolade, Karamell. Wärmend, alkoholtragend, würzige Hefe.',
    typicalIngredients: 'Pilsnermalz, dunkler Kandiszucker, Special B, Aromamalze, belgische Trappisten-Hefe',
    examples: 'Westvleteren 12, St. Bernardus Abt 12, Rochefort 10',
  },
  {
    code: '27', category: 'Historical Beer', name: 'Historical Beer', nameDe: 'Historisches Bier',
    ogMin: 1.040, ogMax: 1.110, fgMin: 1.008, fgMax: 1.030,
    abvMin: 4.0, abvMax: 11.0, ibuMin: 10, ibuMax: 70, srmMin: 2, srmMax: 40, ebcMin: 4, ebcMax: 79,
    description: 'Historische oder regionale Bierstile (Gose, Lichtenhainer, Roggenbier, etc.). Sehr unterschiedlich je nach Substil.',
    typicalIngredients: 'Substil-abhängig; oft Weizen, Roggen, Salz, Koriander, Lacto',
    examples: 'Döllnitzer Ritterguts Gose, Westbrook Gose, Professor Fritz Briem Berliner Weisse',
  },
  {
    code: '28A', category: 'American Wild Ale', name: 'Brett Beer', nameDe: 'Brett Beer',
    ogMin: 1.045, ogMax: 1.090, fgMin: 1.004, fgMax: 1.012,
    abvMin: 4.5, abvMax: 9.0, ibuMin: 0, ibuMax: 30, srmMin: 2, srmMax: 18, ebcMin: 4, ebcMax: 36,
    description: 'Komplex wilder Charakter durch Brettanomyces. Leder, Stall, Funk, Tropisches. Sehr trocken, hoch vergoren. Sauerheit möglich.',
    typicalIngredients: 'Jede Malzbasis, Brettanomyces-Hefe, lange Lagerung',
    examples: 'Orval, Boulevard Brewing Saison Brett, Logsdon Seizoen Bretta',
  },
  {
    code: '29A', category: 'Fruit Beer', name: 'Fruit Beer', nameDe: 'Fruchtbier',
    ogMin: 1.040, ogMax: 1.110, fgMin: 1.006, fgMax: 1.030,
    abvMin: 3.0, abvMax: 11.0, ibuMin: 5, ibuMax: 70, srmMin: 2, srmMax: 40, ebcMin: 4, ebcMax: 79,
    description: 'Fruchtcharakter der Zutat sollte dominant sein, harmonisch mit Bierprofil. Natürliche Fruchtaromen bevorzugt.',
    typicalIngredients: 'Beliebige Basismalze + frische/gefrorene/getrocknete Früchte oder Fruchtsaft',
    examples: 'Samuel Adams Cherry Wheat, New Glarus Raspberry Tart, Lindemans Framboise',
  },
  {
    code: '30A', category: 'Spice/Herb/Vegetable Beer', name: 'Spice, Herb, or Vegetable Beer', nameDe: 'Gewürz-, Kräuter- oder Gemüsebier',
    ogMin: 1.040, ogMax: 1.110, fgMin: 1.008, fgMax: 1.028,
    abvMin: 3.0, abvMax: 11.0, ibuMin: 5, ibuMax: 70, srmMin: 2, srmMax: 40, ebcMin: 4, ebcMax: 79,
    description: 'Gewürze, Kräuter oder Gemüse müssen klar erkennbar sein, harmonisch im Gleichgewicht mit dem Bierprofil. Keine Gewürz-Dominanz.',
    typicalIngredients: 'Jede Malzbasis + diverse Gewürze/Kräuter (Ingwer, Vanille, Zimt, usw.)',
    examples: 'Dogfish Head Festina Pêche, New Belgium Accumulation, Rogue Yellow Snow',
  },
  {
    code: '33A', category: 'Wood Beer', name: 'Wood-Aged Beer', nameDe: 'Fassgelagertes Bier',
    ogMin: 1.040, ogMax: 1.120, fgMin: 1.008, fgMax: 1.030,
    abvMin: 4.0, abvMax: 12.0, ibuMin: 5, ibuMax: 60, srmMin: 2, srmMax: 40, ebcMin: 4, ebcMax: 79,
    description: 'Fassnoten (Vanille, Kokos, Eiche, Tannin) müssen harmonisch integriert sein. Spirituosen-Aromen möglich (Whisky, Bourbon, Rum, Wein).',
    typicalIngredients: 'Jedes Bier + Holzfässer oder Holzchips (Eiche dominant, aber Kirsche/Akazie möglich)',
    examples: 'Great Divide Barrel Aged Yeti, Goose Island Bourbon County Stout, Firestone Anniversary',
  },
];

/**
 * Converts a BJCP style to a rich text passage suitable for embedding.
 * The text includes all relevant parameters and descriptions.
 */
export function toEmbeddingText(style: BJCPStyle): string {
  return `BJCP Stil ${style.code}: ${style.name} (${style.nameDe}). Kategorie: ${style.category}.
Stammwürze (OG): ${style.ogMin.toFixed(3)}–${style.ogMax.toFixed(3)}.
Restextrakt (FG): ${style.fgMin.toFixed(3)}–${style.fgMax.toFixed(3)}.
Alkohol (ABV): ${style.abvMin}%–${style.abvMax}%.
Bitterness (IBU): ${style.ibuMin}–${style.ibuMax}.
Farbe (EBC): ${style.ebcMin}–${style.ebcMax}.
Beschreibung: ${style.description}
Typische Zutaten: ${style.typicalIngredients}
Beispiele: ${style.examples}`.trim();
}

/**
 * Returns style metadata stored in the jsonb metadata column of botlguide_embeddings.
 */
export function toMetadata(style: BJCPStyle): Record<string, unknown> {
  return {
    code: style.code,
    name: style.name,
    nameDe: style.nameDe,
    category: style.category,
    ogMin: style.ogMin, ogMax: style.ogMax,
    fgMin: style.fgMin, fgMax: style.fgMax,
    abvMin: style.abvMin, abvMax: style.abvMax,
    ibuMin: style.ibuMin, ibuMax: style.ibuMax,
    srmMin: style.srmMin, srmMax: style.srmMax,
    ebcMin: style.ebcMin, ebcMax: style.ebcMax,
  };
}
