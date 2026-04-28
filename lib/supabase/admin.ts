import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Admin client for server-side operations (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to verify user authentication server-side
export async function verifyUser(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

// Helper to create user profile after signup
export async function createUserProfile(userId: string, email: string, fullName?: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      email,
      full_name: fullName || email.split('@')[0],
      subscription_tier: 'free'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }

  return data;
}