import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('bottle_scans').select('id, confirmed_drinking, converted_to_rating');
  const countConfirmed = data.filter(d => d.confirmed_drinking === true).length;
  const countRated = data.filter(d => d.converted_to_rating === true).length;
  console.log(`Total scans: ${data.length}`);
  console.log(`confirmed_drinking = true: ${countConfirmed}`);
  console.log(`converted_to_rating = true: ${countRated}`);
}
run();
