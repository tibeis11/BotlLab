const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: events } = await supabase.from('tasting_score_events').select('*');
    
    for (let e of events) {
        if (!e.bottle_scan_id) {
            console.log(`\nEvent: ${e.id} | User: ${e.user_id} | Brew: ${e.brew_id} | Type: ${e.event_type} | Date: ${e.created_at}`);
            
            // Check any scans for this user
            const { data: scansUser } = await supabase.from('bottle_scans').select('*').eq('viewer_user_id', e.user_id);
            console.log(` Scans by this user overall: ${scansUser?.length || 0}`);
            
            // Check any scans to this brew overall 
            const { data: scansBrew } = await supabase.from('bottle_scans').select('*').eq('brew_id', e.brew_id);
            console.log(` Scans of this brew overall: ${scansBrew?.length || 0}`);
        }
    }
}

main();