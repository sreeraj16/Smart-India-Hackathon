import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jftragfdpepzpybzleat.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_VPnF0d1gxhfXyIuzGSyf5Q_pjRQCT6u';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
