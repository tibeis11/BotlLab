
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Checking columns for brewing_sessions...");
    
    // Attempt to insert a dummy row (will fail RLS or constraints, but might show if column exists)
    // Or just select and look at the returned object keys if we have data.
    // If table is empty, we can't see columns via select *.
    // We can try to filter by the column.
    
    const { data, error } = await supabase
        .from('brewing_sessions')
        .select('batch_code') // Specific column select
        .limit(1);

    if (error) {
        console.log("Error selecting batch_code:", error.message);
    } else {
        console.log("Success selecting batch_code. Columns visible.");
    }
}

checkColumns();
