const fs = require('fs');
let s = fs.readFileSync('app/team/[breweryId]/analytics/page.tsx', 'utf8');

// Replace all remaining âŒ
s = s.replace(/âŒ/g, '❌');

fs.writeFileSync('app/team/[breweryId]/analytics/page.tsx', s);
