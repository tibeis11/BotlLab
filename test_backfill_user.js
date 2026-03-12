const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const userId = '6ac6b581-9ee6-45f4-9cb3-2fc8c3f4a9cc';
    
    console.log("EVENTS for user:");
    const { data: events } = await supabase.from('tasting_score_events').select('*').eq('user_id', userId);
    for (let e of events) console.log(`${e.id} | ${e.event_type} | ${e.created_at} | brew: ${e.brew_id}`);
    
    console.log("\nSCANS for user:");
    const { data: scans } = await supabase.from('bottle_scans').select('*').eq('viewer_user_id', userId);
    for (let s of scans) console.log(`${s.id} | ${s.created_at} | brew: ${s.brew_id}`);
}

main();