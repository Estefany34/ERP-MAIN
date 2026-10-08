import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { modules } from '../modules/config';

export function routeFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'Dashboard';
  try {
    const value = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
    if (modules.some(module => module.label === value)) return value;
  } catch {
    // Invalid URL fragments are redirected to a known route below.
  }
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const safePath = pathname.toLocaleLowerCase() === '/documentos' ? '/' : pathname;
  window.history.replaceState(null, '', `${safePath}${window.location.search}#/Dashboard`);
  return 'Dashboard';
}
export function useModuleNavigation() {
  const [active, setActive] = useState(routeFromUrl);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const navigate = () => setActive(routeFromUrl());
    window.addEventListener('popstate', navigate);
    window.addEventListener('hashchange', navigate);
    return () => { window.removeEventListener('popstate', navigate); window.removeEventListener('hashchange', navigate); };
  }, []);
  function select(value: string, replace = false) {
    const next = modules.some(module => module.label === value) ? value : 'Dashboard';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = `#/${encodeURIComponent(next)}`;
      if (window.location.hash !== hash) window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    }
    setActive(next);
  }
  return [active, select] as const;
}
