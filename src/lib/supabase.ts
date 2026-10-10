import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');
const supabaseKey = rawKey.trim().replace(/^["']|["']$/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL ou Key não foram encontradas nas variáveis de ambiente!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);