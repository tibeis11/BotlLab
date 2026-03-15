/**
 * scripts/rematch-recipe-ingredients.js
 *
 * Führt Smart-Matching für alle recipe_ingredients-Zeilen durch,
 * die noch auf einen Fallback-Master zeigen (00000000-...).
 *
 * Usage:
 *   node scripts/rematch-recipe-ingredients.js [--dry-run] [--url=...] [--key=...]
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const urlFlag = process.argv.find(a => a.startsWith('--url='))?.split('=')[1];
const keyFlag = process.argv.find(a => a.startsWith('--key='))?.split('=')[1];

const supabaseUrl = urlFlag ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = keyFlag ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehlende DB-Credentials.');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const supabase = createClient(supabaseUrl, supabaseKey);

const FALLBACK_IDS = [
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000003',
  '00000000-0000-4000-a000-000000000004',
];

async function matchIngredient(name, type) {
  if (!name) return null;
  try {
    const { data, error } = await supabase.rpc('match_ingredient', {
      search_term: name,
      search_type: type,
    });
    if (error || !data || data.length === 0) return null;
    return data[0];
  } catch {
    return null;
  }
}

async function run() {
  console.log('\n🔗  BotlLab recipe_ingredients Rematch');
  if (isDryRun) console.log('    (DRY RUN)');
  console.log('    Ziel:', supabaseUrl);
  console.log('='.repeat(60));

  // Alle recipe_ingredients mit Fallback-master_id laden
  const { data: rows, error } = await supabase
    .from('recipe_ingredients')
    .select('id, raw_name, type, master_id')
    .in('master_id', FALLBACK_IDS)
    .limit(10000);

  if (error) { console.error('❌', error.message); process.exit(1); }

  console.log(`\n  ${rows.length} Zeilen mit Fallback-Master gefunden.\n`);

  if (rows.length === 0) {
    console.log('  ✅ Nichts zu tun.\n');
    return;
  }

  let matched = 0, unmatched = 0, errors = 0;

  for (const row of rows) {
    const match = await matchIngredient(row.raw_name, row.type);

    if (!match) {
      unmatched++;
      continue;
    }

    // Bestes Produkt für diesen Master laden
    const { data: products } = await supabase
      .from('ingredient_products')
      .select('id')
      .eq('master_id', match.master_id)
      .limit(1);

    const productId = products?.[0]?.id ?? null;

    if (isDryRun) {
      console.log(`  [dry] ${row.raw_name.padEnd(30)} → ${match.name} (Level ${match.match_level})`);
      matched++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('recipe_ingredients')
      .update({ master_id: match.master_id, product_id: productId })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  ❌ ${row.raw_name}: ${updateError.message}`);
      errors++;
    } else {
      matched++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  ✅ Gematcht:    ${matched}`);
  console.log(`  ⚠️  Kein Match: ${unmatched} (bleiben auf Fallback)`);
  if (errors) console.log(`  ❌ Fehler:     ${errors}`);
  console.log(`  Match-Rate:    ${((matched / rows.length) * 100).toFixed(1)}%`);
  console.log('\n' + '='.repeat(60) + '\n');
}

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
