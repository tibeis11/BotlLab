export function calcWeightedAvg(ratings: { rating: number; plausibility_score?: number | null; is_shadowbanned?: boolean | null }[] | null | undefined): number {
  if (!ratings || ratings.length === 0) return 0;
  const valid = ratings.filter((r) => !r.is_shadowbanned);
  if (valid.length === 0) return 0;
  let totalScore = 0;
  let totalWeight = 0;
  valid.forEach((r) => {
    const w = r.plausibility_score ?? 1.0;
    totalScore += r.rating * w;
    totalWeight += w;
  });
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}
