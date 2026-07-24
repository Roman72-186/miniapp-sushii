import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModalPortal from './ModalPortal';

function ModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Открыть</button>
      {open && (
        <ModalPortal onClose={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Тестовая модалка" tabIndex="-1">
            <button type="button">Первая кнопка</button>
            <button type="button">Последняя кнопка</button>
          </div>
        </ModalPortal>
      )}
    </>
  );
}

test('ModalPortal изолирует фон, удерживает и возвращает фокус', async () => {
  const appRoot = document.createElement('div');
  appRoot.id = 'root';
  document.body.appendChild(appRoot);
  render(<ModalHarness />, { container: appRoot });

  const trigger = screen.getByRole('button', { name: 'Открыть' });
  trigger.focus();
  fireEvent.click(trigger);

  const firstButton = screen.getByRole('button', { name: 'Первая кнопка' });
  const lastButton = screen.getByRole('button', { name: 'Последняя кнопка' });
  await waitFor(() => expect(firstButton).toHaveFocus());
  expect(appRoot).toHaveAttribute('aria-hidden', 'true');
  expect(appRoot).toHaveAttribute('inert');
  expect(document.body.style.overflow).toBe('hidden');

  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(lastButton).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(appRoot).not.toHaveAttribute('aria-hidden');
  expect(appRoot).not.toHaveAttribute('inert');
  expect(trigger).toHaveFocus();
});
