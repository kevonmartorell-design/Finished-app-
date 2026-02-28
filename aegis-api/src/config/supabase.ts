import { createClient } from '@supabase/supabase-js';
import env from './env';

/**
 * Singleton Supabase admin client.
 * Uses the service role key so all DB operations bypass RLS.
 * This is intentional for server-side auth operations.
 */
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
