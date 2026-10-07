export const AUDIT_EVENT_LABELS = {
  'admin.auth.login_succeeded': 'Вход администратора',
  'admin.auth.login_failed': 'Неудачный вход администратора',
  'admin.auth.login_rate_limited': 'Вход заблокирован',
  'admin.user.created_or_updated': 'Пользователь создан или обновлён',
  'admin.user.profile_updated': 'Профиль изменён',
  'admin.user.tag_changed': 'Тег пользователя изменён',
  'admin.user.notes_updated': 'Заметка изменена',
  'admin.user.shc_adjusted': 'Баланс SHC изменён',
  'admin.subscription.set': 'Подписка установлена',
  'admin.subscription.extended': 'Подписка продлена',
  'admin.subscription.reset': 'Подписка сброшена',
  'admin.subscription.auto_renew_disabled': 'Автосписание отключено',
  'admin.gift.granted': 'Подарок выдан',
  'admin.gift.claimed': 'Подарок отмечен полученным',
  'admin.product.updated': 'Товар изменён',
  'admin.product.created': 'Товар добавлен',
  'admin.pricing.updated': 'Цены тарифов изменены',
  'admin.upsell.changed': 'Допродажи изменены',
  'admin.upsell.cleared': 'Допродажи очищены',
  'admin.gift_rule.created': 'Правило подарка создано',
  'admin.gift_rule.updated': 'Правило подарка изменено',
  'admin.gift_rule.deleted': 'Правило подарка удалено',
  'admin.banner.updated': 'Баннер изменён',
  'admin.banner.deleted': 'Баннер удалён',
  'admin.store.updated': 'Точка самовывоза изменена',
  'user.auth.login_succeeded': 'Вход пользователя',
  'user.auth.login_failed': 'Неудачный вход пользователя',
  'user.auth.otp_verified': 'OTP подтверждён',
  'user.auth.password_set': 'Пароль установлен',
  'user.profile.updated': 'Профиль обновлён',
  'user.subscription.auto_renew_disabled': 'Автосписание отключено пользователем',
  'user.payment.created': 'Платёж создан',
  'user.payment.succeeded': 'Платёж прошёл',
  'user.payment.rejected': 'Платёж отклонён',
  'user.order.created': 'Заказ создан',
  'user.order.failed': 'Ошибка заказа',
  'user.gift.claimed': 'Подарок получен',
  'user.partner_code.applied': 'Код партнёра применён',
  'user.referral.registered': 'Реферал зарегистрирован',
  'system.subscription.renewal_attempted': 'Попытка автосписания',
  'system.subscription.renewal_succeeded': 'Автосписание выполнено',
  'system.subscription.renewal_failed': 'Ошибка автосписания',
  'system.subscription.expired': 'Подписка завершилась',
};

export const AUDIT_RESULT_LABELS = {
  attempted: 'Запущено',
  succeeded: 'Успешно',
  failed: 'Ошибка',
  denied: 'Отказано',
};

export const AUDIT_ACTOR_LABELS = {
  user: 'Пользователь',
  staff: 'Персонал',
  system: 'Система',
  webhook: 'Webhook',
};

export function getAuditEventLabel(eventName) {
  return AUDIT_EVENT_LABELS[eventName] || eventName || 'Неизвестное событие';
}
