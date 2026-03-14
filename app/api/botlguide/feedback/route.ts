import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contextKey, feedback, generatedText, capability } = await req.json();

    if (!contextKey || !feedback) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const error = null; // Feedback logging disabled per user request (merged tables)

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
