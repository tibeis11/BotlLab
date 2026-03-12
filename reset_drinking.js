import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('bottle_scans').select('id');
  console.log(`Resetting ${data.length} scans to confirmed_drinking = null...`);
  
  const { error } = await supabase
    .from('bottle_scans')
    .update({ confirmed_drinking: null })
    .in('id', data.map(d => d.id));
    
  if (error) console.error(error);
  else console.log('Reset complete!');
  
  // Set just a couple to true so the graph isn't entirely empty
  if (data.length > 2) {
    await supabase.from('bottle_scans').update({ confirmed_drinking: true }).in('id', [data[0].id, data[1].id]);
    console.log('Set 2 scans to true for testing.');
  }
}
run();
