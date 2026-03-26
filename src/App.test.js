import { render, screen } from '@testing-library/react';
import App from './App';
import { UserProvider } from './UserContext';

test('renders app without crashing', () => {
  render(
    <UserProvider>
      <App />
    </UserProvider>
  );
  // Проверяем, что приложение рендерится без ошибок
  expect(document.body).toBeInTheDocument();
});
