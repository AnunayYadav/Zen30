import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

// Initialize Supabase Client directly with the configured keys
export const supabase = createClient(
  SUPABASE_CONFIG.url, 
  SUPABASE_CONFIG.anonKey
);
