#!/usr/bin/env node
// scripts/test-pg-db.js — Тестирование db-pg.js против реальной Supabase
//
// Запуск:
//   DATABASE_URL=postgresql://... node scripts/test-pg-db.js
//   Или с .env: node -r dotenv/config scripts/test-pg-db.js
//
// Требует: npm install pg dotenv

require('dotenv').config();
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан');
  process.exit(1);
}

const db = require('../api/_lib/db-pg');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

const TEST_ID = `test_${Date.now()}`;
const INVITER_ID = TEST_ID + '_inv';

async function cleanup() {
  await db.query('DELETE FROM gift_history WHERE telegram_id = $1', [TEST_ID]);
  await db.query('DELETE FROM referral_bonuses WHERE user_id = $1 OR referral_id = $1', [TEST_ID]);
  await db.query('DELETE FROM transactions WHERE ambassador_id = $1 OR referral_id = $1', [TEST_ID]);
  await db.query('DELETE FROM payments WHERE telegram_id = $1', [TEST_ID]);
  await db.query('DELETE FROM users WHERE telegram_id IN ($1, $2)', [TEST_ID, INVITER_ID]);
}

async function main() {
  console.log('=== Тестирование db-pg.js ===\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@'));
  console.log('TEST_ID:', TEST_ID, '\n');

  await cleanup();

  // ── Блок 1: Пользователи ──────────────────────────────────
  console.log('── Блок 1: Пользователи ──');

  await test('getUser: несуществующий → null', async () => {
    const u = await db.getUser('nonexistent_99999');
    assert(u === null, `Ожидал null, получил ${JSON.stringify(u)}`);
  });

  await test('upsertUser: создание нового пользователя', async () => {
    await db.upsertUser({
      telegram_id: TEST_ID,
      name: 'Тест Юзер',
      phone: '79990000001',
      tariff: '490',
      subscription_status: 'активно',
      subscription_start: '01.04.2026',
      subscription_end: '01.05.2026',
    });
    const u = await db.getUser(TEST_ID);
    assert(u !== null, 'Пользователь не найден после upsert');
    assert(u.name === 'Тест Юзер', `name: ${u.name}`);
    assert(u.tariff === '490', `tariff: ${u.tariff}`);
  });

  await test('upsertUser: COALESCE — не перезаписывает name=null', async () => {
    await db.upsertUser({ telegram_id: TEST_ID, name: null, phone: '79990000002' });
    const u = await db.getUser(TEST_ID);
    assert(u.name === 'Тест Юзер', `name должен остаться "Тест Юзер", но: ${u.name}`);
    assert(u.phone === '79990000002', `phone должен обновиться: ${u.phone}`);
  });

  await test('upsertUser: COALESCE — invited_by не перезаписывается', async () => {
    await db.upsertUser({ telegram_id: INVITER_ID, name: 'Пригласитель' });
    await db.upsertUser({ telegram_id: TEST_ID, invited_by: INVITER_ID });
    const u = await db.getUser(TEST_ID);
    assert(u.invited_by === INVITER_ID, `invited_by: ${u.invited_by}`);

    await db.upsertUser({ telegram_id: TEST_ID, invited_by: 'other_id' });
    const u2 = await db.getUser(TEST_ID);
    assert(u2.invited_by === INVITER_ID, `invited_by должен остаться ${INVITER_ID}, но: ${u2.invited_by}`);
  });

  await test('updateBalance: начисление SHC', async () => {
    await db.updateBalance(TEST_ID, 100);
    const u = await db.getUser(TEST_ID);
    assert(Number(u.balance_shc) >= 100, `balance_shc: ${u.balance_shc}`);
  });

  await test('setUserTariff: смена тарифа', async () => {
    await db.setUserTariff(TEST_ID, '290');
    const u = await db.getUser(TEST_ID);
    assert(u.tariff === '290', `tariff: ${u.tariff}`);
  });

  await test('setUserNotes: заметка', async () => {
    await db.setUserNotes(TEST_ID, 'Тестовая заметка');
    const u = await db.getUser(TEST_ID);
    assert(u.notes === 'Тестовая заметка', `notes: ${u.notes}`);
  });

  await test('getAllUsers: возвращает массив', async () => {
    const users = await db.getAllUsers();
    assert(Array.isArray(users), 'Не массив');
    assert(users.length > 0, 'Пустой массив');
  });

  await test('getReferrals: возвращает приглашённых', async () => {
    const refs = await db.getReferrals(INVITER_ID);
    assert(Array.isArray(refs), 'Не массив');
    assert(refs.some(r => r.telegram_id === TEST_ID), 'TEST_ID не в рефералах');
  });

  await test('setInvitedBy: не перезаписывает если уже установлен', async () => {
    await db.setInvitedBy(TEST_ID, 'other_inviter');
    const u = await db.getUser(TEST_ID);
    assert(u.invited_by === INVITER_ID, `invited_by не должен измениться: ${u.invited_by}`);
  });

  // ── Блок 2: Платежи ──────────────────────────────────────
  console.log('\n── Блок 2: Платежи ──');

  await test('recordPayment: запись платежа', async () => {
    const id = await db.recordPayment({
      telegram_id: TEST_ID,
      tariff: '490',
      amount: 490,
      months: 1,
      yookassa_payment_id: `test-pay-${Date.now()}`,
      status: 'succeeded',
    });
    assert(id > 0, `id: ${id}`);
  });

  // ── Блок 3: Partner коды ──────────────────────────────────
  console.log('\n── Блок 3: Partner коды ──');

  await test('generatePartnerCode: 6 символов A-Z2-9', () => {
    const code = db.generatePartnerCode();
    assert(code.length === 6, `Длина: ${code.length}`);
    assert(/^[A-Z2-9]+$/.test(code), `Формат: ${code}`);
  });

  await test('getPartnerByCode: несуществующий → null', async () => {
    const u = await db.getPartnerByCode('XXXXXX');
    assert(u === null, 'Ожидал null');
  });

  // ── Блок 4: Подписки ──────────────────────────────────────
  console.log('\n── Блок 4: Подписки ──');

  await test('deactivateSubscription: деактивация', async () => {
    await db.deactivateSubscription(TEST_ID);
    const u = await db.getUser(TEST_ID);
    assert(u.subscription_status === 'неактивно', `status: ${u.subscription_status}`);
    assert(u.payment_method_id === null, `payment_method_id: ${u.payment_method_id}`);
  });

  await test('extendSubscription: продление от сегодня', async () => {
    const u = await db.extendSubscription(TEST_ID, 7);
    assert(u.subscription_status === 'активно', `status: ${u.subscription_status}`);
    const today = new Date();
    const expected = new Date(today);
    expected.setDate(expected.getDate() + 7);
    const dd = String(expected.getDate()).padStart(2,'0');
    const mm = String(expected.getMonth()+1).padStart(2,'0');
    const expectedStr = `${dd}.${mm}.${expected.getFullYear()}`;
    assert(u.subscription_end === expectedStr, `end: ${u.subscription_end}, ожидал: ${expectedStr}`);
  });

  await test('cancelAutoRenew: очищает payment_method_id', async () => {
    await db.upsertUser({ telegram_id: TEST_ID, payment_method_id: 'pm_test_123' });
    await db.cancelAutoRenew(TEST_ID);
    const u = await db.getUser(TEST_ID);
    assert(u.payment_method_id === null, `payment_method_id: ${u.payment_method_id}`);
  });

  await test('getExpiringSubscriptions: возвращает массив', async () => {
    const list = await db.getExpiringSubscriptions(7);
    assert(Array.isArray(list), 'Не массив');
  });

  await test('getExpiredToday: возвращает массив', async () => {
    const list = await db.getExpiredToday();
    assert(Array.isArray(list), 'Не массив');
  });

  // ── Блок 5: История подарков ──────────────────────────────
  console.log('\n── Блок 5: История подарков ──');

  await test('insertGiftHistory + getGiftHistory', async () => {
    await db.insertGiftHistory({
      telegramId: TEST_ID,
      giftType: 'roll',
      claimedAt: '07.04.2026',
      claimedTs: new Date().toISOString(),
      windowNum: 1,
      grantedBy: 'user',
    });
    const hist = await db.getGiftHistory(TEST_ID);
    assert(hist.length === 1, `length: ${hist.length}`);
    assert(hist[0].gift_type === 'roll', `gift_type: ${hist[0].gift_type}`);
  });

  // ── Блок 6: adminApplyUserTagAction ──────────────────────
  console.log('\n── Блок 6: adminApplyUserTagAction ──');

  await test('add tag 290', async () => {
    const u = await db.adminApplyUserTagAction(TEST_ID, 'add', '290');
    assert(u.tariff === '290', `tariff: ${u.tariff}`);
  });

  await test('add tag 1190', async () => {
    const u = await db.adminApplyUserTagAction(TEST_ID, 'add', '1190');
    assert(u.tariff === '1190', `tariff: ${u.tariff}`);
  });

  await test('remove tag → null', async () => {
    const u = await db.adminApplyUserTagAction(TEST_ID, 'remove', '1190');
    assert(u.tariff === null, `tariff: ${u.tariff}`);
  });

  await test('invalid_action → throw', async () => {
    try {
      await db.adminApplyUserTagAction(TEST_ID, 'badaction', '290');
      assert(false, 'Должен был бросить ошибку');
    } catch (e) {
      assert(e.message === 'invalid_action', `msg: ${e.message}`);
    }
  });

  await test('user_not_found → throw', async () => {
    try {
      await db.adminApplyUserTagAction('nonexistent_xyz', 'add', '290');
      assert(false, 'Должен был бросить ошибку');
    } catch (e) {
      assert(e.message === 'user_not_found', `msg: ${e.message}`);
    }
  });

  // ── Очистка ───────────────────────────────────────────────
  await cleanup();

  console.log('\n═══════════════════════════════');
  console.log(`Итог: ${passed} пройдено, ${failed} ошибок`);
  if (failed > 0) {
    console.log('❌ ТЕСТЫ ПРОВАЛИЛИСЬ');
    process.exit(1);
  } else {
    console.log('✅ ВСЕ ТЕСТЫ ПРОШЛИ');
  }

  await db.pool.end();
}

main().catch(e => {
  console.error('Критическая ошибка:', e.message);
  process.exit(1);
});
