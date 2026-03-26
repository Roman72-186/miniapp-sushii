const { getDb } = require('./api/_lib/db');
const fs = require('fs');

const db = getDb();

// Читаем список пользователей из Watbot
const watbotUsers = JSON.parse(fs.readFileSync('/tmp/watbot-subscribers.json', 'utf8'));

let created = 0;
let updated = 0;
let errors = 0;

console.log(`Starting sync of ${watbotUsers.length} users from Watbot...\n`);

for (const wUser of watbotUsers) {
    try {
        const telegramId = wUser.telegram_id;
        if (!telegramId) {
            console.log(`⚠️  Skip (no telegram_id): ${wUser.name || wUser.id}`);
            errors++;
            continue;
        }

        // Проверяем, существует ли пользователь
        let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

        const tariff = wUser.tariff && wUser.tariff !== String(wUser.id) ? wUser.tariff : null;
        const subscriptionStatus = wUser.subscription_status || null;
        const subscriptionStart = wUser.subscription_start || null;
        const subscriptionEnd = wUser.subscription_end || null;
        const name = wUser.name || null;
        const phone = wUser.phone || null;

        if (user) {
            // Обновляем существующего пользователя
            db.prepare(`
                UPDATE users SET
                    tariff = COALESCE(?, tariff),
                    subscription_status = COALESCE(?, subscription_status),
                    subscription_start = COALESCE(?, subscription_start),
                    subscription_end = COALESCE(?, subscription_end),
                    name = COALESCE(?, name),
                    phone = COALESCE(?, phone),
                    watbot_contact_id = ?,
                    updated_at = datetime('now')
                WHERE telegram_id = ?
            `).run(tariff, subscriptionStatus, subscriptionStart, subscriptionEnd, name, phone, String(wUser.id), telegramId);
            updated++;
            console.log(`✅ Updated: ${telegramId} (${name || 'no name'})`);
        } else {
            // Создаем нового пользователя
            db.prepare(`
                INSERT INTO users (
                    telegram_id, name, phone, tariff, subscription_status,
                    subscription_start, subscription_end, watbot_contact_id,
                    balance_shc, is_ambassador, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
            `).run(telegramId, name, phone, tariff, subscriptionStatus, subscriptionStart, subscriptionEnd, String(wUser.id));
            created++;
            console.log(`✅ Created: ${telegramId} (${name || 'no name'})`);
        }
    } catch (err) {
        errors++;
        console.log(`❌ Error for ${wUser.telegram_id || wUser.id}: ${err.message}`);
    }
}

console.log(`\n========== Sync Complete ==========`);
console.log(`Total: ${watbotUsers.length}`);
console.log(`Created: ${created}`);
console.log(`Updated: ${updated}`);
console.log(`Errors: ${errors}`);
console.log(`==================================`);
