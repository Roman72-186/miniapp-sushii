// api/_lib/supabase.js — Supabase клиент для бэкенда

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Supabase] Отсутствуют переменные окружения!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Фронтенд клиент (с anon ключом)
function createBrowserClient() {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseAnonKey);
}

module.exports = {
  supabase,
  createBrowserClient,
  supabaseUrl,
};
