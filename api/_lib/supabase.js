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

/**
 * Обновить телефон в web_credentials при смене телефона пользователя.
 * Если у пользователя не было записи в web_credentials (не веб-пароль), молча игнорирует.
 * Возвращает { updated, error } — updated=true если строка была обновлена.
 */
async function updateWebCredentialsPhone(oldPhone, newPhone) {
  if (!oldPhone || !newPhone || oldPhone === newPhone) return { updated: false, error: null };

  // Проверим, есть ли запись со старым телефоном
  const { data: existing, error: selErr } = await supabase
    .from('web_credentials')
    .select('phone')
    .eq('phone', oldPhone)
    .maybeSingle();

  if (selErr) return { updated: false, error: selErr.message };
  if (!existing) return { updated: false, error: null };

  // Проверим конфликт: есть ли уже запись с новым телефоном
  const { data: conflict, error: confErr } = await supabase
    .from('web_credentials')
    .select('phone')
    .eq('phone', newPhone)
    .maybeSingle();

  if (confErr) return { updated: false, error: confErr.message };
  if (conflict) return { updated: false, error: 'Телефон уже используется в web_credentials' };

  const { error: updErr } = await supabase
    .from('web_credentials')
    .update({ phone: newPhone, updated_at: new Date().toISOString() })
    .eq('phone', oldPhone);

  if (updErr) return { updated: false, error: updErr.message };
  return { updated: true, error: null };
}

module.exports = {
  supabase,
  createBrowserClient,
  supabaseUrl,
  updateWebCredentialsPhone,
};
