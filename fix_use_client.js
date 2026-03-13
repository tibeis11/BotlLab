const fs = require('fs');
const filesToPatch = [
  'app/discover/DiscoverClient.tsx',
  'app/discover/_components/DiscoverSection.tsx',
  'app/components/DiscoverBrewCard.tsx',
  'app/components/BrewCard.tsx',
  'app/b/[id]/page.tsx',
  'app/brewer/[id]/page.tsx',
  'app/brew/[id]/page.tsx',
  'app/brew/[id]/layout.tsx',
  'app/team/[breweryId]/analytics/brew/[brewId]/page.tsx',
  'app/api/analytics/anomaly-detector/route.ts',
  'app/api/reports/dispatch/route.ts'
];
for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let needsFix = false;
    
    if (content.includes("'use client'") && content.indexOf("'use client'") > content.indexOf('import ')) {
       content = content.replace(/'use client';/g, "");
       content = "'use client';\n" + content;
       needsFix = true;
    }
    else if (content.includes('"use client"') && content.indexOf('"use client"') > content.indexOf('import ')) {
       content = content.replace(/"use client";/g, "");
       content = '"use client";\n' + content;
       needsFix = true;
    }
    
    if (needsFix) {
       fs.writeFileSync(file, content, 'utf8');
       console.log('Fixed', file);
    }
  }
}
