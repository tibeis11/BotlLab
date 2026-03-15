/**
 * scripts/validate-ingredient-migration.js
 *
 * Prüft den Migrationsstand von JSONB → recipe_ingredients.
 * Zeigt genau wie viele Rezepte noch migriert werden müssen
 * und ob Datenverlust droht.
 *
 * Usage:
 *   node scripts/validate-ingredient-migration.js
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

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

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(n, total) {
  if (total === 0) return '–';
  return ((n / total) * 100).toFixed(1) + '%';
}

function row(label, value, note = '') {
  const pad = label.padEnd(45, ' ');
  const val = String(value).padStart(6, ' ');
  return `  ${pad} ${val}${note ? '   ' + note : ''}`;
}

function section(title) {
  console.log('\n' + '─'.repeat(60));
  console.log('  ' + title);
  console.log('─'.repeat(60));
}

// ── Queries ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🔍  BotlLab Ingredient-Migration Validierung');
  console.log('='.repeat(60));

  // 1. Gesamtanzahl Brews
  const { count: totalBrews } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true });

  // 2. Brews mit ingredients_migrated = true
  const { count: migratedCount } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('ingredients_migrated', true);

  // 3. Brews mit ingredients_migrated = false (oder null)
  const { count: notMigratedCount } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .or('ingredients_migrated.eq.false,ingredients_migrated.is.null');

  section('1 · Migrations-Tracking (ingredients_migrated Flag)');
  console.log(row('Gesamt Brews', totalBrews));
  console.log(row('ingredients_migrated = true', migratedCount, `(${pct(migratedCount, totalBrews)})`));
  console.log(row('ingredients_migrated = false / null', notMigratedCount, `(${pct(notMigratedCount, totalBrews)})`));

  // 4. Brews die noch JSONB-Malze haben
  const { count: hasJsonbMalts } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .not('data->malts', 'is', null);

  const { count: hasJsonbHops } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .not('data->hops', 'is', null);

  const { count: hasJsonbYeast } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .not('data->yeast', 'is', null);

  section('2 · JSONB-Blob Status (alte Daten noch vorhanden?)');
  console.log(row('Brews mit data->malts (JSONB)', hasJsonbMalts, `(${pct(hasJsonbMalts, totalBrews)})`));
  console.log(row('Brews mit data->hops (JSONB)', hasJsonbHops, `(${pct(hasJsonbHops, totalBrews)})`));
  console.log(row('Brews mit data->yeast (JSONB)', hasJsonbYeast, `(${pct(hasJsonbYeast, totalBrews)})`));

  // 5. Brews mit recipe_ingredients-Einträgen
  const { data: brewsWithRI } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .limit(10000);

  const uniqueBrewsWithRI = new Set((brewsWithRI ?? []).map(r => r.recipe_id)).size;

  const { count: totalRI } = await supabase
    .from('recipe_ingredients')
    .select('id', { count: 'exact', head: true });

  section('3 · recipe_ingredients Tabelle');
  console.log(row('Gesamt recipe_ingredients Zeilen', totalRI));
  console.log(row('Brews mit ≥1 recipe_ingredient', uniqueBrewsWithRI, `(${pct(uniqueBrewsWithRI, totalBrews)})`));

  // 6. Kritisch: Brews mit JSONB-Malzen OHNE recipe_ingredients (noch nicht migriert)
  // Wir holen uns IDs der Brews mit JSONB-Malzen
  const { data: jsonbBrews } = await supabase
    .from('brews')
    .select('id, data')
    .not('data->malts', 'is', null)
    .limit(5000);

  const jsonbIds = new Set((jsonbBrews ?? []).map(b => b.id));
  const riIds = new Set((brewsWithRI ?? []).map(r => r.recipe_id));

  // JSONB vorhanden UND kein RI → braucht Migration
  const needsMigration = [...jsonbIds].filter(id => !riIds.has(id));
  // JSONB vorhanden UND RI vorhanden → Duplikat (beide Systeme gleichzeitig aktiv)
  const hasBoth = [...jsonbIds].filter(id => riIds.has(id));
  // Kein JSONB, kein RI → potenziell leeres Rezept (ok wenn kein Zutaten)
  const noIngredients = totalBrews - jsonbIds.size - (uniqueBrewsWithRI - hasBoth.length);

  section('4 · Migrationsstatus-Analyse');
  console.log(row('Nur JSONB (braucht Migration)', needsMigration.length, needsMigration.length > 0 ? '⚠️  MIGRATION NÖTIG' : '✅'));
  console.log(row('JSONB + RI (beide aktiv)', hasBoth.length, hasBoth.length > 0 ? '⚠️  JSONB kann bereinigt werden' : '✅'));
  console.log(row('Nur RI (vollständig migriert)', uniqueBrewsWithRI - hasBoth.length, '✅'));

  // 7. Stichproben für Brews die noch JSONB haben
  if (needsMigration.length > 0) {
    section('5 · Beispiele: Brews die noch migriert werden müssen');
    const examples = (jsonbBrews ?? [])
      .filter(b => needsMigration.includes(b.id))
      .slice(0, 5);

    for (const b of examples) {
      const malts = b.data?.malts?.length ?? 0;
      const hops  = b.data?.hops?.length ?? 0;
      const yeast = b.data?.yeast?.length ?? 0;
      console.log(`  brew ${b.id.slice(0, 8)}…  malts:${malts}  hops:${hops}  yeast:${yeast}`);
    }
    if (needsMigration.length > 5) {
      console.log(`  … und ${needsMigration.length - 5} weitere`);
    }
  }

  // 8. Fazit
  section('6 · Fazit & nächste Schritte');

  if (needsMigration.length === 0 && hasBoth.length === 0) {
    console.log('  ✅ Vollständig migriert — JSONB-Keys können sicher gelöscht werden.');
  } else if (needsMigration.length === 0 && hasBoth.length > 0) {
    console.log(`  ⚠️  ${hasBoth.length} Brews haben sowohl JSONB als auch RI.`);
    console.log('     → JSONB-Bereinigung via Migration ausführen (UPDATE brews SET data = data - \'malts\' - \'hops\' - \'yeast\')');
  } else {
    console.log(`  🔴 ${needsMigration.length} Brews brauchen noch Migration.`);
    console.log('     → Migration-Script ausführen, dann erneut validieren.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

run().catch(err => {
  console.error('❌ Fehler:', err.message);
  process.exit(1);
});
