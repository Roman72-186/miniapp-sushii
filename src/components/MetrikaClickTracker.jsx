import { useEffect } from 'react';
import { reachGoal, YM_GOALS } from '../analytics/metrika';

const TRACKABLE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[data-ym-goal]',
].join(',');

const SENSITIVE_PATTERN = /(?:\+?\d[\d\s\-()]{8,}\d)|(?:[^\s@]+@[^\s@]+\.[^\s@]+)/i;

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function safeLabel(element) {
  const rawLabel = cleanText(
    element.dataset.ymLabel ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent ||
    element.name ||
    element.type ||
    element.tagName.toLowerCase()
  );

  if (!rawLabel || SENSITIVE_PATTERN.test(rawLabel)) {
    return element.dataset.ymGoal || element.getAttribute('role') || element.tagName.toLowerCase();
  }

  return rawLabel;
}

function safeHref(element) {
  if (element.tagName.toLowerCase() !== 'a') return undefined;

  const rawHref = element.getAttribute('href') || '';
  if (!rawHref || rawHref.startsWith('#')) return rawHref || undefined;

  try {
    const url = new URL(rawHref, window.location.origin);
    if (url.origin !== window.location.origin) return 'external';
    return `${url.pathname}${url.hash}`;
  } catch {
    return undefined;
  }
}

function elementRole(element) {
  if (element.dataset.ymGoal) return 'custom';
  if (element.tagName.toLowerCase() === 'a') return 'link';
  return element.getAttribute('role') || 'button';
}

export default function MetrikaClickTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleClick = (event) => {
      if (window.location.pathname.startsWith('/admin')) return;

      const element = event.target?.closest?.(TRACKABLE_SELECTOR);
      if (!element || element.disabled || element.getAttribute('aria-disabled') === 'true') return;
      if (element.closest('[data-ym-ignore]')) return;

      const isNavigation = element.tagName.toLowerCase() === 'a';
      const goalId = element.dataset.ymGoal || (
        isNavigation ? YM_GOALS.NAVIGATION_CLICK : YM_GOALS.UI_CLICK
      );

      reachGoal(goalId, {
        label: safeLabel(element),
        role: elementRole(element),
        page: window.location.pathname,
        href: safeHref(element),
      });
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
