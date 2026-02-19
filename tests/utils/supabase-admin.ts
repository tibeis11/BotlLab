import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    // Return a dummy client if keys are missing (for build steps) 
    // but warn that tests might fail if they rely on admin access
    console.warn('⚠️  Missing Supabase environment variables. Admin tasks will fail.');
}

export const supabaseAdmin = createClient(
    supabaseUrl || 'http://placeholder-url.com', 
    supabaseServiceKey || 'placeholder-key', 
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Creates a test user and confirms their email.
 */
export async function createTestUser(email: string, password: string) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) throw error;
    return data.user;
}

/**
 * Deletes a test user by email.
 */
export async function deleteTestUser(email: string) {
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.users.find(u => u.email === email);
    if (user) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;
    }
}
