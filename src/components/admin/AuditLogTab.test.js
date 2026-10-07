import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuditLogTab from './AuditLogTab';

const ENTRY = {
  id: 1,
  occurred_at: '2026-10-06T08:00:00.000Z',
  event_name: 'admin.subscription.extended',
  actor_type: 'staff',
  actor_label: 'Общий администратор',
  target_type: 'user',
  target_id: 'web_test_1',
  result: 'succeeded',
  request_id: 'req-1',
  changes: { subscription_end: { before: '01.10.2026', after: '31.10.2026' } },
};

function response(body, ok = true) {
  return { ok, json: async () => body };
}

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

test('показывает загрузку и пустой результат', async () => {
  let resolveFetch;
  global.fetch = jest.fn(() => new Promise(resolve => { resolveFetch = resolve; }));
  render(<AuditLogTab token="admin-token" />);
  expect(screen.getByRole('status')).toHaveTextContent('Загрузка журнала');
  resolveFetch(response({ success: true, items: [], nextCursor: null, hasMore: false }));
  expect(await screen.findByText('Записей по выбранным фильтрам нет.')).toBeInTheDocument();
});

test('показывает ошибку API и даёт повторить', async () => {
  global.fetch = jest.fn().mockResolvedValue(response({ success: false, error: 'Журнал недоступен' }, false));
  render(<AuditLogTab token="admin-token" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Журнал недоступен');
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
});

test('применяет фильтры к API', async () => {
  global.fetch = jest.fn().mockResolvedValue(response({ success: true, items: [], hasMore: false }));
  render(<AuditLogTab token="admin-token" />);
  await screen.findByText('Записей по выбранным фильтрам нет.');
  fireEvent.change(screen.getByLabelText('Дата по'), { target: { value: '2026-10-06' } });
  fireEvent.change(screen.getByLabelText('Событие'), { target: { value: 'admin.subscription.extended' } });
  fireEvent.change(screen.getByLabelText('Результат'), { target: { value: 'succeeded' } });
  fireEvent.change(screen.getByLabelText('Request ID'), { target: { value: 'req-42' } });
  fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const url = fetch.mock.calls[1][0];
  expect(url).toContain('event=admin.subscription.extended');
  expect(url).toContain('result=succeeded');
  expect(url).toContain('requestId=req-42');
  expect(url).toContain('to=2026-10-06T23%3A59%3A59.999%2B05%3A00');
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer admin-token');
});

test('догружает следующую страницу и открывает безопасные детали', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response({ success: true, items: [ENTRY], nextCursor: 'cursor-2', hasMore: true }))
    .mockResolvedValueOnce(response({ success: true, items: [{ ...ENTRY, id: 2, event_name: 'user.payment.succeeded' }], nextCursor: null, hasMore: false }));
  render(<AuditLogTab token="admin-token" />);
  expect(await screen.findAllByText('Подписка продлена')).not.toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
  expect(await screen.findAllByText('Платёж прошёл')).not.toHaveLength(0);
  expect(fetch.mock.calls[1][0]).toContain('cursor=cursor-2');

  fireEvent.click(screen.getByRole('button', { name: 'Детали: Подписка продлена' }));
  expect(screen.getByRole('dialog', { name: 'Подробности события' })).toHaveTextContent('req-1');
  expect(screen.getByText(/31.10.2026/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Показать историю этого пользователя' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  expect(fetch.mock.calls[2][0]).toContain('targetType=user');
  expect(fetch.mock.calls[2][0]).toContain('targetId=web_test_1');
});
