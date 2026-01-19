import { createClient } from "@/lib/supabase-server";
import { getUserPremiumStatus } from "@/lib/premium-checks";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const premiumStatus = await getUserPremiumStatus(user.id);

  if (!premiumStatus) {
    return Response.json(
      { error: "Failed to fetch premium status" },
      { status: 500 }
    );
  }

  return Response.json({
    remaining: premiumStatus.features.aiGenerationsRemaining,
    limit:
      false
        ? -1
        : premiumStatus.features.aiGenerationsRemaining +
          (await getUsedCredits(user.id)),
    tier: premiumStatus.tier,
  });
}

async function getUsedCredits(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("ai_credits_used_this_month")
    .eq("id", userId)
    .single();
  return data?.ai_credits_used_this_month || 0;
}
