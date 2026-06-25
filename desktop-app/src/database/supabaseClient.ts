import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://cmlzvubnevtjcdpnoewc.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbHp2dWJuZXZ0amNkcG5vZXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMTA0ODEsImV4cCI6MjA5NzY4NjQ4MX0.UUltlXRIWdOs6zby1Kn3INRAd3pWYKrAQhY-T6nPFrg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});
