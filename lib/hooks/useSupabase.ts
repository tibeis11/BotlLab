"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useMemo } from "react";
import { Database } from "@/lib/database.types";

export function useSupabase() {
  return useMemo(
    () =>
      createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );
}
