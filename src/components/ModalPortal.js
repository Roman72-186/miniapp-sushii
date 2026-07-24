import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function ModalPortal({ children, onClose, initialFocusRef }) {
  const portalNodeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  if (!portalNodeRef.current) {
    portalNodeRef.current = document.createElement('div');
    portalNodeRef.current.className = 'modal-portal';
  }

  onCloseRef.current = onClose;

  useEffect(() => {
    const portalNode = portalNodeRef.current;
    const appRoot = document.getElementById('root');
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    const wasInert = appRoot?.hasAttribute('inert');

    document.body.appendChild(portalNode);
    document.body.style.overflow = 'hidden';

    if (appRoot) {
      appRoot.setAttribute('aria-hidden', 'true');
      appRoot.setAttribute('inert', '');
    }

    const focusInitialElement = () => {
      const dialog = portalNode.querySelector('[role="dialog"]');
      const target = initialFocusRef?.current
        || getFocusableElements(portalNode)[0]
        || dialog;
      target?.focus();
    };

    const frameId = window.requestAnimationFrame(focusInitialElement);

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(portalNode);
      if (focusable.length === 0) {
        event.preventDefault();
        portalNode.querySelector('[role="dialog"]')?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);
      portalNode.remove();
      document.body.style.overflow = previousOverflow;

      if (appRoot) {
        if (previousAriaHidden === null) appRoot.removeAttribute('aria-hidden');
        else appRoot.setAttribute('aria-hidden', previousAriaHidden);

        if (!wasInert) appRoot.removeAttribute('inert');
      }

      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [initialFocusRef]);

  return createPortal(children, portalNodeRef.current);
}

export default ModalPortal;
