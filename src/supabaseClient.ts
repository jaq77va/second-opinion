import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vmnsvhtykiovomzlgjgn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_pJZpJ77_xK6LHvMZdNOY0Q_y8NthXKU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);