const fs = require('fs');

const sourceFile = 'supabase/migrations/20260314180000_stage5_brand_voice.sql';
let content = fs.readFileSync(sourceFile, 'utf8');

// The replacement logic updates get_user_brew_context to use weighted averages
content = content.replace(/ROUND\(AVG\(r\.rating\)::numeric,\ 1\)/g, "ROUND((SUM(r.rating * COALESCE(r.plausibility_score, 1.0)) / NULLIF(SUM(COALESCE(r.plausibility_score, 1.0)), 0))::numeric, 1)");

content = content.replace(/ORDER\ BY\ AVG\(r\.rating\)\ DESC/g, "ORDER BY (SUM(r.rating * COALESCE(r.plausibility_score, 1.0)) / NULLIF(SUM(COALESCE(r.plausibility_score, 1.0)), 0)) DESC");

content = content.replace(/AND r\.moderation_status = 'auto_approved'/g, "AND r.moderation_status = 'auto_approved'\n              AND r.is_shadowbanned = false");

fs.writeFileSync('supabase/migrations/20260317220000_plausibility_weighted_average.sql', content);
console.log("Migration created.");