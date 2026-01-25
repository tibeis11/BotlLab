const { createClient } = require('@supabase/supabase-js');

// Load env from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing ENV variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRatings() {
    const targetId = 'bef36fda-34d2-45a6-b5c1-3b439995e16c';
    console.log(`Checking for rating ID: ${targetId}`);

    const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('id', targetId);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Found:", data);
    }
}

checkRatings();
