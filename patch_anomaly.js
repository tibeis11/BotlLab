const fs = require('fs');

const file = 'app/api/analytics/anomaly-detector/route.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
/const { data } = await supabase\s*\.from\('ratings'\)\s*\.select\('rating'\)\s*\.eq\('brew_id', brewId\);/g,
`const { data } = await supabase
    .from('ratings')
    .select('rating, plausibility_score, is_shadowbanned')
    .eq('brew_id', brewId);`
);

const oldAvg = `  const validRatings = data.filter((r) => r.rating != null);
  if (validRatings.length === 0) return null;

  const avg = validRatings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / validRatings.length;
  return { avg, count: validRatings.length };`;

const newAvg = `  const validRatings = data.filter((r) => r.rating != null && !r.is_shadowbanned);
  if (validRatings.length === 0) return null;

  let totalScore = 0;
  let totalWeight = 0;
  validRatings.forEach(r => {
    const weight = r.plausibility_score ?? 1.0;
    totalScore += (r.rating ?? 0) * weight;
    totalWeight += weight;
  });

  const avg = totalWeight > 0 ? totalScore / totalWeight : 0;
  return { avg, count: validRatings.length };`;

content = content.replace(oldAvg, newAvg);
fs.writeFileSync(file, content);
console.log("Patched anomaly-detector");