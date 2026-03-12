const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("Testing how many tasting_score_events match conditions...");
    
    // Check total and linked
    const { data: total, error: e1 } = await supabase.from('tasting_score_events')
      .select('id, user_id, brew_id, bottle_scan_id');
      
    if (e1) return console.error(e1);
    
    console.log(`Total events: ${total.length}`);
    console.log(`Linked bottle_scan_id: ${total.filter(e => e.bottle_scan_id).length}`);
    console.log(`Missing user_id: ${total.filter(e => !e.user_id).length}`);
    console.log(`Missing brew_id: ${total.filter(e => !e.brew_id).length}`);
    
    // Check how many have a corresponding scan within 24 hours
    const events = total.filter(e => e.user_id && e.brew_id && !e.bottle_scan_id);
    console.log(`Events to backfill: ${events.length}`);
    
    let matched = 0;
    for (let e of events) {
      // Find matching scan
      const { data: scan, error: e2 } = await supabase.from('bottle_scans')
        .select('id, viewer_user_id, brew_id')
        .eq('viewer_user_id', e.user_id)
        .eq('brew_id', e.brew_id);
        
      if (e2) console.error(e2);
      if (scan && scan.length > 0) {
          matched++;
      } else {
          // Maybe it's not the viewer_user_id, or they just scanned anonymously before logging in? Or no user_id?
      }
    }
    console.log(`Events that have *any* matching scan (ignoring time): ${matched}`);
}

main();