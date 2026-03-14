import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supa = createClient(url, key);
async function run() {
  const { data, error } = await supa.from('ingredient_master').select('id, name, type, color_ebc, potential_pts, aliases').in('type', ['malt']);
  console.log('Got', data.length, 'records');
  if(data.length > 0) console.log(data[0]);
}
run();
