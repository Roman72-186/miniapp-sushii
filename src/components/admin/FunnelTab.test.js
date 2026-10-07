import { render, screen, waitFor } from '@testing-library/react';
import FunnelTab from './FunnelTab';

test('renders empty funnel state', async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({ success: true, totalSessions: 0, activeSessions: 0, stoppedSessions: 0, steps: [], biggestDrop: null, exitPages: [], transitions: [] }),
  }));
  render(<FunnelTab token="admin" />);
  await waitFor(() => expect(screen.getByText('За выбранный период данных пока нет.')).toBeInTheDocument());
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer admin');
});
