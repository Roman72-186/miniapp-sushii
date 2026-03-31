// scripts/migrate-to-supabase.js
// Зеркалирование данных SQLite → Supabase
// SQLite остаётся единственным источником данных в продакшне.
// Этот скрипт создаёт копию для backup / аналитики / будущей облачной миграции.
//
// Запуск: node scripts/migrate-to-supabase.js
// Требует: SUPABASE_URL, SUPABASE_SERVICE_KEY в .env
// Предварительно: выполните supabase/migration.sql в Supabase SQL Editor

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DB_PATH = path.join(__dirname, '..', 'data', 'sushii.db');
const BACKUP_PATH = DB_PATH + '.backup-' + Date.now();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Необходимы переменные окружения SUPABASE_URL и SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ База данных не найдена: ${DB_PATH}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const db = new Database(DB_PATH, { readonly: true });

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Конвертирует дату из DD.MM.YYYY или SQLite datetime (YYYY-MM-DD HH:MM:SS) в ISO строку.
 * Supabase принимает ISO 8601 для TIMESTAMP WITH TIME ZONE.
 */
function toIso(dateStr) {
  if (!dateStr) return null;

  // DD.MM.YYYY → ISO
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('.');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`;
  }

  // SQLite datetime (YYYY-MM-DD HH:MM:SS) или уже ISO
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString();
  } catch {}

  return null;
}

// ============================================
// ШАГ 1: ПОЛЬЗОВАТЕЛИ (без invited_by — UUID resolve на шаге 2)
// ============================================

async function migrateUsers() {
  console.log('\n👥 Миграция пользователей...');

  const users = db.prepare('SELECT * FROM users ORDER BY created_at').all();
  console.log(`  Найдено в SQLite: ${users.length}`);
  if (!users.length) return 0;

  const rows = users.map(u => ({
    telegram_id: u.telegram_id,
    name: u.name || null,
    phone: u.phone || null,
    tariff: u.tariff || null,
    balance_shc: u.balance_shc || 0,
    is_ambassador: Boolean(u.is_ambassador),
    subscription_status: u.subscription_status || null,
    subscription_start: u.subscription_start || null, // TEXT в обеих схемах (DD.MM.YYYY)
    subscription_end: u.subscription_end || null,
    payment_method_id: u.payment_method_id || null,
    ref_url: u.ref_url || null,
    watbot_contact_id: u.watbot_contact_id || null,
    auth_method: u.telegram_id.startsWith('web_') ? 'phone' : 'telegram',
    created_at: toIso(u.created_at),
    updated_at: toIso(u.updated_at),
    // invited_by (UUID) — обновляется вторым проходом
  }));

  let success = 0;
  const BATCH = 100;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('users')
      .upsert(batch, { onConflict: 'telegram_id' });

    if (error) {
      console.error(`  ❌ Batch ${i}–${i + BATCH}:`, error.message);
    } else {
      success += batch.length;
      process.stdout.write(`\r  📊 ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
    }
  }

  console.log(`\n✅ Пользователи: ${success} / ${users.length}`);
  return success;
}

// ============================================
// ШАГ 2: ОБНОВИТЬ invited_by (UUID resolve)
// ============================================

async function migrateInvitedBy(uuidMap) {
  console.log('\n🔗 Обновление invited_by...');

  const usersWithRef = db.prepare(
    'SELECT telegram_id, invited_by FROM users WHERE invited_by IS NOT NULL'
  ).all();

  if (!usersWithRef.length) {
    console.log('  Нет данных для обновления');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const user of usersWithRef) {
    const invitedByUuid = uuidMap[user.invited_by];
    if (!invitedByUuid) { skipped++; continue; }

    const { error } = await supabase
      .from('users')
      .update({ invited_by: invitedByUuid })
      .eq('telegram_id', user.telegram_id);

    if (error) {
      console.error(`  ❌ ${user.telegram_id}:`, error.message);
    } else {
      updated++;
    }
  }

  console.log(`✅ invited_by обновлено: ${updated} / ${usersWithRef.length} (пропущено: ${skipped})`);
}

// ============================================
// ШАГ 3: ПЛАТЕЖИ
// ============================================

async function migratePayments(uuidMap) {
  console.log('\n💳 Миграция платежей...');

  const payments = db.prepare('SELECT * FROM payments ORDER BY created_at').all();
  console.log(`  Найдено в SQLite: ${payments.length}`);
  if (!payments.length) return 0;

  // Платежи без yookassa_payment_id вставляем отдельно (нельзя upsert по NULL-полю)
  const withId = payments.filter(p => p.yookassa_payment_id);
  const withoutId = payments.filter(p => !p.yookassa_payment_id);

  const toRow = p => ({
    telegram_id: p.telegram_id,
    user_id: uuidMap[p.telegram_id] || null,
    tariff: p.tariff,
    amount: p.amount,
    months: p.months || 1,
    yookassa_payment_id: p.yookassa_payment_id || null,
    status: p.status || 'succeeded',
    created_at: toIso(p.created_at),
  });

  let success = 0;
  const BATCH = 100;

  // Платежи с yookassa_payment_id — upsert по уникальному полю
  for (let i = 0; i < withId.length; i += BATCH) {
    const batch = withId.slice(i, i + BATCH).map(toRow);
    const { error } = await supabase
      .from('payments')
      .upsert(batch, { onConflict: 'yookassa_payment_id' });
    if (error) console.error(`  ❌ Batch ${i} (withId):`, error.message);
    else success += batch.length;
  }

  // Платежи без yookassa_payment_id — simple insert (могут дублироваться при повторном запуске)
  for (let i = 0; i < withoutId.length; i += BATCH) {
    const batch = withoutId.slice(i, i + BATCH).map(toRow);
    const { error } = await supabase.from('payments').insert(batch);
    if (error) console.error(`  ❌ Batch ${i} (withoutId):`, error.message);
    else success += batch.length;
  }

  console.log(`✅ Платежи: ${success} / ${payments.length}`);
  return success;
}

// ============================================
// ШАГ 4: ТРАНЗАКЦИИ АМБАССАДОРОВ
// ============================================

async function migrateTransactions(uuidMap) {
  console.log('\n💰 Миграция транзакций...');

  const txns = db.prepare('SELECT * FROM transactions ORDER BY created_at').all();
  console.log(`  Найдено в SQLite: ${txns.length}`);
  if (!txns.length) return 0;

  // payment_id в SQLite — INTEGER, в Supabase — UUID.
  // Прямого маппинга нет, поэтому payment_id = null (данные сохраняются без FK на payment).
  const rows = txns
    .map(t => {
      const ambassadorUuid = uuidMap[t.ambassador_id];
      const referralUuid = uuidMap[t.referral_id];
      if (!ambassadorUuid || !referralUuid) return null;

      return {
        ambassador_id: ambassadorUuid,
        referral_id: referralUuid,
        payment_id: null, // нет маппинга SQLite INTEGER → Supabase UUID
        payment_amount: t.payment_amount,
        commission_amount: t.commission_amount,
        commission_percent: t.commission_percent,
        level: t.level || 1,
        created_at: toIso(t.created_at),
      };
    })
    .filter(Boolean);

  const skipped = txns.length - rows.length;
  if (skipped) console.log(`  ⚠️  Пропущено (не найден UUID): ${skipped}`);
  if (!rows.length) return 0;

  const { error } = await supabase.from('transactions').insert(rows);
  if (error) {
    console.error('  ❌ Ошибка:', error.message);
    return 0;
  }

  console.log(`✅ Транзакции: ${rows.length}`);
  return rows.length;
}

// ============================================
// ШАГ 5: БОНУСЫ РЕФЕРАЛОВ
// ============================================

async function migrateReferralBonuses(uuidMap) {
  console.log('\n🎁 Миграция бонусов рефералов...');

  const bonuses = db.prepare('SELECT * FROM referral_bonuses ORDER BY created_at').all();
  console.log(`  Найдено в SQLite: ${bonuses.length}`);
  if (!bonuses.length) return 0;

  const rows = bonuses
    .map(b => {
      const userUuid = uuidMap[b.user_id];
      const referralUuid = uuidMap[b.referral_id];
      if (!userUuid || !referralUuid) return null;

      return {
        user_id: userUuid,
        referral_id: referralUuid,
        base_amount: b.base_amount || 50,
        threshold_bonus: b.threshold_bonus || 0,
        total_amount: b.total_amount,
        friends_count: b.friends_count,
        achievement: b.achievement || null,
        created_at: toIso(b.created_at),
      };
    })
    .filter(Boolean);

  const skipped = bonuses.length - rows.length;
  if (skipped) console.log(`  ⚠️  Пропущено (не найден UUID): ${skipped}`);
  if (!rows.length) return 0;

  const { error } = await supabase.from('referral_bonuses').insert(rows);
  if (error) {
    console.error('  ❌ Ошибка:', error.message);
    return 0;
  }

  console.log(`✅ Бонусы: ${rows.length}`);
  return rows.length;
}

// ============================================
// СТАТИСТИКА SUPABASE
// ============================================

async function printStats() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 SUPABASE ПОСЛЕ МИГРАЦИИ');
  console.log('═══════════════════════════════════════════════════════');

  const tables = ['users', 'payments', 'transactions', 'referral_bonuses'];
  for (const t of tables) {
    const { count } = await supabase
      .from(t)
      .select('*', { count: 'exact', head: true });
    console.log(`  ${t.padEnd(20)} ${count ?? '?'}`);
  }

  // Активные подписки
  const { count: activeSubs } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'активно');

  const { count: ambassadors } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_ambassador', true);

  console.log('───────────────────────────────────────────────────────');
  console.log(`  Активных подписок:   ${activeSubs ?? '?'}`);
  console.log(`  Амбассадоров:        ${ambassadors ?? '?'}`);
  console.log('═══════════════════════════════════════════════════════');
}

// ============================================
// ЗАПУСК
// ============================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ SQLite → SUPABASE (зеркало/backup)         ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📁 SQLite: ${DB_PATH}`);
  console.log(`📡 Supabase: ${SUPABASE_URL}`);
  console.log('');
  console.log('⚠️  ВАЖНО: SQLite остаётся источником данных в продакшне.');
  console.log('   Supabase используется только как зеркало/backup.');

  // Backup SQLite на случай непредвиденного
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`\n💾 Backup создан: ${path.basename(BACKUP_PATH)}`);

  try {
    // 1. Пользователи (первый проход, без invited_by)
    await migrateUsers();

    // 2. Получаем UUID map (telegram_id → Supabase UUID)
    const { data: sbUsers, error: mapErr } = await supabase
      .from('users')
      .select('id, telegram_id');

    if (mapErr || !sbUsers) {
      throw new Error('Не удалось получить UUID map: ' + (mapErr?.message || 'нет данных'));
    }

    const uuidMap = Object.fromEntries(sbUsers.map(u => [u.telegram_id, u.id]));
    console.log(`\n🗺️  UUID map: ${Object.keys(uuidMap).length} пользователей`);

    // 3. invited_by (второй проход с UUID)
    await migrateInvitedBy(uuidMap);

    // 4. Платежи
    await migratePayments(uuidMap);

    // 5. Транзакции
    await migrateTransactions(uuidMap);

    // 6. Бонусы рефералов
    await migrateReferralBonuses(uuidMap);

    // Итоговая статистика
    await printStats();

    console.log('\n✅ Миграция завершена!');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Проверьте данные: Supabase Dashboard → Table Editor');
    console.log('   2. Backup SQLite можно удалить: ' + path.basename(BACKUP_PATH));
    console.log('   3. SQLite остаётся источником данных — API не изменился');

  } catch (err) {
    console.error('\n❌ Критическая ошибка:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
