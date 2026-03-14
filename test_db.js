import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supa = createClient(url, key);
async function run() {
  const { data, error } = await supa.from('ingredient_master').select('*').limit(5);
  console.log('Result:', data);
  console.log('Error:', error);
}
run();
