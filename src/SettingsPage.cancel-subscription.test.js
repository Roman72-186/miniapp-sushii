import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPage from './SettingsPage';

const mockSync = jest.fn();

jest.mock('./UserContext', () => ({
  useUser: () => ({
    telegramId: 'web_test_123',
    loading: false,
    profile: {
      name: 'Тестовый пользователь',
      payment_method_id: 'saved-method',
      // Просроченная подписка не должна блокировать удаление автосписания.
      статусСписания: 'неактивно',
    },
    sync: mockSync,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('web_token', 'test-token');
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ success: true }),
  }));
});

afterEach(() => {
  localStorage.clear();
  delete global.fetch;
});

test('неактивная подписка с сохранённым методом оплаты может отключить автосписание', async () => {
  render(<SettingsPage />);

  fireEvent.click(screen.getByRole('button', { name: /Отмена автосписания/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Да, хочу отменить' }));
  fireEvent.click(screen.getByRole('button', { name: '😢 Отменить' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/cancel-subscription', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
  })));
  await waitFor(() => expect(mockSync).toHaveBeenCalledWith(true));
  expect(screen.getByText(/Автосписание отменено/)).toBeInTheDocument();
});
