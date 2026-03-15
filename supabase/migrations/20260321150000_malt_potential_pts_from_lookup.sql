-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Populate ingredient_master.potential_pts for all malts
-- Source: lib/brewing-calculations.ts → MALT_POTENTIAL_TABLE
--
-- Values are in pts·L/kg (metric extract potential at 100 % efficiency).
-- Order of WHEN clauses mirrors the JS lookup table (first match wins).
-- IMPORTANT: specific patterns (e.g. caramunich) must come before generic
--            ones (e.g. munich) to avoid early matching.
-- PostgreSQL POSIX regex: ~* = case-insensitive match.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE ingredient_master
SET potential_pts = CASE

  -- ── Sugars & Syrups (highest potential, 100 % fermentable) ─────────────
  WHEN name ~* 'zucker|sugar|sucrose|kandis|candi'                    THEN 384
  WHEN name ~* 'dextrose|glucose|traubenzucker'                       THEN 384
  WHEN name ~* 'honig|honey'                                          THEN 301

  -- ── Malt Extract ────────────────────────────────────────────────────────
  WHEN name ~* 'trockenmalzextrakt|dry[[:space:].-]*extract|\mdme\M'  THEN 367
  WHEN name ~* 'fl[üu]ssig[[:space:].-]*extrakt|liquid[[:space:].-]*extract|\mlme\M' THEN 309
  WHEN name ~* 'malzextrakt|malt[[:space:].-]*extract'                THEN 309

  -- ── Caramel / Crystal Malts ─────────────────────────────────────────────
  -- Must come BEFORE generic base malt patterns (munich, wheat, etc.)
  -- to avoid "Caramunich" being caught by the Munich rule.
  WHEN name ~* 'cara.{0,5}pils|carapils'                             THEN 275
  WHEN name ~* 'cara.{0,5}hell|carahell'                             THEN 275
  WHEN name ~* 'cara.{0,5}red|carared'                               THEN 275
  WHEN name ~* 'cara.{0,5}m[üu]n|caramunich'                        THEN 275
  WHEN name ~* 'cara.{0,5}amber|caraamber'                           THEN 275
  WHEN name ~* 'cara.{0,5}aroma|caraaroma'                           THEN 275
  WHEN name ~* 'cara.{0,5}fa|carafa'                                 THEN 259
  -- crystal / caramel catch-all (Crystal 10/40/60/120, Muntons Crystal, etc.)
  WHEN name ~* 'crystal|karamell|caramel'                            THEN 275
  -- cara-prefix catch-all (Carabelge, Carabohemian, Cara Clair, Cara Gold, etc.)
  WHEN name ~* '\mcara'                                               THEN 275
  WHEN name ~* 'toffee'                                              THEN 275
  WHEN name ~* 'special.{0,3}b\M'                                    THEN 275
  -- standalone "Amber" without "malt" (GoldSwaen© Amber = caramel malt)
  -- Note: "Amber Malt" must be handled in the specialty section below (→ 284).
  --       This catch catches "GoldSwaen© Amber", "Cara Gold" etc. without "malt".
  WHEN name ~* '\mamber\M' AND name !~* 'malt'                        THEN 275

  -- ── Base Malts ──────────────────────────────────────────────────────────
  WHEN name ~* 'pilsner|pilsener|pilsen|pils'                        THEN 309
  WHEN name ~* 'pale.{0,5}ale|maris.{0,5}otter|golden.{0,5}promise' THEN 309
  WHEN name ~* '2[[:space:]-]*row|pale.{0,5}malt'                    THEN 309
  WHEN name ~* 'vienna|wiener'                                       THEN 300
  WHEN name ~* 'm[üu]nch|munich'                                     THEN 292
  WHEN name ~* 'weizen|wheat|weizenmalz'                             THEN 309
  WHEN name ~* 'roggen|rye'                                          THEN 292
  WHEN name ~* 'dinkel|spelt'                                        THEN 284
  WHEN name ~* 'hafer|haferflocken|flaked.{0,5}oat|\moat.{0,5}malt\M' THEN 267
  WHEN name ~* 'flaked.{0,5}barley'                                  THEN 267
  WHEN name ~* 'rauch|smoked|peated|peat'                            THEN 300
  WHEN name ~* 'mais|corn|flaked.{0,5}corn|flaked.{0,5}maize'       THEN 309
  WHEN name ~* 'reis|rice|flaked.{0,5}rice'                          THEN 309

  -- ── Roasted / Dark Malts ────────────────────────────────────────────────
  WHEN name ~* 'schokoladen|chocolate|chocolat'                      THEN 250
  WHEN name ~* 'coffee|kaffee'                                       THEN 242
  -- "roast.*barley" with .* to catch "Roasted Barley", "Fawcett Roasted Barley" etc.
  WHEN name ~* 'r[öo]st.*gerste|roast.*barley'                       THEN 234
  WHEN name ~* 'black.{0,5}malt|schwarzmalz|farbmalz'               THEN 234
  -- standalone black (BlackSwaen© Black, Château Black)
  WHEN name ~* '\mblack\M'                                            THEN 234
  WHEN name ~* 'r[öo]stmalz|roasted.{0,5}malt'                      THEN 242

  -- ── Specialty / Kilned Malts ─────────────────────────────────────────────
  WHEN name ~* 'melanoidin'                                          THEN 284
  WHEN name ~* 'biscuit|bisquit|keks'                                THEN 284
  WHEN name ~* 'amber.{0,5}malt'                                     THEN 284
  WHEN name ~* 'brown.{0,5}malt|\mbrown\M'                           THEN 267
  WHEN name ~* 'acidulated|sauermalz|\msauer\M'                      THEN 267
  WHEN name ~* 'victory'                                             THEN 284
  WHEN name ~* 'abbey'                                               THEN 284
  WHEN name ~* 'aromatic'                                            THEN 284
  WHEN name ~* 'chit'                                                THEN 300

  -- ── Fallback: base malt average ─────────────────────────────────────────
  ELSE 300

END
WHERE type = 'malt'
  AND name != 'Unbekanntes Malz';  -- keep NULL for the fallback ingredient
