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

  return Response.json(premiumStatus);
}
