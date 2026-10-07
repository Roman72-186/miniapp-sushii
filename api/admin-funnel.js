const { checkAuth } = require('./_lib/admin-auth');
const { listAnalyticsEvents } = require('./_lib/db');

const FUNNELS = {
  subscription: [
    ['subscription.landing_view', 'Лендинг'],
    ['subscription.tariff_selected', 'Выбор тарифа'],
    ['subscription.payment_form_view', 'Форма оплаты'],
    ['subscription.payment_redirect', 'Переход в YooKassa'],
    ['subscription.payment_succeeded', 'Оплата подтверждена'],
  ],
  order: [
    ['order.catalog_view', 'Каталог'],
    ['order.first_item_added', 'Товар добавлен'],
    ['order.cart_opened', 'Корзина'],
    ['order.checkout_started', 'Оформление'],
    ['order.submitted', 'Заказ отправлен'],
    ['order.created', 'Заказ создан'],
  ],
  auth: [
    ['auth.login_view', 'Страница входа'],
    ['auth.phone_submitted', 'Телефон отправлен'],
    ['auth.credentials_requested', 'Запрошены данные входа'],
    ['auth.credentials_verified', 'Данные подтверждены'],
    ['auth.login_completed', 'Вход завершён'],
  ],
};

function topCounts(values, limit = 10) {
  const counts = new Map();
  values.filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

module.exports = async (req, res) => {
  if (!checkAuth(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не поддерживается' });
  const funnel = String(req.query?.funnel || 'subscription');
  const days = Number(req.query?.days || 7);
  if (!FUNNELS[funnel] || ![1, 7, 30].includes(days)) return res.status(400).json({ error: 'Некорректные параметры' });

  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await listAnalyticsEvents(funnel, since);
    const funnelNames = new Set(FUNNELS[funnel].map(([name]) => name));
    const sessions = new Map();

    rows.forEach(row => {
      const id = String(row.session_id);
      const state = sessions.get(id) || { events: new Set(), lastAt: 0, lastPath: null, pages: [] };
      const timestamp = new Date(row.occurred_at).getTime() || 0;
      if (funnelNames.has(row.event_name)) state.events.add(row.event_name);
      if (row.event_name === 'page.view') state.pages.push(row.pathname);
      if (timestamp >= state.lastAt) {
        state.lastAt = timestamp;
        state.lastPath = row.pathname;
      }
      sessions.set(id, state);
    });

    const stepNames = FUNNELS[funnel].map(([name]) => name);
    const allRelevant = [...sessions.values()].filter(session => session.events.size > 0);
    const completionEvent = stepNames[stepNames.length - 1];
    // The report cohort starts at step one. Sessions that only contain a later
    // client event are shown separately. A server-confirmed outcome is always
    // included even if all browser telemetry was lost.
    const relevant = allRelevant.filter(session => session.events.has(stepNames[0]) || session.events.has(completionEvent));
    const directEntries = allRelevant.length - relevant.length;
    const activeCutoff = Date.now() - 30 * 60 * 1000;
    const isCompleted = session => session.events.has(completionEvent);
    // A verified server outcome wins over missing browser telemetry. Backfill
    // the preceding funnel counts so a confirmed payment/order never becomes
    // a false abandonment and the funnel remains monotonic.
    const hasReachedStep = (session, index) => isCompleted(session)
      || stepNames.slice(0, index + 1).every(name => session.events.has(name));
    const completed = relevant.filter(isCompleted);
    const incomplete = relevant.filter(session => !isCompleted(session));
    const activeSessions = incomplete.filter(session => session.lastAt >= activeCutoff).length;
    const stopped = incomplete.filter(session => session.lastAt < activeCutoff);
    const steps = FUNNELS[funnel].map(([eventName, label], index) => {
      const count = relevant.filter(session => hasReachedStep(session, index)).length;
      const previous = index === 0 ? count : relevant.filter(session => hasReachedStep(session, index - 1)).length;
      return {
        eventName,
        label,
        count,
        conversion: index === 0 ? (count ? 100 : 0) : (previous ? Math.round(count / previous * 1000) / 10 : 0),
        drop: index === 0 ? 0 : Math.max(0, previous - count),
      };
    });
    const biggestDrop = steps.slice(1).reduce((best, step) => !best || step.drop > best.drop ? step : best, null);
    const transitions = [];
    relevant.forEach(session => {
      session.pages.forEach((path, index) => {
        if (index > 0 && session.pages[index - 1] !== path) transitions.push(`${session.pages[index - 1]} → ${path}`);
      });
    });

    return res.json({
      success: true,
      funnel,
      days,
      totalSessions: relevant.length,
      directEntries,
      completedSessions: completed.length,
      activeSessions,
      stoppedSessions: stopped.length,
      steps,
      biggestDrop,
      exitPages: topCounts(stopped.map(session => session.lastPath)),
      transitions: topCounts(transitions),
    });
  } catch (error) {
    console.error('[admin-funnel] failed:', error.message);
    return res.status(500).json({ error: 'Не удалось построить воронку' });
  }
};
