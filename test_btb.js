const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: scan } = await supabase.from('bottle_scans').select('*').order('created_at', {ascending: false}).limit(1).single();
  console.log(scan);
}
run();
