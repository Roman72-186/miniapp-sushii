import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminPage from './AdminPage';

jest.mock('./UserContext', () => ({ useUser: () => ({ telegramId: 'web_admin_test' }) }));
jest.mock('./components/EditProfileModal', () => () => null);

let cancelResult;
beforeEach(() => {
  localStorage.setItem('admin_token', 'test-admin-token');
  cancelResult = { ok: true, body: { success: true, message: 'Автопродление отключено' } };
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  global.fetch = jest.fn(async url => {
    if (url === '/api/admin/cancel-subscription') {
      return { ok: cancelResult.ok, json: async () => cancelResult.body };
    }
    if (url === '/api/admin/subscribers') {
      return { ok: true, json: async () => ({ success: true, stats: { total: 1, by_tariff: {} }, subscribers: [{
        telegram_id: 'web_test_123', name: 'Тестовый контакт', tariff: '490',
        subscription_status: 'активно', subscription_end: '01.10.2026',
        has_payment_method: 1, auto_renew_disabled: false,
      }] }) };
    }
    return { ok: true, json: async () => ({ success: false }) };
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  delete global.fetch;
});

async function openContact() {
  render(<AdminPage />);
  fireEvent.click(await screen.findByRole('button', { name: /Подписчики, SHC, подарки/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Тестовый контакт/ }));
  return screen.getByRole('button', { name: 'Отключить автопродление' });
}

test('администратор отключает автопродление в карточке и видит новый статус', async () => {
  fireEvent.click(await openContact());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Автопродление отключено' })).toBeDisabled());
  expect(fetch).toHaveBeenCalledWith('/api/admin/cancel-subscription', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ telegram_id: 'web_test_123' }),
    headers: expect.objectContaining({ Authorization: 'Bearer test-admin-token' }),
  }));
  expect(screen.getByText(/Подписка до 01.10.2026/)).toBeInTheDocument();
});

test('отказ от подтверждения не отправляет запрос', async () => {
  window.confirm.mockReturnValue(false);
  fireEvent.click(await openContact());
  expect(fetch.mock.calls.some(([url]) => url === '/api/admin/cancel-subscription')).toBe(false);
});

test('ошибка сервера оставляет кнопку доступной для повторной попытки', async () => {
  cancelResult = { ok: false, body: { error: 'Отмена не выполнена' } };
  fireEvent.click(await openContact());
  expect(await screen.findByText('Отмена не выполнена')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Отключить автопродление' })).toBeEnabled();
});
