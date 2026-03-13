const fs = require('fs');

function replaceBreweryPage() {
    const file = 'app/brewery/[id]/page.tsx';
    if(!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    const oldSelect = ".select('rating')";
    const newSelect = ".select('rating, plausibility_score, is_shadowbanned')";
    content = content.replace(oldSelect, newSelect);

    const oldAvg = `const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;`;
    const newAvg = `let totalScore = 0;
                    let totalWeight = 0;
                    let validCount = 0;
                    ratings.forEach(r => {
                        if (r.is_shadowbanned) return;
                        const weight = r.plausibility_score ?? 1.0;
                        totalScore += r.rating * weight;
                        totalWeight += weight;
                        validCount++;
                    });
                    if (validCount === 0) return; // Skip if all are shadowbanned
                    const avg = totalWeight > 0 ? totalScore / totalWeight : 0;`;

    // Only replace if it hasn't been replaced yet
    if(content.includes(oldAvg)) {
        content = content.replace(oldAvg, newAvg);
        content = content.replace('count: ratings.length', 'count: validCount');
        fs.writeFileSync(file, content);
        console.log("Patched", file);
    }
}

function replaceTeamDashboardPage() {
    const file = 'app/team/[breweryId]/dashboard/page.tsx';
    if(!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    const oldSelect = ".select('rating')";
    const newSelect = ".select('rating, plausibility_score, is_shadowbanned')";
    content = content.replace(oldSelect, newSelect);

    const oldLogic = `const count = allRatings.length;
            const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
            const avg = Math.round((sum / count) * 10) / 10;
            const dist = [0,0,0,0,0];
            allRatings.forEach(r => {
                if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
            });
            setGlobalRatingStats({ avg, total: count, distribution: dist });`;

    const newLogic = `let totalScore = 0;
            let totalWeight = 0;
            let validCount = 0;
            const dist = [0,0,0,0,0];
            
            allRatings.forEach(r => {
                if (r.is_shadowbanned) return;
                const weight = r.plausibility_score ?? 1.0;
                totalScore += r.rating * weight;
                totalWeight += weight;
                validCount++;
                
                if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
            });

            if (validCount > 0) {
                const avg = Math.round((totalWeight > 0 ? (totalScore / totalWeight) : 0) * 10) / 10;
                setGlobalRatingStats({ avg, total: validCount, distribution: dist });
            }`;

    if(content.includes('const sum = allRatings.reduce')) {
        content = content.replace(oldLogic, newLogic);
        fs.writeFileSync(file, content);
        console.log("Patched", file);
    } else {
        console.log("Team dashboard logic not found");
    }
}

function replaceAnomalyDetector() {
    const file = 'app/api/analytics/anomaly-detector/route.ts';
    if(!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // There are three selects in anomaly detector
    content = content.replaceAll(".select('rating')", ".select('rating, plausibility_score, is_shadowbanned')");

    const oldAvgFunc = `  const validRatings = data.filter((r) => r.rating != null);
  if (validRatings.length === 0) return null;

  const avg = validRatings.reduce((acc, r) => acc + r.rating, 0) / validRatings.length;
  return { avg, count: validRatings.length };`;

    const newAvgFunc = `  const validRatings = data.filter((r) => r.rating != null && !r.is_shadowbanned);
  if (validRatings.length === 0) return null;

  let totalScore = 0;
  let totalWeight = 0;
  validRatings.forEach(r => {
      const weight = r.plausibility_score ?? 1.0;
      totalScore += r.rating * weight;
      totalWeight += weight;
  });

  const avg = totalWeight > 0 ? totalScore / totalWeight : 0;
  return { avg, count: validRatings.length };`;

  if(content.includes('const avg = validRatings.reduce((acc, r) => acc + r.rating, 0)')) {
      content = content.replace(oldAvgFunc, newAvgFunc);
      fs.writeFileSync(file, content);
      console.log("Patched rating logic in anomaly detector");
  } else {
      console.log("Anomaly detector Logic not found");
  }
}

replaceBreweryPage();
replaceTeamDashboardPage();
replaceAnomalyDetector();
