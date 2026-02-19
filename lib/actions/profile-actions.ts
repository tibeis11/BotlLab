'use server'

import { createClient } from "@/lib/supabase-server";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validations/profile-schemas";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = any> = {
  data?: T;
  error?: string | Record<string, string[]> | any;
};

export async function updateProfile(input: ProfileUpdateInput): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Nicht authentifiziert" };
  }

  // Validate input
  const result = profileUpdateSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const payload = result.data;

  // Security Check: Prevent "admin" display name
  if (payload.display_name?.trim().toLowerCase() === 'admin') {
      // Check if user is ALREADY admin (allowed to keep it)
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
        
      if (currentProfile?.display_name !== 'admin') {
          return { error: 'Der Benutzername "admin" ist reserviert und kann nicht verwendet werden.' };
      }
  }

  const updates = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/account');
  return { data: { success: true } };
}
