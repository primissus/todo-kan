import { useEffect, useState } from 'react';

// Tiny hash-based router. Hash routing keeps deep links + back/forward working
// AND survives file:// (the single-file build) where path-based routing can't.

export type Route = { name: 'home' } | { name: 'board'; id: string };

export function parseHash(): Route {
  const h =
    typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  const m = h.match(/^\/board\/(.+)$/);
  if (m) return { name: 'board', id: decodeURIComponent(m[1]) };
  return { name: 'home' };
}

export function navigate(to: string): void {
  window.location.hash = to;
}

export function goHome(): void {
  navigate('/');
}

export function goBoard(id: string): void {
  navigate(`/board/${encodeURIComponent(id)}`);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash());
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}
