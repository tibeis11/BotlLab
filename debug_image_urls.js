const { createClient } = require('@supabase/supabase-js');

// Values from .env.local
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; // Anon key from file

if (!supabaseUrl || !supabaseKey) {

  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrews() {
  console.log('Fetching top 5 public brews...');
  const { data, error } = await supabase
    .from('brews')
    .select('id, name, image_url, is_public')
    .eq('is_public', true)
    .limit(5);

  if (error) {
    console.error('Error fetching brews:', error);
    return;
  }

  console.log('Found stats:', data.length);
  data.forEach((brew, i) => {
    console.log(`[${i}] ${brew.name}`);
    console.log(`    URL: ${brew.image_url}`);
    console.log(`    Public: ${brew.is_public}`);
  });
}

checkBrews();
