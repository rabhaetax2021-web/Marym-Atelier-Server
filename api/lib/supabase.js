/* eslint-disable no-undef */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_marymatelier_SUPABASE_URL || process.env.marymatelier_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.marymatelier_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or service role key in environment.');
}

// Capture process warnings (e.g., DeprecationWarning) and log full stack to help locate source
if (typeof process !== 'undefined' && process && process.on) {
  process.on('warning', (warning) => {
    try {
      // Log stack if available
      // eslint-disable-next-line no-console
      console.warn('Process warning:', warning.name, warning.message);
      if (warning.stack) {
        // eslint-disable-next-line no-console
        console.warn(warning.stack);
      }
    } catch (e) {
      // ignore logging errors
    }
  });
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
