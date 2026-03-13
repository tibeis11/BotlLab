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
let utilityImport = "import { calcWeightedAvg } from '@/lib/rating-utils';\n";

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const orig = content;
    content = content.replace(/rs\.reduce\(\(s,\s*r\)\s*=>\s*s\s*\+\s*r\.rating,\s*0\)\s*\/\s*rs\.length/g, "calcWeightedAvg(rs)");
    content = content.replace(/b\.ratings!\.reduce\(\(s,\s*x\)\s*=>\s*s\s*\+\s*x\.rating,\s*0\)\s*\/\s*n/g, "calcWeightedAvg(b.ratings!)");
    content = content.replace(/t\.ratings!\.reduce\(\(s,\s*r\)\s*=>\s*s\s*\+\s*r\.rating,\s*0\)\s*\/\s*ratingCount/g, "calcWeightedAvg(t.ratings!)");
    content = content.replace(/brew\.ratings\.reduce\(\(s,\s*r\)\s*=>\s*s\s*\+\s*r\.rating,\s*0\)\s*\/\s*brew\.ratings\.length/g, "calcWeightedAvg(brew.ratings)");
    content = content.replace(/ratings\.reduce\(\(s,\s*r\)\s*=>\s*s\s*\+\s*r\.rating,\s*0\)\s*\/\s*ratings\.length/g, "calcWeightedAvg(ratings)");
    content = content.replace(/ratings\.reduce\(\(sum,\s*r\)\s*=>\s*sum\s*\+\s*r\.rating,\s*0\)\s*\/\s*ratings\.length/g, "calcWeightedAvg(ratings)");
    content = content.replace(/ratingsData\.reduce\(\(sum,\s*r\)\s*=>\s*sum\s*\+\s*r\.rating,\s*0\)\s*\/\s*ratingsData\.length/g, "calcWeightedAvg(ratingsData)");
    content = content.replace(/consumerRatings\.reduce\(\(s:\s*number,\s*r:\s*any\)\s*=>\s*s\s*\+\s*r\.rating,\s*0\)\s*\/\s*totalConsumerRatings/g, "calcWeightedAvg(consumerRatings)");
    content = content.replace(/ratings\.reduce\(\(s:\s*number,\s*r:\s*\{\s*rating:\s*number\s*\}\)\s*=>\s*s\s*\+\s*r\.rating,\s*0\)\s*\/\s*ratingCount/g, "calcWeightedAvg(ratings)");
    content = content.replace(/currentRatings\.reduce\(\(sum,\s*r\)\s*=>\s*sum\s*\+\s*\(r\.rating\s*\?\?\s*0\),\s*0\)\s*\/\s*currentRatings\.length/g, "calcWeightedAvg(currentRatings)");
    content = content.replace(/prevRatings\.reduce\(\(sum,\s*r\)\s*=>\s*sum\s*\+\s*\(r\.rating\s*\?\?\s*0\),\s*0\)\s*\/\s*prevRatings\.length/g, "calcWeightedAvg(prevRatings)");
    content = content.replace(/ratings\.reduce\(\(a,\s*b\)\s*=>\s*a\s*\+\s*b,\s*0\)\s*\/\s*ratings\.length/g, "calcWeightedAvg(ratings)");

    if (content !== orig) {
      if (!content.includes('import { calcWeightedAvg }')) {
        const lines = content.split('\n');
        let idx = lines.findIndex(l => !l.startsWith('import ') && !l.startsWith('//') && l.trim().length > 0);
        if (idx === -1) idx = 0;
        lines.splice(idx, 0, utilityImport);
        content = lines.join('\n');
      }
      fs.writeFileSync(file, content, 'utf8');
      console.log('Patched', file);
    }
  }
}
