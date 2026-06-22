import { createClient } from '@supabase/supabase-js';

// Public project URL + publishable (anon) key. These are safe to ship in the
// client bundle; access is governed by Row Level Security on the database.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://cmlzvubnevtjcdpnoewc.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8qun-OEF138iiWhIU7hgJQ_BFMlNRMy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});
