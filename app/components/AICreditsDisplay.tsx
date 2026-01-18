"use client";

import { useEffect, useState } from "react";

export default function AICreditsDisplay({ userId }: { userId: string }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    // Fetch from API endpoint
    fetch(`/api/premium/credits?userId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch credits");
        return res.json();
      })
      .then((data) => {
        // data.remaining is what we have left
        // data.limit is the total monthly allowance
        // JSON serialization of Infinity is null
        setCredits(data.remaining); 
        setLimit(data.limit === -1 || data.limit === null ? Infinity : data.limit);
      })
      .catch((err) => {
        console.error("Error fetching credits:", err);
      });
  }, [userId]);

  if (credits === null) return null;

  // Percentage of USED credits vs Total Limit.
  // "credits" variable here is REMAINING credits (from API), wait.
  // checking api/premium/credits/route.ts logic:
  // It returns { limit, used, remaining }.
  // So 'credits' state above is actually 'remaining'.

  // If I have 3 remaining out of 5, I have used 2.
  // Percentage bar usually shows usage (how full is the tank) or remaining?
  // Let's show REMAINING capacity, or USED capacity.
  // The roadmap code calculated: percentage = (credits / limit) * 100
  // If credits=remaining=3, limit=5 -> 60%.
  // If color > 50 is green -> 60% green.
  // If remaining is low (e.g. 1/5 = 20%), it becomes red.
  // This logic works for "Battery Level" metaphor.

  const isUnlimited = limit === Infinity || credits === null;
  const percentage = isUnlimited ? 100 : (credits! / limit!) * 100;
  
  // Color logic for "Battery Level" (Remaining)
  const color =
    isUnlimited || percentage > 50
      ? "bg-emerald-500"
      : percentage > 20
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">KI-Kontingent</span>
        <span className={`text-sm font-black ${isUnlimited || percentage > 50 ? 'text-emerald-500' : percentage > 20 ? 'text-amber-500' : 'text-rose-500'}`}>
          {isUnlimited ? "UNBEGRENZT" : `${credits} / ${limit}`}
        </span>
      </div>

      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-[10px] text-zinc-500 mt-2 flex justify-between uppercase font-bold tracking-widest">
        <span>{isUnlimited ? "Enterprise Plan" : "Monatliches Budget"}</span>
        {!isUnlimited && percentage < 20 && (
           <span className="text-rose-600 font-bold">Wenig übrig</span>
        )}
      </p>
    </div>
  );
}
