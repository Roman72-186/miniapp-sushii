import { render, screen } from '@testing-library/react';
import App from './App';
import { UserProvider } from './UserContext';

jest.mock('./ProfilePage', () => {
  const React = require('react');
  return function MockProfilePage() {
    return React.createElement('h1', null, 'Личный кабинет');
  };
});

test('renders app without crashing', () => {
  render(
    <UserProvider>
      <App />
    </UserProvider>
  );
  // Проверяем, что приложение рендерится без ошибок
  expect(document.body).toBeInTheDocument();
});

test('корневая ссылка открывает личный кабинет вместо посадочной страницы', () => {
  window.history.replaceState({}, '', '/');
  render(
    <UserProvider>
      <App />
    </UserProvider>
  );
  expect(screen.getByRole('heading', { name: 'Личный кабинет' })).toBeInTheDocument();
  expect(screen.queryByText('Кабинет выгодных покупок')).not.toBeInTheDocument();
});
