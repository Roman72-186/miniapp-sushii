# Журнал действий пользователей и персонала

## Цель

Добавить append-only журнал значимых действий в standalone web-приложении и отдельную вкладку в админке. Журнал отвечает на вопросы: кто, когда, что сделал, над каким объектом и с каким результатом. Он не заменяет таблицы `payments`, `orders`, `gift_history` и другие предметные источники данных.

## Ограничение текущей авторизации

Сейчас админка использует один `ADMIN_PASSWORD`, а токены хранятся в памяти процесса. До появления отдельных аккаунтов сотрудников исполнитель записывается как `staff/shared-admin` с уникальным `actor_session_id` и подписью «Общий администратор». Нельзя выдавать такой журнал за персональную атрибуцию конкретному сотруднику.

## MVP-события

### Персонал

- `admin.auth.login_succeeded`, `admin.auth.login_failed`, `admin.auth.login_rate_limited`;
- `admin.user.created_or_updated`, `admin.user.profile_updated`, `admin.user.tag_changed`, `admin.user.notes_updated`, `admin.user.shc_adjusted`;
- `admin.subscription.set`, `admin.subscription.extended`, `admin.subscription.reset`, `admin.subscription.auto_renew_disabled`;
- `admin.gift.granted`, `admin.gift.claimed`;
- `admin.product.updated`, `admin.product.created`, `admin.pricing.updated`;
- `admin.upsell.changed`, `admin.upsell.cleared`, `admin.gift_rule.created`, `admin.gift_rule.updated`, `admin.gift_rule.deleted`;
- `admin.banner.updated`, `admin.banner.deleted`, `admin.store.updated`.

### Пользователь и система

- `user.auth.login_succeeded`, `user.auth.login_failed`, `user.auth.otp_verified`, `user.auth.password_set`;
- `user.profile.updated`, `user.subscription.auto_renew_disabled`;
- `user.payment.created`, `user.payment.succeeded`, `user.payment.rejected`, `user.order.created`, `user.order.failed`;
- `user.gift.claimed`, `user.partner_code.applied`, `user.referral.registered`;
- `system.subscription.renewal_attempted`, `system.subscription.renewal_succeeded`, `system.subscription.renewal_failed`, `system.subscription.expired`.

MVP не записывает просмотры страниц, клики и обычные GET-запросы.

## Схема `audit_log`

- `id`: INTEGER AUTOINCREMENT в SQLite / BIGSERIAL в PostgreSQL;
- `occurred_at`: UTC TEXT / TIMESTAMPTZ;
- `event_name`, `event_version`;
- `actor_type`: `user`, `staff`, `system`, `webhook`;
- `actor_id`, `actor_label`, `actor_session_id`;
- `target_type`, `target_id`;
- `result`: `attempted`, `succeeded`, `failed`, `denied`;
- `request_id`, `correlation_id`;
- `source`, `http_method`, `status_code`;
- `ip_hash`, `client_kind`;
- `changes_json`, `metadata_json`, `error_code`.

Индексы: время, actor+время, target+время, event+время, request_id. Внешние ключи на пользователей не ставятся: журнал должен переживать изменение или удаление субъекта.

## Безопасность

Запрещено записывать токены, cookie, пароли, OTP, хеши паролей, API-ключи, `payment_method_id`, полный payload ЮKassa, полный телефон/email/адрес/имя, текст заметок, raw `req.body`, stack trace. Разрешены только allowlisted поля, маскированные значения, внутренние ID, суммы, тарифы, статусы и списки изменённых полей. Размер JSON ограничивается.

IP хранится только как HMAC-SHA256 с `AUDIT_IP_HASH_SECRET`. До настройки секрета `ip_hash` остаётся пустым.

## API и UI

`GET /api/admin/audit-log` поддерживает keyset-пагинацию и фильтры: период, событие, actor, target, результат, request ID. Максимум 100 записей, период по умолчанию 7 дней.

В `AdminPage` добавляется вкладка «Журнал»: фильтры, desktop-таблица/mobile-карточки, загрузка следующей страницы, просмотр безопасных подробностей и переход к истории конкретного пользователя.

## Надёжность

- DB-backed критические изменения и success-аудит по возможности выполняются в одной транзакции.
- Для файловых изменений пишется `attempted`, затем `succeeded` или `failed`.
- Аудит платежей/webhook/cron работает best-effort и не должен останавливать предметную операцию.
- Исторический backfill не выполняется: журнал достоверен только с момента релиза.

### Реализованный компромисс MVP

В первой реализации HTTP-события пишутся best-effort после завершения ответа и не входят в одну транзакцию с предметным изменением. Это защищает оплату, заказ и действия администратора от отказа из-за недоступности журнала, но не даёт уровня доказательности compliance-аудита: при аварийном завершении процесса отдельная запись может потеряться. Платёжный webhook пишет подтверждённый успех внутри обработчика после проверки YooKassa, а крон пишет отдельные события попытки, результата и завершения подписки. Для строгой гарантии следующим этапом нужен transactional outbox для DB-операций и `attempted → succeeded/failed` для файловых изменений.

## Этапы

1. Таблица, индексы, request ID, безопасный writer и read API.
2. Критические административные действия.
3. Вкладка админки.
4. Пользовательские, платёжные и системные события.
5. Именованные staff-аккаунты/RBAC, retention и экспорт.

## Проверка

- unit-тесты sanitizer, safe diff, payload limit, IP hash;
- SQLite/PG schema и keyset pagination;
- API: 401, фильтры, limit, malformed cursor, отсутствие секретов;
- ровно одно итоговое событие на критическую операцию;
- React-тесты loading/error/empty/filter/load more/details/mobile;
- время хранится UTC, в UI отображается в `Asia/Yekaterinburg`.
