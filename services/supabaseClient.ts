import { createClient } from '@supabase/supabase-js';

// Safely access process.env if it exists, otherwise use empty object
const env = typeof process !== 'undefined' && process.env ? process.env : {};

// These should be set in your project's environment variables
// We provide placeholders to prevent the app from crashing immediately if keys are missing
const supabaseUrl = env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = env.SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('Supabase URL is missing. Database features will not work until SUPABASE_URL is set.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
