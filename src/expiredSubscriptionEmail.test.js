test('письмо о завершении ведёт в кабинет и экранирует имя', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  jest.resetModules();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ id: 'test-message' }),
  });
  const { sendExpiredSubscriptionEmail } = require('../api/_lib/email-notifications');

  expect(await sendExpiredSubscriptionEmail('client@example.test', '<Иван>', 1)).toBe(true);
  const message = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(message.to).toBe('client@example.test');
  expect(message.html).toContain('/profile');
  expect(message.html).toContain('&lt;Иван&gt;');
  expect(message.html).not.toContain('<Иван>');
  expect(await sendExpiredSubscriptionEmail('client@example.test', 'Иван', 3)).toBe(false);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  delete global.fetch;
  delete process.env.RESEND_API_KEY;
});
