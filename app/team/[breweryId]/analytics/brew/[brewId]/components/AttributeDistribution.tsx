"use client";

import { DistributionData } from "@/lib/rating-analytics";

const LABEL_MAP: Record<string, string> = {
  bitterness: "Bitterkeit",
  sweetness: "Süße",
  body: "Körper",
  carbonation: "Kohlensäure",
  acidity: "Säure",
};

export default function AttributeDistribution({
  data,
}: {
  data: DistributionData;
}) {
  const attributes = [
    "bitterness",
    "sweetness",
    "body",
    "carbonation",
    "acidity",
  ];

  return (
    <div className="space-y-6">
      {attributes.map((attr) => {
        const counts = data[attr]; // Record<number, number>
        // Sum total ratings for this attribute
        const total = Object.values(counts).reduce((a, b) => a + b, 0);

        if (total === 0) return null;

        // Find max value to normalize bar heights relative to the highest bar in this chart
        const maxCount = Math.max(...Object.values(counts));

        return (
          <div key={attr} className="bg-zinc-900 rounded-xl p-4">
             <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-white">{LABEL_MAP[attr]}</h4>
                <span className="text-zinc-500 text-xs">{total} Bewertungen</span>
             </div>
            
            <div className="flex gap-1 items-end h-32 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                const count = counts[val] || 0;
                const heightPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                return (
                  <div key={val} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex flex-col justify-end items-center h-full"> 
                        {count > 0 && (
                            <span className="text-[10px] text-zinc-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full">
                                {count}
                            </span>
                        )}
                        <div
                            className={`w-full rounded-t transition-all duration-500 ${
                                val <= 3 ? 'bg-zinc-700' :
                                val <= 7 ? 'bg-cyan-500/50' : 
                                'bg-cyan-500'
                            }`}
                            style={{ height: `${heightPercentage}%`, minHeight: count > 0 ? '4px' : '0px' }}
                        />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono mt-1">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
