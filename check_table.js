
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Need service role key to manage DB usually, but we check select with anon

if (!supabaseUrl || !supabaseKey) {
    console.log("No env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking brewing_sessions table...");
    const { data, error } = await supabase.from('brewing_sessions').select('*').limit(1);
    if (error) console.log("Error checking sessions:", error.message);
    else console.log("Success. brewing_sessions exists.");

    console.log("Checking brew_measurements table...");
    // Check existing table
    const { data: data2, error: error3 } = await supabase.from('brew_measurements').select('*').limit(1);
    
    if (error3) {
        console.log("Error checking brew_measurements table:", error3.message);
    } else {
        console.log("Success. brew_measurements exists.");
    }

    // Control check - should fail
    const { error: error2 } = await supabase.from('non_existent_table_123').select('*').limit(1);
    if (error2) {
        console.log("Control check passed (expected error on missing table):", error2.message);
    } else {
        console.log("WARNING: Control check failed. Client might be returning success for everything.");
    }
}

check();
