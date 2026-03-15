/**
 * scripts/migrate-jsonb-ingredients.js
 *
 * Migriert JSONB-Zutaten (data->malts/hops/yeast) aller bestehenden Brews
 * in die neue recipe_ingredients-Tabelle.
 *
 * Nutzt die match_ingredient RPC für Smart-Matching (3 Stufen).
 * Idempotent: bereits migrierte Brews (ingredients_migrated = true) werden übersprungen.
 *
 * Usage:
 *   node scripts/migrate-jsonb-ingredients.js [--dry-run]
 *
 * --dry-run: Zeigt nur was passieren würde, schreibt nichts.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// Credentials: aus Env-Vars oder explizit via --url / --key Flags
const args = process.argv.slice(2).filter(a => !a.startsWith('--') || a === '--dry-run');
const urlFlag  = process.argv.find(a => a.startsWith('--url='))?.split('=')[1];
const keyFlag  = process.argv.find(a => a.startsWith('--key='))?.split('=')[1];

const supabaseUrl = urlFlag ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = keyFlag ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehlende DB-Credentials.');
  console.error('   Option A: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('   Option B: --url=https://xxx.supabase.co --key=service_role_key_here');
  process.exit(1);
}

const isLocal = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');

const isDryRun = process.argv.includes('--dry-run');
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Fallback-Master-IDs für nicht erkannte Zutaten
const FALLBACK_MASTERS = {
  malt:  '00000000-0000-4000-a000-000000000001',
  hop:   '00000000-0000-4000-a000-000000000002',
  yeast: '00000000-0000-4000-a000-000000000003',
  misc:  '00000000-0000-4000-a000-000000000004',
};

function safeNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

async function matchIngredient(name, type) {
  if (!name) return null;
  try {
    const { data, error } = await supabase.rpc('match_ingredient', {
      search_term: name,
      search_type: type,
    });
    if (error || !data || data.length === 0) return null;
    return data[0]; // Bestes Match
  } catch {
    return null;
  }
}

// ── Haupt-Migration ───────────────────────────────────────────────────────────

async function migrateBrew(brew, stats) {
  const data = brew.data ?? {};
  const malts  = Array.isArray(data.malts)  ? data.malts  : [];
  const hops   = Array.isArray(data.hops)   ? data.hops   : [];
  const yeast  = Array.isArray(data.yeast)  ? data.yeast  : [];

  if (malts.length === 0 && hops.length === 0 && yeast.length === 0) {
    // Kein JSONB-Inhalt — direkt als migriert markieren
    if (!isDryRun) {
      await supabase.from('brews').update({ ingredients_migrated: true }).eq('id', brew.id);
    }
    stats.empty++;
    return;
  }

  const inserts = [];
  let matched = 0;
  let unmatched = 0;

  // ── Malze ──
  for (let i = 0; i < malts.length; i++) {
    const m = malts[i];
    const name = m.name || '';
    const match = await matchIngredient(name, 'malt');
    const masterId = match?.master_id ?? FALLBACK_MASTERS.malt;

    if (match) matched++; else unmatched++;

    inserts.push({
      recipe_id:         brew.id,
      master_id:         masterId,
      product_id:        match?.product_id ?? null,
      raw_name:          name || 'Unbekanntes Malz',
      type:              'malt',
      amount:            safeNum(m.amount),
      unit:              m.unit || 'kg',
      override_color_ebc: safeNum(m.color_ebc ?? m.color),
      sort_order:        i,
    });
  }

  // ── Hopfen ──
  for (let i = 0; i < hops.length; i++) {
    const h = hops[i];
    const name = h.name || '';
    const match = await matchIngredient(name, 'hop');
    const masterId = match?.master_id ?? FALLBACK_MASTERS.hop;

    if (match) matched++; else unmatched++;

    inserts.push({
      recipe_id:    brew.id,
      master_id:    masterId,
      product_id:   match?.product_id ?? null,
      raw_name:     name || 'Unbekannter Hopfen',
      type:         'hop',
      amount:       safeNum(h.amount),
      unit:         h.unit || 'g',
      time_minutes: safeNum(h.time),
      usage:        h.usage || 'boil',
      override_alpha: safeNum(h.alpha),
      sort_order:   i,
    });
  }

  // ── Hefe ──
  for (let i = 0; i < yeast.length; i++) {
    const y = yeast[i];
    const name = y.name || '';
    const match = await matchIngredient(name, 'yeast');
    const masterId = match?.master_id ?? FALLBACK_MASTERS.yeast;

    if (match) matched++; else unmatched++;

    inserts.push({
      recipe_id:            brew.id,
      master_id:            masterId,
      product_id:           match?.product_id ?? null,
      raw_name:             name || 'Unbekannte Hefe',
      type:                 'yeast',
      amount:               safeNum(y.amount),
      unit:                 y.unit || 'pkg',
      override_attenuation: safeNum(y.attenuation),
      sort_order:           i,
    });
  }

  stats.matched   += matched;
  stats.unmatched += unmatched;

  if (isDryRun) {
    const total = malts.length + hops.length + yeast.length;
    console.log(`  [dry-run] brew ${brew.id.slice(0,8)}… → ${inserts.length} Zutaten, ${matched}/${total} gematcht`);
    stats.would_migrate++;
    return;
  }

  // Erst alte recipe_ingredients löschen (Idempotenz)
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', brew.id);

  // Neue Zeilen einfügen
  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('recipe_ingredients').insert(inserts);
    if (insertError) {
      console.error(`  ❌ brew ${brew.id.slice(0,8)}… Insert-Fehler:`, insertError.message);
      stats.errors++;
      return;
    }
  }

  // JSONB-Keys entfernen + ingredients_migrated setzen
  const newData = { ...data };
  delete newData.malts;
  delete newData.hops;
  delete newData.yeast;

  const { error: updateError } = await supabase
    .from('brews')
    .update({ data: newData, ingredients_migrated: true })
    .eq('id', brew.id);

  if (updateError) {
    console.error(`  ❌ brew ${brew.id.slice(0,8)}… Update-Fehler:`, updateError.message);
    stats.errors++;
    return;
  }

  stats.migrated++;
}

async function run() {
  console.log('\n🔄  BotlLab JSONB → recipe_ingredients Migration');
  if (isDryRun) console.log('    (DRY RUN — keine Änderungen werden geschrieben)');
  console.log('='.repeat(60));

  if (!isDryRun && !isLocal) {
    console.log('\n⚠️  PRODUKTION ERKANNT — diese Aktion ist nicht umkehrbar!');
    console.log('   URL:', supabaseUrl);
    console.log('   Starte in 5 Sekunden… (Ctrl+C zum Abbrechen)\n');
    await new Promise(r => setTimeout(r, 5000));
  }

  // Alle noch nicht migrierten Brews laden (in Batches)
  const BATCH_SIZE = 50;
  let offset = 0;
  let totalFetched = 0;

  const stats = {
    migrated: 0,
    empty: 0,
    errors: 0,
    would_migrate: 0,
    matched: 0,
    unmatched: 0,
  };

  while (true) {
    const { data: brews, error } = await supabase
      .from('brews')
      .select('id, data')
      .or('ingredients_migrated.eq.false,ingredients_migrated.is.null')
      .not('data', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Fehler beim Laden der Brews:', error.message);
      break;
    }

    if (!brews || brews.length === 0) break;

    // Nur Brews mit echten JSONB-Zutaten
    const toMigrate = brews.filter(b =>
      Array.isArray(b.data?.malts) && b.data.malts.length > 0 ||
      Array.isArray(b.data?.hops)  && b.data.hops.length  > 0 ||
      Array.isArray(b.data?.yeast) && b.data.yeast.length > 0
    );

    console.log(`\n  Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${brews.length} Brews geladen, ${toMigrate.length} mit JSONB-Zutaten`);

    for (const brew of toMigrate) {
      await migrateBrew(brew, stats);
    }

    // Brews ohne JSONB-Zutaten direkt als migriert markieren
    const emptyBrews = brews.filter(b =>
      !Array.isArray(b.data?.malts) || b.data.malts.length === 0
    ).filter(b =>
      !Array.isArray(b.data?.hops)  || b.data.hops.length  === 0
    ).filter(b =>
      !Array.isArray(b.data?.yeast) || b.data.yeast.length === 0
    );

    if (!isDryRun && emptyBrews.length > 0) {
      for (const b of emptyBrews) {
        const cleanData = { ...(b.data ?? {}) };
        delete cleanData.malts;
        delete cleanData.hops;
        delete cleanData.yeast;
        await supabase
          .from('brews')
          .update({ data: cleanData, ingredients_migrated: true })
          .eq('id', b.id);
      }
      stats.empty += emptyBrews.length;
    }

    totalFetched += brews.length;
    offset += BATCH_SIZE;

    if (brews.length < BATCH_SIZE) break; // Letzte Seite
  }

  // ── Cleanup: bereits migrierte Brews die noch JSONB-Keys haben ──────────────
  if (!isDryRun) {
    const { data: stragglers } = await supabase
      .from('brews')
      .select('id, data')
      .eq('ingredients_migrated', true)
      .not('data', 'is', null)
      .limit(1000);

    const toClean = (stragglers ?? []).filter(b =>
      b.data && ('malts' in b.data || 'hops' in b.data || 'yeast' in b.data)
    );

    if (toClean.length > 0) {
      console.log(`\n  Cleanup: ${toClean.length} migrierte Brews mit verbleibenden JSONB-Keys bereinigen…`);
      for (const b of toClean) {
        const cleanData = { ...b.data };
        delete cleanData.malts;
        delete cleanData.hops;
        delete cleanData.yeast;
        await supabase.from('brews').update({ data: cleanData }).eq('id', b.id);
      }
      console.log(`  ✅ ${toClean.length} Brews bereinigt.`);
    }
  }

  // ── Ergebnis ──
  console.log('\n' + '='.repeat(60));
  console.log('  Ergebnis:');

  if (isDryRun) {
    const total = stats.matched + stats.unmatched;
    console.log(`  Würde migrieren:   ${stats.would_migrate} Brews`);
    console.log(`  Match-Rate:        ${total > 0 ? ((stats.matched / total) * 100).toFixed(1) : 0}% (${stats.matched}/${total} Zutaten erkannt)`);
  } else {
    const total = stats.matched + stats.unmatched;
    console.log(`  ✅ Migriert:       ${stats.migrated} Brews`);
    console.log(`  ✅ Leer (kein JSONB): ${stats.empty} Brews`);
    console.log(`  ❌ Fehler:         ${stats.errors} Brews`);
    console.log(`  Match-Rate:        ${total > 0 ? ((stats.matched / total) * 100).toFixed(1) : 0}% (${stats.matched}/${total} Zutaten erkannt)`);

    if (stats.errors === 0) {
      console.log('\n  ✅ Migration abgeschlossen. Validierung ausführen:');
      console.log('     node scripts/validate-ingredient-migration.js');
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

run().catch(err => {
  console.error('❌ Unerwarteter Fehler:', err.message);
  process.exit(1);
});
