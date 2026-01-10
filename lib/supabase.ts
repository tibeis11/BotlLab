import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Das ist unser Funkgerät zur Datenbank
export const supabase = createClient(supabaseUrl, supabaseAnonKey);