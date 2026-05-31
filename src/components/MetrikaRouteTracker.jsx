import { useEffect, useRef } from 'react';
import { ymHit } from '../analytics/metrika';

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export default function MetrikaRouteTracker() {
  const previousUrlRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const sendHit = () => {
      const path = currentPath();
      ymHit(path, document.title, previousUrlRef.current);
      previousUrlRef.current = `${window.location.origin}${path}`;
    };

    const timer = setTimeout(sendHit, 0);
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function patchedPushState(...args) {
      const result = originalPushState.apply(this, args);
      setTimeout(sendHit, 0);
      return result;
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      setTimeout(sendHit, 0);
      return result;
    };

    window.addEventListener('popstate', sendHit);
    window.addEventListener('hashchange', sendHit);

    return () => {
      clearTimeout(timer);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', sendHit);
      window.removeEventListener('hashchange', sendHit);
    };
  }, []);

  return null;
}
