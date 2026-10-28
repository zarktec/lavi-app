export const DEDUPE_WINDOW_MS = 5000;

/** Ignora la misma URL si llega dos veces en menos de 5 segundos. */
export function createDeduper(windowMs = DEDUPE_WINDOW_MS, now: () => number = Date.now) {
  let lastUrl: string | null = null;
  let lastAt = 0;
  return {
    isDuplicate(url: string): boolean {
      const t = now();
      if (url === lastUrl && t - lastAt < windowMs) return true;
      lastUrl = url;
      lastAt = t;
      return false;
    },
    reset() {
      lastUrl = null;
      lastAt = 0;
    },
  };
}
