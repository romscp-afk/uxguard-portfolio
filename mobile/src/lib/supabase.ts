import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/config';
import { chunkedSecureStore } from '@/lib/secureStore';

export const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'offline', {
  auth: {
    storage: chunkedSecureStore,
    autoRefreshToken: isSupabaseConfigured,
    persistSession: isSupabaseConfigured,
    detectSessionInUrl: false,
  },
});
